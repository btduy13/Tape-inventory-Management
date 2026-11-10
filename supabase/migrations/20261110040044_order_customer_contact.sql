-- Save contact details as part of the same transaction as the portal order.
create or replace function public.orders_save_customer_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(nullif(btrim(new.ten_khach_hang), ''), 255);
  v_phone text := left(nullif(btrim(new.sdt_khach_hang), ''), 30);
  v_address text := left(nullif(btrim(new.dia_chi_khach_hang), ''), 500);
  v_norm text := public.normalize_vn_phone(v_phone);
begin
  if auth.uid() is null
     or not public.has_perm('customers.edit')
     or (tg_op = 'INSERT' and not public.has_perm('orders.create'))
     or (tg_op = 'UPDATE' and not public.has_perm('orders.edit'))
     or v_name is null or (v_phone is null and v_address is null) then
    return new;
  end if;

  if v_norm is not null then
    -- Serialize concurrent portal saves for the same phone.
    perform pg_catalog.pg_advisory_xact_lock(33037, (v_norm::bigint % 2147483647)::integer);
  end if;

  if new.customer_id is null then
    -- Reuse only a unique phone match. Shared phones remain unlinked for manual selection.
    new.customer_id := public.customer_find_or_create(v_name, v_phone, v_address);
  else
    -- Keep existing profile details. Fill blanks only for a matching contact with no phone conflict.
    update public.customers c
       set phone = coalesce(nullif(btrim(c.phone), ''), v_phone),
           address = coalesce(nullif(btrim(c.address), ''), v_address)
     where c.id = new.customer_id
       and public.normalize_customer_name(c.name) = public.normalize_customer_name(v_name)
       and (v_phone is null or nullif(btrim(c.phone), '') is null or c.phone = v_phone or c.phone_norm = v_norm)
       and (v_norm is null or c.phone_norm = v_norm
            or not exists (select 1 from public.customers other where other.id <> c.id and other.phone_norm = v_norm))
       and ((nullif(btrim(c.phone), '') is null and v_phone is not null)
         or (nullif(btrim(c.address), '') is null and v_address is not null));
  end if;
  return new;
end;
$$;

revoke all on function public.orders_save_customer_contact() from public, anon, authenticated, service_role, electron_app;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['bang_keo_in_orders', 'bang_keo_orders', 'truc_in_orders', 'thank_you_orders'] loop
    execute format(
      'create trigger zzz_save_customer_contact before insert or update of ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang
       on public.%I for each row execute function public.orders_save_customer_contact()', v_table);
  end loop;
end;
$$;
