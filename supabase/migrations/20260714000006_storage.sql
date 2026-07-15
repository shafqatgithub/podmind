-- ============================================================================
-- PodMind AI — Migration 0006: Storage Buckets & Policies
-- ----------------------------------------------------------------------------
-- Two buckets for MVP 1:
--   avatars  — public read, user-writable, path convention: {user_id}/avatar.*
--   exports  — private; PDF/DOCX/MD files written by the API, downloaded via
--              short-lived signed URLs. Path convention: {user_id}/{file}
--
-- Path-prefix ownership is enforced with storage.foldername(name)[1].
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2 * 1024 * 1024,        -- 2 MB
   array['image/png', 'image/jpeg', 'image/webp']),
  ('exports', 'exports', false, 25 * 1024 * 1024,      -- 25 MB
   array[
     'application/pdf',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'text/markdown'
   ])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- avatars: anyone may view (bucket is public); only the owner may manage
-- files under their own {user_id}/ prefix.
-- ---------------------------------------------------------------------------
create policy storage_avatars_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy storage_avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- exports: written by the API (service role bypasses RLS). Users may read
-- and delete their own exports; direct client uploads are not allowed.
-- ---------------------------------------------------------------------------
create policy storage_exports_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_exports_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
