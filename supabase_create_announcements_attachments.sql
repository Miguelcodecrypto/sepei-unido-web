-- Tabla de adjuntos para anuncios
create table if not exists public.announcements_attachments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid references public.announcements(id) on delete cascade,
  url text not null,
  nombre text not null,
  tipo text not null,
  categoria text not null check (categoria in ('documento','video','audio','link')),
  created_at timestamptz not null default now()
);

create index if not exists idx_announcements_attachments_announcement on public.announcements_attachments(announcement_id);
create index if not exists idx_announcements_attachments_categoria on public.announcements_attachments(categoria);
