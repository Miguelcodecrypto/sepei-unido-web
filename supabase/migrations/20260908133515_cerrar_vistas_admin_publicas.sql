-- Cierra el acceso anónimo a dos vistas que quedaron abiertas.
--
-- Detectado el 2026-09-08 al generar el baseline: `admin_security_dashboard` y
-- `telegram_stats` no tenían `security_invoker`, así que se ejecutaban con los
-- permisos de su propietario y servían datos con la anon key —que es pública por
-- diseño— pese a que las tablas de debajo tienen RLS cerrado.
--
-- Verificado antes del cambio contra producción:
--   GET /rest/v1/admin_security_dashboard -> 200 con actividad de login del panel
--     admin por hora (intentos, exitosos, fallidos, IPs únicas de los últimos 7 días).
--     Es inteligencia directa para quien esté intentando entrar: le dice si sus
--     intentos se registran y cuándo entra el administrador de verdad.
--   GET /rest/v1/telegram_stats -> 200 con {usuarios_vinculados: 6, total_usuarios: 63}.
--
-- Es el mismo fallo que ya se corrigió en B5 para `analytics_summary` y
-- `section_interactions`: cerrar el RLS de una tabla NO tapa las vistas que hay
-- encima. Estas dos se escaparon entonces porque B5 solo revisó las de analíticas.
--
-- Ninguna de las dos se usa en `src/` ni en `api/` (comprobado por grep), así que
-- cerrarlas no rompe nada. El panel admin lee esos datos por otra vía:
-- `api/admin.ts?resource=security`, que va con service_role.

ALTER VIEW "public"."admin_security_dashboard" SET (security_invoker = true);
ALTER VIEW "public"."telegram_stats" SET (security_invoker = true);

REVOKE ALL ON "public"."admin_security_dashboard" FROM "anon", "authenticated";
REVOKE ALL ON "public"."telegram_stats" FROM "anon", "authenticated";

GRANT SELECT ON "public"."admin_security_dashboard" TO "service_role";
GRANT SELECT ON "public"."telegram_stats" TO "service_role";
