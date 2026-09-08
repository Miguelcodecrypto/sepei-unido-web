-- Añadir columna es_html a la tabla announcements
-- Ejecutar este script en la consola SQL de Supabase

ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS es_html BOOLEAN DEFAULT FALSE;

-- Comentario para la columna
COMMENT ON COLUMN announcements.es_html IS 'Indica si el contenido del anuncio es HTML y debe renderizarse como tal';
