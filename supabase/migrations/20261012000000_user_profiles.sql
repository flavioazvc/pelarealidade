begin;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  role text not null default 'player'
    check (role in ('admin', 'master', 'player')),
  display_name text,
  created_at timestamptz not null default now(),
  constraint user_profiles_username_format check (
    username = lower(btrim(username))
    and username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'
  )
);

alter table public.user_profiles enable row level security;

revoke all on table public.user_profiles from public, anon, authenticated;
grant select on table public.user_profiles to authenticated;
grant all on table public.user_profiles to service_role;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select p.role
  from public.user_profiles as p
  where p.user_id = (select auth.uid())
  limit 1;
$function$;

revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

create policy user_profiles_read_self_or_admin
  on public.user_profiles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.current_app_role()) = 'admin'
  );

commit;
