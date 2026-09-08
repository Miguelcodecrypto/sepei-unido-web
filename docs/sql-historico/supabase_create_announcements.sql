-- Script SQL para crear la tabla de anuncios en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear tabla de anuncios
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(255) NOT NULL,
  contenido TEXT NOT NULL,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('noticia', 'comunicado', 'evento', 'urgente')),
  imagen_url TEXT,
  archivo_url TEXT,
  archivo_nombre VARCHAR(255),
  archivo_tipo VARCHAR(100),
  publicado BOOLEAN DEFAULT false,
  destacado BOOLEAN DEFAULT false,
  fecha_publicacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  autor VARCHAR(255) NOT NULL,
  vistas INTEGER DEFAULT 0
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_announcements_publicado ON announcements(publicado);
CREATE INDEX IF NOT EXISTS idx_announcements_destacado ON announcements(destacado);
CREATE INDEX IF NOT EXISTS idx_announcements_fecha_publicacion ON announcements(fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_categoria ON announcements(categoria);

-- Crear función para incrementar vistas
CREATE OR REPLACE FUNCTION increment_announcement_views(announcement_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE announcements 
  SET vistas = vistas + 1 
  WHERE id = announcement_id;
END;
$$ LANGUAGE plpgsql;

-- Habilitar Row Level Security (RLS)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública de anuncios publicados
CREATE POLICY "Anuncios publicados son visibles para todos"
  ON announcements FOR SELECT
  USING (publicado = true);

-- Política para administradores (permite todo)
-- Nota: Ajusta esto según tu sistema de autenticación
CREATE POLICY "Administradores pueden gestionar anuncios"
  ON announcements FOR ALL
  USING (true);

-- Crear bucket de almacenamiento para archivos públicos (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-files', 'public-files', true)
ON CONFLICT (id) DO NOTHING;

-- Política de almacenamiento: permitir subida de archivos
CREATE POLICY "Permitir subida de archivos públicos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'public-files');

-- Política de almacenamiento: permitir lectura pública
CREATE POLICY "Acceso público a archivos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-files');

-- Verificar que la tabla se creó correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'announcements'
ORDER BY ordinal_position;
