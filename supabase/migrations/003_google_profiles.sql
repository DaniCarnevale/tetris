create table if not exists public.player_profiles (
  player_id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 16),
  avatar_path text check (avatar_path is null or avatar_path = player_id::text || '/avatar.webp'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.player_profiles enable row level security;

drop policy if exists "Players can read their own profile" on public.player_profiles;
create policy "Players can read their own profile"
  on public.player_profiles
  for select
  to authenticated
  using (auth.uid() = player_id);

drop policy if exists "Players can create their own profile" on public.player_profiles;
create policy "Players can create their own profile"
  on public.player_profiles
  for insert
  to authenticated
  with check (auth.uid() = player_id);

drop policy if exists "Players can update their own profile" on public.player_profiles;
create policy "Players can update their own profile"
  on public.player_profiles
  for update
  to authenticated
  using (auth.uid() = player_id)
  with check (auth.uid() = player_id);
