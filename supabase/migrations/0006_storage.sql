-- 0006_storage
-- Private buckets. Object path convention: <lead_id>/<file>
--   logos     customer logo (PNG/JPG/SVG, <= 5 MB; SVG sanitized server-side before upload)
--   previews  PNG mockup preview exported from the 2D designer
--   quotes    generated quote PDFs
-- Uploads happen ONLY in server code (service_role) after validation.
-- Internal users read via signed URLs or directly when they can access the lead.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('logos',    'logos',    false, 5242880,  array['image/png', 'image/jpeg', 'image/svg+xml']),
  ('previews', 'previews', false, 5242880,  array['image/png']),
  ('quotes',   'quotes',   false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Path "<uuid>/..." -> can the caller access that lead? Safe for malformed paths.
create or replace function public.can_access_lead_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_first text := split_part(p_name, '/', 1);
begin
  if v_first !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.can_access_lead(v_first::uuid);
end;
$$;

revoke all on function public.can_access_lead_path(text) from public, anon;
grant execute on function public.can_access_lead_path(text) to authenticated, service_role;

-- Read: internal users who can access the lead.
create policy lead_files_select on storage.objects
  for select to authenticated
  using (
    bucket_id in ('logos', 'previews', 'quotes')
    and public.can_access_lead_path(name)
  );

-- Write/delete from the browser: admin only (normal uploads go through server code).
create policy lead_files_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('logos', 'previews', 'quotes') and public.is_admin());

create policy lead_files_admin_update on storage.objects
  for update to authenticated
  using (bucket_id in ('logos', 'previews', 'quotes') and public.is_admin())
  with check (bucket_id in ('logos', 'previews', 'quotes') and public.is_admin());

create policy lead_files_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('logos', 'previews', 'quotes') and public.is_admin());

-- anon: no policies -> no access to any of these buckets.
