-- Script para añadir columna password_changed_at a la tabla users
-- Ejecutar este script en el SQL Editor de Supabase

-- Agregar columna para tracking de cambio de contraseña
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;

-- Comentario en la columna
COMMENT ON COLUMN users.password_changed_at IS 'Fecha y hora del último cambio de contraseña';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name = 'password_changed_at';
