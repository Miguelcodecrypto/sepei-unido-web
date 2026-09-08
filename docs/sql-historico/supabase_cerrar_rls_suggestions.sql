ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='suggestions';
