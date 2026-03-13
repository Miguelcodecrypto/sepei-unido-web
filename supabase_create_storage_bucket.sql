-- Script para crear y configurar el bucket de Storage para archivos de anuncios
-- Ejecutar en Supabase SQL Editor

-- 1. Crear el bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-files',
  'public-files',
  true, -- bucket público
  52428800, -- 50MB límite
  ARRAY[
    'text/html',
    'text/plain',
    'text/csv',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'application/json',
    'application/xml',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- 2. Crear políticas para permitir subida de archivos
-- Política para SELECT (descargar archivos) - cualquiera puede descargar
DROP POLICY IF EXISTS "public_files_select" ON storage.objects;
CREATE POLICY "public_files_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-files');

-- Política para INSERT (subir archivos) - cualquier usuario autenticado puede subir
DROP POLICY IF EXISTS "public_files_insert" ON storage.objects;
CREATE POLICY "public_files_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'public-files');

-- Política para UPDATE - permitir actualizar archivos
DROP POLICY IF EXISTS "public_files_update" ON storage.objects;
CREATE POLICY "public_files_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'public-files');

-- Política para DELETE - permitir eliminar archivos
DROP POLICY IF EXISTS "public_files_delete" ON storage.objects;
CREATE POLICY "public_files_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'public-files');

-- Verificar que se creó correctamente
SELECT * FROM storage.buckets WHERE id = 'public-files';
