-- 0016_sent_quote_terms_inactive_profile
--
-- 1) QUOTE-TERMS-1/2/3. quotes_guard (0011) froze price lines, VAT and currency once a quote
--    left 'draft', but a manager/admin could still change on a sent or accepted quote:
--      * notes        -> shown on /q/<token> next to the prices, so the customer accepted
--                        text that was not in the emailed PDF;
--      * valid_until  -> extending it reopened acceptance of old prices (even after expiry);
--      * pdf_path / sent_at -> the audit record of what was sent.
--    All of them are now frozen like the prices: any change needs a new version.
--    Server code (is_service_call(), e.g. the send flow re-sending the same version) is not
--    affected; status changes stay governed by quotes_status_transition (0012).
--
-- 2) access-deactivated-profile-self-update. profiles_update_self only checked
--    id = auth.uid(), so a deactivated user (is_active = false) with a still-valid access
--    token could edit its own full_name / phone. The policy now also requires an active
--    internal user (is_internal()), in USING and WITH CHECK.

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
      -- Everything the customer was sent (terms + audit record) is frozen after sending.
      if old.status <> 'draft'
         and (new.vat_percent is distinct from old.vat_percent
              or new.currency is distinct from old.currency
              or new.notes is distinct from old.notes
              or new.valid_until is distinct from old.valid_until
              or new.pdf_path is distinct from old.pdf_path
              or new.sent_at is distinct from old.sent_at) then
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

revoke all on function public.quotes_guard() from public, anon, authenticated;

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() and public.is_internal())
  with check (id = auth.uid() and public.is_internal());
