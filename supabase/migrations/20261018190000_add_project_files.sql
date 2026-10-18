-- Execute no SQL Editor do Supabase antes de publicar a importação de projetos ZIP.
alter table public.documents
  add column if not exists project_files jsonb not null default '{}'::jsonb;

grant update (project_files) on public.documents to authenticated;
