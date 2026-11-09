-- 0031: order notification email from the web admin (web parity package 4).
--   admin_order_mark_emailed(p_type, p_id, p_emails) -> integer
--     After a successful send: da_gui_email = true on the order (writeActions.js order.markEmailed)
--     and one email_history row per recipient, counter bumped in place or inserted
--     (emailHistory.increment / emailHistory.insert). Needs orders.edit. Unknown order: P0002.
--   admin_email_suggestions() -> setof text
--     The app's 50 recipient suggestions (readActions.js emailHistory.suggestions). Needs orders.edit.

create or replace function public.admin_order_mark_emailed(p_type text, p_id text, p_emails text[] default '{}')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  m      record;
  v_n    integer;
  v_addr text;
begin
  if not public.has_perm('orders.edit') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  select * into m from public.order_type_meta(p_type);
  if coalesce(cardinality(p_emails), 0) > 20 then
    raise exception 'too many recipients (max 20)' using errcode = '22023';
  end if;
  execute format('update public.%I set da_gui_email = true where id = $1', m.tbl) using p_id;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  for v_addr in
    select distinct lower(trim(e)) from unnest(coalesce(p_emails, '{}')) e where trim(e) <> ''
  loop
    if length(v_addr) > 255 or v_addr !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'invalid email %', v_addr using errcode = '22023';
    end if;
    update public.email_history
       set sent_count = coalesce(sent_count, 0) + 1, last_sent_at = current_timestamp
     where lower(email_address) = v_addr;
    if not found then
      insert into public.email_history (email_address, last_sent_at, sent_count)
      values (v_addr, current_timestamp, 1);
    end if;
  end loop;
  return v_n;
end;
$$;

create or replace function public.admin_email_suggestions()
returns setof text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_perm('orders.edit') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  return query
    select h.email_address::text
      from public.email_history h
     group by h.email_address
     order by max(h.last_sent_at) desc, sum(h.sent_count) desc
     limit 50;
end;
$$;

revoke all on function public.admin_order_mark_emailed(text, text, text[]) from public, anon;
revoke all on function public.admin_email_suggestions() from public, anon;
grant execute on function public.admin_order_mark_emailed(text, text, text[]) to authenticated;
grant execute on function public.admin_email_suggestions() to authenticated;
