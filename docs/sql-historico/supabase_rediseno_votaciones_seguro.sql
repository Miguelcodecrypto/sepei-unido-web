-- Rediseño de seguridad del sistema de votaciones.
--
-- Problema que corrige (ver auditoría 2026-08-06):
-- 1. RLS estaba desactivado en votaciones/opciones_votacion/votos (supabase_disable_rls_voting.sql
--    lo apagó porque las políticas originales dependían de auth.uid(), que esta app nunca usa —
--    no hay Supabase Auth real, todo el login es propio vía api/auth.ts). Con RLS apagado,
--    cualquiera con la anon key podía votar ilimitadas veces, votar por otra persona, borrar
--    votaciones ajenas o votos ajenos, directamente desde la consola del navegador.
-- 2. El UNIQUE(votacion_id, user_id, opcion_id) no impedía votar por dos opciones distintas en
--    una votación de opción única — solo bloqueaba repetir la misma opción.
-- 3. La tabla votos guardaba user_email + opcion_id en la misma fila, sin ningún control de
--    acceso real: quien pudiera leer la tabla (que con RLS apagado era cualquiera) veía
--    exactamente qué votó cada persona. En un voto sindical eso rompe el secreto del voto.
--
-- Solución: todo el acceso pasa ahora por api/voting.ts con la service_role key (igual que
-- auth.ts/admin.ts/boe-search.ts). RLS queda activado sin políticas para anon/authenticated —
-- bloqueado por defecto, solo el backend puede tocar estas tablas. Se separa "quién ya
-- participó" (para impedir duplicados) de "qué se votó" (para poder agregar resultados sin
-- que ningún endpoint pueda cruzar persona↔opción).
--
-- Se recrean las tablas porque en producción están vacías (0 filas verificado antes de este
-- cambio) — no hay datos que migrar.

DROP FUNCTION IF EXISTS obtener_resultados_votacion(UUID);
DROP FUNCTION IF EXISTS usuario_ya_voto(UUID, UUID);

DROP TABLE IF EXISTS votos CASCADE;
DROP TABLE IF EXISTS voto_participaciones CASCADE;
DROP TABLE IF EXISTS opciones_votacion CASCADE;
DROP TABLE IF EXISTS votaciones CASCADE;

CREATE TABLE votaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('votacion', 'encuesta', 'referendum')),
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_fin TIMESTAMPTZ NOT NULL,
    publicado BOOLEAN NOT NULL DEFAULT false,
    resultados_publicos BOOLEAN NOT NULL DEFAULT false,
    multiple_respuestas BOOLEAN NOT NULL DEFAULT false,
    creado_por VARCHAR(255),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE opciones_votacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    votacion_id UUID NOT NULL REFERENCES votaciones(id) ON DELETE CASCADE,
    texto VARCHAR(500) NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Recibo" de participación: una fila por persona y votación, sin importar cuántas opciones
-- marque. El UNIQUE es la barrera real (a nivel de base de datos) contra el voto duplicado.
CREATE TABLE voto_participaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    votacion_id UUID NOT NULL REFERENCES votaciones(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL,
    fecha_voto TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(votacion_id, user_id)
);

-- Detalle de qué opciones se marcaron. Deliberadamente sin user_id/user_email: solo referencia
-- participacion_id, así ningún endpoint que lea esta tabla puede devolver "persona X votó Y"
-- sin hacer un join explícito contra voto_participaciones, algo que api/voting.ts nunca expone.
CREATE TABLE votos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    votacion_id UUID NOT NULL REFERENCES votaciones(id) ON DELETE CASCADE,
    opcion_id UUID NOT NULL REFERENCES opciones_votacion(id) ON DELETE CASCADE,
    participacion_id UUID NOT NULL REFERENCES voto_participaciones(id) ON DELETE CASCADE,
    fecha_voto TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_votaciones_publicado ON votaciones(publicado);
CREATE INDEX idx_votaciones_fecha_fin ON votaciones(fecha_fin DESC);
CREATE INDEX idx_opciones_votacion_id ON opciones_votacion(votacion_id);
CREATE INDEX idx_voto_participaciones_votacion_id ON voto_participaciones(votacion_id);
CREATE INDEX idx_votos_votacion_id ON votos(votacion_id);
CREATE INDEX idx_votos_opcion_id ON votos(opcion_id);
CREATE INDEX idx_votos_participacion_id ON votos(participacion_id);

-- Resultados agregados por opción. SECURITY DEFINER + search_path fijo (evita search_path
-- hijacking); solo la llama el backend con service_role, nunca se expone vía RPC a anon/authenticated.
CREATE OR REPLACE FUNCTION obtener_resultados_votacion(votacion_uuid UUID)
RETURNS TABLE (
    opcion_id UUID,
    texto VARCHAR(500),
    total_votos BIGINT,
    porcentaje NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH total_participantes AS (
        SELECT COUNT(*) AS total
        FROM voto_participaciones
        WHERE votacion_id = votacion_uuid
    )
    SELECT
        o.id AS opcion_id,
        o.texto,
        COUNT(v.id) AS total_votos,
        CASE
            WHEN (SELECT total FROM total_participantes) > 0
            THEN ROUND((COUNT(v.id)::NUMERIC / (SELECT total FROM total_participantes)::NUMERIC) * 100, 2)
            ELSE 0
        END AS porcentaje
    FROM opciones_votacion o
    LEFT JOIN votos v ON o.id = v.opcion_id
    WHERE o.votacion_id = votacion_uuid
    GROUP BY o.id, o.texto, o.orden
    ORDER BY o.orden;
END;
$$;

ALTER TABLE votaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE opciones_votacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE voto_participaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE votaciones IS 'Votaciones/encuestas. Acceso exclusivo vía api/voting.ts (service_role) — RLS sin políticas para anon/authenticated.';
COMMENT ON TABLE voto_participaciones IS 'Recibo de participación por (votacion_id, user_id) — previene voto duplicado a nivel de base de datos.';
COMMENT ON TABLE votos IS 'Detalle de opciones marcadas, sin user_id directo — el secreto del voto depende de que ningún endpoint haga join con voto_participaciones.';
