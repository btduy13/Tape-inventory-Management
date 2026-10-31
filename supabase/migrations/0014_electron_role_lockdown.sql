-- 0014_electron_role_lockdown
-- Closes gaps in the electron_app role from 0010 that live testing found.
--
-- 1. TEMP: TEMP on a database is granted to PUBLIC by default, so electron_app could create
--    temporary tables and pg_temp functions (any language it can use, including trusted PLs from
--    extensions). For every connectable, non-template database that the migration role owns
--    (postgres; on the local stack also _supabase and storage_vectors when present):
--      - TEMP is revoked from PUBLIC and granted back to every other existing non-builtin role,
--        so Supabase services and project roles keep their current behaviour;
--      - electron_app loses TEMP and CREATE;
--      - on every database other than the current one, CONNECT is also revoked from PUBLIC and
--        granted back to every other non-builtin role, so electron_app can reach only the
--        database it works in.
--    Databases owned by someone else are skipped: postgres cannot change their ACL. On the local
--    stack that is template1 (owned by supabase_admin): PUBLIC keeps CONNECT there, but not TEMP.
--    template0 does not accept connections.
--
-- 2. Role-level settings (accepted risk, no fix here): a role can always run
--    ALTER ROLE <self> SET ... (stock Postgres), so electron_app can replace the 0010 session
--    guards (search_path, statement_timeout, idle_in_transaction_session_timeout) for its own
--    later sessions. An earlier draft of this migration used an ON LOGIN event trigger to restore
--    them; it was removed because a failing login trigger blocks logins (a drifted
--    `role` setting locked the desktop app out, regression R1). The role gains no privilege this
--    way: it cannot set superuser-only parameters, and a drifted `role` / `session_authorization`
--    setting is rejected at login. Owner repair, run as postgres:
--      alter role electron_app reset all;
--      alter role electron_app set search_path = public;
--      alter role electron_app set statement_timeout = '30s';
--      alter role electron_app set idle_in_transaction_session_timeout = '60s';
--    See SECURITY_REPORT.md (L2).
--
-- 3. CREATE EXTENSION (not fixable here): supautils installs every extension in
--    supautils.privileged_extensions as supabase_admin for ANY role, without a check for CREATE
--    on the database or the schema, and skips non-superuser-owned event triggers while it does.
--    electron_app has no CREATE on the database, no CREATE on any schema and no role membership,
--    and it can still run `create extension dblink`. supautils.privileged_extensions is a
--    sighup setting (no per-role override) and the custom extension scripts live on the server
--    file system, so neither a migration nor the hosted dashboard can block it. See
--    SECURITY_REPORT.md (L1); tracked as a TODO in 08_electron_role_lockdown.test.sql.
--
-- Idempotent.

-- 1. TEMP / CONNECT ---------------------------------------------------------------------------
do $$
declare
  d record;
  r record;
begin
  for d in
    select datname from pg_database
    where datallowconn
      and not datistemplate
      and pg_has_role(current_user, datdba, 'MEMBER')
  loop
    for r in
      select rolname from pg_roles
      where rolname !~ '^pg_'
        and rolname <> 'electron_app'
    loop
      execute format('grant temporary on database %I to %I', d.datname, r.rolname);
      if d.datname <> current_database() then
        execute format('grant connect on database %I to %I', d.datname, r.rolname);
      end if;
    end loop;

    execute format('revoke temporary on database %I from public', d.datname);
    execute format('revoke temporary, create on database %I from electron_app', d.datname);
    if d.datname <> current_database() then
      execute format('revoke connect on database %I from public', d.datname);
      execute format('revoke connect on database %I from electron_app', d.datname);
    end if;
  end loop;
end;
$$;

-- 2. Remove the login-trigger approach (earlier draft of this migration) ------------------------
drop event trigger if exists electron_app_login_guard;
drop function if exists public.electron_app_login_guard();
drop function if exists public.electron_app_restore_role_settings();
