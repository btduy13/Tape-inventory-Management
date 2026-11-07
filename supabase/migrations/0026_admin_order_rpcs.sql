-- 0026_admin_order_rpcs
-- Admin order RPCs generic over the four order types (docs/plans/2026-11-07-orders-web-parity.md, DB-1).
-- Tests: supabase/tests/rls/17_orders_parity.test.sql (+ 16 for the printed-tape paths)
--
-- p_type (whitelist, order_type_meta):  bang_keo_in -> bang_keo_in_orders (ids BK-MM-YY-NNN)
--                                       bang_keo    -> bang_keo_orders    (B-MM-YY-NNN)
--                                       truc_in     -> truc_in_orders     (TI-MM-YY-NNN)
--                                       thank_you   -> thank_you_orders   (TY-MM-YY-NNN, table from 0027)
--   quotes (is_quote) use the same table with the prefix BG-<prefix>, like the desktop app.
-- Table names never come from input: order_type_meta maps the whitelisted key to a constant name
-- (and the debt SQL of electron/js/orderMath.js customerDebtSqlExpression / supplierDebtSqlExpression).
--
-- Money is recomputed in SQL on create / update (order_compute), identical to orderMath.js:
--   bang_keo_in  calculatePrintedTape (0024 admin_order_create)
--   bang_keo / truc_in  calculateStandardOrder (cost = don_gia_goc, no deposit)
--   thank_you    calculateStandardOrder with cost = don_gia_von and deposit tien_coc
--   cong_no_khach / cong_no_ncc = 0 when da_tat_toan, else the orderMath debt expression.
-- Every RPC is admin only (is_admin), SECURITY DEFINER, search_path ''. Helpers are internal.
--
-- RPCs
--   admin_orders_list(p_filter jsonb, p_type text)          rows + totals (window columns)
--   admin_order_get(p_id text, p_type text)                 jsonb
--   admin_order_create(p_payload jsonb, p_type text, p_is_quote boolean)  -> (order_id, job_id)
--   admin_order_update(p_type text, p_id text, p_payload jsonb)           -> jsonb (row)
--   admin_order_set_status(p_type text, p_ids text[], p_da_giao boolean, p_da_tat_toan boolean) -> integer
--   admin_order_delete(p_type text, p_ids text[], p_quote_only boolean)   -> integer
--   admin_quote_convert(p_type text, p_id text, p_ngay_du_kien date)      -> text (new id)
--   admin_order_send_to_workshop(p_id text, p_workshop_user_id uuid)      -> uuid (job id)
--   admin_order_name_suggest(p_type text, p_q text)                       -> setof text
--   admin_order_latest_by_name(p_type text, p_name text)                  -> jsonb | null
-- The 0024 signatures admin_orders_list(jsonb) / admin_order_get(text) / admin_order_create(jsonb)
-- are replaced; the new p_type / p_is_quote parameters default to the old behaviour, so existing
-- named-argument calls ({p_filter}, {p_id}, {p_payload}) keep working.

-- ---------------------------------------------------------------------------
-- 1. Internal helpers
-- ---------------------------------------------------------------------------
create or replace function public.order_type_meta(p_type text)
returns table (tbl text, prefix text, customer_debt text, supplier_debt text)
language plpgsql
immutable
set search_path = ''
as $$
begin
  case p_type
    when 'bang_keo_in' then
      return query select 'bang_keo_in_orders'::text, 'BK'::text,
        'greatest(coalesce(thanh_tien_ban, 0) + case when loai_truc = ''moi'' then coalesce(truc_thanh_tien_ban, 0) + coalesce(truc_vat, 0) else 0 end + coalesce(vat, 0) - coalesce(tien_coc, 0), 0)'::text,
        'greatest(coalesce(thanh_tien_goc, 0) + case when loai_truc = ''moi'' then coalesce(truc_thanh_tien_goc, 0) else 0 end, 0)'::text;
    when 'bang_keo' then
      return query select 'bang_keo_orders'::text, 'B'::text,
        'greatest(coalesce(thanh_tien_ban, 0) + coalesce(vat, 0), 0)'::text,
        'greatest(coalesce(thanh_tien, 0), 0)'::text;
    when 'truc_in' then
      return query select 'truc_in_orders'::text, 'TI'::text,
        'greatest(coalesce(thanh_tien_ban, 0) + coalesce(vat, 0), 0)'::text,
        'greatest(coalesce(thanh_tien_goc, 0), 0)'::text;
    when 'thank_you' then
      return query select 'thank_you_orders'::text, 'TY'::text,
        'greatest(coalesce(thanh_tien_ban, 0) + coalesce(vat, 0) - coalesce(tien_coc, 0), 0)'::text,
        'greatest(coalesce(thanh_tien_von, 0), 0)'::text;
    else
      raise exception 'unknown order type %', left(coalesce(p_type, 'null'), 32) using errcode = '22023';
  end case;
end;
$$;

-- Editable input fields per type (create and update). Money results are never accepted from the
-- caller: order_compute derives them. = electron/db/orderColumns.js INSERT_COLUMNS minus
-- UPDATE_EXCLUDED minus the computed columns.
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

-- Money of one order row (merged jsonb: stored row || cleaned payload). Returns the computed and
-- normalized columns; raises 22023 on missing required inputs. Same numbers as orderMath.js.
create or replace function public.order_compute(p_type text, r jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_qty     numeric := greatest(coalesce((r ->> 'so_luong')::numeric, 0), 0);
  v_sale_p  numeric := greatest(coalesce((r ->> 'don_gia_ban')::numeric, 0), 0);
  v_comm_p  numeric := least(greatest(coalesce((r ->> 'hoa_hong')::numeric, 0), 0), 100);
  v_vat_p   numeric := least(greatest(coalesce((r ->> 'vat_percent')::numeric, 0), 0), 100);
  v_ship    numeric := round(greatest(coalesce((r ->> 'tien_ship')::numeric, 0), 0));
  v_dep     numeric := round(greatest(coalesce((r ->> 'tien_coc')::numeric, 0), 0));
  v_settled boolean := coalesce((r ->> 'da_tat_toan')::boolean, false);
  v_len numeric; v_rolls numeric; v_cost_p numeric;
  v_cost numeric; v_sale numeric; v_profit numeric; v_comm numeric; v_net numeric; v_vat numeric;
  v_axis boolean;
  v_aqty numeric; v_acost_p numeric; v_asale_p numeric; v_acomm_p numeric; v_avat_p numeric;
  v_acost numeric := 0; v_asale numeric := 0; v_aprofit numeric := 0; v_acomm numeric := 0;
  v_anet numeric := 0; v_avat numeric := 0;
  v_out jsonb;
begin
  if nullif(btrim(r ->> 'ten_hang'), '') is null or nullif(btrim(r ->> 'ten_khach_hang'), '') is null
     or v_qty <= 0 or v_sale_p <= 0 then
    raise exception 'ten_hang, ten_khach_hang, so_luong and don_gia_ban are required' using errcode = '22023';
  end if;

  if p_type = 'bang_keo_in' then
    v_len   := greatest(coalesce((r ->> 'quy_cach_m')::numeric, 0), 0);
    v_rolls := greatest(coalesce((r ->> 'cuon_cay')::numeric, 0), 0);
    if v_len <= 0 or v_rolls <= 0 then
      raise exception 'quy_cach_m and cuon_cay must be greater than 0' using errcode = '22023';
    end if;
    v_cost_p := (greatest(coalesce((r ->> 'don_gia_von')::numeric, 0), 0)
               + greatest(coalesce((r ->> 'phi_sl')::numeric, 0), 0)
               + greatest(coalesce((r ->> 'phi_keo')::numeric, 0), 0)
               + greatest(coalesce((r ->> 'phi_mau')::numeric, 0), 0)
               + greatest(coalesce((r ->> 'phi_size')::numeric, 0), 0)
               + greatest(coalesce((r ->> 'phi_cat')::numeric, 0), 0)) / 90 * v_len / v_rolls;
  elsif p_type in ('bang_keo', 'truc_in') then
    v_cost_p := greatest(coalesce((r ->> 'don_gia_goc')::numeric, 0), 0);
    if v_cost_p <= 0 then
      raise exception 'don_gia_goc is required' using errcode = '22023';
    end if;
  elsif p_type = 'thank_you' then
    v_cost_p := greatest(coalesce((r ->> 'don_gia_von')::numeric, 0), 0);
  else
    perform public.order_type_meta(p_type);
  end if;

  -- orderMath.calculateLine
  v_cost   := round(v_qty * v_cost_p);
  v_sale   := round(v_qty * v_sale_p);
  v_profit := v_sale - v_cost;
  v_comm   := round(greatest(v_profit, 0) * v_comm_p / 100);
  v_net    := v_profit - v_comm - v_ship;
  v_vat    := round(v_sale * v_vat_p / 100);

  v_out := jsonb_build_object(
    'thanh_tien_ban', v_sale, 'loi_nhuan', v_profit, 'hoa_hong', v_comm_p, 'tien_hoa_hong', v_comm,
    'tien_ship', v_ship, 'loi_nhuan_rong', v_net, 'vat', v_vat, 'vat_percent', v_vat_p);

  if p_type = 'bang_keo_in' then
    if coalesce(nullif(r ->> 'loai_truc', ''), 'cu') not in ('cu', 'moi') then
      raise exception 'loai_truc must be cu or moi' using errcode = '22023';
    end if;
    v_axis := r ->> 'loai_truc' = 'moi';
    if v_axis then
      v_aqty    := greatest(coalesce((r ->> 'truc_so_luong')::numeric, 0), 0);
      v_acost_p := greatest(coalesce((r ->> 'truc_gia_goc')::numeric, 0), 0);
      v_asale_p := greatest(coalesce((r ->> 'truc_gia_ban')::numeric, 0), 0);
      v_acomm_p := least(greatest(coalesce((r ->> 'truc_hoa_hong')::numeric, 0), 0), 100);
      v_avat_p  := least(greatest(coalesce((r ->> 'truc_vat_percent')::numeric, 0), 0), 100);
      if nullif(btrim(r ->> 'ten_truc'), '') is null or v_aqty <= 0 or v_acost_p <= 0 or v_asale_p <= 0 then
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
    return v_out || jsonb_build_object(
      'don_gia_goc', v_cost_p, 'thanh_tien_goc', v_cost, 'tien_coc', v_dep,
      'loai_truc', case when v_axis then 'moi' else 'cu' end,
      'ten_truc', case when v_axis then r -> 'ten_truc' end,
      'truc_chu_vi', case when v_axis then r -> 'truc_chu_vi' end,
      'truc_so_luong', case when v_axis then v_aqty else 0 end,
      'truc_gia_goc', case when v_axis then v_acost_p else 0 end,
      'truc_gia_ban', case when v_axis then v_asale_p else 0 end,
      'truc_vat_percent', case when v_axis then v_avat_p else 0 end,
      'truc_ctv', case when v_axis then r -> 'truc_ctv' end,
      'truc_hoa_hong', case when v_axis then v_acomm_p else 0 end,
      'truc_thanh_tien_goc', v_acost, 'truc_thanh_tien_ban', v_asale, 'truc_vat', v_avat,
      'truc_tien_hoa_hong', v_acomm, 'truc_loi_nhuan', v_aprofit, 'truc_loi_nhuan_rong', v_anet,
      'cong_no_khach', case when v_settled then 0 else greatest(v_sale + v_vat + v_asale + v_avat - v_dep, 0) end,
      'cong_no_ncc', case when v_settled then 0 else greatest(v_cost + v_acost, 0) end);
  elsif p_type = 'thank_you' then
    return v_out || jsonb_build_object(
      'thanh_tien_von', v_cost, 'tien_coc', v_dep,
      'cong_no_khach', case when v_settled then 0 else greatest(v_sale + v_vat - v_dep, 0) end,
      'cong_no_ncc', case when v_settled then 0 else greatest(v_cost, 0) end);
  else
    return v_out || jsonb_build_object(
      case when p_type = 'bang_keo' then 'thanh_tien' else 'thanh_tien_goc' end, v_cost,
      'cong_no_khach', case when v_settled then 0 else greatest(v_sale + v_vat, 0) end,
      'cong_no_ncc', case when v_settled then 0 else greatest(v_cost, 0) end);
  end if;
end;
$$;

-- Next id PREFIX-MM-YY-NNN (numeric max + 1, 3-digit pad), month of p_at (default: now, Vietnam).
-- Same algorithm as next_bang_keo_in_order_id / orderMath.nextOrderId; the desktop app does not
-- take the lock, so writers retry on unique_violation.
create or replace function public.next_order_id(p_type text, p_quote boolean default false,
                                                p_at timestamp default null)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  m        record;
  v_prefix text;
  v_max    integer;
begin
  select * into m from public.order_type_meta(p_type);
  v_prefix := case when p_quote then 'BG-' else '' end || m.prefix || '-'
              || to_char(coalesce(p_at, now() at time zone 'Asia/Ho_Chi_Minh'), 'MM-YY') || '-';
  perform pg_advisory_xact_lock(hashtext(m.tbl || '.id'));
  execute format(
    'select coalesce(max(substring(id from %1$s)::integer), 0) from public.%2$I
      where id like $1 and substring(id from %1$s) ~ ''^\d{1,9}$''',
    length(v_prefix) + 1, m.tbl)
    into v_max using v_prefix || '%';
  -- lpad truncates: keep every digit past 999 (orderMath padStart does not cut either).
  return v_prefix || lpad((v_max + 1)::text, greatest(3, length((v_max + 1)::text)), '0');
end;
$$;

-- Writes a jsonb row: INSERT (p_id null) or UPDATE ... WHERE id = p_id. Column names are the keys of
-- p_row, which callers build only from order_fields / order_compute / fixed names.
create or replace function public.order_write(p_type text, p_row jsonb, p_id text default null)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_tbl  text := (select tbl from public.order_type_meta(p_type));
  v_cols text;
  v_n    integer;
begin
  select string_agg(quote_ident(k), ', ') into v_cols from jsonb_object_keys(p_row) k;
  if p_id is null then
    execute format('insert into public.%1$I (%2$s) select %2$s from jsonb_populate_record(null::public.%1$I, $1)',
                   v_tbl, v_cols) using p_row;
  else
    execute format('update public.%1$I t set (%2$s) = (select %2$s from jsonb_populate_record(null::public.%1$I, $1)) where t.id = $2',
                   v_tbl, v_cols) using p_row, p_id;
  end if;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. List (one or all types) with totals
-- ---------------------------------------------------------------------------
-- p_type: bang_keo_in | bang_keo | truc_in | thank_you | all.
-- p_filter (all optional): q (id / product / customer / phone), is_quote (bool, default false),
--   step (production_step or 'none' = no job; BKI only has jobs), delivered, settled (bool),
--   due ('overdue' = not delivered and ngay_du_kien < today, 'soon' = not delivered and due within
--   3 days, like the app's stats.warningMetrics), date_from / date_to ('YYYY-MM-DD', order date),
--   sort (thoi_gian | ngay_du_kien | id | ten_hang | ten_khach_hang | so_luong | tong_tien |
--   cong_no_khach | loi_nhuan_rong; default thoi_gian), dir (asc | desc; default desc),
--   limit (1-200, default 50), offset.
-- Totals over the whole filtered set (not just the page) are repeated on every row, like
-- total_count: sum_tong_tien, sum_cong_no_khach (unsettled), sum_cong_no_ncc (unsettled),
-- sum_loi_nhuan_rong, count_due_soon, count_overdue.
-- tong_tien / tien_von / loi_nhuan_rong include the new axis of a printed-tape order.
drop function if exists public.admin_orders_list(jsonb);
create or replace function public.admin_orders_list(p_filter jsonb default '{}'::jsonb,
                                                    p_type text default 'bang_keo_in')
returns table (
  type                text,
  id                  text,
  thoi_gian           timestamp,
  ngay_du_kien        date,
  ten_hang            text,
  quy_cach            text,
  mau_sac             text,
  ten_khach_hang      text,
  sdt_khach_hang      text,
  dia_chi_khach_hang  text,
  so_luong            numeric,
  don_gia_ban         numeric,
  thanh_tien_ban      numeric,
  vat                 numeric,
  tong_tien           numeric,
  tien_coc            numeric,
  cong_no_khach       numeric,
  cong_no_ncc         numeric,
  tien_von            numeric,
  loi_nhuan_rong      numeric,
  ctv                 text,
  da_giao             boolean,
  da_tat_toan         boolean,
  da_gui_email        boolean,
  is_quote            boolean,
  has_quote_items     boolean,
  job_id              uuid,
  step                public.production_step,
  workshop_user_id    uuid,
  workshop_user_name  text,
  lead_id             uuid,
  total_count         bigint,
  sum_tong_tien       numeric,
  sum_cong_no_khach   numeric,
  sum_cong_no_ncc     numeric,
  sum_loi_nhuan_rong  numeric,
  count_due_soon      bigint,
  count_overdue       bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_f      jsonb := coalesce(p_filter, '{}'::jsonb);
  v_type   text := coalesce(p_type, 'all');
  v_q      text;
  v_quote  boolean := false;
  v_step   text;
  v_deliv  boolean;
  v_settl  boolean;
  v_due    text;
  v_from   date;
  v_to     date;
  v_sort   text;
  v_asc    boolean;
  v_limit  integer;
  v_offset integer;
  v_today  date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
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
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'invalid date filter' using errcode = '22023';
  end;
  v_sort := coalesce(public.order_payload_text(v_f, 'sort', 20), 'thoi_gian');
  if v_sort not in ('thoi_gian', 'ngay_du_kien', 'id', 'ten_hang', 'ten_khach_hang', 'so_luong',
                    'tong_tien', 'cong_no_khach', 'loi_nhuan_rong') then
    raise exception 'unknown sort %', v_sort using errcode = '22023';
  end if;
  v_asc := case coalesce(public.order_payload_text(v_f, 'dir', 4), 'desc')
             when 'asc' then true when 'desc' then false end;
  if v_asc is null then
    raise exception 'dir must be asc or desc' using errcode = '22023';
  end if;
  v_limit := least(greatest(coalesce(public.order_payload_num(v_f, 'limit'), 50), 1), 200)::integer;
  v_offset := greatest(coalesce(public.order_payload_num(v_f, 'offset'), 0), 0)::integer;
  if v_q is not null then
    v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
    with o as (
      select 'bang_keo_in'::text as type, b.id::text as id, b.thoi_gian::timestamp as thoi_gian,
             b.ngay_du_kien::date as ngay_du_kien, b.ten_hang::text as ten_hang,
             nullif(concat_ws(' x ', trim_scale(b.quy_cach_mm::numeric) || 'mm', trim_scale(b.quy_cach_m::numeric) || 'm',
                              trim_scale(b.quy_cach_mic::numeric) || 'mic'), '') as quy_cach,
             b.mau_sac::text as mau_sac, b.ten_khach_hang::text as ten_khach_hang,
             b.sdt_khach_hang::text as sdt_khach_hang, b.dia_chi_khach_hang::text as dia_chi_khach_hang,
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
             case when jsonb_typeof(b.quote_items) = 'array' then jsonb_array_length(b.quote_items) > 0 else false end as has_quote_items
        from public.bang_keo_in_orders b where v_type in ('all', 'bang_keo_in')
      union all
      select 'bang_keo', b.id::text, b.thoi_gian::timestamp, b.ngay_du_kien::date, b.ten_hang::text,
             b.quy_cach::text, b.mau_sac::text, b.ten_khach_hang::text, b.sdt_khach_hang::text,
             b.dia_chi_khach_hang::text, b.so_luong::numeric, coalesce(b.don_gia_ban, 0)::numeric,
             coalesce(b.thanh_tien_ban, 0)::numeric, coalesce(b.vat, 0)::numeric,
             (coalesce(b.thanh_tien_ban, 0) + coalesce(b.vat, 0))::numeric, 0::numeric,
             coalesce(b.cong_no_khach, 0)::numeric, coalesce(b.cong_no_ncc, 0)::numeric,
             coalesce(b.thanh_tien, 0)::numeric, coalesce(b.loi_nhuan_rong, 0)::numeric, b.ctv::text,
             coalesce(b.da_giao, false), coalesce(b.da_tat_toan, false), coalesce(b.da_gui_email, false),
             coalesce(b.is_quote, false),
             case when jsonb_typeof(b.quote_items) = 'array' then jsonb_array_length(b.quote_items) > 0 else false end
        from public.bang_keo_orders b where v_type in ('all', 'bang_keo')
      union all
      select 'truc_in', b.id::text, b.thoi_gian::timestamp, b.ngay_du_kien::date, b.ten_hang::text,
             b.quy_cach::text, b.mau_sac::text, b.ten_khach_hang::text, b.sdt_khach_hang::text,
             b.dia_chi_khach_hang::text, b.so_luong::numeric, coalesce(b.don_gia_ban, 0)::numeric,
             coalesce(b.thanh_tien_ban, 0)::numeric, coalesce(b.vat, 0)::numeric,
             (coalesce(b.thanh_tien_ban, 0) + coalesce(b.vat, 0))::numeric, 0::numeric,
             coalesce(b.cong_no_khach, 0)::numeric, coalesce(b.cong_no_ncc, 0)::numeric,
             coalesce(b.thanh_tien_goc, 0)::numeric, coalesce(b.loi_nhuan_rong, 0)::numeric, b.ctv::text,
             coalesce(b.da_giao, false), coalesce(b.da_tat_toan, false), coalesce(b.da_gui_email, false),
             coalesce(b.is_quote, false),
             case when jsonb_typeof(b.quote_items) = 'array' then jsonb_array_length(b.quote_items) > 0 else false end
        from public.truc_in_orders b where v_type in ('all', 'truc_in')
      union all
      select 'thank_you', b.id, b.thoi_gian, b.ngay_du_kien, b.ten_hang, b.kich_thuoc, b.mau_sac,
             b.ten_khach_hang, b.sdt_khach_hang, b.dia_chi_khach_hang, b.so_luong, coalesce(b.don_gia_ban, 0),
             coalesce(b.thanh_tien_ban, 0), coalesce(b.vat, 0), coalesce(b.thanh_tien_ban, 0) + coalesce(b.vat, 0),
             coalesce(b.tien_coc, 0), coalesce(b.cong_no_khach, 0), coalesce(b.cong_no_ncc, 0),
             coalesce(b.thanh_tien_von, 0), coalesce(b.loi_nhuan_rong, 0), b.ctv, b.da_giao, b.da_tat_toan,
             b.da_gui_email, b.is_quote, false
        from public.thank_you_orders b where v_type in ('all', 'thank_you')
    ), f as (
      select o.*, j.id as job_id, j.step, j.workshop_user_id, p.full_name as workshop_user_name, j.lead_id
        from o
        left join public.production_jobs j on o.type = 'bang_keo_in' and j.order_id = o.id
        left join public.profiles p on p.id = j.workshop_user_id
       where o.is_quote = v_quote
         and (v_q is null or o.id ilike v_q or o.ten_hang ilike v_q
              or o.ten_khach_hang ilike v_q or o.sdt_khach_hang ilike v_q)
         and (v_step is null or (v_step = 'none' and j.id is null) or j.step::text = v_step)
         and (v_deliv is null or o.da_giao = v_deliv)
         and (v_settl is null or o.da_tat_toan = v_settl)
         and (v_due is null
              or (v_due = 'overdue' and not o.da_giao and o.ngay_du_kien < v_today)
              or (v_due = 'soon' and not o.da_giao and o.ngay_du_kien between v_today and v_today + 3))
         and (v_from is null or o.thoi_gian::date >= v_from)
         and (v_to is null or o.thoi_gian::date <= v_to)
    )
    select f.type, f.id, f.thoi_gian, f.ngay_du_kien, f.ten_hang, f.quy_cach, f.mau_sac, f.ten_khach_hang,
           f.sdt_khach_hang, f.dia_chi_khach_hang, f.so_luong, f.don_gia_ban, f.thanh_tien_ban, f.vat,
           f.tong_tien, f.tien_coc, f.cong_no_khach, f.cong_no_ncc, f.tien_von, f.loi_nhuan_rong, f.ctv,
           f.da_giao, f.da_tat_toan, f.da_gui_email, f.is_quote, f.has_quote_items,
           f.job_id, f.step, f.workshop_user_id, f.workshop_user_name, f.lead_id,
           count(*) over (),
           sum(f.tong_tien) over (),
           sum(case when f.da_tat_toan then 0 else f.cong_no_khach end) over (),
           sum(case when f.da_tat_toan then 0 else f.cong_no_ncc end) over (),
           sum(f.loi_nhuan_rong) over (),
           count(*) filter (where not f.da_giao and f.ngay_du_kien between v_today and v_today + 3) over (),
           count(*) filter (where not f.da_giao and f.ngay_du_kien < v_today) over ()
      from f
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

-- ---------------------------------------------------------------------------
-- 3. Get one order
-- ---------------------------------------------------------------------------
-- { type, order: {...every column...}, job: {...} | null, steps: [...], delivery_notes: [...],
--   attachments: [{id, file_name, content_type, file_size, created_at}] }  (job / steps / notes: BKI only)
drop function if exists public.admin_order_get(text);
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
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
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
        from public.delivery_notes n where n.job_id = v_job.id), '[]'::jsonb),
    'attachments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'file_name', a.file_name, 'content_type', a.content_type,
               'file_size', a.file_size, 'created_at', a.created_at) order by a.created_at desc)
        from public.order_attachments a where a.order_type = p_type and a.order_id = p_id), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Create (order or quote)
-- ---------------------------------------------------------------------------
-- Payload: order_fields(p_type) keys, plus workshop_user_id / production_note (printed-tape orders
-- only: set on the job the order trigger creates). ngay_du_kien is required for an order; a quote
-- defaults it to today (the app does the same). Money is recomputed (order_compute).
drop function if exists public.admin_order_create(jsonb);
create or replace function public.admin_order_create(p_payload jsonb, p_type text default 'bang_keo_in',
                                                     p_is_quote boolean default false)
returns table (order_id text, job_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_quote  boolean := coalesce(p_is_quote, false);
  v_row    jsonb;
  v_id     text;
  v_user   uuid;
  v_note   text;
  v_job    public.production_jobs;
  v_now_vn timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
  v_try    integer := 0;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  v_row := public.order_clean_payload(p_type, p_payload, array['workshop_user_id', 'production_note']);

  if (v_row ? 'workshop_user_id' or v_row ? 'production_note') and (p_type <> 'bang_keo_in' or v_quote) then
    raise exception 'workshop_user_id / production_note are for printed-tape orders only' using errcode = '22023';
  end if;
  if jsonb_typeof(v_row -> 'workshop_user_id') = 'string' then
    begin
      v_user := (v_row ->> 'workshop_user_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'invalid workshop_user_id' using errcode = '22023';
    end;
    if not exists (select 1 from public.profiles where id = v_user and is_active and role = 'workshop') then
      raise exception 'assignee must be an active workshop user' using errcode = '22023';
    end if;
  elsif v_row ? 'workshop_user_id' and jsonb_typeof(v_row -> 'workshop_user_id') <> 'null' then
    raise exception 'invalid workshop_user_id' using errcode = '22023';
  end if;
  v_note := public.order_payload_text(v_row, 'production_note', 2000);
  v_row := v_row - 'workshop_user_id' - 'production_note';

  if v_row ->> 'ngay_du_kien' is null then
    if not v_quote then
      raise exception 'ngay_du_kien is required' using errcode = '22023';
    end if;
    v_row := v_row || jsonb_build_object('ngay_du_kien', v_now_vn::date);
  end if;
  v_row := v_row || jsonb_build_object('thoi_gian', v_now_vn, 'is_quote', v_quote,
                                       'da_giao', false, 'da_tat_toan', false, 'da_gui_email', false);
  v_row := v_row || public.order_compute(p_type, v_row);

  -- The desktop app picks ids without the advisory lock: retry on a duplicate id.
  loop
    v_try := v_try + 1;
    v_id := public.next_order_id(p_type, v_quote);
    begin
      perform public.order_write(p_type, v_row || jsonb_build_object('id', v_id));
      exit;
    exception when unique_violation then
      if v_try >= 5 then
        raise;
      end if;
    end;
  end loop;

  if p_type = 'bang_keo_in' and not v_quote then
    select * into v_job from public.production_jobs where production_jobs.order_id = v_id for update;
    if v_job.id is not null and (v_user is not null or v_note is not null) then
      update public.production_jobs
         set workshop_user_id = coalesce(v_user, workshop_user_id),
             assigned_at      = case when v_user is not null then now() else assigned_at end,
             production_note  = coalesce(v_note, production_note)
       where id = v_job.id
      returning * into v_job;
    end if;
  end if;

  return query select v_id, v_job.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Update (orders and quotes)
-- ---------------------------------------------------------------------------
-- Payload: any subset of order_fields(p_type) (id, thoi_gian and the status flags have their own
-- RPCs, like UPDATE_EXCLUDED in orderColumns.js). The merged row is recomputed, debt included.
-- An order converted from a multi-size quote (non-empty quote_items) keeps its money: only
-- ten_hang, ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang and ngay_du_kien may change
-- (app.js configureStructuredOrderEdit). Returns the updated row.
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
  if nullif(btrim(v_merge ->> 'ten_hang'), '') is null or nullif(btrim(v_merge ->> 'ten_khach_hang'), '') is null
     or v_merge ->> 'ngay_du_kien' is null then
    raise exception 'ten_hang, ten_khach_hang and ngay_du_kien are required' using errcode = '22023';
  end if;

  if (case when jsonb_typeof(v_old -> 'quote_items') = 'array' then jsonb_array_length(v_old -> 'quote_items') > 0 else false end) then
    select k into v_bad from jsonb_object_keys(v_clean) k
     where k not in ('ten_hang', 'ten_khach_hang', 'sdt_khach_hang', 'dia_chi_khach_hang', 'ngay_du_kien')
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

-- ---------------------------------------------------------------------------
-- 6. Status (bulk, atomic)
-- ---------------------------------------------------------------------------
-- One UPDATE for every id (orders only, not quotes). A null flag is left as is. Debt follows the
-- settled flag (writeActions.js settlementUpdateSql). Ticking da_giao on a printed-tape order fires
-- the production trigger (job -> da_giao), as from the app. Returns the number of rows changed.
create or replace function public.admin_order_set_status(p_type text, p_ids text[],
                                                         p_da_giao boolean default null,
                                                         p_da_tat_toan boolean default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  m   record;
  v_n integer;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into m from public.order_type_meta(p_type);
  if p_da_giao is null and p_da_tat_toan is null then
    raise exception 'nothing to change' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_ids), 0) = 0 then
    return 0;
  end if;
  if cardinality(p_ids) > 500 then
    raise exception 'too many ids (max 500)' using errcode = '22023';
  end if;
  execute format(
    'update public.%1$I
        set da_giao       = coalesce($1, da_giao),
            da_tat_toan   = coalesce($2, da_tat_toan),
            cong_no_khach = case when coalesce($2, da_tat_toan, false) then 0 else %2$s end,
            cong_no_ncc   = case when coalesce($2, da_tat_toan, false) then 0 else %3$s end
      where id = any ($3) and not coalesce(is_quote, false)',
    m.tbl, m.customer_debt, m.supplier_debt)
    using p_da_giao, p_da_tat_toan, p_ids;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Delete (orders / quotes) with their attachments
-- ---------------------------------------------------------------------------
-- p_quote_only: delete only rows that are quotes (the quote list). The printed-tape trigger removes
-- or detaches the workshop job. Returns the number of orders deleted.
create or replace function public.admin_order_delete(p_type text, p_ids text[], p_quote_only boolean default false)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  m     record;
  v_ids text[];
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into m from public.order_type_meta(p_type);
  if coalesce(cardinality(p_ids), 0) = 0 then
    return 0;
  end if;
  if cardinality(p_ids) > 500 then
    raise exception 'too many ids (max 500)' using errcode = '22023';
  end if;
  execute format(
    'with d as (delete from public.%I where id = any ($1) and (not $2 or coalesce(is_quote, false)) returning id)
     select array_agg(id::text) from d', m.tbl)
    into v_ids using p_ids, coalesce(p_quote_only, false);
  -- Ids are reused (numeric max + 1): attachments must go with the order (orderMath.nextOrderId).
  delete from public.order_attachments where order_type = p_type and order_id = any (coalesce(v_ids, '{}'));
  return coalesce(cardinality(v_ids), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Quote -> order
-- ---------------------------------------------------------------------------
-- New id (retry on a duplicate), order date now, delivery date from the caller, flags reset, debt
-- recomputed, attachments moved (writeActions.js quoteConversionSql / quote.moveAttachments).
-- A printed-tape quote gets its workshop job from the order trigger (is_quote true -> false).
create or replace function public.admin_quote_convert(p_type text, p_id text, p_ngay_du_kien date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  m      record;
  v_new  text;
  v_n    integer;
  v_try  integer := 0;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into m from public.order_type_meta(p_type);
  if p_ngay_du_kien is null then
    raise exception 'ngay_du_kien is required' using errcode = '22023';
  end if;
  loop
    v_try := v_try + 1;
    v_new := public.next_order_id(p_type, false);
    begin
      execute format(
        'update public.%1$I
            set id = $1, is_quote = false, thoi_gian = $2, ngay_du_kien = $3,
                da_giao = false, da_tat_toan = false, cong_no_khach = %2$s, cong_no_ncc = %3$s
          where id = $4 and is_quote = true',
        m.tbl, m.customer_debt, m.supplier_debt)
        using v_new, now() at time zone 'Asia/Ho_Chi_Minh', p_ngay_du_kien, p_id;
      get diagnostics v_n = row_count;
      exit;
    exception when unique_violation then
      if v_try >= 5 then
        raise;
      end if;
    end;
  end loop;
  if v_n = 0 then
    raise exception 'quote not found' using errcode = 'P0002';
  end if;
  update public.order_attachments set order_id = v_new where order_type = p_type and order_id = p_id;
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Send a printed-tape order without a job to the workshop
-- ---------------------------------------------------------------------------
-- For orders the trigger never saw (legacy "Chưa vào xưởng"). Same job as the trigger would make:
-- cho_san_xuat, due date = ngay_du_kien; assignee = p_workshop_user_id (active workshop user) or the
-- single active workshop user, else none. Returns the job id.
create or replace function public.admin_order_send_to_workshop(p_id text, p_workshop_user_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.bang_keo_in_orders;
  v_user  uuid := p_workshop_user_id;
  v_job   uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into v_order from public.bang_keo_in_orders where id = p_id for update;
  if v_order.id is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if coalesce(v_order.is_quote, false) or coalesce(v_order.da_giao, false) then
    raise exception 'only an undelivered order can go to the workshop' using errcode = '22023';
  end if;
  if exists (select 1 from public.production_jobs where order_id = p_id) then
    raise exception 'order already has a workshop job' using errcode = '22023';
  end if;
  if v_user is not null then
    if not exists (select 1 from public.profiles where id = v_user and is_active and role = 'workshop') then
      raise exception 'assignee must be an active workshop user' using errcode = '22023';
    end if;
  else
    select case when count(*) = 1 then min(id::text)::uuid end into v_user
      from public.profiles where role = 'workshop' and is_active;
  end if;

  insert into public.production_jobs (
    order_id, workshop_user_id, step, due_date, assigned_at, converted_by, converted_at
  ) values (
    p_id, v_user, 'cho_san_xuat', v_order.ngay_du_kien,
    case when v_user is null then null else now() end, auth.uid(), now()
  ) returning id into v_job;
  insert into public.production_step_log (job_id, from_step, to_step, changed_by, changed_by_name, note)
  values (v_job, null, 'cho_san_xuat', auth.uid(),
          (select full_name from public.profiles where id = auth.uid()), 'Đưa vào xưởng từ web');
  return v_job;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Product name autocomplete (readActions.js order.suggestNames / order.latestByName)
-- ---------------------------------------------------------------------------
create or replace function public.admin_order_name_suggest(p_type text, p_q text)
returns setof text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tbl text;
  v_q   text := left(coalesce(p_q, ''), 200);
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  v_tbl := (select tbl from public.order_type_meta(p_type));
  return query execute format(
    'select ten_hang::text from public.%I
      where ten_hang ilike $1 and not coalesce(is_quote, false)
      group by ten_hang order by max(thoi_gian) desc nulls last limit 8', v_tbl)
    using '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
end;
$$;

-- Latest real order whose product name equals p_name (case-insensitive), as the full row; null if none.
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
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
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
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Privileges
-- ---------------------------------------------------------------------------
revoke all on function public.order_type_meta(text) from public, anon, authenticated;
revoke all on function public.order_fields(text) from public, anon, authenticated;
revoke all on function public.order_clean_payload(text, jsonb, text[]) from public, anon, authenticated;
revoke all on function public.order_compute(text, jsonb) from public, anon, authenticated;
revoke all on function public.next_order_id(text, boolean, timestamp) from public, anon, authenticated;
revoke all on function public.order_write(text, jsonb, text) from public, anon, authenticated;

revoke all on function public.admin_orders_list(jsonb, text) from public, anon;
revoke all on function public.admin_order_get(text, text) from public, anon;
revoke all on function public.admin_order_create(jsonb, text, boolean) from public, anon;
revoke all on function public.admin_order_update(text, text, jsonb) from public, anon;
revoke all on function public.admin_order_set_status(text, text[], boolean, boolean) from public, anon;
revoke all on function public.admin_order_delete(text, text[], boolean) from public, anon;
revoke all on function public.admin_quote_convert(text, text, date) from public, anon;
revoke all on function public.admin_order_send_to_workshop(text, uuid) from public, anon;
revoke all on function public.admin_order_name_suggest(text, text) from public, anon;
revoke all on function public.admin_order_latest_by_name(text, text) from public, anon;
grant execute on function public.admin_orders_list(jsonb, text) to authenticated;
grant execute on function public.admin_order_get(text, text) to authenticated;
grant execute on function public.admin_order_create(jsonb, text, boolean) to authenticated;
grant execute on function public.admin_order_update(text, text, jsonb) to authenticated;
grant execute on function public.admin_order_set_status(text, text[], boolean, boolean) to authenticated;
grant execute on function public.admin_order_delete(text, text[], boolean) to authenticated;
grant execute on function public.admin_quote_convert(text, text, date) to authenticated;
grant execute on function public.admin_order_send_to_workshop(text, uuid) to authenticated;
grant execute on function public.admin_order_name_suggest(text, text) to authenticated;
grant execute on function public.admin_order_latest_by_name(text, text) to authenticated;
