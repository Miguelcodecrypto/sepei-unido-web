# Migraciones de base de datos

Desde septiembre de 2026 los cambios de esquema de Supabase se versionan en
`supabase/migrations/`. Antes se ejecutaban scripts sueltos a mano en el editor SQL, sin
registro de cuáles se habían aplicado: ese histórico está archivado en
[`docs/sql-historico/`](sql-historico/) y **no debe ejecutarse**.

## Por qué

Con los scripts sueltos no había forma de saber, mirando el repo, cuál era el estado real
de la base de datos. No es un problema teórico: en el cierre de RLS se dio por aplicado un
script que no lo estaba y seis tablas siguieron abiertas durante días. Con migraciones, la
tabla `supabase_migrations.schema_migrations` de la propia base de datos dice exactamente
qué se ha aplicado, y `supabase migration list` lo compara con lo que hay en el repo.

## Preparación (una vez por máquina)

```bash
npx supabase login                                   # abre el navegador
npx supabase link --project-ref qzjqbschvwkkfqxlregj # pide la contraseña de la BD
```

La contraseña de la base de datos está en Supabase → Project Settings → Database. No es la
del panel de admin ni la `service_role`.

## Hacer un cambio de esquema

```bash
npx supabase migration new descripcion_del_cambio
```

Crea `supabase/migrations/<timestamp>_descripcion_del_cambio.sql`. Escribe el SQL ahí —
**nunca inventes el nombre del archivo a mano**, el timestamp es el que ordena las
migraciones.

Antes de aplicarlo, mira qué se va a ejecutar:

```bash
npx supabase db push --dry-run
```

Y aplícalo:

```bash
npx supabase db push
```

Comprueba el resultado:

```bash
npx supabase migration list
```

Las dos columnas (local y remoto) deben coincidir.

## Reglas

- **Una migración por cambio, y nunca se edita una ya aplicada.** Si algo salió mal, se
  corrige con una migración nueva. Editar una aplicada deja el repo y la base de datos
  diciendo cosas distintas, que es justo el problema que esto viene a resolver.
- **El código primero, el SQL después.** Cuando una migración cierra un permiso del que
  depende el frontend (RLS, `REVOKE`), se despliega antes el código que ya no lo necesita.
  Al revés se rompe producción. Ese orden ya está probado en todo el cierre de RLS.
- **Verifica desde fuera, no solo en el catálogo.** Consultar `pg_policies` no basta: es
  exactamente lo que engañó en la Fase 1. Prueba con la anon key contra
  `www.sepeiunido.org` que el acceso que querías cerrar da `42501` o `403`, y que lo que
  debía seguir abierto sigue respondiendo.
- **Toda función nueva nace pública.** PostgreSQL concede `EXECUTE` a `PUBLIC` y `anon` lo
  hereda; `REVOKE ... FROM anon` no hace nada. Hay que revocar de `PUBLIC` y luego
  `GRANT ... TO service_role`. Pasa
  [`docs/sql-herramientas/supabase_audit_funciones_execute_public.sql`](sql-herramientas/)
  después de crear cualquier función.
- **Cerrar RLS en una tabla no tapa las vistas que hay encima.** Una vista se ejecuta con
  los permisos de su propietario: hay que añadirle `security_invoker = true` y revocar
  `anon`.

## El baseline

La primera migración es un baseline: un volcado del esquema **real** de producción, no una
reconstrucción a partir de los scripts antiguos (que además son contradictorios entre sí).
Ya está aplicado en producción por definición, así que se registra como tal en el historial
sin volver a ejecutarlo:

```bash
npx supabase migration repair --status applied <version_del_baseline>
```

## ⚠️ Datos personales en el historial de git

Tres scripts del histórico contenían DNIs reales de usuarios como ejemplo. Se han
sustituido por `00000000T`, pero **siguen en el historial de git, y este repositorio es
público**. Borrarlos del historial exige reescribirlo (`git filter-repo`) y forzar el push,
lo que rompe cualquier clon existente. Es una decisión pendiente, no algo que el archivado
haya resuelto.
