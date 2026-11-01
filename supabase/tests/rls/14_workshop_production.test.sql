-- Regression tests for migrations 0020_workshop_role + 0021_production_jobs.
-- Requires seed.sql (workshop a006, workshop2 a007). Run: npm run db:test   (from web/)
begin;
create extension if not exists pgtap with schema extensions;
select plan(91);

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
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
create function pg_temp.vn_today() returns date language sql as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date
$$;

create function pg_temp.update_lead_status(p_lead uuid) returns int language plpgsql as $$
declare n int;
begin
  update public.leads set status = 'production' where id = p_lead;
  get diagnostics n = row_count;
  return n;
end $$;

-- Accepted lead with design and accepted quote (8% VAT) -- built as the owner (server code).
create function pg_temp.accepted_lead(p_lead uuid, p_quote uuid) returns void language plpgsql as $$
begin
  insert into public.leads (id, customer_name, phone, email, company, quantity, customer_note, status)
  values (p_lead, 'Workshop Test', '0900000020', 'secret@example.com', 'Secret Co', 100, 'private note', 'new');
  insert into public.designs (lead_id, width_mm, length_m, thickness_mic, colors, print_text, design_json, preview_path)
  values (p_lead, 48, 100, 50, '{#c8a165,#d32f2f}', 'XUONG', '{"version":1}', p_lead || '/preview.png');
  insert into public.quotes (id, lead_id, status, vat_percent) values (p_quote, p_lead, 'draft', 8);
  insert into public.quote_lines (quote_id, description, quantity, unit_price)
  values (p_quote, 'tape', 100, 1000);
  update public.quotes set status = 'sent', sent_at = now() where id = p_quote;
  update public.quotes set status = 'accepted', responded_at = now() where id = p_quote;
  update public.leads set status = 'accepted' where id = p_lead;
end $$;

-- The test runner (postgres) holds ADMIN on electron_app but not SET; add it for this transaction.
do $grant$ begin
  if current_setting('server_version_num')::int >= 160000 then
    execute 'grant electron_app to postgres with set true, inherit false';
  else
    execute 'grant electron_app to postgres';
  end if;
end $grant$;

-- ids
--   admin a001, manager a002, staff a003, workshop a006, workshop2 a007
--   L1 c0021 (workshop converts), L2 c0022 (admin converts), L3 c0023 (storage / revocation)
select pg_temp.accepted_lead('00000000-0000-0000-0000-0000000c0021', '00000000-0000-0000-0000-0000000d0021');
select pg_temp.accepted_lead('00000000-0000-0000-0000-0000000c0022', '00000000-0000-0000-0000-0000000d0022');
select pg_temp.accepted_lead('00000000-0000-0000-0000-0000000c0023', '00000000-0000-0000-0000-0000000d0023');

-- Schema ----------------------------------------------------------------------------------------
select ok('workshop' = any (enum_range(null::public.app_role)::text[]), 'app_role has workshop');
select is(enum_range(null::public.production_step)::text[],
  array['cho_san_xuat','dang_in','dang_cat_cuon','dong_goi','san_sang_giao','da_giao','huy'],
  'production steps in order');
select ok(not has_table_privilege('authenticated', 'public.production_jobs', 'INSERT')
      and not has_table_privilege('authenticated', 'public.production_jobs', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.production_jobs', 'DELETE')
      and not has_table_privilege('authenticated', 'public.production_step_log', 'INSERT'),
  'authenticated has no write grant on production tables');
select ok(not has_table_privilege('anon', 'public.production_jobs', 'SELECT')
      and not has_table_privilege('anon', 'public.production_step_log', 'SELECT'),
  'anon has no read grant on production tables');
select ok(not has_function_privilege('anon', 'public.workshop_jobs(uuid)', 'EXECUTE')
      and not has_function_privilege('anon', 'public.advance_production_step(uuid,public.production_step,text)', 'EXECUTE')
      and not has_function_privilege('anon', 'public.convert_lead_to_production(uuid,date,text,uuid)', 'EXECUTE')
      and not has_function_privilege('anon', 'public.assign_production_job(uuid,uuid)', 'EXECUTE'),
  'anon cannot execute production RPCs');
select ok(not has_function_privilege('authenticated', 'public.production_sync_lead(uuid,public.production_step)', 'EXECUTE')
      and not has_function_privilege('authenticated', 'public.is_job_handoff(public.leads,public.leads)', 'EXECUTE')
      and not has_function_privilege('authenticated', 'public.production_step_next(public.production_step)', 'EXECUTE'),
  'internal production helpers are not executable by API roles');
select ok(to_regprocedure('public.convert_lead_to_production(uuid)') is null,
  'old one-argument convert_lead_to_production is dropped');
select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
    where oid = 'public.workshop_jobs(uuid)'::regprocedure),
  'workshop_jobs is SECURITY DEFINER with an empty search_path');

-- Column exposure: the workshop RPC returns production specs only.
select is(
  (select array_agg(a order by a) from unnest(string_to_array(
     regexp_replace(pg_get_function_result('public.workshop_jobs(uuid)'::regprocedure), '^TABLE\((.*)\)$', '\1'),
     ', ')) a
   where a ~* '(price|gia|vat|phone|email|company|customer|thanh_tien|cong_no|note_kh|subtotal|total)'),
  null::text[], 'workshop_jobs exposes no price / VAT / contact / customer columns');
select ok(
  (select bool_and(c.column_name not in ('subtotal', 'vat_amount', 'total', 'phone', 'email', 'company',
                                          'customer_name', 'customer_note', 'unit_price'))
     from information_schema.columns c
    where c.table_schema = 'public' and c.table_name in ('production_jobs', 'production_step_log')),
  'production tables hold no price / contact columns');

-- Role matrix before assignment ---------------------------------------------------------------
select pg_temp.as_anon();
select throws_ok($$select count(*) from public.production_jobs$$, '42501', null, 'anon cannot read production_jobs');
select throws_ok($$select * from public.workshop_jobs()$$, '42501', null, 'anon cannot call workshop_jobs');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a003');  -- staff
select throws_ok($$select * from public.workshop_jobs()$$, '42501', null, 'staff cannot call workshop_jobs');
select throws_ok(
  $$select public.assign_production_job('00000000-0000-0000-0000-0000000c0021', '00000000-0000-0000-0000-00000000a006')$$,
  '42501', null, 'staff cannot assign production jobs');
select throws_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0021', pg_temp.vn_today() + 7)$$,
  '42501', null, 'staff cannot convert');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a002');  -- manager
select throws_ok($$select * from public.workshop_jobs()$$, '42501', null, 'manager cannot call workshop_jobs');
select throws_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0021', pg_temp.vn_today() + 7)$$,
  '42501', null, 'manager cannot convert');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a006');  -- workshop
select throws_ok(
  $$select public.assign_production_job('00000000-0000-0000-0000-0000000c0021', '00000000-0000-0000-0000-00000000a006')$$,
  '42501', null, 'workshop cannot assign itself');
select throws_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0021', pg_temp.vn_today() + 7)$$,
  '42501', null, 'workshop cannot convert a lead that is not assigned to it');
select is((select count(*)::int from public.workshop_jobs()), 0, 'workshop sees no jobs before assignment');
select pg_temp.logout();

-- Admin assignment -----------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select throws_ok(
  $$select public.assign_production_job('00000000-0000-0000-0000-0000000c0021', '00000000-0000-0000-0000-00000000a003')$$,
  '22023', null, 'assignee must be a workshop user (staff rejected)');
select throws_ok(
  $$select public.assign_production_job('00000000-0000-0000-0000-0000000b0003', '00000000-0000-0000-0000-00000000a006')$$,
  '22023', null, 'only accepted / production leads get a production job');
select lives_ok(
  $$select public.assign_production_job('00000000-0000-0000-0000-0000000c0021', '00000000-0000-0000-0000-00000000a006')$$,
  'admin assigns L1 to workshop');
select lives_ok(
  $$select public.assign_production_job('00000000-0000-0000-0000-0000000c0023', '00000000-0000-0000-0000-00000000a006')$$,
  'admin assigns L3 to workshop');
select throws_ok(
  $$select public.assign_lead('00000000-0000-0000-0000-0000000c0021', '00000000-0000-0000-0000-00000000a006')$$,
  '22023', null, 'workshop users cannot be lead (sales) assignees');
select pg_temp.logout();

-- Workshop view: own jobs, specs only, nothing else -----------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select is((select count(*)::int from public.production_jobs), 2, 'workshop reads its 2 jobs (RLS)');
select is((select count(*)::int from public.workshop_jobs()), 2, 'workshop_jobs returns its 2 jobs');
select is(
  (select row(quantity, width_mm, length_m, thickness_mic, colors, print_text, preview_path)::text
     from public.workshop_jobs() where lead_id = '00000000-0000-0000-0000-0000000c0021'),
  row(100, 48.0::numeric, 100.0::numeric, 50.0::numeric, '{#c8a165,#d32f2f}'::text[], 'XUONG',
      '00000000-0000-0000-0000-0000000c0021/preview.png')::text,
  'workshop_jobs returns the production specs');
select is((select count(*)::int from public.leads), 0, 'workshop reads no leads');
select is((select count(*)::int from public.designs), 0, 'workshop reads no designs directly');
select is((select count(*)::int from public.quotes), 0, 'workshop reads no quotes');
select is((select count(*)::int from public.quote_lines), 0, 'workshop reads no quote lines');
select is((select count(*)::int from public.lead_notes), 0, 'workshop reads no lead notes');
select is((select count(*)::int from public.profiles), 1, 'workshop reads only its own profile');
select throws_ok($$select count(*) from public.bang_keo_in_orders$$, '42501', null,
  'workshop cannot read the legacy order table');
select throws_ok(
  $$update public.production_jobs set step = 'da_giao' where lead_id = '00000000-0000-0000-0000-0000000c0021'$$,
  '42501', null, 'workshop cannot update production_jobs directly');
select is(pg_temp.update_lead_status('00000000-0000-0000-0000-0000000c0021'), 0,
  'workshop cannot update the lead directly (RLS)');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a007');  -- workshop2
select is((select count(*)::int from public.production_jobs), 0, 'workshop2 sees no jobs of workshop');
select is((select count(*)::int from public.workshop_jobs()), 0, 'workshop2 workshop_jobs is empty');
select throws_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0021', pg_temp.vn_today() + 7)$$,
  '42501', null, 'workshop2 cannot convert workshop''s lead');
select pg_temp.logout();

-- Workshop converts (due date rules) ---------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select throws_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0021', pg_temp.vn_today() - 1)$$,
  '22023', null, 'due date in the past is rejected');
select throws_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0021', null)$$,
  '22023', null, 'due date is required');
select throws_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0021', pg_temp.vn_today() + 3, null,
      '00000000-0000-0000-0000-00000000a007')$$,
  '42501', null, 'workshop cannot choose the workshop user');
select lives_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0021', pg_temp.vn_today() + 3, 'In 2 màu')$$,
  'assigned workshop converts with a due date >= today');
select is(
  public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0021', pg_temp.vn_today() + 9),
  (select order_id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021'),
  'convert is idempotent (returns the existing order id)');
select pg_temp.logout();

select is(
  (select row(l.status, l.production_order_id = j.order_id, j.converted_by, j.step, j.production_note)::text
     from public.leads l join public.production_jobs j on j.lead_id = l.id
    where l.id = '00000000-0000-0000-0000-0000000c0021'),
  row('production'::public.lead_status, true, '00000000-0000-0000-0000-00000000a006'::uuid,
      'cho_san_xuat'::public.production_step, 'In 2 màu')::text,
  'lead is in production, linked to the job, converted by workshop');
select is(
  (select changed_by from public.lead_status_log
    where lead_id = '00000000-0000-0000-0000-0000000c0021' and to_status = 'production'),
  '00000000-0000-0000-0000-00000000a006'::uuid, 'lead status log records the workshop user');
select is(
  (select o.ngay_du_kien from public.bang_keo_in_orders o join public.production_jobs j on j.order_id = o.id
    where j.lead_id = '00000000-0000-0000-0000-0000000c0021'),
  pg_temp.vn_today() + 3, 'ngay_du_kien = chosen due date');

-- VAT mapping: same numbers as the accepted quote and the Electron debt formula.
select is(
  (select row(o.thanh_tien_ban, o.vat, o.vat_percent, o.cong_no_khach, o.da_giao, o.da_tat_toan, o.is_quote)::text
     from public.bang_keo_in_orders o join public.production_jobs j on j.order_id = o.id
    where j.lead_id = '00000000-0000-0000-0000-0000000c0021'),
  row(100000.00::numeric, 8000.00::numeric, 8.00::numeric, 108000.00::numeric, false, false, false)::text,
  'order carries subtotal, VAT amount and VAT % of the accepted quote; debt includes VAT');
select is(
  (select o.cong_no_khach from public.bang_keo_in_orders o join public.production_jobs j on j.order_id = o.id
    where j.lead_id = '00000000-0000-0000-0000-0000000c0021'),
  (select greatest(coalesce(o.thanh_tien_ban, 0) + coalesce(o.vat, 0) - coalesce(o.tien_coc, 0), 0)
     from public.bang_keo_in_orders o join public.production_jobs j on j.order_id = o.id
    where j.lead_id = '00000000-0000-0000-0000-0000000c0021'),
  'cong_no_khach matches orderMath.customerDebtSqlExpression (no axis)');
select is(
  (select q.total from public.quotes q where q.id = '00000000-0000-0000-0000-0000000d0021'),
  (select o.thanh_tien_ban + o.vat from public.bang_keo_in_orders o join public.production_jobs j on j.order_id = o.id
    where j.lead_id = '00000000-0000-0000-0000-0000000c0021'),
  'order total (sale + VAT) equals the accepted quote total');

-- Admin converts L2 and picks workshop2 in the same call.
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select throws_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0022', pg_temp.vn_today() - 1)$$,
  '22023', null, 'admin is also bound by the due date rule');
select lives_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0022', pg_temp.vn_today(), null,
      '00000000-0000-0000-0000-00000000a007')$$,
  'admin converts with due date today and assigns workshop2');
select pg_temp.logout();
select is(
  (select workshop_user_id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0022'),
  '00000000-0000-0000-0000-00000000a007'::uuid, 'job created for workshop2');

-- Step transitions -----------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select throws_ok(
  $$select public.advance_production_step((select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021'), 'dang_cat_cuon')$$,
  '42501', null, 'workshop cannot skip a step');
select throws_ok(
  $$select public.advance_production_step((select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021'), 'huy')$$,
  '42501', null, 'workshop cannot cancel');
select throws_ok(
  $$select public.advance_production_step((select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0023'), 'dang_in')$$,
  '22023', null, 'no step change before conversion');
select lives_ok(
  $$select public.advance_production_step((select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021'), 'dang_in', 'Bắt đầu in')$$,
  'workshop moves to the next step with a note');
select pg_temp.logout();

select is(
  (select row(from_step, to_step, changed_by, changed_by_name, note)::text from public.production_step_log
    where job_id = (select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021')
      and to_step = 'dang_in'),
  row('cho_san_xuat'::public.production_step, 'dang_in'::public.production_step,
      '00000000-0000-0000-0000-00000000a006'::uuid, 'Xưởng 1', 'Bắt đầu in')::text,
  'step change is logged with who and note');

select pg_temp.login('00000000-0000-0000-0000-00000000a007');
select throws_ok(
  $$select public.advance_production_step('00000000-0000-0000-0000-000000000000'::uuid, 'dang_in')$$,
  'P0002', null, 'unknown job');
select throws_ok(
  format($$select public.advance_production_step(%L, 'dang_cat_cuon')$$,
         (select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021')),
  'P0002', null, 'workshop2 cannot change workshop''s job');
select is((select count(*)::int from public.production_step_log
            where job_id = (select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0022')), 1,
  'workshop2 reads the log of its own job');
select pg_temp.logout();

select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select lives_ok($$
  select public.advance_production_step((select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021'), 'dang_cat_cuon');
  select public.advance_production_step((select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021'), 'dong_goi');
$$, 'workshop: dang_cat_cuon, dong_goi');
select is((select count(*)::int from public.production_step_log), 4, 'workshop reads only its own job logs (4)');
select pg_temp.logout();
select is((select status from public.leads where id = '00000000-0000-0000-0000-0000000c0021'),
  'production'::public.lead_status, 'lead stays in production while producing');

select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select lives_ok(
  $$select public.advance_production_step((select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021'), 'san_sang_giao')$$,
  'workshop: san_sang_giao');
select pg_temp.logout();
select is((select status from public.leads where id = '00000000-0000-0000-0000-0000000c0021'),
  'shipping'::public.lead_status, 'san_sang_giao -> lead shipping');

select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select lives_ok(
  $$select public.advance_production_step((select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021'), 'da_giao')$$,
  'workshop: da_giao');
select is((select desktop_delivered from public.workshop_jobs()
            where lead_id = '00000000-0000-0000-0000-0000000c0021'), true, 'workshop_jobs shows the desktop flag');
select throws_ok(
  $$select public.advance_production_step((select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021'), 'dong_goi')$$,
  '42501', null, 'workshop cannot move a delivered job back');
select pg_temp.logout();
select is(
  (select row(l.status, o.da_giao)::text from public.leads l join public.bang_keo_in_orders o on o.id = l.production_order_id
    where l.id = '00000000-0000-0000-0000-0000000c0021'),
  row('done'::public.lead_status, true)::text, 'da_giao -> lead done and Electron da_giao = true');

-- Admin: any step, cancel ---------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$select public.advance_production_step((select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021'), 'dong_goi', 'giao nhầm')$$,
  'admin moves a delivered job back');
select lives_ok(
  $$select public.advance_production_step((select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0022'), 'huy')$$,
  'admin cancels a job');
select is((select count(*)::int from public.workshop_jobs()), 3, 'admin workshop_jobs sees all jobs');
select pg_temp.logout();
select is(
  (select row(l.status, o.da_giao)::text from public.leads l join public.bang_keo_in_orders o on o.id = l.production_order_id
    where l.id = '00000000-0000-0000-0000-0000000c0021'),
  row('done'::public.lead_status, false)::text, 'moving back clears Electron da_giao; lead never moves backwards');
select is((select status from public.leads where id = '00000000-0000-0000-0000-0000000c0022'),
  'cancelled'::public.lead_status, 'huy -> lead cancelled');

-- Storage: design files of assigned jobs only, never quote PDFs ----------------------------------
insert into storage.objects (bucket_id, name) values
  ('previews', '00000000-0000-0000-0000-0000000c0023/preview.png'),
  ('quotes',   '00000000-0000-0000-0000-0000000c0023/q.pdf');
select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-0000000c0023/%' and bucket_id = 'previews'),
  1, 'workshop reads the design preview of its job');
select is((select count(*)::int from storage.objects where bucket_id = 'quotes' and name like '00000000-0000-0000-0000-0000000c0023/%'),
  0, 'workshop cannot read quote PDFs');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-00000000a007');
select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-0000000c0023/%'),
  0, 'workshop2 cannot read another workshop''s design files');
select pg_temp.logout();

-- Revocation: unassign / deactivate -> access gone immediately --------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select lives_ok(
  $$select public.assign_production_job('00000000-0000-0000-0000-0000000c0023', null)$$, 'admin unassigns L3');
select pg_temp.logout();
select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select is((select count(*)::int from public.workshop_jobs() where lead_id = '00000000-0000-0000-0000-0000000c0023'), 0,
  'unassigned job disappears from workshop_jobs');
select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-0000000c0023/%'), 0,
  'unassigned workshop loses the design files');
select throws_ok(
  format($$select public.advance_production_step(%L, 'dang_in')$$,
         (select id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0023')),
  'P0002', null, 'workshop cannot change a job that has no workshop user');
select throws_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0023', pg_temp.vn_today() + 7)$$,
  '42501', null, 'workshop cannot convert a lead whose job was unassigned');
select pg_temp.logout();

update public.profiles set is_active = false where id = '00000000-0000-0000-0000-00000000a006';
select pg_temp.login('00000000-0000-0000-0000-00000000a006');
select is((select count(*)::int from public.production_jobs), 0, 'deactivated workshop reads no jobs');
select throws_ok($$select * from public.workshop_jobs()$$, '42501', null, 'deactivated workshop cannot call workshop_jobs');
select pg_temp.logout();
update public.profiles set is_active = true where id = '00000000-0000-0000-0000-00000000a006';

-- Electron writes keep working (no trigger was added on the legacy table) ---------------------
select is(
  (select count(*)::int from pg_trigger
    where tgrelid = 'public.bang_keo_in_orders'::regclass and not tgisinternal), 0,
  'migrations add no trigger to bang_keo_in_orders');
select lives_ok(
  format($$set local role electron_app;
           update public.bang_keo_in_orders set ngay_du_kien = ngay_du_kien + 1, da_giao = true, tien_coc = 5000 where id = %L;
           insert into public.bang_keo_in_orders (id, ngay_du_kien, ten_hang, is_quote) values ('BK-TEST-ELECTRON', current_date, 'x', false);
           delete from public.bang_keo_in_orders where id = 'BK-TEST-ELECTRON';
           reset role$$,
         (select order_id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021')),
  'electron_app updates / inserts / deletes legacy orders, including web-created ones');
select throws_ok($$set local role electron_app; select count(*) from public.production_jobs$$, '42501', null,
  'electron_app has no access to production_jobs');
select lives_ok(
  format($$update public.bang_keo_in_orders set da_giao = false where id = %L$$,
         (select order_id from public.production_jobs where lead_id = '00000000-0000-0000-0000-0000000c0021')),
  'owner (postgres) still writes legacy orders');
select pg_temp.login('00000000-0000-0000-0000-00000000a001');
select is(
  (select due_date from public.workshop_jobs() where lead_id = '00000000-0000-0000-0000-0000000c0021'),
  pg_temp.vn_today() + 4, 'workshop_jobs reads the due date edited in the desktop app');
select pg_temp.logout();

select * from finish();
rollback;
