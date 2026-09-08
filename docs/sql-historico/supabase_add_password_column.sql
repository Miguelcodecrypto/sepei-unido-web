-- Script para añadir columna de contraseña a la tabla users
-- Ejecutar este script en el SQL Editor de Supabase

-- Agregar columna password para autenticación
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Agregar columna lastLogin para tracking de sesiones
ALTER TABLE users ADD COLUMN IF NOT EXISTS lastLogin TIMESTAMP WITH TIME ZONE;

-- Comentario en las columnas
COMMENT ON COLUMN users.password IS 'Hash bcrypt de la contraseña del usuario';
COMMENT ON COLUMN users.lastLogin IS 'Fecha y hora del último inicio de sesión';

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name IN ('password', 'lastLogin')
ORDER BY ordinal_position;
