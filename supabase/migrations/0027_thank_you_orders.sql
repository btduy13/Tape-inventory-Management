-- 0027_thank_you_orders
-- "Băng keo Thank you" as its own order type (docs/plans/2026-11-07-orders-web-parity.md, DB-1).
-- Tests: supabase/tests/rls/17_orders_parity.test.sql
--
-- 1. public.thank_you_orders, ids TY-MM-YY-NNN (quotes BG-TY-MM-YY-NNN) from
--    public.next_order_id('thank_you', is_quote) (0026; same algorithm as next_bang_keo_in_order_id;
--    the desktop app builds the same ids with orderMath.nextOrderId). Columns: the fixed list of the
--    plan + cong_no_ncc and loi_nhuan_rong, kept like on the other three tables so the debt / profit
--    totals of the app and the web stay one SUM per column. customer_id is a plain nullable uuid; the
--    customers migration (0028) adds the foreign key.
--    Debt by trigger sync_thank_you_debt (= order_type_meta('thank_you') / orderMath
--    calculateStandardOrder with deposit): cong_no_khach = settled ? 0 : max(ban + vat - coc, 0),
--    cong_no_ncc = settled ? 0 : max(thanh_tien_von, 0).
--    Thank you orders never go to the workshop (no production trigger).
-- 2. Privileges like the other app tables: RLS on, nothing for anon / authenticated, DML for
--    electron_app through electron_app_full_access (verify-production.sql electron_table_allow).
-- 3. public.thank_you_migration_map(old_table, old_id, new_id, old_row, migrated_at): owner only.
-- 4. Data move, public.thank_you_move_legacy() (owner only, idempotent): every row of
--    bang_keo_in_orders / bang_keo_orders with ten_hang ILIKE '%thank%' becomes a thank_you_orders
--    row with a new TY id in the month of its own thoi_gian; the old row is kept in the map (undo /
--    lookup), its attachments follow (order_type thank_you), a lead pointing at it follows. Workshop
--    history of a printed-tape row (jobs, step log, delivery notes) is copied into old_row (keys
--    jobs / steps / delivery_notes) first; lead-less jobs are then deleted (cascading their log and
--    notes, delivery photos stay in storage), a lead's job is kept and detached by the 0024 order
--    delete trigger (cancelled if still open). email_history has no order reference, nothing to move
--    there. Rows already in the map are skipped.
--    Column mapping:
--      kich_thuoc    BKI: '<quy_cach_mm>mm x <quy_cach_m>m x <quy_cach_mic>mic' (parts present);
--                    bang_keo: quy_cach
--      don_gia_von   don_gia_goc (cost per roll);  thanh_tien_von  thanh_tien_goc / thanh_tien
--      a new axis (loai_truc 'moi') of a BKI row is folded into the totals so debt and profit stay
--      equal: thanh_tien_ban += truc_thanh_tien_ban, vat += truc_vat, thanh_tien_von +=
--      truc_thanh_tien_goc, loi_nhuan / tien_hoa_hong / loi_nhuan_rong += the truc_* values; ghi_chu
--      says so. don_gia_ban / don_gia_von / vat_percent are then derived from the combined totals
--      (total / so_luong, vat / sale) so a later recompute (admin_order_update, app edit) keeps them
--      within rounding. mau_keo / loi_giay / thung_bao go to ghi_chu.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
create table if not exists public.thank_you_orders (
  id                 text primary key check (char_length(id) <= 64),
  thoi_gian          timestamp without time zone not null default (now() at time zone 'Asia/Ho_Chi_Minh'),
  ngay_du_kien       date not null,
  ten_hang           text not null,
  kich_thuoc         text,
  mau_sac            text,
  so_luong           numeric not null default 0,
  don_gia_ban        numeric not null default 0,
  thanh_tien_ban     numeric not null default 0,
  vat                numeric not null default 0,
  vat_percent        numeric not null default 0,
  tien_coc           numeric not null default 0,
  cong_no_khach      numeric not null default 0,
  cong_no_ncc        numeric not null default 0,
  don_gia_von        numeric not null default 0,
  thanh_tien_von     numeric not null default 0,
  tien_ship          numeric not null default 0,
  loi_nhuan          numeric not null default 0,
  loi_nhuan_rong     numeric not null default 0,
  ctv                text,
  hoa_hong           numeric not null default 0,
  tien_hoa_hong      numeric not null default 0,
  ghi_chu            text,
  ten_khach_hang     text,
  sdt_khach_hang     text,
  dia_chi_khach_hang text,
  customer_id        uuid,
  da_giao            boolean not null default false,
  da_tat_toan        boolean not null default false,
  da_gui_email       boolean not null default false,
  is_quote           boolean not null default false
);

create index if not exists thank_you_orders_thoi_gian_idx on public.thank_you_orders (thoi_gian desc);

create or replace function public.sync_thank_you_debt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.cong_no_khach := case when coalesce(new.da_tat_toan, false) then 0
    else greatest(coalesce(new.thanh_tien_ban, 0) + coalesce(new.vat, 0) - coalesce(new.tien_coc, 0), 0) end;
  new.cong_no_ncc := case when coalesce(new.da_tat_toan, false) then 0
    else greatest(coalesce(new.thanh_tien_von, 0), 0) end;
  return new;
end;
$$;

drop trigger if exists trg_sync_thank_you_debt on public.thank_you_orders;
create trigger trg_sync_thank_you_debt
  before insert or update of thanh_tien_ban, vat, tien_coc, thanh_tien_von, da_tat_toan
  on public.thank_you_orders
  for each row execute function public.sync_thank_you_debt();

-- ---------------------------------------------------------------------------
-- 2. Privileges
-- ---------------------------------------------------------------------------
alter table public.thank_you_orders enable row level security;
revoke all on table public.thank_you_orders from anon, authenticated;
grant select, insert, update, delete on table public.thank_you_orders to electron_app;
drop policy if exists electron_app_full_access on public.thank_you_orders;
create policy electron_app_full_access on public.thank_you_orders
  as permissive for all to electron_app using (true) with check (true);
revoke all on function public.sync_thank_you_debt() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Map of moved rows
-- ---------------------------------------------------------------------------
create table if not exists public.thank_you_migration_map (
  old_table   text not null check (old_table in ('bang_keo_in_orders', 'bang_keo_orders')),
  old_id      text not null,
  new_id      text not null unique,
  old_row     jsonb not null,
  migrated_at timestamptz not null default now(),
  primary key (old_table, old_id)
);
alter table public.thank_you_migration_map enable row level security;
revoke all on table public.thank_you_migration_map from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Data move
-- ---------------------------------------------------------------------------
create or replace function public.thank_you_move_legacy()
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  r       record;
  j       jsonb;
  v_src   text;
  v_type  text;
  v_axis  boolean;
  v_new   text;
  v_n     integer := 0;
  v_qty   numeric;
  v_sale  numeric;
  v_cost  numeric;
  v_vat   numeric;
begin
  for r in
    select * from (
      select 'bang_keo_in_orders' as src, o.id::text as id, to_jsonb(o) as j
        from public.bang_keo_in_orders o where o.ten_hang ilike '%thank%'
      union all
      select 'bang_keo_orders', o.id::text, to_jsonb(o)
        from public.bang_keo_orders o where o.ten_hang ilike '%thank%'
    ) u
    order by u.src, (u.j ->> 'thoi_gian')::timestamp nulls last, u.id
  loop
    v_src := r.src;
    j := r.j;
    v_type := case v_src when 'bang_keo_in_orders' then 'bang_keo_in' else 'bang_keo' end;
    if exists (select 1 from public.thank_you_migration_map m where m.old_table = v_src and m.old_id = r.id) then
      continue;
    end if;
    v_axis := v_src = 'bang_keo_in_orders' and j ->> 'loai_truc' = 'moi';
    v_new := public.next_order_id('thank_you', coalesce((j ->> 'is_quote')::boolean, false),
                                  (j ->> 'thoi_gian')::timestamp);
    v_qty  := coalesce((j ->> 'so_luong')::numeric, 0);
    v_sale := coalesce((j ->> 'thanh_tien_ban')::numeric, 0)
                + case when v_axis then coalesce((j ->> 'truc_thanh_tien_ban')::numeric, 0) else 0 end;
    v_vat  := coalesce((j ->> 'vat')::numeric, 0)
                + case when v_axis then coalesce((j ->> 'truc_vat')::numeric, 0) else 0 end;
    v_cost := coalesce((j ->> case when v_src = 'bang_keo_in_orders' then 'thanh_tien_goc' else 'thanh_tien' end)::numeric, 0)
                + case when v_axis then coalesce((j ->> 'truc_thanh_tien_goc')::numeric, 0) else 0 end;

    insert into public.thank_you_orders (
      id, thoi_gian, ngay_du_kien, ten_hang, kich_thuoc, mau_sac, so_luong, don_gia_ban, thanh_tien_ban,
      vat, vat_percent, tien_coc, don_gia_von, thanh_tien_von, tien_ship, loi_nhuan, loi_nhuan_rong,
      ctv, hoa_hong, tien_hoa_hong, ghi_chu, ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang,
      da_giao, da_tat_toan, da_gui_email, is_quote
    ) values (
      v_new,
      coalesce((j ->> 'thoi_gian')::timestamp, now() at time zone 'Asia/Ho_Chi_Minh'),
      coalesce((j ->> 'ngay_du_kien')::date, (now() at time zone 'Asia/Ho_Chi_Minh')::date),
      j ->> 'ten_hang',
      case when v_src = 'bang_keo_in_orders' then
        nullif(concat_ws(' x ', trim_scale((j ->> 'quy_cach_mm')::numeric) || 'mm',
                                trim_scale((j ->> 'quy_cach_m')::numeric) || 'm',
                                trim_scale((j ->> 'quy_cach_mic')::numeric) || 'mic'), '')
      else nullif(btrim(j ->> 'quy_cach'), '') end,
      j ->> 'mau_sac',
      v_qty,
      case when v_axis and v_qty > 0 then round(v_sale / v_qty, 4)
           else coalesce((j ->> 'don_gia_ban')::numeric, 0) end,
      v_sale,
      v_vat,
      case when v_axis and v_sale > 0 then round(v_vat / v_sale * 100, 2)
           else coalesce((j ->> 'vat_percent')::numeric, 0) end,
      coalesce((j ->> 'tien_coc')::numeric, 0),
      case when v_axis and v_qty > 0 then round(v_cost / v_qty, 4)
           else coalesce((j ->> 'don_gia_goc')::numeric, 0) end,
      v_cost,
      coalesce((j ->> 'tien_ship')::numeric, 0),
      coalesce((j ->> 'loi_nhuan')::numeric, 0)
        + case when v_axis then coalesce((j ->> 'truc_loi_nhuan')::numeric, 0) else 0 end,
      coalesce((j ->> 'loi_nhuan_rong')::numeric, 0)
        + case when v_axis then coalesce((j ->> 'truc_loi_nhuan_rong')::numeric, 0) else 0 end,
      j ->> 'ctv',
      coalesce((j ->> 'hoa_hong')::numeric, 0),
      coalesce((j ->> 'tien_hoa_hong')::numeric, 0)
        + case when v_axis then coalesce((j ->> 'truc_tien_hoa_hong')::numeric, 0) else 0 end,
      nullif(concat_ws('; ',
        'Mã cũ: ' || r.id,
        'Màu keo: ' || nullif(btrim(j ->> 'mau_keo'), ''),
        'Lõi giấy: ' || nullif(btrim(j ->> 'loi_giay'), ''),
        'Thùng bao: ' || nullif(btrim(j ->> 'thung_bao'), ''),
        case when v_axis then
          'Gồm trục mới ' || coalesce(nullif(btrim(j ->> 'ten_truc'), ''), '') || ' (SL '
          || coalesce(trim_scale((j ->> 'truc_so_luong')::numeric)::text, '0') || ', tiền bán '
          || coalesce(j ->> 'truc_thanh_tien_ban', '0') || ', VAT ' || coalesce(j ->> 'truc_vat', '0')
          || ') cộng vào thành tiền' end), ''),
      j ->> 'ten_khach_hang', j ->> 'sdt_khach_hang', j ->> 'dia_chi_khach_hang',
      coalesce((j ->> 'da_giao')::boolean, false), coalesce((j ->> 'da_tat_toan')::boolean, false),
      coalesce((j ->> 'da_gui_email')::boolean, false), coalesce((j ->> 'is_quote')::boolean, false)
    );

    if v_src = 'bang_keo_in_orders' then
      j := j || jsonb_build_object(
        'jobs', (select jsonb_agg(to_jsonb(pj)) from public.production_jobs pj where pj.order_id = r.id),
        'steps', (select jsonb_agg(to_jsonb(s) order by s.id) from public.production_step_log s
                   join public.production_jobs pj on pj.id = s.job_id where pj.order_id = r.id),
        'delivery_notes', (select jsonb_agg(to_jsonb(n)) from public.delivery_notes n
                            join public.production_jobs pj on pj.id = n.job_id where pj.order_id = r.id));
    end if;
    insert into public.thank_you_migration_map (old_table, old_id, new_id, old_row)
    values (v_src, r.id, v_new, j);

    update public.order_attachments set order_type = 'thank_you', order_id = v_new
     where order_type = v_type and order_id = r.id;
    update public.leads set production_order_id = v_new where production_order_id = r.id;

    if v_src = 'bang_keo_in_orders' then
      -- A lead's job stays: the order delete trigger (0024) cancels it if open and detaches it.
      delete from public.production_jobs where order_id = r.id and lead_id is null;
      delete from public.bang_keo_in_orders where id = r.id;
    else
      delete from public.bang_keo_orders where id = r.id;
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

revoke all on function public.thank_you_move_legacy() from public, anon, authenticated, service_role;

do $$
declare
  v_n integer;
begin
  v_n := public.thank_you_move_legacy();
  raise notice 'thank_you_move_legacy: % rows moved', v_n;
end;
$$;
