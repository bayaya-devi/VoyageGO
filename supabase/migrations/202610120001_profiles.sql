-- VoyageGo profile metadata. Passwords, identity tokens, and email verification
-- remain owned by Supabase Auth, never duplicated in this table.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  preferred_locale text not null default 'fr'
    check (preferred_locale in ('fr', 'ar', 'en', 'es', 'pt')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select, update on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

create or replace function public.create_voyagego_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  chosen_locale text := coalesce(metadata ->> 'preferred_locale', 'fr');
  derived_name text := coalesce(metadata ->> 'full_name', metadata ->> 'name', '');
begin
  insert into public.profiles (id, first_name, last_name, preferred_locale)
  values (
    new.id,
    pg_catalog.left(pg_catalog.btrim(coalesce(metadata ->> 'first_name', metadata ->> 'given_name', pg_catalog.split_part(derived_name, ' ', 1), '')), 80),
    pg_catalog.left(pg_catalog.btrim(coalesce(metadata ->> 'last_name', metadata ->> 'family_name', pg_catalog.substr(derived_name, pg_catalog.length(pg_catalog.split_part(derived_name, ' ', 1)) + 2), '')), 80),
    case when chosen_locale in ('fr', 'ar', 'en', 'es', 'pt') then chosen_locale else 'fr' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_voyagego_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_voyagego_profile on auth.users;
create trigger on_auth_user_created_voyagego_profile
  after insert on auth.users
  for each row execute function public.create_voyagego_profile();

comment on table public.profiles is 'Non-sensitive VoyageGo profile fields; identity and credentials are managed by Supabase Auth.';
