-- Rellena la autoría de las votaciones ya creadas.
--
-- `votaciones.creado_por` existe desde el principio, pero el formulario del panel
-- nunca tuvo ese campo: el estado del formulario lo inicializaba a cadena vacía y
-- lo enviaba tal cual, así que todas las votaciones creadas hasta hoy tienen `''`
-- —indistinguible de "no se sabe"— en vez de un autor.
--
-- A partir del cambio que acompaña a esta migración, el autor lo pone el servidor
-- en `api/voting.ts` (`handleAdminCreate`) y el cliente ya no puede tocarlo, ni al
-- crear ni al editar. Se usa el literal 'Administrador', el mismo que guardan los
-- anuncios (`AnnouncementsManager.tsx`), porque el panel admin es una sola cuenta
-- sin identidad propia: su token solo lleva la caducidad, no un usuario.
--
-- Esta migración solo arregla el pasado. No toca las filas que ya tengan un autor
-- de verdad, por si alguna se rellenó a mano desde el editor SQL.

UPDATE "public"."votaciones"
SET "creado_por" = 'Administrador'
WHERE "creado_por" IS NULL OR btrim("creado_por") = '';
