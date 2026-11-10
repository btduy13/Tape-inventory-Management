-- Commit the enum value before functions in the next migration reference it.
alter type public.production_step add value if not exists 'da_san_xuat' before 'san_sang_giao';
