-- 0003_leads_designs
-- Leads (quote requests from the public site) and the tape designs attached to them.
-- Leads are INSERTED ONLY by server code (service_role) after Turnstile + rate limit + zod.

create type public.lead_status as enum (
  'new', 'assigned', 'consulting', 'quoted', 'accepted',
  'production', 'shipping', 'done', 'cancelled'
);

create sequence public.lead_code_seq;

create table public.leads (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique default (
                         'L' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMM') || '-'
                         || lpad(nextval('public.lead_code_seq')::text, 5, '0')
                       ),
  customer_name        text not null check (char_length(customer_name) between 1 and 120),
  phone                text not null check (char_length(phone) between 6 and 20),
  email                text check (email is null or char_length(email) <= 254),
  company              text check (company is null or char_length(company) <= 200),
  quantity             integer not null check (quantity > 0 and quantity <= 10000000),
  customer_note        text check (customer_note is null or char_length(customer_note) <= 2000),
  status               public.lead_status not null default 'new',
  assigned_to          uuid references public.profiles (id) on delete set null,
  assigned_at          timestamptz,
  production_order_id  text,           -- id in legacy bang_keo_in_orders after hand-off
  source_ip_hash       text,           -- sha256(ip + salt), for abuse tracing only
  user_agent           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index leads_status_idx on public.leads (status);
create index leads_assigned_to_idx on public.leads (assigned_to) where assigned_to is not null;
create index leads_created_at_idx on public.leads (created_at desc);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create table public.designs (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads (id) on delete cascade,
  preset_id       uuid references public.tape_presets (id) on delete set null,
  -- snapshot of the preset at submit time (presets are editable later)
  width_mm        numeric(6, 1) not null,
  length_m        numeric(7, 1) not null,
  thickness_mic   numeric(5, 1) not null,
  colors          text[] not null default '{}'
                    check (cardinality(colors) between 1 and 3),
  print_text      text check (print_text is null or char_length(print_text) <= 200),
  design_json     jsonb not null default '{}'::jsonb,   -- see web/src/lib/types.ts DesignJson
  logo_path       text,    -- storage: logos/<lead_id>/<file>
  preview_path    text,    -- storage: previews/<lead_id>/<file>.png
  created_at      timestamptz not null default now()
);

create index designs_lead_id_idx on public.designs (lead_id);

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------
-- Caller is the user currently assigned to the lead.
create or replace function public.is_staff_of(p_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.leads l
    join public.profiles p on p.id = l.assigned_to
    where l.id = p_lead_id
      and l.assigned_to = auth.uid()
      and p.is_active
  )
$$;

-- Caller may see the lead: admin/manager, or currently assigned staff/ctv.
create or replace function public.can_access_lead(p_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_manager_or_admin() or public.is_staff_of(p_lead_id)
$$;

revoke all on function public.is_staff_of(uuid) from public, anon;
revoke all on function public.can_access_lead(uuid) from public, anon;
grant execute on function public.is_staff_of(uuid) to authenticated, service_role;
grant execute on function public.can_access_lead(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Column guard on leads:
--   * staff/ctv may change only `status` (transition rules in 0004).
--   * manager may edit customer fields + status, not assignment.
--   * admin / server code may change anything except id/code/created_at.
-- ---------------------------------------------------------------------------
create or replace function public.leads_guard_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.code is distinct from old.code
     or new.created_at is distinct from old.created_at then
    raise exception 'immutable lead columns' using errcode = '42501';
  end if;

  if public.is_service_call() or public.is_admin() then
    return new;
  end if;

  if new.assigned_to is distinct from old.assigned_to
     or new.assigned_at is distinct from old.assigned_at
     or new.production_order_id is distinct from old.production_order_id
     or new.source_ip_hash is distinct from old.source_ip_hash
     or new.user_agent is distinct from old.user_agent then
    raise exception 'only admin may change assignment / production link' using errcode = '42501';
  end if;

  if public.is_manager_or_admin() then
    return new;
  end if;

  -- staff / ctv: status only
  if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'staff may only change lead status' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger leads_guard_columns
  before update on public.leads
  for each row execute function public.leads_guard_columns();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.leads enable row level security;
alter table public.designs enable row level security;

-- anon: no policy at all -> cannot read or write leads/designs.

create policy leads_select on public.leads
  for select to authenticated
  using (public.is_manager_or_admin() or assigned_to = auth.uid());

create policy leads_update on public.leads
  for update to authenticated
  using (public.is_manager_or_admin() or assigned_to = auth.uid())
  with check (public.is_manager_or_admin() or assigned_to = auth.uid());

create policy leads_delete_admin on public.leads
  for delete to authenticated
  using (public.is_admin());

-- No insert policy: inserts only through server code (service_role bypasses RLS).

create policy designs_select on public.designs
  for select to authenticated
  using (public.can_access_lead(lead_id));

create policy designs_update_manager on public.designs
  for update to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy designs_delete_admin on public.designs
  for delete to authenticated
  using (public.is_admin());
