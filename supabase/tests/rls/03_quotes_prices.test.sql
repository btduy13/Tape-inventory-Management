-- Quotes / prices: only admin+manager write; assigned staff read; tokens server-only.
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

-- manager creates a quote for staff's lead
select pg_temp.login('00000000-0000-0000-0000-00000000a002');
select lives_ok($$
  insert into public.quotes (id, lead_id, vat_percent)
  values ('00000000-0000-0000-0000-0000000c0001', '00000000-0000-0000-0000-0000000b0001', 8);
  insert into public.quote_lines (quote_id, description, quantity, unit_price)
  values ('00000000-0000-0000-0000-0000000c0001', 'Băng keo in 48mm', 500, 15000);
$$, 'manager can create quote + lines');
select is((select total from public.quotes where id = '00000000-0000-0000-0000-0000000c0001'),
  8100000.00::numeric, 'totals recomputed from lines (500*15000 + 8% VAT)');
select pg_temp.logout();

-- staff (assigned)
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select is((select count(*) from public.quotes)::int, 1, 'assigned staff can read quote');
select is((select count(*) from public.quote_lines)::int, 1, 'assigned staff can read quote lines');
select is_empty(
  $$update public.quote_lines set unit_price = 1 returning id$$,
  'staff cannot change price (RLS filters update)');
select throws_ok(
  $$insert into public.quotes (lead_id) values ('00000000-0000-0000-0000-0000000b0001')$$,
  '42501', null, 'staff cannot create quote');
select pg_temp.logout();

-- ctv (not assigned to b0001)
select pg_temp.login('00000000-0000-0000-0000-00000000a004');
select is((select count(*) from public.quotes)::int, 0, 'ctv cannot see quotes of other leads');
select pg_temp.logout();

-- tokens are invisible to everyone except service_role
insert into public.quote_tokens (quote_id, token_hash, expires_at)
values ('00000000-0000-0000-0000-0000000c0001', repeat('a', 64), now() + interval '7 days');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is((select count(*) from public.quote_tokens)::int, 0, 'admin cannot read token hashes via API');
select pg_temp.logout();
select pg_temp.as_anon();
select is((select count(*) from public.quote_tokens)::int, 0, 'anon cannot read tokens');
select is((select count(*) from public.quotes)::int, 0, 'anon cannot read quotes');
select pg_temp.logout();

select * from finish();
rollback;
