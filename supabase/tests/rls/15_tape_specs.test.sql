-- tape_widths / tape_spec_settings (0022): public read of active widths, admin-only writes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create function pg_temp.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- Seed ------------------------------------------------------------------------------------------
select is(
  (select array_agg(width_mm order by sort_order) from public.tape_widths),
  array[12, 15, 16, 18, 20, 24, 30, 35, 40, 48, 60, 70, 80],
  'seeded widths in order');
select is(
  (select array[min_length_m, max_length_m] from public.tape_spec_settings),
  array[50, 635]::numeric[], 'seeded length range 50..635 m');

-- Grants ----------------------------------------------------------------------------------------
select ok(not has_table_privilege('anon', 'public.tape_widths', 'INSERT')
      and not has_table_privilege('anon', 'public.tape_widths', 'UPDATE')
      and not has_table_privilege('anon', 'public.tape_widths', 'DELETE')
      and not has_table_privilege('anon', 'public.tape_spec_settings', 'UPDATE'),
  'anon has no write grant');
select ok(not has_table_privilege('authenticated', 'public.tape_spec_settings', 'INSERT')
      and not has_table_privilege('authenticated', 'public.tape_spec_settings', 'DELETE')
      and not has_table_privilege('authenticated', 'public.tape_widths', 'TRUNCATE'),
  'authenticated cannot insert/delete settings or truncate widths');
select ok(
  not exists (select 1 from pg_roles where rolname = 'electron_app')
  or (not has_table_privilege('electron_app', 'public.tape_widths', 'SELECT')
      and not has_table_privilege('electron_app', 'public.tape_spec_settings', 'SELECT')),
  'electron_app has no access');

-- Fixture: one disabled width (as owner).
update public.tape_widths set is_active = false where width_mm = 80;

-- Anon --------------------------------------------------------------------------------------------
select pg_temp.as_anon();
select is((select count(*) from public.tape_widths)::int, 12, 'anon sees active widths only');
select is((select count(*) from public.tape_widths where width_mm = 80)::int, 0, 'anon does not see disabled width');
select is((select count(*) from public.tape_spec_settings)::int, 1, 'anon reads length range');
select throws_ok($$insert into public.tape_widths (width_mm) values (99)$$,
  '42501', null, 'anon cannot add widths');
select throws_ok($$update public.tape_spec_settings set max_length_m = 1000$$,
  '42501', null, 'anon cannot change length range');
select pg_temp.logout();

-- Staff -------------------------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select is((select count(*) from public.tape_widths)::int, 12, 'staff sees active widths only');
select throws_ok($$insert into public.tape_widths (width_mm) values (99)$$,
  '42501', null, 'staff cannot add widths');
update public.tape_widths set is_active = false where width_mm = 12;
update public.tape_spec_settings set max_length_m = 1000;
select pg_temp.logout();
select ok((select is_active from public.tape_widths where width_mm = 12), 'staff update of widths is a no-op');
select is((select max_length_m from public.tape_spec_settings), 635::numeric, 'staff update of settings is a no-op');

-- Manager: same as staff for writes.
select pg_temp.login('00000000-0000-0000-0000-00000000a002');
select throws_ok($$insert into public.tape_widths (width_mm) values (99)$$,
  '42501', null, 'manager cannot add widths');
select pg_temp.logout();

-- Admin -------------------------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is((select count(*) from public.tape_widths)::int, 13, 'admin also sees disabled widths');
select lives_ok($$insert into public.tape_widths (width_mm, sort_order) values (100, 140)$$,
  'admin can add a width');
select lives_ok($$update public.tape_spec_settings set min_length_m = 40, max_length_m = 700$$,
  'admin can change length range');
select throws_ok($$update public.tape_spec_settings set min_length_m = 800$$,
  '23514', null, 'min > max is rejected');
select lives_ok($$delete from public.tape_widths where width_mm = 100$$, 'admin can delete a width');
select pg_temp.logout();

select * from finish();
rollback;
