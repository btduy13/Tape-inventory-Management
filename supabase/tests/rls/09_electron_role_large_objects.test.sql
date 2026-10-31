-- Regression tests for migration 0015_electron_role_large_objects.
-- Run: npm run db:test   (from web/)
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- The test runner (postgres) holds ADMIN on electron_app but not SET; add it for this transaction.
-- Postgres 16+ needs the SET option; Postgres 15 grants have no options (plain membership).
do $grant$ begin
  if current_setting('server_version_num')::int >= 160000 then
    execute 'grant electron_app to postgres with set true';
  else
    execute 'grant electron_app to postgres';
  end if;
end $grant$;

select ok(pg_has_role('postgres', 'electron_app', 'USAGE'),
  'postgres inherits electron_app privileges (can manage its large objects)');
select ok(not pg_has_role('electron_app', 'postgres', 'MEMBER'),
  'electron_app is not a member of postgres');
select ok(not has_function_privilege('electron_app', 'public.electron_app_purge_large_objects()', 'EXECUTE')
      and not has_function_privilege('authenticated', 'public.electron_app_purge_large_objects()', 'EXECUTE')
      and not has_function_privilege('anon', 'public.electron_app_purge_large_objects()', 'EXECUTE'),
  'purge function is owner-only');
-- Simulate the attack: electron_app stores data in pg_largeobject.
set local role electron_app;
select lo_from_bytea(0, convert_to('pentest-lo-marker', 'UTF8'));
select lo_from_bytea(0, convert_to('pentest-lo-marker-2', 'UTF8'));
reset role;

select is(
  (select count(*)::int from pg_largeobject_metadata where lomowner = 'electron_app'::regrole),
  2, 'large objects owned by electron_app exist before the purge');
select is(public.electron_app_purge_large_objects(), 2, 'purge reports the removed objects');
select is(
  (select count(*)::int from pg_largeobject_metadata where lomowner = 'electron_app'::regrole),
  0, 'no large objects owned by electron_app remain');

-- Creation itself (known gap) -------------------------------------------------------------------
-- lo_* functions are owned by supabase_admin and granted to PUBLIC; a migration run as postgres
-- cannot revoke them. See SECURITY_REPORT.md (L4).
select todo('lo_* EXECUTE is granted to PUBLIC by supabase_admin: not revocable from a migration', 1);
select ok(not has_function_privilege('electron_app', 'pg_catalog.lo_from_bytea(oid, bytea)', 'EXECUTE'),
  'electron_app cannot create large objects');

select * from finish();
rollback;
