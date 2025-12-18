-- Sistema de Analytics para Panel de Administrador
-- Rastrear visitas y interacciones de usuarios

-- 1. Tabla de visitas generales
CREATE TABLE IF NOT EXISTS site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  page_url TEXT
);

-- 2. Tabla de interacciones por sección
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  interaction_type VARCHAR(50) NOT NULL, -- 'view_announcements', 'view_voting', 'submit_suggestion', etc.
  section VARCHAR(50) NOT NULL, -- 'announcements', 'voting', 'suggestions'
  item_id VARCHAR(255), -- ID del elemento específico (votación, anuncio, etc.)
  interaction_data JSONB, -- Datos adicionales
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  duration_seconds INTEGER -- Tiempo en la sección
);

-- 3. Índices para optimizar consultas de analytics
CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at 
ON site_visits(visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_visits_user_id 
ON site_visits(user_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_site_visits_session 
ON site_visits(session_id);

CREATE INDEX IF NOT EXISTS idx_interactions_type 
ON user_interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_interactions_section 
ON user_interactions(section);

CREATE INDEX IF NOT EXISTS idx_interactions_created_at 
ON user_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_user_id 
ON user_interactions(user_id) 
WHERE user_id IS NOT NULL;

-- 4. Vista para estadísticas rápidas (alineada con cálculos del dashboard)
DROP VIEW IF EXISTS analytics_summary;

CREATE VIEW analytics_summary AS
SELECT 
  COUNT(*) as visits,  -- Total de pageviews (alineado con totalVisits en código)
  COUNT(DISTINCT session_id) as unique_sessions,  -- Sesiones únicas totales
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,  -- Usuarios únicos autenticados
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as authenticated_visits,  -- Visitas autenticadas
  COUNT(*) FILTER (WHERE user_id IS NULL) as anonymous_visits,  -- Visitas anónimas
  DATE_TRUNC('day', visited_at)::date as visit_date
FROM site_visits
GROUP BY visit_date
ORDER BY visit_date DESC;

-- 5. Vista para interacciones por sección
CREATE OR REPLACE VIEW section_interactions AS
SELECT 
  section,
  interaction_type,
  COUNT(*) as interaction_count,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(duration_seconds) as avg_duration,
  DATE_TRUNC('day', created_at) as interaction_date
FROM user_interactions
GROUP BY section, interaction_type, DATE_TRUNC('day', created_at)
ORDER BY interaction_date DESC, interaction_count DESC;

-- 6. Función para obtener top usuarios más activos
CREATE OR REPLACE FUNCTION get_top_active_users(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  total_interactions BIGINT,
  last_interaction TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.nombre,
    u.email,
    COUNT(ui.id) as total_interactions,
    MAX(ui.created_at) as last_interaction
  FROM users u
  JOIN user_interactions ui ON u.id = ui.user_id
  GROUP BY u.id, u.nombre, u.email
  ORDER BY total_interactions DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Comentarios para documentación
COMMENT ON TABLE site_visits IS 'Registro de visitas al sitio web';
COMMENT ON TABLE user_interactions IS 'Registro de interacciones de usuarios por sección';
COMMENT ON COLUMN user_interactions.interaction_type IS 'Tipo de interacción: view_announcements, view_voting, submit_suggestion, vote, etc.';
COMMENT ON COLUMN user_interactions.duration_seconds IS 'Tiempo que el usuario pasó en la sección';

-- 8. Verificar tablas creadas
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('site_visits', 'user_interactions')
ORDER BY table_name;
