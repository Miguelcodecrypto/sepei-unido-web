-- Reconstruir la fecha de último acceso de cada usuario.
--
-- `users.lastlogin` existe desde hace meses pero estaba SIEMPRE a NULL: hasta el
-- 2026-09-14 `api/auth.ts` escribía en `last_login` (con guion bajo), una columna
-- que no existe, y PostgREST rechazaba el update en silencio. El bug está
-- arreglado, pero eso solo arregla el futuro: sin este backfill, el panel de
-- administración pintaría a los 128 usuarios como "nunca ha entrado", que es
-- falso y además inutiliza la señal (si todo está en rojo, el rojo no informa).
--
-- El histórico sí está, en `user_sessions`: ese INSERT nunca falló. De ahí se
-- recupera tanto el momento en que se creó cada sesión (`created_at`, que es un
-- login real) como la última vez que se usó (`last_activity`, que se refresca en
-- cada `action=session`). GREATEST en PostgreSQL ignora los NULL, así que basta
-- con pedirle el mayor de los dos máximos.
--
-- Solo se escribe hacia delante (`lastlogin < ultimo`): si por lo que sea una
-- fila ya tuviera una fecha más reciente que lo que dicen sus sesiones, esta
-- migración no la retrasa.

UPDATE "public"."users" AS "u"
   SET "lastlogin" = "s"."ultimo"
  FROM (
        SELECT "user_id",
               GREATEST(MAX("created_at"), MAX("last_activity")) AS "ultimo"
          FROM "public"."user_sessions"
         GROUP BY "user_id"
       ) AS "s"
 WHERE "s"."user_id" = "u"."id"
   AND "s"."ultimo" IS NOT NULL
   AND ("u"."lastlogin" IS NULL OR "u"."lastlogin" < "s"."ultimo");

-- El nombre de la columna es heredado y se queda: renombrarla obligaría a
-- regenerar `api/_lib/database.types.ts` y a tocar todo lo que la lee, a cambio
-- de nada. Lo que sí importa es que su significado quede escrito en la propia
-- base de datos, porque ya no es solo el login.
COMMENT ON COLUMN "public"."users"."lastlogin" IS
    'Último acceso del usuario: se actualiza al iniciar sesión y también cuando '
    'entra con una sesión ya abierta (api/auth.ts, action=session, con un margen '
    'de 15 min para no escribir en cada carga). NULL = nunca ha entrado. Medir '
    'solo logins no sirve: las sesiones duran 7 días, así que quien entra a '
    'diario se loguearía una vez por semana y parecería inactivo.';
