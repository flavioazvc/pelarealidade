begin;

alter table public.sessions
  add column if not exists stage_state jsonb not null default '{"scenes": [], "activeSceneId": "", "audio": {"music": null, "effects": []}, "transcription": {"status": "reserved", "text": ""}}'::jsonb;

commit;
