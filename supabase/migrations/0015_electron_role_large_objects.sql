-- 0015_electron_role_large_objects
-- The owner can remove large objects created by electron_app (creation itself is not blockable).
--
-- Finding: electron_app could call pg_catalog.lo_from_bytea / lo_create / lowrite and keep any
-- amount of data in pg_largeobject, outside its five tables. postgres could not remove it
-- ("must be owner of large object"), and only supabase_admin could.
--
-- Platform limit: the lo_* functions are owned by supabase_admin and granted to PUBLIC.
-- Migrations run as postgres, which is not a superuser, so `revoke execute ... from public`
-- has no effect here ("no privileges could be revoked"). Creation cannot be blocked from a
-- migration; the TODO test in 09_electron_role_large_objects.test.sql tracks that.
--
-- What this migration does:
-- 1. postgres inherits electron_app's privileges (postgres already holds ADMIN on the role).
--    Ownership checks on large objects then pass for postgres, so the owner can unlink them.
--    electron_app gains nothing: the membership goes one way only.
-- 2. public.electron_app_purge_large_objects() (owner-only) unlinks every large object owned
--    by electron_app and returns the count. The desktop app never uses large objects
--    (electron/db policy rejects lo_* calls), so nothing legitimate is lost. The owner runs it
--    by hand (or from a scheduled job) after an incident; it is not tied to logins, because the
--    login event trigger from an earlier draft of 0014 was removed (a failing login trigger
--    blocks all logins).
--
-- Idempotent.

-- 1. Owner can act on electron_app's objects ---------------------------------------------------
-- Postgres 16+: inherit only (no SET ROLE). Postgres 15 (the hosted project reports 15.14) has no
-- per-grant INHERIT/SET options: a plain grant inherits because postgres has the INHERIT attribute.
do $$
begin
  if current_setting('server_version_num')::int >= 160000 then
    execute 'grant electron_app to postgres with inherit true, set false';
  else
    execute 'grant electron_app to postgres';
  end if;
end;
$$;

-- 2. Purge ------------------------------------------------------------------------------------
create or replace function public.electron_app_purge_large_objects()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_role oid := (select oid from pg_roles where rolname = 'electron_app');
  v_count integer := 0;
  r record;
begin
  if v_role is null then
    return 0;
  end if;

  for r in
    select m.oid from pg_largeobject_metadata m where m.lomowner = v_role
  loop
    perform pg_catalog.lo_unlink(r.oid);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.electron_app_purge_large_objects() from public, anon, authenticated, service_role, electron_app;

-- Remove anything already present (for example from the live test that found this).
select public.electron_app_purge_large_objects();
