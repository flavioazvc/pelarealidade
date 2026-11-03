begin;

create table if not exists public.homebrew_entries (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('abilities', 'items', 'rituals')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homebrew_entries_owner_kind_idx
  on public.homebrew_entries (owner_id, kind, updated_at desc);

alter table public.homebrew_entries enable row level security;
revoke all on table public.homebrew_entries from public, anon;
grant select, insert, update, delete on table public.homebrew_entries to authenticated;

drop policy if exists homebrew_read_owner_or_admin on public.homebrew_entries;
create policy homebrew_read_owner_or_admin
  on public.homebrew_entries for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.user_is_admin()));

drop policy if exists homebrew_insert_owner_or_admin on public.homebrew_entries;
create policy homebrew_insert_owner_or_admin
  on public.homebrew_entries for insert to authenticated
  with check (owner_id = (select auth.uid()) or (select public.user_is_admin()));

drop policy if exists homebrew_update_owner_or_admin on public.homebrew_entries;
create policy homebrew_update_owner_or_admin
  on public.homebrew_entries for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.user_is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.user_is_admin()));

drop policy if exists homebrew_delete_owner_or_admin on public.homebrew_entries;
create policy homebrew_delete_owner_or_admin
  on public.homebrew_entries for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.user_is_admin()));

commit;
