-- Regression tests for migration 0012_quote_status_transitions (SECURITY_REPORT.md W7).
-- Requires seed.sql. Run: npx supabase --workdir .. test db   (from web/)
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

create function pg_temp.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- manager (a002) creates and sends a quote
select pg_temp.login('00000000-0000-0000-0000-00000000a002');
insert into public.quotes (id, lead_id, vat_percent)
values ('00000000-0000-0000-0000-0000000c0021', '00000000-0000-0000-0000-0000000b0001', 10);
insert into public.quote_lines (quote_id, description, quantity, unit_price)
values ('00000000-0000-0000-0000-0000000c0021', 'Băng keo in', 100, 10000);
select lives_ok(
  $$update public.quotes set status = 'sent', sent_at = now() where id = '00000000-0000-0000-0000-0000000c0021'$$,
  'draft -> sent allowed');
select throws_ok(
  $$update public.quotes set status = 'draft' where id = '00000000-0000-0000-0000-0000000c0021'$$,
  '42501', null, 'sent -> draft blocked (would unlock price lines behind a live customer link)');
select is((select status::text from public.quotes where id = '00000000-0000-0000-0000-0000000c0021'),
  'sent', 'quote is still sent');
select lives_ok(
  $$update public.quotes set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000c0021'$$,
  'sent -> cancelled allowed (new version / superseded)');
select throws_ok(
  $$update public.quotes set status = 'sent' where id = '00000000-0000-0000-0000-0000000c0021'$$,
  '42501', null, 'cancelled is final');
select throws_ok(
  $$update public.quotes set status = 'draft' where id = '00000000-0000-0000-0000-0000000c0021'$$,
  '42501', null, 'cancelled -> draft blocked');
select pg_temp.logout();

-- server code records an acceptance on a second quote
insert into public.quotes (id, lead_id, vat_percent, status)
values ('00000000-0000-0000-0000-0000000c0022', '00000000-0000-0000-0000-0000000b0001', 10, 'sent');
update public.quotes set status = 'accepted', responded_at = now()
 where id = '00000000-0000-0000-0000-0000000c0022';

select pg_temp.login('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$update public.quotes set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000c0022'$$,
  '42501', null, 'manager cannot cancel an accepted quote');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$update public.quotes set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000c0022'$$,
  'admin can cancel an accepted quote');
select pg_temp.logout();

select ok(not has_function_privilege('authenticated', 'public.quotes_status_transition()', 'execute'),
  'authenticated cannot call the trigger function');

select * from finish();
rollback;
