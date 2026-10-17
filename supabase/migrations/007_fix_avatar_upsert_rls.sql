-- Supabase Storage performs a SELECT when upload uses upsert=true.
-- Keep that permission restricted to the authenticated owner's own avatar.
drop policy if exists "Players can read their own avatar" on storage.objects;
create policy "Players can read their own avatar"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/avatar.webp'
    and (select (auth.jwt()->>'is_anonymous')::boolean) is false
  );
