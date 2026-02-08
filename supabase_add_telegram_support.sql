-- =====================================================
-- MIGRACIÓN: Sistema de Notificaciones por Telegram
-- =====================================================
-- Este script añade soporte para notificaciones por Telegram
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Añadir columnas de Telegram a la tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_username TEXT,
ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;

-- 2. Crear índice para búsquedas rápidas por chat_id
CREATE INDEX IF NOT EXISTS idx_usuarios_telegram_chat_id 
ON usuarios(telegram_chat_id) 
WHERE telegram_chat_id IS NOT NULL;

-- 3. Crear tabla para códigos de vinculación temporales
CREATE TABLE IF NOT EXISTS telegram_link_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Un usuario solo puede tener un código activo
    CONSTRAINT unique_user_link_code UNIQUE (user_id)
);

-- 4. Índice para buscar códigos rápidamente
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_code 
ON telegram_link_codes(code);

-- 5. Función para limpiar códigos expirados (más de 15 minutos)
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM telegram_link_codes 
    WHERE created_at < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql;

-- 6. Crear un job para limpiar códigos expirados cada 5 minutos (opcional)
-- Nota: Esto requiere pg_cron que puede no estar disponible en todos los planes
-- SELECT cron.schedule('cleanup-telegram-codes', '*/5 * * * *', 'SELECT cleanup_expired_telegram_codes()');

-- 7. Tabla para historial de notificaciones de Telegram (opcional, para analytics)
CREATE TABLE IF NOT EXISTS telegram_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    chat_id TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'announcement', 'voting', 'voting_results', etc.
    reference_id UUID, -- ID del anuncio o votación
    status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'blocked'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Índices para el log
CREATE INDEX IF NOT EXISTS idx_telegram_log_user 
ON telegram_notification_log(user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_log_created 
ON telegram_notification_log(created_at DESC);

-- 9. Políticas RLS (Row Level Security)

-- Permitir a usuarios ver su propio estado de Telegram
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propios datos de Telegram
-- (Asumiendo que ya existe una política para usuarios)

-- Códigos de vinculación - solo el sistema puede acceder
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

-- Política para permitir operaciones desde el service role
CREATE POLICY "Service role can manage link codes" 
ON telegram_link_codes 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Log de notificaciones - solo lectura para admins
ALTER TABLE telegram_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification log" 
ON telegram_notification_log 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM usuarios 
        WHERE usuarios.id = auth.uid() 
        AND usuarios.es_admin = true
    )
);

-- 10. Vista para estadísticas de Telegram
CREATE OR REPLACE VIEW telegram_stats AS
SELECT 
    COUNT(*) FILTER (WHERE telegram_chat_id IS NOT NULL) as usuarios_vinculados,
    COUNT(*) as total_usuarios,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE telegram_chat_id IS NOT NULL) / NULLIF(COUNT(*), 0), 
        2
    ) as porcentaje_vinculados
FROM usuarios;

-- 11. Función para obtener usuarios con Telegram para notificaciones
CREATE OR REPLACE FUNCTION get_telegram_recipients(
    p_exclude_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    telegram_chat_id TEXT,
    nombre TEXT,
    apellidos TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.telegram_chat_id,
        u.nombre,
        u.apellidos
    FROM usuarios u
    WHERE u.telegram_chat_id IS NOT NULL
    AND u.email_verified = true
    AND (p_exclude_user_id IS NULL OR u.id != p_exclude_user_id);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecutar después de la migración para verificar:

-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'usuarios' 
-- AND column_name LIKE 'telegram%';

-- SELECT * FROM telegram_stats;

-- =====================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================
-- 
-- 1. Crear un bot en Telegram:
--    - Hablar con @BotFather
--    - Usar /newbot y seguir instrucciones
--    - Guardar el token que te da
--
-- 2. Configurar variables de entorno en Vercel:
--    - TELEGRAM_BOT_TOKEN=tu_token_aquí
--
-- 3. Configurar el webhook después de desplegar:
--    curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://sepeiunido.org/api/telegram-webhook"
--
-- 4. Verificar que el webhook está activo:
--    curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
--
-- =====================================================
