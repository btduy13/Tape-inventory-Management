-- 0012_quote_status_transitions
-- SECURITY_REPORT.md W7. quotes_guard (0011) locks price lines and VAT once a quote leaves
-- 'draft', but it did not restrict status changes. An admin/manager (or a stolen session)
-- could PATCH a sent quote back to 'draft', change the price lines, and set it to 'sent'
-- again. The customer's link stays valid, so the customer would accept prices that differ
-- from the emailed PDF, with no new version and no audit trail.
--
-- Rule for every caller except server code (is_service_call()):
--   draft             -> sent | cancelled
--   sent              -> cancelled | expired          (re-send keeps 'sent')
--   changes_requested -> cancelled
--   expired           -> cancelled
--   accepted          -> cancelled  (admin only: customer withdrew)
--   cancelled         -> (final)
-- Nothing ever goes back to 'draft'. Price changes need version + 1.
-- 'accepted' / 'changes_requested' stay server-only (quotes_guard).

create or replace function public.quotes_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_service_call() or new.status = old.status then
    return new;
  end if;
  if (old.status = 'draft' and new.status in ('sent', 'cancelled'))
     or (old.status = 'sent' and new.status in ('cancelled', 'expired'))
     or (old.status in ('changes_requested', 'expired') and new.status = 'cancelled')
     or (old.status = 'accepted' and new.status = 'cancelled' and public.is_admin()) then
    return new;
  end if;
  raise exception 'quote status % -> % is not allowed; create a new version', old.status, new.status
    using errcode = '42501';
end;
$$;

drop trigger if exists quotes_status_transition on public.quotes;
create trigger quotes_status_transition
  before update of status on public.quotes
  for each row execute function public.quotes_status_transition();

revoke all on function public.quotes_status_transition() from public, anon, authenticated;
