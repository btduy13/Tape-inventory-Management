-- 0002_tape_presets
-- Admin-editable tape sizes offered in the public designer.

create table public.tape_presets (
  id             uuid primary key default gen_random_uuid(),
  label          text not null,
  width_mm       numeric(6, 1) not null check (width_mm > 0 and width_mm <= 200),
  length_m       numeric(7, 1) not null check (length_m > 0 and length_m <= 2000),
  thickness_mic  numeric(5, 1) not null check (thickness_mic > 0 and thickness_mic <= 200),
  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint tape_presets_size_unique unique (width_mm, length_m, thickness_mic)
);

create index tape_presets_active_sort_idx on public.tape_presets (sort_order) where is_active;

create trigger tape_presets_set_updated_at
  before update on public.tape_presets
  for each row execute function public.set_updated_at();

alter table public.tape_presets enable row level security;

-- Public designer reads active presets (anon + logged-in).
create policy tape_presets_select_active on public.tape_presets
  for select to anon, authenticated
  using (is_active);

-- Admin also sees inactive presets.
create policy tape_presets_select_admin on public.tape_presets
  for select to authenticated
  using (public.is_admin());

create policy tape_presets_insert_admin on public.tape_presets
  for insert to authenticated
  with check (public.is_admin());

create policy tape_presets_update_admin on public.tape_presets
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy tape_presets_delete_admin on public.tape_presets
  for delete to authenticated
  using (public.is_admin());

-- Initial catalogue (also needed in production, so it lives in the migration).
insert into public.tape_presets (label, width_mm, length_m, thickness_mic, sort_order) values
  ('48mm x 100m - 45mic', 48, 100, 45, 10),
  ('60mm x 100m - 45mic', 60, 100, 45, 20),
  ('48mm x 200m - 50mic', 48, 200, 50, 30),
  ('72mm x 100m - 50mic', 72, 100, 50, 40)
on conflict (width_mm, length_m, thickness_mic) do nothing;
