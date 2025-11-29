-- Fix para la función RPC get_top_active_users
-- El error 400 puede ser por tipo de dato incorrecto

-- Eliminar función anterior con todas las posibles firmas
DROP FUNCTION IF EXISTS get_top_active_users(INTEGER);
DROP FUNCTION IF EXISTS get_top_active_users();
DROP FUNCTION IF EXISTS get_top_active_users;

-- Recrear con tipos explícitos
CREATE OR REPLACE FUNCTION get_top_active_users(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  total_interactions BIGINT,
  last_interaction TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.nombre AS user_name,
    u.email AS user_email,
    COUNT(ui.id)::BIGINT AS total_interactions,
    MAX(ui.created_at) AS last_interaction
  FROM users u
  INNER JOIN user_interactions ui ON u.id = ui.user_id
  WHERE ui.user_id IS NOT NULL
  GROUP BY u.id, u.nombre, u.email
  HAVING COUNT(ui.id) > 0
  ORDER BY total_interactions DESC
  LIMIT limit_count;
END;
$$;

-- Verificar que existe
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_top_active_users';
