-- 0010_electron_role
-- Least-privilege database role for the Electron desktop admin app (electron/).
--
-- The desktop app used to connect with the database owner (postgres) through DATABASE_URL,
-- which bypasses RLS and can run DDL. It now builds every statement itself from a fixed
-- action registry (electron/db/registry.js), so it only needs DML on its five tables:
--   bang_keo_orders, bang_keo_in_orders, truc_in_orders, order_attachments, email_history
--
-- After applying this migration an administrator sets the password OUT OF BAND
-- (never commit it):
--   alter role electron_app with password '<long random secret>';
-- and points the desktop DATABASE_URL at it, e.g. through the Supabase pooler:
--   postgresql://electron_app.<project-ref>:<secret>@<pooler-host>:5432/postgres?sslmode=require
--
-- Schema changes (the old in-app ALTER TABLE / CREATE TRIGGER migration in main.js) must be
-- applied by the owner through migrations; the app logs and skips them on 42501.
-- This migration is idempotent.

-- 1. Role: login only, no inheritance, no elevated attributes, RLS enforced.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'electron_app') then
    create role electron_app
      login
      noinherit
      nosuperuser
      nocreatedb
      nocreaterole
      noreplication
      nobypassrls
      connection limit 30;
  else
    alter role electron_app
      login
      noinherit
      nosuperuser
      nocreatedb
      nocreaterole
      noreplication
      nobypassrls
      connection limit 30;
  end if;
end;
$$;

-- Session guards for every connection made as electron_app.
alter role electron_app set search_path = public;
alter role electron_app set statement_timeout = '30s';
alter role electron_app set idle_in_transaction_session_timeout = '60s';

-- 2. Start from nothing: no schema-level create, no access to any other table.
revoke all on schema public from electron_app;
grant usage on schema public to electron_app;
revoke all on all tables in schema public from electron_app;
revoke all on all sequences in schema public from electron_app;

-- The five legacy tables are created and owned by the desktop app (bang_keo_in_orders may also
-- come from the 0009 stub). Missing tables are skipped with a NOTICE; if this migration ran
-- before they existed, re-run the block below once they do (it is idempotent).

-- 3. DML only (no TRUNCATE / REFERENCES / TRIGGER) on exactly the five tables, behind RLS.
do $$
declare
  t   text;
  seq text;
begin
  foreach t in array array['bang_keo_orders', 'bang_keo_in_orders', 'truc_in_orders',
                           'order_attachments', 'email_history']
  loop
    if to_regclass('public.' || t) is null then
      raise notice 'electron_app: table public.% does not exist, skipped', t;
      continue;
    end if;

    execute format('grant select, insert, update, delete on table public.%I to electron_app', t);

    -- Serial id columns need the sequence for INSERT.
    seq := pg_get_serial_sequence('public.' || t, 'id');
    if seq is not null then
      execute format('grant usage, select on sequence %s to electron_app', seq);
    end if;

    -- 0009 enabled RLS on these tables; electron_app does not bypass RLS, so it needs an
    -- explicit policy. anon/authenticated still have no grants and no policy.
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists electron_app_full_access on public.%I', t);
    execute format(
      'create policy electron_app_full_access on public.%I as permissive for all to electron_app using (true) with check (true)',
      t
    );
  end loop;
end;
$$;

-- 4. app_schema_meta (owner-only bookkeeping for the old in-app migration) stays inaccessible.
do $$
begin
  if to_regclass('public.app_schema_meta') is not null then
    execute 'revoke all on table public.app_schema_meta from electron_app';
  end if;
end;
$$;

comment on role electron_app is
  'Electron desktop admin app: DML on bang_keo_orders, bang_keo_in_orders, truc_in_orders, order_attachments, email_history only. Password set out of band.';
