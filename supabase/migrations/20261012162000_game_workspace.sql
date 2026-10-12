begin;

create table if not exists public.campaigns (
  id text primary key,
  created_by uuid not null references auth.users (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id text not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references public.user_profiles (user_id) on delete cascade,
  role text not null check (role in ('master', 'player')),
  added_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table if not exists public.characters (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete restrict,
  created_by uuid not null references auth.users (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 100),
  player_note text not null default '',
  player_name text not null default '',
  portrait_url text,
  origin text not null default '',
  class_name text not null default '',
  path text not null default '',
  nex text not null default '',
  rank text not null default '',
  pv text not null default '',
  pe text not null default '',
  san text not null default '',
  defense text not null default '',
  attributes jsonb not null default '{}'::jsonb,
  skills text not null default '',
  abilities text not null default '',
  inventory text not null default '',
  progress text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_campaigns (
  character_id text not null references public.characters (id) on delete cascade,
  campaign_id text not null references public.campaigns (id) on delete cascade,
  primary key (character_id, campaign_id)
);

create table if not exists public.sessions (
  id text primary key,
  campaign_id text not null references public.campaigns (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 140),
  session_at text,
  description text not null default '',
  status text not null default 'Planejada' check (status in ('Planejada', 'Realizada', 'Cancelada')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.planning_boards (
  campaign_id text primary key references public.campaigns (id) on delete cascade,
  payload jsonb not null default '{"cards": [], "paths": [], "links": []}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists campaign_members_user_idx on public.campaign_members (user_id);
create index if not exists characters_owner_idx on public.characters (owner_id);
create index if not exists character_campaigns_campaign_idx on public.character_campaigns (campaign_id);
create index if not exists sessions_campaign_updated_idx on public.sessions (campaign_id, updated_at desc);

create or replace function public.user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce((select public.current_app_role()) = 'admin', false);
$function$;

create or replace function public.is_campaign_member(p_campaign_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.campaign_members as m
    where m.campaign_id = p_campaign_id and m.user_id = (select auth.uid())
  );
$function$;

create or replace function public.can_manage_campaign(p_campaign_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select (select public.user_is_admin()) or exists (
    select 1 from public.campaigns as c
    where c.id = p_campaign_id and c.created_by = (select auth.uid())
  ) or exists (
    select 1 from public.campaign_members as m
    where m.campaign_id = p_campaign_id
      and m.user_id = (select auth.uid())
      and m.role = 'master'
  );
$function$;

create or replace function public.owns_character(p_character_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.characters as c
    where c.id = p_character_id and c.owner_id = (select auth.uid())
  );
$function$;

create or replace function public.can_read_character(p_character_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select (select public.user_is_admin())
    or (select public.owns_character(p_character_id))
    or exists (
      select 1 from public.character_campaigns as cc
      where cc.character_id = p_character_id
        and ((select public.is_campaign_member(cc.campaign_id)) or (select public.can_manage_campaign(cc.campaign_id)))
    );
$function$;

create or replace function public.can_manage_character(p_character_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select (select public.user_is_admin())
    or (select public.owns_character(p_character_id))
    or exists (
      select 1 from public.character_campaigns as cc
      where cc.character_id = p_character_id
        and (select public.can_manage_campaign(cc.campaign_id))
    );
$function$;

create or replace function public.guard_workspace_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select public.current_app_role()) is distinct from 'admin' then
    if tg_table_name = 'campaigns' and new.created_by is distinct from old.created_by then
      raise exception 'Somente o administrador pode alterar a autoria de uma campanha.' using errcode = '42501';
    elsif tg_table_name = 'characters'
      and (new.owner_id is distinct from old.owner_id or new.created_by is distinct from old.created_by) then
      raise exception 'Somente o administrador pode alterar o proprietário ou a autoria de uma ficha.' using errcode = '42501';
    elsif tg_table_name = 'sessions' and new.created_by is distinct from old.created_by then
      raise exception 'Somente o administrador pode alterar a autoria de uma sessão.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists campaigns_guard_ownership on public.campaigns;
create trigger campaigns_guard_ownership before update of created_by on public.campaigns
  for each row execute function public.guard_workspace_ownership();
drop trigger if exists characters_guard_ownership on public.characters;
create trigger characters_guard_ownership before update of owner_id, created_by on public.characters
  for each row execute function public.guard_workspace_ownership();
drop trigger if exists sessions_guard_ownership on public.sessions;
create trigger sessions_guard_ownership before update of created_by on public.sessions
  for each row execute function public.guard_workspace_ownership();

revoke all on function public.user_is_admin() from public, anon;
revoke all on function public.is_campaign_member(text) from public, anon;
revoke all on function public.can_manage_campaign(text) from public, anon;
revoke all on function public.owns_character(text) from public, anon;
revoke all on function public.can_read_character(text) from public, anon;
revoke all on function public.can_manage_character(text) from public, anon;
grant execute on function public.user_is_admin() to authenticated;
grant execute on function public.is_campaign_member(text) to authenticated;
grant execute on function public.can_manage_campaign(text) to authenticated;
grant execute on function public.owns_character(text) to authenticated;
grant execute on function public.can_read_character(text) to authenticated;
grant execute on function public.can_manage_character(text) to authenticated;
revoke all on function public.guard_workspace_ownership() from public, anon;
grant execute on function public.guard_workspace_ownership() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['campaigns','campaign_members','characters','character_campaigns','sessions','planning_boards'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;

drop policy if exists campaigns_read_member_or_admin on public.campaigns;
create policy campaigns_read_member_or_admin on public.campaigns
  for select to authenticated
  using ((select public.user_is_admin()) or created_by = (select auth.uid()) or (select public.is_campaign_member(id)));
drop policy if exists campaigns_insert_master_or_admin on public.campaigns;
create policy campaigns_insert_master_or_admin on public.campaigns
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.current_app_role()) in ('admin', 'master')
  );
drop policy if exists campaigns_update_manager on public.campaigns;
create policy campaigns_update_manager on public.campaigns
  for update to authenticated
  using ((select public.can_manage_campaign(id)))
  with check ((select public.can_manage_campaign(id)));
drop policy if exists campaigns_delete_manager on public.campaigns;
create policy campaigns_delete_manager on public.campaigns
  for delete to authenticated using ((select public.can_manage_campaign(id)));

drop policy if exists campaign_members_read_authorized on public.campaign_members;
create policy campaign_members_read_authorized on public.campaign_members
  for select to authenticated
  using ((select public.user_is_admin()) or user_id = (select auth.uid()) or (select public.is_campaign_member(campaign_id)));
drop policy if exists campaign_members_admin_insert on public.campaign_members;
create policy campaign_members_admin_insert on public.campaign_members
  for insert to authenticated with check ((select public.user_is_admin()));
drop policy if exists campaign_members_admin_update on public.campaign_members;
create policy campaign_members_admin_update on public.campaign_members
  for update to authenticated using ((select public.user_is_admin())) with check ((select public.user_is_admin()));
drop policy if exists campaign_members_admin_delete on public.campaign_members;
create policy campaign_members_admin_delete on public.campaign_members
  for delete to authenticated using ((select public.user_is_admin()));

 drop policy if exists characters_read_owner_member_or_admin on public.characters;
create policy characters_read_owner_member_or_admin on public.characters
  for select to authenticated using ((select public.can_read_character(id)));
drop policy if exists characters_insert_owner_or_admin on public.characters;
create policy characters_insert_owner_or_admin on public.characters
  for insert to authenticated with check (
    (select public.user_is_admin())
    or (owner_id = (select auth.uid()) and created_by = (select auth.uid()))
  );
drop policy if exists characters_update_owner_master_or_admin on public.characters;
create policy characters_update_owner_master_or_admin on public.characters
  for update to authenticated using ((select public.can_manage_character(id)))
  with check ((select public.can_manage_character(id)));
drop policy if exists characters_delete_owner_master_or_admin on public.characters;
create policy characters_delete_owner_master_or_admin on public.characters
  for delete to authenticated using ((select public.can_manage_character(id)));

drop policy if exists character_campaigns_read_authorized on public.character_campaigns;
create policy character_campaigns_read_authorized on public.character_campaigns
  for select to authenticated using (
    (select public.user_is_admin())
    or (select public.owns_character(character_id))
    or (select public.is_campaign_member(campaign_id))
    or (select public.can_manage_campaign(campaign_id))
  );
drop policy if exists character_campaigns_insert_authorized on public.character_campaigns;
create policy character_campaigns_insert_authorized on public.character_campaigns
  for insert to authenticated with check (
    (select public.user_is_admin())
    or ((select public.can_manage_campaign(campaign_id)) and (select public.can_read_character(character_id)))
    or ((select public.owns_character(character_id)) and (select public.is_campaign_member(campaign_id)))
  );
drop policy if exists character_campaigns_delete_authorized on public.character_campaigns;
create policy character_campaigns_delete_authorized on public.character_campaigns
  for delete to authenticated using (
    (select public.user_is_admin())
    or (select public.can_manage_campaign(campaign_id))
    or (select public.owns_character(character_id))
  );

 drop policy if exists sessions_read_member_or_admin on public.sessions;
create policy sessions_read_member_or_admin on public.sessions
  for select to authenticated using (
    (select public.user_is_admin())
    or (select public.is_campaign_member(campaign_id))
    or exists (select 1 from public.campaigns c where c.id = campaign_id and c.created_by = (select auth.uid()))
  );
drop policy if exists sessions_insert_manager on public.sessions;
create policy sessions_insert_manager on public.sessions
  for insert to authenticated with check (
    created_by = (select auth.uid()) and (select public.can_manage_campaign(campaign_id))
  );
drop policy if exists sessions_update_manager on public.sessions;
create policy sessions_update_manager on public.sessions
  for update to authenticated using ((select public.can_manage_campaign(campaign_id)))
  with check ((select public.can_manage_campaign(campaign_id)));
drop policy if exists sessions_delete_manager on public.sessions;
create policy sessions_delete_manager on public.sessions
  for delete to authenticated using ((select public.can_manage_campaign(campaign_id)));

 drop policy if exists planning_boards_read_member_or_admin on public.planning_boards;
create policy planning_boards_read_member_or_admin on public.planning_boards
  for select to authenticated using (
    (select public.user_is_admin())
    or (select public.is_campaign_member(campaign_id))
    or exists (select 1 from public.campaigns c where c.id = campaign_id and c.created_by = (select auth.uid()))
  );
drop policy if exists planning_boards_insert_manager on public.planning_boards;
create policy planning_boards_insert_manager on public.planning_boards
  for insert to authenticated with check ((select public.can_manage_campaign(campaign_id)));
drop policy if exists planning_boards_update_manager on public.planning_boards;
create policy planning_boards_update_manager on public.planning_boards
  for update to authenticated using ((select public.can_manage_campaign(campaign_id)))
  with check ((select public.can_manage_campaign(campaign_id)));
drop policy if exists planning_boards_delete_manager on public.planning_boards;
create policy planning_boards_delete_manager on public.planning_boards
  for delete to authenticated using ((select public.can_manage_campaign(campaign_id)));

commit;
