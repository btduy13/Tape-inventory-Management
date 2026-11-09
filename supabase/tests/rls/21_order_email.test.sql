-- Regression tests for 0031_order_email. Requires seed.sql (admin a001, staff a003).
-- Run: supabase test db
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

select ok(
  (select bool_and(p.prosecdef and p.proconfig @> array['search_path=""']
                   and not has_function_privilege('anon', p.oid, 'EXECUTE')
                   and has_function_privilege('authenticated', p.oid, 'EXECUTE'))
     from pg_proc p
    where p.oid in ('public.admin_order_mark_emailed(text,text,text[])'::regprocedure,
                    'public.admin_email_suggestions()'::regprocedure)),
  'email RPCs: SECURITY DEFINER, empty search_path, authenticated only');

insert into public.bang_keo_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, so_luong, don_gia_ban, thanh_tien_ban,
  don_gia_goc, thanh_tien)
values ('B-T21-A', '2020-04-01 10:00', '2020-04-05', 'T21 thường', 'Khách T21', 10, 2000, 20000, 1500, 15000);
delete from public.email_history where lower(email_address) in ('t21a@x.vn', 't21b@x.vn');
insert into public.email_history (email_address, last_sent_at, sent_count) values ('t21a@x.vn', '2020-01-01', 2);

-- Staff without orders.edit
update public.profiles set permissions = array['orders.view'] where id = '00000000-0000-0000-0000-00000000a003';
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select throws_ok($$select public.admin_order_mark_emailed('bang_keo', 'B-T21-A', array['t21a@x.vn'])$$, '42501', null,
  'no orders.edit: mark denied');
select throws_ok($$select * from public.admin_email_suggestions()$$, '42501', null, 'no orders.edit: suggestions denied');
select pg_temp.logout();

-- Staff with orders.edit
update public.profiles set permissions = array['orders.edit'] where id = '00000000-0000-0000-0000-00000000a003';
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select is(public.admin_order_mark_emailed('bang_keo', 'B-T21-A', array[' T21A@x.vn', 't21b@x.vn', 't21a@x.vn']), 1,
  'order marked');
select throws_ok($$select public.admin_order_mark_emailed('bang_keo', 'B-NOPE', '{}')$$, 'P0002', null, 'unknown order');
select throws_ok($$select public.admin_order_mark_emailed('bang_keo', 'B-T21-A', array['not an email'])$$, '22023', null,
  'bad address rejected');
select throws_ok($$select public.admin_order_mark_emailed('bang_keo', 'B-T21-A',
  array(select 'a' || g || '@x.vn' from generate_series(1, 21) g))$$, '22023', null, 'max 20 recipients');
select ok('t21b@x.vn' in (select * from public.admin_email_suggestions()), 'new address suggested');
select is((select * from public.admin_email_suggestions() limit 1), 't21a@x.vn', 'most recent first');
select pg_temp.logout();

select is((select da_gui_email from public.bang_keo_orders where id = 'B-T21-A'), true, 'da_gui_email set');
select is((select sent_count from public.email_history where email_address = 't21a@x.vn'), 3, 'existing address counted once');
select is((select count(*)::int from public.email_history where lower(email_address) = 't21b@x.vn'), 1, 'new address inserted');

select * from finish();
rollback;
