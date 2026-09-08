-- =============================================
-- Tabla de logs de seguridad para intentos de acceso al panel de administración
-- =============================================

-- Crear tabla de logs de seguridad
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(45),                    -- IPv4 o IPv6
  attempted_password TEXT,                    -- Contraseña intentada (hasheada para seguridad)
  attempt_number INTEGER DEFAULT 1,           -- Número de intento desde esa IP
  success BOOLEAN DEFAULT false,              -- Si el intento fue exitoso o no
  user_agent TEXT,                            -- Información del navegador
  country VARCHAR(100),                       -- País (si se puede obtener)
  city VARCHAR(100),                          -- Ciudad (si se puede obtener)
  blocked BOOLEAN DEFAULT false,              -- Si la IP está bloqueada
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip ON admin_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_created_at ON admin_login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_success ON admin_login_attempts(success);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_blocked ON admin_login_attempts(blocked);

-- Tabla para IPs bloqueadas permanentemente
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(45) UNIQUE NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,     -- NULL = permanente
  created_by VARCHAR(255) DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_address ON blocked_ips(ip_address);

-- Función para contar intentos fallidos de una IP en las últimas X horas
CREATE OR REPLACE FUNCTION count_failed_attempts(check_ip VARCHAR, hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM admin_login_attempts
    WHERE ip_address = check_ip
      AND success = false
      AND created_at > NOW() - (hours || ' hours')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si una IP está bloqueada
CREATE OR REPLACE FUNCTION is_ip_blocked(check_ip VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_ips
    WHERE ip_address = check_ip
      AND (blocked_until IS NULL OR blocked_until > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de seguridad
CREATE OR REPLACE FUNCTION get_security_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_attempts', (SELECT COUNT(*) FROM admin_login_attempts),
    'failed_attempts_24h', (SELECT COUNT(*) FROM admin_login_attempts WHERE success = false AND created_at > NOW() - INTERVAL '24 hours'),
    'successful_attempts_24h', (SELECT COUNT(*) FROM admin_login_attempts WHERE success = true AND created_at > NOW() - INTERVAL '24 hours'),
    'unique_ips_24h', (SELECT COUNT(DISTINCT ip_address) FROM admin_login_attempts WHERE created_at > NOW() - INTERVAL '24 hours'),
    'blocked_ips', (SELECT COUNT(*) FROM blocked_ips WHERE blocked_until IS NULL OR blocked_until > NOW()),
    'suspicious_ips', (
      SELECT json_agg(
        json_build_object(
          'ip', ip_address,
          'attempts', attempt_count,
          'last_attempt', last_attempt
        )
      )
      FROM (
        SELECT 
          ip_address,
          COUNT(*) as attempt_count,
          MAX(created_at) as last_attempt
        FROM admin_login_attempts
        WHERE success = false
          AND created_at > NOW() - INTERVAL '24 hours'
        GROUP BY ip_address
        HAVING COUNT(*) >= 3
        ORDER BY attempt_count DESC
        LIMIT 10
      ) suspicious
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (solo lectura pública para insertar logs)
CREATE POLICY "Allow insert for all" ON admin_login_attempts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for all" ON admin_login_attempts
  FOR SELECT USING (true);

CREATE POLICY "Allow select blocked_ips" ON blocked_ips
  FOR SELECT USING (true);

CREATE POLICY "Allow insert blocked_ips" ON blocked_ips
  FOR INSERT WITH CHECK (true);

-- Vista para el dashboard de seguridad
CREATE OR REPLACE VIEW admin_security_dashboard AS
SELECT 
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) as total_intentos,
  COUNT(*) FILTER (WHERE success = true) as exitosos,
  COUNT(*) FILTER (WHERE success = false) as fallidos,
  COUNT(DISTINCT ip_address) as ips_unicas
FROM admin_login_attempts
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hora DESC;

-- Comentarios de documentación
COMMENT ON TABLE admin_login_attempts IS 'Registro de todos los intentos de acceso al panel de administración';
COMMENT ON TABLE blocked_ips IS 'IPs bloqueadas temporal o permanentemente';
COMMENT ON COLUMN admin_login_attempts.attempted_password IS 'Contraseña intentada - almacenada para análisis de patrones de ataque';
COMMENT ON COLUMN admin_login_attempts.attempt_number IS 'Número secuencial de intentos desde esta IP';
