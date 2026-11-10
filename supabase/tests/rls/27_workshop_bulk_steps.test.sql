begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into public.bang_keo_in_orders (id, ten_hang, ngay_du_kien, is_quote)
values ('BK-T27-A', 'Batch A', current_date, false), ('BK-T27-B', 'Batch B', current_date, false);

create temp table t27_selection as
select jsonb_agg(jsonb_build_object('job_id', id, 'from_step', step) order by id) as jobs
  from public.production_jobs where order_id in ('BK-T27-A', 'BK-T27-B');
grant select on t27_selection to authenticated;

select ok(not has_function_privilege('anon', 'public.admin_workshop_set_steps(jsonb,public.production_step)', 'EXECUTE'),
  'anonymous users cannot call the batch RPC');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a006';
select throws_ok($$select public.admin_workshop_set_steps(jobs, 'da_san_xuat') from t27_selection$$,
  '42501', null, 'workshop role cannot batch update');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
select throws_ok($$
  select public.admin_workshop_set_steps(jsonb_set(jobs, '{1,from_step}', '"da_giao"'), 'da_san_xuat') from t27_selection
$$, '40001', null, 'a stale second row rejects the batch');
select is((select count(*)::int from public.production_jobs
  where order_id in ('BK-T27-A', 'BK-T27-B') and step = 'cho_san_xuat'), 2, 'the first row is rolled back too');
select is((select public.admin_workshop_set_steps(jobs, 'da_san_xuat') from t27_selection), 2,
  'admin can mark both orders as complete');
select is((select count(*)::int from public.production_step_log
  where job_id in (select id from public.production_jobs where order_id in ('BK-T27-A', 'BK-T27-B'))
    and to_step = 'da_san_xuat'), 2, 'each successful change is logged once');
select is((select public.admin_workshop_set_steps(
  (select jsonb_agg(jsonb_build_object('job_id', id, 'from_step', step))
     from public.production_jobs where order_id in ('BK-T27-A', 'BK-T27-B')),
  'da_giao')), 2, 'admin can mark both orders as delivered');
reset role;
select is((select count(*)::int from public.bang_keo_in_orders
  where id in ('BK-T27-A', 'BK-T27-B') and da_giao), 2, 'the shared app delivery flags are updated');
select * from finish();
rollback;
