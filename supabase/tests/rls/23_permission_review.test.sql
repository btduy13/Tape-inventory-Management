-- 0033 review fixes: cost inputs kept for users without orders.money (create sets, update keeps a stored
-- one), the new axis cannot be removed without money, bulk export needs orders.export, latest-by-name
-- hides the customer without orders.view, customer_get lists only visible leads, import is all or nothing.
-- Requires seed.sql (admin a001, staff a003, staff a005). Run: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

create function pg_temp.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.pg() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
create function pg_temp.perms(p text[]) returns void language plpgsql as $$
begin
  perform pg_temp.pg();
  update public.profiles set permissions = p where id = '00000000-0000-0000-0000-00000000a003';
  perform pg_temp.login('00000000-0000-0000-0000-00000000a003');
end $$;
create temp table t23 (k text primary key, v text);
grant all on t23 to public;

insert into public.bang_keo_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang,
  quy_cach_m, cuon_cay, so_luong, don_gia_ban, don_gia_von, phi_sl, loai_truc, ten_truc, truc_so_luong,
  truc_gia_goc, truc_gia_ban, truc_ctv, truc_hoa_hong)
values ('BK-T23-A', '2020-05-01 10:00', '2020-05-05', 'T23 hàng', 'Khách T23', '0900000023',
  90, 60, 10, 30000, 900000, 500, 'moi', 'Trục T23', 1, 50000, 80000, 'An', 10);

-- Create without orders.money keeps the cost inputs (no more cost-0 printed tape).
select pg_temp.perms('{orders.view,orders.create}');
insert into t23 select 'c', order_id from public.admin_order_create(
  '{"ten_hang": "T23 mới", "ten_khach_hang": "K", "quy_cach_m": 90, "cuon_cay": 60, "so_luong": 10,
    "don_gia_ban": 30000, "don_gia_von": 900000, "phi_sl": 200, "ngay_du_kien": "2030-01-01"}', 'bang_keo_in');
select pg_temp.pg();
select is((select row(don_gia_von, phi_sl, thanh_tien_goc > 0)::text from public.bang_keo_in_orders
            where id = (select v from t23 where k = 'c')),
  row(900000::numeric, 200::numeric, true)::text, 'create without money: cost inputs saved');

-- Update without money: a stored cost / fee is kept, a typed one ignored.
select pg_temp.perms('{orders.view,orders.edit}');
select lives_ok($$select public.admin_order_update('bang_keo_in', 'BK-T23-A',
  '{"ten_hang": "T23 sửa", "don_gia_von": 1, "phi_sl": 1}')$$, 'update without money');
select pg_temp.pg();
select is((select row(ten_hang, don_gia_von, phi_sl)::text from public.bang_keo_in_orders where id = 'BK-T23-A'),
  row('T23 sửa', 900000::numeric, 500::numeric)::text, 'stored cost and fee kept');

-- Removing the new axis needs money.
select pg_temp.perms('{orders.view,orders.edit}');
select throws_ok($$select public.admin_order_update('bang_keo_in', 'BK-T23-A', '{"loai_truc": "cu"}')$$,
  '42501', null, 'axis removal denied without money');
select pg_temp.pg();
select is((select row(loai_truc, truc_gia_goc, truc_ctv)::text from public.bang_keo_in_orders where id = 'BK-T23-A'),
  row('moi', 50000::numeric, 'An')::text, 'axis cost and CTV intact');
select pg_temp.perms('{orders.view,orders.edit,orders.money}');
select lives_ok($$select public.admin_order_update('bang_keo_in', 'BK-T23-A', '{"loai_truc": "cu"}')$$,
  'axis removal with money');

-- Bulk export needs orders.export.
select pg_temp.perms('{orders.view}');
select throws_ok($$select * from public.admin_orders_for_export(array['BK-T23-A'])$$, '42501', null, 'export needs orders.export');
select throws_ok($$select public.admin_orders_rows('bang_keo_in', array['BK-T23-A'])$$, '42501', null, 'rows need orders.export');

-- Latest by name: customer hidden without orders.view.
select pg_temp.perms('{orders.create}');
select is((select public.admin_order_latest_by_name('bang_keo_in', 'T23 sửa') ?| array['ten_khach_hang', 'sdt_khach_hang']),
  false, 'latest without view: no customer');
select pg_temp.perms('{orders.create,orders.view}');
select is(public.admin_order_latest_by_name('bang_keo_in', 'T23 sửa') ->> 'ten_khach_hang', 'Khách T23', 'latest with view: customer');

-- customer_get: a staff user sees only leads assigned to them.
select pg_temp.pg();
insert into public.customers (id, name) values ('00000000-0000-0000-0000-0000000c0023', 'Khách T23 KH');
insert into public.leads (customer_name, phone, quantity, customer_id, assigned_to) values
  ('Lead T23 mine', '0900000231', 100, '00000000-0000-0000-0000-0000000c0023', '00000000-0000-0000-0000-00000000a003'),
  ('Lead T23 other', '0900000232', 100, '00000000-0000-0000-0000-0000000c0023', '00000000-0000-0000-0000-00000000a005');
select pg_temp.perms('{orders.view}');
select is((select array_agg(l ->> 'customer_name') from jsonb_array_elements(
            public.admin_customer_get('00000000-0000-0000-0000-0000000c0023') -> 'leads') l),
  array['Lead T23 mine'], 'customer_get: only visible leads');

-- Import: all rows or none; a flag needs orders.status.
select pg_temp.perms('{orders.view,orders.create}');
select throws_like($$select public.admin_orders_import('bang_keo', '[
  {"payload": {"ten_hang": "T23 imp", "ten_khach_hang": "K", "so_luong": 1, "don_gia_ban": 2, "don_gia_goc": 1, "ngay_du_kien": "2030-01-01"}},
  {"payload": {"ten_hang": "T23 imp", "ten_khach_hang": "K", "so_luong": 1, "don_gia_ban": 2, "ngay_du_kien": "2030-01-01"}}]')$$,
  'row 2:%', 'import: bad row 2 named');
select throws_ok($$select public.admin_orders_import('bang_keo', '[
  {"payload": {"ten_hang": "T23 imp", "ten_khach_hang": "K", "so_luong": 1, "don_gia_ban": 2, "don_gia_goc": 1, "ngay_du_kien": "2030-01-01"},
   "delivered": true}]')$$, '42501', null, 'import: flag needs orders.status');
select pg_temp.pg();
select is((select count(*)::int from public.bang_keo_orders where ten_hang = 'T23 imp'), 0, 'import: nothing saved on error');
select pg_temp.perms('{orders.view,orders.create,orders.status}');
select is(public.admin_orders_import('bang_keo', '[
  {"payload": {"ten_hang": "T23 imp", "ten_khach_hang": "K", "so_luong": 1, "don_gia_ban": 2, "don_gia_goc": 1, "ngay_du_kien": "2030-01-01"},
   "delivered": true}]'), 1, 'import: saved with flag');

select * from finish();
rollback;
