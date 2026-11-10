-- 0036 customer review bulk: name keys (accents, case, spaces, legal forms canonicalized, titles kept),
-- admin-only bulk create / undo / regroup, similar groups in the review list, idempotent re-run,
-- undo restores the queue. Requires seed.sql (admin a001, staff a003). Run: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

create function pg_temp.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.pg() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
create temp table t26 (k text primary key, v jsonb);
grant all on t26 to public;

-- Name keys.
select is(public.normalize_customer_name('  CÔNG TY  TNHH Minh   Phát. '), 'tnhh minh phat',
  'accents, case, spaces, punctuation and "Công ty" removed');
select is(public.normalize_customer_name('Cty TNHH Minh Phat'), public.normalize_customer_name('Công ty TNHH Minh Phát'),
  'Cty = Công ty');
select isnt(public.normalize_customer_name('Cty CP Minh Phát'), public.normalize_customer_name('Cty TNHH Minh Phát'),
  'CP and TNHH stay different companies');
select is(public.normalize_customer_name('Công ty Cổ phần Minh Phát'), public.normalize_customer_name('CTY CP MINH PHAT'),
  'cổ phần = CP');
select is(public.normalize_customer_name('cty trách nhiệm hữu hạn một thành viên Đức'), 'tnhh mtv duc',
  'long legal form canonicalized, đ -> d');
select isnt(public.normalize_customer_name('Chị Lan'), public.normalize_customer_name('Lan'), 'titles are kept');
select is(public.customer_name_loose_key('Chị Lan'), public.customer_name_loose_key('A. Lan'),
  'loose key drops a leading title (suggestions only)');
select is(public.normalize_customer_name('李明'), '李明', 'a name in another script keeps a key');

-- Unlinked old orders without phone.
select pg_temp.pg();
alter table public.bang_keo_orders disable trigger zz_resolve_customer;
insert into public.bang_keo_orders (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang,
                                    dia_chi_khach_hang, quy_cach, so_luong, don_gia_goc, don_gia_ban)
values ('B-T26-001', '2025-01-01', '2025-01-05', 'BK', 'Chị Hoà T26', null, 'Cũ', '48mm', 1, 1, 100),
       ('B-T26-002', '2025-02-01', '2025-02-05', 'BK', 'chi hoa t26', null, null, '48mm', 1, 1, 100),
       ('B-T26-003', '2025-03-01', '2025-03-05', 'BK', 'Chị Hoà T26', null, 'Mới', '48mm', 1, 1, 100),
       ('B-T26-004', '2025-03-02', '2025-03-05', 'BK', 'Hoà T26', null, null, '48mm', 1, 1, 100),
       ('B-T26-005', '2025-03-03', '2025-03-05', 'BK', 'Cty TNHH Mai T26', null, null, '48mm', 1, 1, 100),
       ('B-T26-006', '2025-03-04', '2025-03-05', 'BK', 'CÔNG TY TNHH MAI T26', null, null, '48mm', 1, 1, 100),
       ('B-X26-007', '2025-03-05', '2025-03-06', 'BK', 'Lan X26', null, null, '48mm', 1, 1, 100);
insert into public.customers (name) values ('Lan X26');
alter table public.bang_keo_orders enable trigger zz_resolve_customer;
select lives_ok($$select * from public.customer_backfill_dry_run()$$, 'dry run');

-- Non-admin denied.
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select throws_ok($$select public.admin_customer_review_bulk_create('{bang_keo_orders:B-T26-001}')$$, '42501', null,
  'staff cannot bulk create');
select throws_ok($$select public.admin_customer_review_bulk_undo(gen_random_uuid())$$, '42501', null,
  'staff cannot undo');
select throws_ok($$select public.admin_customer_review_regroup('bang_keo_orders', 'B-T26-004', 'bang_keo_orders', 'B-T26-001')$$,
  '42501', null, 'staff cannot regroup');

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is(
  (select row(group_size, jsonb_array_length(members), similar_groups -> 0 ->> 'source_id')::text
     from public.admin_customer_review_list(200) where source_id = 'B-T26-003'),
  row(3, 3, 'B-T26-004')::text,
  'one item per spelling group (accents ignored), members listed, "Hoà" suggested as similar');

-- Merge the "Hoà T26" group into "Chị Hoà T26", then bulk create two groups.
select is(public.admin_customer_review_regroup('bang_keo_orders', 'B-T26-004', 'bang_keo_orders', 'B-T26-001'), 1,
  'regroup moves the other spelling');
insert into t26 select 'r1', public.admin_customer_review_bulk_create(
  '{bang_keo_orders:B-T26-002,bang_keo_orders:B-T26-005,bang_keo_orders:B-T26-005}');
select is((select row(v -> 'customers_created', v -> 'rows_linked', v -> 'skipped')::text from t26 where k = 'r1'),
  row('2'::jsonb, '6'::jsonb, '1'::jsonb)::text, 'bulk: 2 customers, 6 rows linked, duplicate pick skipped');
select pg_temp.pg();
select is(
  (select string_agg(o.id || '=' || c.name || '/' || coalesce(c.address, '-'), ', ' order by o.id)
     from public.bang_keo_orders o join public.customers c on c.id = o.customer_id where o.id like 'B-T26-%'),
  'B-T26-001=Chị Hoà T26/Mới, B-T26-002=Chị Hoà T26/Mới, B-T26-003=Chị Hoà T26/Mới, B-T26-004=Chị Hoà T26/Mới, '
  || 'B-T26-005=CÔNG TY TNHH MAI T26/-, B-T26-006=CÔNG TY TNHH MAI T26/-',
  'every row linked; name = most frequent spelling (newest on a tie), newest address');

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is((select public.admin_customer_review_bulk_create('{bang_keo_orders:B-T26-002,bang_keo_orders:B-T26-005}')
             -> 'customers_created'), '0'::jsonb, 're-run creates nothing');

select is(public.admin_customer_review_bulk_undo((select (v ->> 'batch_id')::uuid from t26 where k = 'r1')),
  '{"rows_unlinked": 6, "customers_deleted": 2}'::jsonb, 'undo unlinks the batch and deletes its customers');
select pg_temp.pg();
select is(
  (select row(count(*) filter (where o.customer_id is not null),
              (select count(*) from public.customer_match_candidates m
                where m.source_id like 'B-T26-%' and m.status = 'pending'),
              (select count(*) from public.customers where name like '%T26%'))::text
     from public.bang_keo_orders o where o.id like 'B-T26-%'),
  row(0, 6, 0)::text, 'after undo: orders unlinked, back in the queue, customers gone');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is(public.admin_customer_review_bulk_undo((select (v ->> 'batch_id')::uuid from t26 where k = 'r1')),
  '{"rows_unlinked": 0, "customers_deleted": 0}'::jsonb, 'second undo does nothing');

select is((select public.admin_customer_review_bulk_create('{bang_keo_orders:B-X26-007}') -> 'skipped'), '1'::jsonb,
  'bulk skips a group whose name matches an existing customer');

select * from finish();
rollback;
