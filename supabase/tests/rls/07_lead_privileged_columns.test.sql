-- Regression tests for migration 0013_lead_privileged_columns.
-- Requires seed.sql. Run: npm run db:test   (from web/)
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

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

-- staff (a003, assigned to b0001) ------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select throws_ok(
  $$update public.leads set assigned_to = '00000000-0000-0000-0000-00000000a004'
    where id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'staff cannot reassign own lead to someone else');
select throws_ok(
  $$update public.leads set assigned_to = null where id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'staff cannot unassign own lead');
select throws_ok(
  $$update public.leads set assigned_at = assigned_at where id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'staff cannot write assigned_at (same value)');
select throws_ok(
  $$update public.leads set production_order_id = 'X' where id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'staff cannot set production link');
select throws_ok(
  $$update public.leads set source_ip_hash = source_ip_hash, user_agent = user_agent
    where id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'staff cannot write abuse-trace fields');
select throws_ok(
  $$update public.leads set customer_name = customer_name where id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'staff cannot write customer fields (same value)');
select throws_ok(
  $$update public.leads set code = code where id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'staff cannot write lead code');
select throws_ok(
  $$insert into public.lead_assignments (lead_id, assigned_to)
    values ('00000000-0000-0000-0000-0000000b0001', '00000000-0000-0000-0000-00000000a003')$$,
  '42501', null, 'staff cannot forge assignment history');
select throws_ok(
  $$insert into public.lead_status_log (lead_id, to_status)
    values ('00000000-0000-0000-0000-0000000b0001', 'done')$$,
  '42501', null, 'staff cannot forge status history');
select pg_temp.logout();

-- staff2 (a005, no leads) cannot touch someone else's lead --------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a005');
select throws_ok(
  $$select public.change_lead_status('00000000-0000-0000-0000-0000000b0001', 'cancelled')$$,
  'P0002', null, 'other staff cannot change status of a lead not assigned to them');
select pg_temp.logout();

-- manager --------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$update public.leads set assigned_to = assigned_to where id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'manager cannot write assignment (same value)');
select lives_ok(
  $$update public.leads set customer_note = 'Gọi lại sau' where id = '00000000-0000-0000-0000-0000000b0001'$$,
  'manager can still edit customer fields');
select throws_ok(
  $$delete from public.lead_status_log where lead_id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'manager cannot delete status history');
select pg_temp.logout();

-- admin ----------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$select public.assign_lead('00000000-0000-0000-0000-0000000b0001', '00000000-0000-0000-0000-00000000a005')$$,
  'admin can still reassign');
select pg_temp.logout();

select * from finish();
rollback;
