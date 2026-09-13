-- La analítica deja de tratar direcciones IP.
--
-- `site_visits.ip_address` y `user_interactions.ip_address` guardaban la IP de
-- cada visitante junto a `user_id`, lo que convertía la analítica en seguimiento
-- de comportamiento nominal. El panel de analítica NO muestra ese dato en ningún
-- sitio: se recogía sin usarse.
--
-- Además, obtenerla obligaba a que el navegador de cada visitante preguntase su
-- propia IP a un tercero (api.ipify.org, EEUU), porque el cliente escribe la
-- analítica directamente contra Supabase y no ve las cabeceras del servidor. Al
-- quitar la columna, esa llamada externa desaparece del código.
--
-- ⚠️ Esto ELIMINA las IPs ya registradas. Es el efecto buscado: dejar de
-- recogerlas y conservar las antiguas sería seguir tratándolas.
--
-- Lo que NO toca: `users.registration_ip`, `admin_login_attempts.ip_address` y
-- `blocked_ips`, que sostienen la seguridad de la plataforma y están declarados
-- en la política de privacidad (apartado 3.4).

ALTER TABLE "public"."site_visits" DROP COLUMN IF EXISTS "ip_address";
ALTER TABLE "public"."user_interactions" DROP COLUMN IF EXISTS "ip_address";
