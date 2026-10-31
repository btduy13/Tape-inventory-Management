-- Regression tests for migration 0016_sent_quote_terms_inactive_profile
-- (QUOTE-TERMS-1/2/3, access-deactivated-profile-self-update).
-- Requires seed.sql. Run: npm run db:test   (from web/)
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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

-- A sent quote (created by server code).
insert into public.quotes (id, lead_id, version, vat_percent, status, notes, valid_until, pdf_path, sent_at)
values ('00000000-0000-0000-0000-0000000c0031', '00000000-0000-0000-0000-0000000b0001', 31, 10, 'sent',
        'terms as emailed', current_date + 14, 'lead/quote.pdf', now());

select pg_temp.login('00000000-0000-0000-0000-00000000a002');
select throws_ok(
  $$update public.quotes set notes = 'changed' where id = '00000000-0000-0000-0000-0000000c0031'$$,
  '42501', null, 'manager cannot change notes of a sent quote');
select throws_ok(
  $$update public.quotes set valid_until = '2099-12-31' where id = '00000000-0000-0000-0000-0000000c0031'$$,
  '42501', null, 'manager cannot extend valid_until of a sent quote');
select throws_ok(
  $$update public.quotes set pdf_path = 'other/other.pdf' where id = '00000000-0000-0000-0000-0000000c0031'$$,
  '42501', null, 'manager cannot change pdf_path of a sent quote');
select throws_ok(
  $$update public.quotes set sent_at = '2020-01-01' where id = '00000000-0000-0000-0000-0000000c0031'$$,
  '42501', null, 'manager cannot change sent_at of a sent quote');
select pg_temp.logout();

-- Accepted by the customer (server code), then the admin tries to rewrite the terms.
update public.quotes set status = 'accepted', responded_at = now()
 where id = '00000000-0000-0000-0000-0000000c0031';
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select throws_ok(
  $$update public.quotes set notes = 'changed' where id = '00000000-0000-0000-0000-0000000c0031'$$,
  '42501', null, 'admin cannot change notes of an accepted quote');
select throws_ok(
  $$update public.quotes set valid_until = '2099-12-31' where id = '00000000-0000-0000-0000-0000000c0031'$$,
  '42501', null, 'admin cannot extend valid_until of an accepted quote');
select pg_temp.logout();

-- Drafts stay editable.
select pg_temp.login('00000000-0000-0000-0000-00000000a002');
insert into public.quotes (id, lead_id, version, vat_percent)
values ('00000000-0000-0000-0000-0000000c0032', '00000000-0000-0000-0000-0000000b0001', 32, 10);
select lives_ok(
  $$update public.quotes set notes = 'draft note', valid_until = current_date + 7
     where id = '00000000-0000-0000-0000-0000000c0032'$$,
  'manager can edit notes / valid_until of a draft');
select pg_temp.logout();

-- Server code (re-send of the same version) may still refresh the audit record.
select lives_ok(
  $$update public.quotes set sent_at = now() where id = '00000000-0000-0000-0000-0000000c0031'$$,
  'server code is not blocked');

-- Deactivated user cannot edit its own profile.
update public.profiles set is_active = false where id = '00000000-0000-0000-0000-00000000a004';
select pg_temp.login('00000000-0000-0000-0000-00000000a004');
update public.profiles set full_name = 'inactive edit' where id = '00000000-0000-0000-0000-00000000a004';
select pg_temp.logout();
select isnt((select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000a004'),
  'inactive edit', 'deactivated user cannot change its own full_name');

-- Active user still can.
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
update public.profiles set full_name = 'active edit' where id = '00000000-0000-0000-0000-00000000a003';
select pg_temp.logout();
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000a003'),
  'active edit', 'active user can still change its own full_name');

select ok(not has_function_privilege('authenticated', 'public.quotes_guard()', 'execute'),
  'authenticated cannot call quotes_guard');
-- 0018 merged profiles_update_self and profiles_update_admin (advisor multiple_permissive_policies).
select policy_cmd_is('public', 'profiles', 'profiles_update_self_or_admin', 'update',
  'profiles_update_self_or_admin is an UPDATE policy');

select * from finish();
rollback;
