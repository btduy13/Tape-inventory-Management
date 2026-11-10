-- Regression tests for 0025_legacy_order_tables, 0026_admin_order_rpcs, 0027_thank_you_orders.
-- Requires seed.sql (admin a001, staff a003, workshop a006 / a007).
-- Money expectations are worked out by hand from electron/js/orderMath.js.
-- Run: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(101);

-- helpers -------------------------------------------------------------------------------------
create function pg_temp.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

create temp table t17 (k text primary key, v text);
grant all on t17 to public;

do $grant$ begin
  if current_setting('server_version_num')::int >= 160000 then
    execute 'grant electron_app to postgres with set true, inherit false';
  else
    execute 'grant electron_app to postgres';
  end if;
end $grant$;

-- Schema and privileges -----------------------------------------------------------------------
select ok(
  (select bool_and(to_regclass('public.' || t) is not null)
     from unnest(array['bang_keo_orders', 'truc_in_orders', 'order_attachments', 'email_history',
                       'thank_you_orders', 'thank_you_migration_map']) t),
  'legacy order tables, thank_you_orders and the migration map exist');
select ok(
  (select bool_and(c.relrowsecurity
                   and not has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
                   and not has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE'))
     from pg_class c
    where c.oid in ('public.bang_keo_orders'::regclass, 'public.truc_in_orders'::regclass,
                    'public.order_attachments'::regclass, 'public.email_history'::regclass,
                    'public.thank_you_orders'::regclass, 'public.thank_you_migration_map'::regclass)),
  'RLS on and no API grant on every order table');
select ok(
  (select bool_and(has_table_privilege('electron_app', ('public.' || t)::regclass, 'SELECT,INSERT,UPDATE,DELETE')
                   and not has_table_privilege('electron_app', ('public.' || t)::regclass, 'TRUNCATE,REFERENCES,TRIGGER'))
     from unnest(array['bang_keo_orders', 'truc_in_orders', 'order_attachments', 'email_history',
                       'thank_you_orders']) t),
  'electron_app has DML (only) on the app tables, thank_you_orders included');
select ok(not has_table_privilege('electron_app', 'public.thank_you_migration_map', 'SELECT'),
  'electron_app cannot read the migration map');
select ok(
  (select bool_and(p.proconfig @> array['search_path=""']
                   and not has_function_privilege('anon', p.oid, 'EXECUTE')
                   and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
                   and not has_function_privilege('electron_app', p.oid, 'EXECUTE'))
     from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('sync_printed_tape_customer_debt', 'sync_standard_customer_debt',
                        'sync_printed_tape_supplier_debt', 'sync_standard_supplier_debt',
                        'sync_axis_supplier_debt', 'sync_thank_you_debt', 'thank_you_move_legacy',
                        'order_type_meta', 'order_fields', 'order_clean_payload', 'order_compute',
                        'next_order_id', 'order_write')),
  'trigger functions, the move and the internal helpers: fixed search_path, no API / electron execute');
select ok(
  (select bool_and(p.prosecdef and p.proconfig @> array['search_path=""']
                   and not has_function_privilege('anon', p.oid, 'EXECUTE')
                   and has_function_privilege('authenticated', p.oid, 'EXECUTE')
                   and not has_function_privilege('electron_app', p.oid, 'EXECUTE'))
     from pg_proc p
    where p.oid in ('public.admin_orders_list(jsonb,text)'::regprocedure,
                    'public.admin_order_get(text,text)'::regprocedure,
                    'public.admin_order_create(jsonb,text,boolean)'::regprocedure,
                    'public.admin_order_update(text,text,jsonb)'::regprocedure,
                    'public.admin_order_set_status(text,text[],boolean,boolean)'::regprocedure,
                    'public.admin_order_delete(text,text[],boolean)'::regprocedure,
                    'public.admin_quote_convert(text,text,date)'::regprocedure,
                    'public.admin_order_send_to_workshop(text,uuid)'::regprocedure,
                    'public.admin_order_name_suggest(text,text)'::regprocedure,
                    'public.admin_order_latest_by_name(text,text)'::regprocedure)),
  'admin order RPCs: SECURITY DEFINER, empty search_path, authenticated only');
select is(
  (select array_agg(tgname::text order by tgname) from pg_trigger
    where tgrelid = 'public.thank_you_orders'::regclass and not tgisinternal),
  array['trg_sync_thank_you_debt', 'zz_resolve_customer', 'zzz_save_customer_contact'],
  'thank_you_orders has debt and customer triggers and no workshop trigger');

-- 0025 debt triggers = orderMath customerDebtSqlExpression / supplierDebtSqlExpression ----------
insert into public.bang_keo_orders (id, ngay_du_kien, ten_hang, thanh_tien_ban, vat, thanh_tien)
values ('B-T17-DEBT', current_date, 'x', 1000, 80, 700);
select is((select row(cong_no_khach, cong_no_ncc)::text from public.bang_keo_orders where id = 'B-T17-DEBT'),
  row(1080, 700)::text, 'bang_keo: debt = ban + vat, supplier = thanh_tien');
update public.bang_keo_orders set da_tat_toan = true where id = 'B-T17-DEBT';
select is((select row(cong_no_khach, cong_no_ncc)::text from public.bang_keo_orders where id = 'B-T17-DEBT'),
  row(0, 0)::text, 'bang_keo: settled -> both debts 0');
insert into public.truc_in_orders (id, ngay_du_kien, ten_hang, thanh_tien_ban, vat, thanh_tien_goc)
values ('TI-T17-DEBT', current_date, 'x', 2000, 0, 1500);
select is((select row(cong_no_khach, cong_no_ncc)::text from public.truc_in_orders where id = 'TI-T17-DEBT'),
  row(2000, 1500)::text, 'truc_in: debt = ban + vat, supplier = thanh_tien_goc');
set local app.production_sync = 'off';
insert into public.bang_keo_in_orders (id, ngay_du_kien, ten_hang, thanh_tien_ban, vat, tien_coc, thanh_tien_goc,
                                       loai_truc, truc_thanh_tien_ban, truc_vat, truc_thanh_tien_goc)
values ('BK-T17-DEBT', current_date, 'x', 10000, 800, 3000, 6000, 'moi', 2000, 160, 1200);
reset app.production_sync;
select is((select row(cong_no_khach, cong_no_ncc)::text from public.bang_keo_in_orders where id = 'BK-T17-DEBT'),
  row(9960, 7200)::text, 'bang_keo_in: debt = ban + truc + vats - coc, supplier = goc + truc goc');
insert into public.thank_you_orders (id, ngay_du_kien, ten_hang, thanh_tien_ban, vat, tien_coc, thanh_tien_von)
values ('TY-T17-DEBT', current_date, 'x', 5000, 500, 7000, 3000);
select is((select row(cong_no_khach, cong_no_ncc)::text from public.thank_you_orders where id = 'TY-T17-DEBT'),
  row(0, 3000)::text, 'thank_you: debt = max(ban + vat - coc, 0), supplier = thanh_tien_von');
select lives_ok(
  $$set local role electron_app;
    insert into public.thank_you_orders (id, ngay_du_kien, ten_hang) values ('TY-T17-APP', current_date, 'App TY');
    update public.thank_you_orders set da_giao = true where id = 'TY-T17-APP';
    delete from public.thank_you_orders where id = 'TY-T17-APP';
    reset role$$,
  'electron_app inserts / updates / deletes Thank you orders');

-- next_order_id ---------------------------------------------------------------------------------
insert into public.truc_in_orders (id, ngay_du_kien, ten_hang) values
  ('TI-01-20-009', current_date, 'x'), ('TI-01-20-1000', current_date, 'x'), ('TI-01-20-ABC', current_date, 'x');
select is(public.next_order_id('truc_in', false, '2020-01-15'), 'TI-01-20-1001', 'next id: numeric max + 1');
select is(public.next_order_id('thank_you', true, '2020-02-01'), 'BG-TY-02-20-001', 'next id: quote prefix BG-TY');
select throws_ok($$select public.next_order_id('xyz')$$, '22023', null, 'unknown order type rejected');

-- Access ----------------------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select throws_ok($$select * from public.admin_orders_list('{}', 'all')$$, '42501', null, 'staff cannot list');
select throws_ok($$select public.admin_order_update('bang_keo', 'B-T17-DEBT', '{"ten_hang":"y"}')$$, '42501', null,
  'staff cannot update');
select throws_ok($$select public.admin_order_set_status('bang_keo', array['B-T17-DEBT'], true, null)$$, '42501', null,
  'staff cannot change status');
select throws_ok($$select public.admin_order_delete('bang_keo', array['B-T17-DEBT'])$$, '42501', null,
  'staff cannot delete');
select throws_ok($$select public.admin_quote_convert('bang_keo', 'x', current_date)$$, '42501', null,
  'staff cannot convert quotes');
select throws_ok($$select public.admin_order_send_to_workshop('x')$$, '42501', null, 'staff cannot send to workshop');
select throws_ok($$select * from public.admin_order_name_suggest('bang_keo', 'x')$$, '42501', null,
  'staff cannot read name suggestions');
select pg_temp.logout();

-- Create ----------------------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
-- calculateStandardOrder: cost 120*1550 = 186000, sale 252000, profit 66000, commission 6600,
-- net 66000 - 6600 - 30000 = 29400, vat 8% = 20160, debt 272160.
select lives_ok($$insert into t17 select 'bk', order_id from public.admin_order_create(
  '{"ten_hang":"T17 Băng keo trong","ten_khach_hang":"Khách T17","ngay_du_kien":"2030-01-10","quy_cach":"48mm x 100y",
    "so_luong":120,"don_gia_goc":1550,"don_gia_ban":2100,"hoa_hong":10,"tien_ship":30000,"vat_percent":8}', 'bang_keo')$$,
  'admin creates a plain-tape order');
select pg_temp.logout();
select matches((select v from t17 where k = 'bk'), '^B-\d{2}-\d{2}-\d{3}$', 'plain-tape id B-MM-YY-NNN');
select is(
  (select row(thanh_tien, thanh_tien_ban, loi_nhuan, tien_hoa_hong, loi_nhuan_rong, vat, cong_no_khach, cong_no_ncc,
              is_quote, da_giao)::text
     from public.bang_keo_orders where id = (select v from t17 where k = 'bk')),
  row(186000, 252000, 66000, 6600, 29400, 20160, 272160, 186000, false, false)::text,
  'plain-tape money = calculateStandardOrder');

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok($$insert into t17 select 'tiq', order_id from public.admin_order_create(
  '{"ten_hang":"T17 Trục in","ten_khach_hang":"Khách T17","so_luong":2,"don_gia_goc":800000,"don_gia_ban":1000000,
    "mau_keo":"Vàng"}', 'truc_in', true)$$,
  'admin creates an axis quote without a delivery date');
-- Thank you: cost 50*3000 = 150000, sale 250000, vat 10% = 25000, debt 250000 + 25000 - 100000.
select lives_ok($$insert into t17 select 'ty', order_id from public.admin_order_create(
  '{"ten_hang":"T17 Thank you","kich_thuoc":"48mm x 100m","mau_sac":"Hồng","ten_khach_hang":"Khách T17",
    "ngay_du_kien":"2030-01-12","so_luong":50,"don_gia_von":3000,"don_gia_ban":5000,"tien_coc":100000,
    "vat_percent":10,"ghi_chu":"giao sáng"}', 'thank_you')$$,
  'admin creates a Thank you order');
select lives_ok($$insert into t17 select 'bki', order_id from public.admin_order_create(
  '{"ten_hang":"T17 BKI","ten_khach_hang":"Khách T17","ngay_du_kien":"2030-01-15","quy_cach_m":100,"cuon_cay":60,
    "so_luong":10,"don_gia_von":900000,"don_gia_ban":15000}')$$,
  'printed-tape create keeps the 0024 call shape (default p_type)');
select throws_ok($$select * from public.admin_order_create('{"ten_hang":"x","ten_khach_hang":"y","ngay_du_kien":"2030-01-01",
  "so_luong":1,"don_gia_ban":1}', 'bang_keo')$$, '22023', null, 'plain tape needs don_gia_goc (as in the app)');
select throws_ok($$select * from public.admin_order_create('{"ten_hang":"x","quy_cach":"1"}', 'thank_you')$$, '22023', null,
  'fields of another type are rejected');
select throws_ok($$select * from public.admin_order_create('{"ten_hang":"x","thanh_tien_ban":1}', 'bang_keo')$$, '22023', null,
  'computed money cannot be sent');
select throws_ok($$select * from public.admin_order_create('{"ten_hang":"x"}', 'xyz')$$, '22023', null,
  'unknown p_type rejected');
select throws_ok($$select * from public.admin_order_create('{"ten_hang":"x","ten_khach_hang":"y","ngay_du_kien":"2030-01-01",
  "so_luong":1,"don_gia_ban":1,"don_gia_goc":1,"workshop_user_id":null}', 'bang_keo')$$, '22023', null,
  'workshop assignee only for printed-tape orders');
select throws_ok($$select * from public.admin_order_create('{"ten_hang":"x","ten_khach_hang":"y","so_luong":1,
  "don_gia_ban":1,"don_gia_goc":1}', 'bang_keo')$$, '22023', null, 'an order needs ngay_du_kien');
select pg_temp.logout();

select matches((select v from t17 where k = 'tiq'), '^BG-TI-\d{2}-\d{2}-\d{3}$', 'axis quote id BG-TI-MM-YY-NNN');
select is((select row(is_quote, ngay_du_kien = (now() at time zone 'Asia/Ho_Chi_Minh')::date, thanh_tien_goc, cong_no_khach)::text
             from public.truc_in_orders where id = (select v from t17 where k = 'tiq')),
  row(true, true, 1600000, 2000000)::text, 'axis quote: today as delivery date, money computed');
select matches((select v from t17 where k = 'ty'), '^TY-\d{2}-\d{2}-\d{3}$', 'Thank you id TY-MM-YY-NNN');
select is(
  (select row(thanh_tien_von, thanh_tien_ban, vat, cong_no_khach, cong_no_ncc, loi_nhuan_rong, kich_thuoc, ghi_chu)::text
     from public.thank_you_orders where id = (select v from t17 where k = 'ty')),
  row(150000, 250000, 25000, 175000, 150000, 100000, '48mm x 100m', 'giao sáng')::text,
  'Thank you money: calculateStandardOrder with deposit');
select ok(not exists (select 1 from public.production_jobs where order_id in (select v from t17 where k in ('bk', 'tiq', 'ty'))),
  'only printed-tape orders get a workshop job');
select ok(exists (select 1 from public.production_jobs where order_id = (select v from t17 where k = 'bki')),
  'printed-tape order still gets its job from the trigger');

-- Update ----------------------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is(
  (select (o ->> 'cong_no_khach')::numeric
     from public.admin_order_update('thank_you', (select v from t17 where k = 'ty'), '{"so_luong":60}') o),
  230000::numeric, 'update recomputes money and debt (60 x 5000 + 10% - 100000)');
select throws_ok(format($$select public.admin_order_update('thank_you', %L, '{"cong_no_khach":0}')$$,
                        (select v from t17 where k = 'ty')), '22023', null, 'update cannot write debt directly');
select throws_ok(format($$select public.admin_order_update('thank_you', %L, '{"ten_hang":null}')$$,
                        (select v from t17 where k = 'ty')), '22023', null, 'update cannot clear the product name');
select throws_ok($$select public.admin_order_update('thank_you', 'NOPE', '{"so_luong":1}')$$, 'P0002', null,
  'update: unknown order');
select pg_temp.logout();

insert into public.bang_keo_orders (id, ngay_du_kien, ten_hang, ten_khach_hang, so_luong, don_gia_goc, don_gia_ban,
                                    thanh_tien, thanh_tien_ban, quote_items)
values ('B-T17-QI', current_date, 'Nhiều kích thước', 'Khách', 10, 100, 300, 1000, 2500,
        '[{"specification":"48mm","quantity":5,"unitPrice":300,"total":1500},{"specification":"60mm","quantity":5,"unitPrice":200,"total":1000}]');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.admin_order_update('bang_keo', 'B-T17-QI', '{"don_gia_ban":400}')$$, '22023', null,
  'multi-size order: money is frozen');
select is(
  (select row(o ->> 'ten_hang', o ->> 'thanh_tien_ban')::text
     from public.admin_order_update('bang_keo', 'B-T17-QI', '{"ten_hang":"Nhiều kích thước (sửa)"}') o),
  row('Nhiều kích thước (sửa)', '2500')::text, 'multi-size order: name changes, money kept');

-- Status ----------------------------------------------------------------------------------------
select is(public.admin_order_set_status('bang_keo', array[(select v from t17 where k = 'bk'), 'B-T17-QI', 'NOPE'], null, true),
  2, 'bulk settle: one statement, existing orders only');
select pg_temp.logout();
select is(
  (select array_agg(row(id, da_giao, da_tat_toan, cong_no_khach, cong_no_ncc)::text order by id)
     from public.bang_keo_orders where id in ((select v from t17 where k = 'bk'), 'B-T17-QI')),
  array[row((select v from t17 where k = 'bk'), false, true, 0, 0)::text, row('B-T17-QI', false, true, 0, 0)::text],
  'settled: debts 0, da_giao left as is (null flag)');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is(public.admin_order_set_status('bang_keo', array[(select v from t17 where k = 'bk')], true, false), 1,
  'reopen + deliver');
select pg_temp.logout();
select is(
  (select row(da_giao, da_tat_toan, cong_no_khach, cong_no_ncc)::text
     from public.bang_keo_orders where id = (select v from t17 where k = 'bk')),
  row(true, false, 272160, 186000)::text, 'reopened: debt recomputed');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.admin_order_set_status('bang_keo', array['x'], null, null)$$, '22023', null,
  'status needs at least one flag');
select is(public.admin_order_set_status('truc_in', array[(select v from t17 where k = 'tiq')], true, true), 0,
  'status never touches quotes');
select is(public.admin_order_set_status('bang_keo_in', array[(select v from t17 where k = 'bki')], true, null), 1,
  'deliver a printed-tape order from the web');
select pg_temp.logout();
select is((select step::text from public.production_jobs where order_id = (select v from t17 where k = 'bki')),
  'da_giao', 'its workshop job follows to da_giao (order trigger)');

-- List ------------------------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is((select count(*)::int from public.admin_orders_list('{"q":"Khách T17"}', 'all')), 3,
  'list all types: real orders matching the search');
select is((select array_agg(type order by type) from public.admin_orders_list('{"q":"Khách T17","is_quote":true}', 'all')),
  array['truc_in'], 'is_quote lists quotes');
-- bk: 272160 total / debt 272160 / supplier 186000; ty (60 rolls): 330000 / 230000 / 180000;
-- bki: 150000 / 150000 / round(10 * 900000 / 90 * 100 / 60) = 166667.
select is(
  (select row(total_count, sum_tong_tien, sum_cong_no_khach, sum_cong_no_ncc,
              sum_loi_nhuan_rong, count_overdue)::text
     from public.admin_orders_totals('{"q":"Khách T17","limit":1}', 'all')),
  row(3, 752160, 652160, 532667, 29400 + 120000 - 16667, 0)::text,
  'totals cover the whole filtered set, not just the page');
select is((select array_agg(l.type order by l.n)
             from (select type, row_number() over () as n
                     from public.admin_orders_list('{"q":"Khách T17","sort":"tong_tien","dir":"asc"}', 'all')) l),
  array['bang_keo_in', 'bang_keo', 'thank_you'], 'sort by tong_tien ascending');
select is((select count(*)::int from public.admin_orders_list('{"q":"Khách T17"}', 'thank_you')), 1, 'list one type');
select is((select count(*)::int from public.admin_orders_list('{"q":"Khách T17","delivered":false,"settled":false}', 'all')), 1,
  'delivered / settled filters');
select throws_ok($$select * from public.admin_orders_list('{"sort":"cong_no_khach; drop"}', 'all')$$, '22023', null,
  'sort key whitelist');
select throws_ok($$select * from public.admin_orders_list('{"dir":"up"}', 'all')$$, '22023', null, 'dir whitelist');
select throws_ok($$select * from public.admin_orders_list('{}', 'orders')$$, '22023', null, 'type whitelist');

-- Get, suggest, latest ----------------------------------------------------------------------------
select is((select public.admin_order_get((select v from t17 where k = 'ty'), 'thank_you') #>> '{order,ten_hang}'),
  'T17 Thank you', 'get a Thank you order');
select is((select public.admin_order_get((select v from t17 where k = 'ty'), 'thank_you') -> 'job'),
  'null'::jsonb, 'get: no job outside printed tape');
select throws_ok($$select public.admin_order_get('B-T17-QI', 'thank_you')$$, 'P0002', null, 'get looks in the given type only');
select is((select array_agg(s) from public.admin_order_name_suggest('bang_keo', 'trong') s),
  array['T17 Băng keo trong'], 'name suggestions');
select is((select public.admin_order_latest_by_name('bang_keo', 't17 Băng KEO TRONG') ->> 'id'),
  (select v from t17 where k = 'bk'), 'latest by name, case-insensitive');
select is(public.admin_order_latest_by_name('bang_keo', 'T17%'), null, 'latest by name: % is not a wildcard');
select pg_temp.logout();

-- Quote -> order ---------------------------------------------------------------------------------
insert into public.order_attachments (order_type, order_id, file_name, content_type, file_size, data)
values ('truc_in', (select v from t17 where k = 'tiq'), 'q.pdf', 'application/pdf', 3, '\x010203');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select throws_ok(format($$select public.admin_quote_convert('truc_in', %L, null)$$, (select v from t17 where k = 'tiq')),
  '22023', null, 'convert needs a delivery date');
select lives_ok(format($$insert into t17 select 'ti', public.admin_quote_convert('truc_in', %L, '2030-02-01')$$,
                       (select v from t17 where k = 'tiq')), 'admin converts the axis quote');
select throws_ok(format($$select public.admin_quote_convert('truc_in', %L, '2030-02-01')$$, (select v from t17 where k = 'tiq')),
  'P0002', null, 'a quote converts once');
select pg_temp.logout();
select matches((select v from t17 where k = 'ti'), '^TI-\d{2}-\d{2}-\d{3}$', 'converted order gets an order id');
select is(
  (select row(is_quote, ngay_du_kien, da_giao, da_tat_toan, cong_no_khach)::text
     from public.truc_in_orders where id = (select v from t17 where k = 'ti')),
  row(false, '2030-02-01'::date, false, false, 2000000)::text, 'converted: delivery date from the caller, debt set');
select is((select order_id from public.order_attachments where file_name = 'q.pdf'), (select v from t17 where k = 'ti'),
  'attachments follow the converted order');

-- Send to workshop ------------------------------------------------------------------------------------
set local app.production_sync = 'off';
insert into public.bang_keo_in_orders (id, ngay_du_kien, ten_hang, is_quote) values
  ('BK-T17-OLD', '2030-03-01', 'Đơn cũ', false), ('BG-BK-T17-Q', '2030-03-01', 'Báo giá', true);
reset app.production_sync;
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select public.admin_order_send_to_workshop('BK-T17-OLD', '00000000-0000-0000-0000-00000000a003')$$,
  '22023', null, 'assignee must be a workshop user');
select lives_ok($$insert into t17 select 'job', public.admin_order_send_to_workshop('BK-T17-OLD', '00000000-0000-0000-0000-00000000a006')$$,
  'admin sends a legacy order to the workshop');
select throws_ok($$select public.admin_order_send_to_workshop('BK-T17-OLD')$$, '22023', null, 'only once');
select throws_ok($$select public.admin_order_send_to_workshop('BG-BK-T17-Q')$$, '22023', null, 'never a quote');
select pg_temp.logout();
select is(
  (select row(step, workshop_user_id, due_date, lead_id)::text from public.production_jobs where order_id = 'BK-T17-OLD'),
  row('cho_san_xuat'::public.production_step, '00000000-0000-0000-0000-00000000a006'::uuid, '2030-03-01'::date, null::uuid)::text,
  'job like the trigger makes it, with the chosen assignee');

-- Delete ---------------------------------------------------------------------------------------------
insert into public.order_attachments (order_type, order_id, file_name) values ('bang_keo', 'B-T17-QI', 'a.pdf');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is(public.admin_order_delete('bang_keo', array['B-T17-QI'], true), 0, 'quote-only delete keeps real orders');
select is(public.admin_order_delete('bang_keo', array['B-T17-QI']), 1, 'admin deletes an order');
select pg_temp.logout();
select ok(not exists (select 1 from public.order_attachments where order_type = 'bang_keo' and order_id = 'B-T17-QI'),
  'its attachments are deleted with it');

-- Thank you move (0027) ------------------------------------------------------------------------------
insert into public.bang_keo_in_orders (
  id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, quy_cach_mm, quy_cach_m, quy_cach_mic, so_luong,
  mau_sac, mau_keo, don_gia_ban, thanh_tien_ban, don_gia_goc, thanh_tien_goc, vat, vat_percent, tien_coc,
  loi_nhuan, tien_hoa_hong, loi_nhuan_rong, loai_truc, ten_truc, truc_so_luong, truc_thanh_tien_ban, truc_vat,
  truc_thanh_tien_goc, truc_loi_nhuan, truc_tien_hoa_hong, truc_loi_nhuan_rong, is_quote, da_giao)
values ('BK-T17-TY1', '2021-03-15 10:00', '2021-03-20', 'Băng keo THANK YOU hồng', 'Shop Hoa', 48, 100, 50, 100,
        'Hồng', 'Trong', 12000, 1200000, 8000, 800000, 96000, 8, 200000,
        400000, 0, 400000, 'moi', 'Trục TY', 1, 500000, 40000, 300000, 200000, 0, 200000, false, false);
insert into t17 select 'tyjob', id::text from public.production_jobs where order_id = 'BK-T17-TY1';
insert into public.bang_keo_in_orders (id, thoi_gian, ngay_du_kien, ten_hang) values
  ('BK-T17-KEEP', '2021-03-16', '2021-03-20', 'Băng keo in logo');
insert into public.bang_keo_orders (id, thoi_gian, ngay_du_kien, ten_hang, quy_cach, so_luong, don_gia_goc, thanh_tien,
                                    don_gia_ban, thanh_tien_ban, vat, is_quote)
values ('BG-B-T17-TY2', '2021-03-20', '2021-03-20', 'Thank you 48mm', '48mm x 80y', 10, 100, 1000, 300, 3000, 0, true),
       ('B-T17-TY3', '2021-03-21', '2021-03-25', 'băng keo thank-you', '60mm', 5, 100, 500, 300, 1500, 120, false);
insert into public.order_attachments (order_type, order_id, file_name) values ('bang_keo_in', 'BK-T17-TY1', 'ty.png');
-- A printed Thank you order whose job belongs to a lead (with a step log and a delivery note).
insert into public.leads (id, customer_name, phone, quantity, status, production_order_id)
values ('00000000-0000-0000-0000-0000000c1701', 'Lead T17', '0900001701', 10, 'new', 'BK-T17-TY4');
set local app.production_sync = 'off';
insert into public.bang_keo_in_orders (id, thoi_gian, ngay_du_kien, ten_hang) values
  ('BK-T17-TY4', '2021-04-10', '2021-04-20', 'Thank you lead');
reset app.production_sync;
insert into public.production_jobs (lead_id, order_id, step)
values ('00000000-0000-0000-0000-0000000c1701', 'BK-T17-TY4', 'cho_san_xuat');
insert into t17 select 'leadjob', id::text from public.production_jobs where order_id = 'BK-T17-TY4';
insert into public.production_step_log (job_id, to_step) select v::uuid, 'cho_san_xuat' from t17 where k = 'leadjob';
insert into public.delivery_notes (job_id, token_hash) select v::uuid, repeat('a', 64) from t17 where k = 'leadjob';

select ok((select v from t17 where k = 'tyjob') is not null, 'fixture: the printed Thank you order had a workshop job');
select is(public.thank_you_move_legacy(), 4, 'every ten_hang ILIKE %thank% row is moved');
select is(
  (select array_agg(row(old_table, old_id, new_id)::text order by new_id) from public.thank_you_migration_map),
  array[row('bang_keo_orders', 'BG-B-T17-TY2', 'BG-TY-03-21-001')::text,
        row('bang_keo_in_orders', 'BK-T17-TY1', 'TY-03-21-001')::text,
        row('bang_keo_orders', 'B-T17-TY3', 'TY-03-21-002')::text,
        row('bang_keo_in_orders', 'BK-T17-TY4', 'TY-04-21-001')::text],
  'map: new TY ids in the month of each order, quotes as BG-TY');
select ok(
  (select bool_and(old_row ->> 'id' = old_id) from public.thank_you_migration_map),
  'map keeps the whole old row');
select ok(
  not exists (select 1 from public.bang_keo_in_orders where id = 'BK-T17-TY1')
  and not exists (select 1 from public.bang_keo_orders where id in ('BG-B-T17-TY2', 'B-T17-TY3'))
  and exists (select 1 from public.bang_keo_in_orders where id = 'BK-T17-KEEP'),
  'old rows deleted, other orders untouched');
select is(
  (select row(ten_hang, kich_thuoc, mau_sac, thanh_tien_ban, vat, thanh_tien_von, loi_nhuan_rong, cong_no_khach,
              cong_no_ncc, thoi_gian, ngay_du_kien, is_quote)::text
     from public.thank_you_orders where id = 'TY-03-21-001'),
  row('Băng keo THANK YOU hồng', '48mm x 100m x 50mic', 'Hồng', 1700000, 136000, 1100000, 600000,
      1636000, 1100000, '2021-03-15 10:00'::timestamp, '2021-03-20'::date, false)::text,
  'printed row: size from quy_cach_*, new axis folded in, debt unchanged (1200000+500000+96000+40000-200000)');
select ok((select ghi_chu like 'Mã cũ: BK-T17-TY1; Màu keo: Trong; Gồm trục mới Trục TY%' from public.thank_you_orders
            where id = 'TY-03-21-001'), 'ghi_chu keeps the old id, glue colour and axis');
select is(
  (select row(kich_thuoc, thanh_tien_von, cong_no_khach, is_quote)::text from public.thank_you_orders where id = 'TY-03-21-002'),
  row('60mm', 500, 1620, false)::text, 'plain row: size from quy_cach, cost from thanh_tien');
select ok(
  not exists (select 1 from public.production_jobs where id::text = (select v from t17 where k = 'tyjob'))
  and not exists (select 1 from public.production_step_log where job_id::text = (select v from t17 where k = 'tyjob'))
  and not exists (select 1 from public.production_jobs where order_id in ('BK-T17-TY1', 'TY-03-21-001')),
  'the workshop job of the moved order is deleted, none created');
select is((select row(order_type, order_id)::text from public.order_attachments where file_name = 'ty.png'),
  row('thank_you', 'TY-03-21-001')::text, 'attachments follow the moved order');
select is(public.thank_you_move_legacy(), 0, 'the move is idempotent');
select is(
  (select row(jsonb_array_length(old_row -> 'jobs'), jsonb_array_length(old_row -> 'steps'),
              jsonb_array_length(old_row -> 'delivery_notes'), old_row #>> '{jobs,0,lead_id}')::text
     from public.thank_you_migration_map where old_id = 'BK-T17-TY4'),
  row(1, 1, 1, '00000000-0000-0000-0000-0000000c1701')::text,
  'map keeps the workshop history (job, step log, delivery notes)');
select ok((select (old_row #>> '{jobs,0,id}') = (select v from t17 where k = 'tyjob')
             and jsonb_array_length(old_row -> 'steps') >= 1
             from public.thank_you_migration_map where old_id = 'BK-T17-TY1'),
  'map keeps the deleted lead-less job and its step log');
select is(
  (select row(order_id, step)::text from public.production_jobs where id::text = (select v from t17 where k = 'leadjob')),
  row(null::text, 'huy'::public.production_step)::text,
  'a lead''s job is kept, detached and cancelled (like the 0024 order delete trigger)');
select ok(exists (select 1 from public.delivery_notes where job_id::text = (select v from t17 where k = 'leadjob')),
  'the lead job''s delivery note is kept');

-- Recompute keeps stored money (admin_order_update after the move / on old app rows) ------------------
set local app.production_sync = 'off';
insert into public.bang_keo_orders (id, ngay_du_kien, ten_hang, ten_khach_hang, so_luong, don_gia_goc, thanh_tien,
                                    don_gia_ban, thanh_tien_ban, vat)
values ('B-T17-VAT', '2030-05-01', 'Legacy VAT', 'Khach A', 10, 30000, 300000, 50000, 500000, 50000);
reset app.production_sync;
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is(
  (select row((o ->> 'cong_no_khach')::numeric, (o ->> 'loi_nhuan_rong')::numeric, trim_scale((o ->> 'don_gia_ban')::numeric))::text
     from public.admin_order_update('thank_you', 'TY-03-21-001', '{"ten_khach_hang":"Shop Hoa 2"}') o),
  row(1636000, 600000, 17000)::text,
  'moved axis row: a name-only edit keeps debt and net profit (prices derived from the combined totals)');
select is(
  (select row((o ->> 'vat')::numeric, trim_scale((o ->> 'vat_percent')::numeric), (o ->> 'cong_no_khach')::numeric)::text
     from public.admin_order_update('bang_keo', 'B-T17-VAT', '{"ten_khach_hang":"Khach B"}') o),
  row(50000, 10, 550000)::text,
  'old app row with a VAT amount and no percent keeps its VAT on a name-only edit');
select pg_temp.logout();

select * from finish();
rollback;
