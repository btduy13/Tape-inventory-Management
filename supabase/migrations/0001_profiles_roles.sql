-- 0001_profiles_roles
-- Staff profiles, roles and role helper functions.
-- Conventions for every later migration:
--   * RLS enabled on every table, explicit policies per command.
--   * Helper functions are SECURITY DEFINER with search_path = '' (fully qualified names).
--   * auth.uid() IS NULL means the caller is service_role / postgres (server code).

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'manager', 'staff', 'ctv');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '',
  phone       text,
  role        public.app_role not null default 'ctv',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role) where is_active;

-- Generic updated_at trigger (reused by later migrations).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER so they can read profiles regardless of RLS
-- (avoids recursive policy evaluation). STABLE so the planner caches per statement.
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.is_active
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

-- admin or manager: sees all leads, manages prices and quotes.
create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('admin', 'manager'), false)
$$;

-- Any active internal user (admin, manager, staff, ctv).
create or replace function public.is_internal()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_app_role() is not null
$$;

-- True when the caller is server code (service_role / postgres), not an end user.
create or replace function public.is_service_call()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is null
     and coalesce(auth.role(), 'service_role') not in ('anon', 'authenticated')
$$;

-- ---------------------------------------------------------------------------
-- Column guard: only admin (or server code) may change role / is_active / email.
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_service_call() or public.is_admin() then
    -- Admin must not demote / deactivate themselves (prevents lock-out).
    if not public.is_service_call()
       and new.id = auth.uid()
       and (new.role <> 'admin' or not new.is_active) then
      raise exception 'admin cannot demote or deactivate own account' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.email is distinct from old.email
     or new.id is distinct from old.id then
    raise exception 'not allowed to change role, status or email' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_columns();

-- New auth user -> profile row. Role comes ONLY from app_metadata (set by service
-- role when an admin invites a user); defaults to the least privileged role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  begin
    v_role := coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'ctv');
  exception when invalid_text_representation then
    v_role := 'ctv';
  end;
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_self_or_manager on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_manager_or_admin());

-- Users may edit their own name/phone; guard trigger blocks role/is_active.
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No insert/delete policies: profiles are created by trigger, removed via auth.users cascade.

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_manager_or_admin() from public, anon;
revoke all on function public.is_internal() from public, anon;
grant execute on function public.current_app_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_manager_or_admin() to authenticated, service_role;
grant execute on function public.is_internal() to authenticated, service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
