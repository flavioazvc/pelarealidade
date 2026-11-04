begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'session-audio',
  'session-audio',
  true,
  52428800,
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/x-aac', 'audio/flac', 'audio/x-flac', 'audio/3gpp', 'audio/vnd.wave']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists session_audio_insert_own on storage.objects;
drop policy if exists session_audio_update_own on storage.objects;
drop policy if exists session_audio_delete_own on storage.objects;

create policy session_audio_insert_own
  on storage.objects for insert to authenticated
  with check (bucket_id = 'session-audio' and owner_id = (select auth.uid())::text);

create policy session_audio_update_own
  on storage.objects for update to authenticated
  using (bucket_id = 'session-audio' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'session-audio' and owner_id = (select auth.uid())::text);

create policy session_audio_delete_own
  on storage.objects for delete to authenticated
  using (bucket_id = 'session-audio' and owner_id = (select auth.uid())::text);

commit;
