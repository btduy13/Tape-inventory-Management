-- 0017_electron_role_ddl_guard
-- Block DDL from the desktop role electron_app with an event trigger, and audit its DDL.
--
-- Finding (SECURITY_REPORT.md L1): electron_app could run CREATE EXTENSION. It has no CREATE on
-- the database or any schema, so ordinary DDL already fails, but a second, independent layer is
-- wanted that denies every DDL command to electron_app by name.
--
-- What this migration does:
-- 1. public.electron_app_ddl_guard() raises 42501 when session_user or current_user is
--    electron_app. For any other role it returns without doing anything. The role check runs in
--    its own exception block, so an unexpected error there means "not blocked" and can never
--    break DDL for other roles (migrations, Supabase services, the dashboard).
--    Fixed search_path; not SECURITY DEFINER (it reads only session_user / current_user).
-- 2. Event trigger electron_app_ddl_guard on ddl_command_start, filtered to DDL tags.
--    It is NOT a login trigger (a failing login trigger blocks every login, see R1/L2).
--    ENABLE ALWAYS so it also fires with session_replication_role = replica
--    (electron_app cannot set that parameter anyway).
-- 3. pgaudit: every electron_app session logs DDL and ROLE statements (pgaudit.log is a
--    superuser parameter: electron_app cannot SET it, and its own ALTER ROLE ... RESET ALL keeps
--    it). This also logs CREATE EXTENSION of supautils privileged extensions, which the trigger
--    cannot block (see the platform limit below).
--
-- Platform limit (re-confirmed 2026-11-01 on supautils in postgres 17.11.0.006):
-- for an extension listed in supautils.privileged_extensions, supautils switches to
-- supabase_admin before Postgres fires ddl_command_start, and skips event triggers owned by
-- non-superusers while a superuser runs. A trigger owned by postgres therefore never sees that
-- CREATE EXTENSION. Migrations run as postgres (not a superuser), so no migration can close
-- this path. The pgaudit log line is the detective control; see SECURITY_REPORT.md L1.
--
-- Idempotent.

-- 1. Guard function ----------------------------------------------------------------------------
create or replace function public.electron_app_ddl_guard()
returns event_trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
declare
  v_blocked boolean := false;
begin
  begin
    v_blocked := coalesce(
      session_user::text = 'electron_app' or current_user::text = 'electron_app',
      false);
  exception when others then
    v_blocked := false;
  end;

  if v_blocked then
    raise exception 'permission denied: electron_app may not run %', tg_tag
      using errcode = '42501',
            hint = 'The desktop role is limited to DML on its own tables.';
  end if;
end;
$$;

comment on function public.electron_app_ddl_guard() is
  'Event trigger function: denies DDL to electron_app (42501); no-op for every other role.';

revoke all on function public.electron_app_ddl_guard()
  from public, anon, authenticated, service_role, electron_app;

-- 2. Event trigger -----------------------------------------------------------------------------
drop event trigger if exists electron_app_ddl_guard;

create event trigger electron_app_ddl_guard
  on ddl_command_start
  when tag in (
    'CREATE EXTENSION', 'ALTER EXTENSION', 'DROP EXTENSION',
    'CREATE SCHEMA', 'ALTER SCHEMA', 'DROP SCHEMA',
    'CREATE FUNCTION', 'ALTER FUNCTION', 'DROP FUNCTION',
    'CREATE PROCEDURE', 'ALTER PROCEDURE', 'DROP PROCEDURE',
    'CREATE AGGREGATE', 'CREATE OPERATOR', 'CREATE CAST', 'CREATE LANGUAGE',
    'CREATE TYPE', 'CREATE DOMAIN', 'CREATE COLLATION', 'CREATE CONVERSION',
    'CREATE ACCESS METHOD', 'CREATE STATISTICS',
    'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE', 'DROP TABLE',
    'CREATE VIEW', 'ALTER VIEW', 'CREATE MATERIALIZED VIEW',
    'CREATE SEQUENCE', 'ALTER SEQUENCE', 'CREATE INDEX',
    'CREATE TRIGGER', 'CREATE RULE', 'CREATE POLICY', 'ALTER POLICY',
    'CREATE FOREIGN DATA WRAPPER', 'CREATE SERVER', 'CREATE FOREIGN TABLE',
    'CREATE USER MAPPING', 'IMPORT FOREIGN SCHEMA',
    'CREATE PUBLICATION', 'CREATE SUBSCRIPTION',
    'GRANT', 'REVOKE', 'ALTER DEFAULT PRIVILEGES', 'COMMENT', 'SECURITY LABEL'
  )
  execute function public.electron_app_ddl_guard();

alter event trigger electron_app_ddl_guard enable always;

-- 3. Audit electron_app DDL --------------------------------------------------------------------
-- supautils lets postgres set pgaudit.log (supautils.privileged_role_allowed_configs).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'electron_app') then
    execute 'alter role electron_app set pgaudit.log = ''ddl, role''';
  end if;
exception when others then
  raise warning 'could not set pgaudit.log for electron_app: %', sqlerrm;
end;
$$;
