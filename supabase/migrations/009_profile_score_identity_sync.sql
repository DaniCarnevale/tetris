-- Keep historical score rows aligned with the authenticated player's profile.
-- The function is intentionally scoped to auth.uid() and cannot be called by guests.
create or replace function public.sync_profile_score_identity (
  new_nickname text,
  new_avatar_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null
    or coalesce((auth.jwt()->>'is_anonymous')::boolean, true) then
    raise exception 'signed_in_account_required';
  end if;

  if new_nickname is null
    or char_length(trim(new_nickname)) not between 1 and 16 then
    raise exception 'invalid_profile_nickname';
  end if;

  if new_avatar_path is not null
    and new_avatar_path <> current_user_id::text || '/avatar.webp' then
    raise exception 'invalid_profile_avatar_path';
  end if;

  update public.scores
  set nickname = trim(new_nickname),
      avatar_path = new_avatar_path
  where player_id = current_user_id;
end;
$$;

revoke all on function public.sync_profile_score_identity(text, text) from public, anon, authenticated;
grant execute on function public.sync_profile_score_identity(text, text) to authenticated;
