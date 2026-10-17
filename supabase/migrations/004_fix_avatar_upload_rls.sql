-- Keep the bucket limit aligned with the client and separate path authorization
-- from the server-side upload cooldown.
update storage.buckets
set
  file_size_limit = 2621440,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'avatars';

drop policy if exists "Players can upload their own avatar" on storage.objects;
create policy "Players can upload their own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name = auth.uid()::text || '/avatar.webp'
  );

drop policy if exists "Players can update their own avatar" on storage.objects;
create policy "Players can update their own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name = auth.uid()::text || '/avatar.webp'
  )
  with check (
    bucket_id = 'avatars'
    and name = auth.uid()::text || '/avatar.webp'
  );

create or replace function public.enforce_avatar_upload_rate_limit ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.bucket_id = 'avatars' and new.name = auth.uid()::text || '/avatar.webp' then
    if exists (
      select 1
      from public.avatar_upload_limits
      where player_id = auth.uid()
        and last_uploaded_at > timezone('utc', now()) - interval '30 seconds'
    ) then
      raise exception 'avatar_upload_rate_limited';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_avatar_upload_rate_limited on storage.objects;
create trigger on_avatar_upload_rate_limited
  before insert or update on storage.objects
  for each row
  execute function public.enforce_avatar_upload_rate_limit();
