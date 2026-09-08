-- Agregar columnas para el token de verificación en la tabla users
-- Esto permite que el sistema de verificación funcione sin depender de localStorage

-- 1. Agregar columna para el token de verificación
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ;

-- 2. Crear índice para búsquedas rápidas por token
CREATE INDEX IF NOT EXISTS idx_users_verification_token 
ON users(verification_token) 
WHERE verification_token IS NOT NULL;

-- 3. Comentarios para documentación
COMMENT ON COLUMN users.verification_token IS 'Token único para verificar el email del usuario';
COMMENT ON COLUMN users.verification_token_expires_at IS 'Fecha de expiración del token de verificación (24 horas desde creación)';

-- Verificar los cambios
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('verification_token', 'verification_token_expires_at');
