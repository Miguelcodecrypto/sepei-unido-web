-- Crear tabla de sesiones de usuario para reemplazar localStorage
-- Esto permitirá sincronizar sesiones entre dispositivos y navegadores

-- 1. Crear tabla de sesiones
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 2. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_sessions_token 
ON user_sessions(session_token) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
ON user_sessions(user_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires 
ON user_sessions(expires_at) 
WHERE is_active = true;

-- 3. Función para limpiar sesiones expiradas automáticamente
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE user_sessions 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 4. Comentarios para documentación
COMMENT ON TABLE user_sessions IS 'Sesiones de usuario activas - reemplaza localStorage para autenticación';
COMMENT ON COLUMN user_sessions.session_token IS 'Token único de sesión (JWT o UUID)';
COMMENT ON COLUMN user_sessions.expires_at IS 'Fecha de expiración de la sesión (defecto: 7 días)';
COMMENT ON COLUMN user_sessions.last_activity IS 'Última actividad del usuario para renovación automática';

-- 5. Verificar la tabla
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_sessions' 
ORDER BY ordinal_position;
