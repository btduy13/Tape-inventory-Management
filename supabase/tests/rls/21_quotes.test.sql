-- Regression tests for 0032_quotes (multi-size quotes). Requires seed.sql (admin a001, staff a003).
-- Run: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

create function pg_temp.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.perms(p text[]) returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  update public.profiles set permissions = p where id = '00000000-0000-0000-0000-00000000a003';
  perform pg_temp.login('00000000-0000-0000-0000-00000000a003');
end $$;

create temp table t21 (k text primary key, v text);
grant all on t21 to public;

select ok(
  (select bool_and(p.prosecdef and p.proconfig @> array['search_path=""']
                   and not has_function_privilege('anon', p.oid, 'EXECUTE')
                   and has_function_privilege('authenticated', p.oid, 'EXECUTE'))
     from pg_proc p
    where p.oid in ('public.admin_quote_save(text,jsonb,jsonb,text)'::regprocedure,
                    'public.admin_quotes_list(text,text,date,date)'::regprocedure)),
  'quote RPCs: security definer, empty search_path, authenticated only');
select ok(not has_function_privilege('authenticated', 'public.quote_item_build(text,jsonb,jsonb)', 'EXECUTE'),
  'quote_item_build is internal');

-- Two sizes; the first has one new axis. Size 1: cost 900/roll, 10 x 1500, VAT 10%, deposit 1000,
-- axis 2 x 150000 (cost 100000), VAT 10%. Size 2: cost 450/roll, 30 x 1000, VAT 10%.
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
insert into t21 select 'bki', public.admin_quote_save('bang_keo_in',
  '{"ten_hang": "BG T21", "ten_khach_hang": "Khách T21", "sdt_khach_hang": ""}',
  '[{"quy_cach_mm": 48, "quy_cach_m": 90, "quy_cach_mic": 45, "cuon_cay": 1, "so_luong": 10, "don_gia_von": 900,
     "don_gia_ban": 1500, "vat_percent": 10, "tien_coc": 1000, "mau_sac": "Đỏ",
     "axes": [{"ten_truc": "T1", "truc_chu_vi": 300, "truc_so_luong": 2, "truc_gia_goc": 100000, "truc_gia_ban": 150000, "truc_vat_percent": 10}]},
    {"quy_cach_mm": 60, "quy_cach_m": 90, "quy_cach_mic": 45, "cuon_cay": 1, "so_luong": 30, "don_gia_von": 450,
     "don_gia_ban": 1000, "vat_percent": 10}]');
-- Direct table reads as postgres; auth.uid() stays a001 for the RPCs (claims kept).
select set_config('role', 'postgres', true);
select matches((select v from t21 where k = 'bki'), '^BG-BK-\d{2}-\d{2}-\d{3}$', 'new quote id BG-BK-MM-YY-NNN');

select is((select row(o.is_quote, o.so_luong, o.thanh_tien_ban, o.don_gia_ban, o.thanh_tien_goc, o.vat, o.tien_coc,
                      o.loai_truc, o.ten_truc, o.truc_thanh_tien_ban, o.truc_vat, o.cong_no_khach, o.cong_no_ncc,
                      o.sdt_khach_hang is null)::text
             from public.bang_keo_in_orders o where o.id = (select v from t21 where k = 'bki')),
  row(true, 40::numeric, 45000::numeric, 1125::numeric, 22500::numeric, 4500::numeric, 1000::numeric,
      'moi'::text, '1 trục in'::text, 300000::numeric, 30000::numeric, 378500::numeric, 222500::numeric, true)::text,
  'row columns = bundle totals (calculateQuoteBundle / prepareQuoteItems)');

select is((select row(jsonb_array_length(o.quote_items), o.quote_items #>> '{0,specification}', o.quote_items #>> '{0,axes,0,name}',
                      (o.quote_items #>> '{0,axes,0,total}')::numeric, (o.quote_items #>> '{1,total}')::numeric,
                      o.quote_items #>> '{0,fields,qc-m}', o.quote_items #>> '{0,details,printColor}')::text
             from public.bang_keo_in_orders o where o.id = (select v from t21 where k = 'bki')),
  row(2, '48mm x 90m (45mic)'::text, 'T1'::text, 300000::numeric, 30000::numeric, '90'::text, 'Đỏ'::text)::text,
  'quote_items in the desktop shape');

select is((select count(*)::int from public.admin_quotes_list('bang_keo_in', 'Khách T21') l),
  1, 'admin_quotes_list finds the quote');
select is((select count(*)::int from public.admin_orders_list('{"q": "Khách T21"}', 'bang_keo_in')),
  0, 'a quote is not an order');

-- Overwrite with one size and no axis: axis columns cleared, creation date kept.
insert into t21 select 'tg', thoi_gian::text from public.bang_keo_in_orders where id = (select v from t21 where k = 'bki');
select is(public.admin_quote_save('bang_keo_in', '{"ten_hang": "BG T21", "ten_khach_hang": "Khách T21"}',
  '[{"quy_cach_m": 90, "cuon_cay": 1, "so_luong": 10, "don_gia_von": 900, "don_gia_ban": 1500}]',
  (select v from t21 where k = 'bki')), (select v from t21 where k = 'bki'), 'update returns the same id');
select is((select row(o.loai_truc, o.truc_thanh_tien_ban, o.thanh_tien_ban, o.don_gia_goc = 900, o.mau_sac is null,
                      o.thoi_gian::text = (select v from t21 where k = 'tg'), jsonb_array_length(o.quote_items))::text
             from public.bang_keo_in_orders o where o.id = (select v from t21 where k = 'bki')),
  row('cu'::text, 0::numeric, 15000::numeric, true, true, true, 1)::text,
  'update rewrites sizes and clears the old inputs, keeps thoi_gian');

select throws_ok($$select public.admin_quote_save('thank_you', '{"ten_hang": "x", "ten_khach_hang": "y"}', '[{"so_luong": 1, "don_gia_ban": 1}]')$$,
  '22023', null, 'no Thank you quotes');
select throws_ok($$select public.admin_quote_save('truc_in', '{"ten_hang": "x", "ten_khach_hang": "y"}',
  '[{"so_luong": 1, "don_gia_ban": 1, "don_gia_goc": 1, "axes": [{"ten_truc": "a"}]}]')$$,
  '22023', null, 'axes only on printed tape');
select throws_ok($$select public.admin_quote_save('bang_keo_in', '{"ten_hang": "x", "ten_khach_hang": "y"}',
  '[{"quy_cach_m": 90, "cuon_cay": 1, "so_luong": 1, "don_gia_ban": 1, "thanh_tien_ban": 5}]')$$,
  '22023', null, 'computed columns are not accepted');

-- Permissions
select pg_temp.perms('{}');
select throws_ok($$select public.admin_quote_save('bang_keo_in', '{"ten_hang": "x", "ten_khach_hang": "y"}',
  '[{"quy_cach_m": 90, "cuon_cay": 1, "so_luong": 1, "don_gia_ban": 1}]')$$, '42501', null, 'create needs orders.create');
select pg_temp.perms('{orders.edit}');
select throws_ok(format($$select public.admin_quote_save('bang_keo_in', '{"ten_hang": "x", "ten_khach_hang": "y"}',
  '[{"quy_cach_m": 90, "cuon_cay": 1, "so_luong": 1, "don_gia_ban": 1}]', %L)$$, (select v from t21 where k = 'bki')),
  '42501', null, 'overwrite needs orders.edit and orders.money');
select pg_temp.perms('{orders.view}');
select is((select l.quote ? 'thanh_tien_goc' and l.quote -> 'thanh_tien_goc' = 'null'::jsonb
             from public.admin_quotes_list('bang_keo_in', 'Khách T21') l),
  true, 'list hides cost without orders.money');
select pg_temp.perms('{orders.create}');
select isnt(public.admin_quote_convert('bang_keo_in', (select v from t21 where k = 'bki'), current_date + 1),
  null, 'convert to order keeps working');

select * from finish();
rollback;
