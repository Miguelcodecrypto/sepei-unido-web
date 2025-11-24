-- Script SQL para eliminar las columnas de redes sociales de la tabla users en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Eliminar columnas de redes sociales
ALTER TABLE users DROP COLUMN IF EXISTS instagram;
ALTER TABLE users DROP COLUMN IF EXISTS facebook;
ALTER TABLE users DROP COLUMN IF EXISTS twitter;
ALTER TABLE users DROP COLUMN IF EXISTS linkedin;

-- Verificar que las columnas se han eliminado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
