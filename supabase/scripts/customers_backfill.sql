-- customers_backfill.sql
-- Links old orders (4 order tables) and leads to customers. Functions: migration 0028_customers.
-- Run as `postgres`. Production: only after the owner has signed off on the dry-run output.
--
--   Dry run (changes only the pending rows of customer_match_candidates):
--     psql "<connection>" -f supabase/scripts/customers_backfill.sql
--   Apply (dry run again, then create customers and link the 'auto' rows; every link is logged
--   in customer_backfill_log):
--     psql "<connection>" -v apply=1 -f supabase/scripts/customers_backfill.sql
--
-- Rules (customer_backfill_dry_run): exact normalized phone = auto; everything else = review,
-- rows without a phone included (a name alone such as 'Chị Lan' is not proof of one customer; the
-- queue suggests the customers with that name). Phone-less rows with the same normalized name form one
-- group (name:<norm>) that the admin links / skips in one decision. Review rows wait in /admin/khach-hang/gop
-- (admin_customer_review_list / admin_customer_review_resolve).
-- Undo: update <source_table> set customer_id = null where id = source_id, for the log rows;
-- then delete the customers with customer_created = true that have no other links.

\set ON_ERROR_STOP 1
begin;

\echo '== Dry run: pending candidates per decision / reason'
select * from public.customer_backfill_dry_run();

\echo '== Auto groups (customer to create or reuse, rows)'
select group_key, min(customer_id::text) as existing_customer, count(*) as rows,
       string_agg(distinct ten_khach_hang, ' | ') as names
  from public.customer_match_candidates
 where status = 'pending' and decision = 'auto'
 group by group_key
 order by count(*) desc, group_key;

\echo '== Review groups by name (one admin decision each)'
select group_key, count(*) as rows, string_agg(distinct ten_khach_hang, ' | ') as names
  from public.customer_match_candidates
 where status = 'pending' and decision = 'review' and group_key like 'name:%'
 group by group_key
 order by count(*) desc, group_key;

\echo '== Review rows'
select source_table, source_id, ten_khach_hang, sdt_khach_hang, reason
  from public.customer_match_candidates
 where status = 'pending' and decision = 'review'
 order by reason, thoi_gian;

\if :{?apply}
\echo '== Apply'
select * from public.customer_backfill_apply();
\endif

commit;
