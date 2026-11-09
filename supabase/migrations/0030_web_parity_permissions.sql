-- 0030_web_parity_permissions
-- Per-user tabs and permissions for the web admin, order RPCs gated by permission
-- (docs/plans/2026-11-08-web-full-parity.md, "Gói việc 1"). Tests: supabase/tests/rls/20_permissions_parity.test.sql
--
-- 1. profiles.nav_tabs text[] (null = role default) and profiles.permissions text[] (default '{}'),
--    values restricted to the fixed codes. Only admins (or server code) may change them, like role
--    (profiles_guard_columns): a user cannot grant himself anything.
-- 2. public.has_perm(p): true for an active admin, else for an active profile with p in permissions.
-- 3. Order RPCs (0026 / 0028) gated by has_perm instead of is_admin:
--      orders.view    admin_orders_list, admin_orders_totals, admin_order_get, admin_orders_for_export,
--                     admin_order_attachments, admin_order_attachment_get, admin_customers_list,
--                     admin_customer_get
--      orders.create  admin_order_create, admin_quote_convert
--      orders.edit    admin_order_update, admin_order_send_to_workshop, admin_order_attachment_add,
--                     admin_order_attachment_delete
--      orders.create or orders.edit   admin_order_name_suggest, admin_order_latest_by_name
--      orders.status  admin_order_set_status;   orders.delete  admin_order_delete
--      customers.edit admin_customer_create, admin_customer_update
--    admin only (unchanged): admin_customer_merge, admin_customer_review_list / _resolve, admin_dashboard.
--    orders.export is a page / button permission only (the export RPC is orders.view: same data as get).
--    Without orders.money the cost side comes back null: cost prices and totals, fees, supplier debt,
--    profit, shipping, CTV and commission (order_hide_money; list, totals, get, update, latest, export).
--    Sale side (prices, VAT, deposit, customer debt) stays visible.
-- 4. admin_orders_list: + customer_id and the axis columns; the 7 totals move to admin_orders_totals
--    (same filter, + count_unsettled / count_settled for the app's "Trạng thái" card). New filter keys
--    ctv (contains, ctv or axis ctv; needs orders.money) and customer_id; q also matches ten_truc.
-- 5. thoi_gian indexes on the order tables (customer_id indexes exist since 0028).
-- 6. admin_orders_for_export(p_ids), attachment RPCs on public.order_attachments (base64, <= 25 MB).

-- ---------------------------------------------------------------------------
-- 1. Profile tabs and permissions
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists nav_tabs text[],
  add column if not exists permissions text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_nav_tabs_check;
alter table public.profiles add constraint profiles_nav_tabs_check check (
  nav_tabs is null
  or nav_tabs <@ array['overview', 'leads', 'orders', 'quotes', 'customers', 'workshop', 'users', 'settings']);
alter table public.profiles drop constraint if exists profiles_permissions_check;
alter table public.profiles add constraint profiles_permissions_check check (
  permissions <@ array['orders.view', 'orders.money', 'orders.create', 'orders.edit', 'orders.status',
                       'orders.delete', 'orders.export', 'customers.edit']);

-- 0001 body + nav_tabs / permissions are admin-only like role.
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
     or new.id is distinct from old.id
     or new.nav_tabs is distinct from old.nav_tabs
     or new.permissions is distinct from old.permissions then
    raise exception 'not allowed to change role, status, email, tabs or permissions' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. has_perm
-- ---------------------------------------------------------------------------
create or replace function public.has_perm(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select pr.role = 'admin' or p = any (pr.permissions)
                     from public.profiles pr
                    where pr.id = auth.uid() and pr.is_active), false)
$$;

-- Cost side of an order row (jsonb) set to null without orders.money; quote_items keep only the
-- sale side (the desktop quote item / axis keys, quotations.js buildQuoteItem / axisFromFields).
create or replace function public.order_hide_money(p_row jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_keys text[] := array['don_gia_von', 'don_gia_goc', 'thanh_tien_goc', 'thanh_tien', 'thanh_tien_von',
    'phi_sl', 'phi_keo', 'phi_mau', 'phi_size', 'phi_cat', 'cong_no_ncc', 'loi_nhuan', 'loi_nhuan_rong',
    'tien_ship', 'ctv', 'hoa_hong', 'tien_hoa_hong', 'truc_gia_goc', 'truc_thanh_tien_goc', 'truc_ctv',
    'truc_hoa_hong', 'truc_tien_hoa_hong', 'truc_loi_nhuan', 'truc_loi_nhuan_rong', 'tien_von'];
begin
  if p_row is null or jsonb_typeof(p_row) <> 'object' or public.has_perm('orders.money') then
    return p_row;
  end if;
  p_row := p_row || coalesce((select jsonb_object_agg(k, null) from unnest(v_keys) k where p_row ? k), '{}'::jsonb);
  if jsonb_typeof(p_row -> 'quote_items') = 'array' then
    p_row := p_row || jsonb_build_object('quote_items', (
      select coalesce(jsonb_agg(case when jsonb_typeof(i) <> 'object' then i else
        (i - array['costTotal', 'shipping', 'commission', 'profit', 'netProfit', 'fields'])
        || case when jsonb_typeof(i -> 'axes') = 'array' then jsonb_build_object('axes', (
             select coalesce(jsonb_agg(case when jsonb_typeof(a) <> 'object' then a else
               a - array['costPrice', 'costTotal', 'collaborator', 'commissionPercent', 'commission',
                         'profit', 'netProfit'] end), '[]'::jsonb)
               from jsonb_array_elements(i -> 'axes') a)) else '{}'::jsonb end end), '[]'::jsonb)
        from jsonb_array_elements(p_row -> 'quote_items') i));
  end if;
  return p_row;
end;
$$;

-- Inputs only orders.money may set: CTV, commission, shipping, fees and the printed-tape cost. Without
-- it they are dropped from a create / update / quote payload (the row keeps its stored value). The
-- required costs don_gia_goc / truc_gia_goc stay: admin_order_update keeps a stored one itself.
create or replace function public.order_strip_money_input(p jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case when p is null or jsonb_typeof(p) <> 'object' or public.has_perm('orders.money') then p
    else p - array['ctv', 'hoa_hong', 'truc_ctv', 'truc_hoa_hong', 'tien_ship', 'phi_sl', 'phi_keo', 'phi_mau',
                   'phi_size', 'phi_cat', 'don_gia_von'] end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Gates of the RPCs whose body does not change otherwise
-- ---------------------------------------------------------------------------
-- Swaps the single "if not public.is_admin() then raise ... 'admin only'" of each body (0026 / 0028)
-- for the permission check; fails if a body does not have exactly one. CREATE OR REPLACE keeps the
-- grants, SECURITY DEFINER and search_path ''.
do $$
declare
  r     record;
  v_def text;
  v_n   integer;
begin
  for r in
    select * from (values
      ('public.admin_order_create(jsonb,text,boolean)',               'public.has_perm(''orders.create'')'),
      ('public.admin_quote_convert(text,text,date)',                  'public.has_perm(''orders.create'')'),
      ('public.admin_order_send_to_workshop(text,uuid)',              'public.has_perm(''orders.edit'')'),
      ('public.admin_order_set_status(text,text[],boolean,boolean)',  'public.has_perm(''orders.status'')'),
      ('public.admin_order_delete(text,text[],boolean)',              'public.has_perm(''orders.delete'')'),
      ('public.admin_order_name_suggest(text,text)',
       '(public.has_perm(''orders.create'') or public.has_perm(''orders.edit''))'),
      ('public.admin_customers_list(text,integer,integer)',           'public.has_perm(''orders.view'')'),
      ('public.admin_customer_get(uuid)',                             'public.has_perm(''orders.view'')'),
      ('public.admin_customer_create(jsonb)',                         'public.has_perm(''customers.edit'')'),
      ('public.admin_customer_update(uuid,jsonb)',                    'public.has_perm(''customers.edit'')')
    ) as v(sig, gate)
  loop
    v_def := pg_get_functiondef(r.sig::regprocedure);
    continue when position('public.has_perm(' in v_def) > 0;  -- already swapped: re-runnable
    v_n := (length(v_def) - length(replace(v_def, 'public.is_admin()', ''))) / length('public.is_admin()');
    if v_n <> 1 or position('raise exception ''admin only''' in v_def) = 0 then
      raise exception '0030: unexpected gate in % (% is_admin calls)', r.sig, v_n;
    end if;
    v_def := replace(v_def, 'if not public.is_admin() then', 'if not ' || r.gate || ' then');
    v_def := replace(v_def, 'raise exception ''admin only''', 'raise exception ''permission denied''');
    execute v_def;
  end loop;

  -- admin_order_create: money inputs only with orders.money (order_strip_money_input).
  v_def := pg_get_functiondef('public.admin_order_create(jsonb,text,boolean)'::regprocedure);
  if position('order_strip_money_input' in v_def) = 0 then
    if position('v_row := public.order_clean_payload(p_type, p_payload, array[''workshop_user_id'', ''production_note'']);' in v_def) = 0 then
      raise exception '0030: unexpected admin_order_create body';
    end if;
    execute replace(v_def,
      'v_row := public.order_clean_payload(p_type, p_payload, array[''workshop_user_id'', ''production_note'']);',
      'v_row := public.order_strip_money_input(public.order_clean_payload(p_type, p_payload, array[''workshop_user_id'', ''production_note'']));');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Order list, totals
-- ---------------------------------------------------------------------------
-- Internal: every order of p_type ('all' or a type) matching p_filter, unsorted, unpaged, money as
-- stored (callers hide it). Filter keys (all optional): q (id / product / customer / phone / axis
-- name), is_quote (default false), step (production_step or 'none'), delivered, settled,
-- due ('overdue' | 'soon'), date_from / date_to ('YYYY-MM-DD', order date, inclusive),
-- ctv (contains, ctv or the new axis' ctv; needs orders.money), customer_id (uuid).
-- Other keys (sort, dir, limit, offset) are read by admin_orders_list.
create or replace function public.admin_orders_filtered(p_filter jsonb, p_type text)
returns table (
  type text, id text, thoi_gian timestamp, ngay_du_kien date, ten_hang text, quy_cach text, mau_sac text,
  ten_khach_hang text, sdt_khach_hang text, dia_chi_khach_hang text, customer_id uuid, so_luong numeric,
  don_gia_ban numeric, thanh_tien_ban numeric, vat numeric, tong_tien numeric, tien_coc numeric,
  cong_no_khach numeric, cong_no_ncc numeric, tien_von numeric, loi_nhuan_rong numeric, ctv text,
  da_giao boolean, da_tat_toan boolean, da_gui_email boolean, is_quote boolean, has_quote_items boolean,
  loai_truc text, ten_truc text, truc_chu_vi numeric, truc_so_luong numeric, truc_thanh_tien_ban numeric,
  truc_ctv text, truc_hoa_hong numeric, truc_tien_hoa_hong numeric, truc_loi_nhuan_rong numeric,
  job_id uuid, step public.production_step, workshop_user_id uuid, workshop_user_name text, lead_id uuid
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_f     jsonb := coalesce(p_filter, '{}'::jsonb);
  v_type  text := coalesce(p_type, 'all');
  v_q     text;
  v_quote boolean := false;
  v_step  text;
  v_deliv boolean;
  v_settl boolean;
  v_due   text;
  v_from  date;
  v_to    date;
  v_ctv   text;
  v_cust  uuid;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if v_type <> 'all' then
    perform public.order_type_meta(v_type);
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
  if jsonb_typeof(v_f -> 'is_quote') = 'boolean' then
    v_quote := (v_f ->> 'is_quote')::boolean;
  end if;
  if jsonb_typeof(v_f -> 'delivered') = 'boolean' then
    v_deliv := (v_f ->> 'delivered')::boolean;
  end if;
  if jsonb_typeof(v_f -> 'settled') = 'boolean' then
    v_settl := (v_f ->> 'settled')::boolean;
  end if;
  v_due := public.order_payload_text(v_f, 'due', 10);
  if v_due is not null and v_due not in ('overdue', 'soon') then
    raise exception 'due must be overdue or soon' using errcode = '22023';
  end if;
  begin
    v_from := public.order_payload_text(v_f, 'date_from', 10)::date;
    v_to := public.order_payload_text(v_f, 'date_to', 10)::date;
    v_cust := public.order_payload_text(v_f, 'customer_id', 36)::uuid;
  exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
    raise exception 'invalid date or customer filter' using errcode = '22023';
  end;
  v_ctv := public.order_payload_text(v_f, 'ctv', 100);
  if v_ctv is not null and not public.has_perm('orders.money') then
    raise exception 'ctv filter needs orders.money' using errcode = '42501';
  end if;
  if v_q is not null then
    v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  if v_ctv is not null then
    v_ctv := '%' || replace(replace(replace(v_ctv, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
    with o as (
      select 'bang_keo_in'::text as type, b.id::text as id, b.thoi_gian::timestamp as thoi_gian,
             b.ngay_du_kien::date as ngay_du_kien, b.ten_hang::text as ten_hang,
             nullif(concat_ws(' x ', trim_scale(b.quy_cach_mm::numeric) || 'mm', trim_scale(b.quy_cach_m::numeric) || 'm',
                              trim_scale(b.quy_cach_mic::numeric) || 'mic'), '') as quy_cach,
             b.mau_sac::text as mau_sac, b.ten_khach_hang::text as ten_khach_hang,
             b.sdt_khach_hang::text as sdt_khach_hang, b.dia_chi_khach_hang::text as dia_chi_khach_hang,
             b.customer_id as customer_id,
             b.so_luong::numeric as so_luong, coalesce(b.don_gia_ban, 0)::numeric as don_gia_ban,
             coalesce(b.thanh_tien_ban, 0)::numeric as thanh_tien_ban, coalesce(b.vat, 0)::numeric as vat,
             (coalesce(b.thanh_tien_ban, 0) + coalesce(b.vat, 0)
               + case when b.loai_truc = 'moi'
                      then coalesce(b.truc_thanh_tien_ban, 0) + coalesce(b.truc_vat, 0) else 0 end)::numeric as tong_tien,
             coalesce(b.tien_coc, 0)::numeric as tien_coc, coalesce(b.cong_no_khach, 0)::numeric as cong_no_khach,
             coalesce(b.cong_no_ncc, 0)::numeric as cong_no_ncc,
             (coalesce(b.thanh_tien_goc, 0)
               + case when b.loai_truc = 'moi' then coalesce(b.truc_thanh_tien_goc, 0) else 0 end)::numeric as tien_von,
             (coalesce(b.loi_nhuan_rong, 0)
               + case when b.loai_truc = 'moi' then coalesce(b.truc_loi_nhuan_rong, 0) else 0 end)::numeric as loi_nhuan_rong,
             b.ctv::text as ctv, coalesce(b.da_giao, false) as da_giao, coalesce(b.da_tat_toan, false) as da_tat_toan,
             coalesce(b.da_gui_email, false) as da_gui_email, coalesce(b.is_quote, false) as is_quote,
             case when jsonb_typeof(b.quote_items) = 'array' then jsonb_array_length(b.quote_items) > 0 else false end as has_quote_items,
             coalesce(b.loai_truc, 'cu')::text as loai_truc,
             case when b.loai_truc = 'moi' then b.ten_truc end::text as ten_truc,
             case when b.loai_truc = 'moi' then b.truc_chu_vi end::numeric as truc_chu_vi,
             case when b.loai_truc = 'moi' then b.truc_so_luong end::numeric as truc_so_luong,
             case when b.loai_truc = 'moi' then b.truc_thanh_tien_ban end::numeric as truc_thanh_tien_ban,
             case when b.loai_truc = 'moi' then b.truc_ctv end::text as truc_ctv,
             case when b.loai_truc = 'moi' then b.truc_hoa_hong end::numeric as truc_hoa_hong,
             case when b.loai_truc = 'moi' then b.truc_tien_hoa_hong end::numeric as truc_tien_hoa_hong,
             case when b.loai_truc = 'moi' then b.truc_loi_nhuan_rong end::numeric as truc_loi_nhuan_rong
        from public.bang_keo_in_orders b where v_type in ('all', 'bang_keo_in')
      union all
      select 'bang_keo', b.id::text, b.thoi_gian::timestamp, b.ngay_du_kien::date, b.ten_hang::text,
             b.quy_cach::text, b.mau_sac::text, b.ten_khach_hang::text, b.sdt_khach_hang::text,
             b.dia_chi_khach_hang::text, b.customer_id, b.so_luong::numeric, coalesce(b.don_gia_ban, 0)::numeric,
             coalesce(b.thanh_tien_ban, 0)::numeric, coalesce(b.vat, 0)::numeric,
             (coalesce(b.thanh_tien_ban, 0) + coalesce(b.vat, 0))::numeric, 0::numeric,
             coalesce(b.cong_no_khach, 0)::numeric, coalesce(b.cong_no_ncc, 0)::numeric,
             coalesce(b.thanh_tien, 0)::numeric, coalesce(b.loi_nhuan_rong, 0)::numeric, b.ctv::text,
             coalesce(b.da_giao, false), coalesce(b.da_tat_toan, false), coalesce(b.da_gui_email, false),
             coalesce(b.is_quote, false),
             case when jsonb_typeof(b.quote_items) = 'array' then jsonb_array_length(b.quote_items) > 0 else false end,
             null, null, null, null, null, null, null, null, null
        from public.bang_keo_orders b where v_type in ('all', 'bang_keo')
      union all
      select 'truc_in', b.id::text, b.thoi_gian::timestamp, b.ngay_du_kien::date, b.ten_hang::text,
             b.quy_cach::text, b.mau_sac::text, b.ten_khach_hang::text, b.sdt_khach_hang::text,
             b.dia_chi_khach_hang::text, b.customer_id, b.so_luong::numeric, coalesce(b.don_gia_ban, 0)::numeric,
             coalesce(b.thanh_tien_ban, 0)::numeric, coalesce(b.vat, 0)::numeric,
             (coalesce(b.thanh_tien_ban, 0) + coalesce(b.vat, 0))::numeric, 0::numeric,
             coalesce(b.cong_no_khach, 0)::numeric, coalesce(b.cong_no_ncc, 0)::numeric,
             coalesce(b.thanh_tien_goc, 0)::numeric, coalesce(b.loi_nhuan_rong, 0)::numeric, b.ctv::text,
             coalesce(b.da_giao, false), coalesce(b.da_tat_toan, false), coalesce(b.da_gui_email, false),
             coalesce(b.is_quote, false),
             case when jsonb_typeof(b.quote_items) = 'array' then jsonb_array_length(b.quote_items) > 0 else false end,
             null, null, null, null, null, null, null, null, null
        from public.truc_in_orders b where v_type in ('all', 'truc_in')
      union all
      select 'thank_you', b.id, b.thoi_gian, b.ngay_du_kien, b.ten_hang, b.kich_thuoc, b.mau_sac,
             b.ten_khach_hang, b.sdt_khach_hang, b.dia_chi_khach_hang, b.customer_id, b.so_luong,
             coalesce(b.don_gia_ban, 0), coalesce(b.thanh_tien_ban, 0), coalesce(b.vat, 0),
             coalesce(b.thanh_tien_ban, 0) + coalesce(b.vat, 0),
             coalesce(b.tien_coc, 0), coalesce(b.cong_no_khach, 0), coalesce(b.cong_no_ncc, 0),
             coalesce(b.thanh_tien_von, 0), coalesce(b.loi_nhuan_rong, 0), b.ctv, b.da_giao, b.da_tat_toan,
             b.da_gui_email, b.is_quote, false,
             null, null, null, null, null, null, null, null, null
        from public.thank_you_orders b where v_type in ('all', 'thank_you')
    )
    select o.*, j.id, j.step, j.workshop_user_id, p.full_name, j.lead_id
      from o
      left join public.production_jobs j on o.type = 'bang_keo_in' and j.order_id = o.id
      left join public.profiles p on p.id = j.workshop_user_id
     where o.is_quote = v_quote
       and (v_q is null or o.id ilike v_q or o.ten_hang ilike v_q
            or o.ten_khach_hang ilike v_q or o.sdt_khach_hang ilike v_q or o.ten_truc ilike v_q)
       and (v_step is null or (v_step = 'none' and j.id is null) or j.step::text = v_step)
       and (v_deliv is null or o.da_giao = v_deliv)
       and (v_settl is null or o.da_tat_toan = v_settl)
       and (v_due is null
            or (v_due = 'overdue' and not o.da_giao and o.ngay_du_kien < v_today)
            or (v_due = 'soon' and not o.da_giao and o.ngay_du_kien between v_today and v_today + 3))
       -- range on the column itself so the thoi_gian indexes apply
       and (v_from is null or o.thoi_gian >= v_from)
       and (v_to is null or o.thoi_gian < v_to + 1)
       and (v_ctv is null or o.ctv ilike v_ctv or o.truc_ctv ilike v_ctv)
       and (v_cust is null or o.customer_id = v_cust);
end;
$$;

-- p_type: bang_keo_in | bang_keo | truc_in | thank_you | all; p_filter: admin_orders_filtered keys +
-- sort (thoi_gian | ngay_du_kien | id | ten_hang | ten_khach_hang | so_luong | tong_tien |
-- cong_no_khach | loi_nhuan_rong (needs orders.money); default thoi_gian), dir (asc | desc, default
-- desc), limit (1-200, default 50), offset. Counts and sums: admin_orders_totals.
drop function if exists public.admin_orders_list(jsonb, text);
create function public.admin_orders_list(p_filter jsonb default '{}'::jsonb, p_type text default 'bang_keo_in')
returns table (
  type text, id text, thoi_gian timestamp, ngay_du_kien date, ten_hang text, quy_cach text, mau_sac text,
  ten_khach_hang text, sdt_khach_hang text, dia_chi_khach_hang text, customer_id uuid, so_luong numeric,
  don_gia_ban numeric, thanh_tien_ban numeric, vat numeric, tong_tien numeric, tien_coc numeric,
  cong_no_khach numeric, cong_no_ncc numeric, tien_von numeric, loi_nhuan_rong numeric, ctv text,
  da_giao boolean, da_tat_toan boolean, da_gui_email boolean, is_quote boolean, has_quote_items boolean,
  loai_truc text, ten_truc text, truc_chu_vi numeric, truc_so_luong numeric, truc_thanh_tien_ban numeric,
  truc_ctv text, truc_hoa_hong numeric, truc_tien_hoa_hong numeric, truc_loi_nhuan_rong numeric,
  job_id uuid, step public.production_step, workshop_user_id uuid, workshop_user_name text, lead_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_f      jsonb := coalesce(p_filter, '{}'::jsonb);
  v_money  boolean := public.has_perm('orders.money');
  v_sort   text;
  v_asc    boolean;
  v_limit  integer;
  v_offset integer;
begin
  if not public.has_perm('orders.view') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if jsonb_typeof(v_f) <> 'object' then
    raise exception 'filter must be an object' using errcode = '22023';
  end if;
  v_sort := coalesce(public.order_payload_text(v_f, 'sort', 20), 'thoi_gian');
  if v_sort not in ('thoi_gian', 'ngay_du_kien', 'id', 'ten_hang', 'ten_khach_hang', 'so_luong',
                    'tong_tien', 'cong_no_khach', 'loi_nhuan_rong') then
    raise exception 'unknown sort %', v_sort using errcode = '22023';
  end if;
  if v_sort = 'loi_nhuan_rong' and not v_money then
    raise exception 'sort by profit needs orders.money' using errcode = '42501';
  end if;
  v_asc := case coalesce(public.order_payload_text(v_f, 'dir', 4), 'desc')
             when 'asc' then true when 'desc' then false end;
  if v_asc is null then
    raise exception 'dir must be asc or desc' using errcode = '22023';
  end if;
  v_limit := least(greatest(coalesce(public.order_payload_num(v_f, 'limit'), 50), 1), 200)::integer;
  v_offset := greatest(coalesce(public.order_payload_num(v_f, 'offset'), 0), 0)::integer;

  return query
    select f.type, f.id, f.thoi_gian, f.ngay_du_kien, f.ten_hang, f.quy_cach, f.mau_sac, f.ten_khach_hang,
           f.sdt_khach_hang, f.dia_chi_khach_hang, f.customer_id, f.so_luong, f.don_gia_ban, f.thanh_tien_ban,
           f.vat, f.tong_tien, f.tien_coc, f.cong_no_khach,
           case when v_money then f.cong_no_ncc end, case when v_money then f.tien_von end,
           case when v_money then f.loi_nhuan_rong end, case when v_money then f.ctv end,
           f.da_giao, f.da_tat_toan, f.da_gui_email, f.is_quote, f.has_quote_items,
           f.loai_truc, f.ten_truc, f.truc_chu_vi, f.truc_so_luong, f.truc_thanh_tien_ban,
           case when v_money then f.truc_ctv end, case when v_money then f.truc_hoa_hong end,
           case when v_money then f.truc_tien_hoa_hong end, case when v_money then f.truc_loi_nhuan_rong end,
           f.job_id, f.step, f.workshop_user_id, f.workshop_user_name, f.lead_id
      from public.admin_orders_filtered(v_f, p_type) f
     order by
       case when v_asc then case v_sort when 'thoi_gian' then f.thoi_gian when 'ngay_du_kien' then f.ngay_du_kien::timestamp end end asc nulls last,
       case when not v_asc then case v_sort when 'thoi_gian' then f.thoi_gian when 'ngay_du_kien' then f.ngay_du_kien::timestamp end end desc nulls last,
       case when v_asc then case v_sort when 'id' then f.id when 'ten_hang' then f.ten_hang when 'ten_khach_hang' then f.ten_khach_hang end end asc nulls last,
       case when not v_asc then case v_sort when 'id' then f.id when 'ten_hang' then f.ten_hang when 'ten_khach_hang' then f.ten_khach_hang end end desc nulls last,
       case when v_asc then case v_sort when 'so_luong' then f.so_luong when 'tong_tien' then f.tong_tien when 'cong_no_khach' then f.cong_no_khach when 'loi_nhuan_rong' then f.loi_nhuan_rong end end asc nulls last,
       case when not v_asc then case v_sort when 'so_luong' then f.so_luong when 'tong_tien' then f.tong_tien when 'cong_no_khach' then f.cong_no_khach when 'loi_nhuan_rong' then f.loi_nhuan_rong end end desc nulls last,
       f.thoi_gian desc nulls last, f.id desc
     limit v_limit offset v_offset;
end;
$$;

-- One row over the whole filtered set (same p_filter / p_type as the list; sort / paging keys are
-- ignored). sum_cong_no_khach / sum_cong_no_ncc skip settled orders; due counts skip delivered ones.
-- sum_cong_no_ncc / sum_loi_nhuan_rong are null without orders.money.
create or replace function public.admin_orders_totals(p_filter jsonb default '{}'::jsonb, p_type text default 'bang_keo_in')
returns table (
  total_count        bigint,
  sum_tong_tien      numeric,
  sum_cong_no_khach  numeric,
  sum_cong_no_ncc    numeric,
  sum_loi_nhuan_rong numeric,
  count_due_soon     bigint,
  count_overdue      bigint,
  count_unsettled    bigint,
  count_settled      bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_money boolean := public.has_perm('orders.money');
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if not public.has_perm('orders.view') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  return query
    select count(*),
           coalesce(sum(f.tong_tien), 0),
           coalesce(sum(f.cong_no_khach) filter (where not f.da_tat_toan), 0),
           case when v_money then coalesce(sum(f.cong_no_ncc) filter (where not f.da_tat_toan), 0) end,
           case when v_money then coalesce(sum(f.loi_nhuan_rong), 0) end,
           count(*) filter (where not f.da_giao and f.ngay_du_kien between v_today and v_today + 3),
           count(*) filter (where not f.da_giao and f.ngay_du_kien < v_today),
           count(*) filter (where not f.da_tat_toan),
           count(*) filter (where f.da_tat_toan)
      from public.admin_orders_filtered(p_filter, p_type) f;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Get, update, latest by name (0026 / 0028 bodies, gated, money hidden)
-- ---------------------------------------------------------------------------
-- { type, order, customer: {id, name, phone} | null, job, steps, delivery_notes, attachments }
create or replace function public.admin_order_get(p_id text, p_type text default 'bang_keo_in')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tbl   text;
  v_order jsonb;
  v_job   public.production_jobs;
begin
  if not public.has_perm('orders.view') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  v_tbl := (select tbl from public.order_type_meta(p_type));
  execute format('select to_jsonb(o) from public.%I o where o.id = $1', v_tbl) into v_order using p_id;
  if v_order is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if p_type = 'bang_keo_in' then
    select * into v_job from public.production_jobs where order_id = p_id;
  end if;

  return jsonb_build_object(
    'type', p_type,
    'order', public.order_hide_money(v_order),
    'customer', (select jsonb_build_object('id', c.id, 'name', c.name, 'phone', c.phone)
                   from public.customers c where c.id = (v_order ->> 'customer_id')::uuid),
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
        from public.delivery_notes n where n.job_id = v_job.id), '[]'::jsonb),
    'attachments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'file_name', a.file_name, 'content_type', a.content_type,
               'file_size', a.file_size, 'created_at', a.created_at) order by a.created_at desc)
        from public.order_attachments a where a.order_type = p_type and a.order_id = p_id), '[]'::jsonb)
  );
end;
$$;

-- 0028 body; without orders.money the returned row hides money, the money inputs are dropped
-- (order_strip_money_input) and a stored cost (don_gia_goc, truc_gia_goc) is kept: the caller
-- cannot see it, so a typed value must not overwrite it.
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
  if not public.has_perm('orders.edit') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  v_tbl := (select tbl from public.order_type_meta(p_type));
  v_clean := public.order_strip_money_input(public.order_clean_payload(p_type, p_payload));

  execute format('select to_jsonb(o) from public.%I o where o.id = $1 for update', v_tbl)
    into v_old using p_id;
  if v_old is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if not public.has_perm('orders.money') then
    v_clean := v_clean - array(select k from unnest(array['don_gia_goc', 'truc_gia_goc']) k
                               where coalesce((v_old ->> k)::numeric, 0) > 0);
  end if;
  if v_clean = '{}'::jsonb then
    raise exception 'nothing to update' using errcode = '22023';
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
  return public.order_hide_money(v_old);
end;
$$;

create or replace function public.admin_order_latest_by_name(p_type text, p_name text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tbl text;
  v_row jsonb;
begin
  if not (public.has_perm('orders.create') or public.has_perm('orders.edit')) then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  v_tbl := (select tbl from public.order_type_meta(p_type));
  if nullif(btrim(coalesce(p_name, '')), '') is null or char_length(p_name) > 500 then
    return null;
  end if;
  execute format(
    'select to_jsonb(o) from public.%I o
      where o.ten_hang ilike $1 and not coalesce(o.is_quote, false)
      order by o.thoi_gian desc nulls last limit 1', v_tbl)
    into v_row using replace(replace(replace(p_name, '\', '\\'), '%', '\%'), '_', '\_');
  return public.order_hide_money(v_row);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Export (Đơn đặt hàng / Phiếu giao hàng)
-- ---------------------------------------------------------------------------
-- Real orders (not quotes) of any type whose id is in p_ids (max 200), in p_ids order. Sale side only
-- (exportManager.js buildExportProductsFromOrder never prints cost); quote_items as order_hide_money
-- leaves them. quy_cach: free text of bang_keo / truc_in, kich_thuoc of thank_you, null for BKI
-- (quy_cach_mm / _m / _mic); mau_keo: BKI / truc_in. Axis columns only for a BKI new axis.
create or replace function public.admin_orders_for_export(p_ids text[])
returns table (
  type text, id text, thoi_gian timestamp, ngay_du_kien date, ten_hang text,
  ten_khach_hang text, sdt_khach_hang text, dia_chi_khach_hang text, customer_id uuid, customer_name text,
  quy_cach text, quy_cach_mm numeric, quy_cach_m numeric, quy_cach_mic numeric, mau_sac text, mau_keo text,
  so_luong numeric, don_gia_ban numeric, thanh_tien_ban numeric, vat_percent numeric, vat numeric,
  tien_coc numeric, cong_no_khach numeric, da_giao boolean, da_tat_toan boolean, quote_items jsonb,
  loai_truc text, ten_truc text, truc_chu_vi numeric, truc_so_luong numeric, truc_gia_ban numeric,
  truc_thanh_tien_ban numeric, truc_vat_percent numeric, truc_vat numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.has_perm('orders.view') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) > 200 then
    raise exception 'too many ids (max 200)' using errcode = '22023';
  end if;
  return query
    with o as (
      select 'bang_keo_in'::text as type, b.id::text as id, b.thoi_gian::timestamp as thoi_gian,
             b.ngay_du_kien::date as ngay_du_kien, b.ten_hang::text as ten_hang,
             b.ten_khach_hang::text as ten_khach_hang, b.sdt_khach_hang::text as sdt_khach_hang,
             b.dia_chi_khach_hang::text as dia_chi_khach_hang, b.customer_id as customer_id,
             null::text as quy_cach, b.quy_cach_mm::numeric as quy_cach_mm, b.quy_cach_m::numeric as quy_cach_m,
             b.quy_cach_mic::numeric as quy_cach_mic, b.mau_sac::text as mau_sac, b.mau_keo::text as mau_keo,
             b.so_luong::numeric as so_luong, coalesce(b.don_gia_ban, 0)::numeric as don_gia_ban,
             coalesce(b.thanh_tien_ban, 0)::numeric as thanh_tien_ban,
             coalesce(b.vat_percent, 0)::numeric as vat_percent, coalesce(b.vat, 0)::numeric as vat,
             coalesce(b.tien_coc, 0)::numeric as tien_coc, coalesce(b.cong_no_khach, 0)::numeric as cong_no_khach,
             coalesce(b.da_giao, false) as da_giao, coalesce(b.da_tat_toan, false) as da_tat_toan,
             b.quote_items::jsonb as quote_items, coalesce(b.loai_truc, 'cu')::text as loai_truc,
             case when b.loai_truc = 'moi' then b.ten_truc end::text as ten_truc,
             case when b.loai_truc = 'moi' then b.truc_chu_vi end::numeric as truc_chu_vi,
             case when b.loai_truc = 'moi' then b.truc_so_luong end::numeric as truc_so_luong,
             case when b.loai_truc = 'moi' then b.truc_gia_ban end::numeric as truc_gia_ban,
             case when b.loai_truc = 'moi' then b.truc_thanh_tien_ban end::numeric as truc_thanh_tien_ban,
             case when b.loai_truc = 'moi' then b.truc_vat_percent end::numeric as truc_vat_percent,
             case when b.loai_truc = 'moi' then b.truc_vat end::numeric as truc_vat
        from public.bang_keo_in_orders b where b.id = any (p_ids) and not coalesce(b.is_quote, false)
      union all
      select 'bang_keo', b.id::text, b.thoi_gian::timestamp, b.ngay_du_kien::date, b.ten_hang::text,
             b.ten_khach_hang::text, b.sdt_khach_hang::text, b.dia_chi_khach_hang::text, b.customer_id,
             b.quy_cach::text, null, null, null, b.mau_sac::text, null,
             b.so_luong::numeric, coalesce(b.don_gia_ban, 0)::numeric, coalesce(b.thanh_tien_ban, 0)::numeric,
             coalesce(b.vat_percent, 0)::numeric, coalesce(b.vat, 0)::numeric, 0::numeric,
             coalesce(b.cong_no_khach, 0)::numeric, coalesce(b.da_giao, false), coalesce(b.da_tat_toan, false),
             b.quote_items::jsonb, null, null, null, null, null, null, null, null
        from public.bang_keo_orders b where b.id = any (p_ids) and not coalesce(b.is_quote, false)
      union all
      select 'truc_in', b.id::text, b.thoi_gian::timestamp, b.ngay_du_kien::date, b.ten_hang::text,
             b.ten_khach_hang::text, b.sdt_khach_hang::text, b.dia_chi_khach_hang::text, b.customer_id,
             b.quy_cach::text, null, null, null, b.mau_sac::text, b.mau_keo::text,
             b.so_luong::numeric, coalesce(b.don_gia_ban, 0)::numeric, coalesce(b.thanh_tien_ban, 0)::numeric,
             coalesce(b.vat_percent, 0)::numeric, coalesce(b.vat, 0)::numeric, 0::numeric,
             coalesce(b.cong_no_khach, 0)::numeric, coalesce(b.da_giao, false), coalesce(b.da_tat_toan, false),
             b.quote_items::jsonb, null, null, null, null, null, null, null, null
        from public.truc_in_orders b where b.id = any (p_ids) and not coalesce(b.is_quote, false)
      union all
      select 'thank_you', b.id, b.thoi_gian, b.ngay_du_kien, b.ten_hang,
             b.ten_khach_hang, b.sdt_khach_hang, b.dia_chi_khach_hang, b.customer_id,
             b.kich_thuoc, null, null, null, b.mau_sac, null,
             b.so_luong, b.don_gia_ban, b.thanh_tien_ban, b.vat_percent, b.vat, b.tien_coc,
             b.cong_no_khach, b.da_giao, b.da_tat_toan, null, null, null, null, null, null, null, null, null
        from public.thank_you_orders b where b.id = any (p_ids) and not b.is_quote
    )
    select o.type, o.id, o.thoi_gian, o.ngay_du_kien, o.ten_hang, o.ten_khach_hang, o.sdt_khach_hang,
           o.dia_chi_khach_hang, o.customer_id, c.name, o.quy_cach, o.quy_cach_mm, o.quy_cach_m, o.quy_cach_mic,
           o.mau_sac, o.mau_keo, o.so_luong, o.don_gia_ban, o.thanh_tien_ban, o.vat_percent, o.vat, o.tien_coc,
           o.cong_no_khach, o.da_giao, o.da_tat_toan,
           public.order_hide_money(jsonb_build_object('quote_items', o.quote_items)) -> 'quote_items',
           o.loai_truc, o.ten_truc, o.truc_chu_vi, o.truc_so_luong, o.truc_gia_ban, o.truc_thanh_tien_ban,
           o.truc_vat_percent, o.truc_vat
      from o
      left join public.customers c on c.id = o.customer_id
     order by array_position(p_ids, o.id);
end;
$$;

-- Excel export of the list (thongke.js statsDetailColumnsMap): the full rows of up to 200 orders of
-- one type, as jsonb, money hidden without orders.money. Same data admin_order_get returns per order.
create or replace function public.admin_orders_rows(p_type text, p_ids text[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_out jsonb;
begin
  if not public.has_perm('orders.view') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) > 200 then
    raise exception 'too many ids (max 200)' using errcode = '22023';
  end if;
  execute format('select coalesce(jsonb_agg(public.order_hide_money(to_jsonb(o))), ''[]''::jsonb)
                    from public.%I o where o.id = any ($1)', (select tbl from public.order_type_meta(p_type)))
    into v_out using p_ids;
  return v_out;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Attachments (public.order_attachments, electron/db/writeActions.js attachment.*)
-- ---------------------------------------------------------------------------
-- Newest first, no data.
create or replace function public.admin_order_attachments(p_type text, p_id text)
returns table (id integer, file_name text, content_type text, file_size integer, created_at timestamp)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.has_perm('orders.view') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  perform public.order_type_meta(p_type);
  return query
    select a.id::integer, a.file_name::text, a.content_type::text, a.file_size::integer, a.created_at::timestamp
      from public.order_attachments a
     where a.order_type = p_type and a.order_id = p_id
     order by a.created_at desc, a.id desc;
end;
$$;

-- One file with its content as base64 (one line, no newlines). P0002 when missing.
create or replace function public.admin_order_attachment_get(p_attachment_id integer)
returns table (id integer, order_type text, order_id text, file_name text, content_type text,
               file_size integer, base64_data text)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.has_perm('orders.view') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  return query
    select a.id::integer, a.order_type::text, a.order_id::text, a.file_name::text, a.content_type::text,
           a.file_size::integer, translate(encode(a.data, 'base64'), E'\n', '')
      from public.order_attachments a where a.id = p_attachment_id;
  if not found then
    raise exception 'attachment not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Adds a file (base64) to an existing order or quote. Max 25 MB decoded (the app's limit); file_size
-- is the decoded size. Returns the new attachment id.
create or replace function public.admin_order_attachment_add(p_type text, p_id text, p_file_name text,
                                                             p_content_type text, p_base64 text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tbl  text;
  v_data bytea;
  v_name text := nullif(btrim(coalesce(p_file_name, '')), '');
  v_ok   boolean;
  v_id   integer;
begin
  if not public.has_perm('orders.edit') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  v_tbl := (select tbl from public.order_type_meta(p_type));
  if v_name is null or char_length(v_name) > 255 or char_length(coalesce(p_content_type, '')) > 255 then
    raise exception 'file_name (1-255) and content_type (max 255) required' using errcode = '22023';
  end if;
  -- base64 of 25 MB is 34 952 536 characters (+ line breaks some encoders add)
  if p_base64 is null or length(p_base64) > 36000000 then
    raise exception 'file too large (max 25 MB)' using errcode = '22023';
  end if;
  begin
    v_data := decode(p_base64, 'base64');
  exception when others then
    raise exception 'data is not base64' using errcode = '22023';
  end;
  if octet_length(v_data) > 25 * 1024 * 1024 then
    raise exception 'file too large (max 25 MB)' using errcode = '22023';
  end if;
  execute format('select exists (select 1 from public.%I where id = $1)', v_tbl) into v_ok using p_id;
  if not v_ok then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  -- Files live in the database and can be emailed out: at most 20 files / 100 MB per order.
  if (select count(*) >= 20 or coalesce(sum(a.file_size), 0) + octet_length(v_data) > 100 * 1024 * 1024
        from public.order_attachments a where a.order_type = p_type and a.order_id = p_id) then
    raise exception 'too many attachments (max 20 files, 100 MB per order)' using errcode = '22023';
  end if;
  insert into public.order_attachments (order_type, order_id, file_name, content_type, file_size, data)
  values (p_type, p_id, v_name, nullif(btrim(coalesce(p_content_type, '')), ''), octet_length(v_data), v_data)
  returning order_attachments.id into v_id;
  return v_id;
end;
$$;

-- Returns 1 when deleted, 0 when there was no such attachment.
create or replace function public.admin_order_attachment_delete(p_attachment_id integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  if not public.has_perm('orders.edit') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  delete from public.order_attachments where id = p_attachment_id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Indexes (list date filters / sort). The 0025 tables exist locally only when 0025 made them.
-- ---------------------------------------------------------------------------
create index if not exists bang_keo_in_orders_thoi_gian_idx on public.bang_keo_in_orders (thoi_gian desc);
do $$
declare
  t text;
begin
  foreach t in array array['bang_keo_orders', 'truc_in_orders'] loop
    if to_regclass('public.' || t) is not null then
      execute format('create index if not exists %I on public.%I (thoi_gian desc)', t || '_thoi_gian_idx', t);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Privileges
-- ---------------------------------------------------------------------------
revoke all on function public.order_hide_money(jsonb) from public, anon, authenticated;
revoke all on function public.order_strip_money_input(jsonb) from public, anon, authenticated;
revoke all on function public.admin_orders_filtered(jsonb, text) from public, anon, authenticated;

revoke all on function public.has_perm(text) from public, anon;
revoke all on function public.admin_orders_list(jsonb, text) from public, anon;
revoke all on function public.admin_orders_totals(jsonb, text) from public, anon;
revoke all on function public.admin_orders_for_export(text[]) from public, anon;
revoke all on function public.admin_orders_rows(text, text[]) from public, anon;
revoke all on function public.admin_order_attachments(text, text) from public, anon;
revoke all on function public.admin_order_attachment_get(integer) from public, anon;
revoke all on function public.admin_order_attachment_add(text, text, text, text, text) from public, anon;
revoke all on function public.admin_order_attachment_delete(integer) from public, anon;
grant execute on function public.has_perm(text) to authenticated;
grant execute on function public.admin_orders_list(jsonb, text) to authenticated;
grant execute on function public.admin_orders_totals(jsonb, text) to authenticated;
grant execute on function public.admin_orders_for_export(text[]) to authenticated;
grant execute on function public.admin_orders_rows(text, text[]) to authenticated;
grant execute on function public.admin_order_attachments(text, text) to authenticated;
grant execute on function public.admin_order_attachment_get(integer) to authenticated;
grant execute on function public.admin_order_attachment_add(text, text, text, text, text) to authenticated;
grant execute on function public.admin_order_attachment_delete(integer) to authenticated;
