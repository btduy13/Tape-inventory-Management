-- Review fixes of 0030 (permissions):
-- 1. Cost inputs (don_gia_von, phi_*) are no longer dropped for users without orders.money: a printed
--    tape / Thank you order created by them had cost 0 (profit = whole sale, supplier debt 0).
--    admin_order_update keeps a stored one instead, like don_gia_goc / truc_gia_goc.
-- 2. Without orders.money a new axis cannot be removed (loai_truc 'moi' -> 'cu' zeroed its cost and
--    CTV, then a typed cost was accepted).
-- 3. Bulk export RPCs (admin_orders_for_export, admin_orders_rows) also need orders.export.
-- 4. admin_order_latest_by_name hides the customer without orders.view.
-- 5. admin_customer_get lists only the leads the caller may see (leads_select: manager/admin or assignee).
-- 6. admin_orders_import: an Excel import is all or nothing (the web created rows one by one, so a failed
--    row left the earlier ones saved and a re-import duplicated them; app: one dbTransaction).
-- Bodies are patched in place (as 0030 does): each replace must hit exactly once, else the migration fails.

create or replace function public.order_strip_money_input(p jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case when p is null or jsonb_typeof(p) <> 'object' or public.has_perm('orders.money') then p
    else p - array['ctv', 'hoa_hong', 'truc_ctv', 'truc_hoa_hong', 'tien_ship'] end;
$$;

do $$
declare
  r     record;
  v_def text;
begin
  for r in
    select * from (values
      ('public.admin_order_update(text,text,jsonb)',
       $a$unnest(array['don_gia_goc', 'truc_gia_goc']) k$a$,
       $b$unnest(array['don_gia_goc', 'truc_gia_goc', 'don_gia_von', 'phi_sl', 'phi_keo', 'phi_mau', 'phi_size', 'phi_cat']) k$b$),
      ('public.admin_order_update(text,text,jsonb)',
       $a$  if v_clean = '{}'::jsonb then$a$,
       $b$  if not public.has_perm('orders.money') and v_old ->> 'loai_truc' = 'moi'
     and coalesce(v_clean ->> 'loai_truc', 'moi') <> 'moi' then
    raise exception 'removing the new axis needs orders.money' using errcode = '42501';
  end if;
  if v_clean = '{}'::jsonb then$b$),
      ('public.admin_orders_for_export(text[])',
       $a$if not public.has_perm('orders.view') then$a$,
       $b$if not (public.has_perm('orders.view') and public.has_perm('orders.export')) then$b$),
      ('public.admin_orders_rows(text,text[])',
       $a$if not public.has_perm('orders.view') then$a$,
       $b$if not (public.has_perm('orders.view') and public.has_perm('orders.export')) then$b$),
      ('public.admin_order_latest_by_name(text,text)',
       $a$  return public.order_hide_money(v_row);$a$,
       $b$  if not public.has_perm('orders.view') then
    v_row := v_row - array['ten_khach_hang', 'sdt_khach_hang', 'dia_chi_khach_hang', 'customer_id'];
  end if;
  return public.order_hide_money(v_row);$b$),
      ('public.admin_customer_get(uuid)',
       $a$from public.leads l where l.customer_id = p_id)$a$,
       $b$from public.leads l where l.customer_id = p_id
         and (public.is_manager_or_admin() or l.assigned_to = (select auth.uid())))$b$)
    ) as v(sig, old, new)
  loop
    v_def := pg_get_functiondef(r.sig::regprocedure);
    if (length(v_def) - length(replace(v_def, r.old, ''))) / length(r.old) <> 1 then
      raise exception '0033: patch target not found once in %: %', r.sig, left(r.old, 60);
    end if;
    execute replace(v_def, r.old, r.new);
  end loop;
end;
$$;

-- p_rows: [{payload, delivered, settled}] (max 500). Same RPCs as a form save + the status dialog, so
-- the same gates (orders.create, orders.status for a flag). Any error rolls back every row; the
-- message starts with "row N:" (1-based). Returns the number of orders created.
create or replace function public.admin_orders_import(p_type text, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_i   integer := 0;
  v_row jsonb;
  v_id  text;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 500 then
    raise exception 'rows: 1 to 500' using errcode = '22023';
  end if;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_i := v_i + 1;
    begin
      select order_id into v_id from public.admin_order_create(v_row -> 'payload', p_type, false);
      if coalesce((v_row ->> 'delivered')::boolean, false) or coalesce((v_row ->> 'settled')::boolean, false) then
        perform public.admin_order_set_status(p_type, array[v_id],
          case when (v_row ->> 'delivered')::boolean then true end,
          case when (v_row ->> 'settled')::boolean then true end);
      end if;
    exception when others then
      raise exception 'row %: %', v_i, sqlerrm using errcode = sqlstate;
    end;
  end loop;
  return v_i;
end;
$$;

revoke all on function public.admin_orders_import(text, jsonb) from public, anon;
grant execute on function public.admin_orders_import(text, jsonb) to authenticated;
