-- ============================================================================
-- RLS Fase 2 — B5: site_visits + user_interactions (+ vistas de analíticas)
--
-- ⚠️ EJECUTAR SOLO DESPUÉS de que esté MERGEADO Y DESPLEGADO en producción el
-- código que mueve las lecturas del dashboard al backend (api/admin.ts,
-- resource=analytics). Si se ejecuta antes, el dashboard de analíticas del
-- panel admin se queda a cero hasta que llegue el despliegue.
--
-- QUÉ ARREGLA: ambas tablas se crearon (supabase_create_analytics.sql) SIN RLS
-- y SIN políticas. Comprobado contra producción el 2026-09-06 con la anon key
-- sacada del bundle público: cualquiera podía leer las 3.324 filas de
-- site_visits con la IP y el user_agent de cada visita —incluidas las de
-- usuarios identificados por user_id—, y lo mismo en user_interactions (qué
-- secciones visita cada usuario y cuánto tiempo). La IP es dato personal a
-- efectos de RGPD: esto era una fuga de PII, no solo de métricas.
-- ============================================================================

-- ── 1. site_visits ──────────────────────────────────────────────────────────

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- El tracking se queda en el cliente con la anon key (alto volumen, no compensa
-- pasarlo por una función serverless), pero SOLO puede escribir: sin política
-- de SELECT, nadie puede leer lo que hay dentro con la anon key.
DROP POLICY IF EXISTS "Registro de visitas abierto, lectura cerrada" ON public.site_visits;
CREATE POLICY "Registro de visitas abierto, lectura cerrada"
  ON public.site_visits FOR INSERT
  WITH CHECK (true);

-- ── 2. user_interactions ────────────────────────────────────────────────────

ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Registro de interacciones abierto, lectura cerrada" ON public.user_interactions;
CREATE POLICY "Registro de interacciones abierto, lectura cerrada"
  ON public.user_interactions FOR INSERT
  WITH CHECK (true);

-- ── 3. Vistas: el agujero que RLS por sí solo NO tapa ───────────────────────
-- Una vista se ejecuta por defecto con los permisos de SU PROPIETARIO, no con
-- los de quien la consulta. analytics_summary y section_interactions leen
-- site_visits/user_interactions, así que tras cerrar las tablas seguirían
-- devolviendo datos agregados a cualquiera con la anon key (verificado el
-- 2026-09-06: la vista respondía con visitas por día sin autenticación).
-- security_invoker hace que la vista respete el RLS de quien la llama.
ALTER VIEW public.analytics_summary SET (security_invoker = true);
ALTER VIEW public.section_interactions SET (security_invoker = true);

-- Defensa en profundidad: aunque el dashboard ya solo las lee con service_role.
REVOKE ALL ON public.analytics_summary FROM anon;
REVOKE ALL ON public.section_interactions FROM anon;

-- ── 4. get_top_active_users: search_path fijo ───────────────────────────────
-- Es SECURITY DEFINER (necesario: cruza users con user_interactions) pero no
-- fija search_path, así que es vulnerable a search_path hijacking. Mismo fallo
-- que se corrigió en increment_announcement_views en B4.
-- NOTA DE SINTAXIS: los atributos van DESPUÉS del cuerpo. La forma
-- "RETURNS TABLE (...) LANGUAGE plpgsql SECURITY DEFINER AS $$" la rechaza el
-- editor SQL de Supabase con "42601: syntax error" (comprobado en B4).
CREATE OR REPLACE FUNCTION get_top_active_users(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  total_interactions BIGINT,
  last_interaction TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.nombre AS user_name,
    u.email AS user_email,
    COUNT(ui.id)::BIGINT AS total_interactions,
    MAX(ui.created_at) AS last_interaction
  FROM users u
  INNER JOIN user_interactions ui ON u.id = ui.user_id
  WHERE ui.user_id IS NOT NULL
  GROUP BY u.id, u.nombre, u.email
  HAVING COUNT(ui.id) > 0
  ORDER BY total_interactions DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Esta función devuelve email y nombre de usuarios: que no la pueda llamar
-- cualquiera con la anon key. El dashboard la invoca con service_role.
REVOKE EXECUTE ON FUNCTION get_top_active_users(INTEGER) FROM anon;

-- ── 5. VERIFICACIÓN (obligatoria — no fiarse de que "se ejecutó") ───────────
-- Lo esperado: rowsecurity = true en ambas tablas, y exactamente 1 política por
-- tabla, ambas con cmd = 'INSERT'. NINGUNA de SELECT.

SELECT tablename, policyname, cmd, roles, with_check
FROM pg_policies
WHERE tablename IN ('site_visits', 'user_interactions')
ORDER BY tablename, policyname;

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('site_visits', 'user_interactions');

-- Y que la función quedó con search_path fijo (proconfig debe incluir search_path=public):
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'get_top_active_users';
