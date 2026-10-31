-- Regression tests for migration 0017_electron_role_ddl_guard (SECURITY_REPORT.md L1).
-- Run: npm run db:test   (from web/)
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- The test runner (postgres) must be able to SET ROLE electron_app for this transaction.
-- Postgres 16+ needs the SET option; Postgres 15 grants have no options (plain membership).
do $grant$ begin
  if current_setting('server_version_num')::int >= 160000 then
    execute 'grant electron_app to postgres with set true, inherit false';
  else
    execute 'grant electron_app to postgres';
  end if;
end $grant$;

-- Shape of the trigger ----------------------------------------------------------------------------
select is(
  (select evtevent::text from pg_event_trigger where evtname = 'electron_app_ddl_guard'),
  'ddl_command_start', 'guard trigger exists on ddl_command_start');
select is(
  (select evtenabled::text from pg_event_trigger where evtname = 'electron_app_ddl_guard'),
  'A', 'guard trigger is ENABLE ALWAYS');
select ok(
  (select evttags @> array['CREATE EXTENSION','ALTER EXTENSION','CREATE FUNCTION','CREATE SCHEMA',
                           'CREATE TABLE','GRANT']::text[]
     from pg_event_trigger where evtname = 'electron_app_ddl_guard'),
  'guard trigger covers extension, function, schema, table and grant tags');
select is(
  (select array_agg(evtname::text order by evtname) from pg_event_trigger where evtevent = 'login'),
  null::text[], 'no login event triggers are installed');
select ok(
  (select not p.prosecdef and p.proconfig @> array['search_path=pg_catalog, pg_temp']
     from pg_proc p where p.oid = 'public.electron_app_ddl_guard()'::regprocedure),
  'guard function is not SECURITY DEFINER and has a fixed search_path');
select ok(not has_function_privilege('electron_app', 'public.electron_app_ddl_guard()', 'EXECUTE')
      and not has_function_privilege('anon', 'public.electron_app_ddl_guard()', 'EXECUTE'),
  'guard function is not executable by electron_app or anon');

-- electron_app is refused ------------------------------------------------------------------------
select throws_ok($$set local role electron_app; create schema t_electron_s$$, '42501', null,
  'electron_app cannot CREATE SCHEMA');
select throws_ok($$set local role electron_app; create function public.t_electron_f() returns int language sql as 'select 1'$$,
  '42501', null, 'electron_app cannot CREATE FUNCTION');
select throws_ok($$set local role electron_app; create extension if not exists plpgsql$$, '42501',
  'permission denied: electron_app may not run CREATE EXTENSION',
  'electron_app cannot CREATE EXTENSION (non-privileged path) and the guard raised it');
select throws_ok($$set local role electron_app; alter extension plpgsql update$$, '42501',
  'permission denied: electron_app may not run ALTER EXTENSION',
  'electron_app cannot ALTER EXTENSION (non-privileged path)');
select throws_ok($$set local role electron_app; comment on schema public is 'x'$$, '42501',
  'permission denied: electron_app may not run COMMENT', 'electron_app cannot COMMENT');
select throws_ok($$set local role electron_app; create table if not exists public.email_history(id int)$$,
  '42501', null, 'electron_app cannot CREATE TABLE IF NOT EXISTS (desktop app treats 42501 as expected)');

-- Every other role is untouched -------------------------------------------------------------------
select lives_ok($$create schema t_guard_owner; create function t_guard_owner.f() returns int language sql as 'select 1';
                  comment on schema t_guard_owner is 'x'; drop schema t_guard_owner cascade$$,
  'postgres DDL is not affected');
-- lives_ok keeps SET LOCAL after its subtransaction succeeds, so reset the role in the statement.
select lives_ok($$set local role service_role; create temp table t_guard_service(a int); drop table t_guard_service; reset role$$,
  'service_role DDL is not affected');
-- The role check itself never raises for a non-electron role, even when called with odd settings.
select lives_ok($q$do $d$ declare sp text := current_setting('search_path'); begin
                    perform set_config('search_path', '', true);
                    create schema t_guard_owner2; drop schema t_guard_owner2;
                    perform set_config('search_path', sp, true); end $d$$q$,
  'guard works with an empty search_path for other roles');

-- Detective control for the supautils privileged-extension path (L1) -----------------------------
select ok(
  (select bool_or(c like 'pgaudit.log=%ddl%')
     from pg_db_role_setting s, unnest(s.setconfig) c
    where s.setrole = 'electron_app'::regrole and s.setdatabase = 0),
  'electron_app sessions log DDL through pgaudit');

select * from finish();
rollback;
