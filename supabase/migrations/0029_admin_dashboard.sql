-- 0029_admin_dashboard: one admin-only read for the /admin overview (WP9).
-- Mirrors electron/db/readActions.js dashboard.monthMetrics + dashboard.attention, over the 4 order
-- tables (Thank you included), plus workshop pipeline and lead counts.
--   month: orders / revenue / profit of real orders (no quotes) since the 1st of this month (VN).
--     revenue = thanh_tien_ban (+ truc_thanh_tien_ban when loai_truc = 'moi'), no VAT, as in the app.
--     profit  = loi_nhuan_rong (+ truc_loi_nhuan_rong when loai_truc = 'moi').
--   open_debt / supplier_debt: unsettled real orders. overdue / due_soon (today..today+3): undelivered.
--   pending_quotes, not_in_workshop (real undelivered BKI orders with no job),
--   steps: open production_jobs per step, new_leads: leads created this month.
-- Tests: supabase/tests/rls/19_admin_dashboard.test.sql

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_month date := date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_out   jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  with o as (
    select b.thoi_gian::timestamp as thoi_gian, b.ngay_du_kien::date as ngay_du_kien,
           coalesce(b.thanh_tien_ban, 0)
             + case when b.loai_truc = 'moi' then coalesce(b.truc_thanh_tien_ban, 0) else 0 end as revenue,
           coalesce(b.loi_nhuan_rong, 0)
             + case when b.loai_truc = 'moi' then coalesce(b.truc_loi_nhuan_rong, 0) else 0 end as profit,
           coalesce(b.cong_no_khach, 0) as cong_no_khach, coalesce(b.cong_no_ncc, 0) as cong_no_ncc,
           coalesce(b.da_giao, false) as da_giao, coalesce(b.da_tat_toan, false) as da_tat_toan,
           coalesce(b.is_quote, false) as is_quote
      from public.bang_keo_in_orders b
    union all
    select b.thoi_gian, b.ngay_du_kien, coalesce(b.thanh_tien_ban, 0), coalesce(b.loi_nhuan_rong, 0),
           coalesce(b.cong_no_khach, 0), coalesce(b.cong_no_ncc, 0), coalesce(b.da_giao, false),
           coalesce(b.da_tat_toan, false), coalesce(b.is_quote, false)
      from public.bang_keo_orders b
    union all
    select b.thoi_gian, b.ngay_du_kien, coalesce(b.thanh_tien_ban, 0), coalesce(b.loi_nhuan_rong, 0),
           coalesce(b.cong_no_khach, 0), coalesce(b.cong_no_ncc, 0), coalesce(b.da_giao, false),
           coalesce(b.da_tat_toan, false), coalesce(b.is_quote, false)
      from public.truc_in_orders b
    union all
    select b.thoi_gian, b.ngay_du_kien, b.thanh_tien_ban, b.loi_nhuan_rong, b.cong_no_khach, b.cong_no_ncc,
           b.da_giao, b.da_tat_toan, b.is_quote
      from public.thank_you_orders b
  )
  select jsonb_build_object(
           'month_start',    v_month,
           'orders',         count(*) filter (where not is_quote and thoi_gian >= v_month),
           'revenue',        coalesce(sum(revenue) filter (where not is_quote and thoi_gian >= v_month), 0),
           'profit',         coalesce(sum(profit) filter (where not is_quote and thoi_gian >= v_month), 0),
           'open_debt',      coalesce(sum(cong_no_khach) filter (where not is_quote and not da_tat_toan), 0),
           'supplier_debt',  coalesce(sum(cong_no_ncc) filter (where not is_quote and not da_tat_toan), 0),
           'overdue',        count(*) filter (where not is_quote and not da_giao and ngay_du_kien < v_today),
           'due_soon',       count(*) filter (where not is_quote and not da_giao
                                              and ngay_du_kien between v_today and v_today + 3),
           'pending_quotes', count(*) filter (where is_quote))
    into v_out
    from o;

  return v_out || jsonb_build_object(
    'not_in_workshop',
      (select count(*) from public.bang_keo_in_orders b
        where not coalesce(b.is_quote, false) and not coalesce(b.da_giao, false)
          and not exists (select 1 from public.production_jobs j where j.order_id = b.id)),
    'steps',
      (select coalesce(jsonb_object_agg(s.step, s.n), '{}'::jsonb)
         from (select j.step::text as step, count(*) as n from public.production_jobs j
                where j.step not in ('da_giao', 'huy') group by j.step) s),
    'new_leads',
      (select count(*) from public.leads l
        where l.created_at >= (v_month::timestamp at time zone 'Asia/Ho_Chi_Minh')));
end;
$$;

revoke all on function public.admin_dashboard() from public, anon;
grant execute on function public.admin_dashboard() to authenticated;
