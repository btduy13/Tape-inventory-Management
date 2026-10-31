-- 0007_realtime
-- Portal live updates. Realtime postgres_changes respects RLS, so staff only
-- receive events for leads assigned to them.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

alter publication supabase_realtime add table
  public.leads,
  public.lead_status_log,
  public.lead_notes,
  public.quotes;

-- Full old-row image so UPDATE/DELETE events carry previous values (e.g. unassign).
alter table public.leads replica identity full;
