-- 0011_security_hardening
-- Fixes from the static security review (see SECURITY_REPORT.md at the repo root).
-- Tests: supabase/tests/rls/05_security_hardening.test.sql
--
--   S1  is_service_call() trusted ANY connection without JWT claims (e.g. the direct-login
--       electron_app role from 0010) as "server code". Now only service_role JWTs or the
--       platform owner roles count.
--   S2  leads_select / leads_update matched `assigned_to = auth.uid()` without checking that
--       the profile is still active: a deactivated staff/ctv kept reading and updating their
--       leads until unassigned.
--   S3  New auth users without app_metadata.role became ACTIVE 'ctv' internal users. If public
--       sign-up is ever enabled on the hosted project (dashboard setting, not config.toml),
--       anyone could join the portal. They now start inactive until an admin activates them.
--   S4  Quotes: managers could write subtotal/vat_amount/total directly (totals not derived
--       from lines), forge the customer's answer (status accepted / changes_requested,
--       responded_at, customer_response_note), spoof created_by, move a quote to another lead,
--       and edit price lines / VAT after the quote was sent or accepted.
--   S5  Trigger functions and SECURITY DEFINER helpers kept the default EXECUTE grant to
--       PUBLIC (and Supabase's default grant to anon/authenticated).

-- ---------------------------------------------------------------------------
-- S1  Server-code detection
-- ---------------------------------------------------------------------------
create or replace function public.is_service_call()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is null
     and (
       auth.role() = 'service_role'
       -- migrations, seed, SQL editor, pg_cron: owner roles with no JWT at all
       -- (newer CLI versions log in as a temporary role that is a member of postgres)
       or (nullif(auth.role(), '') is null
           and (session_user in ('postgres', 'supabase_admin')
                or pg_catalog.pg_has_role(session_user, 'postgres', 'MEMBER')))
     )
$$;

-- ---------------------------------------------------------------------------
-- S2  Deactivated assignees lose access immediately
-- ---------------------------------------------------------------------------
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads
  for select to authenticated
  using (public.is_manager_or_admin() or (assigned_to = auth.uid() and public.is_internal()));

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
  for update to authenticated
  using (public.is_manager_or_admin() or (assigned_to = auth.uid() and public.is_internal()))
  with check (public.is_manager_or_admin() or (assigned_to = auth.uid() and public.is_internal()));

-- ---------------------------------------------------------------------------
-- S3  Only invited users (app_metadata.role set by service role) start active
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role    public.app_role;
  v_invited boolean := (new.raw_app_meta_data ? 'role');
begin
  begin
    v_role := coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'ctv');
  exception when invalid_text_representation then
    v_role := 'ctv';
    v_invited := false;
  end;
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role,
    v_invited
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- S4  Quote integrity
-- ---------------------------------------------------------------------------
create or replace function public.quotes_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subtotal numeric(14, 2);
begin
  if not public.is_service_call() then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
      if new.status in ('accepted', 'changes_requested')
         or new.responded_at is not null
         or new.customer_response_note is not null then
        raise exception 'customer response fields are set by the server only' using errcode = '42501';
      end if;
    else
      if new.lead_id is distinct from old.lead_id
         or new.version is distinct from old.version
         or new.created_by is distinct from old.created_by
         or new.created_at is distinct from old.created_at then
        raise exception 'immutable quote columns' using errcode = '42501';
      end if;
      if (new.status is distinct from old.status and new.status in ('accepted', 'changes_requested'))
         or new.responded_at is distinct from old.responded_at
         or new.customer_response_note is distinct from old.customer_response_note then
        raise exception 'customer response fields are set by the server only' using errcode = '42501';
      end if;
      if old.status <> 'draft'
         and (new.vat_percent is distinct from old.vat_percent
              or new.currency is distinct from old.currency) then
        raise exception 'quote is locked after it was sent; create a new version' using errcode = '42501';
      end if;
    end if;
  end if;

  -- Totals are always derived from the lines (single source of truth), for every caller.
  select coalesce(sum(l.line_total), 0) into v_subtotal
    from public.quote_lines l where l.quote_id = new.id;
  new.subtotal   := v_subtotal;
  new.vat_amount := round(v_subtotal * new.vat_percent / 100, 0);
  new.total      := v_subtotal + new.vat_amount;
  return new;
end;
$$;

drop trigger if exists quotes_guard on public.quotes;
create trigger quotes_guard
  before insert or update on public.quotes
  for each row execute function public.quotes_guard();

create or replace function public.quote_lines_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.quote_status;
begin
  if public.is_service_call() then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and new.quote_id is distinct from old.quote_id then
    raise exception 'quote line cannot move to another quote' using errcode = '42501';
  end if;
  select q.status into v_status from public.quotes q where q.id = coalesce(new.quote_id, old.quote_id);
  -- Parent already gone: cascade delete of a quote (admin only by RLS).
  if not found then
    return coalesce(new, old);
  end if;
  if v_status <> 'draft' then
    raise exception 'price lines are locked once the quote is sent (status %)', v_status
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists quote_lines_guard on public.quote_lines;
create trigger quote_lines_guard
  before insert or update or delete on public.quote_lines
  for each row execute function public.quote_lines_guard();

-- ---------------------------------------------------------------------------
-- S5  No direct EXECUTE on trigger / internal functions
--     (EXECUTE is checked when a trigger is created, not when it fires.)
-- ---------------------------------------------------------------------------
revoke all on function public.set_updated_at()            from public, anon, authenticated;
revoke all on function public.profiles_guard_columns()    from public, anon, authenticated;
revoke all on function public.handle_new_user()           from public, anon, authenticated;
revoke all on function public.leads_guard_columns()       from public, anon, authenticated;
revoke all on function public.leads_check_transition()    from public, anon, authenticated;
revoke all on function public.leads_on_assign()           from public, anon, authenticated;
revoke all on function public.leads_log_status()          from public, anon, authenticated;
revoke all on function public.leads_log_assignment()      from public, anon, authenticated;
revoke all on function public.quote_lines_after_change()  from public, anon, authenticated;
revoke all on function public.quotes_after_vat_change()   from public, anon, authenticated;
revoke all on function public.quotes_guard()              from public, anon, authenticated;
revoke all on function public.quote_lines_guard()         from public, anon, authenticated;
revoke all on function public.quotes_recalc_totals(uuid)  from public, anon, authenticated;
revoke all on function public.next_bang_keo_in_order_id() from public, anon, authenticated;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
-- is_service_call stays executable by authenticated: assign_lead (SECURITY INVOKER) calls it.
revoke all on function public.is_service_call() from public, anon;
grant execute on function public.is_service_call() to authenticated, service_role;
-- No future function in public is executable by anon/authenticated unless granted explicitly.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
