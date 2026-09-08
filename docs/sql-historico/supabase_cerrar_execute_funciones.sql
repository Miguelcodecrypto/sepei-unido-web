-- ============================================================================
-- Cerrar EXECUTE a anon en las funciones que no deben ser públicas
--
-- CONTEXTO: PostgreSQL concede EXECUTE a PUBLIC en toda función nueva y anon
-- hereda ese privilegio, así que TODAS las funciones del proyecto nacieron
-- invocables sin autenticación. Auditado el 2026-09-06 con
-- supabase_audit_funciones_execute_public.sql: 9 de 10 abiertas.
--
-- Ejecutar entero. No requiere despliegue previo: el backend llama a estas
-- funciones con service_role, que conserva su GRANT explícito.
-- ============================================================================

-- ── 1. obtener_resultados_votacion — LA IMPORTANTE 🔴 ───────────────────────
-- Es SECURITY DEFINER, así que BYPASA el RLS de votos/voto_participaciones que
-- se puso justo para que los resultados solo se leyeran por api/voting.ts.
-- Y el UUID de una votación no es secreto: ?action=active los lista sin sesión.
-- Resultado: cualquiera con la anon key podía ver el recuento EN VIVO de una
-- votación en curso, cuando el propio código trata los resultados como
-- información de admin (handleAdminResults exige verifyAdminToken).
-- Verificado el 2026-09-06: un POST anónimo respondía 200.
REVOKE EXECUTE ON FUNCTION public.obtener_resultados_votacion FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obtener_resultados_votacion FROM anon;
REVOKE EXECUTE ON FUNCTION public.obtener_resultados_votacion FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.obtener_resultados_votacion TO service_role;

-- ── 2. Funciones de seguridad del panel admin ───────────────────────────────
-- get_security_stats la llama api/admin.ts (resource=security) con service_role.
-- Las otras tres no las llama el código por RPC, pero leen o tocan datos de
-- seguridad (intentos de login, IPs bloqueadas, sesiones).
REVOKE EXECUTE ON FUNCTION public.get_security_stats FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_security_stats FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_security_stats FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_security_stats TO service_role;

REVOKE EXECUTE ON FUNCTION public.count_failed_attempts FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.count_failed_attempts FROM anon;
REVOKE EXECUTE ON FUNCTION public.count_failed_attempts FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.count_failed_attempts TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_ip_blocked FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_ip_blocked FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_ip_blocked FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.is_ip_blocked TO service_role;

-- ── 3. Destinatarios de Telegram ────────────────────────────────────────────
-- Devuelve usuarios con Telegram vinculado. Hoy es SECURITY INVOKER y users ya
-- tiene RLS cerrado (B1), así que a anon le saldría vacío — pero eso es una
-- protección indirecta que se rompe sola el día que alguien la pase a DEFINER.
REVOKE EXECUTE ON FUNCTION public.get_telegram_recipients FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_telegram_recipients FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_telegram_recipients FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_telegram_recipients TO service_role;

-- ── 4. Tareas de limpieza (hacen DELETE) ────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_sessions FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_sessions FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_sessions FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_expired_sessions TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_telegram_codes FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_telegram_codes FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_telegram_codes FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_expired_telegram_codes TO service_role;

-- ── 5. Función de trigger ───────────────────────────────────────────────────
-- update_external_emails_updated_at devuelve trigger: PostgREST no la expone y
-- los triggers NO comprueban el EXECUTE del rol que provoca la escritura, así
-- que revocarla no rompe nada. Va por higiene, para que la auditoría quede
-- limpia y no haya que volver a razonar sobre ella.
REVOKE EXECUTE ON FUNCTION public.update_external_emails_updated_at FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_external_emails_updated_at FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_external_emails_updated_at FROM authenticated;

-- ── 6. LA QUE NO SE TOCA ────────────────────────────────────────────────────
-- increment_announcement_views: la llaman VISITANTES ANÓNIMOS desde el tablón
-- para contar vistas. Debe seguir abierta a anon. Si se cierra, el contador
-- deja de subir EN SILENCIO (nadie ve un error). No añadir aquí.

-- ── 7. VERIFICACIÓN ─────────────────────────────────────────────────────────
-- Esperado: solo increment_announcement_views con "⚠️ ABIERTA"; el resto
-- "✅ cerrada a anon". Volver a pasar supabase_audit_funciones_execute_public.sql
-- o directamente:
SELECT
  p.proname AS funcion,
  CASE
    WHEN p.proacl IS NULL THEN '⚠️ ABIERTA (privilegios por defecto)'
    WHEN array_to_string(p.proacl, ',') LIKE '%anon=X/%' THEN '⚠️ ABIERTA (EXECUTE a anon)'
    WHEN array_to_string(p.proacl, ',') ~ '(^|,)=X/' THEN '⚠️ ABIERTA (EXECUTE a PUBLIC)'
    ELSE '✅ cerrada a anon'
  END AS estado
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY estado, p.proname;
