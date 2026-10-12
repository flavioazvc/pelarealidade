begin;

alter table public.characters
  add column if not exists pv_max text not null default '',
  add column if not exists pe_max text not null default '',
  add column if not exists san_max text not null default '',
  add column if not exists rituals text not null default '',
  add column if not exists description text not null default '';

commit;
