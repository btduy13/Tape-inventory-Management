-- Regression tests for 0029_admin_dashboard. Requires seed.sql (admin a001, staff a003).
-- Works on deltas against a baseline, so seed / other rows do not matter.
-- Run: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

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

create temp table t19 (k text primary key, v jsonb);
grant all on t19 to public;

select ok(
  (select p.prosecdef and p.proconfig @> array['search_path=""']
          and not has_function_privilege('anon', p.oid, 'EXECUTE')
          and has_function_privilege('authenticated', p.oid, 'EXECUTE')
     from pg_proc p where p.oid = 'public.admin_dashboard()'::regprocedure),
  'admin_dashboard: security definer, fixed search_path, authenticated only');

select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select throws_ok('select public.admin_dashboard()', '42501', null, 'staff cannot read the dashboard');

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
insert into t19 values ('base', public.admin_dashboard());
select pg_temp.logout();

-- This month: BKI with new axis (overdue, no job), plain tape (settled, due soon), Thank you (delivered).
-- Last month: axis order (debt only). A quote (pending_quotes only).
set local app.production_sync = 'off';
insert into public.bang_keo_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, thanh_tien_ban, loi_nhuan_rong,
                                       thanh_tien_goc, loai_truc, truc_thanh_tien_ban, truc_loi_nhuan_rong)
values ('BK-T19-A', (now() at time zone 'Asia/Ho_Chi_Minh')::timestamp,
        (now() at time zone 'Asia/Ho_Chi_Minh')::date - 1, 'x', 10000, 3000, 6000, 'moi', 2000, 500);
insert into public.bang_keo_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, thanh_tien_ban, is_quote)
values ('BG-BK-T19-Q', (now() at time zone 'Asia/Ho_Chi_Minh')::timestamp,
        (now() at time zone 'Asia/Ho_Chi_Minh')::date - 5, 'x', 99999, true);
reset app.production_sync;
insert into public.bang_keo_orders (id, thoi_gian, ngay_du_kien, ten_hang, thanh_tien_ban, vat, thanh_tien,
                                    loi_nhuan_rong, da_tat_toan)
values ('B-T19-B', (now() at time zone 'Asia/Ho_Chi_Minh')::timestamp,
        (now() at time zone 'Asia/Ho_Chi_Minh')::date + 2, 'x', 1000, 80, 700, 200, true);
insert into public.thank_you_orders (id, thoi_gian, ngay_du_kien, ten_hang, thanh_tien_ban, vat, thanh_tien_von,
                                     loi_nhuan_rong, da_giao)
values ('TY-T19-C', (now() at time zone 'Asia/Ho_Chi_Minh')::timestamp,
        (now() at time zone 'Asia/Ho_Chi_Minh')::date + 10, 'x', 5000, 500, 3000, 2000, true);
insert into public.truc_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, thanh_tien_ban, thanh_tien_goc, loi_nhuan_rong)
values ('TI-T19-D', date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') - interval '1 day',
        (now() at time zone 'Asia/Ho_Chi_Minh')::date + 10, 'x', 2000, 1500, 500);

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
insert into t19 values ('after', public.admin_dashboard());

create temp view d19 as
  select f.k, (a.v ->> f.k)::numeric - (b.v ->> f.k)::numeric as delta
    from t19 a, t19 b, unnest(array['orders', 'revenue', 'profit', 'open_debt', 'supplier_debt', 'overdue',
                                    'due_soon', 'pending_quotes', 'not_in_workshop']) f(k)
   where a.k = 'after' and b.k = 'base';

select is((select delta from d19 where k = 'orders'), 3::numeric, 'orders: this month, real only');
select is((select delta from d19 where k = 'revenue'), 18000::numeric,
  'revenue: thanh_tien_ban + new axis, no VAT, no quote, no last month');
select is((select delta from d19 where k = 'profit'), 5700::numeric, 'profit: loi_nhuan_rong + new axis');
select is((select delta from d19 where k = 'open_debt'), 19500::numeric,
  'open debt: unsettled real orders of any month (12000 + 5500 + 2000)');
select is((select delta from d19 where k = 'supplier_debt'), 10500::numeric,
  'supplier debt: unsettled real orders (6000 + 3000 + 1500)');
select is((select delta from d19 where k = 'overdue'), 1::numeric, 'overdue: undelivered, quote ignored');
select is((select delta from d19 where k = 'due_soon'), 1::numeric, 'due soon: today .. today + 3');
select is((select delta from d19 where k = 'pending_quotes'), 1::numeric, 'pending quotes');
select is((select delta from d19 where k = 'not_in_workshop'), 1::numeric, 'BKI real order without a job');
select is((select jsonb_typeof(v -> 'steps') from t19 where k = 'after'), 'object', 'steps is an object');
select ok((select (v ->> 'new_leads')::int >= 0 and (v ->> 'month_start')::date
                  = date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date
             from t19 where k = 'after'), 'new_leads and month_start present');

select * from finish();
rollback;
