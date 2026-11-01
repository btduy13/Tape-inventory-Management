-- seed.sql  (LOCAL DEVELOPMENT ONLY — `supabase db reset` runs this after migrations)
-- Test accounts, all with password: devpassword123
--   admin@local.test   admin
--   manager@local.test manager
--   staff@local.test   staff   (lead b0001 assigned)
--   staff2@local.test  staff   (no leads: cross-staff IDOR checks)
--   ctv@local.test     ctv     (lead b0002 assigned)
--   workshop@local.test  workshop (no jobs; tests assign their own)
--   workshop2@local.test workshop (no jobs: cross-workshop checks)
-- See supabase/SEED_USERS.md.
-- tape_presets are seeded by migration 0002 (also needed in production).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a001', 'authenticated', 'authenticated',
   'admin@local.test', extensions.crypt('devpassword123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"admin"}', '{"full_name":"Quản trị viên"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a002', 'authenticated', 'authenticated',
   'manager@local.test', extensions.crypt('devpassword123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"manager"}', '{"full_name":"Quản lý"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a003', 'authenticated', 'authenticated',
   'staff@local.test', extensions.crypt('devpassword123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"staff"}', '{"full_name":"Nhân viên"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a004', 'authenticated', 'authenticated',
   'ctv@local.test', extensions.crypt('devpassword123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"ctv"}', '{"full_name":"Cộng tác viên"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a005', 'authenticated', 'authenticated',
   'staff2@local.test', extensions.crypt('devpassword123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"staff"}', '{"full_name":"Nhân viên 2"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a006', 'authenticated', 'authenticated',
   'workshop@local.test', extensions.crypt('devpassword123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"workshop"}', '{"full_name":"Xưởng 1"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a007', 'authenticated', 'authenticated',
   'workshop2@local.test', extensions.crypt('devpassword123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"workshop"}', '{"full_name":"Xưởng 2"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@local.test'
on conflict do nothing;

-- Sample leads (inserted as postgres = server context).
insert into public.leads (id, customer_name, phone, email, company, quantity, customer_note) values
  ('00000000-0000-0000-0000-0000000b0001', 'Nguyễn Văn A', '0901234567', 'a@example.com', 'Công ty A', 500, 'Cần gấp'),
  ('00000000-0000-0000-0000-0000000b0002', 'Trần Thị B', '0912345678', null, null, 120, null),
  ('00000000-0000-0000-0000-0000000b0003', 'Lê Văn C', '0987654321', 'c@example.com', 'Shop C', 1000, null)
on conflict (id) do nothing;

insert into public.designs (lead_id, preset_id, width_mm, length_m, thickness_mic, colors, print_text, design_json)
select l.id, p.id, p.width_mm, p.length_m, p.thickness_mic,
       array['#c8a165', '#d32f2f'], 'HÀNG DỄ VỠ',
       jsonb_build_object('version', 1, 'presetId', p.id, 'backgroundColor', '#c8a165',
                          'textColor', '#d32f2f', 'text', 'HÀNG DỄ VỠ')
from public.leads l
cross join lateral (select * from public.tape_presets order by sort_order limit 1) p
where l.id::text like '00000000-0000-0000-0000-0000000b000%'
  and not exists (select 1 from public.designs d where d.lead_id = l.id);

-- Lead 1 -> staff, lead 2 -> ctv, lead 3 stays unassigned.
update public.leads set assigned_to = '00000000-0000-0000-0000-00000000a003'
 where id = '00000000-0000-0000-0000-0000000b0001';
update public.leads set assigned_to = '00000000-0000-0000-0000-00000000a004'
 where id = '00000000-0000-0000-0000-0000000b0002';
