-- ============================================================================
-- B6 — Cerrar el INSERT público del bucket `public-files`
--
-- ⚠️ EJECUTAR SOLO DESPUÉS de que el código del PR de B6 esté MERGEADO Y
-- DESPLEGADO EN PRODUCCIÓN. Antes de eso, el panel admin sube a Storage con la
-- anon key y este script rompería la subida de imágenes y adjuntos.
--
-- CONTEXTO: el bucket nació con INSERT abierto a cualquiera
-- (`WITH CHECK (bucket_id = 'public-files')`, sin comprobar rol). Como la anon
-- key es pública por diseño (va en el bundle del navegador), cualquiera podía
-- subir archivos arbitrarios al bucket, que se sirve bajo el dominio del
-- movimiento: hosting gratuito de lo que sea bajo sepeiunido.org.
-- UPDATE y DELETE públicos ya se cerraron el 2026-09-05.
--
-- QUÉ LO SUSTITUYE: /api/admin?resource=storage_upload genera una signed upload
-- URL con service_role tras validar el token de admin. Ese token autoriza la
-- subida por sí mismo, así que NO necesita política de INSERT para anon.
--
-- SELECT sigue público a propósito: las imágenes y adjuntos de los anuncios
-- deben verse sin login.
-- ============================================================================

-- ── 1. Estado ANTES (guardar el resultado para poder comparar) ──────────────
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;

-- ── 2. Eliminar las políticas de INSERT público ─────────────────────────────
-- Son dos por historia del proyecto: la original en español y la del script
-- supabase_create_storage_bucket.sql.
DROP POLICY IF EXISTS "Permitir subida de archivos públicos" ON storage.objects;
DROP POLICY IF EXISTS "public_files_insert" ON storage.objects;

-- ── 3. Estado DESPUÉS: no debe quedar ninguna fila con cmd = 'INSERT' ───────
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;

-- ============================================================================
-- VERIFICACIÓN DESDE FUERA (la que de verdad vale — hacerla, no basta con
-- mirar pg_policies: eso es justo lo que engañó en la Fase 1)
--
-- Con la anon key sacada del bundle público de www.sepeiunido.org:
--
--   curl -X POST \
--     "https://<proyecto>.supabase.co/storage/v1/object/public-files/prueba.txt" \
--     -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
--     -H "Content-Type: text/plain" --data "prueba"
--
--   ANTES:   200 con {"Key":"public-files/prueba.txt"}
--   DESPUÉS: 403 con "new row violates row-level security policy"
--
-- Y en el panel admin, contra PRODUCCIÓN (no un preview de rama):
--   - Tablón de Anuncios: crear un anuncio con imagen y con adjunto → suben OK
--   - Interinos: subir un archivo de bibliografía → sube OK
--   - Un visitante sin login sigue viendo las imágenes y abriendo los adjuntos
-- ============================================================================
