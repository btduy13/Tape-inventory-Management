-- Regression tests for migration 0019_production_schema_compat.
-- Run: npm run db:test   (from web/)
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Stub matches the production column shapes the hand-off depends on -------------------------
select col_not_null('public', 'bang_keo_in_orders', 'ngay_du_kien',
  'bang_keo_in_orders.ngay_du_kien is NOT NULL (as in production)');
select col_type_is('public', 'bang_keo_in_orders', 'ngay_du_kien', 'date',
  'bang_keo_in_orders.ngay_du_kien is date');
select col_type_is('public', 'bang_keo_in_orders', 'thoi_gian', 'timestamp without time zone',
  'bang_keo_in_orders.thoi_gian is timestamp without time zone (as in production)');

-- No public table without RLS ------------------------------------------------------------------
select is(
  (select array_agg(c.relname::text order by c.relname) from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  null::text[], 'every public table has RLS enabled');

-- Hand-off fills every NOT NULL column (run as the owner = server code) ------------------------
insert into public.leads (id, customer_name, phone, company, quantity, status)
values ('00000000-0000-0000-0000-0000000c0019', 'Compat Test', '0900000019',
        repeat('C', 200), 100, 'new');
insert into public.designs (lead_id, width_mm, length_m, thickness_mic, colors, print_text)
values ('00000000-0000-0000-0000-0000000c0019', 48, 100, 50, '{red,white}', 'COMPAT');
insert into public.quotes (id, lead_id, status)
values ('00000000-0000-0000-0000-0000000d0019', '00000000-0000-0000-0000-0000000c0019', 'draft');
insert into public.quote_lines (quote_id, description, quantity, unit_price)
values ('00000000-0000-0000-0000-0000000d0019', 'compat line', 100, 1000);
update public.quotes set status = 'sent', sent_at = now() where id = '00000000-0000-0000-0000-0000000d0019';
update public.quotes set status = 'accepted', responded_at = now() where id = '00000000-0000-0000-0000-0000000d0019';
update public.leads set status = 'accepted' where id = '00000000-0000-0000-0000-0000000c0019';

select lives_ok(
  $$select public.convert_lead_to_production('00000000-0000-0000-0000-0000000c0019',
      ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 7))$$,
  'convert_lead_to_production succeeds');

select is(
  (select o.ngay_du_kien from public.bang_keo_in_orders o
     join public.leads l on l.production_order_id = o.id
    where l.id = '00000000-0000-0000-0000-0000000c0019'),
  ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 7),
  'ngay_du_kien = due date passed to the hand-off (Vietnam date)');
select ok(
  (select abs(extract(epoch from (o.thoi_gian - (now() at time zone 'Asia/Ho_Chi_Minh')))) < 60
     from public.bang_keo_in_orders o
     join public.leads l on l.production_order_id = o.id
    where l.id = '00000000-0000-0000-0000-0000000c0019'),
  'thoi_gian is Vietnam wall-clock time, like rows written by the Electron app');
select ok(
  (select char_length(o.ten_khach_hang) <= 255 from public.bang_keo_in_orders o
     join public.leads l on l.production_order_id = o.id
    where l.id = '00000000-0000-0000-0000-0000000c0019'),
  'ten_khach_hang fits production varchar(255)');
select is(
  (select o.thanh_tien_ban::numeric from public.bang_keo_in_orders o
     join public.leads l on l.production_order_id = o.id
    where l.id = '00000000-0000-0000-0000-0000000c0019'),
  100000::numeric, 'thanh_tien_ban = accepted quote subtotal');

select * from finish();
rollback;
