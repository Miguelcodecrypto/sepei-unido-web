-- Persistencia de resultados de la búsqueda de convocatorias del BOE.
-- Antes, /api/boe-search recalculaba esto en cada visita (barrido de 90 días +
-- verificación secuencial de cientos de documentos, 60-90s por petición, al borde
-- del timeout de Vercel). Ahora un cron diario (ver vercel.json) escribe aquí y
-- el endpoint público solo lee esta tabla.
--
-- Solo escribe/lee el backend con la service_role key (api/boe-search.ts,
-- api/_lib/supabaseAdmin.ts) — nunca se expone a la anon key del cliente, por eso
-- RLS se deja activado sin ninguna política: bloqueado por defecto a anon/authenticated,
-- el service_role bypasa RLS igualmente.

CREATE TABLE IF NOT EXISTS boe_convocatorias (
  id text PRIMARY KEY,
  titulo text NOT NULL,
  fecha text NOT NULL,
  fecha_iso date NOT NULL,
  anio integer NOT NULL,
  url_htm text,
  url_pdf text,
  tipo text NOT NULL,
  departamento text NOT NULL DEFAULT '',
  estado_plazo text,
  dias_restantes integer,
  dias_desde_publicacion integer,
  prioridad integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boe_convocatorias_fecha_iso ON boe_convocatorias (fecha_iso DESC);

ALTER TABLE boe_convocatorias ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS boe_sync_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  status text NOT NULL,
  trigger_source text NOT NULL,
  dias_consultados integer,
  total_resultados integer,
  duracion_ms integer,
  error text
);

CREATE INDEX IF NOT EXISTS idx_boe_sync_log_started_at ON boe_sync_log (started_at DESC);

ALTER TABLE boe_sync_log ENABLE ROW LEVEL SECURITY;
