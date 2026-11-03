begin;

alter table public.sessions
  add column if not exists atmosphere text not null default 'purple-red';

alter table public.sessions
  drop constraint if exists sessions_atmosphere_check;

alter table public.sessions
  add constraint sessions_atmosphere_check
  check (atmosphere in ('black-white', 'purple-red'));

commit;
