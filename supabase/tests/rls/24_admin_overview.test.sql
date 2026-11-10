-- Regression tests for 0034_admin_overview. Requires seed.sql (admin a001, staff a003).
-- Works on deltas against a baseline, so seed / other rows do not matter.
-- Run: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

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
create temp table t24 (k text primary key, v jsonb);
grant all on t24 to public;

select ok(
  (select p.prosecdef and p.proconfig @> array['search_path=""']
          and not has_function_privilege('anon', p.oid, 'EXECUTE')
          and has_function_privilege('authenticated', p.oid, 'EXECUTE')
     from pg_proc p where p.oid = 'public.admin_overview(integer)'::regprocedure),
  'admin_overview: security definer, fixed search_path, authenticated only');

-- Gate: orders.view.
select pg_temp.perms('{}');
select throws_ok('select public.admin_overview()', '42501', null, 'without orders.view: denied');

-- Without orders.money: cost side null, sale side kept.
select pg_temp.perms('{orders.view}');
insert into t24 values ('staff_base', public.admin_overview());
select is((select v ->> 'money' from t24 where k = 'staff_base'), 'false', 'no money flag');
select ok((select v -> 'kpi' ->> 'profit' is null and v -> 'kpi' ->> 'supplier_debt' is null
                  and v -> 'kpi' ->> 'supplier_debt_new_prev' is null and v -> 'kpi' ->> 'revenue' is not null
             from t24 where k = 'staff_base'), 'no money: profit and supplier debt null, revenue kept');
select ok((select bool_and(m ->> 'profit' is null) from t24, jsonb_array_elements(v -> 'months') m
            where k = 'staff_base'), 'no money: monthly profit null');

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
insert into t24 values ('base', public.admin_overview());
select pg_temp.pg();

-- This month: BKI with new axis (overdue, no job), plain tape (settled, due soon), Thank you
-- (delivered). Last month: print axis order. A quote (ignored). A new unassigned lead.
set local app.production_sync = 'off';
insert into public.bang_keo_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, thanh_tien_ban,
                                       loi_nhuan_rong, thanh_tien_goc, loai_truc, truc_thanh_tien_ban, truc_loi_nhuan_rong)
values ('BK-T24-A', (now() at time zone 'Asia/Ho_Chi_Minh')::timestamp,
        (now() at time zone 'Asia/Ho_Chi_Minh')::date - 1, 'x', 'Khách T24', 10000, 3000, 6000, 'moi', 2000, 500);
insert into public.bang_keo_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, thanh_tien_ban, is_quote)
values ('BG-BK-T24-Q', (now() at time zone 'Asia/Ho_Chi_Minh')::timestamp,
        (now() at time zone 'Asia/Ho_Chi_Minh')::date - 5, 'x', 99999, true);
reset app.production_sync;
insert into public.bang_keo_orders (id, thoi_gian, ngay_du_kien, ten_hang, thanh_tien_ban, vat, thanh_tien,
                                    loi_nhuan_rong, da_tat_toan)
values ('B-T24-B', (now() at time zone 'Asia/Ho_Chi_Minh')::timestamp,
        (now() at time zone 'Asia/Ho_Chi_Minh')::date + 2, 'x', 1000, 80, 700, 200, true);
insert into public.thank_you_orders (id, thoi_gian, ngay_du_kien, ten_hang, thanh_tien_ban, vat, thanh_tien_von,
                                     loi_nhuan_rong, da_giao)
values ('TY-T24-C', (now() at time zone 'Asia/Ho_Chi_Minh')::timestamp,
        (now() at time zone 'Asia/Ho_Chi_Minh')::date + 10, 'x', 5000, 500, 3000, 2000, true);
insert into public.truc_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, thanh_tien_ban, thanh_tien_goc, loi_nhuan_rong)
values ('TI-T24-D', date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') - interval '1 day',
        (now() at time zone 'Asia/Ho_Chi_Minh')::date + 10, 'x', 2000, 1500, 500);
insert into public.leads (customer_name, phone, quantity) values ('Lead T24', '0900000024', 10);

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
insert into t24 values ('after', public.admin_overview());
select pg_temp.perms('{orders.view}');
insert into t24 values ('staff_after', public.admin_overview());

create temp view d24 as
  select f.k, (a.v #>> f.p)::numeric - (b.v #>> f.p)::numeric as delta
    from t24 a, t24 b, (values
      ('overdue', '{attention,overdue}'::text[]), ('due_soon', '{attention,due_soon}'),
      ('not_in_workshop', '{attention,not_in_workshop}'), ('pipeline_none', '{pipeline,none}'),
      ('revenue', '{kpi,revenue}'), ('revenue_prev', '{kpi,revenue_prev}'), ('profit', '{kpi,profit}'),
      ('customer_debt', '{kpi,customer_debt}'), ('supplier_debt', '{kpi,supplier_debt}'),
      ('leads_new', '{leads,new}'), ('bki_month', '{months,11,bang_keo_in}'), ('ty_month', '{months,11,thank_you}'),
      ('ti_prev_month', '{months,10,truc_in}')) f(k, p)
   where a.k = 'after' and b.k = 'base';
grant select on d24 to public;

select is((select delta from d24 where k = 'overdue'), 1::numeric, 'overdue: undelivered, quote ignored');
select is((select delta from d24 where k = 'due_soon'), 1::numeric, 'due soon: today .. today + 3');
select is((select delta from d24 where k = 'not_in_workshop'), 1::numeric, 'BKI real order without a job');
select is((select delta from d24 where k = 'pipeline_none'), 1::numeric, 'pipeline: not in the workshop');
select is((select delta from d24 where k = 'revenue'), 18000::numeric, 'revenue: this month, new axis, no VAT, no quote');
select is((select delta from d24 where k = 'revenue_prev'), 2000::numeric, 'revenue: last month');
select is((select delta from d24 where k = 'profit'), 5700::numeric, 'profit: loi_nhuan_rong + new axis');
select is((select delta from d24 where k = 'customer_debt'), 19500::numeric, 'customer debt: unsettled real orders');
select is((select delta from d24 where k = 'supplier_debt'), 10500::numeric, 'supplier debt: unsettled real orders');
select is((select delta from d24 where k = 'bki_month'), 12000::numeric, 'chart: printed tape this month');
select is((select delta from d24 where k = 'ty_month') || '/' || (select delta from d24 where k = 'ti_prev_month'),
  '5000/2000', 'chart: Thank you this month, print axis last month');
select is((select delta from d24 where k = 'leads_new'), 1::numeric, 'admin sees the new unassigned lead');
select is((select (a.v #>> '{leads,new}')::int - (b.v #>> '{leads,new}')::int from t24 a, t24 b
            where a.k = 'staff_after' and b.k = 'staff_base'), 0, 'staff does not see unassigned leads');
select is((select jsonb_array_length(v -> 'months') from t24 where k = 'after'), 12, '12 months');

select * from finish();
rollback;
