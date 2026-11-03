-- 0024_workshop_v2
-- Workshop v2 (docs/plans/2026-11-03-xuong-v2.md, part A).
-- Tests: supabase/tests/rls/16_workshop_v2.test.sql (+ 14 updated for the 4-step model),
--        web/tests/security/workshop/*.test.ts
--
-- 1. Four steps: cho_san_xuat -> dang_san_xuat -> san_sang_giao -> da_giao (+ huy, admin only).
--    Jobs on dang_in / dang_cat_cuon / dong_goi move to dang_san_xuat; a check constraint keeps the
--    retired values off production_jobs.step (production_step_log keeps them as history).
--    Workshop: own job, next step only, never huy and never da_giao (delivery is confirmed only
--    through a delivery note). Admin: any step.
-- 2. Customer phone / delivery address on the three Electron order tables
--    (sdt_khach_hang, dia_chi_khach_hang; nullable, added only when missing).
-- 3. App -> web sync (printed tape only): an AFTER trigger on bang_keo_in_orders creates the
--    workshop job of every new real order (INSERT with is_quote false and da_giao false, or a quote
--    turned into an order), moves the job to da_giao when the app ticks da_giao, and deletes a
--    lead-less job when its order is deleted. Old orders are not backfilled. The trigger function
--    is SECURITY DEFINER (electron_app has no access to production tables), not executable by any
--    API role, and swallows its own errors so desktop writes never fail because of it.
--    production_jobs.lead_id is now optional (jobs from the app / web admin have only order_id).
-- 4. workshop_jobs() adds order_name (= ten_hang) and order_table; jobs without a lead read
--    specs from the order row. Still no price, phone, address or customer column.
-- 5. Delivery notes with a QR token: create_delivery_note (admin / assigned workshop, job at
--    san_sang_giao) returns the raw token once and stores only sha256(token) hex. A new note
--    revokes the older open notes of the job. delivery_note_by_token / confirm_delivery are
--    service_role only (public /giao/[token] page through server code); confirming locks the note
--    and moves the job to da_giao (lead + Electron da_giao synced). Photos: private bucket
--    delivery-photos, written only by service_role, read by admin.
-- 6. Admin-only order RPCs (admin_orders_list / admin_order_get / admin_order_create). Money is
--    computed like electron/js/orderMath.js calculatePrintedTape. Legacy tables keep no grant for
--    anon / authenticated.

-- ---------------------------------------------------------------------------
-- 1. Legacy order columns
-- ---------------------------------------------------------------------------
-- Customer contact on the three desktop order tables (production gets these two).
do $$
declare
  t text;
begin
  foreach t in array array['bang_keo_in_orders', 'bang_keo_orders', 'truc_in_orders']
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('alter table public.%I add column if not exists sdt_khach_hang text', t);
    execute format('alter table public.%I add column if not exists dia_chi_khach_hang text', t);
  end loop;
end;
$$;

-- Local stub only: the printed-tape columns the admin order RPCs write / read. Production (the
-- Electron schema) already has every one of them, so nothing changes there.
do $$
declare
  c record;
begin
  if to_regclass('public.bang_keo_in_orders') is null then
    return;
  end if;
  for c in
    select * from (values
      ('cuon_cay', 'numeric'), ('phi_sl', 'numeric default 0'), ('mau_keo', 'text'),
      ('phi_keo', 'numeric default 0'), ('phi_mau', 'numeric default 0'),
      ('phi_size', 'numeric default 0'), ('phi_cat', 'numeric default 0'),
      ('don_gia_von', 'numeric default 0'), ('don_gia_goc', 'numeric default 0'),
      ('thanh_tien_goc', 'numeric default 0'), ('ctv', 'text'), ('hoa_hong', 'numeric default 0'),
      ('tien_hoa_hong', 'numeric default 0'), ('loi_giay', 'text'), ('thung_bao', 'text'),
      ('loi_nhuan', 'numeric default 0'), ('tien_ship', 'numeric default 0'),
      ('loi_nhuan_rong', 'numeric default 0'), ('da_gui_email', 'boolean default false'),
      ('cong_no_ncc', 'numeric default 0'), ('loai_truc', 'varchar(10) default ''cu'''),
      ('ten_truc', 'text'), ('truc_chu_vi', 'numeric'), ('truc_so_luong', 'numeric default 0'),
      ('truc_gia_goc', 'numeric default 0'), ('truc_gia_ban', 'numeric default 0'),
      ('truc_thanh_tien_goc', 'numeric default 0'), ('truc_thanh_tien_ban', 'numeric default 0'),
      ('truc_ctv', 'text'), ('truc_hoa_hong', 'numeric default 0'),
      ('truc_tien_hoa_hong', 'numeric default 0'), ('truc_loi_nhuan', 'numeric default 0'),
      ('truc_loi_nhuan_rong', 'numeric default 0'), ('truc_vat', 'numeric default 0'),
      ('truc_vat_percent', 'numeric default 0'), ('quote_items', 'jsonb default ''[]''::jsonb')
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
-- 2. production_jobs: four steps, optional lead, order table
-- ---------------------------------------------------------------------------
update public.production_jobs
   set step = 'dang_san_xuat'
 where step in ('dang_in', 'dang_cat_cuon', 'dong_goi');

alter table public.production_jobs
  drop constraint if exists production_jobs_step_v2;
alter table public.production_jobs
  add constraint production_jobs_step_v2
  check (step not in ('dang_in', 'dang_cat_cuon', 'dong_goi'));

alter table public.production_jobs alter column lead_id drop not null;
alter table public.production_jobs
  add column if not exists order_table text not null default 'bang_keo_in_orders';
alter table public.production_jobs
  drop constraint if exists production_jobs_order_table_check;
alter table public.production_jobs
  add constraint production_jobs_order_table_check check (order_table = 'bang_keo_in_orders');
alter table public.production_jobs
  drop constraint if exists production_jobs_lead_or_order;
alter table public.production_jobs
  add constraint production_jobs_lead_or_order check (lead_id is not null or order_id is not null);

-- ---------------------------------------------------------------------------
-- 3. Delivery notes
-- ---------------------------------------------------------------------------
create table if not exists public.delivery_notes (
  id                 uuid primary key default gen_random_uuid(),
  job_id             uuid not null references public.production_jobs (id) on delete cascade,
  -- sha256(raw token) as lowercase hex; the raw token is returned once and never stored.
  token_hash         text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  -- recipient snapshot at creation (the order may change later in the desktop app)
  recipient_name     text check (recipient_name is null or char_length(recipient_name) <= 255),
  recipient_phone    text check (recipient_phone is null or char_length(recipient_phone) <= 50),
  recipient_address  text check (recipient_address is null or char_length(recipient_address) <= 500),
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  revoked_at         timestamptz,                    -- replaced by a newer note / job left the step
  confirmed_at       timestamptz,
  photo_path         text check (photo_path is null or char_length(photo_path) <= 300),
  constraint delivery_notes_confirmed_has_photo check ((confirmed_at is null) = (photo_path is null)),
  constraint delivery_notes_closed_once check (revoked_at is null or confirmed_at is null)
);

create index if not exists delivery_notes_job_idx        on public.delivery_notes (job_id, created_at desc);
create index if not exists delivery_notes_created_by_idx on public.delivery_notes (created_by);
-- At most one open note per job.
create unique index if not exists delivery_notes_one_open_per_job
  on public.delivery_notes (job_id) where revoked_at is null and confirmed_at is null;

-- ---------------------------------------------------------------------------
-- 4. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.production_step_next(p_step public.production_step)
returns public.production_step
language sql
immutable
set search_path = ''
as $$
  select case p_step
    when 'cho_san_xuat'  then 'dang_san_xuat'::public.production_step
    when 'dang_san_xuat' then 'san_sang_giao'::public.production_step
    when 'san_sang_giao' then 'da_giao'::public.production_step
    else null
  end
$$;

-- Old labels stay: production_step_log keeps the retired steps as history.
create or replace function public.production_step_label(p_step public.production_step)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_step
    when 'cho_san_xuat'  then 'Chờ sản xuất'
    when 'dang_san_xuat' then 'Đang sản xuất'
    when 'dang_in'       then 'Đang in'
    when 'dang_cat_cuon' then 'Đang cắt cuộn'
    when 'dong_goi'      then 'Đóng gói'
    when 'san_sang_giao' then 'Sẵn sàng giao'
    when 'da_giao'       then 'Đã giao'
    when 'huy'           then 'Đã hủy'
  end
$$;

-- One step change of a locked job + log + sync. Internal only: callers check permissions.
--   lead:     production_sync_lead (forward only)
--   Electron: bang_keo_in_orders.da_giao = true on da_giao, false when leaving da_giao
--   notes:    open delivery notes are revoked when the job leaves san_sang_giao
create or replace function public.production_apply_step(
  p_job_id  uuid,
  p_to      public.production_step,
  p_note    text default null,
  p_by_name text default null
)
returns public.production_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job  public.production_jobs;
  v_from public.production_step;
  v_name text := p_by_name;
begin
  select * into v_job from public.production_jobs where id = p_job_id for update;
  if v_job.id is null then
    raise exception 'production job not found' using errcode = 'P0002';
  end if;
  v_from := v_job.step;
  if p_to = v_from then
    return v_job;
  end if;

  update public.production_jobs set step = p_to where id = p_job_id returning * into v_job;

  if v_name is null then
    select full_name into v_name from public.profiles where id = auth.uid();
  end if;
  insert into public.production_step_log (job_id, from_step, to_step, changed_by, changed_by_name, note)
  values (v_job.id, v_from, p_to, auth.uid(), v_name,
          nullif(btrim(left(coalesce(p_note, ''), 1000)), ''));

  if v_job.lead_id is not null then
    perform public.production_sync_lead(v_job.lead_id, p_to);
  end if;

  if v_from = 'san_sang_giao' then
    update public.delivery_notes set revoked_at = now()
     where job_id = v_job.id and revoked_at is null and confirmed_at is null;
  end if;

  -- Desktop app flag; not in the debt triggers' column lists. A no-op when the app set it.
  if v_job.order_id is not null then
    if p_to = 'da_giao' then
      update public.bang_keo_in_orders set da_giao = true
       where id = v_job.order_id and da_giao is distinct from true;
    elsif v_from = 'da_giao' then
      update public.bang_keo_in_orders set da_giao = false
       where id = v_job.order_id and da_giao is distinct from false;
    end if;
  end if;

  return v_job;
end;
$$;

-- Strict JSON readers for admin_order_create (numbers must be JSON numbers, text JSON strings).
create or replace function public.order_payload_num(p_payload jsonb, p_key text)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_payload -> p_key is null or jsonb_typeof(p_payload -> p_key) = 'null' then
    return null;
  end if;
  if jsonb_typeof(p_payload -> p_key) <> 'number' then
    raise exception 'field % must be a number', p_key using errcode = '22023';
  end if;
  return (p_payload ->> p_key)::numeric;
end;
$$;

create or replace function public.order_payload_text(p_payload jsonb, p_key text, p_max integer)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
begin
  if p_payload -> p_key is null or jsonb_typeof(p_payload -> p_key) = 'null' then
    return null;
  end if;
  if jsonb_typeof(p_payload -> p_key) <> 'string' then
    raise exception 'field % must be a string', p_key using errcode = '22023';
  end if;
  v := nullif(btrim(p_payload ->> p_key), '');
  if char_length(v) > p_max then
    raise exception 'field % is too long (max %)', p_key, p_max using errcode = '22023';
  end if;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. workshop_jobs(): + order_name, order_table; lead-less jobs read specs from the order
-- ---------------------------------------------------------------------------
-- The return type changes, so the function is dropped and re-granted below.
drop function if exists public.workshop_jobs(uuid);

create function public.workshop_jobs(p_job_id uuid default null)
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
  updated_at         timestamptz,
  order_name         text,
  order_table        text
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
           case when j.lead_id is not null then l.quantity
                else round(o.so_luong::numeric)::integer end,
           case when j.lead_id is not null then d.width_mm::numeric else o.quy_cach_mm::numeric end,
           case when j.lead_id is not null then d.length_m::numeric else o.quy_cach_m::numeric end,
           case when j.lead_id is not null then d.thickness_mic::numeric else o.quy_cach_mic::numeric end,
           case when j.lead_id is not null then d.colors
                else array(select btrim(x) from unnest(string_to_array(o.mau_sac::text, ',')) x
                            where btrim(x) <> '') end,
           d.print_text, d.design_json, d.preview_path, d.logo_path,
           coalesce(o.da_giao, false), j.converted_at, j.updated_at,
           coalesce(nullif(btrim(o.ten_hang::text), ''),
                    'Băng keo in ' || coalesce(nullif(d.print_text, ''), l.code, j.order_id)),
           j.order_table
      from public.production_jobs j
      left join public.leads l on l.id = j.lead_id
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

-- ---------------------------------------------------------------------------
-- 6. Step changes, assignment, hand-off
-- ---------------------------------------------------------------------------
-- Workshop: own job, next step only, never huy / da_giao. Admin: any step (also backwards).
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
  if p_to in ('dang_in', 'dang_cat_cuon', 'dong_goi') then
    raise exception 'step % is retired', p_to using errcode = '22023';
  end if;
  if not v_admin then
    if p_to = 'huy' then
      raise exception 'only admin may cancel a production job' using errcode = '42501';
    end if;
    if p_to = 'da_giao' then
      raise exception 'delivery is confirmed only through a delivery note' using errcode = '42501';
    end if;
    if p_to is distinct from public.production_step_next(v_job.step) then
      raise exception 'workshop may only move to the next step (% -> %)', v_job.step, p_to
        using errcode = '42501';
    end if;
  end if;

  return public.production_apply_step(p_job_id, p_to, p_note);
end;
$$;

-- Admin assigns (or unassigns with NULL) the workshop user of any job, including jobs without a
-- lead (orders from the desktop app / web admin). assign_production_job (by lead) stays.
create or replace function public.assign_workshop_job(p_job_id uuid, p_user_id uuid)
returns public.production_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.production_jobs;
begin
  if not (public.is_service_call() or public.is_admin()) then
    raise exception 'only admin may assign production jobs' using errcode = '42501';
  end if;
  select * into v_job from public.production_jobs where id = p_job_id for update;
  if v_job.id is null then
    raise exception 'production job not found' using errcode = 'P0002';
  end if;
  if v_job.step in ('da_giao', 'huy') then
    raise exception 'production job is closed (%)', v_job.step using errcode = '22023';
  end if;
  if p_user_id is not null and not exists (
    select 1 from public.profiles where id = p_user_id and is_active and role = 'workshop'
  ) then
    raise exception 'assignee must be an active workshop user' using errcode = '22023';
  end if;

  update public.production_jobs
     set workshop_user_id = p_user_id,
         assigned_at      = case when p_user_id is null then null else now() end
   where id = p_job_id
  returning * into v_job;
  return v_job;
end;
$$;

-- Hand-off (0021) + customer phone on the order. The order INSERT fires the bang_keo_in_orders
-- trigger, which creates a lead-less job for the new order id; the hand-off replaces it with the
-- lead's own job below.
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
    id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang,
    quy_cach_mm, quy_cach_m, quy_cach_mic, so_luong, mau_sac,
    don_gia_ban, thanh_tien_ban, vat, vat_percent, tien_coc, cong_no_khach,
    da_giao, da_tat_toan, is_quote
  ) values (
    v_id,
    v_now_vn,
    p_due_date,
    left('Băng keo in ' || coalesce(nullif(v_design.print_text, ''), v_lead.code), 255),
    left(concat_ws(' - ', nullif(v_lead.company, ''), v_lead.customer_name, v_lead.phone), 255),
    v_lead.phone,
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

  -- The order trigger made a lead-less job for v_id; the lead's job takes the order instead.
  delete from public.production_jobs where order_id = v_id and lead_id is null;

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

-- ---------------------------------------------------------------------------
-- 7. App -> web sync: trigger on bang_keo_in_orders
-- ---------------------------------------------------------------------------
-- Runs for electron_app, the owner and the definer RPCs. Never raises: a failure is logged as a
-- WARNING and the desktop write goes through unchanged (the job can be fixed by an admin).
create or replace function public.bang_keo_in_orders_production_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job     public.production_jobs;
  v_user    uuid;
  v_from_db boolean := auth.uid() is null;   -- desktop app / owner, not a web user
  v_name    text;
begin
  begin
    if tg_op = 'DELETE' then
      -- Orders deleted in the app take their lead-less job with them (the id may be reused).
      delete from public.production_jobs where order_id = old.id and lead_id is null;
      -- A lead's job is kept but detached (cancelled if still open), so a reused id gets its own
      -- job and a later "Đã giao" tick on it can never close the lead's job.
      select * into v_job from public.production_jobs where order_id = old.id;
      if v_job.id is not null then
        if v_job.step not in ('da_giao', 'huy') then
          perform public.production_apply_step(v_job.id, 'huy', 'Đơn đã xóa trong app',
                                               case when v_from_db then 'App' end);
        else
          if v_from_db then
            v_name := 'App';
          else
            select full_name into v_name from public.profiles where id = auth.uid();
          end if;
          insert into public.production_step_log (job_id, from_step, to_step, changed_by, changed_by_name, note)
          values (v_job.id, v_job.step, v_job.step, auth.uid(), v_name, 'Đơn đã xóa trong app');
        end if;
        update public.production_jobs set order_id = null where id = v_job.id;
      end if;
      return old;
    end if;

    -- Bulk loads of historic orders opt out: SET LOCAL app.production_sync = 'off'.
    if coalesce(current_setting('app.production_sync', true), '') = 'off' then
      return new;
    end if;

    if coalesce(new.is_quote, false) then
      return new;
    end if;

    if (tg_op = 'INSERT' and not coalesce(new.da_giao, false))
       or (tg_op = 'UPDATE' and coalesce(old.is_quote, false)) then
      -- New real order (or a quote turned into one): one waiting job, no backfill of old orders.
      if not exists (select 1 from public.production_jobs where order_id = new.id) then
        -- A single active workshop user gets the job directly; otherwise an admin assigns it.
        select case when count(*) = 1 then min(id::text)::uuid end into v_user
          from public.profiles where role = 'workshop' and is_active;
        if v_from_db then
          v_name := 'App';
        else
          select full_name into v_name from public.profiles where id = auth.uid();
        end if;

        insert into public.production_jobs (
          order_id, workshop_user_id, step, due_date, assigned_at, converted_by, converted_at
        ) values (
          new.id, v_user, 'cho_san_xuat', new.ngay_du_kien,
          case when v_user is null then null else now() end, auth.uid(), now()
        )
        on conflict (order_id) do nothing
        returning * into v_job;

        if v_job.id is not null then
          insert into public.production_step_log (job_id, from_step, to_step, changed_by, changed_by_name, note)
          values (v_job.id, null, 'cho_san_xuat', auth.uid(), v_name,
                  case when v_from_db then 'Đơn mới từ app' else 'Đơn mới từ web' end);
        end if;
      end if;
      return new;
    end if;

    -- The app ticked "Đã giao": the job follows (definer RPCs set the flag after the job moved,
    -- so this is a no-op for them).
    if tg_op = 'UPDATE' and coalesce(new.da_giao, false) and not coalesce(old.da_giao, false) then
      select * into v_job from public.production_jobs where order_id = new.id;
      if v_job.id is not null and v_job.step not in ('da_giao', 'huy') then
        perform public.production_apply_step(v_job.id, 'da_giao', 'Từ app',
                                             case when v_from_db then 'App' end);
      end if;
    end if;
  exception when others then
    raise warning 'bang_keo_in_orders_production_sync(%): % (%)', tg_op, sqlerrm, sqlstate;
  end;
  return coalesce(new, old);
end;
$$;

drop trigger if exists bang_keo_in_orders_production_sync on public.bang_keo_in_orders;
create trigger bang_keo_in_orders_production_sync
  after insert or update of is_quote, da_giao or delete on public.bang_keo_in_orders
  for each row execute function public.bang_keo_in_orders_production_sync();

-- ---------------------------------------------------------------------------
-- 8. Delivery note RPCs
-- ---------------------------------------------------------------------------
-- Admin or the assigned workshop user; job at san_sang_giao. Returns the raw token ONCE
-- (43 chars base64url, 256 bits) with the print data; only sha256(token) hex is stored.
-- Older open notes of the job are revoked.
create or replace function public.create_delivery_note(p_job_id uuid)
returns table (
  note_id            uuid,
  token              text,
  job_id             uuid,
  order_id           text,
  order_name         text,
  quantity           integer,
  width_mm           numeric,
  length_m           numeric,
  thickness_mic      numeric,
  colors             text[],
  print_text         text,
  due_date           date,
  recipient_name     text,
  recipient_phone    text,
  recipient_address  text,
  created_at         timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_spec    record;
  v_job     public.production_jobs;
  v_lead    public.leads;
  v_order   record;
  v_token   text;
  v_note    public.delivery_notes;
begin
  if p_job_id is null then   -- workshop_jobs(NULL) would mean "all jobs"
    raise exception 'production job not found or not accessible' using errcode = 'P0002';
  end if;
  -- workshop_jobs checks the caller (admin, or the workshop user assigned to this job).
  select * into v_spec from public.workshop_jobs(p_job_id) limit 1;
  if v_spec.job_id is null then
    raise exception 'production job not found or not accessible' using errcode = 'P0002';
  end if;

  select * into v_job from public.production_jobs where id = p_job_id for update;
  if v_job.step <> 'san_sang_giao' then
    raise exception 'job must be ready for delivery (is %)', v_job.step using errcode = '22023';
  end if;

  if v_job.lead_id is not null then
    select * into v_lead from public.leads where id = v_job.lead_id;
  end if;
  select o.ten_khach_hang::text as name, o.sdt_khach_hang::text as phone,
         o.dia_chi_khach_hang::text as address
    into v_order
    from public.bang_keo_in_orders o where o.id = v_job.order_id;

  update public.delivery_notes set revoked_at = now()
   where delivery_notes.job_id = p_job_id and revoked_at is null and confirmed_at is null;

  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');

  insert into public.delivery_notes (
    job_id, token_hash, recipient_name, recipient_phone, recipient_address, created_by
  ) values (
    p_job_id,
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
    left(coalesce(nullif(concat_ws(' - ', nullif(v_lead.company, ''), v_lead.customer_name), ''),
                  nullif(btrim(v_order.name), '')), 255),
    left(coalesce(nullif(btrim(v_order.phone), ''), v_lead.phone), 50),
    left(nullif(btrim(v_order.address), ''), 500),
    auth.uid()
  )
  returning * into v_note;

  return query select
    v_note.id, v_token, v_job.id, v_job.order_id, v_spec.order_name, v_spec.quantity,
    v_spec.width_mm, v_spec.length_m, v_spec.thickness_mic, v_spec.colors, v_spec.print_text,
    v_spec.due_date, v_note.recipient_name, v_note.recipient_phone, v_note.recipient_address,
    v_note.created_at;
end;
$$;

-- service_role only (public QR page through server code). Input: sha256(token) hex.
-- status: 'open' | 'confirmed' | 'revoked'. No phone / address / price.
create or replace function public.delivery_note_by_token(p_token_hash text)
returns table (
  note_id         uuid,
  job_id          uuid,
  order_name      text,
  quantity        integer,
  recipient_name  text,
  status          text,
  job_step        public.production_step,
  created_at      timestamptz,
  confirmed_at    timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_service_call() then
    raise exception 'service role only' using errcode = '42501';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return;
  end if;
  return query
    select n.id, n.job_id,
           coalesce(nullif(btrim(o.ten_hang::text), ''),
                    'Băng keo in ' || coalesce(nullif(d.print_text, ''), l.code, j.order_id)),
           case when j.lead_id is not null then l.quantity
                else round(o.so_luong::numeric)::integer end,
           n.recipient_name,
           case when n.confirmed_at is not null then 'confirmed'
                when n.revoked_at is not null then 'revoked'
                else 'open' end,
           j.step, n.created_at, n.confirmed_at
      from public.delivery_notes n
      join public.production_jobs j on j.id = n.job_id
      left join public.leads l on l.id = j.lead_id
      left join lateral (
        select ds.print_text from public.designs ds
         where ds.lead_id = j.lead_id order by ds.created_at desc limit 1
      ) d on true
      left join public.bang_keo_in_orders o on o.id = j.order_id
     where n.token_hash = p_token_hash;
end;
$$;

-- service_role only. The photo must already be in bucket delivery-photos under "<note_id>/".
-- Locks the note (a second confirm fails with 55000) and moves the job to da_giao.
-- Errors: P0002 note not found; 55000 'delivery note already confirmed' / 'delivery note was
-- replaced' / 'job is not ready for delivery'; 22023 bad photo path.
create or replace function public.confirm_delivery(p_token_hash text, p_photo_path text)
returns table (note_id uuid, job_id uuid, confirmed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_job_id uuid;
  v_job    public.production_jobs;
  v_note   public.delivery_notes;
begin
  if not public.is_service_call() then
    raise exception 'service role only' using errcode = '42501';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'delivery note not found' using errcode = 'P0002';
  end if;

  -- Lock order job -> note, same as create_delivery_note.
  select n.job_id into v_job_id from public.delivery_notes n where n.token_hash = p_token_hash;
  if v_job_id is null then
    raise exception 'delivery note not found' using errcode = 'P0002';
  end if;
  select * into v_job from public.production_jobs where id = v_job_id for update;
  select * into v_note from public.delivery_notes where token_hash = p_token_hash for update;

  if v_note.confirmed_at is not null then
    raise exception 'delivery note already confirmed' using errcode = '55000';
  end if;
  if v_note.revoked_at is not null then
    raise exception 'delivery note was replaced' using errcode = '55000';
  end if;
  if v_job.step <> 'san_sang_giao' then
    raise exception 'job is not ready for delivery' using errcode = '55000';
  end if;
  if p_photo_path is null
     or p_photo_path !~ ('^' || v_note.id::text || '/[A-Za-z0-9_-]{1,80}\.jpg$')
     or not exists (select 1 from storage.objects
                     where bucket_id = 'delivery-photos' and name = p_photo_path) then
    raise exception 'photo is missing or has an invalid path' using errcode = '22023';
  end if;

  update public.delivery_notes
     set confirmed_at = now(), photo_path = p_photo_path
   where id = v_note.id
  returning * into v_note;

  perform public.production_apply_step(v_job.id, 'da_giao', 'Xác nhận giao qua phiếu giao hàng',
                                       'Người giao (QR)');

  return query select v_note.id, v_note.job_id, v_note.confirmed_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Admin order RPCs (printed tape only)
-- ---------------------------------------------------------------------------
-- Filter (all optional): q (id / product / customer / phone), step (production_step or 'none' =
-- no job), delivered (bool), settled (bool), date_from / date_to ('YYYY-MM-DD', order date),
-- limit (1-200, default 50), offset. Real orders only (no quotes). Newest first.
create or replace function public.admin_orders_list(p_filter jsonb default '{}'::jsonb)
returns table (
  id                  text,
  thoi_gian           timestamp,
  ngay_du_kien        date,
  ten_hang            text,
  ten_khach_hang      text,
  sdt_khach_hang      text,
  dia_chi_khach_hang  text,
  so_luong            numeric,
  thanh_tien_ban      numeric,
  vat                 numeric,
  tong_tien           numeric,
  tien_coc            numeric,
  cong_no_khach       numeric,
  loi_nhuan_rong      numeric,
  da_giao             boolean,
  da_tat_toan         boolean,
  job_id              uuid,
  step                public.production_step,
  workshop_user_id    uuid,
  workshop_user_name  text,
  lead_id             uuid,
  total_count         bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_f      jsonb := coalesce(p_filter, '{}'::jsonb);
  v_q      text;
  v_step   text;
  v_deliv  boolean;
  v_settl  boolean;
  v_from   date;
  v_to     date;
  v_limit  integer;
  v_offset integer;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if jsonb_typeof(v_f) <> 'object' then
    raise exception 'filter must be an object' using errcode = '22023';
  end if;
  v_q := public.order_payload_text(v_f, 'q', 100);
  v_step := public.order_payload_text(v_f, 'step', 20);
  if v_step is not null and v_step <> 'none'
     and not (v_step = any (enum_range(null::public.production_step)::text[])) then
    raise exception 'unknown step %', v_step using errcode = '22023';
  end if;
  if v_f ? 'delivered' and jsonb_typeof(v_f -> 'delivered') = 'boolean' then
    v_deliv := (v_f ->> 'delivered')::boolean;
  end if;
  if v_f ? 'settled' and jsonb_typeof(v_f -> 'settled') = 'boolean' then
    v_settl := (v_f ->> 'settled')::boolean;
  end if;
  begin
    v_from := nullif(public.order_payload_text(v_f, 'date_from', 10), '')::date;
    v_to := nullif(public.order_payload_text(v_f, 'date_to', 10), '')::date;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'invalid date filter' using errcode = '22023';
  end;
  v_limit := least(greatest(coalesce(public.order_payload_num(v_f, 'limit'), 50), 1), 200)::integer;
  v_offset := greatest(coalesce(public.order_payload_num(v_f, 'offset'), 0), 0)::integer;
  if v_q is not null then
    v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
    select o.id::text, o.thoi_gian::timestamp, o.ngay_du_kien::date, o.ten_hang::text,
           o.ten_khach_hang::text, o.sdt_khach_hang::text, o.dia_chi_khach_hang::text,
           o.so_luong::numeric, coalesce(o.thanh_tien_ban, 0)::numeric, coalesce(o.vat, 0)::numeric,
           (coalesce(o.thanh_tien_ban, 0) + coalesce(o.vat, 0)
             + case when o.loai_truc = 'moi'
                    then coalesce(o.truc_thanh_tien_ban, 0) + coalesce(o.truc_vat, 0) else 0 end)::numeric,
           coalesce(o.tien_coc, 0)::numeric, coalesce(o.cong_no_khach, 0)::numeric,
           (coalesce(o.loi_nhuan_rong, 0)
             + case when o.loai_truc = 'moi' then coalesce(o.truc_loi_nhuan_rong, 0) else 0 end)::numeric,
           coalesce(o.da_giao, false), coalesce(o.da_tat_toan, false),
           j.id, j.step, j.workshop_user_id, p.full_name, j.lead_id,
           count(*) over ()
      from public.bang_keo_in_orders o
      left join public.production_jobs j on j.order_id = o.id
      left join public.profiles p on p.id = j.workshop_user_id
     where not coalesce(o.is_quote, false)
       and (v_q is null or o.id::text ilike v_q or o.ten_hang::text ilike v_q
            or o.ten_khach_hang::text ilike v_q or o.sdt_khach_hang::text ilike v_q)
       and (v_step is null or (v_step = 'none' and j.id is null) or j.step::text = v_step)
       and (v_deliv is null or coalesce(o.da_giao, false) = v_deliv)
       and (v_settl is null or coalesce(o.da_tat_toan, false) = v_settl)
       and (v_from is null or o.thoi_gian::date >= v_from)
       and (v_to is null or o.thoi_gian::date <= v_to)
     order by o.thoi_gian desc nulls last, o.id desc
     limit v_limit offset v_offset;
end;
$$;

-- Full order row + job + step log + delivery notes, as JSON:
--   { order: {...every bang_keo_in_orders column...}, job: {...} | null,
--     steps: [{from_step, to_step, changed_by_name, note, created_at}],
--     delivery_notes: [{id, created_at, revoked_at, confirmed_at, recipient_*, photo_path}] }
create or replace function public.admin_order_get(p_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order jsonb;
  v_job   public.production_jobs;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select to_jsonb(o) into v_order from public.bang_keo_in_orders o where o.id = p_id;
  if v_order is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  select * into v_job from public.production_jobs where order_id = p_id;

  return jsonb_build_object(
    'order', v_order,
    'job', case when v_job.id is null then null else
      jsonb_build_object(
        'id', v_job.id, 'lead_id', v_job.lead_id, 'step', v_job.step,
        'workshop_user_id', v_job.workshop_user_id,
        'workshop_user_name', (select full_name from public.profiles where id = v_job.workshop_user_id),
        'due_date', v_job.due_date, 'production_note', v_job.production_note,
        'created_at', v_job.created_at, 'updated_at', v_job.updated_at) end,
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
               'from_step', s.from_step, 'to_step', s.to_step, 'changed_by_name', s.changed_by_name,
               'note', s.note, 'created_at', s.created_at) order by s.created_at, s.id)
        from public.production_step_log s where s.job_id = v_job.id), '[]'::jsonb),
    'delivery_notes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', n.id, 'created_at', n.created_at, 'revoked_at', n.revoked_at,
               'confirmed_at', n.confirmed_at, 'recipient_name', n.recipient_name,
               'recipient_phone', n.recipient_phone, 'recipient_address', n.recipient_address,
               'photo_path', n.photo_path) order by n.created_at desc)
        from public.delivery_notes n where n.job_id = v_job.id), '[]'::jsonb)
  );
end;
$$;

-- New printed-tape order from the web, same numbers as the desktop form
-- (electron/js/orderMath.js calculatePrintedTape + bangkeoin.js save):
--   giá gốc/cuộn  = (don_gia_von + phi_sl + phi_keo + phi_mau + phi_size + phi_cat) / 90 * quy_cach_m / cuon_cay
--   thanh_tien_goc = round(so_luong * giá gốc), thanh_tien_ban = round(so_luong * don_gia_ban)
--   loi_nhuan = ban - goc; tien_hoa_hong = round(max(loi_nhuan, 0) * hoa_hong% / 100)
--   loi_nhuan_rong = loi_nhuan - tien_hoa_hong - round(tien_ship)
--   vat = round(thanh_tien_ban * vat_percent / 100)   (percentages clamped to 0..100)
--   axis (loai_truc 'moi'): same line math without shipping, truc_vat on truc_thanh_tien_ban
--   cong_no_khach = max(ban + vat + truc_ban + truc_vat - round(tien_coc), 0)
--   cong_no_ncc   = max(goc + truc_goc, 0)
-- Payload keys (JSON numbers / strings): see v_allowed. Required: ten_hang, ten_khach_hang,
-- ngay_du_kien, so_luong > 0, don_gia_ban > 0, quy_cach_m > 0, cuon_cay > 0.
-- The insert fires the order trigger (job at cho_san_xuat); workshop_user_id / production_note
-- are then set on that job.
create or replace function public.admin_order_create(p_payload jsonb)
returns table (order_id text, job_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_allowed text[] := array[
    'ten_hang', 'ten_khach_hang', 'sdt_khach_hang', 'dia_chi_khach_hang', 'ngay_du_kien',
    'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 'cuon_cay', 'so_luong',
    'phi_sl', 'mau_keo', 'phi_keo', 'mau_sac', 'phi_mau', 'phi_size', 'phi_cat',
    'don_gia_von', 'don_gia_ban', 'tien_coc', 'vat_percent', 'ctv', 'hoa_hong', 'tien_ship',
    'loi_giay', 'thung_bao', 'loai_truc', 'ten_truc', 'truc_chu_vi', 'truc_so_luong',
    'truc_gia_goc', 'truc_gia_ban', 'truc_vat_percent', 'truc_ctv', 'truc_hoa_hong',
    'workshop_user_id', 'production_note'];
  p        jsonb := p_payload;
  v_extra  text;
  v_id     text;
  v_due    date;
  v_user   uuid;
  v_job    public.production_jobs;
  v_note   text;
  v_now_vn timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
  -- inputs
  v_name   text;  v_cust text;  v_phone text;  v_addr text;
  v_qty    numeric; v_len numeric; v_rolls numeric; v_sale_p numeric;
  v_fees   numeric; v_comm_p numeric; v_vat_p numeric; v_ship numeric; v_dep numeric;
  v_axis   boolean;
  v_aqty   numeric; v_acost_p numeric; v_asale_p numeric; v_acomm_p numeric; v_avat_p numeric;
  -- results
  v_cost_p numeric; v_cost numeric; v_sale numeric; v_profit numeric; v_comm numeric;
  v_net    numeric; v_vat numeric;
  v_acost  numeric := 0; v_asale numeric := 0; v_aprofit numeric := 0; v_acomm numeric := 0;
  v_anet   numeric := 0; v_avat numeric := 0;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'payload must be an object' using errcode = '22023';
  end if;
  select k into v_extra from jsonb_object_keys(p) k where not (k = any (v_allowed)) limit 1;
  if v_extra is not null then
    raise exception 'unknown field %', left(v_extra, 64) using errcode = '22023';
  end if;

  v_name  := public.order_payload_text(p, 'ten_hang', 255);
  v_cust  := public.order_payload_text(p, 'ten_khach_hang', 255);
  v_phone := public.order_payload_text(p, 'sdt_khach_hang', 30);
  v_addr  := public.order_payload_text(p, 'dia_chi_khach_hang', 500);
  begin
    v_due := public.order_payload_text(p, 'ngay_du_kien', 10)::date;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'invalid ngay_du_kien' using errcode = '22023';
  end;
  v_qty    := greatest(coalesce(public.order_payload_num(p, 'so_luong'), 0), 0);
  v_len    := greatest(coalesce(public.order_payload_num(p, 'quy_cach_m'), 0), 0);
  v_rolls  := greatest(coalesce(public.order_payload_num(p, 'cuon_cay'), 0), 0);
  v_sale_p := greatest(coalesce(public.order_payload_num(p, 'don_gia_ban'), 0), 0);
  if v_name is null or v_cust is null or v_qty <= 0 or v_sale_p <= 0 then
    raise exception 'ten_hang, ten_khach_hang, so_luong and don_gia_ban are required' using errcode = '22023';
  end if;
  if v_due is null then
    raise exception 'ngay_du_kien is required' using errcode = '22023';
  end if;
  if v_len <= 0 or v_rolls <= 0 then
    raise exception 'quy_cach_m and cuon_cay must be greater than 0' using errcode = '22023';
  end if;

  v_fees := greatest(coalesce(public.order_payload_num(p, 'don_gia_von'), 0), 0)
          + greatest(coalesce(public.order_payload_num(p, 'phi_sl'), 0), 0)
          + greatest(coalesce(public.order_payload_num(p, 'phi_keo'), 0), 0)
          + greatest(coalesce(public.order_payload_num(p, 'phi_mau'), 0), 0)
          + greatest(coalesce(public.order_payload_num(p, 'phi_size'), 0), 0)
          + greatest(coalesce(public.order_payload_num(p, 'phi_cat'), 0), 0);
  v_comm_p := least(greatest(coalesce(public.order_payload_num(p, 'hoa_hong'), 0), 0), 100);
  v_vat_p  := least(greatest(coalesce(public.order_payload_num(p, 'vat_percent'), 0), 0), 100);
  v_ship   := round(greatest(coalesce(public.order_payload_num(p, 'tien_ship'), 0), 0));
  v_dep    := round(greatest(coalesce(public.order_payload_num(p, 'tien_coc'), 0), 0));

  -- product line (orderMath.calculateLine)
  v_cost_p := v_fees / 90 * v_len / v_rolls;
  v_cost   := round(v_qty * v_cost_p);
  v_sale   := round(v_qty * v_sale_p);
  v_profit := v_sale - v_cost;
  v_comm   := round(greatest(v_profit, 0) * v_comm_p / 100);
  v_net    := v_profit - v_comm - v_ship;
  v_vat    := round(v_sale * v_vat_p / 100);

  -- new axis (loai_truc = 'moi')
  v_axis := coalesce(public.order_payload_text(p, 'loai_truc', 10), 'cu') = 'moi';
  if coalesce(public.order_payload_text(p, 'loai_truc', 10), 'cu') not in ('cu', 'moi') then
    raise exception 'loai_truc must be cu or moi' using errcode = '22023';
  end if;
  if v_axis then
    v_aqty    := greatest(coalesce(public.order_payload_num(p, 'truc_so_luong'), 0), 0);
    v_acost_p := greatest(coalesce(public.order_payload_num(p, 'truc_gia_goc'), 0), 0);
    v_asale_p := greatest(coalesce(public.order_payload_num(p, 'truc_gia_ban'), 0), 0);
    v_acomm_p := least(greatest(coalesce(public.order_payload_num(p, 'truc_hoa_hong'), 0), 0), 100);
    v_avat_p  := least(greatest(coalesce(public.order_payload_num(p, 'truc_vat_percent'), 0), 0), 100);
    if public.order_payload_text(p, 'ten_truc', 255) is null
       or v_aqty <= 0 or v_acost_p <= 0 or v_asale_p <= 0 then
      raise exception 'new axis needs ten_truc, truc_so_luong, truc_gia_goc and truc_gia_ban'
        using errcode = '22023';
    end if;
    v_acost   := round(v_aqty * v_acost_p);
    v_asale   := round(v_aqty * v_asale_p);
    v_aprofit := v_asale - v_acost;
    v_acomm   := round(greatest(v_aprofit, 0) * v_acomm_p / 100);
    v_anet    := v_aprofit - v_acomm;
    v_avat    := round(v_asale * v_avat_p / 100);
  end if;

  if p ? 'workshop_user_id' and jsonb_typeof(p -> 'workshop_user_id') <> 'null' then
    begin
      v_user := (p ->> 'workshop_user_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'invalid workshop_user_id' using errcode = '22023';
    end;
    if not exists (select 1 from public.profiles where id = v_user and is_active and role = 'workshop') then
      raise exception 'assignee must be an active workshop user' using errcode = '22023';
    end if;
  end if;
  v_note := public.order_payload_text(p, 'production_note', 2000);

  v_id := public.next_bang_keo_in_order_id();

  insert into public.bang_keo_in_orders (
    id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang,
    quy_cach_mm, quy_cach_m, quy_cach_mic, cuon_cay, so_luong,
    phi_sl, mau_keo, phi_keo, mau_sac, phi_mau, phi_size, phi_cat,
    don_gia_von, don_gia_goc, thanh_tien_goc, don_gia_ban, thanh_tien_ban,
    tien_coc, cong_no_khach, cong_no_ncc, ctv, hoa_hong, tien_hoa_hong, loi_giay, thung_bao,
    loi_nhuan, tien_ship, loi_nhuan_rong, vat, vat_percent,
    da_giao, da_tat_toan, da_gui_email, is_quote,
    loai_truc, ten_truc, truc_chu_vi, truc_so_luong, truc_gia_goc, truc_gia_ban,
    truc_thanh_tien_goc, truc_thanh_tien_ban, truc_vat, truc_vat_percent, truc_ctv,
    truc_hoa_hong, truc_tien_hoa_hong, truc_loi_nhuan, truc_loi_nhuan_rong
  ) values (
    v_id, v_now_vn, v_due, v_name, v_cust, v_phone, v_addr,
    public.order_payload_num(p, 'quy_cach_mm'), v_len, public.order_payload_num(p, 'quy_cach_mic'),
    v_rolls, v_qty,
    greatest(coalesce(public.order_payload_num(p, 'phi_sl'), 0), 0),
    public.order_payload_text(p, 'mau_keo', 100),
    greatest(coalesce(public.order_payload_num(p, 'phi_keo'), 0), 0),
    public.order_payload_text(p, 'mau_sac', 100),
    greatest(coalesce(public.order_payload_num(p, 'phi_mau'), 0), 0),
    greatest(coalesce(public.order_payload_num(p, 'phi_size'), 0), 0),
    greatest(coalesce(public.order_payload_num(p, 'phi_cat'), 0), 0),
    greatest(coalesce(public.order_payload_num(p, 'don_gia_von'), 0), 0),
    v_cost_p, v_cost, v_sale_p, v_sale,
    v_dep, greatest(v_sale + v_vat + v_asale + v_avat - v_dep, 0), greatest(v_cost + v_acost, 0),
    public.order_payload_text(p, 'ctv', 255), v_comm_p, v_comm,
    public.order_payload_text(p, 'loi_giay', 255), public.order_payload_text(p, 'thung_bao', 255),
    v_profit, v_ship, v_net, v_vat, v_vat_p,
    false, false, false, false,
    case when v_axis then 'moi' else 'cu' end,
    case when v_axis then public.order_payload_text(p, 'ten_truc', 255) end,
    case when v_axis then public.order_payload_num(p, 'truc_chu_vi') end,
    case when v_axis then v_aqty else 0 end,
    case when v_axis then v_acost_p else 0 end,
    case when v_axis then v_asale_p else 0 end,
    v_acost, v_asale, v_avat,
    case when v_axis then v_avat_p else 0 end,
    case when v_axis then public.order_payload_text(p, 'truc_ctv', 255) end,
    case when v_axis then v_acomm_p else 0 end,
    v_acomm, v_aprofit, v_anet
  );

  select * into v_job from public.production_jobs where production_jobs.order_id = v_id for update;
  if v_job.id is not null and (v_user is not null or v_note is not null) then
    update public.production_jobs
       set workshop_user_id = coalesce(v_user, workshop_user_id),
           assigned_at      = case when v_user is not null then now() else assigned_at end,
           production_note  = coalesce(v_note, production_note)
     where id = v_job.id
    returning * into v_job;
  end if;

  return query select v_id, v_job.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Storage: delivery photos (private; written only by server code with service_role)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('delivery-photos', 'delivery-photos', false, 10485760, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists delivery_photos_admin_select on storage.objects;
create policy delivery_photos_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'delivery-photos' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 11. RLS + grants
-- ---------------------------------------------------------------------------
alter table public.delivery_notes enable row level security;
revoke all on table public.delivery_notes from anon, authenticated;
grant select on table public.delivery_notes to authenticated;
grant all on table public.delivery_notes to service_role;

drop policy if exists delivery_notes_admin_select on public.delivery_notes;
create policy delivery_notes_admin_select on public.delivery_notes
  for select to authenticated
  using ((select public.is_admin()));

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'electron_app') then
    execute 'revoke all on table public.delivery_notes from electron_app';
  end if;
end;
$$;

-- Internal helpers and the trigger function: no API role, no electron_app.
revoke all on function public.production_step_next(public.production_step) from public, anon, authenticated;
revoke all on function public.production_step_label(public.production_step) from public, anon, authenticated;
revoke all on function public.production_apply_step(uuid, public.production_step, text, text) from public, anon, authenticated;
revoke all on function public.order_payload_num(jsonb, text) from public, anon, authenticated;
revoke all on function public.order_payload_text(jsonb, text, integer) from public, anon, authenticated;
revoke all on function public.bang_keo_in_orders_production_sync() from public, anon, authenticated, service_role;

revoke all on function public.workshop_jobs(uuid) from public, anon;
revoke all on function public.advance_production_step(uuid, public.production_step, text) from public, anon;
revoke all on function public.assign_workshop_job(uuid, uuid) from public, anon;
revoke all on function public.convert_lead_to_production(uuid, date, text, uuid) from public, anon;
revoke all on function public.create_delivery_note(uuid) from public, anon;
revoke all on function public.admin_orders_list(jsonb) from public, anon;
revoke all on function public.admin_order_get(text) from public, anon;
revoke all on function public.admin_order_create(jsonb) from public, anon;
grant execute on function public.workshop_jobs(uuid) to authenticated, service_role;
grant execute on function public.advance_production_step(uuid, public.production_step, text) to authenticated, service_role;
grant execute on function public.assign_workshop_job(uuid, uuid) to authenticated, service_role;
grant execute on function public.convert_lead_to_production(uuid, date, text, uuid) to authenticated, service_role;
grant execute on function public.create_delivery_note(uuid) to authenticated, service_role;
grant execute on function public.admin_orders_list(jsonb) to authenticated;
grant execute on function public.admin_order_get(text) to authenticated;
grant execute on function public.admin_order_create(jsonb) to authenticated;

-- Public QR page: server code only.
revoke all on function public.delivery_note_by_token(text) from public, anon, authenticated;
revoke all on function public.confirm_delivery(text, text) from public, anon, authenticated;
grant execute on function public.delivery_note_by_token(text) to service_role;
grant execute on function public.confirm_delivery(text, text) to service_role;
