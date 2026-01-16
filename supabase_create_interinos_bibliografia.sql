-- Tabla de recursos de bibliografía para Interinos
create table if not exists public.interinos_bibliografia (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  url text not null,
  nombre text not null,
  tipo text not null,
  categoria text not null default 'bibliografia',
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_interinos_bibliografia_categoria on public.interinos_bibliografia(categoria);
create index if not exists idx_interinos_bibliografia_created_at on public.interinos_bibliografia(created_at desc);
