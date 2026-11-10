-- The admin can record completion separately. Keep the workshop's existing one-tap path.
create or replace function public.production_step_next(p_step public.production_step)
returns public.production_step
language sql
immutable
set search_path = ''
as $$
  select case p_step
    when 'cho_san_xuat'  then 'dang_san_xuat'::public.production_step
    when 'dang_san_xuat' then 'san_sang_giao'::public.production_step
    when 'da_san_xuat'   then 'san_sang_giao'::public.production_step
    when 'san_sang_giao' then 'da_giao'::public.production_step
  end
$$;

create or replace function public.production_step_label(p_step public.production_step)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_step
    when 'cho_san_xuat'  then 'Chờ sản xuất'
    when 'dang_san_xuat' then 'Đang sản xuất'
    when 'dang_in'       then 'Đang in'
    when 'dang_cat_cuon' then 'Đang cắt cuộn'
    when 'dong_goi'      then 'Đóng gói'
    when 'da_san_xuat'   then 'Đã xong'
    when 'san_sang_giao' then 'Sẵn sàng giao'
    when 'da_giao'       then 'Đã giao'
    when 'huy'           then 'Đã hủy'
  end
$$;

-- One transaction for the batch. The existing single-job RPC handles logging,
-- lead and app synchronization, and delivery note revocation.
create or replace function public.admin_workshop_set_steps(p_jobs jsonb, p_to public.production_step)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_step public.production_step;
  v_count integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if jsonb_typeof(p_jobs) is distinct from 'array'
     or p_to is null or p_to not in ('cho_san_xuat', 'dang_san_xuat', 'da_san_xuat', 'san_sang_giao', 'da_giao') then
    raise exception 'invalid job selection or target step' using errcode = '22023';
  end if;
  if jsonb_array_length(p_jobs) not between 1 and 100 then
    raise exception 'select 1 to 100 jobs' using errcode = '22023';
  end if;

  for v_item in
    select x.job_id, x.from_step
      from jsonb_to_recordset(p_jobs) as x(job_id uuid, from_step public.production_step)
     order by x.job_id
  loop
    select j.step into v_step from public.production_jobs j
     where j.id = v_item.job_id and j.order_id is not null for update;
    if not found then
      raise exception 'production job not found' using errcode = 'P0002';
    end if;
    if v_step is distinct from v_item.from_step then
      raise exception 'production step changed since selection' using errcode = '40001';
    end if;
    if v_step <> p_to then
      perform public.advance_production_step(v_item.job_id, p_to);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.admin_workshop_set_steps(jsonb, public.production_step) from public, anon, service_role, electron_app;
grant execute on function public.admin_workshop_set_steps(jsonb, public.production_step) to authenticated;

-- Include the new step in the existing overview breakdown.
do $$
declare
  v_def text := pg_get_functiondef('public.admin_overview(integer)'::regprocedure);
  v_line text := $line$      'san_sang_giao', count(*) filter (where bki_open and step = 'san_sang_giao')),$line$;
begin
  if strpos(v_def, v_line) = 0 then
    raise exception 'unexpected admin_overview pipeline definition';
  end if;
  execute replace(v_def, v_line,
    $line$      'da_san_xuat', count(*) filter (where bki_open and step = 'da_san_xuat'),$line$ || E'\n' || v_line);
end
$$;
