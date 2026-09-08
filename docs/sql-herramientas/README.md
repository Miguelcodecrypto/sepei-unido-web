# Herramientas SQL de diagnóstico

Scripts de **solo lectura** para inspeccionar el estado de la base de datos. No modifican
nada, así que se pueden ejecutar cuando haga falta.

| Script | Para qué sirve |
|---|---|
| `supabase_audit_funciones_execute_public.sql` | Lista qué funciones son invocables por `anon`. PostgreSQL concede `EXECUTE` a `PUBLIC` en toda función nueva y `anon` lo hereda, así que **cada función que se cree nace abierta**. Pasarlo después de crear cualquier función. |
| `supabase_verify_all_columns.sql` | Comprueba que las columnas que el código espera existen de verdad en las tablas. |

Al pasar el primero, ojo: `increment_announcement_views` **debe** seguir abierta — la llaman
visitantes anónimos para contar vistas, y cerrarla la rompe en silencio.
