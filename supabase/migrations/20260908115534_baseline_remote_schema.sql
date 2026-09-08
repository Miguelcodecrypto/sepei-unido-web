


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cleanup_expired_sessions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE user_sessions 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_telegram_codes"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM telegram_link_codes 
    WHERE created_at < NOW() - INTERVAL '15 minutes';
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_telegram_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_failed_attempts"("check_ip" character varying, "hours" integer DEFAULT 24) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM admin_login_attempts
    WHERE ip_address = check_ip
      AND success = false
      AND created_at > NOW() - (hours || ' hours')::INTERVAL
  );
END;
$$;


ALTER FUNCTION "public"."count_failed_attempts"("check_ip" character varying, "hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_security_stats"() RETURNS json
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_security_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_telegram_recipients"("p_exclude_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "telegram_chat_id" "text", "nombre" "text", "apellidos" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.telegram_chat_id,
        u.nombre,
        u.apellidos
    FROM users u
    WHERE u.telegram_chat_id IS NOT NULL
    AND u.verified = true
    AND (p_exclude_user_id IS NULL OR u.id != p_exclude_user_id);
END;
$$;


ALTER FUNCTION "public"."get_telegram_recipients"("p_exclude_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_active_users"("limit_count" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "user_name" "text", "user_email" "text", "total_interactions" bigint, "last_interaction" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_top_active_users"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_announcement_views"("announcement_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE announcements
  SET vistas = vistas + 1
  WHERE id = announcement_id;
END;
$$;


ALTER FUNCTION "public"."increment_announcement_views"("announcement_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_ip_blocked"("check_ip" character varying) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_ips
    WHERE ip_address = check_ip
      AND (blocked_until IS NULL OR blocked_until > NOW())
  );
END;
$$;


ALTER FUNCTION "public"."is_ip_blocked"("check_ip" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."obtener_resultados_votacion"("votacion_uuid" "uuid") RETURNS TABLE("opcion_id" "uuid", "texto" character varying, "total_votos" bigint, "porcentaje" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."obtener_resultados_votacion"("votacion_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_external_emails_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_external_emails_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_login_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip_address" character varying(45),
    "attempted_password" "text",
    "attempt_number" integer DEFAULT 1,
    "success" boolean DEFAULT false,
    "user_agent" "text",
    "country" character varying(100),
    "city" character varying(100),
    "blocked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_login_attempts" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_login_attempts" IS 'Registro de todos los intentos de acceso al panel de administración';



COMMENT ON COLUMN "public"."admin_login_attempts"."attempted_password" IS 'Contraseña intentada - almacenada para análisis de patrones de ataque';



COMMENT ON COLUMN "public"."admin_login_attempts"."attempt_number" IS 'Número secuencial de intentos desde esta IP';



CREATE OR REPLACE VIEW "public"."admin_security_dashboard" AS
 SELECT "date_trunc"('hour'::"text", "created_at") AS "hora",
    "count"(*) AS "total_intentos",
    "count"(*) FILTER (WHERE ("success" = true)) AS "exitosos",
    "count"(*) FILTER (WHERE ("success" = false)) AS "fallidos",
    "count"(DISTINCT "ip_address") AS "ips_unicas"
   FROM "public"."admin_login_attempts"
  WHERE ("created_at" > ("now"() - '7 days'::interval))
  GROUP BY ("date_trunc"('hour'::"text", "created_at"))
  ORDER BY ("date_trunc"('hour'::"text", "created_at")) DESC;


ALTER VIEW "public"."admin_security_dashboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" character varying(255),
    "user_id" "uuid",
    "visited_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" character varying(45),
    "user_agent" "text",
    "referrer" "text",
    "page_url" "text"
);


ALTER TABLE "public"."site_visits" OWNER TO "postgres";


COMMENT ON TABLE "public"."site_visits" IS 'Registra todas las visitas al sitio, tanto de usuarios autenticados como anónimos';



CREATE OR REPLACE VIEW "public"."analytics_summary" WITH ("security_invoker"='true') AS
 SELECT "count"(*) AS "visits",
    "count"(DISTINCT "session_id") AS "unique_sessions",
    "count"(DISTINCT "user_id") FILTER (WHERE ("user_id" IS NOT NULL)) AS "unique_users",
    "count"(*) FILTER (WHERE ("user_id" IS NOT NULL)) AS "authenticated_visits",
    "count"(*) FILTER (WHERE ("user_id" IS NULL)) AS "anonymous_visits",
    ("date_trunc"('day'::"text", "visited_at"))::"date" AS "visit_date"
   FROM "public"."site_visits"
  GROUP BY (("date_trunc"('day'::"text", "visited_at"))::"date")
  ORDER BY (("date_trunc"('day'::"text", "visited_at"))::"date") DESC;


ALTER VIEW "public"."analytics_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "contenido" "text" NOT NULL,
    "categoria" character varying(50) NOT NULL,
    "imagen_url" "text",
    "archivo_url" "text",
    "archivo_nombre" character varying(255),
    "archivo_tipo" character varying(100),
    "publicado" boolean DEFAULT false,
    "destacado" boolean DEFAULT false,
    "fecha_publicacion" timestamp with time zone DEFAULT "now"(),
    "fecha_creacion" timestamp with time zone DEFAULT "now"(),
    "autor" character varying(255) NOT NULL,
    "vistas" integer DEFAULT 0,
    "es_html" boolean DEFAULT false,
    CONSTRAINT "announcements_categoria_check" CHECK ((("categoria")::"text" = ANY ((ARRAY['noticia'::character varying, 'comunicado'::character varying, 'evento'::character varying, 'urgente'::character varying])::"text"[])))
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "announcement_id" "uuid",
    "url" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "categoria" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "announcements_attachments_categoria_check" CHECK (("categoria" = ANY (ARRAY['documento'::"text", 'video'::"text", 'audio'::"text", 'link'::"text"])))
);


ALTER TABLE "public"."announcements_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blocked_ips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip_address" character varying(45) NOT NULL,
    "reason" "text",
    "blocked_at" timestamp with time zone DEFAULT "now"(),
    "blocked_until" timestamp with time zone,
    "created_by" character varying(255) DEFAULT 'system'::character varying
);


ALTER TABLE "public"."blocked_ips" OWNER TO "postgres";


COMMENT ON TABLE "public"."blocked_ips" IS 'IPs bloqueadas temporal o permanentemente';



CREATE TABLE IF NOT EXISTS "public"."boe_convocatorias" (
    "id" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "fecha" "text" NOT NULL,
    "fecha_iso" "date" NOT NULL,
    "anio" integer NOT NULL,
    "url_htm" "text",
    "url_pdf" "text",
    "tipo" "text" NOT NULL,
    "departamento" "text" DEFAULT ''::"text" NOT NULL,
    "estado_plazo" "text",
    "dias_restantes" integer,
    "dias_desde_publicacion" integer,
    "prioridad" integer,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."boe_convocatorias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boe_sync_log" (
    "id" bigint NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "finished_at" timestamp with time zone,
    "status" "text" NOT NULL,
    "trigger_source" "text" NOT NULL,
    "dias_consultados" integer,
    "total_resultados" integer,
    "duracion_ms" integer,
    "error" "text"
);


ALTER TABLE "public"."boe_sync_log" OWNER TO "postgres";


ALTER TABLE "public"."boe_sync_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."boe_sync_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."external_emails" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "descripcion" "text",
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."external_emails" OWNER TO "postgres";


COMMENT ON TABLE "public"."external_emails" IS 'Emails externos que recibirán notificaciones sin ser usuarios registrados';



COMMENT ON COLUMN "public"."external_emails"."email" IS 'Dirección de email';



COMMENT ON COLUMN "public"."external_emails"."nombre" IS 'Nombre identificativo para el email';



COMMENT ON COLUMN "public"."external_emails"."descripcion" IS 'Descripción opcional (ej: "Presidente provincial", "Contacto externo")';



COMMENT ON COLUMN "public"."external_emails"."activo" IS 'Si false, no se incluirá en las notificaciones';



CREATE TABLE IF NOT EXISTS "public"."interinos_bibliografia" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "descripcion" "text",
    "url" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "categoria" "text" DEFAULT 'bibliografia'::"text" NOT NULL,
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."interinos_bibliografia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opciones_votacion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "votacion_id" "uuid" NOT NULL,
    "texto" character varying(500) NOT NULL,
    "orden" integer DEFAULT 0 NOT NULL,
    "fecha_creacion" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."opciones_votacion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" character varying(255),
    "user_id" "uuid",
    "interaction_type" character varying(50) NOT NULL,
    "section" character varying(50) NOT NULL,
    "item_id" character varying(255),
    "interaction_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" character varying(45),
    "duration_seconds" integer
);


ALTER TABLE "public"."user_interactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_interactions" IS 'Registra interacciones específicas en secciones (anuncios, votaciones, sugerencias, admin)';



CREATE OR REPLACE VIEW "public"."section_interactions" WITH ("security_invoker"='true') AS
 SELECT "section",
    "interaction_type",
    "date_trunc"('day'::"text", "created_at") AS "interaction_date",
    "count"(*) AS "interaction_count",
    "count"(DISTINCT "user_id") AS "unique_users",
    "count"(DISTINCT "session_id") AS "unique_sessions",
    "avg"("duration_seconds") AS "avg_duration_seconds"
   FROM "public"."user_interactions"
  GROUP BY "section", "interaction_type", ("date_trunc"('day'::"text", "created_at"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC, ("count"(*)) DESC;


ALTER VIEW "public"."section_interactions" OWNER TO "postgres";


COMMENT ON VIEW "public"."section_interactions" IS 'Vista agregada de interacciones por sección y tipo';



CREATE TABLE IF NOT EXISTS "public"."suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "apellidos" "text" NOT NULL,
    "email" "text" NOT NULL,
    "telefono" "text" NOT NULL,
    "categoria" "text" NOT NULL,
    "lugar_trabajo" "text" NOT NULL,
    "asunto" "text" NOT NULL,
    "descripcion" "text" NOT NULL,
    "fecha_registro" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "suggestions_categoria_check" CHECK (("categoria" = ANY (ARRAY['bombero'::"text", 'cabo'::"text", 'sargento'::"text", 'suboficial'::"text", 'oficial'::"text"]))),
    CONSTRAINT "suggestions_lugar_trabajo_check" CHECK (("lugar_trabajo" = ANY (ARRAY['Villarrobledo'::"text", 'Hellín'::"text", 'Almansa'::"text", 'La Roda'::"text", 'Alcaraz'::"text", 'Molinicos'::"text", 'Casas Ibáñez'::"text"])))
);


ALTER TABLE "public"."suggestions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."telegram_link_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "code" character varying(6) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."telegram_link_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."telegram_notification_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "chat_id" "text" NOT NULL,
    "notification_type" character varying(50) NOT NULL,
    "reference_id" "uuid",
    "status" character varying(20) NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."telegram_notification_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "apellidos" "text",
    "dni" "text",
    "email" "text" NOT NULL,
    "telefono" "text",
    "fecha_registro" timestamp with time zone DEFAULT "now"(),
    "terminos_aceptados" boolean DEFAULT true,
    "fecha_aceptacion_terminos" timestamp with time zone DEFAULT "now"(),
    "version_terminos" "text" DEFAULT '1.0'::"text",
    "certificado_nif" "text",
    "certificado_thumbprint" "text",
    "certificado_fecha_validacion" timestamp with time zone,
    "certificado_valido" boolean,
    "verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "requires_password_change" boolean DEFAULT false,
    "registration_ip" character varying(45),
    "password" character varying(255),
    "lastlogin" timestamp with time zone,
    "password_changed_at" timestamp with time zone,
    "autorizado_votar" boolean DEFAULT false,
    "verification_token" character varying(255),
    "verification_token_expires_at" timestamp with time zone,
    "email_notifications" boolean DEFAULT true,
    "parque_sepei" "text",
    "telegram_chat_id" "text",
    "telegram_username" "text",
    "telegram_linked_at" timestamp with time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."autorizado_votar" IS 'Indica si el administrador ha autorizado al usuario para poder votar';



COMMENT ON COLUMN "public"."users"."verification_token" IS 'Token único para verificar el email del usuario';



COMMENT ON COLUMN "public"."users"."verification_token_expires_at" IS 'Fecha de expiración del token de verificación (24 horas desde creación)';



COMMENT ON COLUMN "public"."users"."email_notifications" IS 'Indica si el usuario desea recibir notificaciones por email de anuncios y votaciones';



CREATE OR REPLACE VIEW "public"."telegram_stats" AS
 SELECT "count"(*) FILTER (WHERE ("telegram_chat_id" IS NOT NULL)) AS "usuarios_vinculados",
    "count"(*) AS "total_usuarios",
    "round"(((100.0 * ("count"(*) FILTER (WHERE ("telegram_chat_id" IS NOT NULL)))::numeric) / (NULLIF("count"(*), 0))::numeric), 2) AS "porcentaje_vinculados"
   FROM "public"."users";


ALTER VIEW "public"."telegram_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_token" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "ip_address" character varying(45),
    "user_agent" "text",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_sessions" IS 'Sesiones de usuario activas - reemplaza localStorage para autenticación';



COMMENT ON COLUMN "public"."user_sessions"."session_token" IS 'Token único de sesión (JWT o UUID)';



COMMENT ON COLUMN "public"."user_sessions"."expires_at" IS 'Fecha de expiración de la sesión (defecto: 7 días)';



COMMENT ON COLUMN "public"."user_sessions"."last_activity" IS 'Última actividad del usuario para renovación automática';



CREATE TABLE IF NOT EXISTS "public"."votaciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "descripcion" "text",
    "tipo" character varying(50) NOT NULL,
    "fecha_inicio" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_fin" timestamp with time zone NOT NULL,
    "publicado" boolean DEFAULT false NOT NULL,
    "resultados_publicos" boolean DEFAULT false NOT NULL,
    "multiple_respuestas" boolean DEFAULT false NOT NULL,
    "creado_por" character varying(255),
    "fecha_creacion" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "votaciones_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['votacion'::character varying, 'encuesta'::character varying, 'referendum'::character varying])::"text"[])))
);


ALTER TABLE "public"."votaciones" OWNER TO "postgres";


COMMENT ON TABLE "public"."votaciones" IS 'Votaciones/encuestas. Acceso exclusivo vía api/voting.ts (service_role) — RLS sin políticas para anon/authenticated.';



CREATE TABLE IF NOT EXISTS "public"."voto_participaciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "votacion_id" "uuid" NOT NULL,
    "user_id" character varying(50) NOT NULL,
    "fecha_voto" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."voto_participaciones" OWNER TO "postgres";


COMMENT ON TABLE "public"."voto_participaciones" IS 'Recibo de participación por (votacion_id, user_id) — previene voto duplicado a nivel de base de datos.';



CREATE TABLE IF NOT EXISTS "public"."votos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "votacion_id" "uuid" NOT NULL,
    "opcion_id" "uuid" NOT NULL,
    "participacion_id" "uuid" NOT NULL,
    "fecha_voto" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."votos" OWNER TO "postgres";


COMMENT ON TABLE "public"."votos" IS 'Detalle de opciones marcadas, sin user_id directo — el secreto del voto depende de que ningún endpoint haga join con voto_participaciones.';



ALTER TABLE ONLY "public"."admin_login_attempts"
    ADD CONSTRAINT "admin_login_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements_attachments"
    ADD CONSTRAINT "announcements_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocked_ips"
    ADD CONSTRAINT "blocked_ips_ip_address_key" UNIQUE ("ip_address");



ALTER TABLE ONLY "public"."blocked_ips"
    ADD CONSTRAINT "blocked_ips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boe_convocatorias"
    ADD CONSTRAINT "boe_convocatorias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boe_sync_log"
    ADD CONSTRAINT "boe_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_emails"
    ADD CONSTRAINT "external_emails_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."external_emails"
    ADD CONSTRAINT "external_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interinos_bibliografia"
    ADD CONSTRAINT "interinos_bibliografia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opciones_votacion"
    ADD CONSTRAINT "opciones_votacion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_visits"
    ADD CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suggestions"
    ADD CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."telegram_link_codes"
    ADD CONSTRAINT "telegram_link_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."telegram_link_codes"
    ADD CONSTRAINT "telegram_link_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."telegram_notification_log"
    ADD CONSTRAINT "telegram_notification_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."telegram_link_codes"
    ADD CONSTRAINT "unique_user_link_code" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votaciones"
    ADD CONSTRAINT "votaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voto_participaciones"
    ADD CONSTRAINT "voto_participaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voto_participaciones"
    ADD CONSTRAINT "voto_participaciones_votacion_id_user_id_key" UNIQUE ("votacion_id", "user_id");



ALTER TABLE ONLY "public"."votos"
    ADD CONSTRAINT "votos_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_admin_login_attempts_blocked" ON "public"."admin_login_attempts" USING "btree" ("blocked");



CREATE INDEX "idx_admin_login_attempts_created_at" ON "public"."admin_login_attempts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_login_attempts_ip" ON "public"."admin_login_attempts" USING "btree" ("ip_address");



CREATE INDEX "idx_admin_login_attempts_success" ON "public"."admin_login_attempts" USING "btree" ("success");



CREATE INDEX "idx_announcements_attachments_announcement" ON "public"."announcements_attachments" USING "btree" ("announcement_id");



CREATE INDEX "idx_announcements_attachments_categoria" ON "public"."announcements_attachments" USING "btree" ("categoria");



CREATE INDEX "idx_announcements_categoria" ON "public"."announcements" USING "btree" ("categoria");



CREATE INDEX "idx_announcements_destacado" ON "public"."announcements" USING "btree" ("destacado");



CREATE INDEX "idx_announcements_fecha_publicacion" ON "public"."announcements" USING "btree" ("fecha_publicacion" DESC);



CREATE INDEX "idx_announcements_publicado" ON "public"."announcements" USING "btree" ("publicado");



CREATE INDEX "idx_blocked_ips_address" ON "public"."blocked_ips" USING "btree" ("ip_address");



CREATE INDEX "idx_boe_convocatorias_fecha_iso" ON "public"."boe_convocatorias" USING "btree" ("fecha_iso" DESC);



CREATE INDEX "idx_boe_sync_log_started_at" ON "public"."boe_sync_log" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_external_emails_activo" ON "public"."external_emails" USING "btree" ("activo") WHERE ("activo" = true);



CREATE INDEX "idx_external_emails_email" ON "public"."external_emails" USING "btree" ("email");



CREATE INDEX "idx_interinos_bibliografia_categoria" ON "public"."interinos_bibliografia" USING "btree" ("categoria");



CREATE INDEX "idx_interinos_bibliografia_created_at" ON "public"."interinos_bibliografia" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_opciones_votacion_id" ON "public"."opciones_votacion" USING "btree" ("votacion_id");



CREATE INDEX "idx_site_visits_session_id" ON "public"."site_visits" USING "btree" ("session_id");



CREATE INDEX "idx_site_visits_user_id" ON "public"."site_visits" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_site_visits_visited_at" ON "public"."site_visits" USING "btree" ("visited_at" DESC);



CREATE INDEX "idx_suggestions_email" ON "public"."suggestions" USING "btree" ("email");



CREATE INDEX "idx_suggestions_fecha" ON "public"."suggestions" USING "btree" ("fecha_registro");



CREATE INDEX "idx_telegram_link_codes_code" ON "public"."telegram_link_codes" USING "btree" ("code");



CREATE INDEX "idx_telegram_log_created" ON "public"."telegram_notification_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_telegram_log_user" ON "public"."telegram_notification_log" USING "btree" ("user_id");



CREATE INDEX "idx_user_interactions_created_at" ON "public"."user_interactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_interactions_section" ON "public"."user_interactions" USING "btree" ("section");



CREATE INDEX "idx_user_interactions_type" ON "public"."user_interactions" USING "btree" ("interaction_type");



CREATE INDEX "idx_user_interactions_user_id" ON "public"."user_interactions" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_user_sessions_expires" ON "public"."user_sessions" USING "btree" ("expires_at") WHERE ("is_active" = true);



CREATE INDEX "idx_user_sessions_token" ON "public"."user_sessions" USING "btree" ("session_token") WHERE ("is_active" = true);



CREATE INDEX "idx_user_sessions_user_id" ON "public"."user_sessions" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_users_certificado_nif" ON "public"."users" USING "btree" ("certificado_nif");



CREATE INDEX "idx_users_dni" ON "public"."users" USING "btree" ("dni");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_email_notifications" ON "public"."users" USING "btree" ("email_notifications") WHERE ("email_notifications" = true);



CREATE INDEX "idx_users_telegram_chat_id" ON "public"."users" USING "btree" ("telegram_chat_id") WHERE ("telegram_chat_id" IS NOT NULL);



CREATE INDEX "idx_users_verification_token" ON "public"."users" USING "btree" ("verification_token") WHERE ("verification_token" IS NOT NULL);



CREATE INDEX "idx_votaciones_fecha_fin" ON "public"."votaciones" USING "btree" ("fecha_fin" DESC);



CREATE INDEX "idx_votaciones_publicado" ON "public"."votaciones" USING "btree" ("publicado");



CREATE INDEX "idx_voto_participaciones_votacion_id" ON "public"."voto_participaciones" USING "btree" ("votacion_id");



CREATE INDEX "idx_votos_opcion_id" ON "public"."votos" USING "btree" ("opcion_id");



CREATE INDEX "idx_votos_participacion_id" ON "public"."votos" USING "btree" ("participacion_id");



CREATE INDEX "idx_votos_votacion_id" ON "public"."votos" USING "btree" ("votacion_id");



CREATE UNIQUE INDEX "users_dni_unique_idx" ON "public"."users" USING "btree" ("upper"("dni")) WHERE ("dni" IS NOT NULL);



CREATE UNIQUE INDEX "users_email_unique_idx" ON "public"."users" USING "btree" ("lower"("email")) WHERE ("email" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trigger_update_external_emails_updated_at" BEFORE UPDATE ON "public"."external_emails" FOR EACH ROW EXECUTE FUNCTION "public"."update_external_emails_updated_at"();



ALTER TABLE ONLY "public"."announcements_attachments"
    ADD CONSTRAINT "announcements_attachments_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opciones_votacion"
    ADD CONSTRAINT "opciones_votacion_votacion_id_fkey" FOREIGN KEY ("votacion_id") REFERENCES "public"."votaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_visits"
    ADD CONSTRAINT "site_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."telegram_link_codes"
    ADD CONSTRAINT "telegram_link_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."telegram_notification_log"
    ADD CONSTRAINT "telegram_notification_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voto_participaciones"
    ADD CONSTRAINT "voto_participaciones_votacion_id_fkey" FOREIGN KEY ("votacion_id") REFERENCES "public"."votaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votos"
    ADD CONSTRAINT "votos_opcion_id_fkey" FOREIGN KEY ("opcion_id") REFERENCES "public"."opciones_votacion"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votos"
    ADD CONSTRAINT "votos_participacion_id_fkey" FOREIGN KEY ("participacion_id") REFERENCES "public"."voto_participaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votos"
    ADD CONSTRAINT "votos_votacion_id_fkey" FOREIGN KEY ("votacion_id") REFERENCES "public"."votaciones"("id") ON DELETE CASCADE;



CREATE POLICY "Adjuntos de anuncios publicados visibles para todos" ON "public"."announcements_attachments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."announcements" "a"
  WHERE (("a"."id" = "announcements_attachments"."announcement_id") AND ("a"."publicado" = true)))));



CREATE POLICY "Anuncios publicados son visibles para todos" ON "public"."announcements" FOR SELECT USING (("publicado" = true));



CREATE POLICY "Contenido de interinos visible para todos" ON "public"."interinos_bibliografia" FOR SELECT USING (true);



CREATE POLICY "Registro de interacciones abierto, lectura cerrada" ON "public"."user_interactions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Registro de visitas abierto, lectura cerrada" ON "public"."site_visits" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."admin_login_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blocked_ips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boe_convocatorias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boe_sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."external_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interinos_bibliografia" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opciones_votacion" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suggestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."telegram_link_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."telegram_notification_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."votaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voto_participaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."votos" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."cleanup_expired_sessions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_expired_telegram_codes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_telegram_codes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."count_failed_attempts"("check_ip" character varying, "hours" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."count_failed_attempts"("check_ip" character varying, "hours" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_security_stats"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_security_stats"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_telegram_recipients"("p_exclude_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_telegram_recipients"("p_exclude_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_top_active_users"("limit_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_top_active_users"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_announcement_views"("announcement_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_announcement_views"("announcement_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_announcement_views"("announcement_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_ip_blocked"("check_ip" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_ip_blocked"("check_ip" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."obtener_resultados_votacion"("votacion_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."obtener_resultados_votacion"("votacion_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_external_emails_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_external_emails_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin_login_attempts" TO "anon";
GRANT ALL ON TABLE "public"."admin_login_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_login_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."admin_security_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."admin_security_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_security_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."site_visits" TO "anon";
GRANT ALL ON TABLE "public"."site_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."site_visits" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_summary" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."announcements_attachments" TO "anon";
GRANT ALL ON TABLE "public"."announcements_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."blocked_ips" TO "anon";
GRANT ALL ON TABLE "public"."blocked_ips" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_ips" TO "service_role";



GRANT ALL ON TABLE "public"."boe_convocatorias" TO "anon";
GRANT ALL ON TABLE "public"."boe_convocatorias" TO "authenticated";
GRANT ALL ON TABLE "public"."boe_convocatorias" TO "service_role";



GRANT ALL ON TABLE "public"."boe_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."boe_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."boe_sync_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."boe_sync_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."boe_sync_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."boe_sync_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."external_emails" TO "anon";
GRANT ALL ON TABLE "public"."external_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."external_emails" TO "service_role";



GRANT ALL ON TABLE "public"."interinos_bibliografia" TO "anon";
GRANT ALL ON TABLE "public"."interinos_bibliografia" TO "authenticated";
GRANT ALL ON TABLE "public"."interinos_bibliografia" TO "service_role";



GRANT ALL ON TABLE "public"."opciones_votacion" TO "anon";
GRANT ALL ON TABLE "public"."opciones_votacion" TO "authenticated";
GRANT ALL ON TABLE "public"."opciones_votacion" TO "service_role";



GRANT ALL ON TABLE "public"."user_interactions" TO "anon";
GRANT ALL ON TABLE "public"."user_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."section_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."section_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."suggestions" TO "anon";
GRANT ALL ON TABLE "public"."suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."telegram_link_codes" TO "anon";
GRANT ALL ON TABLE "public"."telegram_link_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."telegram_link_codes" TO "service_role";



GRANT ALL ON TABLE "public"."telegram_notification_log" TO "anon";
GRANT ALL ON TABLE "public"."telegram_notification_log" TO "authenticated";
GRANT ALL ON TABLE "public"."telegram_notification_log" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."telegram_stats" TO "anon";
GRANT ALL ON TABLE "public"."telegram_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."telegram_stats" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."votaciones" TO "anon";
GRANT ALL ON TABLE "public"."votaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."votaciones" TO "service_role";



GRANT ALL ON TABLE "public"."voto_participaciones" TO "anon";
GRANT ALL ON TABLE "public"."voto_participaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."voto_participaciones" TO "service_role";



GRANT ALL ON TABLE "public"."votos" TO "anon";
GRANT ALL ON TABLE "public"."votos" TO "authenticated";
GRANT ALL ON TABLE "public"."votos" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































