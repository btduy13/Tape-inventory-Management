-- 0004_assignments_status_log
-- Status history, assignment history, internal notes and the RPCs that drive them.

create table public.lead_status_log (
  id           bigint generated always as identity primary key,
  lead_id      uuid not null references public.leads (id) on delete cascade,
  from_status  public.lead_status,
  to_status    public.lead_status not null,
  changed_by   uuid references public.profiles (id) on delete set null,  -- null = system/customer
  note         text check (note is null or char_length(note) <= 1000),
  created_at   timestamptz not null default now()
);
create index lead_status_log_lead_idx on public.lead_status_log (lead_id, created_at desc);

create table public.lead_assignments (
  id             bigint generated always as identity primary key,
  lead_id        uuid not null references public.leads (id) on delete cascade,
  assigned_to    uuid references public.profiles (id) on delete set null,  -- null = unassigned
  assigned_by    uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index lead_assignments_lead_idx on public.lead_assignments (lead_id, created_at desc);

create table public.lead_notes (
  id          bigint generated always as identity primary key,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  author_id   uuid default auth.uid() references public.profiles (id) on delete set null,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Status transition rules for staff/ctv. admin, manager and server code bypass.
--   new -> assigned -> consulting -> quoted -> accepted -> production -> shipping -> done
--   any non-terminal -> cancelled
-- quoted/accepted are set by the quote flow (manager or server), never by staff.
-- ---------------------------------------------------------------------------
create or replace function public.lead_transition_allowed(
  p_from public.lead_status,
  p_to public.lead_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_from = p_to then true
    when p_from in ('done', 'cancelled') then false
    when p_to = 'cancelled' then true
    when p_to in ('quoted', 'accepted', 'new', 'assigned') then false
    else (p_from, p_to) in (
      ('assigned'::public.lead_status,   'consulting'::public.lead_status),
      ('accepted'::public.lead_status,   'production'::public.lead_status),
      ('production'::public.lead_status, 'shipping'::public.lead_status),
      ('shipping'::public.lead_status,   'done'::public.lead_status)
    )
  end
$$;

create or replace function public.leads_check_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and not (public.is_service_call() or public.is_manager_or_admin())
     and not public.lead_transition_allowed(old.status, new.status) then
    raise exception 'status transition % -> % not allowed', old.status, new.status
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger leads_check_transition
  before update of status on public.leads
  for each row execute function public.leads_check_transition();

-- Assignment side effects: stamp assigned_at, auto-move new <-> assigned.
create or replace function public.leads_on_assign()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assigned_to is distinct from old.assigned_to then
    new.assigned_at := case when new.assigned_to is null then null else now() end;
    if new.assigned_to is not null and new.status = 'new' then
      new.status := 'assigned';
    elsif new.assigned_to is null and new.status = 'assigned' then
      new.status := 'new';
    end if;
  end if;
  return new;
end;
$$;

-- BEFORE triggers fire in name order; 'leads_a_on_assign' sorts first so the
-- automatic new <-> assigned status move happens before guard/transition checks.
create trigger leads_a_on_assign
  before update of assigned_to on public.leads
  for each row execute function public.leads_on_assign();

-- Status log writer. Optional note via: select set_config('app.status_note', '...', true)
create or replace function public.leads_log_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.lead_status_log (lead_id, from_status, to_status, changed_by, note)
    values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      auth.uid(),
      nullif(current_setting('app.status_note', true), '')
    );
  end if;
  return null;
end;
$$;

-- Not column-restricted: status may also change inside leads_a_on_assign.
create trigger leads_log_status
  after insert or update on public.leads
  for each row execute function public.leads_log_status();

create or replace function public.leads_log_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.lead_assignments (lead_id, assigned_to, assigned_by)
    values (new.id, new.assigned_to, auth.uid());
  end if;
  return null;
end;
$$;

create trigger leads_log_assignment
  after update of assigned_to on public.leads
  for each row execute function public.leads_log_assignment();

-- ---------------------------------------------------------------------------
-- RPCs (SECURITY INVOKER: RLS + guard triggers still apply to the caller).
-- ---------------------------------------------------------------------------
create or replace function public.change_lead_status(
  p_lead_id uuid,
  p_to public.lead_status,
  p_note text default null
)
returns public.leads
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.leads;
begin
  perform set_config('app.status_note', coalesce(left(p_note, 1000), ''), true);
  update public.leads set status = p_to where id = p_lead_id returning * into v_row;
  perform set_config('app.status_note', '', true);
  if v_row.id is null then
    raise exception 'lead not found or not accessible' using errcode = 'P0002';
  end if;
  return v_row;
end;
$$;

-- p_user_id null = unassign. Admin only (enforced by guard trigger + explicit check).
create or replace function public.assign_lead(p_lead_id uuid, p_user_id uuid)
returns public.leads
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.leads;
begin
  if not (public.is_service_call() or public.is_admin()) then
    raise exception 'only admin may assign leads' using errcode = '42501';
  end if;
  if p_user_id is not null and not exists (
    select 1 from public.profiles
    where id = p_user_id and is_active and role in ('staff', 'ctv', 'manager', 'admin')
  ) then
    raise exception 'assignee not found or inactive' using errcode = '22023';
  end if;
  update public.leads set assigned_to = p_user_id where id = p_lead_id returning * into v_row;
  if v_row.id is null then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;
  return v_row;
end;
$$;

revoke all on function public.change_lead_status(uuid, public.lead_status, text) from public, anon;
revoke all on function public.assign_lead(uuid, uuid) from public, anon;
grant execute on function public.change_lead_status(uuid, public.lead_status, text) to authenticated, service_role;
grant execute on function public.assign_lead(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.lead_status_log enable row level security;
alter table public.lead_assignments enable row level security;
alter table public.lead_notes enable row level security;

-- Logs are append-only via SECURITY DEFINER triggers; users only read.
create policy lead_status_log_select on public.lead_status_log
  for select to authenticated
  using (public.can_access_lead(lead_id));

create policy lead_assignments_select on public.lead_assignments
  for select to authenticated
  using (public.is_manager_or_admin());

create policy lead_notes_select on public.lead_notes
  for select to authenticated
  using (public.can_access_lead(lead_id));

create policy lead_notes_insert on public.lead_notes
  for insert to authenticated
  with check (author_id = auth.uid() and public.can_access_lead(lead_id));

create policy lead_notes_delete_admin on public.lead_notes
  for delete to authenticated
  using (public.is_admin());
