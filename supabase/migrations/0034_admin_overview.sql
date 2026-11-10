-- 0034_admin_overview: one read for the redesigned /admin overview (attention strip, 4 money KPIs,
-- workshop pipeline, 12-month chart, overdue + top debtor tables). Tests: supabase/tests/rls/24_admin_overview.test.sql
--
-- admin_overview(p_months int default 12) -> jsonb, gate orders.view (same as admin_orders_totals).
-- Orders come from admin_orders_filtered('{}', 'all') = real orders (no quotes) of the 4 tables.
--   revenue = thanh_tien_ban + new-axis truc_thanh_tien_ban (no VAT, as 0029 / the app),
--   profit  = loi_nhuan_rong (new axis included by admin_orders_filtered).
--   money   = has_perm('orders.money'). Without it profit and supplier debt (cost side) are null,
--             like admin_orders_totals; revenue and customer debt (sale side) stay.
--   attention: overdue / due_soon (today..today+3, undelivered), not_in_workshop (undelivered BKI
--     without a job), leads_new (new and unassigned), leads_consulting, leads_quoted. Leads follow
--     the leads_select policy: manager / admin see all, others only leads assigned to them.
--   kpi: this month vs last month (VN calendar). Debt is a balance with no history, so the
--     comparison uses debt still open on orders dated in each month (*_new / *_new_prev).
--   pipeline: undelivered BKI per step (none = not in the workshop yet).
--   months: p_months (1-36) calendar months ending this month, revenue per order type + profit.
--   overdue_list: 5 most overdue; top_debtors: 5 largest open customer debts, by typed name.

create or replace function public.admin_overview(p_months int default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_money  boolean := public.has_perm('orders.money');
  v_today  date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_month  date := date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_prev   date := (date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') - interval '1 month')::date;
  v_n      int := least(greatest(coalesce(p_months, 12), 1), 36);
  v_all    boolean := public.is_manager_or_admin();
  v_uid    uuid := auth.uid();
  v_out    jsonb;
begin
  if not public.has_perm('orders.view') then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  -- One statement: admin_orders_filtered runs once (materialized CTE), every part reads it.
  with f as materialized (
    select o.*, date_trunc('month', o.thoi_gian)::date as m,
           o.thanh_tien_ban + coalesce(o.truc_thanh_tien_ban, 0) as rev,
           o.type = 'bang_keo_in' and not o.da_giao as bki_open
      from public.admin_orders_filtered('{}'::jsonb, 'all') o
  )
  select jsonb_build_object(
    'money', v_money,
    'today', v_today,
    'month_start', v_month,
    'prev_month_start', v_prev,
    'attention', jsonb_build_object(
      'overdue',         count(*) filter (where not da_giao and ngay_du_kien < v_today),
      'due_soon',        count(*) filter (where not da_giao and ngay_du_kien between v_today and v_today + 3),
      'not_in_workshop', count(*) filter (where bki_open and job_id is null)),
    'kpi', jsonb_build_object(
      'revenue',           coalesce(sum(rev) filter (where m = v_month), 0),
      'revenue_prev',      coalesce(sum(rev) filter (where m = v_prev), 0),
      'profit',            case when v_money then coalesce(sum(loi_nhuan_rong) filter (where m = v_month), 0) end,
      'profit_prev',       case when v_money then coalesce(sum(loi_nhuan_rong) filter (where m = v_prev), 0) end,
      'customer_debt',     coalesce(sum(cong_no_khach) filter (where not da_tat_toan), 0),
      'customer_debt_new', coalesce(sum(cong_no_khach) filter (where not da_tat_toan and m = v_month), 0),
      'customer_debt_new_prev', coalesce(sum(cong_no_khach) filter (where not da_tat_toan and m = v_prev), 0),
      'supplier_debt',     case when v_money then coalesce(sum(cong_no_ncc) filter (where not da_tat_toan), 0) end,
      'supplier_debt_new', case when v_money then coalesce(sum(cong_no_ncc) filter (where not da_tat_toan and m = v_month), 0) end,
      'supplier_debt_new_prev', case when v_money then coalesce(sum(cong_no_ncc) filter (where not da_tat_toan and m = v_prev), 0) end),
    'pipeline', jsonb_build_object(
      'none',          count(*) filter (where bki_open and job_id is null),
      'cho_san_xuat',  count(*) filter (where bki_open and step = 'cho_san_xuat'),
      'dang_san_xuat', count(*) filter (where bki_open and step = 'dang_san_xuat'),
      'san_sang_giao', count(*) filter (where bki_open and step = 'san_sang_giao')),
    'months', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'month', to_char(g.m, 'YYYY-MM'),
               'bang_keo_in', coalesce(s.bki, 0), 'truc_in', coalesce(s.ti, 0),
               'bang_keo', coalesce(s.bk, 0), 'thank_you', coalesce(s.ty, 0),
               'profit', case when v_money then coalesce(s.profit, 0) end) order by g.m), '[]'::jsonb)
        from generate_series(v_month - make_interval(months => v_n - 1), v_month, interval '1 month') g(m)
        left join (
          select f2.m,
                 sum(f2.rev) filter (where f2.type = 'bang_keo_in') as bki,
                 sum(f2.rev) filter (where f2.type = 'truc_in') as ti,
                 sum(f2.rev) filter (where f2.type = 'bang_keo') as bk,
                 sum(f2.rev) filter (where f2.type = 'thank_you') as ty,
                 sum(f2.loi_nhuan_rong) as profit
            from f f2 group by f2.m
        ) s on s.m = g.m::date),
    'overdue_list', (
      select coalesce(jsonb_agg(x order by x.ngay_du_kien, x.id), '[]'::jsonb)
        from (select f2.type, f2.id, f2.ten_khach_hang, f2.ngay_du_kien, v_today - f2.ngay_du_kien as days_late
                from f f2
               where not f2.da_giao and f2.ngay_du_kien < v_today
               order by f2.ngay_du_kien, f2.id limit 5) x),
    'top_debtors', (
      select coalesce(jsonb_agg(x order by x.debt desc, x.name), '[]'::jsonb)
        from (select min(btrim(f2.ten_khach_hang)) as name, sum(f2.cong_no_khach) as debt, count(*) as orders
                from f f2
               where not f2.da_tat_toan and f2.cong_no_khach > 0 and nullif(btrim(f2.ten_khach_hang), '') is not null
               group by lower(btrim(f2.ten_khach_hang))
               order by 2 desc, 1 limit 5) x),
    'leads', (
      select jsonb_build_object(
               'new',        count(*) filter (where l.status = 'new' and l.assigned_to is null),
               'consulting', count(*) filter (where l.status = 'consulting'),
               'quoted',     count(*) filter (where l.status = 'quoted'))
        from public.leads l
       where v_all or (l.assigned_to = v_uid and public.is_internal())))
    into v_out
    from f;

  return v_out;
end;
$$;

revoke all on function public.admin_overview(int) from public, anon;
grant execute on function public.admin_overview(int) to authenticated;
