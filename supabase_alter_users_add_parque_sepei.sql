-- Añadir columna para almacenar el parque del SEPEI del usuario
alter table if exists public.users
  add column if not exists parque_sepei text;
