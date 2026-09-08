-- ============================================================================
-- Auditoría: ¿qué funciones puede invocar cualquiera con la anon key?
--
-- POR QUÉ ESTE SCRIPT: PostgreSQL concede EXECUTE a PUBLIC en TODA función
-- nueva, y el rol anon (la anon key, que es pública y va en el bundle JS)
-- hereda ese privilegio. Es decir, por defecto toda función del proyecto es
-- invocable sin autenticación, y un "REVOKE ... FROM anon" a secas NO lo
-- impide: hay que revocar de PUBLIC.
--
-- Esto se descubrió el 2026-09-06 al verificar B5: get_top_active_users seguía
-- devolviendo nombres y emails reales a un POST anónimo después de haber
-- ejecutado el REVOKE FROM anon.
--
-- El proyecto define 11 funciones (grep sobre los .sql del repo), varias de
-- ellas sensibles: get_telegram_recipients, get_security_stats,
-- count_failed_attempts, is_ip_blocked, obtener_resultados_votacion,
-- usuario_ya_voto, cleanup_expired_sessions...
-- ============================================================================

SELECT
  p.proname AS funcion,
  p.prosecdef AS security_definer,
  p.proconfig AS config,
  -- proacl NULL = privilegios por defecto = EXECUTE para PUBLIC = INVOCABLE POR ANON
  CASE
    WHEN p.proacl IS NULL THEN '⚠️ ABIERTA (privilegios por defecto: PUBLIC)'
    WHEN array_to_string(p.proacl, ',') LIKE '%=X/%'
     AND array_to_string(p.proacl, ',') NOT LIKE '%anon=X/%'
     AND array_to_string(p.proacl, ',') ~ '(^|,)=X/' THEN '⚠️ ABIERTA (EXECUTE a PUBLIC)'
    WHEN array_to_string(p.proacl, ',') LIKE '%anon=X/%' THEN '⚠️ ABIERTA (EXECUTE a anon)'
    ELSE '✅ cerrada a anon'
  END AS estado,
  p.proacl AS privilegios
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY
  CASE WHEN p.proacl IS NULL THEN 0 ELSE 1 END,
  p.proname;

-- CÓMO CERRAR UNA (plantilla, ajustar nombre y firma):
--   REVOKE EXECUTE ON FUNCTION nombre_funcion(TIPO) FROM PUBLIC;
--   REVOKE EXECUTE ON FUNCTION nombre_funcion(TIPO) FROM anon;
--   REVOKE EXECUTE ON FUNCTION nombre_funcion(TIPO) FROM authenticated;
--   GRANT  EXECUTE ON FUNCTION nombre_funcion(TIPO) TO service_role;
--
-- ⚠️ NO cerrar increment_announcement_views(UUID): la llaman visitantes
-- anónimos desde el tablón para contar vistas, y debe seguir abierta.
