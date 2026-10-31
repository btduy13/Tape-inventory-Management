-- 0013_lead_privileged_columns
-- Tests: supabase/tests/rls/02_lead_updates.test.sql, 07_lead_privileged_columns.test.sql
--
-- L1  leads_guard_columns (0003) compares OLD vs NEW values only. A non-admin UPDATE that
--     names a privileged column but writes the current value (e.g. staff
--     `set assigned_to = <self>`) passed silently. That is not a data change, but it lets
--     callers probe the guard and keeps privileged columns writable "in principle" for
--     staff/ctv/manager. Admin-only / server-only columns are now rejected as soon as they
--     appear in the SET list of a non-admin, non-server UPDATE, whatever the value.
--     Column-specific (`before update of ...`) triggers fire on the SET list, not on change.
--
-- L2  Staff/ctv must not touch customer/source fields even with the current value, for the
--     same reason. Managers may still edit customer fields (0003 contract).
--
-- L3  Defense in depth on append-only history tables: lead_status_log / lead_assignments
--     are written only by SECURITY DEFINER triggers. RLS has no write policies, but the
--     Supabase default table grants still allowed INSERT/UPDATE/DELETE attempts. Revoke them
--     so a future permissive policy cannot silently open them up.

-- ---------------------------------------------------------------------------
-- L1  Admin / server-only columns: assignment, production link, abuse-trace fields
-- ---------------------------------------------------------------------------
create or replace function public.leads_guard_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_service_call() or public.is_admin() then
    return new;
  end if;
  raise exception 'only admin may change assignment / production link'
    using errcode = '42501';
end;
$$;

drop trigger if exists leads_guard_admin_columns on public.leads;
create trigger leads_guard_admin_columns
  before update of id, code, created_at, assigned_to, assigned_at,
                   production_order_id, source_ip_hash, user_agent
  on public.leads
  for each row execute function public.leads_guard_admin_columns();

-- id / code / created_at stay immutable for admins too (enforced by leads_guard_columns
-- on value change); naming them in the SET list is additionally blocked for non-admins.

-- ---------------------------------------------------------------------------
-- L2  Customer fields: manager/admin/server only (staff/ctv change status via RPC)
-- ---------------------------------------------------------------------------
create or replace function public.leads_guard_customer_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_service_call() or public.is_manager_or_admin() then
    return new;
  end if;
  raise exception 'staff may only change lead status' using errcode = '42501';
end;
$$;

drop trigger if exists leads_guard_customer_columns on public.leads;
create trigger leads_guard_customer_columns
  before update of customer_name, phone, email, company, quantity, customer_note, updated_at
  on public.leads
  for each row execute function public.leads_guard_customer_columns();

revoke all on function public.leads_guard_admin_columns()    from public, anon, authenticated;
revoke all on function public.leads_guard_customer_columns() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- L3  History tables: read-only for API roles
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.lead_status_log  from anon, authenticated;
revoke insert, update, delete, truncate on public.lead_assignments from anon, authenticated;
