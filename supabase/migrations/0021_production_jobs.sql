-- 0021_production_jobs
-- Workshop ("xưởng") production tracking on top of the legacy Electron order table.
-- Tests: supabase/tests/rls/14_workshop_production.test.sql (+ 13 for the hand-off columns),
--        web/tests/security/workshop/*.test.ts
--
-- Model
--   * production_jobs: one row per lead that goes (or is about to go) to production.
--       - created by an admin assigning a workshop user to an ACCEPTED lead
--         (assign_production_job), or by the hand-off itself (convert_lead_to_production);
--       - order_id = bang_keo_in_orders.id once converted (NULL = assigned, not converted yet);
--       - workshop_user_id = the ONE workshop user who may see and work on it.
--     The table holds no customer or price data, so RLS SELECT on it is enough for Realtime.
--   * production_step_log: append-only history of step changes (who / when / note).
--   * Specs for the workshop come ONLY from workshop_jobs() (SECURITY DEFINER, fixed column list:
--     size, colors, quantity, print text, design JSON, preview/logo paths, due date, production
--     note, order code). Workshop users have no RLS access to leads, designs, quotes, notes or
--     the legacy tables, so prices, VAT, phone, email, company and customer notes stay hidden.
--
-- Steps: cho_san_xuat -> dang_in -> dang_cat_cuon -> dong_goi -> san_sang_giao -> da_giao
--        (+ huy, admin only). A workshop user may only move its own job one step forward; an admin
--        may set any step. Sync on every change (advance_production_step):
--          lead:      any step after conversion keeps the lead in `production` (accepted -> production),
--                     san_sang_giao -> lead `shipping`, da_giao -> lead `done`, huy -> lead `cancelled`;
--                     forward only, a lead is never moved backwards.
--          Electron:  bang_keo_in_orders.da_giao (the only status flag the desktop app has for
--                     production orders) = TRUE on da_giao, FALSE again only when an admin moves a
--                     job back out of da_giao. Nothing else in the legacy row is touched.
--        One-way: the desktop app's own edits are READ live by workshop_jobs() (ngay_du_kien as the
--        due date, da_giao as "desktop_delivered"); no trigger is added to the legacy table, so
--        Electron writes (postgres or electron_app) are unaffected.
--
-- Hand-off: convert_lead_to_production(lead, due_date, note, workshop_user)
--   * caller: admin / server code, or the workshop user an admin assigned to that lead's job;
--   * due date is required and must be >= today (Vietnam date); written to ngay_du_kien;
--   * VAT of the accepted quote is copied: vat = quotes.vat_amount, vat_percent = quotes.vat_percent,
--     thanh_tien_ban = quotes.subtotal, cong_no_khach = GREATEST(thanh_tien_ban + vat - tien_coc, 0)
--     with tien_coc = 0, i.e. exactly electron/js/orderMath.js customerDebtSqlExpression
--     ('bang_keo_in_orders', loai_truc not 'moi'); the production trigger trg_sync_customer_debt
--     computes the same value.
--   * replaces the one-argument signature from 0009/0019 (dropped; the web app is the only caller).
--   * the lead row is updated by the definer function; leads guards accept the production link
--     from a non-admin only when it matches a production_jobs row converted by that same user in
--     this hand-off (is_job_handoff), so no API caller can set production_order_id directly.

-- ---------------------------------------------------------------------------
-- 1. Local stub columns used by the hand-off / sync (production already has them; Electron
--    main.js schema v1 created vat, vat_percent; da_giao, da_tat_toan, cong_no_khach, tien_coc
--    are original desktop columns). Only missing columns are added, so production is untouched.
-- ---------------------------------------------------------------------------
do $$
declare
  c record;
begin
  if to_regclass('public.bang_keo_in_orders') is null then
    return;
  end if;
  for c in
    select * from (values
      ('vat',           'numeric default 0'),
      ('vat_percent',   'numeric default 0'),
      ('tien_coc',      'numeric default 0'),
      ('cong_no_khach', 'numeric default 0'),
      ('da_giao',       'boolean default false'),
      ('da_tat_toan',   'boolean default false')
    ) as v(name, ddl)
  loop
    if not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'bang_keo_in_orders'
                      and column_name = c.name) then
      execute format('alter table public.bang_keo_in_orders add column %I %s', c.name, c.ddl);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Types and tables
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'production_step') then
    create type public.production_step as enum (
      'cho_san_xuat', 'dang_in', 'dang_cat_cuon', 'dong_goi', 'san_sang_giao', 'da_giao', 'huy'
    );
  end if;
end;
$$;

create table if not exists public.production_jobs (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null unique references public.leads (id) on delete cascade,
  -- bang_keo_in_orders.id. No foreign key: the legacy table belongs to the desktop app, which
  -- must stay free to edit / delete its rows.
  order_id          text unique,
  workshop_user_id  uuid references public.profiles (id) on delete set null,
  step              public.production_step not null default 'cho_san_xuat',
  due_date          date,
  production_note   text check (production_note is null or char_length(production_note) <= 2000),
  assigned_at       timestamptz,
  converted_by      uuid references public.profiles (id) on delete set null,
  converted_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists production_jobs_workshop_user_idx on public.production_jobs (workshop_user_id);
create index if not exists production_jobs_step_idx          on public.production_jobs (step);
create index if not exists production_jobs_converted_by_idx  on public.production_jobs (converted_by);

drop trigger if exists production_jobs_set_updated_at on public.production_jobs;
create trigger production_jobs_set_updated_at
  before update on public.production_jobs
  for each row execute function public.set_updated_at();

create table if not exists public.production_step_log (
  id               bigint generated always as identity primary key,
  job_id           uuid not null references public.production_jobs (id) on delete cascade,
  from_step        public.production_step,           -- null = hand-off
  to_step          public.production_step not null,
  changed_by       uuid references public.profiles (id) on delete set null,
  changed_by_name  text,                              -- snapshot: workshop users cannot read profiles
  note             text check (note is null or char_length(note) <= 1000),
  created_at       timestamptz not null default now()
);

create index if not exists production_step_log_job_idx        on public.production_step_log (job_id, created_at desc);
create index if not exists production_step_log_changed_by_idx on public.production_step_log (changed_by);

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_workshop()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'workshop', false)
$$;

create or replace function public.production_step_next(p_step public.production_step)
returns public.production_step
language sql
immutable
set search_path = ''
as $$
  select case p_step
    when 'cho_san_xuat'  then 'dang_in'::public.production_step
    when 'dang_in'       then 'dang_cat_cuon'::public.production_step
    when 'dang_cat_cuon' then 'dong_goi'::public.production_step
    when 'dong_goi'      then 'san_sang_giao'::public.production_step
    when 'san_sang_giao' then 'da_giao'::public.production_step
    else null
  end
$$;

create or replace function public.production_step_label(p_step public.production_step)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_step
    when 'cho_san_xuat'  then 'Chờ sản xuất'
    when 'dang_in'       then 'Đang in'
    when 'dang_cat_cuon' then 'Đang cắt cuộn'
    when 'dong_goi'      then 'Đóng gói'
    when 'san_sang_giao' then 'Sẵn sàng giao'
    when 'da_giao'       then 'Đã giao'
    when 'huy'           then 'Đã hủy'
  end
$$;

-- True only inside the hand-off: the new production link matches a job row that the current
-- user converted, the link was empty before, and no other privileged column changes.
create or replace function public.is_job_handoff(p_old public.leads, p_new public.leads)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_old.production_order_id is null
     and p_new.production_order_id is not null
     and auth.uid() is not null
     and p_new.id = p_old.id
     and p_new.code = p_old.code
     and p_new.created_at = p_old.created_at
     and p_new.assigned_to is not distinct from p_old.assigned_to
     and p_new.assigned_at is not distinct from p_old.assigned_at
     and p_new.source_ip_hash is not distinct from p_old.source_ip_hash
     and p_new.user_agent is not distinct from p_old.user_agent
     and exists (
       select 1 from public.production_jobs j
        where j.lead_id = p_new.id
          and j.order_id = p_new.production_order_id
          and j.converted_by = auth.uid()
     )
$$;

-- ---------------------------------------------------------------------------
-- 4. Lead guards accept the workshop hand-off (0003 / 0013 functions, one added branch each)
-- ---------------------------------------------------------------------------
create or replace function public.leads_guard_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.code is distinct from old.code
     or new.created_at is distinct from old.created_at then
    raise exception 'immutable lead columns' using errcode = '42501';
  end if;

  if public.is_service_call() or public.is_admin() then
    return new;
  end if;

  -- Workshop hand-off (convert_lead_to_production): production link + status only.
  if public.is_job_handoff(old, new)
     and (to_jsonb(new) - 'status' - 'updated_at' - 'production_order_id')
         = (to_jsonb(old) - 'status' - 'updated_at' - 'production_order_id') then
    return new;
  end if;

  if new.assigned_to is distinct from old.assigned_to
     or new.assigned_at is distinct from old.assigned_at
     or new.production_order_id is distinct from old.production_order_id
     or new.source_ip_hash is distinct from old.source_ip_hash
     or new.user_agent is distinct from old.user_agent then
    raise exception 'only admin may change assignment / production link' using errcode = '42501';
  end if;

  if public.is_manager_or_admin() then
    return new;
  end if;

  -- staff / ctv: status only
  if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'staff may only change lead status' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.leads_guard_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_service_call() or public.is_admin() then
    return new;
  end if;
  if public.is_job_handoff(old, new) then
    return new;
  end if;
  raise exception 'only admin may change assignment / production link'
    using errcode = '42501';
end;
$$;

-- Moves the lead forward to match a production step (never backwards). Internal only.
create or replace function public.production_sync_lead(p_lead_id uuid, p_step public.production_step)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.lead_status;
  v_note   text := 'Xưởng: ' || public.production_step_label(p_step);
begin
  select status into v_status from public.leads where id = p_lead_id for update;
  if v_status is null or v_status in ('done', 'cancelled') then
    return;
  end if;

  perform set_config('app.status_note', v_note, true);
  if p_step = 'huy' then
    update public.leads set status = 'cancelled' where id = p_lead_id;
    perform set_config('app.status_note', '', true);
    return;
  end if;
  if v_status = 'accepted' then
    update public.leads set status = 'production' where id = p_lead_id;
    v_status := 'production';
  end if;
  if p_step in ('san_sang_giao', 'da_giao') and v_status = 'production' then
    update public.leads set status = 'shipping' where id = p_lead_id;
    v_status := 'shipping';
  end if;
  if p_step = 'da_giao' and v_status = 'shipping' then
    update public.leads set status = 'done' where id = p_lead_id;
  end if;
  perform set_config('app.status_note', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPCs
-- ---------------------------------------------------------------------------
-- Production specs for the dashboard. Fixed column list: NO prices, VAT, phone, email, company,
-- customer name or customer note. Workshop: own jobs only. Admin: all jobs.
create or replace function public.workshop_jobs(p_job_id uuid default null)
returns table (
  job_id             uuid,
  lead_id            uuid,
  lead_code          text,
  order_id           text,
  step               public.production_step,
  due_date           date,
  production_note    text,
  workshop_user_id   uuid,
  workshop_user_name text,
  quantity           integer,
  width_mm           numeric,
  length_m           numeric,
  thickness_mic      numeric,
  colors             text[],
  print_text         text,
  design_json        jsonb,
  preview_path       text,
  logo_path          text,
  desktop_delivered  boolean,
  converted_at       timestamptz,
  updated_at         timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_admin boolean := public.is_admin();
begin
  if not (v_admin or public.is_workshop()) then
    raise exception 'only admin or workshop users may read production jobs' using errcode = '42501';
  end if;
  return query
    select j.id, j.lead_id, l.code, j.order_id, j.step,
           coalesce(o.ngay_du_kien, j.due_date), j.production_note,
           j.workshop_user_id, p.full_name,
           l.quantity, d.width_mm::numeric, d.length_m::numeric, d.thickness_mic::numeric,
           d.colors, d.print_text, d.design_json, d.preview_path, d.logo_path,
           coalesce(o.da_giao, false), j.converted_at, j.updated_at
      from public.production_jobs j
      join public.leads l on l.id = j.lead_id
      left join lateral (
        select ds.width_mm, ds.length_m, ds.thickness_mic, ds.colors, ds.print_text,
               ds.design_json, ds.preview_path, ds.logo_path
          from public.designs ds
         where ds.lead_id = j.lead_id
         order by ds.created_at desc
         limit 1
      ) d on true
      left join public.bang_keo_in_orders o on o.id = j.order_id
      left join public.profiles p on p.id = j.workshop_user_id
     where (p_job_id is null or j.id = p_job_id)
       and (v_admin or j.workshop_user_id = auth.uid())
     order by coalesce(o.ngay_du_kien, j.due_date) nulls last, j.created_at;
end;
$$;

-- Admin assigns (or unassigns with NULL) the workshop user of a lead's production job.
-- Creates the job for an accepted lead that is not converted yet.
create or replace function public.assign_production_job(p_lead_id uuid, p_user_id uuid)
returns public.production_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.leads;
  v_job  public.production_jobs;
begin
  if not (public.is_service_call() or public.is_admin()) then
    raise exception 'only admin may assign production jobs' using errcode = '42501';
  end if;
  select * into v_lead from public.leads where id = p_lead_id for update;
  if v_lead.id is null then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;
  if v_lead.status not in ('accepted', 'production', 'shipping') then
    raise exception 'lead is not ready for production (is %)', v_lead.status using errcode = '22023';
  end if;
  if p_user_id is not null and not exists (
    select 1 from public.profiles where id = p_user_id and is_active and role = 'workshop'
  ) then
    raise exception 'assignee must be an active workshop user' using errcode = '22023';
  end if;

  select * into v_job from public.production_jobs where lead_id = p_lead_id for update;
  if v_job.id is not null and v_job.step in ('da_giao', 'huy') then
    raise exception 'production job is closed (%)', v_job.step using errcode = '22023';
  end if;

  insert into public.production_jobs (lead_id, workshop_user_id, assigned_at)
  values (p_lead_id, p_user_id, case when p_user_id is null then null else now() end)
  on conflict (lead_id) do update
     set workshop_user_id = excluded.workshop_user_id,
         assigned_at      = excluded.assigned_at
  returning * into v_job;
  return v_job;
end;
$$;

-- Hand-off. Replaces convert_lead_to_production(uuid) from 0009 / 0019.
drop function if exists public.convert_lead_to_production(uuid);

create or replace function public.convert_lead_to_production(
  p_lead_id          uuid,
  p_due_date         date,
  p_note             text default null,
  p_workshop_user_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin  boolean := public.is_service_call() or public.is_admin();
  v_lead   public.leads;
  v_design public.designs;
  v_quote  public.quotes;
  v_job    public.production_jobs;
  v_id     text;
  v_unit   numeric;
  v_sale   numeric;
  v_vat    numeric;
  v_vatp   numeric;
  v_name   text;
  v_note   text := nullif(btrim(left(coalesce(p_note, ''), 2000)), '');
  -- The Electron app stores local Vietnam time in `timestamp without time zone` columns.
  v_now_vn timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
begin
  if not (v_admin or public.is_workshop()) then
    raise exception 'only admin or the assigned workshop user may convert leads' using errcode = '42501';
  end if;
  if p_workshop_user_id is not null and not v_admin then
    raise exception 'only admin may choose the workshop user' using errcode = '42501';
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  select * into v_job from public.production_jobs where lead_id = p_lead_id for update;
  if not v_admin and (v_lead.id is null or v_job.id is null or v_job.workshop_user_id is distinct from auth.uid()) then
    raise exception 'lead is not assigned to you for production' using errcode = '42501';
  end if;
  if v_lead.id is null then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;
  if v_lead.production_order_id is not null then
    return v_lead.production_order_id;   -- idempotent
  end if;
  if v_lead.status <> 'accepted' then
    raise exception 'lead must be accepted before production (is %)', v_lead.status
      using errcode = '22023';
  end if;
  if p_due_date is null or p_due_date < v_now_vn::date then
    raise exception 'due date must be today or later' using errcode = '22023';
  end if;
  if p_workshop_user_id is not null and not exists (
    select 1 from public.profiles where id = p_workshop_user_id and is_active and role = 'workshop'
  ) then
    raise exception 'assignee must be an active workshop user' using errcode = '22023';
  end if;

  select * into v_design from public.designs
   where lead_id = p_lead_id order by created_at desc limit 1;
  if v_design.id is null then
    raise exception 'lead has no design' using errcode = '22023';
  end if;

  select * into v_quote from public.quotes
   where lead_id = p_lead_id and status = 'accepted'
   order by version desc limit 1;
  v_sale := coalesce(v_quote.subtotal, 0);
  v_vat  := coalesce(v_quote.vat_amount, 0);
  v_vatp := coalesce(v_quote.vat_percent, 0);
  v_unit := case when v_quote.id is not null and v_lead.quantity > 0
                 then round(v_quote.subtotal / v_lead.quantity, 2) else 0 end;

  v_id := public.next_bang_keo_in_order_id();

  insert into public.bang_keo_in_orders (
    id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang,
    quy_cach_mm, quy_cach_m, quy_cach_mic, so_luong, mau_sac,
    don_gia_ban, thanh_tien_ban, vat, vat_percent, tien_coc, cong_no_khach,
    da_giao, da_tat_toan, is_quote
  ) values (
    v_id,
    v_now_vn,
    p_due_date,
    left('Băng keo in ' || coalesce(nullif(v_design.print_text, ''), v_lead.code), 255),
    left(concat_ws(' - ', nullif(v_lead.company, ''), v_lead.customer_name, v_lead.phone), 255),
    v_design.width_mm, v_design.length_m, v_design.thickness_mic,
    v_lead.quantity,
    left(array_to_string(v_design.colors, ', '), 100),
    v_unit,
    v_sale,
    v_vat,
    v_vatp,
    0,
    -- = orderMath.customerDebtSqlExpression('bang_keo_in_orders') for a new order (no axis, no deposit)
    greatest(v_sale + v_vat - 0, 0),
    false,
    false,
    false
  );

  if v_job.id is null then
    insert into public.production_jobs (
      lead_id, order_id, workshop_user_id, step, due_date, production_note,
      assigned_at, converted_by, converted_at
    ) values (
      p_lead_id, v_id, p_workshop_user_id, 'cho_san_xuat', p_due_date, v_note,
      case when p_workshop_user_id is null then null else now() end, auth.uid(), now()
    )
    returning * into v_job;
  else
    update public.production_jobs
       set order_id         = v_id,
           step             = 'cho_san_xuat',
           due_date         = p_due_date,
           production_note  = coalesce(v_note, production_note),
           workshop_user_id = coalesce(p_workshop_user_id, workshop_user_id),
           assigned_at      = case when p_workshop_user_id is not null
                                    and p_workshop_user_id is distinct from workshop_user_id
                                   then now() else assigned_at end,
           converted_by     = auth.uid(),
           converted_at     = now()
     where id = v_job.id
    returning * into v_job;
  end if;

  select full_name into v_name from public.profiles where id = auth.uid();
  insert into public.production_step_log (job_id, from_step, to_step, changed_by, changed_by_name, note)
  values (v_job.id, null, 'cho_san_xuat', auth.uid(), v_name,
          left('Chuyển sang sản xuất: ' || v_id || coalesce(' — ' || v_note, ''), 1000));

  perform set_config('app.status_note', 'Chuyển sang sản xuất: ' || v_id, true);
  update public.leads
     set production_order_id = v_id, status = 'production'
   where id = p_lead_id;
  perform set_config('app.status_note', '', true);

  return v_id;
end;
$$;

-- One step change with optional note. Workshop: own job, next step only. Admin: any step, huy.
create or replace function public.advance_production_step(
  p_job_id uuid,
  p_to     public.production_step,
  p_note   text default null
)
returns public.production_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin boolean := public.is_service_call() or public.is_admin();
  v_job   public.production_jobs;
  v_from  public.production_step;
  v_name  text;
  v_note  text := nullif(btrim(left(coalesce(p_note, ''), 1000)), '');
begin
  if not (v_admin or public.is_workshop()) then
    raise exception 'only admin or workshop users may change production steps' using errcode = '42501';
  end if;

  select * into v_job from public.production_jobs where id = p_job_id for update;
  -- coalesce: an unassigned job (workshop_user_id NULL) must not compare as "unknown" here.
  if v_job.id is null or not (v_admin or coalesce(v_job.workshop_user_id = auth.uid(), false)) then
    raise exception 'production job not found or not accessible' using errcode = 'P0002';
  end if;
  if v_job.order_id is null then
    raise exception 'lead is not converted to production yet' using errcode = '22023';
  end if;
  if p_to is null or p_to = v_job.step then
    raise exception 'no step change' using errcode = '22023';
  end if;
  if not v_admin then
    if p_to = 'huy' then
      raise exception 'only admin may cancel a production job' using errcode = '42501';
    end if;
    if p_to is distinct from public.production_step_next(v_job.step) then
      raise exception 'workshop may only move to the next step (% -> %)', v_job.step, p_to
        using errcode = '42501';
    end if;
  end if;

  v_from := v_job.step;
  update public.production_jobs set step = p_to where id = p_job_id returning * into v_job;

  select full_name into v_name from public.profiles where id = auth.uid();
  insert into public.production_step_log (job_id, from_step, to_step, changed_by, changed_by_name, note)
  values (v_job.id, v_from, p_to, auth.uid(), v_name, v_note);

  perform public.production_sync_lead(v_job.lead_id, p_to);

  -- Desktop app flag (bang_keo_in_orders.da_giao); not in the debt triggers' column lists.
  if p_to = 'da_giao' then
    update public.bang_keo_in_orders set da_giao = true
     where id = v_job.order_id and da_giao is distinct from true;
  elsif v_from = 'da_giao' then
    update public.bang_keo_in_orders set da_giao = false
     where id = v_job.order_id and da_giao is distinct from false;
  end if;

  return v_job;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. RLS + grants
-- ---------------------------------------------------------------------------
alter table public.production_jobs enable row level security;
alter table public.production_step_log enable row level security;

revoke all on table public.production_jobs, public.production_step_log from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.production_jobs, public.production_step_log from authenticated;
grant select on table public.production_jobs, public.production_step_log to authenticated;

drop policy if exists production_jobs_select on public.production_jobs;
create policy production_jobs_select on public.production_jobs
  for select to authenticated
  using (public.is_admin()
         or (workshop_user_id = (select auth.uid()) and public.is_workshop()));

-- Log rows are visible exactly when their job is (RLS of production_jobs applies in the subquery).
drop policy if exists production_step_log_select on public.production_step_log;
create policy production_step_log_select on public.production_step_log
  for select to authenticated
  using (exists (select 1 from public.production_jobs j where j.id = job_id));

-- Design files: assigned workshop users may read previews/logos of their jobs' leads (never quotes).
alter policy lead_files_select on storage.objects
  using (
    (bucket_id in ('logos', 'previews', 'quotes') and public.can_access_lead_path(name))
    or (bucket_id in ('logos', 'previews')
        and public.is_workshop()
        and exists (select 1 from public.production_jobs j
                     where j.lead_id::text = split_part(name, '/', 1)
                       and j.workshop_user_id = (select auth.uid())))
  );

revoke all on function public.is_workshop() from public, anon;
grant execute on function public.is_workshop() to authenticated, service_role;

revoke all on function public.production_step_next(public.production_step) from public, anon, authenticated;
revoke all on function public.production_step_label(public.production_step) from public, anon, authenticated;
revoke all on function public.is_job_handoff(public.leads, public.leads) from public, anon, authenticated;
revoke all on function public.production_sync_lead(uuid, public.production_step) from public, anon, authenticated;
revoke all on function public.leads_guard_columns() from public, anon, authenticated;
revoke all on function public.leads_guard_admin_columns() from public, anon, authenticated;

revoke all on function public.workshop_jobs(uuid) from public, anon;
revoke all on function public.assign_production_job(uuid, uuid) from public, anon;
revoke all on function public.convert_lead_to_production(uuid, date, text, uuid) from public, anon;
revoke all on function public.advance_production_step(uuid, public.production_step, text) from public, anon;
grant execute on function public.workshop_jobs(uuid) to authenticated, service_role;
grant execute on function public.assign_production_job(uuid, uuid) to authenticated, service_role;
grant execute on function public.convert_lead_to_production(uuid, date, text, uuid) to authenticated, service_role;
grant execute on function public.advance_production_step(uuid, public.production_step, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Realtime (RLS-filtered): dashboard refreshes on job / log changes
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['production_jobs', 'production_step_log']
  loop
    if not exists (select 1 from pg_publication_tables
                    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- Full old-row image so an unassign UPDATE carries the previous workshop_user_id.
alter table public.production_jobs replica identity full;
