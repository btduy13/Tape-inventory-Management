-- QC fixes of 0030 / 0032: money inputs need orders.money (create, update, quote), a stored cost is kept
-- on update without it, plain-tape quotes may have cost 0, a single quote axis fills the row's trục
-- columns, admin_orders_rows, attachment cap. Requires seed.sql (admin a001, staff a003).
-- Run: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create function pg_temp.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.perms(p text[]) returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  update public.profiles set permissions = p where id = '00000000-0000-0000-0000-00000000a003';
  perform pg_temp.login('00000000-0000-0000-0000-00000000a003');
end $$;
create function pg_temp.pg() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
create temp table t22 (k text primary key, v text);
grant all on t22 to public;

insert into public.bang_keo_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, so_luong, don_gia_ban,
  thanh_tien_ban, don_gia_goc, thanh_tien, ctv, hoa_hong, tien_ship)
values ('B-T22-A', '2020-05-01 10:00', '2020-05-05', 'T22', 'Khách T22', 10, 2000, 20000, 1500, 15000, 'Cũ', 5, 100);

-- Update without orders.money: CTV / commission / ship ignored, a typed cost does not replace the stored one.
select pg_temp.perms('{orders.view,orders.edit}');
select lives_ok($$select public.admin_order_update('bang_keo', 'B-T22-A',
  '{"ten_hang": "T22 sửa", "ctv": "Lan", "hoa_hong": 30, "tien_ship": 999, "don_gia_goc": 1}')$$, 'update without money');
select pg_temp.pg();
select is((select row(ten_hang, ctv, hoa_hong, tien_ship, don_gia_goc, thanh_tien)::text from public.bang_keo_orders where id = 'B-T22-A'),
  row('T22 sửa', 'Cũ', 5::numeric, 100::numeric, 1500::numeric, 15000::numeric)::text, 'money inputs and stored cost kept');
select pg_temp.perms('{orders.view,orders.edit,orders.money}');
select lives_ok($$select public.admin_order_update('bang_keo', 'B-T22-A', '{"ctv": "Lan", "don_gia_goc": 1000}')$$,
  'update with money');
select pg_temp.pg();
select is((select row(ctv, don_gia_goc)::text from public.bang_keo_orders where id = 'B-T22-A'),
  row('Lan', 1000::numeric)::text, 'money user sets CTV and cost');

-- Only money inputs without orders.money: nothing left to update.
select pg_temp.perms('{orders.view,orders.edit}');
select throws_ok($$select public.admin_order_update('bang_keo', 'B-T22-A', '{"hoa_hong": 50}')$$, '22023', null,
  'money-only payload rejected without money');

-- Create without orders.money: CTV / commission dropped, the required cost stays.
select pg_temp.perms('{orders.view,orders.create}');
insert into t22 select 'c', order_id from public.admin_order_create(
  '{"ten_hang": "T22 mới", "ten_khach_hang": "K", "so_luong": 2, "don_gia_ban": 10, "don_gia_goc": 4,
    "ctv": "Lan", "hoa_hong": 40, "tien_ship": 5, "ngay_du_kien": "2030-01-01"}', 'bang_keo');
select pg_temp.pg();
select is((select row(ctv, coalesce(hoa_hong, 0), coalesce(tien_ship, 0), don_gia_goc)::text from public.bang_keo_orders
            where id = (select v from t22 where k = 'c')),
  row(null::text, 0::numeric, 0::numeric, 4::numeric)::text, 'create without money: money inputs dropped');

-- Quotes: plain tape with cost 0 saves; one axis fills truc_chu_vi / truc_ctv / truc_hoa_hong.
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok($$select public.admin_quote_save('bang_keo', '{"ten_hang": "BG T22", "ten_khach_hang": "K"}',
  '[{"so_luong": 5, "don_gia_ban": 100}]')$$, 'plain-tape quote without cost');
select throws_ok($$select * from public.admin_order_create(
  '{"ten_hang": "x", "ten_khach_hang": "y", "so_luong": 1, "don_gia_ban": 2, "ngay_du_kien": "2030-01-01"}', 'bang_keo')$$,
  '22023', null, 'an order still needs the cost');
insert into t22 select 'q', public.admin_quote_save('bang_keo_in', '{"ten_hang": "BG T22 trục", "ten_khach_hang": "K"}',
  '[{"quy_cach_m": 90, "cuon_cay": 1, "so_luong": 1, "don_gia_ban": 100, "axes": [{"ten_truc": "A", "truc_chu_vi": 320,
     "truc_so_luong": 1, "truc_gia_goc": 10, "truc_gia_ban": 20, "truc_ctv": "Lan", "truc_hoa_hong": 10}]}]');
select pg_temp.pg();
select is((select row(truc_chu_vi, truc_ctv, truc_hoa_hong)::text from public.bang_keo_in_orders where id = (select v from t22 where k = 'q')),
  row(320::numeric, 'Lan', 10::numeric)::text, 'single axis copied to the row');

-- admin_orders_rows: full rows, money hidden without orders.money.
select pg_temp.perms('{orders.view,orders.export}');
select is((select r -> 'ctv' from jsonb_array_elements(public.admin_orders_rows('bang_keo', array['B-T22-A'])) r),
  'null'::jsonb, 'rows hide CTV without money');
select is((select r ->> 'ten_hang' from jsonb_array_elements(public.admin_orders_rows('bang_keo', array['B-T22-A'])) r),
  'T22 sửa', 'rows return the order');
select pg_temp.perms('{}');
select throws_ok($$select public.admin_orders_rows('bang_keo', array['B-T22-A'])$$, '42501', null, 'rows need orders.view + orders.export');

-- Attachments: at most 20 per order.
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select public.admin_order_attachment_add('bang_keo', 'B-T22-A', 'f' || g || '.txt', 'text/plain', encode('x', 'base64'))
  from generate_series(1, 20) g;
select throws_ok($$select public.admin_order_attachment_add('bang_keo', 'B-T22-A', 'f21.txt', 'text/plain', encode('x', 'base64'))$$,
  '22023', null, 'attachment cap');

select * from finish();
rollback;
