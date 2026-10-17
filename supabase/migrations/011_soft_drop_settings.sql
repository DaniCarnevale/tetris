-- Persist the player-selected soft-drop speed alongside the other preferences.
alter table public.player_settings
  add column if not exists soft_drop_multiplier integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'player_settings_soft_drop_multiplier_check'
      and conrelid = 'public.player_settings'::regclass
  ) then
    alter table public.player_settings
      add constraint player_settings_soft_drop_multiplier_check
      check (soft_drop_multiplier in (1, 2, 4, 8));
  end if;
end
$$;
