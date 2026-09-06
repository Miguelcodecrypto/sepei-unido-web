-- ============================================================================
-- RLS Fase 2 — B3: interinos_bibliografia
--
-- ⚠️ EJECUTAR SOLO DESPUÉS de que esté MERGEADO Y DESPLEGADO en producción el
-- código que mueve create/delete al backend (api/admin.ts, resource=interinos).
-- Si se ejecuta antes, el panel de Interinos deja de poder añadir o borrar
-- recursos hasta que llegue el despliegue.
--
-- QUÉ ARREGLA: la tabla se creó (supabase_create_interinos_bibliografia.sql)
-- SIN RLS y SIN ninguna política, es decir, completamente abierta a la anon key
-- —que es pública y viaja en el bundle JS—. Cualquier visitante podía insertar
-- recursos falsos en la sección de Interinos o BORRAR los existentes.
-- ============================================================================

ALTER TABLE public.interinos_bibliografia ENABLE ROW LEVEL SECURITY;

-- La lectura se mantiene pública: la bibliografía de Interinos se consulta sin
-- login desde getInterinosContenido con la anon key.
DROP POLICY IF EXISTS "Contenido de interinos visible para todos" ON public.interinos_bibliografia;
CREATE POLICY "Contenido de interinos visible para todos"
  ON public.interinos_bibliografia FOR SELECT
  USING (true);

-- No se crea ninguna política de INSERT/UPDATE/DELETE: esas operaciones pasan
-- ahora por api/admin.ts con la service_role, que bypasa RLS.

-- ── VERIFICACIÓN (obligatoria — no fiarse de que "se ejecutó") ──────────────
-- La Fase 1 se dio por cerrada sin comprobar esto y estuvo un mes abierta.
-- Lo esperado: 1 política, cmd = 'SELECT'; y rowsecurity = true.

SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'interinos_bibliografia'
ORDER BY policyname;

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'interinos_bibliografia';
