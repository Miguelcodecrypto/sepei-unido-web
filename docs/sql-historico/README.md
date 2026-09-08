# Histórico de scripts SQL (2025 — septiembre 2026)

**⚠️ No ejecutes nada de esta carpeta. Es documentación, no un sistema de migraciones.**

Estos 32 scripts son el registro de cómo se fue construyendo la base de datos antes de
adoptar `supabase/migrations/`. Se ejecutaban a mano en el editor SQL de Supabase, sin
registro de cuáles se habían aplicado ya.

## Por qué se archivaron

Esa forma de trabajar tiene un problema que no es teórico: **no se puede saber, mirando el
repo, cuál es el estado real de la base de datos.** Ya causó un incidente concreto —
en la Fase 1 del cierre de RLS se dio por aplicado un script que no lo estaba, y seis
tablas siguieron abiertas durante días creyendo lo contrario. El mismo patrón se repitió
con `external_emails`, donde el código dejó de usar la anon key pero el
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` se quedó sin ejecutar.

Además, leídos como historia son contradictorios: `supabase_disable_rls_voting.sql`
desactiva el RLS que `supabase_rediseno_votaciones_seguro.sql` vuelve a montar de otra
forma. Reproducirlos en orden **no** reconstruye la base de datos actual.

## Qué los sustituye

`supabase/migrations/`, con un baseline generado del esquema real de producción. A partir
de ahí, cada cambio de esquema es un archivo nuevo y numerado. Ver
[`docs/migraciones.md`](../migraciones.md).

## Nota sobre datos personales

Tres de estos scripts (`supabase_reset_temp_password.sql`, `supabase_reset_user_password.sql`,
`supabase_fix_votos_user_id.sql`) contenían DNIs reales de usuarios como ejemplo. Se han
sustituido por `00000000T`. **Siguen estando en el historial de git**, que es público: ver
la nota en `docs/migraciones.md`.
