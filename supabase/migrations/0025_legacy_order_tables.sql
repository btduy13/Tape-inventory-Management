-- 0025_legacy_order_tables
-- Local parity with the production schema of the Electron app (docs/plans/2026-11-07-orders-web-parity.md,
-- DB-1). Production already has every object below (created by electron/main.js schema v2), so every
-- statement is guarded and is a no-op there:
--   * tables bang_keo_orders, truc_in_orders, order_attachments, email_history: created only when
--     missing (to_regclass), with the production column set (electron/main.js:276-462,
--     electron/db/orderColumns.js), RLS on, no grant for anon / authenticated, DML for electron_app
--     behind the 0010 policy (0010 skipped them on a fresh local database because they did not exist);
--   * sync_*_debt() trigger functions: created only when missing, then search_path '' and EXECUTE
--     revoked (0019 P4); bodies = electron/js/orderMath.js customerDebtSqlExpression /
--     supplierDebtSqlExpression with the da_tat_toan check;
--   * trg_sync_customer_debt / trg_sync_supplier_debt: created only when the table has no trigger of
--     that name.
-- Tests: supabase/tests/rls/17_orders_parity.test.sql

-- ---------------------------------------------------------------------------
-- 1. Tables (local only)
-- ---------------------------------------------------------------------------
do $$
declare
  t   text;
  seq text;
  v_created text[] := '{}';
begin
  if to_regclass('public.bang_keo_orders') is null then
    create table public.bang_keo_orders (
      id                 text primary key,
      thoi_gian          timestamp without time zone,
      ten_hang           text,
      ten_khach_hang     text,
      ngay_du_kien       date not null,
      sdt_khach_hang     text,
      dia_chi_khach_hang text,
      quy_cach           text,
      so_luong           numeric,
      mau_sac            text,
      don_gia_goc        numeric default 0,
      thanh_tien         numeric default 0,
      don_gia_ban        numeric default 0,
      thanh_tien_ban     numeric default 0,
      cong_no_khach      numeric default 0,
      cong_no_ncc        numeric default 0,
      ctv                text,
      hoa_hong           numeric default 0,
      tien_hoa_hong      numeric default 0,
      loi_nhuan          numeric default 0,
      tien_ship          numeric default 0,
      loi_nhuan_rong     numeric default 0,
      da_giao            boolean default false,
      da_tat_toan        boolean default false,
      da_gui_email       boolean default false,
      is_quote           boolean default false,
      vat                numeric default 0,
      vat_percent        numeric default 0,
      quote_items        jsonb default '[]'::jsonb
    );
    v_created := v_created || 'bang_keo_orders'::text;
  end if;

  if to_regclass('public.truc_in_orders') is null then
    create table public.truc_in_orders (
      id                 text primary key,
      thoi_gian          timestamp without time zone,
      ten_hang           text,
      ten_khach_hang     text,
      ngay_du_kien       date not null,
      sdt_khach_hang     text,
      dia_chi_khach_hang text,
      quy_cach           text,
      so_luong           numeric,
      mau_sac            text,
      mau_keo            text,
      don_gia_goc        numeric default 0,
      thanh_tien_goc     numeric default 0,
      don_gia_ban        numeric default 0,
      thanh_tien_ban     numeric default 0,
      cong_no_khach      numeric default 0,
      cong_no_ncc        numeric default 0,
      ctv                text,
      hoa_hong           numeric default 0,
      tien_hoa_hong      numeric default 0,
      loi_nhuan          numeric default 0,
      tien_ship          numeric default 0,
      loi_nhuan_rong     numeric default 0,
      da_giao            boolean default false,
      da_tat_toan        boolean default false,
      da_gui_email       boolean default false,
      is_quote           boolean default false,
      vat                numeric default 0,
      vat_percent        numeric default 0,
      quote_items        jsonb default '[]'::jsonb
    );
    v_created := v_created || 'truc_in_orders'::text;
  end if;

  -- order_type = electron/db/params.js ORDER_TABLES key (bang_keo_in | bang_keo | truc_in; 0027 adds thank_you).
  if to_regclass('public.order_attachments') is null then
    create table public.order_attachments (
      id           serial primary key,
      order_type   text not null,
      order_id     text not null,
      file_name    text not null,
      content_type text,
      file_size    integer,
      data         bytea,
      created_at   timestamp without time zone default current_timestamp
    );
    create index order_attachments_order_idx on public.order_attachments (order_type, order_id);
    v_created := v_created || 'order_attachments'::text;
  end if;

  if to_regclass('public.email_history') is null then
    create table public.email_history (
      id            serial primary key,
      email_address varchar(255) not null,
      last_sent_at  timestamp not null default current_timestamp,
      sent_count    integer default 1
    );
    v_created := v_created || 'email_history'::text;
  end if;

  -- Same privileges as 0010 / 0019 give the production tables.
  foreach t in array v_created
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to electron_app', t);
    execute format('drop policy if exists electron_app_full_access on public.%I', t);
    execute format(
      'create policy electron_app_full_access on public.%I as permissive for all to electron_app using (true) with check (true)',
      t);
    seq := pg_get_serial_sequence('public.' || t, 'id');
    if seq is not null then
      execute format('revoke all on sequence %s from anon, authenticated', seq);
      execute format('grant usage, select on sequence %s to electron_app', seq);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Debt trigger functions (created only when missing)
-- ---------------------------------------------------------------------------
do $do$
begin
  if to_regprocedure('public.sync_printed_tape_customer_debt()') is null then
    create function public.sync_printed_tape_customer_debt() returns trigger
    language plpgsql set search_path = '' as $f$
    begin
      new.cong_no_khach := case when coalesce(new.da_tat_toan, false) then 0
        else greatest(coalesce(new.thanh_tien_ban, 0)
                      + case when new.loai_truc = 'moi' then coalesce(new.truc_thanh_tien_ban, 0) + coalesce(new.truc_vat, 0) else 0 end
                      + coalesce(new.vat, 0) - coalesce(new.tien_coc, 0), 0) end;
      return new;
    end; $f$;
  end if;

  if to_regprocedure('public.sync_standard_customer_debt()') is null then
    create function public.sync_standard_customer_debt() returns trigger
    language plpgsql set search_path = '' as $f$
    begin
      new.cong_no_khach := case when coalesce(new.da_tat_toan, false) then 0
        else greatest(coalesce(new.thanh_tien_ban, 0) + coalesce(new.vat, 0), 0) end;
      return new;
    end; $f$;
  end if;

  if to_regprocedure('public.sync_printed_tape_supplier_debt()') is null then
    create function public.sync_printed_tape_supplier_debt() returns trigger
    language plpgsql set search_path = '' as $f$
    begin
      new.cong_no_ncc := case when coalesce(new.da_tat_toan, false) then 0
        else greatest(coalesce(new.thanh_tien_goc, 0)
                      + case when new.loai_truc = 'moi' then coalesce(new.truc_thanh_tien_goc, 0) else 0 end, 0) end;
      return new;
    end; $f$;
  end if;

  if to_regprocedure('public.sync_standard_supplier_debt()') is null then
    create function public.sync_standard_supplier_debt() returns trigger
    language plpgsql set search_path = '' as $f$
    begin
      new.cong_no_ncc := case when coalesce(new.da_tat_toan, false) then 0
        else greatest(coalesce(new.thanh_tien, 0), 0) end;
      return new;
    end; $f$;
  end if;

  if to_regprocedure('public.sync_axis_supplier_debt()') is null then
    create function public.sync_axis_supplier_debt() returns trigger
    language plpgsql set search_path = '' as $f$
    begin
      new.cong_no_ncc := case when coalesce(new.da_tat_toan, false) then 0
        else greatest(coalesce(new.thanh_tien_goc, 0), 0) end;
      return new;
    end; $f$;
  end if;
end;
$do$;

-- 0019 P4 again for the functions created above (a no-op where 0019 already did it).
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

-- ---------------------------------------------------------------------------
-- 3. Debt triggers (created only when the table has none of that name)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('bang_keo_in_orders', 'trg_sync_customer_debt', 'thanh_tien_ban, truc_thanh_tien_ban, truc_vat, loai_truc, vat, tien_coc, da_tat_toan', 'sync_printed_tape_customer_debt'),
      ('bang_keo_orders',    'trg_sync_customer_debt', 'thanh_tien_ban, vat, da_tat_toan',            'sync_standard_customer_debt'),
      ('truc_in_orders',     'trg_sync_customer_debt', 'thanh_tien_ban, vat, da_tat_toan',            'sync_standard_customer_debt'),
      ('bang_keo_in_orders', 'trg_sync_supplier_debt', 'thanh_tien_goc, truc_thanh_tien_goc, loai_truc, da_tat_toan', 'sync_printed_tape_supplier_debt'),
      ('bang_keo_orders',    'trg_sync_supplier_debt', 'thanh_tien, da_tat_toan',                     'sync_standard_supplier_debt'),
      ('truc_in_orders',     'trg_sync_supplier_debt', 'thanh_tien_goc, da_tat_toan',                 'sync_axis_supplier_debt')
    ) as v(tbl, trg, cols, fn)
  loop
    if to_regclass('public.' || r.tbl) is null
       or exists (select 1 from pg_trigger
                   where tgrelid = ('public.' || r.tbl)::regclass and tgname = r.trg and not tgisinternal) then
      continue;
    end if;
    execute format('create trigger %I before insert or update of %s on public.%I for each row execute function public.%I()',
                   r.trg, r.cols, r.tbl, r.fn);
  end loop;
end;
$$;
