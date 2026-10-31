-- 0019_production_schema_compat
-- Fixes found by rehearsing 0001-0018 on a restored copy of the production database
-- (pg dump 2026-11-01). Every statement is idempotent and safe on both a fresh local database
-- (where bang_keo_in_orders is the 0009 stub) and the production schema (where the Electron app
-- created it). No legacy row is changed.
--
--   P1  convert_lead_to_production failed on production: bang_keo_in_orders.ngay_du_kien is
--       `date NOT NULL` there and the function did not set it. It also wrote now() (UTC) into
--       `thoi_gian timestamp without time zone`, while the Electron app stores Vietnam wall-clock
--       time, and could overflow varchar(255)/varchar(100) columns (ten_khach_hang, mau_sac).
--   P2  The 0009 stub did not match production (no ngay_du_kien, thoi_gian timestamptz), so local
--       tests could not catch P1. The stub now gets the production types for those columns.
--   P3  Production has more legacy tables than 0009 knew about (attachments, *_v2 copies,
--       don_hang, chi_tiet_don_hang). They had RLS off and GRANT ALL to anon/authenticated, so the
--       public Data API could read and write them. Every public table with RLS off is now locked.
--   P4  Legacy trigger functions sync_*_debt() (created by the Electron app) had no fixed
--       search_path and kept EXECUTE for PUBLIC/anon/authenticated. Triggers do not need EXECUTE.

-- ---------------------------------------------------------------------------
-- P2  Make the local stub match production for the columns the hand-off writes
-- ---------------------------------------------------------------------------
-- Production already has ngay_du_kien, so this block only changes the 0009 stub.
do $$
begin
  if to_regclass('public.bang_keo_in_orders') is null then
    return;
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'bang_keo_in_orders'
                    and column_name = 'ngay_du_kien') then
    alter table public.bang_keo_in_orders
      add column ngay_du_kien date not null
        default ((now() at time zone 'Asia/Ho_Chi_Minh')::date);
    alter table public.bang_keo_in_orders alter column ngay_du_kien drop default;
    if exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'bang_keo_in_orders'
                  and column_name = 'thoi_gian' and data_type = 'timestamp with time zone') then
      alter table public.bang_keo_in_orders alter column thoi_gian drop default;
      alter table public.bang_keo_in_orders
        alter column thoi_gian type timestamp without time zone
        using (thoi_gian at time zone 'Asia/Ho_Chi_Minh');
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- P1  Hand-off writes every NOT NULL column with production types
-- ---------------------------------------------------------------------------
create or replace function public.convert_lead_to_production(p_lead_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead   public.leads;
  v_design public.designs;
  v_quote  public.quotes;
  v_id     text;
  v_unit   numeric;
  -- The Electron app stores local Vietnam time in `timestamp without time zone` columns.
  v_now_vn timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
begin
  if not (public.is_service_call() or public.is_admin()) then
    raise exception 'only admin may convert leads' using errcode = '42501';
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
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

  select * into v_design from public.designs
   where lead_id = p_lead_id order by created_at desc limit 1;
  if v_design.id is null then
    raise exception 'lead has no design' using errcode = '22023';
  end if;

  select * into v_quote from public.quotes
   where lead_id = p_lead_id and status = 'accepted'
   order by version desc limit 1;
  v_unit := case when v_quote.id is not null and v_lead.quantity > 0
                 then round(v_quote.subtotal / v_lead.quantity, 2) else 0 end;

  v_id := public.next_bang_keo_in_order_id();

  -- ngay_du_kien (expected delivery) is NOT NULL in production. The lead has no delivery date,
  -- so use hand-off day + 7; the admin corrects it in the desktop app.
  insert into public.bang_keo_in_orders (
    id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang,
    quy_cach_mm, quy_cach_m, quy_cach_mic, so_luong, mau_sac,
    don_gia_ban, thanh_tien_ban, is_quote
  ) values (
    v_id,
    v_now_vn,
    v_now_vn::date + 7,
    left('Băng keo in ' || coalesce(nullif(v_design.print_text, ''), v_lead.code), 255),
    left(concat_ws(' - ', nullif(v_lead.company, ''), v_lead.customer_name, v_lead.phone), 255),
    v_design.width_mm, v_design.length_m, v_design.thickness_mic,
    v_lead.quantity,
    left(array_to_string(v_design.colors, ', '), 100),
    v_unit,
    coalesce(v_quote.subtotal, 0),
    false
  );

  perform set_config('app.status_note', 'Chuyển sang sản xuất: ' || v_id, true);
  update public.leads
     set production_order_id = v_id, status = 'production'
   where id = p_lead_id;
  perform set_config('app.status_note', '', true);

  return v_id;
end;
$$;

revoke all on function public.convert_lead_to_production(uuid) from public, anon;
grant execute on function public.convert_lead_to_production(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- P3  No public table without RLS; legacy tables closed to the Data API
-- ---------------------------------------------------------------------------
-- Tables created by the Electron app outside migrations keep their owner and data; only RLS and
-- the anon/authenticated grants change. The owner (postgres) bypasses RLS, electron_app keeps
-- its 0010 policy on its five tables, and has no grant on the others.
do $$
declare
  r record;
begin
  for r in
    select c.oid::regclass as tbl
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  loop
    execute format('alter table %s enable row level security', r.tbl);
    execute format('revoke all on table %s from anon, authenticated', r.tbl);
    raise notice 'enabled RLS and revoked API grants on %', r.tbl;
  end loop;
end;
$$;

-- Sequences of the legacy tables (Supabase default privileges gave anon/authenticated ALL).
do $$
declare
  s text;
begin
  foreach s in array array['attachments_id_seq', 'bang_keo_in_orders_id_seq', 'chi_tiet_don_hang_id_seq',
                           'don_hang_id_seq', 'email_history_id_seq', 'order_attachments_id_seq']
  loop
    if to_regclass('public.' || s) is not null then
      execute format('revoke all on sequence public.%I from anon, authenticated', s);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- P4  Legacy debt trigger functions
-- ---------------------------------------------------------------------------
-- Bodies only read NEW and call pg_catalog builtins, so an empty search_path is safe.
do $$
declare
  f text;
begin
  foreach f in array array['sync_axis_supplier_debt', 'sync_printed_tape_customer_debt',
                           'sync_printed_tape_supplier_debt', 'sync_standard_customer_debt',
                           'sync_standard_supplier_debt']
  loop
    if to_regprocedure('public.' || f || '()') is not null then
      execute format('alter function public.%I() set search_path = ''''', f);
      execute format('revoke all on function public.%I() from public, anon, authenticated, service_role', f);
    end if;
  end loop;
end;
$$;
