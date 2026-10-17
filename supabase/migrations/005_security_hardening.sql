-- Anonymous users can use the leaderboard, but they must not create
-- personal profiles or upload public avatars.
drop policy if exists "Players can read their own profile" on public.player_profiles;
create policy "Players can read their own profile"
  on public.player_profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = player_id
    and (select (auth.jwt()->>'is_anonymous')::boolean) is false
  );

drop policy if exists "Players can create their own profile" on public.player_profiles;
create policy "Players can create their own profile"
  on public.player_profiles
  for insert
  to authenticated
  with check (
    (select auth.uid()) = player_id
    and (select (auth.jwt()->>'is_anonymous')::boolean) is false
  );

drop policy if exists "Players can update their own profile" on public.player_profiles;
create policy "Players can update their own profile"
  on public.player_profiles
  for update
  to authenticated
  using (
    (select auth.uid()) = player_id
    and (select (auth.jwt()->>'is_anonymous')::boolean) is false
  )
  with check (
    (select auth.uid()) = player_id
    and (select (auth.jwt()->>'is_anonymous')::boolean) is false
  );

drop policy if exists "Players can upload their own avatar" on storage.objects;
create policy "Players can upload their own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/avatar.webp'
    and (select (auth.jwt()->>'is_anonymous')::boolean) is false
  );

drop policy if exists "Players can update their own avatar" on storage.objects;
create policy "Players can update their own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/avatar.webp'
    and (select (auth.jwt()->>'is_anonymous')::boolean) is false
  )
  with check (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/avatar.webp'
    and (select (auth.jwt()->>'is_anonymous')::boolean) is false
  );

drop policy if exists "Players can delete their own avatar" on storage.objects;
create policy "Players can delete their own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like (select auth.uid())::text || '/%'
    and (select (auth.jwt()->>'is_anonymous')::boolean) is false
  );

-- The original client-side upload helper is no longer used after the
-- server-side trigger was added. Removing it reduces the public function
-- surface and avoids exposing an unnecessary security-definer function.
drop function if exists public.can_upload_avatar();

create or replace function public.record_avatar_upload ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.bucket_id = 'avatars' and new.name = new.owner_id::text || '/avatar.webp' then
    insert into public.avatar_upload_limits (player_id, last_uploaded_at)
    values (new.owner_id, timezone('utc', now()))
    on conflict (player_id) do update
      set last_uploaded_at = excluded.last_uploaded_at;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_avatar_upload_rate_limit ()
returns trigger
language plpgsql
security definer
set search_path = ''
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
