-- Known gap: electron_app can NOTIFY the PostgREST channel 'pgrst' (schema/config reload DoS).
-- Postgres has no privilege for NOTIFY or per-channel ACLs, so this cannot be fixed in a migration.
-- Accepted low risk, see SECURITY_REPORT.md (L5). The test is a TODO so it reports the gap without failing the suite;
-- it starts to pass (and pg_prove flags it as unexpectedly passing) if the platform ever blocks it.
-- Run: npm run db:test   (from web/)
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

grant electron_app to postgres with set true;

-- NOTIFY is delivered only at top-level commit; this transaction rolls back, so nothing is sent.
select todo('NOTIFY has no privilege check in Postgres', 1);
select throws_ok($$set local role electron_app; notify pgrst, 'reload schema'; reset role$$, '42501', null,
  'electron_app cannot notify the pgrst channel');

select * from finish();
rollback;
