-- 0032_quotes
-- Multi-size quotes of the web "Báo giá" page (docs/plans/2026-11-08-web-full-parity.md, Gói việc 5).
-- Same data as the desktop app (electron/js/modules/quotations.js buildQuoteItem / prepareQuoteItems):
-- quote_items = one item per size (printed tape: several new axes per size), row columns = the
-- aggregate (orderMath.calculateQuoteBundle). Every amount is recomputed here with order_compute,
-- never taken from the caller. Tests: supabase/tests/rls/21_quotes.test.sql
--
--   admin_quote_save(p_type, p_header jsonb, p_items jsonb, p_id text default null) -> quote id
--     p_type   bang_keo_in | bang_keo | truc_in (the app has no Thank you quote form)
--     p_header ten_hang, ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang, customer_id
--     p_items  1-20 sizes: order_fields(p_type) inputs of one size (no header / axis keys)
--              + axes: 0-20 x {ten_truc, truc_chu_vi, truc_so_luong, truc_gia_goc, truc_gia_ban,
--                truc_vat_percent, truc_ctv, truc_hoa_hong} (printed tape only)
--     p_id null: new quote (orders.create), id BG-..., ngay_du_kien = today.
--     p_id set:  overwrite that quote (orders.edit + orders.money: the sizes carry their costs);
--                thoi_gian / ngay_du_kien kept, like the app's quoteUpdateColumns.
--   admin_quotes_list(p_type default 'all', p_q, p_date_from, p_date_to) -> (type, quote jsonb)
--     orders.view; every quote row (to_jsonb, money hidden without orders.money), newest first per
--     type, at most 300 per type. Like the app's quote.list.
-- Convert and delete keep using admin_quote_convert / admin_order_delete(p_quote_only => true).

-- A quote size of plain tape / print axis may leave don_gia_goc at 0 (quotations.js prepareQuoteItems
-- checks only quantity and sale price; an axis still needs its cost, as in the app): order_compute
-- skips that check when the merged row carries quote_zero_cost = true.
do $$
declare
  v_def text := pg_get_functiondef('public.order_compute(text,jsonb)'::regprocedure);
  v_a   text := 'if v_cost_p <= 0 then';
begin
  if position('quote_zero_cost' in v_def) > 0 then
    return;
  end if;
  if position(v_a in v_def) = 0 then
    raise exception '0032: unexpected order_compute body';
  end if;
  execute replace(v_def, v_a, 'if v_cost_p <= 0 and not coalesce((r ->> ''quote_zero_cost'')::boolean, false) then');
end;
$$;

-- One size: {item: app quote item json, fields: cleaned inputs of the size}.
create or replace function public.quote_item_build(p_type text, p_header jsonb, p_item jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_bki   boolean := p_type = 'bang_keo_in';
  v_in    jsonb;
  v_f     jsonb;
  v_c     jsonb;
  v_ain   jsonb;
  v_ac    jsonb;
  v_axes  jsonb := '[]'::jsonb;
  v_bad   text;
  a       jsonb;
begin
  if p_item is null or jsonb_typeof(p_item) <> 'object' then
    raise exception 'each item must be an object' using errcode = '22023';
  end if;
  v_in := p_item - 'axes';
  select k into v_bad from jsonb_object_keys(v_in) k
   where k in ('ten_hang', 'ten_khach_hang', 'sdt_khach_hang', 'dia_chi_khach_hang', 'customer_id',
               'ngay_du_kien', 'loai_truc', 'ten_truc') or k like 'truc\_%'
   limit 1;
  if v_bad is not null then
    raise exception 'unknown item field %', left(v_bad, 64) using errcode = '22023';
  end if;
  v_f := public.order_strip_money_input(public.order_clean_payload(p_type, v_in));
  v_c := public.order_compute(p_type, p_header || v_f || '{"loai_truc": "cu", "quote_zero_cost": true}'::jsonb);

  if p_item ? 'axes' and jsonb_typeof(p_item -> 'axes') <> 'null' then
    if jsonb_typeof(p_item -> 'axes') <> 'array' or jsonb_array_length(p_item -> 'axes') > 20
       or (not v_bki and jsonb_array_length(p_item -> 'axes') > 0) then
      raise exception 'axes: printed tape only, at most 20 per size' using errcode = '22023';
    end if;
    for a in select value from jsonb_array_elements(p_item -> 'axes') loop
      if jsonb_typeof(a) <> 'object' then
        raise exception 'each axis must be an object' using errcode = '22023';
      end if;
      select k into v_bad from jsonb_object_keys(a) k where k <> 'ten_truc' and k not like 'truc\_%' limit 1;
      if v_bad is not null then
        raise exception 'unknown axis field %', left(v_bad, 64) using errcode = '22023';
      end if;
      v_ain := public.order_strip_money_input(public.order_clean_payload(p_type, a));
      -- quotations.js axisFromFields: calculateLine + VAT of the axis.
      v_ac := public.order_compute(p_type, p_header || v_f || v_ain || '{"loai_truc": "moi", "quote_zero_cost": true}'::jsonb);
      v_axes := v_axes || jsonb_build_array(jsonb_build_object(
        'name', v_ain -> 'ten_truc',
        'circumference', case when coalesce((v_ain ->> 'truc_chu_vi')::numeric, 0) <> 0 then v_ain -> 'truc_chu_vi' end,
        'quantity', v_ac -> 'truc_so_luong', 'costPrice', v_ac -> 'truc_gia_goc', 'unitPrice', v_ac -> 'truc_gia_ban',
        'costTotal', v_ac -> 'truc_thanh_tien_goc', 'total', v_ac -> 'truc_thanh_tien_ban',
        'vat', v_ac -> 'truc_vat', 'vatPercent', v_ac -> 'truc_vat_percent',
        'collaborator', coalesce(v_ain ->> 'truc_ctv', ''), 'commissionPercent', v_ac -> 'truc_hoa_hong',
        'commission', v_ac -> 'truc_tien_hoa_hong', 'profit', v_ac -> 'truc_loi_nhuan',
        'netProfit', v_ac -> 'truc_loi_nhuan_rong'));
    end loop;
  end if;

  return jsonb_build_object('fields', v_f, 'item', jsonb_build_object(
    'specification', case when v_bki then
        coalesce(v_f ->> 'quy_cach_mm', '-') || 'mm x ' || coalesce(v_f ->> 'quy_cach_m', '-') || 'm ('
        || coalesce(v_f ->> 'quy_cach_mic', '-') || 'mic)'
      else coalesce(v_f ->> 'quy_cach', '-') end,
    'quantity', v_f -> 'so_luong', 'unitPrice', v_f -> 'don_gia_ban',
    'total', v_c -> 'thanh_tien_ban',
    'costTotal', coalesce(v_c -> 'thanh_tien_goc', v_c -> 'thanh_tien'),
    'vat', v_c -> 'vat', 'vatPercent', v_c -> 'vat_percent',
    'deposit', case when v_bki then v_c -> 'tien_coc' else '0'::jsonb end,
    'shipping', v_c -> 'tien_ship', 'commission', v_c -> 'tien_hoa_hong',
    'profit', v_c -> 'loi_nhuan', 'netProfit', v_c -> 'loi_nhuan_rong',
    'axes', v_axes,
    'details', case when v_bki then jsonb_build_object(
        'mm', v_f -> 'quy_cach_mm', 'm', v_f -> 'quy_cach_m', 'mic', v_f -> 'quy_cach_mic',
        'rollsPerTree', v_f -> 'cuon_cay', 'glueColor', v_f -> 'mau_keo', 'printColor', v_f -> 'mau_sac',
        'paperCore', v_f -> 'loi_giay', 'packaging', v_f -> 'thung_bao')
      else jsonb_build_object('color', v_f -> 'mau_sac', 'glueColor', v_f -> 'mau_keo') end,
    -- The desktop editor reloads a size from these form keys (quotations.js loadQuoteIntoEditor).
    'fields', case when v_bki then jsonb_build_object(
        'qc-mm', coalesce(v_f ->> 'quy_cach_mm', ''), 'qc-m', coalesce(v_f ->> 'quy_cach_m', ''),
        'qc-mic', coalesce(v_f ->> 'quy_cach_mic', ''), 'cuon-cay', coalesce(v_f ->> 'cuon_cay', ''),
        'so-luong', coalesce(v_f ->> 'so_luong', ''), 'don-gia-ban', coalesce(v_f ->> 'don_gia_ban', ''),
        'mau-keo', coalesce(v_f ->> 'mau_keo', ''), 'mau-sac', coalesce(v_f ->> 'mau_sac', ''),
        'loi-giay', coalesce(v_f ->> 'loi_giay', ''), 'thung-bao', coalesce(v_f ->> 'thung_bao', ''),
        'don-gia-von', coalesce(v_f ->> 'don_gia_von', '0'), 'phi-sl', coalesce(v_f ->> 'phi_sl', '0'),
        'phi-keo', coalesce(v_f ->> 'phi_keo', '0'), 'phi-mau', coalesce(v_f ->> 'phi_mau', '0'),
        'phi-size', coalesce(v_f ->> 'phi_size', '0'), 'phi-cat', coalesce(v_f ->> 'phi_cat', '0'),
        'vat', v_c ->> 'vat_percent', 'tien-coc', v_c ->> 'tien_coc', 'tien-ship', v_c ->> 'tien_ship',
        'ctv', coalesce(v_f ->> 'ctv', ''), 'hoa-hong-percent', v_c ->> 'hoa_hong', 'loai-truc', 'cu')
      else jsonb_build_object(
        'quy-cach', coalesce(v_f ->> 'quy_cach', ''), 'so-luong', coalesce(v_f ->> 'so_luong', ''),
        'mau-sac', coalesce(v_f ->> 'mau_sac', ''), 'mau-keo', coalesce(v_f ->> 'mau_keo', ''),
        'don-gia-goc', coalesce(v_f ->> 'don_gia_goc', '0'), 'don-gia-ban', coalesce(v_f ->> 'don_gia_ban', ''),
        'vat', v_c ->> 'vat_percent', 'tien-ship', v_c ->> 'tien_ship', 'ctv', coalesce(v_f ->> 'ctv', ''),
        'hoa-hong-percent', v_c ->> 'hoa_hong') end));
end;
$$;

create or replace function public.admin_quote_save(p_type text, p_header jsonb, p_items jsonb, p_id text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bki    boolean := p_type = 'bang_keo_in';
  v_tbl    text;
  v_header jsonb;
  v_built  jsonb;
  v_items  jsonb := '[]'::jsonb;
  v_first  jsonb;
  v_row    jsonb;
  v_n      integer;
  v_id     text;
  v_try    integer := 0;
  v_now_vn timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
  i jsonb; a jsonb;
  -- calculateQuoteBundle sums
  s_qty numeric := 0; s_sale numeric := 0; s_cost numeric := 0; s_vat numeric := 0; s_dep numeric := 0;
  s_ship numeric := 0; s_profit numeric := 0; s_comm numeric := 0;
  s_axes integer := 0; s_aqty numeric := 0; s_asale numeric := 0; s_acost numeric := 0; s_avat numeric := 0;
  s_aprofit numeric := 0; s_acomm numeric := 0;
  v_one jsonb;  -- the axis when there is exactly one (its chu vi / CTV / HH go on the row, like the app)
begin
  if not (case when p_id is null then public.has_perm('orders.create')
               else public.has_perm('orders.edit') and public.has_perm('orders.money') end) then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if p_type is null or p_type not in ('bang_keo_in', 'bang_keo', 'truc_in') then
    raise exception 'quotes are bang_keo_in, bang_keo or truc_in' using errcode = '22023';
  end if;
  v_tbl := (select tbl from public.order_type_meta(p_type));
  if p_header is null or jsonb_typeof(p_header) <> 'object' or exists (
       select 1 from jsonb_object_keys(p_header) k
        where k not in ('ten_hang', 'ten_khach_hang', 'sdt_khach_hang', 'dia_chi_khach_hang', 'customer_id')) then
    raise exception 'header: ten_hang, ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang, customer_id only'
      using errcode = '22023';
  end if;
  v_header := public.order_clean_payload(p_type, p_header);
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'items: 1 to 20 sizes' using errcode = '22023';
  end if;

  for i in select value from jsonb_array_elements(p_items) loop
    v_built := public.quote_item_build(p_type, v_header, i);
    v_first := coalesce(v_first, v_built -> 'fields');
    i := v_built -> 'item';
    v_items := v_items || jsonb_build_array(i);
    s_qty := s_qty + (i ->> 'quantity')::numeric;
    s_sale := s_sale + (i ->> 'total')::numeric;
    s_cost := s_cost + (i ->> 'costTotal')::numeric;
    s_vat := s_vat + (i ->> 'vat')::numeric;
    s_dep := s_dep + (i ->> 'deposit')::numeric;
    s_ship := s_ship + (i ->> 'shipping')::numeric;
    s_profit := s_profit + (i ->> 'profit')::numeric;
    s_comm := s_comm + (i ->> 'commission')::numeric;
    for a in select value from jsonb_array_elements(i -> 'axes') loop
      s_axes := s_axes + 1;
      v_one := a;
      s_aqty := s_aqty + (a ->> 'quantity')::numeric;
      s_asale := s_asale + (a ->> 'total')::numeric;
      s_acost := s_acost + (a ->> 'costTotal')::numeric;
      s_avat := s_avat + (a ->> 'vat')::numeric;
      s_aprofit := s_aprofit + (a ->> 'profit')::numeric;
      s_acomm := s_acomm + (a ->> 'commission')::numeric;
    end loop;
  end loop;

  -- prepareQuoteItems: columns of the first size, then the bundle totals over every size.
  v_row := v_first || v_header || jsonb_build_object(
    'so_luong', s_qty, 'thanh_tien_ban', s_sale,
    case when p_type = 'bang_keo' then 'thanh_tien' else 'thanh_tien_goc' end, s_cost,
    'vat', s_vat, 'vat_percent', case when s_sale > 0 then round(s_vat / s_sale * 10000) / 100 else 0 end,
    'tien_ship', s_ship, 'loi_nhuan', s_profit, 'tien_hoa_hong', s_comm,
    'loi_nhuan_rong', s_profit - s_comm - s_ship,
    'cong_no_khach', greatest(s_sale + s_asale + s_vat + s_avat - s_dep, 0),
    'cong_no_ncc', greatest(s_cost + s_acost, 0),
    'quote_items', v_items);
  if jsonb_array_length(v_items) > 1 then
    -- Several sizes: the single price columns hold the weighted average (quoteAggregateUnitPrice).
    v_row := v_row || jsonb_build_object('don_gia_ban', round(s_sale / s_qty), 'don_gia_goc', round(s_cost / s_qty));
  elsif v_bki then
    v_row := v_row || jsonb_build_object('don_gia_goc',
      public.order_compute(p_type, v_header || v_first || '{"loai_truc": "cu", "quote_zero_cost": true}'::jsonb) -> 'don_gia_goc');
  end if;
  if v_bki then
    v_row := v_row || jsonb_build_object(
      'tien_coc', s_dep, 'loai_truc', case when s_axes > 0 then 'moi' else 'cu' end,
      'ten_truc', case when s_axes > 0 then s_axes || ' trục in' end,
      'truc_chu_vi', case when s_axes = 1 then v_one -> 'circumference' end,
      'truc_so_luong', s_aqty,
      'truc_gia_goc', case when s_aqty > 0 then s_acost / s_aqty else 0 end,
      'truc_gia_ban', case when s_aqty > 0 then s_asale / s_aqty else 0 end,
      'truc_thanh_tien_goc', s_acost, 'truc_thanh_tien_ban', s_asale, 'truc_vat', s_avat,
      'truc_vat_percent', case when s_asale > 0 then round(s_avat / s_asale * 10000) / 100 else 0 end,
      'truc_ctv', case when s_axes = 1 then nullif(v_one ->> 'collaborator', '') end,
      'truc_hoa_hong', case when s_axes = 1 then coalesce((v_one ->> 'commissionPercent')::numeric, 0) else 0 end,
      'truc_loi_nhuan', s_aprofit, 'truc_tien_hoa_hong', s_acomm, 'truc_loi_nhuan_rong', s_aprofit - s_acomm);
  end if;

  if p_id is not null then
    execute format('select 1 from public.%I o where o.id = $1 and coalesce(o.is_quote, false) for update', v_tbl)
      using p_id;
    get diagnostics v_n = row_count;
    if v_n = 0 then
      raise exception 'quote not found' using errcode = 'P0002';
    end if;
    -- Inputs a size no longer has are cleared (null), like the app's full column list.
    v_row := coalesce((select jsonb_object_agg(f.name, null) from public.order_fields(p_type) f
                        where f.name not in ('ten_hang', 'ten_khach_hang', 'sdt_khach_hang', 'dia_chi_khach_hang',
                                             'customer_id', 'ngay_du_kien')), '{}'::jsonb) || v_row;
    perform public.order_write(p_type, v_row, p_id);
    return p_id;
  end if;

  v_row := v_row || jsonb_build_object('thoi_gian', v_now_vn, 'ngay_du_kien', v_now_vn::date, 'is_quote', true,
                                       'da_giao', false, 'da_tat_toan', false, 'da_gui_email', false);
  loop
    v_try := v_try + 1;
    v_id := public.next_order_id(p_type, true);
    begin
      perform public.order_write(p_type, v_row || jsonb_build_object('id', v_id));
      exit;
    exception when unique_violation then
      if v_try >= 5 then
        raise;
      end if;
    end;
  end loop;
  return v_id;
end;
$$;

create or replace function public.admin_quotes_list(p_type text default 'all', p_q text default null,
                                                    p_date_from date default null, p_date_to date default null)
returns table (type text, quote jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t    text;
  v_q  text;
  v_tb text;
begin
  if not public.has_perm('orders.view') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if coalesce(p_type, 'all') <> 'all' then
    perform public.order_type_meta(p_type);
  end if;
  v_q := nullif(btrim(left(p_q, 100)), '');
  if v_q is not null then
    v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  foreach t in array array['bang_keo_in', 'bang_keo', 'truc_in', 'thank_you'] loop
    continue when coalesce(p_type, 'all') not in ('all', t);
    v_tb := (select tbl from public.order_type_meta(t));
    continue when to_regclass('public.' || v_tb) is null;
    return query execute format(
      'select %L::text, public.order_hide_money(to_jsonb(o)) from public.%I o
        where coalesce(o.is_quote, false)
          and ($1 is null or o.id ilike $1 or o.ten_hang ilike $1 or o.ten_khach_hang ilike $1)
          and ($2 is null or o.thoi_gian >= $2) and ($3 is null or o.thoi_gian < $3 + 1)
        order by o.thoi_gian desc limit 300', t, v_tb)
      using v_q, p_date_from, p_date_to;
  end loop;
end;
$$;

revoke all on function public.quote_item_build(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.admin_quote_save(text, jsonb, jsonb, text) from public, anon;
revoke all on function public.admin_quotes_list(text, text, date, date) from public, anon;
grant execute on function public.admin_quote_save(text, jsonb, jsonb, text) to authenticated;
grant execute on function public.admin_quotes_list(text, text, date, date) to authenticated;
