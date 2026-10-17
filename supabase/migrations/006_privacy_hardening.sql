-- Expose only the fields required by the public leaderboard.
-- Emails live in auth.users and must never be copied into public tables.
revoke select on table public.scores from anon, authenticated;
grant select (
  nickname,
  score,
  level,
  lines,
  stage_id,
  avatar_path,
  created_at
) on table public.scores to anon, authenticated;

-- Scores are append-only from the client. Keep internal identity and
-- generated timestamp/id columns out of the public insert contract.
revoke insert on table public.scores from anon, authenticated;
grant insert (
  player_id,
  nickname,
  score,
  level,
  lines,
  stage_id,
  avatar_path,
  start_level
) on table public.scores to authenticated;

revoke update, delete on table public.scores from anon, authenticated;

-- This table is only used by SECURITY DEFINER avatar triggers.
revoke all on table public.avatar_upload_limits from anon, authenticated;
