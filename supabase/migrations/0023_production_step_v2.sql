-- 0023_production_step_v2
-- Workshop v2 (docs/plans/2026-11-03-xuong-v2.md, part A): production steps merge into four
--   cho_san_xuat -> dang_san_xuat -> san_sang_giao -> da_giao   (+ huy, admin only).
--
-- Kept in its own migration: a value added by ALTER TYPE ... ADD VALUE cannot be used in the same
-- transaction, and 0024 moves jobs to it and uses it in function bodies.
-- The retired values dang_in / dang_cat_cuon / dong_goi stay in the enum (Postgres cannot drop
-- enum values, and production_step_log keeps them as history); 0024 blocks them on jobs.
--
-- Idempotent.

alter type public.production_step add value if not exists 'dang_san_xuat' after 'cho_san_xuat';
