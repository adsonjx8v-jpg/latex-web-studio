-- Execute este arquivo no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Novo documento',
  type text not null default 'Documento LaTeX',
  content text not null default '',
  bibliography text not null default '',
  color text not null default 'purple' check (color in ('purple', 'green', 'blue')),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents add column if not exists bibliography text not null default '';
alter table public.documents add column if not exists project_files jsonb not null default '{}'::jsonb;

create table if not exists public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(email)),
  role text not null check (role in ('editor', 'viewer')),
  invite_status text not null default 'pending' check (invite_status in ('pending', 'accepted')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (document_id, email)
);

create index if not exists documents_owner_updated_idx on public.documents (owner_id, updated_at desc);
create index if not exists document_shares_email_idx on public.document_shares (lower(email));
create index if not exists document_shares_document_idx on public.document_shares (document_id);

alter table public.documents enable row level security;
alter table public.document_shares enable row level security;

drop policy if exists "Users read owned and invited documents" on public.documents;
create policy "Users read owned and invited documents" on public.documents
  for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.document_shares s
      where s.document_id = documents.id
        and lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "Users create their documents" on public.documents;
create policy "Users create their documents" on public.documents
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owners and editors update documents" on public.documents;
create policy "Owners and editors update documents" on public.documents
  for update to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.document_shares s
      where s.document_id = documents.id
        and lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and s.role = 'editor'
    )
  )
  with check (
    owner_id = auth.uid()
    or exists (
      select 1 from public.document_shares s
      where s.document_id = documents.id
        and lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and s.role = 'editor'
    )
  );

drop policy if exists "Owners delete their documents" on public.documents;
create policy "Owners delete their documents" on public.documents
  for delete to authenticated using (owner_id = auth.uid());

-- O navegador não pode criar ou alterar permissões: somente a Edge Function escreve convites.
drop policy if exists "Owners and invitees read relevant shares" on public.document_shares;
create policy "Owners and invitees read relevant shares" on public.document_shares
  for select to authenticated
  using (
    owner_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

revoke all on public.documents from anon, authenticated;
grant select, insert, delete on public.documents to authenticated;
grant update (title, type, content, bibliography, project_files, color, favorite, updated_at) on public.documents to authenticated;
revoke all on public.document_shares from anon, authenticated;
grant select on public.document_shares to authenticated;

-- Habilite atualizações em tempo real para o editor compartilhado.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents'
  ) then
    alter publication supabase_realtime add table public.documents;
  end if;
end $$;
