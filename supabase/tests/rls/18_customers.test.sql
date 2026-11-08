-- Regression tests for 0028_customers (customers, phone link trigger, admin / electron RPCs,
-- order RPC customer_id, lead guards, backfill dry run / apply / review queue).
-- Requires seed.sql (admin a001, manager a002, staff a003, workshop a006).
-- Run: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(98);

-- helpers -------------------------------------------------------------------------------------
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
create function pg_temp.vn_today() returns date language sql as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date
$$;
-- Accepted lead with design and accepted quote, built as the owner (as in 14).
create function pg_temp.accepted_lead(p_lead uuid, p_quote uuid, p_phone text) returns void language plpgsql as $$
begin
  insert into public.leads (id, customer_name, phone, company, quantity, status)
  values (p_lead, 'Lead Khach', p_phone, 'Lead Co', 100, 'new');
  insert into public.designs (lead_id, width_mm, length_m, thickness_mic, colors, print_text, design_json, preview_path)
  values (p_lead, 48, 100, 50, '{#c8a165}', 'KH', '{"version":1}', p_lead || '/preview.png');
  insert into public.quotes (id, lead_id, status, vat_percent) values (p_quote, p_lead, 'draft', 8);
  insert into public.quote_lines (quote_id, description, quantity, unit_price) values (p_quote, 'tape', 100, 1000);
  update public.quotes set status = 'sent', sent_at = now() where id = p_quote;
  update public.quotes set status = 'accepted', responded_at = now() where id = p_quote;
  update public.leads set status = 'accepted' where id = p_lead;
end $$;

create temp table t18 (k text primary key, v text);
grant all on t18 to public;

do $grant$ begin
  if current_setting('server_version_num')::int >= 160000 then
    execute 'grant electron_app to postgres with set true, inherit false';
  else
    execute 'grant electron_app to postgres';
  end if;
end $grant$;

-- Start from no customers (the seed has none; keeps the test independent of local data).
update public.leads set customer_id = null;

-- normalize_vn_phone ----------------------------------------------------------------------------
select is(public.normalize_vn_phone('090 123 4567'), '0901234567', 'spaces removed');
select is(public.normalize_vn_phone('+84 90-123-4567'), '0901234567', '+84 -> 0');
select is(public.normalize_vn_phone('0084901234567'), '0901234567', '0084 -> 0');
select is(public.normalize_vn_phone('84901234567'), '0901234567', '84 + 9 digits -> 0');
select is(public.normalize_vn_phone('901234567'), '0901234567', '9 digits -> 0 + digits');
select is(public.normalize_vn_phone('(028) 3812 3456'), '02838123456', 'landline 11 digits kept');
select is(public.normalize_vn_phone('0901234567 / 0912345678'), null, 'two numbers -> null');
select is(public.normalize_vn_phone('12345'), null, 'too short -> null');
select is(public.normalize_vn_phone(null), null, 'null -> null');
select is(public.normalize_customer_name('  Anh   TUẤN '), 'anh tuấn', 'name: trim, collapse spaces, lower');

-- Schema and privileges -----------------------------------------------------------------------
select ok(
  (select bool_and(c.relrowsecurity
                   and not has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
                   and not has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
                   and not has_table_privilege('electron_app', c.oid, 'SELECT,INSERT,UPDATE,DELETE'))
     from pg_class c
    where c.oid in ('public.customers'::regclass, 'public.customer_match_candidates'::regclass,
                    'public.customer_backfill_log'::regclass)),
  'customers, candidates and log: RLS on, no API or electron_app table grant');
select ok(
  (select count(*) = 5 from information_schema.columns
    where table_schema = 'public' and column_name = 'customer_id' and data_type = 'uuid' and is_nullable = 'YES'
      and table_name in ('bang_keo_in_orders', 'bang_keo_orders', 'truc_in_orders', 'thank_you_orders', 'leads')),
  'nullable customer_id on the 4 order tables and leads');
select ok(
  (select count(*) = 5 from pg_constraint
    where contype = 'f' and confrelid = 'public.customers'::regclass and confdeltype = 'r'),
  '5 foreign keys to customers, ON DELETE RESTRICT');
select ok(
  (select count(*) = 5 from pg_trigger where tgname = 'zz_resolve_customer' and not tgisinternal),
  'zz_resolve_customer trigger on the 5 tables');
select ok(
  (select bool_and(p.prosecdef and p.proconfig @> array['search_path=""']
                   and not has_function_privilege('anon', p.oid, 'EXECUTE')
                   and has_function_privilege('authenticated', p.oid, 'EXECUTE')
                   and not has_function_privilege('electron_app', p.oid, 'EXECUTE'))
     from pg_proc p
    where p.oid in ('public.admin_customers_list(text,integer,integer)'::regprocedure,
                    'public.admin_customer_get(uuid)'::regprocedure,
                    'public.admin_customer_create(jsonb)'::regprocedure,
                    'public.admin_customer_update(uuid,jsonb)'::regprocedure,
                    'public.admin_customer_merge(uuid,uuid[])'::regprocedure,
                    'public.admin_customer_review_list(integer,integer)'::regprocedure,
                    'public.admin_customer_review_resolve(text,text,uuid)'::regprocedure)),
  'admin customer RPCs: definer, fixed search_path, authenticated only');
select ok(
  (select bool_and(p.prosecdef and p.proconfig @> array['search_path=""']
                   and not has_function_privilege('anon', p.oid, 'EXECUTE')
                   and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
                   and has_function_privilege('electron_app', p.oid, 'EXECUTE'))
     from pg_proc p
    where p.oid in ('public.electron_customer_search(text,uuid,integer)'::regprocedure,
                    'public.electron_customer_create(text,text,text,text)'::regprocedure)),
  'electron customer functions: definer, electron_app only');
select ok(
  (select bool_and(p.proconfig @> array['search_path=""']
                   and not has_function_privilege('anon', p.oid, 'EXECUTE')
                   and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
                   and not has_function_privilege('electron_app', p.oid, 'EXECUTE'))
     from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('normalize_vn_phone', 'normalize_customer_name', 'orders_resolve_customer',
                        'customer_find_or_create', 'customer_order_rows', 'customer_clean_payload',
                        'customer_backfill_dry_run', 'customer_backfill_apply')),
  'helpers, trigger and backfill functions: no API / electron execute');

-- Admin RPCs: role matrix -------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a002');  -- manager
select throws_ok($$select * from public.admin_customers_list()$$, '42501', null, 'manager cannot list customers');
select throws_ok($$select public.admin_customer_create('{"name":"X"}')$$, '42501', null, 'manager cannot create customers');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-00000000a003');  -- staff
select throws_ok($$select public.admin_customer_get(gen_random_uuid())$$, '42501', null, 'staff cannot read a customer');
select throws_ok($$select * from public.admin_customer_review_list()$$, '42501', null, 'staff cannot read the review queue');
select throws_ok($$select count(*) from public.customers$$, '42501', null, 'staff cannot select customers');
select pg_temp.logout();

-- Admin create / update ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
insert into t18 select 'c1', public.admin_customer_create(
  '{"name":"Cong ty Mot","phone":"0901 111 222","address":"1 Le Loi","company":"Mot JSC"}')::text;
insert into t18 select 'c2', public.admin_customer_create('{"name":"Anh Hai","phone":"0902222333"}')::text;
select is((select phone_norm from public.admin_customers_list('Mot') limit 1), '0901111222',
  'create stores the phone; phone_norm generated');
select throws_ok($$select public.admin_customer_create('{"phone":"0903"}')$$, '22023', null, 'create needs a name');
select throws_ok($$select public.admin_customer_create('{"name":"X","bogus":1}')$$, '22023', null, 'unknown field refused');
select throws_ok($$select public.admin_customer_create('{"name":"X","note":1}')$$, '22023', null, 'non-string field refused');
select is(
  public.admin_customer_update((select v::uuid from t18 where k = 'c2'), '{"address":"2 Hai Ba Trung"}') ->> 'address',
  '2 Hai Ba Trung', 'update changes only the given field');
select is(public.admin_customer_get((select v::uuid from t18 where k = 'c2')) -> 'customer' ->> 'name', 'Anh Hai',
  'update keeps the other fields');
select throws_ok($$select public.admin_customer_update(gen_random_uuid(), '{"name":"Z"}')$$, 'P0002', null,
  'update of a missing customer: P0002');
select throws_ok(
  format($$select public.admin_customer_update(%L, '{"name":null}')$$, (select v from t18 where k = 'c2')),
  '22023', null, 'name cannot be cleared');
select pg_temp.logout();

-- Phone trigger --------------------------------------------------------------------------------
insert into public.bang_keo_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang,
                                    quy_cach, so_luong, don_gia_goc, don_gia_ban)
values ('B-T18-001', now(), current_date, 'Bang keo', 'Mot', '+84 901 111 222', '48mm', 10, 100, 200);
select is((select customer_id::text from public.bang_keo_orders where id = 'B-T18-001'),
  (select v from t18 where k = 'c1'), 'owner insert: linked by normalized phone');

set local role electron_app;
insert into public.truc_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang,
                                   so_luong, don_gia_goc, don_gia_ban)
values ('TI-T18-001', now(), current_date, 'Truc', 'Hai', '0902.222.333', 1, 100, 200);
insert into public.truc_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang,
                                   so_luong, don_gia_goc, don_gia_ban)
values ('TI-T18-002', now(), current_date, 'Truc', 'Hai', 'goi sau', 1, 100, 200);
reset role;
select is((select customer_id::text from public.truc_in_orders where id = 'TI-T18-001'),
  (select v from t18 where k = 'c2'), 'electron_app insert: linked by phone');
select is((select customer_id from public.truc_in_orders where id = 'TI-T18-002'), null,
  'unrecognised phone: no link, no error');

set local role electron_app;
update public.truc_in_orders set customer_id = null, ten_hang = 'Truc 2' where id = 'TI-T18-001';
reset role;
select is((select customer_id from public.truc_in_orders where id = 'TI-T18-001'), null,
  'an update that does not touch the phone does not relink');

-- Shared phone: two customers -> nothing links.
insert into public.customers (name, phone) values ('Van phong A', '0283 999 0000'), ('Van phong B', '02839990000');
insert into public.bang_keo_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang,
                                    quy_cach, so_luong, don_gia_goc, don_gia_ban)
values ('B-T18-002', now(), current_date, 'Bang keo', 'VP', '02839990000', '48mm', 10, 100, 200);
select is((select customer_id from public.bang_keo_orders where id = 'B-T18-002'), null,
  'phone shared by two customers: no link');

-- Electron functions ------------------------------------------------------------------------------
-- pgTAP is not visible to electron_app: results go to t18 and are checked as the owner.
set local role electron_app;
insert into t18 select 'e_phone', count(*)::text from public.electron_customer_search('111 222');
insert into t18 select 'e_company', name from public.electron_customer_search('mot jsc');
insert into t18 select 'e_id', name from public.electron_customer_search(null, (select v::uuid from t18 where k = 'c2'));
insert into t18 select 'e_create_existing', public.electron_customer_create('Ten khac', '+84902222333')::text;
insert into t18 select 'c3', public.electron_customer_create('Khach App', '0912 000 111', 'Q1', null)::text;
reset role;
select is((select v from t18 where k = 'e_phone'), '1', 'electron search by phone digits');
select is((select v from t18 where k = 'e_company'), 'Cong ty Mot', 'electron search by company');
select is((select v from t18 where k = 'e_id'), 'Anh Hai', 'electron search by id');
select is((select v from t18 where k = 'e_create_existing'), (select v from t18 where k = 'c2'),
  'electron create returns the customer that has the phone');
select throws_ok($$set local role electron_app; select public.electron_customer_create('X', '02839990000')$$,
  '22023', null, 'electron create refuses a phone shared by several customers');
select throws_ok($$set local role electron_app; select count(*) from public.customers$$, '42501', null,
  'electron_app cannot read customers');
select is((select phone_norm from public.customers where id = (select v::uuid from t18 where k = 'c3')), '0912000111',
  'electron create makes a new customer');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select * from public.electron_customer_search('x')$$, '42501', null, 'admin (authenticated) cannot call the electron functions');
select pg_temp.logout();

-- Order RPCs + customer_id ----------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
insert into t18 select 'o1', order_id from public.admin_order_create(
  jsonb_build_object('ten_hang', 'TY test', 'ten_khach_hang', 'Hai', 'ngay_du_kien', current_date + 3,
                     'so_luong', 10, 'don_gia_ban', 1000, 'customer_id', (select v from t18 where k = 'c3')),
  'thank_you');
select is((public.admin_order_get((select v from t18 where k = 'o1'), 'thank_you') -> 'order' ->> 'customer_id'),
  (select v from t18 where k = 'c3'), 'admin_order_create stores customer_id (admin_order_get returns it)');
insert into t18 select 'o2', order_id from public.admin_order_create(
  jsonb_build_object('ten_hang', 'BK', 'ten_khach_hang', 'Hai', 'sdt_khach_hang', '0902222333',
                     'ngay_du_kien', current_date + 3, 'quy_cach', '48mm', 'so_luong', 10,
                     'don_gia_goc', 100, 'don_gia_ban', 200),
  'bang_keo');
select is((public.admin_order_get((select v from t18 where k = 'o2'), 'bang_keo') -> 'order' ->> 'customer_id'),
  (select v from t18 where k = 'c2'), 'admin_order_create without customer_id: linked by phone');
select throws_ok(
  $$select * from public.admin_order_create('{"ten_hang":"x","ten_khach_hang":"y","ngay_du_kien":"2030-01-01","so_luong":1,"don_gia_ban":1,"customer_id":"nope"}', 'thank_you')$$,
  '22023', null, 'invalid customer_id: 22023');
select throws_ok(
  format($$select * from public.admin_order_create('{"ten_hang":"x","ten_khach_hang":"y","ngay_du_kien":"2030-01-01","so_luong":1,"don_gia_ban":1,"customer_id":"%s"}', 'thank_you')$$, gen_random_uuid()),
  '22023', null, 'unknown customer_id: 22023');
select is(
  public.admin_order_update('bang_keo', (select v from t18 where k = 'o2'),
    jsonb_build_object('customer_id', (select v from t18 where k = 'c1'))) ->> 'customer_id',
  (select v from t18 where k = 'c1'), 'admin_order_update changes customer_id');
select is(
  public.admin_order_update('bang_keo', (select v from t18 where k = 'o2'), '{"customer_id":null}') ->> 'customer_id',
  null, 'admin_order_update with null unlinks');
select pg_temp.logout();

-- Multi-size quote order: customer_id may still change.
insert into public.bang_keo_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, so_luong,
                                       don_gia_ban, quote_items)
values ('BK-T18-QI', now(), current_date, 'QI', 'Khach QI', 1, 1, '[{"x":1}]');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is(
  public.admin_order_update('bang_keo_in', 'BK-T18-QI',
    jsonb_build_object('customer_id', (select v from t18 where k = 'c1'))) ->> 'customer_id',
  (select v from t18 where k = 'c1'), 'customer_id may change on a multi-size quote order');
select pg_temp.logout();

-- Admin list / get / merge ------------------------------------------------------------------------
update public.bang_keo_orders set thanh_tien_ban = 2000, vat = 160 where id = 'B-T18-001';  -- debt trigger: 2160
insert into t18 values ('n_customers', (select count(*) from public.customers)::text);
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is(
  (select row(order_count, cong_no_khach)::text from public.admin_customers_list('Mot')),
  row(2::bigint, 2160::numeric)::text,
  'list: order count and debt of the customer over the order tables');
select is((select count(*)::int from public.admin_customers_list(null, 200)),
  (select v::int from t18 where k = 'n_customers'), 'list returns every customer');
select is((select total_count::int from public.admin_customers_list(null, 1)),
  (select v::int from t18 where k = 'n_customers'), 'total_count covers the whole set');
select is(
  jsonb_array_length(public.admin_customer_get((select v::uuid from t18 where k = 'c1')) -> 'orders'), 2,
  'get: orders of every table');
select throws_ok($$select public.admin_customer_get(gen_random_uuid())$$, 'P0002', null, 'get of a missing customer: P0002');
select throws_ok(
  format($$select public.admin_customer_merge(%L, array[%L]::uuid[])$$, (select v from t18 where k = 'c1'), (select v from t18 where k = 'c1')),
  '22023', null, 'merge into itself refused');
select is(
  public.admin_customer_merge((select v::uuid from t18 where k = 'c1'),
                              array[(select v::uuid from t18 where k = 'c2'), (select v::uuid from t18 where k = 'c3')]),
  1, 'merge moves the orders of the sources');
select is(
  (public.admin_customer_get((select v::uuid from t18 where k = 'c1')) -> 'totals' ->> 'order_count')::int, 3,
  'target now has every order');
select pg_temp.logout();
select is((select count(*)::int from public.customers where id in ((select v::uuid from t18 where k = 'c2'),
                                                                     (select v::uuid from t18 where k = 'c3'))),
  0, 'merge deletes the sources');
select is((select row(phone, address)::text from public.customers where id = (select v::uuid from t18 where k = 'c1')),
  row('0901 111 222', '1 Le Loi')::text, 'merge keeps the target fields that were set');
select throws_ok(
  format($$delete from public.customers where id = %L$$, (select v from t18 where k = 'c1')),
  '23503', null, 'a customer with orders cannot be deleted');

-- Lead guards + convert ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a002');  -- manager
select throws_ok(
  format($$update public.leads set customer_id = %L where id = '00000000-0000-0000-0000-0000000b0001'$$,
         (select v from t18 where k = 'c1')),
  '42501', null, 'manager cannot set a lead customer');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-00000000a003');  -- staff
select throws_ok(
  $$update public.leads set customer_id = null where id = '00000000-0000-0000-0000-0000000b0001'$$,
  '42501', null, 'staff cannot name customer_id');
select pg_temp.logout();

-- Admin convert: no customer with the lead's phone -> a new one from the lead.
select pg_temp.accepted_lead('00000000-0000-0000-0000-0000000c1801', '00000000-0000-0000-0000-0000000d1801', '0977 000 001');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
insert into t18 select 'conv1', public.convert_lead_to_production('00000000-0000-0000-0000-0000000c1801', pg_temp.vn_today() + 5);
select pg_temp.logout();
select ok(
  (select o.customer_id is not null and o.customer_id = l.customer_id and c.name = 'Lead Khach' and c.company = 'Lead Co'
     from public.bang_keo_in_orders o, public.leads l, public.customers c
    where o.id = (select v from t18 where k = 'conv1') and l.id = '00000000-0000-0000-0000-0000000c1801'
      and c.id = o.customer_id),
  'admin convert creates the customer from the lead and links order and lead');

-- Workshop convert: the lead phone matches c1 -> order + lead get c1.
select pg_temp.accepted_lead('00000000-0000-0000-0000-0000000c1802', '00000000-0000-0000-0000-0000000d1802', '0901111222');
select is((select customer_id::text from public.leads where id = '00000000-0000-0000-0000-0000000c1802'),
  (select v from t18 where k = 'c1'), 'lead insert: linked by phone');
update public.leads set customer_id = null where id = '00000000-0000-0000-0000-0000000c1802';
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$select public.assign_production_job('00000000-0000-0000-0000-0000000c1802', '00000000-0000-0000-0000-00000000a006')$$,
  'admin assigns the lead to the workshop');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-00000000a006');
insert into t18 select 'conv2', public.convert_lead_to_production('00000000-0000-0000-0000-0000000c1802', pg_temp.vn_today() + 5);
select pg_temp.logout();
select ok(
  (select o.customer_id::text = (select v from t18 where k = 'c1') and l.customer_id = o.customer_id
     from public.bang_keo_in_orders o, public.leads l
    where o.id = (select v from t18 where k = 'conv2') and l.id = '00000000-0000-0000-0000-0000000c1802'),
  'workshop convert links order and lead to the phone customer');

-- Backfill ----------------------------------------------------------------------------------------
-- Unlinked old orders (as the app wrote them before 0028: no customer yet).
alter table public.bang_keo_orders disable trigger zz_resolve_customer;
alter table public.truc_in_orders disable trigger zz_resolve_customer;
insert into public.bang_keo_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang,
                                    dia_chi_khach_hang, quy_cach, so_luong, don_gia_goc, don_gia_ban)
values ('B-BF-001', '2025-01-01', '2025-01-05', 'BK', 'Chi Ba', '0933 444 555', 'Cu', '48mm', 1, 1, 2),
       ('B-BF-002', '2025-02-01', '2025-02-05', 'BK', 'Chị Ba Shop', '+84933444555', 'Moi', '48mm', 1, 1, 2),
       ('B-BF-003', '2025-03-01', '2025-03-05', 'BK', 'chi  ba', null, null, '48mm', 1, 1, 2),
       ('B-BF-004', '2025-03-01', '2025-03-05', 'BK', 'Khach Le', null, null, '48mm', 1, 1, 2),
       ('B-BF-005', '2025-03-02', '2025-03-05', 'BK', 'khach le', '', null, '48mm', 1, 1, 2),
       ('B-BF-006', '2025-03-03', '2025-03-05', 'BK', 'Ai Do', '0933 / 0944', null, '48mm', 1, 1, 2),
       ('B-BF-007', '2025-03-04', '2025-03-05', 'BK', 'VP chung', '02839990000', null, '48mm', 1, 1, 2),
       ('B-BF-008', '2025-03-05', '2025-03-05', 'BK', 'Cong ty Mot', '0901111222', null, '48mm', 1, 1, 2);
insert into public.truc_in_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang,
                                   so_luong, don_gia_goc, don_gia_ban)
values ('TI-BF-001', '2025-04-01', '2025-04-05', 'Truc', 'Chi Ba', '0933444555', 1, 1, 2);
alter table public.bang_keo_orders enable trigger zz_resolve_customer;
alter table public.truc_in_orders enable trigger zz_resolve_customer;
-- A lead that shares the phone of an order group, and one that matches nothing.
insert into public.leads (id, customer_name, phone, quantity) values
  ('00000000-0000-0000-0000-0000000c1803', 'Ba', '0933444555', 1),
  ('00000000-0000-0000-0000-0000000c1804', 'Nobody', '0999888777', 1);

select lives_ok($$select * from public.customer_backfill_dry_run()$$, 'dry run runs');
select is(
  (select string_agg(source_id || '=' || decision || ':' || reason, ', ' order by source_id)
     from public.customer_match_candidates where source_id like '%-BF-%'),
  'B-BF-001=auto:same phone, B-BF-002=auto:same phone, B-BF-003=review:name matches one phone, '
  || 'B-BF-004=review:same name, no phone, B-BF-005=review:same name, no phone, '
  || 'B-BF-006=review:phone not recognised, B-BF-007=review:several customers share this phone, '
  || 'B-BF-008=auto:phone matches a customer, TI-BF-001=auto:same phone',
  'dry run decisions (only phone matches are auto; a name alone goes to review)');
select is(
  (select string_agg(source_id || '=' || decision, ', ' order by source_id) from public.customer_match_candidates
    where source_table = 'leads' and source_id like '%c18%'),
  '00000000-0000-0000-0000-0000000c1803=auto', 'leads only join an existing phone group');
select is((select count(*)::int from public.bang_keo_orders where id like 'B-BF-%' and customer_id is not null), 0,
  'dry run links nothing');
select lives_ok($$select * from public.customer_backfill_dry_run()$$, 'dry run can run again');
select is((select count(*)::int from public.customer_match_candidates where source_id like '%-BF-%'), 9,
  'second dry run replaces the pending rows');

insert into t18 values ('expect_apply', (
  select row(count(distinct group_key) filter (where customer_id is null), count(*))::text
    from public.customer_match_candidates where status = 'pending' and decision = 'auto'));
insert into t18 values ('vp_a', (select id::text from public.customers where name = 'Van phong A'));
select is((select row(customers_created, rows_linked)::text from public.customer_backfill_apply()),
  (select v from t18 where k = 'expect_apply'),
  'apply creates one customer per new group and links every auto row');
select ok(
  (select count(distinct customer_id) = 1 and bool_and(customer_id is not null)
     from (select customer_id from public.bang_keo_orders where id in ('B-BF-001', 'B-BF-002')
           union all select customer_id from public.truc_in_orders where id = 'TI-BF-001'
           union all select customer_id from public.leads where id = '00000000-0000-0000-0000-0000000c1803') x),
  'phone group (orders and the lead) share one customer');
select is(
  (select row(c.name, c.phone, c.address)::text from public.customers c
     join public.bang_keo_orders o on o.customer_id = c.id where o.id = 'B-BF-001'),
  row('Chi Ba', '0933444555', 'Moi')::text, 'new customer from the newest order: name, raw phone, newest address');
select is((select customer_id::text from public.bang_keo_orders where id = 'B-BF-008'),
  (select v from t18 where k = 'c1'), 'existing customer reused');
select is((select count(*)::int from public.bang_keo_orders where id in ('B-BF-004', 'B-BF-005') and customer_id is not null),
  0, 'same name without phone is not merged automatically');
select is((select count(*)::int from public.bang_keo_orders where id in ('B-BF-003', 'B-BF-006', 'B-BF-007') and customer_id is not null),
  0, 'review rows stay unlinked');
select is((select count(*)::int from public.customer_backfill_log where source_id like '%-BF-%' and applied_by is null),
  4, 'every applied link is logged');
select is((select row(customers_created, rows_linked)::text from public.customer_backfill_apply()), row(0, 0)::text,
  'apply again: nothing to do');
select lives_ok($$select * from public.customer_backfill_dry_run()$$, 'dry run after apply');
select is((select status from public.customer_match_candidates where source_id = 'B-BF-001'), 'applied',
  'applied rows stay as history');

-- Review queue
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is(
  (select string_agg(source_id || ':' || order_type, ', ' order by source_id)
     from public.admin_customer_review_list() where source_id like '%-BF-%'),
  'B-BF-003:bang_keo, B-BF-005:bang_keo, B-BF-006:bang_keo, B-BF-007:bang_keo',
  'review list: one item per name group (newest row), others alone, with the order type');
select is(
  (select row(group_size, group_ids)::text from public.admin_customer_review_list() where source_id = 'B-BF-005'),
  row(2, '{B-BF-004,B-BF-005}'::text[])::text, 'name group lists its size and ids');
select is(
  (select jsonb_array_length(suggestions) from public.admin_customer_review_list() where source_id = 'B-BF-007'),
  2, 'review row suggests the customers that share the phone');
select lives_ok(
  format($$select public.admin_customer_review_resolve('bang_keo_orders', 'B-BF-007', %L)$$,
         (select v from t18 where k = 'vp_a')),
  'admin links a review row');
select is((public.admin_order_get('B-BF-007', 'bang_keo') -> 'order' ->> 'customer_id'),
  (select v from t18 where k = 'vp_a'), 'review link applied');
select lives_ok($$select public.admin_customer_review_resolve('bang_keo_orders', 'B-BF-006', null)$$,
  'admin skips a review row');
select throws_ok($$select public.admin_customer_review_resolve('bang_keo_orders', 'B-BF-006', null)$$, 'P0002', null,
  'a resolved row is no longer in the queue');
select throws_ok($$select public.admin_customer_review_resolve('pg_authid', 'x', null)$$, 'P0002', null,
  'unknown table: P0002, no SQL built from input');
select pg_temp.logout();
-- The order changed after the dry run (ids are reused after delete / quote conversion): no link.
update public.bang_keo_orders set ten_khach_hang = 'Khach Khac' where id = 'B-BF-004';
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select throws_ok(
  format($$select public.admin_customer_review_resolve('bang_keo_orders', 'B-BF-004', %L)$$, (select v from t18 where k = 'vp_a')),
  'P0002', null, 'review link refused when the order changed since the dry run');
-- Picking the unchanged row of the group links it; the changed one stays pending.
select lives_ok(
  format($$select public.admin_customer_review_resolve('bang_keo_orders', 'B-BF-005', %L)$$, (select v from t18 where k = 'vp_a')),
  'admin links a name group');
select pg_temp.logout();
select ok((select customer_id is null from public.bang_keo_orders where id = 'B-BF-004'), 'changed order stays unlinked');
select is((select customer_id::text from public.bang_keo_orders where id = 'B-BF-005'), (select v from t18 where k = 'vp_a'),
  'group link lands on the unchanged row');
select is((select status from public.customer_match_candidates where source_id = 'B-BF-004'), 'pending',
  'changed group row stays pending');
select is(
  (select row(status, resolved_by)::text from public.customer_match_candidates where source_id = 'B-BF-006'),
  row('skipped', '00000000-0000-0000-0000-00000000a001'::uuid)::text, 'skip is recorded with the admin');

select is((select group_key from public.customer_match_candidates where source_id = 'B-BF-004'), 'name:khach le',
  'phone-less same-name rows share a name group');

select * from finish();
rollback;
