-- 0022_tape_specs
-- Tape size options (quy cách) for the public designer / quote request:
--   tape_widths          widths the customer can pick (admin adds / disables / reorders)
--   tape_spec_settings   single row: allowed roll length range (m) + default film thickness (mic)
-- The customer picks one active width and types any length between min_length_m and max_length_m.
-- POST /api/leads re-checks both against these tables (service role) before saving.
-- Tests: supabase/tests/rls/15_tape_specs.test.sql

-- 1. Tables -------------------------------------------------------------------------------------
create table public.tape_widths (
  id          uuid primary key default gen_random_uuid(),
  width_mm    integer not null check (width_mm between 1 and 200),
  is_active   boolean not null default true,
  sort_order  integer not null default 0 check (sort_order between -10000 and 10000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint tape_widths_width_unique unique (width_mm)
);

create index tape_widths_active_sort_idx on public.tape_widths (sort_order, width_mm) where is_active;

create trigger tape_widths_set_updated_at
  before update on public.tape_widths
  for each row execute function public.set_updated_at();

create table public.tape_spec_settings (
  id             boolean primary key default true check (id),   -- single row
  min_length_m   numeric(7, 1) not null check (min_length_m > 0),
  max_length_m   numeric(7, 1) not null check (max_length_m <= 10000),
  thickness_mic  numeric(5, 1) not null default 45 check (thickness_mic > 0 and thickness_mic <= 200),
  updated_at     timestamptz not null default now(),
  constraint tape_spec_settings_length_range check (min_length_m <= max_length_m)
);

create trigger tape_spec_settings_set_updated_at
  before update on public.tape_spec_settings
  for each row execute function public.set_updated_at();

comment on table public.tape_widths is
  'Tape widths (mm) offered in the designer. Public read of active rows; admin-only writes.';
comment on table public.tape_spec_settings is
  'Single row: customer roll length range (m) and default thickness (mic). Admin-only update.';

-- 2. Grants (same shape as tape_presets after 0011/0018; electron_app gets nothing) -----------
revoke all on table public.tape_widths, public.tape_spec_settings from public, anon, authenticated;
grant select on table public.tape_widths, public.tape_spec_settings to anon;
grant select, insert, update, delete on table public.tape_widths to authenticated;
-- Single row: no insert / delete through the API, only update.
grant select, update on table public.tape_spec_settings to authenticated;
grant all on table public.tape_widths, public.tape_spec_settings to service_role;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'electron_app') then
    execute 'revoke all on table public.tape_widths, public.tape_spec_settings from electron_app';
  end if;
end $$;

-- 3. RLS ----------------------------------------------------------------------------------------
alter table public.tape_widths enable row level security;
alter table public.tape_spec_settings enable row level security;

-- Public designer reads active widths.
create policy tape_widths_select_active on public.tape_widths
  for select to anon
  using (is_active);
-- Logged-in users read active widths; admin also sees disabled ones.
create policy tape_widths_select_authenticated on public.tape_widths
  for select to authenticated
  using (is_active or (select public.is_admin()));

create policy tape_widths_insert_admin on public.tape_widths
  for insert to authenticated
  with check ((select public.is_admin()));

create policy tape_widths_update_admin on public.tape_widths
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy tape_widths_delete_admin on public.tape_widths
  for delete to authenticated
  using ((select public.is_admin()));

-- The length range is public (shown as helper text in the designer).
create policy tape_spec_settings_select on public.tape_spec_settings
  for select to anon, authenticated
  using (true);

create policy tape_spec_settings_update_admin on public.tape_spec_settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 4. Seed (also needed in production, so it lives in the migration) -----------------------------
insert into public.tape_widths (width_mm, sort_order) values
  (12, 10), (15, 20), (16, 30), (18, 40), (20, 50), (24, 60), (30, 70),
  (35, 80), (40, 90), (48, 100), (60, 110), (70, 120), (80, 130)
on conflict (width_mm) do nothing;

insert into public.tape_spec_settings (id, min_length_m, max_length_m, thickness_mic)
values (true, 50, 635, 45)
on conflict (id) do nothing;
