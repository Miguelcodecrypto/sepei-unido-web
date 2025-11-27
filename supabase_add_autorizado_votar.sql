-- Script para añadir columna 'autorizado_votar' a la tabla users
-- Este campo controla si un usuario ha sido autorizado por el administrador para votar

-- Añadir columna autorizado_votar (por defecto FALSE - usuario NO autorizado)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS autorizado_votar BOOLEAN DEFAULT false;

-- Añadir comentario explicativo
COMMENT ON COLUMN users.autorizado_votar IS 'Indica si el administrador ha autorizado al usuario para poder votar';

-- OPCIONAL: Si quieres autorizar automáticamente a todos los usuarios existentes, ejecuta:
-- UPDATE users SET autorizado_votar = true WHERE verified = true;

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'autorizado_votar';
