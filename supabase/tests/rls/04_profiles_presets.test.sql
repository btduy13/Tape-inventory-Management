-- Profiles (role protection) and tape_presets (admin-editable, public read).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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

select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-00000000a001'),
  'admin', 'role taken from app_metadata on signup');

select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select is((select count(*) from public.profiles)::int, 1, 'staff sees only own profile');
select throws_ok(
  $$update public.profiles set role = 'admin' where id = auth.uid()$$,
  '42501', null, 'staff cannot escalate own role');
select lives_ok(
  $$update public.profiles set full_name = 'Tên mới' where id = auth.uid()$$,
  'staff can edit own name');
select throws_ok(
  $$insert into public.tape_presets (label, width_mm, length_m, thickness_mic) values ('x', 1, 1, 1)$$,
  '42501', null, 'staff cannot add presets');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$update public.profiles set role = 'manager' where id = '00000000-0000-0000-0000-00000000a004'$$,
  'admin can change roles');
select throws_ok(
  $$update public.profiles set role = 'staff' where id = auth.uid()$$,
  '42501', null, 'admin cannot demote self');
select lives_ok(
  $$update public.tape_presets set is_active = false where width_mm = 72$$,
  'admin can edit presets');
select pg_temp.logout();

select pg_temp.as_anon();
select is((select count(*) from public.tape_presets)::int, 3, 'anon sees only active presets');
select is((select count(*) from public.profiles)::int, 0, 'anon sees no profiles');
select pg_temp.logout();

select * from finish();
rollback;
