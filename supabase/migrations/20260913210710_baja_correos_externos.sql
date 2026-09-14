-- Vía de baja para los contactos externos.
--
-- `external_emails` guarda direcciones de ayuntamientos, servicios y algún
-- contacto personal que nunca pasaron por un formulario: no dieron consentimiento
-- y, hasta ahora, tampoco tenían forma de dejar de recibir correos. Ningún envío
-- llevaba enlace de baja.
--
-- `unsubscribe_token` es la credencial del enlace que viaja en el correo. Se
-- genera por fila (gen_random_uuid() es volátil, así que al añadir la columna
-- cada contacto existente recibe el suyo) y no se deriva del email, para que no
-- se pueda adivinar el de otro.
--
-- `baja_at` deja constancia de CUÁNDO se dio de baja, que es lo que permite
-- demostrar que se respetó la petición. El flag efectivo sigue siendo `activo`,
-- que ya existía y que el panel respeta al elegir destinatarios.

ALTER TABLE "public"."external_emails"
    ADD COLUMN IF NOT EXISTS "unsubscribe_token" "uuid" NOT NULL DEFAULT "gen_random_uuid"();

CREATE UNIQUE INDEX IF NOT EXISTS "external_emails_unsubscribe_token_key"
    ON "public"."external_emails" ("unsubscribe_token");

ALTER TABLE "public"."external_emails"
    ADD COLUMN IF NOT EXISTS "baja_at" timestamp with time zone;

COMMENT ON COLUMN "public"."external_emails"."unsubscribe_token" IS
    'Credencial del enlace de baja que viaja en cada correo enviado a este contacto.';
COMMENT ON COLUMN "public"."external_emails"."baja_at" IS
    'Cuándo se dio de baja por su propia petición. NULL = sigue de alta.';
