-- 0009_production_handoff
-- "Chuyển sang sản xuất": copy an accepted lead into the legacy Electron table
-- public.bang_keo_in_orders (owned by the desktop app).
--
-- The legacy table already exists in production (created by the Electron app).
-- For local/dev databases we create a MINIMAL stub with only the columns this
-- function writes; `if not exists` makes this a no-op in production.

create table if not exists public.bang_keo_in_orders (
  id              text primary key,
  thoi_gian       timestamptz default now(),
  ten_hang        text,
  ten_khach_hang  text,
  quy_cach_mm     numeric,
  quy_cach_m      numeric,
  quy_cach_mic    numeric,
  so_luong        numeric,
  mau_sac         text,
  don_gia_ban     numeric default 0,
  thanh_tien_ban  numeric default 0,
  is_quote        boolean default false
);

-- Legacy tables must never be reachable through the public Data API (anon/authenticated).
-- The Electron app connects as the table owner via DATABASE_URL, which bypasses RLS.
do $$
declare
  t text;
begin
  foreach t in array array['bang_keo_orders', 'bang_keo_in_orders', 'truc_in_orders',
                           'order_attachments', 'email_history', 'app_schema_meta']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on table public.%I from anon, authenticated', t);
    end if;
  end loop;
end;
$$;

-- Same id format as the Electron app: BK-MM-YY-NNN (numeric max + 1, 3-digit pad).
create or replace function public.next_bang_keo_in_order_id()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefix text := 'BK-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'MM-YY') || '-';
  v_max integer;
begin
  perform pg_advisory_xact_lock(hashtext('bang_keo_in_orders.id'));
  select coalesce(max(substring(id from length(v_prefix) + 1)::integer), 0)
    into v_max
    from public.bang_keo_in_orders
   where id like v_prefix || '%'
     and substring(id from length(v_prefix) + 1) ~ '^\d+$';
  return v_prefix || lpad((v_max + 1)::text, 3, '0');
end;
$$;

-- Admin only. Uses the latest design + latest accepted quote of the lead.
create or replace function public.convert_lead_to_production(p_lead_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead   public.leads;
  v_design public.designs;
  v_quote  public.quotes;
  v_id     text;
  v_unit   numeric;
begin
  if not (public.is_service_call() or public.is_admin()) then
    raise exception 'only admin may convert leads' using errcode = '42501';
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if v_lead.id is null then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;
  if v_lead.production_order_id is not null then
    return v_lead.production_order_id;   -- idempotent
  end if;
  if v_lead.status <> 'accepted' then
    raise exception 'lead must be accepted before production (is %)', v_lead.status
      using errcode = '22023';
  end if;

  select * into v_design from public.designs
   where lead_id = p_lead_id order by created_at desc limit 1;
  if v_design.id is null then
    raise exception 'lead has no design' using errcode = '22023';
  end if;

  select * into v_quote from public.quotes
   where lead_id = p_lead_id and status = 'accepted'
   order by version desc limit 1;
  v_unit := case when v_quote.id is not null and v_lead.quantity > 0
                 then round(v_quote.subtotal / v_lead.quantity, 2) else 0 end;

  v_id := public.next_bang_keo_in_order_id();

  insert into public.bang_keo_in_orders (
    id, thoi_gian, ten_hang, ten_khach_hang,
    quy_cach_mm, quy_cach_m, quy_cach_mic, so_luong, mau_sac,
    don_gia_ban, thanh_tien_ban, is_quote
  ) values (
    v_id,
    now(),
    'Băng keo in ' || coalesce(nullif(v_design.print_text, ''), v_lead.code),
    concat_ws(' - ', nullif(v_lead.company, ''), v_lead.customer_name, v_lead.phone),
    v_design.width_mm, v_design.length_m, v_design.thickness_mic,
    v_lead.quantity,
    array_to_string(v_design.colors, ', '),
    v_unit,
    coalesce(v_quote.subtotal, 0),
    false
  );

  perform set_config('app.status_note', 'Chuyển sang sản xuất: ' || v_id, true);
  update public.leads
     set production_order_id = v_id, status = 'production'
   where id = p_lead_id;
  perform set_config('app.status_note', '', true);

  return v_id;
end;
$$;

revoke all on function public.next_bang_keo_in_order_id() from public, anon, authenticated;
revoke all on function public.convert_lead_to_production(uuid) from public, anon;
grant execute on function public.convert_lead_to_production(uuid) to authenticated, service_role;
