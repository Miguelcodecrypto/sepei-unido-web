-- ============================================================================
-- RLS Fase 2 — B4: announcements + announcements_attachments
--
-- ⚠️ EJECUTAR SOLO DESPUÉS de que esté MERGEADO Y DESPLEGADO en producción el
-- código que mueve create/update/delete al backend (api/admin.ts,
-- resource=announcements). Si se ejecuta antes, el panel de anuncios deja de
-- funcionar hasta que llegue el despliegue.
--
-- QUÉ ARREGLA: la política "Administradores pueden gestionar anuncios" era
--   FOR ALL USING (true)  sin restricción de rol
-- es decir, cualquier visitante con la anon key (que es pública, va en el
-- bundle JS) podía crear, editar y BORRAR anuncios del tablón público.
-- Era un placeholder del script original que nunca se ajustó — lo dice el
-- propio comentario en supabase_create_announcements.sql:47.
-- ============================================================================

-- ── 1. announcements ────────────────────────────────────────────────────────

-- Fuera la política que lo permitía todo a cualquiera
DROP POLICY IF EXISTS "Administradores pueden gestionar anuncios" ON announcements;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- La lectura pública de anuncios PUBLICADOS se mantiene: es lo que alimenta el
-- tablón para los visitantes. Se recrea por idempotencia.
DROP POLICY IF EXISTS "Anuncios publicados son visibles para todos" ON announcements;
CREATE POLICY "Anuncios publicados son visibles para todos"
  ON announcements FOR SELECT
  USING (publicado = true);

-- No se crea ninguna política de INSERT/UPDATE/DELETE: esas operaciones pasan
-- ahora por api/admin.ts con la service_role, que bypasa RLS.

-- ── 2. announcements_attachments ────────────────────────────────────────────

ALTER TABLE announcements_attachments ENABLE ROW LEVEL SECURITY;

-- Los adjuntos se leen en el mismo join que los anuncios
-- (getPublishedAnnouncements hace select con attachments:announcements_attachments(*)),
-- así que necesitan su propia política de SELECT: visibles solo si su anuncio
-- está publicado.
DROP POLICY IF EXISTS "Adjuntos de anuncios publicados visibles para todos" ON announcements_attachments;
CREATE POLICY "Adjuntos de anuncios publicados visibles para todos"
  ON announcements_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = announcements_attachments.announcement_id
        AND a.publicado = true
    )
  );

-- ── 3. Contador de vistas ───────────────────────────────────────────────────

-- increment_announcement_views hace UPDATE sobre announcements y la llaman
-- visitantes anónimos desde AnnouncementsBoard. Sin SECURITY DEFINER se ejecuta
-- con los permisos de quien llama, así que al cerrar RLS dejaría de contar
-- vistas EN SILENCIO. Se añade también search_path fijo (si no, es vulnerable a
-- search_path hijacking, el mismo fallo señalado en get_top_active_users).
-- NOTA DE SINTAXIS: los atributos van DESPUÉS del cuerpo ($$ ... $$ LANGUAGE ...).
-- La forma "RETURNS void LANGUAGE plpgsql ... AS $$" es válida en PostgreSQL
-- estándar pero el editor SQL de Supabase la rechaza con
-- "42601: syntax error at or near void" (comprobado 2026-09-06). Esta es la
-- misma forma del script original que sí funcionó al crear la función.
CREATE OR REPLACE FUNCTION increment_announcement_views(announcement_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE announcements
  SET vistas = vistas + 1
  WHERE id = announcement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 4. VERIFICACIÓN (obligatoria — no fiarse de que "se ejecutó") ───────────
-- La Fase 1 se dio por cerrada sin comprobar esto y estuvo un mes abierta.
-- Lo esperado: announcements → 1 política (solo SELECT)
--              announcements_attachments → 1 política (solo SELECT)
-- y NINGUNA con cmd = 'ALL' ni qual = 'true'.

SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename IN ('announcements', 'announcements_attachments')
ORDER BY tablename, policyname;

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('announcements', 'announcements_attachments');
