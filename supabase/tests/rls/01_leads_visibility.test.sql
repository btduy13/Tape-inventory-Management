-- RLS: who can see which leads. Requires seed.sql (run by `supabase db reset`).
-- Run: npx supabase --workdir .. test db   (from web/)
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- helpers -------------------------------------------------------------------
create function pg_temp.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
-- ---------------------------------------------------------------------------

select pg_temp.as_anon();
select is((select count(*) from public.leads)::int, 0, 'anon sees no leads');
select is((select count(*) from public.designs)::int, 0, 'anon sees no designs');
select throws_ok(
  $$insert into public.leads (customer_name, phone, quantity) values ('x', '0900000000', 1)$$,
  '42501', null, 'anon cannot insert leads directly');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is((select count(*) from public.leads)::int, 3, 'admin sees all leads');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a002');
select is((select count(*) from public.leads)::int, 3, 'manager sees all leads');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select is((select count(*) from public.leads)::int, 1, 'staff sees only assigned lead');
select is((select count(*) from public.designs)::int, 1, 'staff sees only design of assigned lead');
select throws_ok(
  $$insert into public.leads (customer_name, phone, quantity) values ('x', '0900000000', 1)$$,
  '42501', null, 'staff cannot insert leads directly');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a004');
select is((select count(*) from public.leads)::int, 1, 'ctv sees only assigned lead');
select pg_temp.logout();

-- Unassign -> access is lost immediately.
update public.leads set assigned_to = null where id = '00000000-0000-0000-0000-0000000b0001';
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select is((select count(*) from public.leads)::int, 0, 'staff loses access when unassigned');
select is((select count(*) from public.lead_status_log)::int, 0, 'staff loses status log access when unassigned');
select pg_temp.logout();

select * from finish();
rollback;
