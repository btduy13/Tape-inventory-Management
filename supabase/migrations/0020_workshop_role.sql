-- 0020_workshop_role
-- New role `workshop` (xưởng sản xuất) for production-floor users.
--
-- Kept in its own migration: a value added by ALTER TYPE ... ADD VALUE cannot be used in the
-- same transaction, and 0021 uses it in function bodies, policies and checks.
--
-- What the role can do is defined in 0021_production_jobs.sql:
--   * no access to leads, designs, quotes, notes or any price / customer column;
--   * reads ONLY the production jobs an admin assigned to it, through RLS on production_jobs
--     and the SECURITY DEFINER RPC workshop_jobs() (fixed column list: specs, no prices);
--   * converts its own assigned, accepted leads to production and advances production steps.
-- handle_new_user() (0011) accepts the value from app_metadata.role like every other role.
-- assign_lead() (0004) does not accept workshop users as lead assignees.
--
-- Idempotent.

alter type public.app_role add value if not exists 'workshop';
