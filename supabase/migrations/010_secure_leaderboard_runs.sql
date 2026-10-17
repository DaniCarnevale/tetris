-- Scores are now written only after an Edge Function replays a complete run.
create table if not exists public.game_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users (id) on delete cascade,
  stage_id text not null check (stage_id in ('fresh', 'foundation', 'ascent')),
  start_level integer not null check (start_level between 1 and 10),
  seed bigint not null check (seed >= 0),
  status text not null default 'open' check (status in ('open', 'submitted', 'abandoned', 'expired')),
  score integer check (score is null or score >= 0),
  level integer check (level is null or level between 1 and 10),
  lines integer check (lines is null or lines >= 0),
  action_count integer check (action_count is null or action_count between 0 and 12000),
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  finished_at timestamptz
);

create index if not exists game_runs_player_created_idx
  on public.game_runs (player_id, created_at desc);

alter table public.game_runs enable row level security;

revoke all on table public.game_runs from public, anon, authenticated;
grant all on table public.game_runs to service_role;

-- The public client can read rankings, but it can no longer create or alter rows.
revoke insert, update, delete on table public.scores from public, anon, authenticated;

create or replace function public.finalize_game_run (
  p_run_id uuid,
  p_player_id uuid,
  p_nickname text,
  p_avatar_path text,
  p_score integer,
  p_level integer,
  p_lines integer,
  p_action_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  run_row public.game_runs%rowtype;
  inserted_at timestamptz;
begin
  if p_nickname is null or char_length(trim(p_nickname)) not between 1 and 16 then
    raise exception 'invalid_profile_nickname';
  end if;

  if p_avatar_path is not null
    and p_avatar_path <> p_player_id::text || '/avatar.webp' then
    raise exception 'invalid_profile_avatar_path';
  end if;

  select *
  into run_row
  from public.game_runs
  where id = p_run_id
    and player_id = p_player_id
  for update;

  if not found then raise exception 'run_not_found'; end if;
  if run_row.status <> 'open' then raise exception 'run_already_finalized'; end if;
  if run_row.expires_at <= timezone('utc', now()) then raise exception 'run_expired'; end if;
  if p_score is null or p_score < 0 then raise exception 'invalid_score'; end if;
  if p_level is null or p_level not between 1 and 10 then raise exception 'invalid_level'; end if;
  if p_lines is null or p_lines < 0 then raise exception 'invalid_lines'; end if;
  if p_action_count is null or p_action_count not between 0 and 12000 then raise exception 'invalid_action_count'; end if;

  update public.game_runs
  set status = 'submitted',
      score = p_score,
      level = p_level,
      lines = p_lines,
      action_count = p_action_count,
      finished_at = timezone('utc', now())
  where id = p_run_id;

  insert into public.scores (
    player_id,
    nickname,
    score,
    level,
    lines,
    stage_id,
    avatar_path,
    start_level
  )
  values (
    p_player_id,
    trim(p_nickname),
    p_score,
    p_level,
    p_lines,
    run_row.stage_id,
    p_avatar_path,
    run_row.start_level
  )
  returning created_at into inserted_at;

  return jsonb_build_object(
    'nickname', trim(p_nickname),
    'score', p_score,
    'level', p_level,
    'lines', p_lines,
    'stageId', run_row.stage_id,
    'startLevel', run_row.start_level,
    'avatarPath', p_avatar_path,
    'createdAt', inserted_at
  );
end;
$$;

revoke all on function public.finalize_game_run(uuid, uuid, text, text, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.finalize_game_run(uuid, uuid, text, text, integer, integer, integer, integer)
  to service_role;
