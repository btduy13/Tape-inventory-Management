-- RLS + guard triggers: status changes, column protection, assignment, status log.
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

-- seed: lead b0001 assigned to staff (status 'assigned'), b0003 unassigned ('new')
select is((select status::text from public.leads where id = '00000000-0000-0000-0000-0000000b0001'),
  'assigned', 'assigning a new lead moves it to assigned');
select ok(exists (select 1 from public.lead_status_log
  where lead_id = '00000000-0000-0000-0000-0000000b0001' and from_status = 'new' and to_status = 'assigned'),
  'auto status change is logged');

-- staff ----------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select lives_ok(
  $$select public.change_lead_status('00000000-0000-0000-0000-0000000b0001', 'consulting', 'Đã gọi khách')$$,
  'staff can move assigned -> consulting');
select is((select note from public.lead_status_log
  where lead_id = '00000000-0000-0000-0000-0000000b0001' and to_status = 'consulting'),
  'Đã gọi khách', 'status log stores note');
select is((select changed_by from public.lead_status_log
  where lead_id = '00000000-0000-0000-0000-0000000b0001' and to_status = 'consulting'),
  '00000000-0000-0000-0000-00000000a003'::uuid, 'status log stores actor');
select throws_ok(
  $$select public.change_lead_status('00000000-0000-0000-0000-0000000b0001', 'quoted')$$,
  '42501', null, 'staff cannot set quoted');
select throws_ok(
  $$update public.leads set customer_name = 'Hacked' where id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'staff cannot edit customer fields');
select throws_ok(
  $$update public.leads set assigned_to = '00000000-0000-0000-0000-00000000a003'
    where id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'staff cannot change assignment');
select throws_ok(
  $$select public.change_lead_status('00000000-0000-0000-0000-0000000b0003', 'consulting')$$,
  'P0002', null, 'staff cannot touch unassigned lead');
select lives_ok(
  $$insert into public.lead_notes (lead_id, body) values ('00000000-0000-0000-0000-0000000b0001', 'Ghi chú')$$,
  'staff can add note to own lead');
select pg_temp.logout();

-- manager --------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$select public.assign_lead('00000000-0000-0000-0000-0000000b0003', '00000000-0000-0000-0000-00000000a003')$$,
  '42501', null, 'manager cannot assign');
select pg_temp.logout();

-- admin ----------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$select public.assign_lead('00000000-0000-0000-0000-0000000b0003', '00000000-0000-0000-0000-00000000a004')$$,
  'admin can assign');
select pg_temp.logout();
select is((select count(*) from public.lead_assignments
  where lead_id = '00000000-0000-0000-0000-0000000b0003')::int, 1, 'assignment history recorded');

select * from finish();
rollback;
