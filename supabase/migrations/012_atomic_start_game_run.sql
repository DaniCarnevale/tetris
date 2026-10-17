-- Start a verified run in one transaction to reduce round trips and close
-- the rate-limit race between counting and inserting game_runs.
create or replace function public.start_game_run (
  p_player_id uuid,
  p_stage_id text,
  p_start_level integer,
  p_seed bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  run_id uuid;
  expires_at timestamptz;
begin
  if p_player_id is null then raise exception 'invalid_player'; end if;
  if p_stage_id not in ('fresh', 'foundation', 'ascent') then
    raise exception 'invalid_run_configuration';
  end if;
  if p_start_level is null or p_start_level not between 1 and 10 then
    raise exception 'invalid_run_configuration';
  end if;
  if p_seed is null or p_seed not between 0 and 4294967295 then
    raise exception 'invalid_run_seed';
  end if;

  -- Serialize starts for the same player so two tabs cannot bypass the limit.
  perform pg_advisory_xact_lock(hashtext(p_player_id::text));

  if (
    select count(*)
    from public.game_runs
    where player_id = p_player_id
      and created_at >= now() - interval '1 hour'
  ) >= 20 then
    raise exception 'run_rate_limited';
  end if;

  update public.game_runs
  set status = 'abandoned',
      finished_at = now()
  where player_id = p_player_id
    and status = 'open';

  expires_at := now() + interval '45 minutes';

  insert into public.game_runs (
    player_id,
    stage_id,
    start_level,
    seed,
    expires_at
  )
  values (
    p_player_id,
    p_stage_id,
    p_start_level,
    p_seed,
    expires_at
  )
  returning id into run_id;

  return jsonb_build_object(
    'runId', run_id,
    'seed', p_seed,
    'expiresAt', expires_at
  );
end;
$$;

revoke all on function public.start_game_run(uuid, text, integer, bigint)
  from public, anon, authenticated;
grant execute on function public.start_game_run(uuid, text, integer, bigint)
  to service_role;
