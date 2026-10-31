-- Regression tests for migration 0011_security_hardening (SECURITY_REPORT.md S1-S5).
-- Requires seed.sql. Run: npx supabase --workdir .. test db   (from web/)
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

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

-- S1 is_service_call ----------------------------------------------------------
select ok(public.is_service_call(), 'owner session without JWT is server code');
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select ok(not public.is_service_call(), 'logged-in user is not server code');
select pg_temp.logout();
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select ok(not public.is_service_call(), 'anon JWT is not server code');
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select ok(public.is_service_call(), 'service_role JWT is server code');
select pg_temp.logout();

-- S2 deactivated staff lose access --------------------------------------------
update public.profiles set is_active = false where id = '00000000-0000-0000-0000-00000000a003';
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select is((select count(*) from public.leads)::int, 0, 'deactivated staff sees no leads');
select is_empty(
  $$update public.leads set status = 'consulting' returning id$$,
  'deactivated staff cannot update leads');
select pg_temp.logout();
update public.profiles set is_active = true where id = '00000000-0000-0000-0000-00000000a003';
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select is((select count(*) from public.leads)::int, 1, 're-activated staff sees assigned lead again');
select pg_temp.logout();

-- S3 un-invited sign-ups start inactive ----------------------------------------
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000f001', 'authenticated',
        'authenticated', 'stranger@evil.test', '{"provider":"email"}', '{}', now(), now());
select is((select is_active from public.profiles where id = '00000000-0000-0000-0000-00000000f001'),
  false, 'self sign-up without app_metadata.role is inactive');
select pg_temp.login('00000000-0000-0000-0000-00000000f001');
select ok(not public.is_internal(), 'un-invited user is not internal');
select pg_temp.logout();
select is((select is_active from public.profiles where id = '00000000-0000-0000-0000-00000000a003'),
  true, 'invited seed user is active');

-- S4 quote integrity -----------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a002');
insert into public.quotes (id, lead_id, vat_percent, created_by, subtotal, total)
values ('00000000-0000-0000-0000-0000000c0011', '00000000-0000-0000-0000-0000000b0001', 10,
        '00000000-0000-0000-0000-00000000a001', 1, 999999999);
select is((select created_by from public.quotes where id = '00000000-0000-0000-0000-0000000c0011'),
  '00000000-0000-0000-0000-00000000a002'::uuid, 'created_by cannot be spoofed');
select is((select total from public.quotes where id = '00000000-0000-0000-0000-0000000c0011'),
  0::numeric, 'insert cannot preset totals');
insert into public.quote_lines (quote_id, description, quantity, unit_price)
values ('00000000-0000-0000-0000-0000000c0011', 'Băng keo in', 100, 10000);
select is((select total from public.quotes where id = '00000000-0000-0000-0000-0000000c0011'),
  1100000::numeric, 'totals derived from lines + VAT');
update public.quotes set total = 1 where id = '00000000-0000-0000-0000-0000000c0011';
select is((select total from public.quotes where id = '00000000-0000-0000-0000-0000000c0011'),
  1100000::numeric, 'direct total edit is overridden by derived value');
select throws_ok(
  $$update public.quotes set status = 'accepted' where id = '00000000-0000-0000-0000-0000000c0011'$$,
  '42501', null, 'manager cannot forge customer acceptance');
select throws_ok(
  $$update public.quotes set customer_response_note = 'ok' where id = '00000000-0000-0000-0000-0000000c0011'$$,
  '42501', null, 'manager cannot forge customer note');
select throws_ok(
  $$update public.quotes set lead_id = '00000000-0000-0000-0000-0000000b0003' where id = '00000000-0000-0000-0000-0000000c0011'$$,
  '42501', null, 'quote cannot move to another lead');
select lives_ok(
  $$update public.quotes set status = 'sent', sent_at = now() where id = '00000000-0000-0000-0000-0000000c0011'$$,
  'manager can send quote');
select throws_ok(
  $$update public.quote_lines set unit_price = 1 where quote_id = '00000000-0000-0000-0000-0000000c0011'$$,
  '42501', null, 'lines locked after send');
select throws_ok(
  $$insert into public.quote_lines (quote_id, description, quantity, unit_price)
    values ('00000000-0000-0000-0000-0000000c0011', 'thêm', 1, 1)$$,
  '42501', null, 'cannot add lines after send');
select throws_ok(
  $$update public.quotes set vat_percent = 0 where id = '00000000-0000-0000-0000-0000000c0011'$$,
  '42501', null, 'VAT locked after send');
select pg_temp.logout();

-- server code records the customer's answer
select lives_ok(
  $$update public.quotes set status = 'accepted', responded_at = now()
    where id = '00000000-0000-0000-0000-0000000c0011'$$,
  'server code can record acceptance');

-- S5 no direct EXECUTE on internal functions -------------------------------------
select ok(not has_function_privilege('authenticated', 'public.quotes_recalc_totals(uuid)', 'execute'),
  'authenticated cannot call quotes_recalc_totals');
select ok(not has_function_privilege('anon', 'public.check_rate_limit(text, integer, integer)', 'execute'),
  'anon cannot call check_rate_limit');

select * from finish();
rollback;
