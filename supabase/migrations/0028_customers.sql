-- 0028_customers
-- Customers (docs/plans/2026-11-07-orders-web-parity.md, DB-2). One customer, many orders.
-- Tests: supabase/tests/rls/18_customers.test.sql
--
-- 1. public.normalize_vn_phone(text): digits only, +84 / 0084 / 84 -> 0, 9 digits -> 0 + digits;
--    a valid result is 0 + 9-10 digits, anything else (several numbers, too short) is null.
-- 2. public.customers(id, name, phone, phone_norm (generated), address, company, note, created_at,
--    updated_at). RLS on, no API grants: admins use the RPCs, the app the electron_customer_* functions.
-- 3. customer_id uuid (nullable, FK on delete restrict) on the 4 order tables and leads.
-- 4. orders_resolve_customer(): BEFORE INSERT / UPDATE OF <phone> trigger (zz_resolve_customer, so
--    it runs after the lead guards). Fills an empty customer_id when exactly one customer has the
--    same normalized phone. Never raises (a failure is a WARNING, the write goes through).
-- 5. Lead guards: customer_id is admin-only; the workshop hand-off may fill an empty one.
-- 6. Order RPCs: order_fields / order_clean_payload accept customer_id (uuid of an existing customer,
--    or null) on admin_order_create / admin_order_update; admin_order_update allows it on multi-size
--    quote orders too. convert_lead_to_production links the lead's customer (or finds / creates one).
-- 7. Admin RPCs: admin_customers_list, admin_customer_get, admin_customer_create,
--    admin_customer_update, admin_customer_merge, admin_customer_review_list,
--    admin_customer_review_resolve.
-- 8. Desktop app: electron_customer_search / electron_customer_create (SECURITY DEFINER, execute for
--    electron_app only; no table grant).
-- 9. Backfill of old orders (owner only; run by supabase/scripts/customers_backfill.sql):
--    customer_backfill_dry_run() fills customer_match_candidates, customer_backfill_apply() links the
--    'auto' rows and logs every link in customer_backfill_log. 'review' rows wait for an admin.

-- ---------------------------------------------------------------------------
-- 1. Phone normalization
-- ---------------------------------------------------------------------------
create or replace function public.normalize_vn_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if v like '0084%' then
    v := '0' || substr(v, 5);
  elsif v like '84%' and length(v) in (11, 12) then
    v := '0' || substr(v, 3);
  elsif length(v) = 9 and v !~ '^0' then
    v := '0' || v;
  end if;
  return case when v ~ '^0[1-9][0-9]{8,9}$' then v end;
end;
$$;

create or replace function public.normalize_customer_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(lower(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g')), '')
$$;

-- ---------------------------------------------------------------------------
-- 2. Table
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 255),
  phone      text check (phone is null or char_length(phone) <= 30),
  phone_norm text generated always as (public.normalize_vn_phone(phone)) stored,
  address    text check (address is null or char_length(address) <= 500),
  company    text check (company is null or char_length(company) <= 255),
  note       text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Not unique: a shared office phone may belong to several customers (then nothing links by phone).
create index if not exists customers_phone_norm_idx on public.customers (phone_norm) where phone_norm is not null;
create index if not exists customers_name_norm_idx on public.customers (public.normalize_customer_name(name));

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
revoke all on table public.customers from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. customer_id on the order tables and leads
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['bang_keo_in_orders', 'bang_keo_orders', 'truc_in_orders', 'thank_you_orders', 'leads'] loop
    execute format('alter table public.%I add column if not exists customer_id uuid', t);
    if not exists (select 1 from pg_constraint
                    where conrelid = ('public.' || t)::regclass and conname = t || '_customer_id_fkey') then
      execute format('alter table public.%I add constraint %I foreign key (customer_id) references public.customers (id) on delete restrict',
                     t, t || '_customer_id_fkey');
    end if;
    execute format('create index if not exists %I on public.%I (customer_id) where customer_id is not null',
                   t || '_customer_id_idx', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Link by phone (trigger)
-- ---------------------------------------------------------------------------
-- TG_ARGV[0] = the phone column. Runs for every writer (web RPCs, electron_app, owner).
create or replace function public.orders_resolve_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_norm text;
  v_id   uuid;
begin
  if new.customer_id is not null then
    return new;
  end if;
  begin
    v_norm := public.normalize_vn_phone(to_jsonb(new) ->> tg_argv[0]);
    if v_norm is not null then
      select case when count(*) = 1 then min(id::text)::uuid end into v_id
        from public.customers where phone_norm = v_norm;
      if v_id is not null then
        new.customer_id := v_id;
      end if;
    end if;
  exception when others then
    raise warning 'orders_resolve_customer(%): % (%)', tg_table_name, sqlerrm, sqlstate;
  end;
  return new;
end;
$$;

do $$
declare
  r record;
begin
  for r in select * from (values
      ('bang_keo_in_orders', 'sdt_khach_hang'), ('bang_keo_orders', 'sdt_khach_hang'),
      ('truc_in_orders', 'sdt_khach_hang'), ('thank_you_orders', 'sdt_khach_hang'), ('leads', 'phone')
    ) as v(tbl, col)
  loop
    execute format('drop trigger if exists zz_resolve_customer on public.%I', r.tbl);
    execute format('create trigger zz_resolve_customer before insert or update of %I on public.%I
                    for each row execute function public.orders_resolve_customer(%L)', r.col, r.tbl, r.col);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Lead guards (0021 functions + customer_id)
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

  -- Workshop hand-off (convert_lead_to_production): production link + status only, and it may
  -- fill an empty customer link.
  if public.is_job_handoff(old, new)
     and (old.customer_id is null or new.customer_id is not distinct from old.customer_id)
     and (to_jsonb(new) - 'status' - 'updated_at' - 'production_order_id' - 'customer_id')
         = (to_jsonb(old) - 'status' - 'updated_at' - 'production_order_id' - 'customer_id') then
    return new;
  end if;

  if new.assigned_to is distinct from old.assigned_to
     or new.assigned_at is distinct from old.assigned_at
     or new.production_order_id is distinct from old.production_order_id
     or new.source_ip_hash is distinct from old.source_ip_hash
     or new.user_agent is distinct from old.user_agent
     or new.customer_id is distinct from old.customer_id then
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

-- Naming customer_id in the SET list is admin-only too (leads_guard_admin_columns, 0021 body).
drop trigger if exists leads_guard_admin_columns on public.leads;
create trigger leads_guard_admin_columns
  before update of id, code, created_at, assigned_to, assigned_at,
                   production_order_id, source_ip_hash, user_agent, customer_id
  on public.leads
  for each row execute function public.leads_guard_admin_columns();

-- ---------------------------------------------------------------------------
-- 6. Order RPCs accept / resolve customer_id
-- ---------------------------------------------------------------------------
-- Single customer with this phone, else a new customer; null when several customers share the
-- phone (the caller decides). Internal.
create or replace function public.customer_find_or_create(p_name text, p_phone text,
                                                          p_address text default null,
                                                          p_company text default null)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_norm  text := public.normalize_vn_phone(p_phone);
  v_name  text := left(nullif(btrim(coalesce(p_name, '')), ''), 255);
  v_phone text := left(nullif(btrim(coalesce(p_phone, '')), ''), 30);
  v_n     integer;
  v_id    uuid;
begin
  if v_norm is not null then
    select count(*), min(id::text)::uuid into v_n, v_id from public.customers where phone_norm = v_norm;
    if v_n = 1 then
      return v_id;
    elsif v_n > 1 then
      return null;
    end if;
  end if;
  if v_name is null then
    raise exception 'customer name is required' using errcode = '22023';
  end if;
  insert into public.customers (name, phone, address, company)
  values (v_name, v_phone, left(nullif(btrim(coalesce(p_address, '')), ''), 500),
          left(nullif(btrim(coalesce(p_company, '')), ''), 255))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.order_fields(p_type text)
returns table (name text, kind text, max_len integer)
language sql
immutable
set search_path = ''
as $$
  select v.name, v.kind, v.max_len from (values
    ('*', 'ten_hang', 'text', 255), ('*', 'ten_khach_hang', 'text', 255),
    ('*', 'sdt_khach_hang', 'text', 30), ('*', 'dia_chi_khach_hang', 'text', 500),
    ('*', 'ngay_du_kien', 'date', 10), ('*', 'so_luong', 'num', null),
    ('*', 'don_gia_ban', 'num', null), ('*', 'vat_percent', 'num', null),
    ('*', 'ctv', 'text', 255), ('*', 'hoa_hong', 'num', null), ('*', 'tien_ship', 'num', null),
    ('*', 'customer_id', 'uuid', null),
    ('bang_keo_in', 'quy_cach_mm', 'num', null), ('bang_keo_in', 'quy_cach_m', 'num', null),
    ('bang_keo_in', 'quy_cach_mic', 'num', null), ('bang_keo_in', 'cuon_cay', 'num', null),
    ('bang_keo_in', 'phi_sl', 'num', null), ('bang_keo_in', 'mau_keo', 'text', 100),
    ('bang_keo_in', 'phi_keo', 'num', null), ('bang_keo_in', 'mau_sac', 'text', 100),
    ('bang_keo_in', 'phi_mau', 'num', null), ('bang_keo_in', 'phi_size', 'num', null),
    ('bang_keo_in', 'phi_cat', 'num', null), ('bang_keo_in', 'don_gia_von', 'num', null),
    ('bang_keo_in', 'tien_coc', 'num', null), ('bang_keo_in', 'loi_giay', 'text', 255),
    ('bang_keo_in', 'thung_bao', 'text', 255), ('bang_keo_in', 'loai_truc', 'text', 10),
    ('bang_keo_in', 'ten_truc', 'text', 255), ('bang_keo_in', 'truc_chu_vi', 'num', null),
    ('bang_keo_in', 'truc_so_luong', 'num', null), ('bang_keo_in', 'truc_gia_goc', 'num', null),
    ('bang_keo_in', 'truc_gia_ban', 'num', null), ('bang_keo_in', 'truc_vat_percent', 'num', null),
    ('bang_keo_in', 'truc_ctv', 'text', 255), ('bang_keo_in', 'truc_hoa_hong', 'num', null),
    ('bang_keo', 'quy_cach', 'text', 255), ('bang_keo', 'mau_sac', 'text', 100),
    ('bang_keo', 'don_gia_goc', 'num', null),
    ('truc_in', 'quy_cach', 'text', 255), ('truc_in', 'mau_sac', 'text', 100),
    ('truc_in', 'mau_keo', 'text', 100), ('truc_in', 'don_gia_goc', 'num', null),
    ('thank_you', 'kich_thuoc', 'text', 255), ('thank_you', 'mau_sac', 'text', 100),
    ('thank_you', 'don_gia_von', 'num', null), ('thank_you', 'tien_coc', 'num', null),
    ('thank_you', 'ghi_chu', 'text', 2000)
  ) as v(t, name, kind, max_len)
  where v.t = '*' or v.t = p_type
$$;

-- Validated, normalized payload: only order_fields keys (+ p_extra, copied as is), JSON numbers for
-- numbers, JSON strings for text (trimmed, '' -> null, max length), 'YYYY-MM-DD' for dates.
create or replace function public.order_clean_payload(p_type text, p_payload jsonb, p_extra text[] default '{}')
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  f       record;
  v_out   jsonb := '{}'::jsonb;
  v_extra text;
  v_date  date;
  v_uuid  uuid;
begin
  perform public.order_type_meta(p_type);
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload must be an object' using errcode = '22023';
  end if;
  select k into v_extra from jsonb_object_keys(p_payload) k
   where not (k = any (coalesce(p_extra, '{}')))
     and not exists (select 1 from public.order_fields(p_type) x where x.name = k)
   limit 1;
  if v_extra is not null then
    raise exception 'unknown field %', left(v_extra, 64) using errcode = '22023';
  end if;

  for f in select * from public.order_fields(p_type) x where p_payload ? x.name loop
    if f.kind = 'num' then
      v_out := v_out || jsonb_build_object(f.name, public.order_payload_num(p_payload, f.name));
    elsif f.kind = 'uuid' then
      -- customer_id (the only uuid field): an existing customer, or null (on insert the phone trigger may still link one).
      if jsonb_typeof(p_payload -> f.name) = 'null' then
        v_uuid := null;
      elsif jsonb_typeof(p_payload -> f.name) <> 'string' then
        raise exception 'invalid %', f.name using errcode = '22023';
      else
        begin
          v_uuid := (p_payload ->> f.name)::uuid;
        exception when invalid_text_representation then
          raise exception 'invalid %', f.name using errcode = '22023';
        end;
        if not exists (select 1 from public.customers c where c.id = v_uuid) then
          raise exception 'customer not found' using errcode = '22023';
        end if;
      end if;
      v_out := v_out || jsonb_build_object(f.name, v_uuid);
    elsif f.kind = 'date' then
      begin
        v_date := public.order_payload_text(p_payload, f.name, f.max_len)::date;
      exception when invalid_datetime_format or datetime_field_overflow then
        raise exception 'invalid %', f.name using errcode = '22023';
      end;
      v_out := v_out || jsonb_build_object(f.name, v_date);
    else
      v_out := v_out || jsonb_build_object(f.name, public.order_payload_text(p_payload, f.name, f.max_len));
    end if;
  end loop;

  return v_out || coalesce((select jsonb_object_agg(k, p_payload -> k)
                              from unnest(coalesce(p_extra, '{}')) k where p_payload ? k), '{}'::jsonb);
end;
$$;

-- 0026 body; customer_id may also change on an order with multi-size quote items.
create or replace function public.admin_order_update(p_type text, p_id text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tbl   text;
  v_clean jsonb;
  v_old   jsonb;
  v_merge jsonb;
  v_set   jsonb;
  v_bad   text;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  v_tbl := (select tbl from public.order_type_meta(p_type));
  v_clean := public.order_clean_payload(p_type, p_payload);
  if v_clean = '{}'::jsonb then
    raise exception 'nothing to update' using errcode = '22023';
  end if;

  execute format('select to_jsonb(o) from public.%I o where o.id = $1 for update', v_tbl)
    into v_old using p_id;
  if v_old is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  v_merge := v_old || v_clean;
  -- Old app rows store a VAT amount with no percent: keep it (orderMath.vatPercentFromAmount, as the
  -- app's edit dialog does), else the recompute below would drop VAT and debt.
  if not v_clean ? 'vat_percent' and coalesce((v_old ->> 'vat_percent')::numeric, 0) <= 0
     and coalesce((v_old ->> 'vat')::numeric, 0) > 0 and coalesce((v_old ->> 'thanh_tien_ban')::numeric, 0) > 0 then
    v_merge := v_merge || jsonb_build_object('vat_percent',
      round((v_old ->> 'vat')::numeric / (v_old ->> 'thanh_tien_ban')::numeric * 100, 2));
  end if;
  if not v_clean ? 'truc_vat_percent' and coalesce((v_old ->> 'truc_vat_percent')::numeric, 0) <= 0
     and coalesce((v_old ->> 'truc_vat')::numeric, 0) > 0 and coalesce((v_old ->> 'truc_thanh_tien_ban')::numeric, 0) > 0 then
    v_merge := v_merge || jsonb_build_object('truc_vat_percent',
      round((v_old ->> 'truc_vat')::numeric / (v_old ->> 'truc_thanh_tien_ban')::numeric * 100, 2));
  end if;
  if nullif(btrim(v_merge ->> 'ten_hang'), '') is null or nullif(btrim(v_merge ->> 'ten_khach_hang'), '') is null
     or v_merge ->> 'ngay_du_kien' is null then
    raise exception 'ten_hang, ten_khach_hang and ngay_du_kien are required' using errcode = '22023';
  end if;

  if (case when jsonb_typeof(v_old -> 'quote_items') = 'array' then jsonb_array_length(v_old -> 'quote_items') > 0 else false end) then
    select k into v_bad from jsonb_object_keys(v_clean) k
     where k not in ('ten_hang', 'ten_khach_hang', 'sdt_khach_hang', 'dia_chi_khach_hang', 'ngay_du_kien', 'customer_id')
     limit 1;
    if v_bad is not null then
      raise exception 'order has multi-size quote items: % cannot change', v_bad using errcode = '22023';
    end if;
    v_set := v_clean;
  else
    v_set := v_clean || public.order_compute(p_type, v_merge);
  end if;

  perform public.order_write(p_type, v_set, p_id);
  execute format('select to_jsonb(o) from public.%I o where o.id = $1', v_tbl) into v_old using p_id;
  return v_old;
end;
$$;

-- 0024 body + customer (v_cust): set on the new order and on the lead when the lead had none.
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
  v_cust   uuid;
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

  -- Customer (0028): the lead's own link, else the single customer with this phone, else a new
  -- customer from the lead (none when several customers share the phone).
  v_cust := coalesce(v_lead.customer_id,
                     public.customer_find_or_create(v_lead.customer_name, v_lead.phone, null, v_lead.company));

  v_id := public.next_bang_keo_in_order_id();

  insert into public.bang_keo_in_orders (
    id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang,
    quy_cach_mm, quy_cach_m, quy_cach_mic, so_luong, mau_sac,
    don_gia_ban, thanh_tien_ban, vat, vat_percent, tien_coc, cong_no_khach,
    da_giao, da_tat_toan, is_quote, customer_id
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
    false,
    v_cust
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
     set production_order_id = v_id, status = 'production', customer_id = coalesce(customer_id, v_cust)
   where id = p_lead_id;
  perform set_config('app.status_note', '', true);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Admin customer RPCs
-- ---------------------------------------------------------------------------
-- Every linked order of the 4 tables (quotes included, is_quote tells). tong_tien includes the new
-- axis of a printed-tape order, like admin_orders_list. Internal.
create or replace function public.customer_order_rows(p_customer_id uuid default null)
returns table (
  customer_id   uuid,
  type          text,
  id            text,
  thoi_gian     timestamp,
  ngay_du_kien  date,
  ten_hang      text,
  so_luong      numeric,
  tong_tien     numeric,
  cong_no_khach numeric,
  da_giao       boolean,
  da_tat_toan   boolean,
  is_quote      boolean
)
language sql
stable
set search_path = ''
as $$
  select b.customer_id, 'bang_keo_in', b.id::text, b.thoi_gian::timestamp, b.ngay_du_kien::date, b.ten_hang::text,
         b.so_luong::numeric,
         (coalesce(b.thanh_tien_ban, 0) + coalesce(b.vat, 0)
           + case when b.loai_truc = 'moi' then coalesce(b.truc_thanh_tien_ban, 0) + coalesce(b.truc_vat, 0) else 0 end)::numeric,
         coalesce(b.cong_no_khach, 0)::numeric, coalesce(b.da_giao, false), coalesce(b.da_tat_toan, false),
         coalesce(b.is_quote, false)
    from public.bang_keo_in_orders b
   where b.customer_id is not null and (p_customer_id is null or b.customer_id = p_customer_id)
  union all
  select b.customer_id, 'bang_keo', b.id::text, b.thoi_gian::timestamp, b.ngay_du_kien::date, b.ten_hang::text,
         b.so_luong::numeric, (coalesce(b.thanh_tien_ban, 0) + coalesce(b.vat, 0))::numeric,
         coalesce(b.cong_no_khach, 0)::numeric, coalesce(b.da_giao, false), coalesce(b.da_tat_toan, false),
         coalesce(b.is_quote, false)
    from public.bang_keo_orders b
   where b.customer_id is not null and (p_customer_id is null or b.customer_id = p_customer_id)
  union all
  select t.customer_id, 'truc_in', t.id::text, t.thoi_gian::timestamp, t.ngay_du_kien::date, t.ten_hang::text,
         t.so_luong::numeric, (coalesce(t.thanh_tien_ban, 0) + coalesce(t.vat, 0))::numeric,
         coalesce(t.cong_no_khach, 0)::numeric, coalesce(t.da_giao, false), coalesce(t.da_tat_toan, false),
         coalesce(t.is_quote, false)
    from public.truc_in_orders t
   where t.customer_id is not null and (p_customer_id is null or t.customer_id = p_customer_id)
  union all
  select y.customer_id, 'thank_you', y.id, y.thoi_gian, y.ngay_du_kien, y.ten_hang,
         y.so_luong, y.thanh_tien_ban + y.vat, y.cong_no_khach, y.da_giao, y.da_tat_toan, y.is_quote
    from public.thank_you_orders y
   where y.customer_id is not null and (p_customer_id is null or y.customer_id = p_customer_id)
$$;

-- Validated customer fields: name (required on create), phone, address, company, note.
create or replace function public.customer_clean_payload(p_payload jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_extra text;
  v_out   jsonb := '{}'::jsonb;
  f       record;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload must be an object' using errcode = '22023';
  end if;
  select k into v_extra from jsonb_object_keys(p_payload) k
   where k not in ('name', 'phone', 'address', 'company', 'note') limit 1;
  if v_extra is not null then
    raise exception 'unknown field %', left(v_extra, 64) using errcode = '22023';
  end if;
  for f in select * from (values ('name', 255), ('phone', 30), ('address', 500), ('company', 255), ('note', 2000))
                    as v(name, max_len)
            where p_payload ? v.name loop
    v_out := v_out || jsonb_build_object(f.name, public.order_payload_text(p_payload, f.name, f.max_len));
  end loop;
  if v_out ? 'name' and v_out ->> 'name' is null then
    raise exception 'name is required' using errcode = '22023';
  end if;
  return v_out;
end;
$$;

-- p_q matches name / company / phone (also the normalized phone). Order: latest order first, then
-- name. order_count / tong_tien / cong_no_khach count real orders (not quotes); cong_no_khach is
-- already 0 on settled orders. total_count and sum_cong_no_khach cover the whole filtered set.
create or replace function public.admin_customers_list(p_q text default null, p_limit integer default 50,
                                                       p_offset integer default 0)
returns table (
  id                uuid,
  name              text,
  phone             text,
  phone_norm        text,
  address           text,
  company           text,
  note              text,
  created_at        timestamptz,
  updated_at        timestamptz,
  order_count       bigint,
  quote_count       bigint,
  tong_tien         numeric,
  cong_no_khach     numeric,
  last_order_at     timestamp,
  total_count       bigint,
  sum_cong_no_khach numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_q    text := nullif(btrim(left(coalesce(p_q, ''), 100)), '');
  v_like text;
  v_norm text;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if v_q is not null then
    v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    v_norm := nullif(regexp_replace(v_q, '[^0-9]', '', 'g'), '');
    if v_norm is not null and length(v_norm) >= 3 then
      v_norm := coalesce(public.normalize_vn_phone(v_norm), v_norm);
    else
      v_norm := null;
    end if;
  end if;

  return query
    with agg as (
      select o.customer_id,
             count(*) filter (where not o.is_quote) as order_count,
             count(*) filter (where o.is_quote) as quote_count,
             coalesce(sum(o.tong_tien) filter (where not o.is_quote), 0) as tong_tien,
             coalesce(sum(o.cong_no_khach) filter (where not o.is_quote), 0) as cong_no_khach,
             max(o.thoi_gian) filter (where not o.is_quote) as last_order_at
        from public.customer_order_rows() o
       group by o.customer_id
    ), f as (
      select c.*, coalesce(a.order_count, 0) as order_count, coalesce(a.quote_count, 0) as quote_count,
             coalesce(a.tong_tien, 0) as tong_tien, coalesce(a.cong_no_khach, 0) as cong_no_khach,
             a.last_order_at
        from public.customers c
        left join agg a on a.customer_id = c.id
       where v_q is null
          or c.name ilike v_like or c.company ilike v_like or c.phone ilike v_like
          or (v_norm is not null and c.phone_norm like '%' || v_norm || '%')
    )
    select f.id, f.name, f.phone, f.phone_norm, f.address, f.company, f.note, f.created_at, f.updated_at,
           f.order_count, f.quote_count, f.tong_tien, f.cong_no_khach, f.last_order_at,
           count(*) over (), sum(f.cong_no_khach) over ()
      from f
     order by f.last_order_at desc nulls last, f.name, f.id
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- { customer: {...}, orders: [customer_order_rows, newest first], leads: [...],
--   totals: {order_count, tong_tien, cong_no_khach} }  (totals: real orders only)
create or replace function public.admin_customer_get(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_c jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select to_jsonb(c) into v_c from public.customers c where c.id = p_id;
  if v_c is null then
    raise exception 'customer not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'customer', v_c,
    'orders', coalesce((
      select jsonb_agg(to_jsonb(o) - 'customer_id' order by o.thoi_gian desc nulls last, o.id desc)
        from public.customer_order_rows(p_id) o), '[]'::jsonb),
    'leads', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'code', l.code, 'status', l.status, 'customer_name', l.customer_name,
               'phone', l.phone, 'production_order_id', l.production_order_id, 'created_at', l.created_at)
               order by l.created_at desc)
        from public.leads l where l.customer_id = p_id), '[]'::jsonb),
    'totals', (
      select jsonb_build_object(
               'order_count', count(*),
               'tong_tien', coalesce(sum(o.tong_tien), 0),
               'cong_no_khach', coalesce(sum(o.cong_no_khach), 0))
        from public.customer_order_rows(p_id) o where not o.is_quote)
  );
end;
$$;

create or replace function public.admin_customer_create(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_id  uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  v_row := public.customer_clean_payload(p_payload);
  if v_row ->> 'name' is null then
    raise exception 'name is required' using errcode = '22023';
  end if;
  insert into public.customers (name, phone, address, company, note)
  values (v_row ->> 'name', v_row ->> 'phone', v_row ->> 'address', v_row ->> 'company', v_row ->> 'note')
  returning id into v_id;
  return v_id;
end;
$$;

-- Any subset of the fields; returns the updated row. Existing order links are not changed.
create or replace function public.admin_customer_update(p_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_out jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  v_row := public.customer_clean_payload(p_payload);
  if v_row = '{}'::jsonb then
    raise exception 'nothing to update' using errcode = '22023';
  end if;
  update public.customers c
     set name    = case when v_row ? 'name' then v_row ->> 'name' else c.name end,
         phone   = case when v_row ? 'phone' then v_row ->> 'phone' else c.phone end,
         address = case when v_row ? 'address' then v_row ->> 'address' else c.address end,
         company = case when v_row ? 'company' then v_row ->> 'company' else c.company end,
         note    = case when v_row ? 'note' then v_row ->> 'note' else c.note end
   where c.id = p_id
  returning to_jsonb(c) into v_out;
  if v_out is null then
    raise exception 'customer not found' using errcode = 'P0002';
  end if;
  return v_out;
end;
$$;

-- Moves every order, lead, review and backfill-log row of p_sources to p_target, fills the target's empty
-- phone / address / company / note from the sources (first source first), deletes the sources.
-- Returns the number of order + lead rows moved. Max 50 sources.
create or replace function public.admin_customer_merge(p_target uuid, p_sources uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src   uuid[];
  v_total integer := 0;
  v_n     integer;
  t       text;
  s       record;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select array_agg(distinct x) into v_src from unnest(coalesce(p_sources, '{}')) x where x is not null;
  if p_target is null or v_src is null or cardinality(v_src) > 50 or p_target = any (v_src) then
    raise exception 'need a target and 1-50 other customers' using errcode = '22023';
  end if;
  perform 1 from public.customers where id = p_target or id = any (v_src) for update;
  if not exists (select 1 from public.customers where id = p_target)
     or (select count(*) from public.customers where id = any (v_src)) <> cardinality(v_src) then
    raise exception 'customer not found' using errcode = 'P0002';
  end if;

  foreach t in array array['bang_keo_in_orders', 'bang_keo_orders', 'truc_in_orders', 'thank_you_orders', 'leads'] loop
    execute format('update public.%I set customer_id = $1 where customer_id = any ($2)', t) using p_target, v_src;
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
  end loop;
  update public.customer_match_candidates set customer_id = p_target where customer_id = any (v_src);
  update public.customer_backfill_log set customer_id = p_target where customer_id = any (v_src);

  for s in select c.* from public.customers c
            where c.id = any (v_src)
            order by array_position(p_sources, c.id) loop
    update public.customers
       set phone   = coalesce(phone, s.phone),
           address = coalesce(address, s.address),
           company = coalesce(company, s.company),
           note    = coalesce(note, s.note)
     where id = p_target;
  end loop;
  delete from public.customers where id = any (v_src);
  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Desktop app (electron_app): search and create only
-- ---------------------------------------------------------------------------
-- p_id: that one customer. Else p_q on name / company / phone (normalized digits too); blank q =
-- the 20 newest. At most p_limit (1-50) rows.
create or replace function public.electron_customer_search(p_q text default null, p_id uuid default null,
                                                           p_limit integer default 20)
returns table (id uuid, name text, phone text, address text, company text)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_q    text := nullif(btrim(left(coalesce(p_q, ''), 100)), '');
  v_like text;
  v_norm text;
begin
  if p_id is not null then
    return query select c.id, c.name, c.phone, c.address, c.company from public.customers c where c.id = p_id;
    return;
  end if;
  if v_q is not null then
    v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    v_norm := nullif(regexp_replace(v_q, '[^0-9]', '', 'g'), '');
    if v_norm is not null and length(v_norm) >= 3 then
      v_norm := coalesce(public.normalize_vn_phone(v_norm), v_norm);
    else
      v_norm := null;
    end if;
  end if;
  return query
    select c.id, c.name, c.phone, c.address, c.company
      from public.customers c
     where v_q is null
        or c.name ilike v_like or c.company ilike v_like or c.phone ilike v_like
        or (v_norm is not null and c.phone_norm like '%' || v_norm || '%')
     order by c.updated_at desc, c.id
     limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

-- The single customer with this phone, else a new one. Raises 22023 when several customers share
-- the phone (the app then shows the search) or the name is empty.
create or replace function public.electron_customer_create(p_name text, p_phone text default null,
                                                           p_address text default null,
                                                           p_company text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if char_length(coalesce(p_name, '')) > 255 or char_length(coalesce(p_phone, '')) > 30
     or char_length(coalesce(p_address, '')) > 500 or char_length(coalesce(p_company, '')) > 255 then
    raise exception 'customer field too long' using errcode = '22023';
  end if;
  v_id := public.customer_find_or_create(p_name, p_phone, p_address, p_company);
  if v_id is null then
    raise exception 'several customers share this phone' using errcode = '22023';
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Backfill of old orders
-- ---------------------------------------------------------------------------
-- One row per unlinked order / lead seen by the dry run. decision: auto (applied by
-- customer_backfill_apply) | review (admin queue). status: pending -> applied (auto) |
-- linked (admin chose a customer) | skipped (admin left it unlinked).
create table if not exists public.customer_match_candidates (
  source_table       text not null check (source_table in ('bang_keo_in_orders', 'bang_keo_orders',
                                                           'truc_in_orders', 'thank_you_orders', 'leads')),
  source_id          text not null,
  ten_khach_hang     text,
  sdt_khach_hang     text,
  dia_chi_khach_hang text,
  thoi_gian          timestamp,
  phone_norm         text,
  name_norm          text,
  group_key          text,
  decision           text not null check (decision in ('auto', 'review')),
  reason             text not null,
  customer_id        uuid,
  status             text not null default 'pending' check (status in ('pending', 'applied', 'linked', 'skipped')),
  resolved_by        uuid,
  resolved_at        timestamptz,
  created_at         timestamptz not null default now(),
  primary key (source_table, source_id)
);
create index if not exists customer_match_candidates_queue_idx
  on public.customer_match_candidates (decision, status);

-- Every link the backfill or the review queue made (undo: set customer_id back to null for these
-- rows; customers with customer_created and no other orders can then be deleted).
create table if not exists public.customer_backfill_log (
  id               bigserial primary key,
  applied_at       timestamptz not null default now(),
  source_table     text not null,
  source_id        text not null,
  customer_id      uuid not null,
  customer_created boolean not null default false,
  group_key        text,
  applied_by       uuid
);

alter table public.customer_match_candidates enable row level security;
alter table public.customer_backfill_log enable row level security;
revoke all on table public.customer_match_candidates from anon, authenticated;
revoke all on table public.customer_backfill_log from anon, authenticated;
revoke all on sequence public.customer_backfill_log_id_seq from anon, authenticated;

-- Dry run: replaces the pending rows (applied / linked / skipped rows stay as history) with one row
-- per order still without a customer, and per lead that would join an order group. Rules:
--   phone present but not recognised                    -> review
--   normalized phone, several customers share it        -> review
--   normalized phone                                    -> auto, group phone:<norm>
--   no phone (any name rule below)                      -> review: a name alone ('Chị Lan') is not
--                                                          proof of one customer; the queue
--                                                          suggests customers with that name
--   no phone, name used with exactly one phone          -> review ('name matches one phone')
--   no phone, name used with several phones             -> review
--   no phone, several phone-less customers with name    -> review
--   no phone, name                                      -> review ('name matches a customer' /
--                                                          'same name, no phone')
--   no phone, no name                                   -> review
-- Phone-less rows with a name share group_key name:<norm>; the review queue shows and resolves them
-- as one item (one admin decision per name).
-- Leads only join phone groups that have orders or a customer; they never start a customer.
-- Returns the pending counts per decision / reason.
create or replace function public.customer_backfill_dry_run()
returns table (decision text, reason text, n bigint)
language plpgsql
volatile
set search_path = ''
as $$
#variable_conflict use_column
begin
  delete from public.customer_match_candidates where status = 'pending';

  insert into public.customer_match_candidates (
    source_table, source_id, ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang, thoi_gian,
    phone_norm, name_norm, group_key, decision, reason, customer_id)
  with src as (
    select 'bang_keo_in_orders'::text as source_table, id::text as source_id, ten_khach_hang::text as n,
           sdt_khach_hang::text as p, dia_chi_khach_hang::text as a, thoi_gian::timestamp as t
      from public.bang_keo_in_orders where customer_id is null
    union all
    select 'bang_keo_orders', id::text, ten_khach_hang::text, sdt_khach_hang::text, dia_chi_khach_hang::text,
           thoi_gian::timestamp
      from public.bang_keo_orders where customer_id is null
    union all
    select 'truc_in_orders', id::text, ten_khach_hang::text, sdt_khach_hang::text, dia_chi_khach_hang::text,
           thoi_gian::timestamp
      from public.truc_in_orders where customer_id is null
    union all
    select 'thank_you_orders', id, ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang, thoi_gian
      from public.thank_you_orders where customer_id is null
    union all
    select 'leads', id::text, customer_name, phone, null::text,
           (created_at at time zone 'Asia/Ho_Chi_Minh')::timestamp
      from public.leads where customer_id is null
  ), s as (
    select x.*, public.normalize_vn_phone(x.p) as pn, public.normalize_customer_name(x.n) as nn,
           nullif(btrim(coalesce(x.p, '')), '') is not null as has_p
      from src x
     where not exists (select 1 from public.customer_match_candidates c
                        where c.source_table = x.source_table and c.source_id = x.source_id)
  ), cust_phone as (
    select phone_norm, count(*) as cnt, min(id::text)::uuid as cid
      from public.customers where phone_norm is not null group by phone_norm
  ), cust_name as (
    select public.normalize_customer_name(name) as nn, count(*) as cnt, min(id::text)::uuid as cid
      from public.customers where phone_norm is null group by 1
  ), name_phones as (
    select nn, array_agg(distinct pn order by pn) as phones
      from (select nn, pn from s where pn is not null and nn is not null and source_table <> 'leads'
            union
            select public.normalize_customer_name(name), phone_norm from public.customers
             where phone_norm is not null) z
     group by nn
  ), order_phones as (
    select distinct pn from s where pn is not null and source_table <> 'leads'
  ), e as (
    select s.*,
           case when s.pn is not null then s.pn
                when s.has_p then null
                when cardinality(np.phones) = 1 then np.phones[1] end as ep,
           coalesce(cardinality(np.phones), 0) as n_phones
      from s left join name_phones np on np.nn = s.nn
  ), k as (
    select e.*, cp.cnt as cp_cnt, cp.cid as cp_cid, cn.cnt as cn_cnt, cn.cid as cn_cid,
           case
             when e.has_p and e.pn is null then 'phone not recognised'
             when e.ep is not null and cp.cnt > 1 then 'several customers share this phone'
             when e.pn is not null and cp.cid is not null then 'phone matches a customer'
             when e.pn is not null then 'same phone'
             when e.ep is not null then 'name matches one phone'
             when e.nn is null then 'no name and no phone'
             when e.n_phones > 1 then 'name used with several phones'
             when cn.cnt > 1 then 'several customers with this name'
             when cn.cid is not null then 'name matches a customer'
             else 'same name, no phone'
           end as reason
      from e
      left join cust_phone cp on cp.phone_norm = e.ep
      left join cust_name cn on cn.nn = e.nn and e.ep is null and not e.has_p
  )
  select k.source_table, k.source_id, k.n, k.p, k.a, k.t, k.pn, k.nn,
         case when k.reason in ('phone matches a customer', 'same phone') then 'phone:' || k.ep
              when k.reason in ('same name, no phone', 'name matches a customer', 'several customers with this name')
                then 'name:' || k.nn end,
         case when k.reason in ('phone matches a customer', 'same phone') then 'auto' else 'review' end,
         k.reason,
         case when k.reason in ('phone matches a customer', 'same phone') then k.cp_cid end
    from k
   where k.source_table <> 'leads'
      or (k.pn is not null and (k.cp_cnt = 1 or k.pn in (select pn from order_phones)));

  return query
    select c.decision, c.reason, count(*)
      from public.customer_match_candidates c
     where c.status = 'pending'
     group by c.decision, c.reason
     order by c.decision, c.reason;
end;
$$;

-- Apply: one customer per pending auto group (the matched customer, else a new one from the group's
-- newest order: name, raw phone, newest address), then links every row of the group whose
-- customer_id is still empty and logs it. Returns (customers_created, rows_linked).
create or replace function public.customer_backfill_apply()
returns table (customers_created integer, rows_linked integer)
language plpgsql
volatile
set search_path = ''
as $$
declare
  g         record;
  c         record;
  v_cid     uuid;
  v_new     boolean;
  v_created integer := 0;
  v_linked  integer := 0;
  v_n       integer;
  v_name    text;
  v_phone   text;
  v_addr    text;
begin
  for g in
    select group_key, min(customer_id::text)::uuid as cid
      from public.customer_match_candidates
     where status = 'pending' and decision = 'auto'
     group by group_key
     order by group_key
  loop
    v_cid := g.cid;
    v_new := false;
    if v_cid is null then
      select left(btrim(m.ten_khach_hang), 255) into v_name
        from public.customer_match_candidates m
       where m.group_key = g.group_key and m.status = 'pending' and m.decision = 'auto'
         and m.source_table <> 'leads' and nullif(btrim(m.ten_khach_hang), '') is not null
       order by m.thoi_gian desc nulls last, m.source_id desc limit 1;
      select case when char_length(btrim(m.sdt_khach_hang)) <= 30 then btrim(m.sdt_khach_hang) else m.phone_norm end
        into v_phone
        from public.customer_match_candidates m
       where m.group_key = g.group_key and m.status = 'pending' and m.decision = 'auto'
         and m.phone_norm is not null
       order by (m.source_table = 'leads'), m.thoi_gian desc nulls last, m.source_id desc limit 1;
      select left(btrim(m.dia_chi_khach_hang), 500) into v_addr
        from public.customer_match_candidates m
       where m.group_key = g.group_key and m.status = 'pending' and m.decision = 'auto'
         and nullif(btrim(m.dia_chi_khach_hang), '') is not null
       order by m.thoi_gian desc nulls last, m.source_id desc limit 1;
      insert into public.customers (name, phone, address)
      values (coalesce(v_name, v_phone, 'Khách ' || g.group_key), v_phone, v_addr)
      returning id into v_cid;
      v_new := true;
      v_created := v_created + 1;
    end if;

    for c in
      select * from public.customer_match_candidates
       where group_key = g.group_key and status = 'pending' and decision = 'auto'
       order by source_table, source_id
    loop
      execute format('update public.%I set customer_id = $1 where id::text = $2 and customer_id is null',
                     c.source_table) using v_cid, c.source_id;
      get diagnostics v_n = row_count;
      if v_n > 0 then
        insert into public.customer_backfill_log (source_table, source_id, customer_id, customer_created, group_key)
        values (c.source_table, c.source_id, v_cid, v_new, g.group_key);
        v_linked := v_linked + 1;
      end if;
      update public.customer_match_candidates
         set status = 'applied', customer_id = v_cid, resolved_at = now()
       where source_table = c.source_table and source_id = c.source_id;
    end loop;
  end loop;
  return query select v_created, v_linked;
end;
$$;

-- Review queue (admin): pending 'review' rows, oldest order first, with up to 5 suggested customers
-- (same normalized phone or name). order_type: bang_keo_in | bang_keo | truc_in | thank_you | lead.
create or replace function public.admin_customer_review_list(p_limit integer default 50, p_offset integer default 0)
returns table (
  source_table       text,
  order_type         text,
  source_id          text,
  ten_khach_hang     text,
  sdt_khach_hang     text,
  dia_chi_khach_hang text,
  thoi_gian          timestamp,
  reason             text,
  suggestions        jsonb,
  group_size         integer,
  group_ids          text[],
  total_count        bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  -- One item per group_key (rows without one stand alone), shown by its newest row.
  return query
    with q as (
      select m.*,
             row_number() over w as rn,
             count(*) over (partition by coalesce(m.group_key, m.source_table || ':' || m.source_id)) as gsize,
             array_agg(m.source_id) over (partition by coalesce(m.group_key, m.source_table || ':' || m.source_id)
                                          order by m.thoi_gian nulls last, m.source_id
                                          rows between unbounded preceding and unbounded following) as gids
        from public.customer_match_candidates m
       where m.decision = 'review' and m.status = 'pending'
      window w as (partition by coalesce(m.group_key, m.source_table || ':' || m.source_id)
                   order by m.thoi_gian desc nulls last, m.source_id desc)
    )
    select m.source_table,
           case m.source_table when 'leads' then 'lead' else replace(m.source_table, '_orders', '') end,
           m.source_id, m.ten_khach_hang, m.sdt_khach_hang, m.dia_chi_khach_hang, m.thoi_gian, m.reason,
           coalesce((
             select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'phone', x.phone,
                                                 'company', x.company, 'address', x.address))
               from (select cu.* from public.customers cu
                      where (m.phone_norm is not null and cu.phone_norm = m.phone_norm)
                         or (m.name_norm is not null and public.normalize_customer_name(cu.name) = m.name_norm)
                      order by cu.updated_at desc limit 5) x), '[]'::jsonb),
           m.gsize::integer, m.gids,
           count(*) over ()
      from q m
     where m.rn = 1
     order by m.gsize desc, m.thoi_gian nulls last, m.source_table, m.source_id
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Admin decision on one review item: p_customer_id links the row and every pending review row of
-- its group (logged), null leaves them unlinked ('skipped'). Only pending review rows (else P0002).
-- A link only lands on rows the dry run saw (still no customer, same name and phone): ids are reused
-- after a delete / quote conversion. The picked row changed -> P0002 (nothing linked); another
-- group row changed -> it stays pending for its own decision.
create or replace function public.admin_customer_review_resolve(p_source_table text, p_source_id text,
                                                                p_customer_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_m   public.customer_match_candidates;
  r     public.customer_match_candidates;
  v_n   integer;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select m.* into v_m from public.customer_match_candidates m
   where m.source_table = p_source_table and m.source_id = p_source_id
     and m.decision = 'review' and m.status = 'pending'
   for update;
  if v_m.source_table is null then
    raise exception 'review row not found' using errcode = 'P0002';
  end if;
  if p_customer_id is not null and not exists (select 1 from public.customers where id = p_customer_id) then
    raise exception 'customer not found' using errcode = '22023';
  end if;
  for r in
    select m.* from public.customer_match_candidates m
     where m.decision = 'review' and m.status = 'pending'
       and ((m.source_table = v_m.source_table and m.source_id = v_m.source_id)
            or (v_m.group_key is not null and m.group_key = v_m.group_key))
     order by (m.source_table = v_m.source_table and m.source_id = v_m.source_id) desc
     for update
  loop
    if p_customer_id is not null then
      -- r.source_table comes from the table's check constraint list, never from input text directly.
      execute format('update public.%I set customer_id = $1 where id::text = $2 and customer_id is null'
                     ' and %I is not distinct from $3 and %I is not distinct from $4', r.source_table,
                     case r.source_table when 'leads' then 'customer_name' else 'ten_khach_hang' end,
                     case r.source_table when 'leads' then 'phone' else 'sdt_khach_hang' end)
        using p_customer_id, r.source_id, r.ten_khach_hang, r.sdt_khach_hang;
      get diagnostics v_n = row_count;
      if v_n = 0 then
        if r.source_table = v_m.source_table and r.source_id = v_m.source_id then
          raise exception 'order changed since the review' using errcode = 'P0002';
        end if;
        continue;
      end if;
      insert into public.customer_backfill_log (source_table, source_id, customer_id, group_key, applied_by)
      values (r.source_table, r.source_id, p_customer_id, r.group_key, auth.uid());
    end if;
    update public.customer_match_candidates
       set status = case when p_customer_id is null then 'skipped' else 'linked' end,
           customer_id = p_customer_id, resolved_by = auth.uid(), resolved_at = now()
     where source_table = r.source_table and source_id = r.source_id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Privileges
-- ---------------------------------------------------------------------------
revoke all on function public.normalize_vn_phone(text) from public, anon, authenticated;
revoke all on function public.normalize_customer_name(text) from public, anon, authenticated;
revoke all on function public.orders_resolve_customer() from public, anon, authenticated, service_role;
revoke all on function public.customer_find_or_create(text, text, text, text) from public, anon, authenticated;
revoke all on function public.customer_order_rows(uuid) from public, anon, authenticated;
revoke all on function public.customer_clean_payload(jsonb) from public, anon, authenticated;
revoke all on function public.customer_backfill_dry_run() from public, anon, authenticated, service_role;
revoke all on function public.customer_backfill_apply() from public, anon, authenticated, service_role;

revoke all on function public.admin_customers_list(text, integer, integer) from public, anon;
revoke all on function public.admin_customer_get(uuid) from public, anon;
revoke all on function public.admin_customer_create(jsonb) from public, anon;
revoke all on function public.admin_customer_update(uuid, jsonb) from public, anon;
revoke all on function public.admin_customer_merge(uuid, uuid[]) from public, anon;
revoke all on function public.admin_customer_review_list(integer, integer) from public, anon;
revoke all on function public.admin_customer_review_resolve(text, text, uuid) from public, anon;
grant execute on function public.admin_customers_list(text, integer, integer) to authenticated;
grant execute on function public.admin_customer_get(uuid) to authenticated;
grant execute on function public.admin_customer_create(jsonb) to authenticated;
grant execute on function public.admin_customer_update(uuid, jsonb) to authenticated;
grant execute on function public.admin_customer_merge(uuid, uuid[]) to authenticated;
grant execute on function public.admin_customer_review_list(integer, integer) to authenticated;
grant execute on function public.admin_customer_review_resolve(text, text, uuid) to authenticated;

revoke all on function public.electron_customer_search(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.electron_customer_create(text, text, text, text) from public, anon, authenticated;
grant execute on function public.electron_customer_search(text, uuid, integer) to electron_app;
grant execute on function public.electron_customer_create(text, text, text, text) to electron_app;
