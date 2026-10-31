-- production-post-deploy.sql
-- Run ONCE as `postgres` against the production project, after `supabase db push` has applied
-- every migration and the Storage service has started (it creates `storage_vectors`).
-- Every statement is idempotent: running the script again changes nothing.
--
--   psql "postgresql://postgres.<project-ref>@<pooler-host>:5432/postgres?sslmode=require" \
--        -v ON_ERROR_STOP=1 -f supabase/scripts/production-post-deploy.sql
--
-- Then run supabase/scripts/verify-production.sql and check that every row says PASS.
-- This file contains no secret. Never put a password in it.

\set ON_ERROR_STOP 1

-- 1. Lock down storage_vectors (SECURITY_REPORT.md: "Production step", L3/R2) -------------------
-- The Storage service creates this database after migrations run, so 0014 cannot revoke the
-- default PUBLIC CONNECT/TEMP there. Skipped (with a notice) if the database does not exist or
-- postgres does not own it.
do $$
declare
  r record;
begin
  if not exists (select 1 from pg_database where datname = 'storage_vectors') then
    raise notice 'storage_vectors does not exist: nothing to do';
    return;
  end if;
  if not pg_has_role(current_user,
                     (select datdba from pg_database where datname = 'storage_vectors'), 'MEMBER') then
    raise warning 'storage_vectors is not owned by %: ask Supabase support to revoke PUBLIC TEMP', current_user;
    return;
  end if;
  -- Same rule as 0014: grant TEMP and CONNECT back to every non-builtin role except
  -- electron_app first, then revoke them from PUBLIC and electron_app.
  for r in
    select rolname from pg_roles where rolname !~ '^pg_' and rolname <> 'electron_app'
  loop
    execute format('grant temporary, connect on database storage_vectors to %I', r.rolname);
  end loop;
  execute 'revoke temporary, connect on database storage_vectors from public';
  if exists (select 1 from pg_roles where rolname = 'electron_app') then
    execute 'revoke temporary, create, connect on database storage_vectors from electron_app';
  end if;
  raise notice 'storage_vectors locked down';
end;
$$;

-- 2. electron_app password ----------------------------------------------------------------------
-- Do NOT set the password in this file. In an interactive psql session as postgres run:
--
--   \password electron_app
--
-- psql prompts twice and sends only the SCRAM hash; the clear text never reaches the server
-- log or shell history. Use a long random secret (32+ characters) and store it only in the
-- desktop app's local config. Rotate it after any suspected leak and after staff changes.
-- Until it is set, the role has no password and cannot log in (0010 creates it without one).

-- 3. Re-assert the electron_app DDL audit setting from 0017 (idempotent) -------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'electron_app') then
    execute 'alter role electron_app set pgaudit.log = ''ddl, role''';
  end if;
end;
$$;

-- 4. Remove any large objects electron_app may have created (L4). Returns the count removed.
select public.electron_app_purge_large_objects() as electron_app_large_objects_removed;
