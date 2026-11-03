-- Regression tests for migrations 0023_production_step_v2 + 0024_workshop_v2.
-- Requires seed.sql (admin a001, staff a003, workshop a006 "Xưởng 1", workshop2 a007).
-- Run: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(117);

-- helpers -------------------------------------------------------------------------------------
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
create function pg_temp.as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'service_role', true);
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
create function pg_temp.sha(p text) returns text language sql as $$
  select encode(sha256(convert_to(p, 'UTF8')), 'hex')
$$;

-- Scratch tables shared across roles (tokens are returned once, job ids hidden by RLS).
create temp table t16_tok (k text primary key, token text, note_id uuid);
create temp table t16_job (k text primary key, id uuid);
grant all on t16_tok, t16_job to public;

do $grant$ begin
  if current_setting('server_version_num')::int >= 160000 then
    execute 'grant electron_app to postgres with set true, inherit false';
  else
    execute 'grant electron_app to postgres';
  end if;
end $grant$;

-- Schema ----------------------------------------------------------------------------------------
select is(
  array[public.production_step_next('cho_san_xuat'), public.production_step_next('dang_san_xuat'),
        public.production_step_next('san_sang_giao'), public.production_step_next('da_giao')],
  array['dang_san_xuat', 'san_sang_giao', 'da_giao', null]::public.production_step[],
  'four steps: cho_san_xuat -> dang_san_xuat -> san_sang_giao -> da_giao');
select is(public.production_step_label('dang_san_xuat'), 'Đang sản xuất', 'label of the new step');
select is(public.production_step_label('dang_in'), 'Đang in', 'retired steps keep their label for history');
select throws_ok(
  $$insert into public.production_jobs (order_id, step) values ('BK-T16-RETIRED', 'dong_goi')$$,
  '23514', null, 'retired steps cannot be stored on a job');
select throws_ok(
  $$insert into public.production_jobs (step) values ('cho_san_xuat')$$,
  '23514', null, 'a job needs a lead or an order');
select ok(
  (select bool_and(exists (select 1 from information_schema.columns
                            where table_schema = 'public' and table_name = 'bang_keo_in_orders'
                              and column_name = c))
     from unnest(array['sdt_khach_hang', 'dia_chi_khach_hang']) c),
  'bang_keo_in_orders has sdt_khach_hang and dia_chi_khach_hang');
select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
    where oid = 'public.bang_keo_in_orders_production_sync()'::regprocedure),
  'order trigger function is SECURITY DEFINER with an empty search_path');
select ok(
  not has_function_privilege('anon', 'public.bang_keo_in_orders_production_sync()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.bang_keo_in_orders_production_sync()', 'EXECUTE')
  and not has_function_privilege('electron_app', 'public.bang_keo_in_orders_production_sync()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.production_apply_step(uuid,public.production_step,text,text)', 'EXECUTE')
  and not has_function_privilege('electron_app', 'public.production_apply_step(uuid,public.production_step,text,text)', 'EXECUTE'),
  'trigger function and internal step helper are not executable by API roles or electron_app');
select ok(
  not has_function_privilege('anon', 'public.delivery_note_by_token(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.delivery_note_by_token(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.confirm_delivery(text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.confirm_delivery(text,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.confirm_delivery(text,text)', 'EXECUTE'),
  'token RPCs are service_role only');
select ok(
  not has_function_privilege('anon', 'public.admin_orders_list(jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_order_get(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_order_create(jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.create_delivery_note(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.assign_workshop_job(uuid,uuid)', 'EXECUTE'),
  'anon cannot execute the new RPCs');
select ok(
  (select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc
    where oid in ('public.admin_orders_list(jsonb)'::regprocedure, 'public.admin_order_get(text)'::regprocedure,
                  'public.admin_order_create(jsonb)'::regprocedure, 'public.create_delivery_note(uuid)'::regprocedure,
                  'public.delivery_note_by_token(text)'::regprocedure, 'public.confirm_delivery(text,text)'::regprocedure)),
  'new RPCs are SECURITY DEFINER with an empty search_path');
select ok(
  not has_table_privilege('anon', 'public.bang_keo_in_orders', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.bang_keo_in_orders', 'SELECT,INSERT,UPDATE,DELETE'),
  'legacy order table still has no API grant');
select ok(
  not has_table_privilege('anon', 'public.delivery_notes', 'SELECT')
  and not has_table_privilege('authenticated', 'public.delivery_notes', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('electron_app', 'public.delivery_notes', 'SELECT')
  and (select relrowsecurity from pg_class where oid = 'public.delivery_notes'::regclass),
  'delivery_notes: RLS on, no write grant, nothing for anon / electron_app');
select is(
  (select row(public, file_size_limit, allowed_mime_types)::text from storage.buckets where id = 'delivery-photos'),
  row(false, 10485760::bigint, array['image/jpeg'])::text, 'delivery-photos bucket is private, JPEG only');
select is(
  (select array_agg(a order by a) from unnest(string_to_array(
     regexp_replace(pg_get_function_result('public.workshop_jobs(uuid)'::regprocedure), '^TABLE\((.*)\)$', '\1'),
     ', ')) a
   where a ~* '(price|gia|vat|phone|sdt|email|company|customer|khach|dia_chi|address|thanh_tien|cong_no|loi_nhuan|subtotal|total)'),
  null::text[], 'workshop_jobs still exposes no price / contact / customer columns');
select is(
  (select array_agg(split_part(a, ' ', 1)) from (
     select a from unnest(string_to_array(
       regexp_replace(pg_get_function_result('public.workshop_jobs(uuid)'::regprocedure), '^TABLE\((.*)\)$', '\1'),
       ', ')) with ordinality as t(a, n) order by n desc limit 2) s),
  array['order_table', 'order_name'], 'workshop_jobs appends order_name and order_table');

-- App -> web: trigger on bang_keo_in_orders (as the desktop role) -----------------------------
select lives_ok($$
  set local role electron_app;
  insert into public.bang_keo_in_orders
    (id, thoi_gian, ngay_du_kien, ten_hang, ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang,
     quy_cach_mm, quy_cach_m, quy_cach_mic, so_luong, mau_sac, don_gia_ban, thanh_tien_ban, is_quote, da_giao)
  values ('BK-T16-001', localtimestamp, current_date + 2, 'Băng keo ABC', 'Khách T16', '0912345678',
          '12 Nguyễn Huệ, Q1', 48, 100, 45, 50, 'Đỏ, Xanh', 9000, 450000, false, false);
  insert into public.bang_keo_in_orders (id, ngay_du_kien, ten_hang, is_quote)
  values ('BG-BK-T16-Q', current_date, 'Báo giá', true);
  insert into public.bang_keo_in_orders (id, ngay_du_kien, ten_hang, is_quote, da_giao)
  values ('BK-T16-OLD', current_date, 'Đơn cũ đã giao', false, true);
  reset role
$$, 'electron_app inserts an order, a quote and an already delivered order');
select is(
  (select row(lead_id, step, order_table, workshop_user_id)::text from public.production_jobs where order_id = 'BK-T16-001'),
  row(null::uuid, 'cho_san_xuat'::public.production_step, 'bang_keo_in_orders', null::uuid)::text,
  'new app order -> lead-less job at cho_san_xuat (2 workshop users: not auto-assigned)');
select is(
  (select row(changed_by, changed_by_name, note)::text from public.production_step_log l
     join public.production_jobs j on j.id = l.job_id where j.order_id = 'BK-T16-001'),
  row(null::uuid, 'App', 'Đơn mới từ app')::text, 'job creation is logged as from the app (no order code)');
select is((select count(*)::int from public.production_jobs where order_id in ('BG-BK-T16-Q', 'BK-T16-OLD')), 0,
  'quotes and orders inserted as delivered get no job');

select lives_ok($$
  set local role electron_app;
  update public.bang_keo_in_orders set id = 'BK-T16-002', is_quote = false, da_giao = false
   where id = 'BG-BK-T16-Q' and is_quote;
  update public.bang_keo_in_orders set ten_hang = 'Băng keo ABC (sửa)', so_luong = 60 where id = 'BK-T16-001';
  reset role
$$, 'electron_app converts the quote and edits an order');
select is((select count(*)::int from public.production_jobs where order_id = 'BK-T16-002'), 1,
  'a quote turned into an order gets a job');
select is((select count(*)::int from public.production_jobs where order_id = 'BK-T16-001'), 1,
  'editing an order creates no second job');
select lives_ok($$
  set local role electron_app;
  delete from public.bang_keo_in_orders where id = 'BK-T16-002';
  reset role
$$, 'electron_app deletes an order');
select is((select count(*)::int from public.production_jobs where order_id = 'BK-T16-002'), 0,
  'deleting an order removes its lead-less job');

insert into t16_job select 'app1', id from public.production_jobs where order_id = 'BK-T16-001';

-- Assignment of lead-less jobs ----------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select throws_ok(
  $$select public.assign_workshop_job((select id from t16_job where k = 'app1'), '00000000-0000-0000-0000-00000000a006')$$,
  '42501', null, 'workshop cannot assign jobs');
select is((select count(*)::int from public.workshop_jobs() where order_id = 'BK-T16-001'), 0,
  'unassigned app job is hidden from workshop');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select throws_ok(
  $$select public.assign_workshop_job((select id from t16_job where k = 'app1'), '00000000-0000-0000-0000-00000000a003')$$,
  '22023', null, 'assignee must be a workshop user');
select lives_ok(
  $$select public.assign_workshop_job((select id from t16_job where k = 'app1'), '00000000-0000-0000-0000-00000000a006')$$,
  'admin assigns the app job to workshop');
select pg_temp.logout();

-- Workshop view of an app order: name + specs from the order row --------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select is(
  (select row(order_name, lead_id, lead_code, quantity, width_mm, length_m, thickness_mic, colors, order_table)::text
     from public.workshop_jobs() where order_id = 'BK-T16-001'),
  row('Băng keo ABC (sửa)', null::uuid, null::text, 60, 48::numeric, 100::numeric, 45::numeric,
      array['Đỏ', 'Xanh'], 'bang_keo_in_orders')::text,
  'workshop_jobs: order_name = ten_hang, specs from the order (live edits)');
select is((select due_date from public.workshop_jobs() where order_id = 'BK-T16-001'), current_date + 2,
  'due date comes from ngay_du_kien');

-- Steps: forward only, no da_giao by hand ------------------------------------------------------
select throws_ok(
  $$select public.advance_production_step((select id from t16_job where k = 'app1'), 'san_sang_giao')$$,
  '42501', null, 'workshop cannot skip dang_san_xuat');
select throws_ok(
  $$select public.create_delivery_note((select id from t16_job where k = 'app1'))$$,
  '22023', null, 'no delivery note before san_sang_giao');
select lives_ok(
  $$select public.advance_production_step((select id from t16_job where k = 'app1'), 'dang_san_xuat')$$,
  'workshop: cho_san_xuat -> dang_san_xuat');
select throws_ok(
  $$select public.advance_production_step((select id from t16_job where k = 'app1'), 'cho_san_xuat')$$,
  '42501', null, 'workshop cannot move back');
select throws_ok(
  $$select public.advance_production_step((select id from t16_job where k = 'app1'), 'dang_in')$$,
  '22023', null, 'retired step rejected');
select lives_ok(
  $$select public.advance_production_step((select id from t16_job where k = 'app1'), 'san_sang_giao')$$,
  'workshop: dang_san_xuat -> san_sang_giao');
select throws_ok(
  $$select public.advance_production_step((select id from t16_job where k = 'app1'), 'da_giao')$$,
  '42501', null, 'workshop cannot set da_giao by hand');
select throws_ok(
  $$select public.create_delivery_note(null)$$, 'P0002', null, 'create_delivery_note(null) is rejected');

-- Delivery note -------------------------------------------------------------------------------
select lives_ok(
  $$insert into t16_tok select 'w1', token, note_id from public.create_delivery_note((select id from t16_job where k = 'app1'))$$,
  'assigned workshop creates a delivery note');
select pg_temp.logout();

select matches((select token from t16_tok where k = 'w1'), '^[A-Za-z0-9_-]{43}$', 'token is 43 chars base64url');
select is(
  (select row(recipient_name, recipient_phone, recipient_address)::text from public.delivery_notes
    where id = (select note_id from t16_tok where k = 'w1')),
  row('Khách T16', '0912345678', '12 Nguyễn Huệ, Q1')::text, 'recipient snapshot from the order');
select is(
  (select token_hash from public.delivery_notes where id = (select note_id from t16_tok where k = 'w1')),
  pg_temp.sha((select token from t16_tok where k = 'w1')), 'only sha256(token) hex is stored');
select is(
  (select count(*)::int from public.delivery_notes n, t16_tok t
    where t.k = 'w1' and to_jsonb(n)::text like '%' || t.token || '%'),
  0, 'the raw token is stored nowhere in the note row');

select pg_temp.login('00000000-0000-0000-0000-00000000a007');  -- workshop2
select throws_ok(
  $$select public.create_delivery_note((select id from t16_job where k = 'app1'))$$,
  'P0002', null, 'another workshop user cannot create a note for the job');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-00000000a003');  -- staff
select throws_ok(
  $$select public.create_delivery_note((select id from t16_job where k = 'app1'))$$,
  '42501', null, 'staff cannot create delivery notes');
select throws_ok(
  $$select * from public.delivery_note_by_token('00')$$, '42501', null, 'staff cannot read notes by token');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$insert into t16_tok select 'a1', token, note_id from public.create_delivery_note((select id from t16_job where k = 'app1'))$$,
  'admin re-creates the note');
select is((select count(*)::int from public.delivery_notes where job_id in (select id from t16_job)), 2,
  'admin reads delivery notes');
select pg_temp.logout();
select ok((select revoked_at is not null from public.delivery_notes where id = (select note_id from t16_tok where k = 'w1')),
  'the older open note is revoked');
select is((select count(*)::int from public.delivery_notes
            where job_id = (select id from t16_job where k = 'app1') and revoked_at is null and confirmed_at is null), 1,
  'one open note per job');

select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select is((select count(*)::int from public.delivery_notes), 0, 'workshop cannot read the delivery_notes table');
select pg_temp.logout();
select pg_temp.as_anon();
select throws_ok($$select count(*) from public.delivery_notes$$, '42501', null, 'anon cannot read delivery_notes');
select throws_ok($$select * from public.delivery_note_by_token('00')$$, '42501', null, 'anon cannot read notes by token');
select throws_ok($$select * from public.confirm_delivery('00', 'x')$$, '42501', null, 'anon cannot confirm');
select pg_temp.logout();

-- Token lookup + confirmation (service role = /giao/[token] server code) ------------------------
select pg_temp.as_service();
select is(
  (select row(order_name, quantity, recipient_name, status, job_step)::text
     from public.delivery_note_by_token(pg_temp.sha((select token from t16_tok where k = 'a1')))),
  row('Băng keo ABC (sửa)', 60, 'Khách T16', 'open', 'san_sang_giao'::public.production_step)::text,
  'open note by token: name, quantity, recipient');
select is(
  (select status from public.delivery_note_by_token(pg_temp.sha((select token from t16_tok where k = 'w1')))),
  'revoked', 'replaced note reports revoked');
select is((select count(*)::int from public.delivery_note_by_token(pg_temp.sha('wrong'))), 0, 'unknown token: no row');
select is((select count(*)::int from public.delivery_note_by_token('not-a-hash')), 0, 'malformed hash: no row');
select throws_ok(
  format($$select * from public.confirm_delivery(%L, %L)$$,
         pg_temp.sha((select token from t16_tok where k = 'w1')),
         (select note_id from t16_tok where k = 'w1') || '/p.jpg'),
  '55000', 'delivery note was replaced', 'a replaced note cannot be confirmed');
select throws_ok(
  format($$select * from public.confirm_delivery(%L, %L)$$,
         pg_temp.sha((select token from t16_tok where k = 'a1')),
         (select note_id from t16_tok where k = 'a1') || '/p.jpg'),
  '22023', null, 'confirm needs the uploaded photo');
select pg_temp.logout();

insert into storage.objects (bucket_id, name) values
  ('delivery-photos', (select note_id from t16_tok where k = 'a1') || '/p.jpg'),
  ('delivery-photos', 'elsewhere/p.jpg');

select pg_temp.as_service();
select throws_ok(
  format($$select * from public.confirm_delivery(%L, 'elsewhere/p.jpg')$$,
         pg_temp.sha((select token from t16_tok where k = 'a1'))),
  '22023', null, 'photo must be under the note folder');
select throws_ok(
  format($$select * from public.confirm_delivery(%L, %L)$$,
         pg_temp.sha((select token from t16_tok where k = 'a1')),
         (select note_id from t16_tok where k = 'a1') || '/../x.jpg'),
  '22023', null, 'path traversal in the photo path is rejected');
select lives_ok(
  format($$select * from public.confirm_delivery(%L, %L)$$,
         pg_temp.sha((select token from t16_tok where k = 'a1')),
         (select note_id from t16_tok where k = 'a1') || '/p.jpg'),
  'service role confirms the delivery with the photo');
select throws_ok(
  format($$select * from public.confirm_delivery(%L, %L)$$,
         pg_temp.sha((select token from t16_tok where k = 'a1')),
         (select note_id from t16_tok where k = 'a1') || '/p.jpg'),
  '55000', 'delivery note already confirmed', 'a second confirm fails (note locked)');
select is(
  (select status from public.delivery_note_by_token(pg_temp.sha((select token from t16_tok where k = 'a1')))),
  'confirmed', 'confirmed note reports confirmed');
select pg_temp.logout();

select is(
  (select row(j.step, o.da_giao, n.photo_path is not null, n.confirmed_at is not null)::text
     from public.production_jobs j
     join public.bang_keo_in_orders o on o.id = j.order_id
     join public.delivery_notes n on n.id = (select note_id from t16_tok where k = 'a1')
    where j.id = (select id from t16_job where k = 'app1')),
  row('da_giao'::public.production_step, true, true, true)::text,
  'confirm: job da_giao, Electron da_giao = true, note locked with photo');
select is(
  (select row(from_step, changed_by, changed_by_name)::text from public.production_step_log
    where job_id = (select id from t16_job where k = 'app1') and to_step = 'da_giao'),
  row('san_sang_giao'::public.production_step, null::uuid, 'Người giao (QR)')::text,
  'delivery confirmation is logged');

select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select throws_ok(
  $$select public.create_delivery_note((select id from t16_job where k = 'app1'))$$,
  '22023', null, 'no new note after delivery');
select is((select count(*)::int from storage.objects where bucket_id = 'delivery-photos'), 0,
  'workshop cannot read delivery photos');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is((select count(*)::int from storage.objects
            where bucket_id = 'delivery-photos'
              and (split_part(name, '/', 1) in (select note_id::text from t16_tok) or name = 'elsewhere/p.jpg')), 2,
  'admin reads delivery photos');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('delivery-photos', 'x/y.jpg')$$,
  '42501', null, 'admin cannot upload delivery photos from the browser');
select pg_temp.logout();

-- App ticks "Đã giao" -> job follows ----------------------------------------------------------
select lives_ok($$
  set local role electron_app;
  insert into public.bang_keo_in_orders (id, ngay_du_kien, ten_hang, is_quote) values ('BK-T16-003', current_date, 'Băng keo D', false);
  update public.bang_keo_in_orders set da_giao = true where id = 'BK-T16-003';
  reset role
$$, 'electron_app creates an order and marks it delivered');
select is(
  (select row(j.step, l.changed_by_name, l.note)::text from public.production_jobs j
     join public.production_step_log l on l.job_id = j.id and l.to_step = 'da_giao'
    where j.order_id = 'BK-T16-003'),
  row('da_giao'::public.production_step, 'App', 'Từ app')::text, 'app da_giao moves the job to da_giao');

-- Lead hand-off still owns its order's job ------------------------------------------------------
insert into public.leads (id, customer_name, phone, company, quantity, status)
values ('00000000-0000-0000-0000-0000000c1601', 'Lead T16', '0900001601', 'Co T16', 100, 'new');
insert into public.designs (lead_id, width_mm, length_m, thickness_mic, colors, print_text)
values ('00000000-0000-0000-0000-0000000c1601', 48, 100, 50, '{#000000}', 'LEADT16');
insert into public.quotes (id, lead_id, status, vat_percent) values
  ('00000000-0000-0000-0000-0000000d1601', '00000000-0000-0000-0000-0000000c1601', 'draft', 8);
insert into public.quote_lines (quote_id, description, quantity, unit_price)
values ('00000000-0000-0000-0000-0000000d1601', 'tape', 100, 1000);
update public.quotes set status = 'sent', sent_at = now() where id = '00000000-0000-0000-0000-0000000d1601';
update public.quotes set status = 'accepted', responded_at = now() where id = '00000000-0000-0000-0000-0000000d1601';
update public.leads set status = 'accepted' where id = '00000000-0000-0000-0000-0000000c1601';

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c1601', pg_temp.vn_today() + 3, null,
      '00000000-0000-0000-0000-00000000a006')$$,
  'admin converts a lead');
select pg_temp.logout();
select is(
  (select row(count(*), bool_and(j.lead_id is not null), min(o.sdt_khach_hang))::text
     from public.production_jobs j join public.bang_keo_in_orders o on o.id = j.order_id
    where j.order_id = (select production_order_id from public.leads where id = '00000000-0000-0000-0000-0000000c1601')),
  row(1::bigint, true, '0900001601')::text,
  'hand-off: one job (the lead''s), order carries the lead phone');
insert into t16_job select 'lead', id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c1601';

select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select is((select order_name from public.workshop_jobs() where job_id = (select id from t16_job where k = 'lead')),
  'Băng keo in LEADT16', 'lead job order_name comes from the order ten_hang');
select lives_ok($$
  select public.advance_production_step((select id from t16_job where k = 'lead'), 'dang_san_xuat');
  select public.advance_production_step((select id from t16_job where k = 'lead'), 'san_sang_giao');
  insert into t16_tok select 'lead', token, note_id from public.create_delivery_note((select id from t16_job where k = 'lead'));
$$, 'workshop moves the lead job to san_sang_giao and creates a note');
select pg_temp.logout();
select is(
  (select row(recipient_name, recipient_phone)::text from public.delivery_notes
    where id = (select note_id from t16_tok where k = 'lead')),
  row('Co T16 - Lead T16', '0900001601')::text, 'lead job recipient comes from the lead');
select is((select status from public.leads where id = '00000000-0000-0000-0000-0000000c1601'),
  'shipping'::public.lead_status, 'san_sang_giao -> lead shipping');

-- Admin moving the job out of san_sang_giao revokes the open note.
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$select public.advance_production_step((select id from t16_job where k = 'lead'), 'dang_san_xuat', 'làm lại')$$,
  'admin moves the job back');
select ok((select revoked_at is not null from public.delivery_notes where id = (select note_id from t16_tok where k = 'lead')),
  'leaving san_sang_giao revokes the open note');
select lives_ok($$
  select public.advance_production_step((select id from t16_job where k = 'lead'), 'san_sang_giao');
  delete from t16_tok where k = 'lead';
  insert into t16_tok select 'lead', token, note_id from public.create_delivery_note((select id from t16_job where k = 'lead'));
$$, 'admin moves it forward again and re-creates the note');
select pg_temp.logout();
insert into storage.objects (bucket_id, name) values ('delivery-photos', (select note_id from t16_tok where k = 'lead') || '/p.jpg');
select pg_temp.as_service();
select lives_ok(
  format($$select * from public.confirm_delivery(%L, %L)$$,
         pg_temp.sha((select token from t16_tok where k = 'lead')),
         (select note_id from t16_tok where k = 'lead') || '/p.jpg'),
  'lead job delivery confirmed by QR');
select pg_temp.logout();
select is((select status from public.leads where id = '00000000-0000-0000-0000-0000000c1601'),
  'done'::public.lead_status, 'confirmed delivery -> lead done');

-- Admin order RPCs ------------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select throws_ok($$select * from public.admin_orders_list()$$, '42501', null, 'workshop cannot list orders');
select throws_ok($$select public.admin_order_get('BK-T16-001')$$, '42501', null, 'workshop cannot read an order');
select throws_ok($$select * from public.admin_order_create('{}')$$, '42501', null, 'workshop cannot create orders');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-00000000a003');
select throws_ok($$select * from public.admin_orders_list()$$, '42501', null, 'staff cannot list orders');
select throws_ok($$select * from public.admin_order_create('{}')$$, '42501', null, 'staff cannot create orders');
select pg_temp.logout();

create temp table t16_payload as select jsonb_build_object(
  'ten_hang', 'Băng keo web', 'ten_khach_hang', 'Khách web', 'sdt_khach_hang', '0911222333',
  'dia_chi_khach_hang', '1 Lê Lợi', 'ngay_du_kien', (pg_temp.vn_today() + 5)::text,
  'quy_cach_mm', 48, 'quy_cach_m', 100, 'quy_cach_mic', 45, 'cuon_cay', 6, 'so_luong', 120,
  'don_gia_von', 100000, 'phi_sl', 50000, 'phi_keo', 0, 'phi_mau', 30000, 'phi_size', 0, 'phi_cat', 20000,
  'don_gia_ban', 50000, 'tien_coc', 500000, 'vat_percent', 8, 'hoa_hong', 10, 'tien_ship', 30000,
  'mau_sac', 'Đỏ', 'ctv', 'CTV A', 'workshop_user_id', '00000000-0000-0000-0000-00000000a006') as p;
grant all on t16_payload to public;

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select throws_ok($$select * from public.admin_order_create((select p || '{"id":"X"}' from t16_payload))$$,
  '22023', null, 'unknown payload field rejected');
select throws_ok($$select * from public.admin_order_create((select p - 'cuon_cay' from t16_payload))$$,
  '22023', null, 'cuon_cay is required (cost cannot be computed)');
select throws_ok($$select * from public.admin_order_create((select p || '{"so_luong":"120"}' from t16_payload))$$,
  '22023', null, 'numbers must be JSON numbers');
select throws_ok($$select * from public.admin_order_create((select p || '{"loai_truc":"moi"}' from t16_payload))$$,
  '22023', null, 'new axis needs its fields');
select lives_ok($$insert into t16_job select 'web1', job_id from public.admin_order_create((select p from t16_payload))$$,
  'admin creates an order');
select lives_ok($$insert into t16_job select 'web2', job_id from public.admin_order_create((select p || jsonb_build_object(
    'ten_hang', 'Băng keo web trục', 'loai_truc', 'moi', 'ten_truc', 'Trục 76', 'truc_so_luong', 2,
    'truc_gia_goc', 150000, 'truc_gia_ban', 200000, 'truc_vat_percent', 8, 'truc_hoa_hong', 5) from t16_payload))$$,
  'admin creates an order with a new axis');
select pg_temp.logout();

-- Reference numbers from electron/js/orderMath.js calculatePrintedTape with the same inputs.
select is(
  (select row(o.don_gia_goc::numeric(14, 4), o.thanh_tien_goc, o.thanh_tien_ban, o.loi_nhuan, o.tien_hoa_hong,
              o.tien_ship, o.loi_nhuan_rong, o.vat, o.vat_percent, o.tien_coc, o.cong_no_khach, o.cong_no_ncc)::text
     from public.bang_keo_in_orders o join public.production_jobs j on j.order_id = o.id
    where j.id = (select id from t16_job where k = 'web1')),
  row(37037.0370::numeric(14, 4), 4444444::numeric, 6000000::numeric, 1555556::numeric, 155556::numeric,
      30000::numeric, 1370000::numeric, 480000::numeric, 8::numeric, 500000::numeric, 5980000::numeric,
      4444444::numeric)::text,
  'order money matches orderMath.calculatePrintedTape');
select is(
  (select row(o.loai_truc::text, o.truc_thanh_tien_goc, o.truc_thanh_tien_ban, o.truc_loi_nhuan, o.truc_tien_hoa_hong,
              o.truc_loi_nhuan_rong, o.truc_vat, o.cong_no_khach, o.cong_no_ncc)::text
     from public.bang_keo_in_orders o join public.production_jobs j on j.order_id = o.id
    where j.id = (select id from t16_job where k = 'web2')),
  row('moi', 300000::numeric, 400000::numeric, 100000::numeric, 5000::numeric, 95000::numeric, 32000::numeric,
      6412000::numeric, 4744444::numeric)::text,
  'axis money matches orderMath (outstanding 6 412 000)');
select is(
  (select row(j.step, j.workshop_user_id, j.lead_id, l.changed_by, l.note = 'Đơn mới từ web')::text
     from public.production_jobs j join public.production_step_log l on l.job_id = j.id
    where j.id = (select id from t16_job where k = 'web1')),
  row('cho_san_xuat'::public.production_step, '00000000-0000-0000-0000-00000000a006'::uuid, null::uuid,
      '00000000-0000-0000-0000-00000000a001'::uuid, true)::text,
  'web order gets a job through the trigger, assigned as requested');

select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select is(
  (select order_name from public.workshop_jobs() where job_id = (select id from t16_job where k = 'web1')),
  'Băng keo web', 'workshop sees the web order by name');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is((select count(*)::int from public.admin_orders_list('{"q":"keo web"}')), 2, 'list: search by name');
select is((select count(*)::int from public.admin_orders_list('{"q":"0911222333","step":"cho_san_xuat"}')), 2,
  'list: search by phone + step filter');
select is((select count(*)::int from public.admin_orders_list('{"q":"BG-BK"}')), 0, 'list: quotes are excluded');
select is((select max(total_count)::int from public.admin_orders_list('{"q":"web","limit":1}')), 2,
  'list: total_count ignores the page size');
select is(
  (select row(tong_tien, loi_nhuan_rong, step)::text from public.admin_orders_list('{"q":"trục"}')),
  row(6912000::numeric, 1465000::numeric, 'cho_san_xuat'::public.production_step)::text,
  'list: total incl. axis + VAT, net profit incl. axis');
select throws_ok($$select * from public.admin_orders_list('{"step":"dang_bay"}')$$, '22023', null, 'list: unknown step');
select is(
  (select public.admin_order_get(j.order_id) #>> '{order,thanh_tien_goc}'
     from public.production_jobs j where j.id = (select id from t16_job where k = 'web1')),
  '4444444', 'get: full order row for admin');
select is(
  (select jsonb_array_length(public.admin_order_get('BK-T16-001') -> 'delivery_notes')), 2,
  'get: delivery notes of the job');
select throws_ok($$select public.admin_order_get('NOPE')$$, 'P0002', null, 'get: unknown order');
select pg_temp.logout();

-- Historic bulk loads opt out; a deleted lead order frees its id --------------------------------
select lives_ok($$
  set local role electron_app;
  set local app.production_sync = 'off';
  insert into public.bang_keo_in_orders (id, ngay_du_kien, ten_hang, is_quote, da_giao)
  values ('BK-T16-L1', current_date, 'Đơn lịch sử', false, false);
  update public.bang_keo_in_orders set da_giao = true where id = 'BK-T16-L1';
  set local app.production_sync = '';
  reset role
$$, 'electron_app bulk-loads a historic order with app.production_sync = off');
select is((select count(*)::int from public.production_jobs where order_id = 'BK-T16-L1'), 0,
  'opted-out insert / da_giao tick creates no job and no log');

update public.bang_keo_in_orders set da_giao = false where id = 'BK-T16-L1';
insert into public.leads (id, customer_name, phone, company, quantity, status)
values ('00000000-0000-0000-0000-0000000c1602', 'Lead T16b', '0900001602', 'Co T16b', 100, 'production');
insert into public.production_jobs (lead_id, order_id, step)
values ('00000000-0000-0000-0000-0000000c1602', 'BK-T16-L1', 'dang_san_xuat');
insert into t16_job select 'lead2', id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c1602';

select lives_ok($$
  set local role electron_app;
  delete from public.bang_keo_in_orders where id = 'BK-T16-L1';
  insert into public.bang_keo_in_orders (id, ngay_du_kien, ten_hang, is_quote, da_giao)
  values ('BK-T16-L1', current_date, 'Đơn khác cùng mã', false, false);
  update public.bang_keo_in_orders set da_giao = true where id = 'BK-T16-L1';
  reset role
$$, 'electron_app deletes a lead order, reuses its id and ticks da_giao');
select is(
  (select row(j.step, j.order_id, l.note)::text from public.production_jobs j
     join public.production_step_log l on l.job_id = j.id
    where j.id = (select id from t16_job where k = 'lead2') order by l.id desc limit 1),
  row('huy'::public.production_step, null::text, 'Đơn đã xóa trong app')::text,
  'deleting the order cancels and detaches the open lead job');
select is((select status from public.leads where id = '00000000-0000-0000-0000-0000000c1602'),
  'cancelled'::public.lead_status, 'its lead is cancelled');
select is(
  (select row(count(*), bool_and(lead_id is null), min(step::text))::text
     from public.production_jobs where order_id = 'BK-T16-L1'),
  row(1::bigint, true, 'da_giao')::text, 'the reused id gets its own job; the da_giao tick closes only that one');

select lives_ok(format($$
  set local role electron_app;
  delete from public.bang_keo_in_orders where id = %L;
  reset role
$$, (select production_order_id from public.leads where id = '00000000-0000-0000-0000-0000000c1601')),
  'electron_app deletes a delivered lead order');
select is(
  (select row(step, order_id)::text from public.production_jobs where id = (select id from t16_job where k = 'lead')),
  row('da_giao'::public.production_step, null::text)::text, 'a delivered lead job is detached, step kept');

select * from finish();
rollback;
