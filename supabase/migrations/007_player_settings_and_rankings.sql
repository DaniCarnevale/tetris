-- Persist gameplay preferences for authenticated players only.
create table if not exists public.player_settings (
  player_id uuid primary key references auth.users (id) on delete cascade,
  controls jsonb not null default '{}'::jsonb,
  sound_enabled boolean not null default true,
  music_enabled boolean not null default true,
  music_volume numeric(3, 2) not null default 0.50 check (music_volume between 0 and 1),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.player_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'player_settings'
      and policyname = 'Players can read their own settings'
  ) then
    create policy "Players can read their own settings"
      on public.player_settings for select to authenticated
      using (
        (select auth.uid()) = player_id
        and (select (auth.jwt()->>'is_anonymous')::boolean) is false
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'player_settings'
      and policyname = 'Players can create their own settings'
  ) then
    create policy "Players can create their own settings"
      on public.player_settings for insert to authenticated
      with check (
        (select auth.uid()) = player_id
        and (select (auth.jwt()->>'is_anonymous')::boolean) is false
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'player_settings'
      and policyname = 'Players can update their own settings'
  ) then
    create policy "Players can update their own settings"
      on public.player_settings for update to authenticated
      using (
        (select auth.uid()) = player_id
        and (select (auth.jwt()->>'is_anonymous')::boolean) is false
      )
      with check (
        (select auth.uid()) = player_id
        and (select (auth.jwt()->>'is_anonymous')::boolean) is false
      );
  end if;
end
$$;

-- The starting level is safe public leaderboard metadata and does not expose
-- the internal player identity.
grant select (start_level) on table public.scores to anon, authenticated;
