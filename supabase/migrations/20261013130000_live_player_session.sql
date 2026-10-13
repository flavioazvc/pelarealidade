begin;

alter table public.sessions
  add column if not exists is_live boolean not null default false;

create unique index if not exists sessions_one_live_per_campaign_idx
  on public.sessions (campaign_id)
  where is_live;

create or replace function public.can_manage_character(p_character_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    (select public.user_is_admin())
    or (
      (select public.current_app_role()) = 'master'
      and (
        (select public.owns_character(p_character_id))
        or exists (
          select 1 from public.character_campaigns as cc
          where cc.character_id = p_character_id
            and (select public.can_manage_campaign(cc.campaign_id))
        )
      )
    ),
    false
  );
$function$;

create or replace function public.can_read_character(p_character_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    (select public.user_is_admin())
    or (select public.can_manage_character(p_character_id))
    or (
      (select public.current_app_role()) = 'player'
      and (select public.owns_character(p_character_id))
      and exists (
        select 1
        from public.character_campaigns as cc
        join public.sessions as s on s.campaign_id = cc.campaign_id
        where cc.character_id = p_character_id
          and s.is_live
          and (select public.is_campaign_member(cc.campaign_id))
      )
    ),
    false
  );
$function$;

drop policy if exists campaigns_read_member_or_admin on public.campaigns;
create policy campaigns_read_member_or_admin on public.campaigns
  for select to authenticated
  using (
    (select public.user_is_admin())
    or (select public.can_manage_campaign(id))
    or (
      (select public.current_app_role()) = 'player'
      and (select public.is_campaign_member(id))
      and exists (select 1 from public.sessions as s where s.campaign_id = public.campaigns.id and s.is_live)
    )
  );

drop policy if exists campaign_members_read_authorized on public.campaign_members;
create policy campaign_members_read_authorized on public.campaign_members
  for select to authenticated
  using (
    (select public.user_is_admin())
    or user_id = (select auth.uid())
    or (select public.can_manage_campaign(campaign_id))
  );

drop policy if exists characters_insert_owner_or_admin on public.characters;
create policy characters_insert_owner_or_admin on public.characters
  for insert to authenticated with check (
    (select public.user_is_admin())
    or (
      (select public.current_app_role()) = 'master'
      and owner_id = (select auth.uid())
      and created_by = (select auth.uid())
    )
  );

drop policy if exists character_campaigns_read_authorized on public.character_campaigns;
create policy character_campaigns_read_authorized on public.character_campaigns
  for select to authenticated using (
    (select public.user_is_admin())
    or (select public.can_manage_campaign(campaign_id))
    or (
      (select public.current_app_role()) = 'player'
      and (select public.owns_character(character_id))
      and (select public.is_campaign_member(campaign_id))
      and exists (select 1 from public.sessions as s where s.campaign_id = public.character_campaigns.campaign_id and s.is_live)
    )
  );

drop policy if exists character_campaigns_insert_authorized on public.character_campaigns;
create policy character_campaigns_insert_authorized on public.character_campaigns
  for insert to authenticated with check (
    (select public.user_is_admin())
    or (select public.can_manage_campaign(campaign_id))
  );

drop policy if exists character_campaigns_delete_authorized on public.character_campaigns;
create policy character_campaigns_delete_authorized on public.character_campaigns
  for delete to authenticated using (
    (select public.user_is_admin())
    or (select public.can_manage_campaign(campaign_id))
  );

drop policy if exists sessions_read_member_or_admin on public.sessions;
create policy sessions_read_member_or_admin on public.sessions
  for select to authenticated using (
    (select public.user_is_admin())
    or (select public.can_manage_campaign(campaign_id))
    or (
      is_live
      and (select public.current_app_role()) = 'player'
      and (select public.is_campaign_member(campaign_id))
    )
  );

drop policy if exists planning_boards_read_member_or_admin on public.planning_boards;
create policy planning_boards_read_member_or_admin on public.planning_boards
  for select to authenticated using (
    (select public.user_is_admin())
    or (select public.can_manage_campaign(campaign_id))
  );

commit;
