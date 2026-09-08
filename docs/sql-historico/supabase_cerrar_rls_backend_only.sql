-- Fase 1a del cierre de RLS pendiente (ver auditoría 2026-08-06).
-- Estas 5 tablas ya no las toca ningún código de cliente (verificado con grep sobre
-- src/ — cero resultados de `.from('<tabla>')`): solo las usan funciones serverless
-- con la service_role key (api/auth.ts, api/admin.ts, api/_lib/adminSecurity.ts,
-- api/telegram-*.ts). Activar RLS sin políticas es seguro y no rompe nada, porque
-- ninguna petición legítima llega con la anon key.

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_notification_log ENABLE ROW LEVEL SECURITY;

SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_sessions','admin_login_attempts','blocked_ips','telegram_link_codes','telegram_notification_log')
ORDER BY tablename;
