-- Regression tests for migration 0014_electron_role_lockdown.
-- Run: npm run db:test   (from web/)
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- The test runner (postgres) holds ADMIN on electron_app but not SET; add it for this transaction.
grant electron_app to postgres with set true, inherit false;

-- TEMP / CREATE / CONNECT on databases -------------------------------------------------------------
select ok(not has_database_privilege('electron_app', current_database(), 'TEMP'),
  'electron_app has no TEMP on the current database');
select ok(not has_database_privilege('electron_app', current_database(), 'CREATE'),
  'electron_app has no CREATE on the current database');
-- storage_vectors is created by the Storage service AFTER migrations run, so 0014 cannot cover it.
-- Production step (run once as postgres after the project is up) is in SECURITY_REPORT.md.
select todo('storage_vectors is created after migrations; locked down by a manual production step', 4);
select is(
  (select array_agg(datname::text order by datname) from pg_database
    where datallowconn and has_database_privilege('electron_app', oid, 'TEMP')),
  null::text[], 'electron_app has no TEMP on any connectable database');
select is(
  (select array_agg(d.datname::text order by d.datname) from pg_database d, aclexplode(d.datacl) a
    where d.datallowconn and not d.datistemplate and pg_has_role(current_user, d.datdba, 'MEMBER')
      and a.grantee = 0 and a.privilege_type = 'TEMPORARY'),
  null::text[], 'PUBLIC has no TEMP on any database the owner controls');
-- Databases with a NULL ACL use the default (PUBLIC gets CONNECT and TEMP): treat them as failures.
select is(
  (select array_agg(datname::text order by datname) from pg_database
    where datallowconn and not datistemplate and datacl is null
      and pg_has_role(current_user, datdba, 'MEMBER')),
  null::text[], 'no connectable database keeps the default ACL');
select is(
  (select array_agg(datname::text order by datname) from pg_database
    where datallowconn and not datistemplate and datname <> current_database()
      and pg_has_role(current_user, datdba, 'MEMBER')
      and has_database_privilege('electron_app', oid, 'CONNECT')),
  null::text[], 'electron_app cannot connect to the other owner databases');
select ok(has_database_privilege('authenticated', current_database(), 'TEMP')
      and has_database_privilege('service_role', current_database(), 'TEMP')
      and has_database_privilege('postgres', current_database(), 'TEMP'),
  'other roles keep TEMP');
select ok(has_database_privilege('electron_app', current_database(), 'CONNECT'),
  'electron_app can still connect to its own database');

-- pgTAP lives in schema extensions, which electron_app cannot use: switch role inside the
-- statement under test. The error rolls back the role switch with throws_ok's subtransaction.
select throws_ok($$set local role electron_app; create temp table t_electron(a int)$$, '42501', null,
  'electron_app cannot create a temp table');
select throws_ok($$set local role electron_app; create function pg_temp.f_electron() returns int language sql as 'select 1'$$,
  '42501', null, 'electron_app cannot create a pg_temp function');

-- Role membership: electron_app must not reach supautils' privileged role or any other role -------
select is(
  (select array_agg(rolname::text order by rolname) from pg_roles r
    where rolname <> 'electron_app' and pg_has_role('electron_app', r.oid, 'MEMBER')),
  null::text[], 'electron_app is a member of no other role');

-- Login trigger approach removed (R1: a failing login trigger locks out every login) -------------
select is(
  (select array_agg(evtname::text order by evtname) from pg_event_trigger where evtevent = 'login'),
  null::text[], 'no login event triggers are installed');
select ok(to_regprocedure('public.electron_app_login_guard()') is null
      and to_regprocedure('public.electron_app_restore_role_settings()') is null,
  'login guard and restore functions are gone');

-- Role-level settings drift is an accepted low risk (SECURITY_REPORT.md L2): not tested here.

-- CREATE EXTENSION (known gap) ---------------------------------------------------------------------
-- supautils creates privileged extensions as supabase_admin for any role, with no CREATE check on
-- the database or schema, and skips event triggers owned by non-superusers while doing so; a
-- migration cannot block it. See SECURITY_REPORT.md (L1).
select todo('supautils privileged_extensions: not blockable from a migration', 1);
select throws_ok($$set local role electron_app; create extension if not exists seg; reset role$$, '42501', null,
  'electron_app cannot install extensions');

select * from finish();
rollback;
