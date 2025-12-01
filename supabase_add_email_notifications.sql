-- Agregar campo de preferencias de notificación por email
-- Los usuarios pueden optar por recibir o no notificaciones

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- Comentario para documentación
COMMENT ON COLUMN users.email_notifications IS 'Indica si el usuario desea recibir notificaciones por email de anuncios y votaciones';

-- Índice para consultas rápidas de usuarios con notificaciones activas
CREATE INDEX IF NOT EXISTS idx_users_email_notifications 
ON users(email_notifications) 
WHERE email_notifications = true;

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name = 'email_notifications';
