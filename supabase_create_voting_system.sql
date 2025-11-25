-- Sistema de Votaciones para Sepei Unido
-- Este script crea las tablas necesarias para el sistema de votaciones

-- Tabla de votaciones/encuestas
CREATE TABLE IF NOT EXISTS votaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('votacion', 'encuesta', 'referendum')),
    fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    publicado BOOLEAN DEFAULT false,
    resultados_publicos BOOLEAN DEFAULT false,
    multiple_respuestas BOOLEAN DEFAULT false, -- Permite seleccionar múltiples opciones
    creado_por VARCHAR(255),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de opciones de votación
CREATE TABLE IF NOT EXISTS opciones_votacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    votacion_id UUID NOT NULL REFERENCES votaciones(id) ON DELETE CASCADE,
    texto VARCHAR(500) NOT NULL,
    orden INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de votos
CREATE TABLE IF NOT EXISTS votos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    votacion_id UUID NOT NULL REFERENCES votaciones(id) ON DELETE CASCADE,
    opcion_id UUID NOT NULL REFERENCES opciones_votacion(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    fecha_voto TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Un usuario solo puede votar una vez por votación (excepto si permite múltiples respuestas)
    UNIQUE(votacion_id, user_id, opcion_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_votaciones_publicado ON votaciones(publicado);
CREATE INDEX IF NOT EXISTS idx_votaciones_fecha_fin ON votaciones(fecha_fin DESC);
CREATE INDEX IF NOT EXISTS idx_opciones_votacion_id ON opciones_votacion(votacion_id);
CREATE INDEX IF NOT EXISTS idx_votos_votacion_id ON votos(votacion_id);
CREATE INDEX IF NOT EXISTS idx_votos_user_id ON votos(user_id);
CREATE INDEX IF NOT EXISTS idx_votos_opcion_id ON votos(opcion_id);

-- Función para obtener resultados de una votación
CREATE OR REPLACE FUNCTION obtener_resultados_votacion(votacion_uuid UUID)
RETURNS TABLE (
    opcion_id UUID,
    texto VARCHAR(500),
    total_votos BIGINT,
    porcentaje NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH votos_totales AS (
        SELECT COUNT(DISTINCT user_id) as total
        FROM votos
        WHERE votacion_id = votacion_uuid
    )
    SELECT 
        o.id as opcion_id,
        o.texto,
        COUNT(v.id) as total_votos,
        CASE 
            WHEN (SELECT total FROM votos_totales) > 0 
            THEN ROUND((COUNT(v.id)::NUMERIC / (SELECT total FROM votos_totales)::NUMERIC) * 100, 2)
            ELSE 0
        END as porcentaje
    FROM opciones_votacion o
    LEFT JOIN votos v ON o.id = v.opcion_id
    WHERE o.votacion_id = votacion_uuid
    GROUP BY o.id, o.texto, o.orden
    ORDER BY o.orden;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un usuario ya votó
CREATE OR REPLACE FUNCTION usuario_ya_voto(votacion_uuid UUID, usuario_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM votos 
        WHERE votacion_id = votacion_uuid 
        AND user_id = usuario_id
    );
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) Policies

-- Habilitar RLS en las tablas
ALTER TABLE votaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE opciones_votacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos ENABLE ROW LEVEL SECURITY;

-- Políticas para votaciones
-- Todos pueden ver votaciones publicadas
DROP POLICY IF EXISTS "Votaciones públicas visibles para todos" ON votaciones;
CREATE POLICY "Votaciones públicas visibles para todos"
ON votaciones FOR SELECT
USING (publicado = true);

-- Solo admins pueden gestionar votaciones (insertar, actualizar, eliminar)
DROP POLICY IF EXISTS "Admins pueden gestionar votaciones" ON votaciones;
CREATE POLICY "Admins pueden gestionar votaciones"
ON votaciones FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para opciones_votacion
-- Todos pueden ver opciones de votaciones publicadas
DROP POLICY IF EXISTS "Opciones de votaciones públicas visibles" ON opciones_votacion;
CREATE POLICY "Opciones de votaciones públicas visibles"
ON opciones_votacion FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM votaciones 
        WHERE votaciones.id = opciones_votacion.votacion_id 
        AND votaciones.publicado = true
    )
);

-- Solo admins pueden gestionar opciones
DROP POLICY IF EXISTS "Admins pueden gestionar opciones" ON opciones_votacion;
CREATE POLICY "Admins pueden gestionar opciones"
ON opciones_votacion FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para votos
-- Usuarios autenticados pueden insertar su voto
DROP POLICY IF EXISTS "Usuarios pueden votar" ON votos;
CREATE POLICY "Usuarios pueden votar"
ON votos FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM votaciones 
        WHERE votaciones.id = votos.votacion_id 
        AND votaciones.publicado = true
        AND NOW() BETWEEN votaciones.fecha_inicio AND votaciones.fecha_fin
    )
);

-- Los votos solo son visibles si los resultados son públicos o si eres admin
DROP POLICY IF EXISTS "Ver votos según configuración" ON votos;
CREATE POLICY "Ver votos según configuración"
ON votos FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM votaciones 
        WHERE votaciones.id = votos.votacion_id 
        AND votaciones.resultados_publicos = true
    )
    OR auth.uid() IS NOT NULL
);

-- Admins pueden gestionar todos los votos
DROP POLICY IF EXISTS "Admins pueden gestionar votos" ON votos;
CREATE POLICY "Admins pueden gestionar votos"
ON votos FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Comentarios en las tablas
COMMENT ON TABLE votaciones IS 'Almacena las votaciones y encuestas del sistema';
COMMENT ON TABLE opciones_votacion IS 'Opciones disponibles para cada votación';
COMMENT ON TABLE votos IS 'Registro de votos emitidos por los usuarios';
COMMENT ON COLUMN votaciones.multiple_respuestas IS 'Permite a los usuarios seleccionar múltiples opciones';
COMMENT ON COLUMN votaciones.resultados_publicos IS 'Define si los resultados son visibles públicamente';
