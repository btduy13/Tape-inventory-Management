-- 0005_quotes_tokens
-- Manual quotes (price lines) and customer access tokens for /q/<token>.
-- Price protection: prices live ONLY in quotes/quote_lines, which only admin/manager
-- (or server code) can write. staff/ctv can read quotes of leads assigned to them.

create type public.quote_status as enum (
  'draft', 'sent', 'accepted', 'changes_requested', 'expired', 'cancelled'
);

create table public.quotes (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null references public.leads (id) on delete cascade,
  version            integer not null default 1 check (version > 0),
  status             public.quote_status not null default 'draft',
  currency           text not null default 'VND' check (currency ~ '^[A-Z]{3}$'),
  subtotal           numeric(14, 2) not null default 0 check (subtotal >= 0),
  vat_percent        numeric(5, 2) not null default 0 check (vat_percent between 0 and 100),
  vat_amount         numeric(14, 2) not null default 0 check (vat_amount >= 0),
  total              numeric(14, 2) not null default 0 check (total >= 0),
  valid_until        date,
  notes              text check (notes is null or char_length(notes) <= 4000),
  pdf_path           text,           -- storage: quotes/<lead_id>/<quote_id>.pdf
  created_by         uuid references public.profiles (id) on delete set null default auth.uid(),
  sent_at            timestamptz,
  responded_at       timestamptz,
  customer_response_note text check (customer_response_note is null or char_length(customer_response_note) <= 2000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint quotes_lead_version_unique unique (lead_id, version)
);
create index quotes_lead_idx on public.quotes (lead_id, version desc);

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

create table public.quote_lines (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid not null references public.quotes (id) on delete cascade,
  sort_order   integer not null default 0,
  description  text not null check (char_length(description) between 1 and 300),
  unit         text not null default 'cuộn' check (char_length(unit) between 1 and 20),
  quantity     numeric(14, 2) not null check (quantity > 0),
  unit_price   numeric(14, 2) not null check (unit_price >= 0),
  line_total   numeric(16, 2) generated always as (round(quantity * unit_price, 2)) stored
);
create index quote_lines_quote_idx on public.quote_lines (quote_id, sort_order);

-- Recompute quote totals whenever lines change (single source of truth = lines).
create or replace function public.quotes_recalc_totals(p_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subtotal numeric(14, 2);
begin
  select coalesce(sum(line_total), 0) into v_subtotal
  from public.quote_lines where quote_id = p_quote_id;
  update public.quotes q
     set subtotal   = v_subtotal,
         vat_amount = round(v_subtotal * q.vat_percent / 100, 0),
         total      = v_subtotal + round(v_subtotal * q.vat_percent / 100, 0)
   where q.id = p_quote_id;
end;
$$;

create or replace function public.quote_lines_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.quotes_recalc_totals(coalesce(new.quote_id, old.quote_id));
  return null;
end;
$$;

create trigger quote_lines_recalc
  after insert or update or delete on public.quote_lines
  for each row execute function public.quote_lines_after_change();

create or replace function public.quotes_after_vat_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.vat_percent is distinct from old.vat_percent then
    perform public.quotes_recalc_totals(new.id);
  end if;
  return null;
end;
$$;

create trigger quotes_vat_recalc
  after update of vat_percent on public.quotes
  for each row execute function public.quotes_after_vat_change();

revoke all on function public.quotes_recalc_totals(uuid) from public, anon, authenticated;

-- Customer link tokens. Raw token (32 random bytes, base64url) is sent by email only;
-- DB stores sha256 hex. Access only through server code (service_role).
create table public.quote_tokens (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid not null references public.quotes (id) on delete cascade,
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);
create index quote_tokens_quote_idx on public.quote_tokens (quote_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.quote_tokens enable row level security;

create policy quotes_select on public.quotes
  for select to authenticated
  using (public.can_access_lead(lead_id));

create policy quotes_insert_manager on public.quotes
  for insert to authenticated
  with check (public.is_manager_or_admin());

create policy quotes_update_manager on public.quotes
  for update to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy quotes_delete_admin on public.quotes
  for delete to authenticated
  using (public.is_admin());

create policy quote_lines_select on public.quote_lines
  for select to authenticated
  using (exists (
    select 1 from public.quotes q
    where q.id = quote_id and public.can_access_lead(q.lead_id)
  ));

create policy quote_lines_insert_manager on public.quote_lines
  for insert to authenticated
  with check (public.is_manager_or_admin());

create policy quote_lines_update_manager on public.quote_lines
  for update to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy quote_lines_delete_manager on public.quote_lines
  for delete to authenticated
  using (public.is_manager_or_admin());

-- quote_tokens: no policies -> no access for anon/authenticated. service_role only.
