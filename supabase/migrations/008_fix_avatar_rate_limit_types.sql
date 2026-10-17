-- Storage stores owner_id as text while avatar_upload_limits.player_id is uuid.
-- Cast the authenticated owner's Storage value before recording the cooldown.
create or replace function public.record_avatar_upload ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.bucket_id = 'avatars' and new.name = new.owner_id || '/avatar.webp' then
    insert into public.avatar_upload_limits (player_id, last_uploaded_at)
    values (new.owner_id::uuid, timezone('utc', now()))
    on conflict (player_id) do update
      set last_uploaded_at = excluded.last_uploaded_at;
  end if;
  return new;
end;
$$;
