-- Regression tests for 0030_web_parity_permissions. Requires seed.sql (admin a001, staff a003 / a005).
-- Run: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(60);

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
-- staff a003's permissions (as postgres)
create function pg_temp.perms(p text[]) returns void language plpgsql as $$
begin
  perform pg_temp.logout();
  update public.profiles set permissions = p where id = '00000000-0000-0000-0000-00000000a003';
  perform pg_temp.login('00000000-0000-0000-0000-00000000a003');
end $$;

create temp table t20 (k text primary key, v text);
grant all on t20 to public;

-- Structure ---------------------------------------------------------------------------------------
select ok(
  (select bool_and(p.prosecdef and p.proconfig @> array['search_path=""']
                   and not has_function_privilege('anon', p.oid, 'EXECUTE')
                   and has_function_privilege('authenticated', p.oid, 'EXECUTE')
                   and not has_function_privilege('electron_app', p.oid, 'EXECUTE'))
     from pg_proc p
    where p.oid in ('public.has_perm(text)'::regprocedure,
                    'public.admin_orders_list(jsonb,text)'::regprocedure,
                    'public.admin_orders_totals(jsonb,text)'::regprocedure,
                    'public.admin_orders_for_export(text[])'::regprocedure,
                    'public.admin_order_attachments(text,text)'::regprocedure,
                    'public.admin_order_attachment_get(integer)'::regprocedure,
                    'public.admin_order_attachment_add(text,text,text,text,text)'::regprocedure,
                    'public.admin_order_attachment_delete(integer)'::regprocedure)),
  'new RPCs: SECURITY DEFINER, empty search_path, authenticated only');
select ok(
  (select bool_and(p.proconfig @> array['search_path=""']
                   and not has_function_privilege('anon', p.oid, 'EXECUTE')
                   and not has_function_privilege('authenticated', p.oid, 'EXECUTE'))
     from pg_proc p
    where p.oid in ('public.order_hide_money(jsonb)'::regprocedure,
                    'public.admin_orders_filtered(jsonb,text)'::regprocedure)),
  'internal helpers: no API execute');
select ok(
  (select bool_and(position('public.is_admin()' in pg_get_functiondef(p.oid)) = 0)
     from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and (p.proname like 'admin_order%' or p.proname like 'admin_quote%'
           or p.proname in ('admin_customers_list', 'admin_customer_get', 'admin_customer_create',
                            'admin_customer_update'))),
  'no order / customer RPC is gated by is_admin any more');
select ok(
  (select bool_and(position('public.is_admin()' in pg_get_functiondef(p.oid)) > 0)
     from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('admin_customer_merge', 'admin_customer_review_list', 'admin_customer_review_resolve',
                        'admin_dashboard')),
  'merge, review queue and dashboard stay admin only');
select throws_ok($$update public.profiles set permissions = array['orders.fly'] where id = '00000000-0000-0000-0000-00000000a005'$$,
  '23514', null, 'unknown permission code rejected');
select throws_ok($$update public.profiles set nav_tabs = array['orders', 'casino'] where id = '00000000-0000-0000-0000-00000000a005'$$,
  '23514', null, 'unknown tab code rejected');
select lives_ok($$update public.profiles set nav_tabs = null where id = '00000000-0000-0000-0000-00000000a005'$$,
  'nav_tabs null = role default');

-- Data: one printed-tape order with a new axis (no job), one plain tape order, one Thank you quote
set local app.production_sync = 'off';
insert into public.bang_keo_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, so_luong, don_gia_ban,
  thanh_tien_ban, vat, don_gia_goc, thanh_tien_goc, loi_nhuan_rong, ctv, hoa_hong, tien_hoa_hong, quy_cach_mm,
  quy_cach_m, quy_cach_mic, loai_truc, ten_truc, truc_chu_vi, truc_so_luong, truc_gia_ban, truc_gia_goc,
  truc_thanh_tien_ban, truc_thanh_tien_goc, truc_vat, truc_ctv, truc_hoa_hong, truc_tien_hoa_hong, truc_loi_nhuan_rong,
  quote_items)
values ('BK-T20-A', '2020-03-05 10:00', current_date + 1, 'T20 in', 'Khách T20', 100, 1000, 100000, 8000, 600, 60000,
  30000, 'Bà Ba', 10, 4000, 48, 100, 50, 'moi', 'Trục T20', 300, 2, 50000, 30000, 100000, 60000, 8000, 'Anh Tư', 5,
  2000, 38000,
  '[{"specification":"48mm","quantity":100,"unitPrice":1000,"total":100000,"costTotal":60000,"profit":40000,
     "fields":{"don-gia-von":"600"},"axes":[{"name":"Trục T20","total":100000,"costTotal":60000,"collaborator":"Anh Tư"}]}]');
reset app.production_sync;
insert into public.bang_keo_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, so_luong, don_gia_ban,
  thanh_tien_ban, vat, don_gia_goc, thanh_tien, loi_nhuan_rong, ctv, da_tat_toan)
values ('B-T20-B', '2020-03-20 10:00', current_date - 1, 'T20 thường', 'Khách T20', 10, 2000, 20000, 0, 1500, 15000,
  5000, null, true);
insert into public.thank_you_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, so_luong, thanh_tien_ban,
  thanh_tien_von, is_quote)
values ('BG-TY-T20-Q', '2020-03-21 10:00', current_date, 'T20 quote', 'Khách T20', 1, 500, 300, true);

-- Staff without permissions -----------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select is(public.has_perm('orders.view'), false, 'staff has no permission by default');
select throws_ok($$select * from public.admin_orders_list('{}', 'all')$$, '42501', null, 'no perms: list denied');
select throws_ok($$select * from public.admin_orders_totals('{}', 'all')$$, '42501', null, 'no perms: totals denied');
select throws_ok($$select public.admin_order_get('B-T20-B', 'bang_keo')$$, '42501', null, 'no perms: get denied');
select throws_ok($$select * from public.admin_orders_for_export(array['B-T20-B'])$$, '42501', null, 'no perms: export denied');
select throws_ok($$select * from public.admin_order_attachments('bang_keo', 'B-T20-B')$$, '42501', null,
  'no perms: attachments denied');
select throws_ok($$select * from public.admin_customers_list()$$, '42501', null, 'no perms: customers denied');

-- A user cannot grant himself anything ------------------------------------------------------------
select throws_ok($$update public.profiles set permissions = array['orders.view'] where id = auth.uid()$$,
  '42501', null, 'user cannot set own permissions');
select throws_ok($$update public.profiles set nav_tabs = array['orders'] where id = auth.uid()$$,
  '42501', null, 'user cannot set own tabs');
select lives_ok($$update public.profiles set phone = '0900000020' where id = auth.uid()$$,
  'user still edits own phone');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000a003'
             and permissions = '{}' and nav_tabs is null), 1, 'own permissions unchanged');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok($$update public.profiles set permissions = array['orders.view'], nav_tabs = array['orders']
                   where id = '00000000-0000-0000-0000-00000000a005'$$, 'admin sets permissions and tabs');
select is((select permissions from public.profiles where id = '00000000-0000-0000-0000-00000000a005'),
  array['orders.view'], 'admin change stored');

-- orders.view: rows with money null -----------------------------------------------------------------
select pg_temp.perms(array['orders.view']);
select is(public.has_perm('orders.view'), true, 'has_perm: granted code');
select is(public.has_perm('orders.money'), false, 'has_perm: other code');
select is(
  (select row(tong_tien, cong_no_khach, cong_no_ncc, tien_von, loi_nhuan_rong, ctv, loai_truc, ten_truc,
              truc_chu_vi, truc_so_luong, truc_thanh_tien_ban, truc_ctv, truc_hoa_hong, truc_tien_hoa_hong,
              truc_loi_nhuan_rong, da_gui_email, tien_coc)::text
     from public.admin_orders_list('{"q":"BK-T20-A"}', 'all')),
  row(216000::numeric, 216000::numeric, null::numeric, null::numeric, null::numeric, null::text, 'moi', 'Trục T20',
      300::numeric, 2::numeric, 100000::numeric, null::text, null::numeric, null::numeric, null::numeric, false,
      0::numeric)::text,
  'view only: sale side and axis shown, cost / profit / CTV / commission null');
select is((select row(sum_tong_tien, sum_cong_no_khach, sum_cong_no_ncc, sum_loi_nhuan_rong)::text
             from public.admin_orders_totals('{"q":"Khách T20"}', 'all')),
  row(236000, 216000, null::numeric, null::numeric)::text, 'view only: totals hide supplier debt and profit');
select is((select public.admin_order_get('BK-T20-A', 'bang_keo_in') -> 'order'
                  -> 'thanh_tien_goc'), 'null'::jsonb, 'view only: get hides cost');
select is((select public.admin_order_get('BK-T20-A', 'bang_keo_in') #>> '{order,thanh_tien_ban}'), '100000',
  'view only: get keeps sale');
select is((select public.admin_order_get('BK-T20-A', 'bang_keo_in') #> '{order,quote_items,0}'
                  ?| array['costTotal', 'profit', 'fields']), false, 'view only: quote item cost keys removed');
select is((select public.admin_order_get('BK-T20-A', 'bang_keo_in') #> '{order,quote_items,0,axes,0}' ? 'collaborator'),
  false, 'view only: quote axis CTV removed');
select throws_ok($$select * from public.admin_orders_list('{"sort":"loi_nhuan_rong"}', 'all')$$, '42501', null,
  'view only: no sort by profit');
select throws_ok($$select * from public.admin_orders_list('{"ctv":"Ba"}', 'all')$$, '42501', null,
  'view only: no CTV filter');
select throws_ok($$select * from public.admin_order_create('{"ten_hang":"x","ten_khach_hang":"y","so_luong":1,"don_gia_ban":2,"don_gia_goc":1,"ngay_du_kien":"2030-01-01"}', 'bang_keo')$$,
  '42501', null, 'view only: create denied');
select throws_ok($$select public.admin_order_update('bang_keo', 'B-T20-B', '{"ten_hang":"y"}')$$, '42501', null,
  'view only: update denied');
select throws_ok($$select public.admin_order_set_status('bang_keo', array['B-T20-B'], true, null)$$, '42501', null,
  'view only: status denied');
select throws_ok($$select public.admin_order_delete('bang_keo', array['B-T20-B'])$$, '42501', null,
  'view only: delete denied');
select throws_ok($$select public.admin_customer_create('{"name":"Khách T20"}')$$, '42501', null,
  'view only: customer create denied');
select throws_ok($$select public.admin_order_attachment_add('bang_keo', 'B-T20-B', 'a.txt', 'text/plain', 'aGVsbG8=')$$,
  '42501', null, 'view only: attachment add denied');

-- orders.money ----------------------------------------------------------------------------------------
select pg_temp.perms(array['orders.view', 'orders.money']);
select is(
  (select row(cong_no_ncc, tien_von, loi_nhuan_rong, ctv, truc_ctv, truc_loi_nhuan_rong)::text
     from public.admin_orders_list('{"q":"BK-T20-A"}', 'all')),
  row(120000::numeric, 120000::numeric, 68000::numeric, 'Bà Ba', 'Anh Tư', 38000::numeric)::text,
  'with orders.money: cost, profit and CTV shown');
select is((select array_agg(id order by id) from public.admin_orders_list('{"ctv":"Tư","q":"T20"}', 'all')),
  array['BK-T20-A'], 'CTV filter also matches the axis CTV');
select is((select public.admin_order_get('BK-T20-A', 'bang_keo_in') #>> '{order,thanh_tien_goc}'), '60000',
  'with orders.money: get shows cost');

-- Totals = the old list totals (sums of every row of the same filter) ------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is(
  (select row(total_count, sum_tong_tien, sum_cong_no_khach, sum_cong_no_ncc, sum_loi_nhuan_rong, count_due_soon,
              count_overdue, count_unsettled, count_settled)::text
     from public.admin_orders_totals('{"q":"Khách T20","limit":1}', 'all')),
  (select row(count(*), sum(tong_tien), sum(case when da_tat_toan then 0 else cong_no_khach end),
              sum(case when da_tat_toan then 0 else cong_no_ncc end), sum(loi_nhuan_rong),
              count(*) filter (where not da_giao and ngay_du_kien between (now() at time zone 'Asia/Ho_Chi_Minh')::date and (now() at time zone 'Asia/Ho_Chi_Minh')::date + 3),
              count(*) filter (where not da_giao and ngay_du_kien < (now() at time zone 'Asia/Ho_Chi_Minh')::date),
              count(*) filter (where not da_tat_toan), count(*) filter (where da_tat_toan))::text
     from public.admin_orders_list('{"q":"Khách T20","limit":200}', 'all')),
  'totals cover the whole filtered set like the list rows');
select is((select row(total_count, count_overdue, count_settled)::text
             from public.admin_orders_totals('{"q":"Khách T20"}', 'all')),
  row(2::bigint, 1::bigint, 1::bigint)::text, 'totals: 2 orders, the settled one is overdue (not delivered)');
select is((select count(*)::int from public.admin_orders_list('{"q":"Khách T20","date_from":"2020-03-20","date_to":"2020-03-20"}', 'all')),
  1, 'date range is inclusive of the end day');
select is((select total_count::int from public.admin_orders_totals('{"q":"Khách T20","is_quote":true}', 'all')), 1,
  'totals honour is_quote');

-- Per-RPC permissions ---------------------------------------------------------------------------------
select pg_temp.perms(array['orders.status']);
select is(public.admin_order_set_status('bang_keo', array['B-T20-B'], true, null), 1, 'orders.status: set status');
select throws_ok($$select * from public.admin_orders_list('{}', 'all')$$, '42501', null, 'orders.status alone cannot list');
select pg_temp.perms(array['orders.edit']);
select is((select public.admin_order_update('bang_keo', 'B-T20-B', '{"ten_hang":"T20 sửa"}') ->> 'ten_hang'), 'T20 sửa',
  'orders.edit: update');
select is((select public.admin_order_update('bang_keo', 'B-T20-B', '{"ten_hang":"T20 sửa 2"}') -> 'thanh_tien'),
  'null'::jsonb, 'orders.edit without money: updated row hides cost');
select pg_temp.perms(array['orders.create']);
select isnt((select order_id from public.admin_order_create(
  '{"ten_hang":"T20 mới","ten_khach_hang":"Khách T20 mới","so_luong":1,"don_gia_ban":2000,"don_gia_goc":1000,"ngay_du_kien":"2030-01-01"}',
  'bang_keo')), null, 'orders.create: create');
select pg_temp.perms(array['orders.delete']);
select is(public.admin_order_delete('bang_keo', array['B-T20-B']), 1, 'orders.delete: delete');
select pg_temp.perms(array['customers.edit']);
select isnt(public.admin_customer_create('{"name":"Khách T20 KH"}'), null, 'customers.edit: create customer');
select throws_ok($$select public.admin_customer_merge(gen_random_uuid(), array[gen_random_uuid()])$$, '42501', null,
  'customers.edit: merge stays admin only');

-- Export ------------------------------------------------------------------------------------------------
select pg_temp.perms(array['orders.view', 'orders.export']);
select is((select array_agg(id::text) from public.admin_orders_for_export(array['BG-TY-T20-Q', 'BK-T20-A', 'nope'])),
  array['BK-T20-A'], 'export: real orders only, unknown ids skipped');
select is(
  (select row(type, quy_cach_mm, truc_gia_ban, truc_thanh_tien_ban, (quote_items -> 0) ? 'costTotal',
              (quote_items -> 0 ->> 'total'))::text
     from public.admin_orders_for_export(array['BK-T20-A'])),
  row('bang_keo_in', 48::numeric, 50000::numeric, 100000::numeric, false, '100000')::text,
  'export: sale side, axis, quote items without cost');

-- Attachments -------------------------------------------------------------------------------------------
select pg_temp.perms(array['orders.view', 'orders.edit']);
insert into t20 values ('att', public.admin_order_attachment_add('bang_keo_in', 'BK-T20-A', ' a.txt ', 'text/plain', 'aGVsbG8=')::text);
select is((select row(file_name, file_size)::text from public.admin_order_attachments('bang_keo_in', 'BK-T20-A')),
  row('a.txt', 5)::text, 'attachment listed with its decoded size');
select is((select base64_data from public.admin_order_attachment_get((select v::int from t20 where k = 'att'))),
  'aGVsbG8=', 'attachment content as base64');
select throws_ok($$select public.admin_order_attachment_add('bang_keo_in', 'BK-T20-A', 'a.txt', null, '***')$$, '22023',
  null, 'attachment: invalid base64');
select throws_ok($$select public.admin_order_attachment_add('bang_keo_in', 'BK-T20-A', 'a.txt', null, repeat('QUFB', 9000001))$$,
  '22023', null, 'attachment: over 25 MB');
select throws_ok($$select public.admin_order_attachment_add('bang_keo_in', 'BK-NONE', 'a.txt', null, 'aGVsbG8=')$$, 'P0002',
  null, 'attachment: order must exist');
select is(public.admin_order_attachment_delete((select v::int from t20 where k = 'att')), 1, 'attachment deleted');

-- Inactive account loses every permission ---------------------------------------------------------------
select pg_temp.logout();
update public.profiles set is_active = false where id = '00000000-0000-0000-0000-00000000a003';
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select is(public.has_perm('orders.view'), false, 'inactive profile: has_perm false');
select pg_temp.logout();

select * from finish();
rollback;
