-- Avatar storage is intentionally constrained to one small object per player.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.scores
  add column if not exists avatar_path text;

update public.scores
set avatar_path = null
where avatar_path is not null
  and avatar_path <> player_id::text || '/avatar.webp';

alter table public.scores
  drop constraint if exists scores_avatar_path_check;

alter table public.scores
  add constraint scores_avatar_path_check
  check (avatar_path is null or avatar_path = player_id::text || '/avatar.webp');

create table if not exists public.avatar_upload_limits (
  player_id uuid primary key references auth.users (id) on delete cascade,
  last_uploaded_at timestamptz not null default timezone('utc', now())
);

alter table public.avatar_upload_limits enable row level security;

create or replace function public.can_upload_avatar ()
returns boolean
language sql
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and not exists (
      select 1
      from public.avatar_upload_limits
      where player_id = auth.uid()
        and last_uploaded_at > timezone('utc', now()) - interval '30 seconds'
    );
$$;

drop policy if exists "Players can upload their own avatar" on storage.objects;
create policy "Players can upload their own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name = auth.uid()::text || '/avatar.webp'
    and public.can_upload_avatar()
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
    and public.can_upload_avatar()
  );

drop policy if exists "Players can delete their own avatar" on storage.objects;
create policy "Players can delete their own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

create or replace function public.record_avatar_upload ()
returns trigger
language plpgsql
security definer
set search_path = public
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

drop trigger if exists on_avatar_upload_recorded on storage.objects;
create trigger on_avatar_upload_recorded
  after insert or update on storage.objects
  for each row
  execute function public.record_avatar_upload();
