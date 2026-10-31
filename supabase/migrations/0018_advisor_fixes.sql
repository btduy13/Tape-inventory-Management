-- 0018_advisor_fixes
-- Fixes for `supabase db advisors --local` (2026-11-01). Access rules do not change.
--
-- 1. auth_rls_initplan (WARN): auth.uid() in RLS policies was re-evaluated per row. Wrapped as
--    (select auth.uid()) so Postgres runs it once per statement. Same result.
-- 2. multiple_permissive_policies (WARN): two permissive policies for the same role and action
--    were merged into one with the OR of both. Postgres ORs permissive policies, so the
--    merged expression grants exactly the same rows:
--      profiles UPDATE (authenticated): profiles_update_self + profiles_update_admin
--        -> profiles_update_self_or_admin
--      tape_presets SELECT (authenticated): tape_presets_select_active + tape_presets_select_admin
--        -> tape_presets_select_active stays for anon only;
--           tape_presets_select_authenticated = is_active or is_admin()
-- 3. rls_enabled_no_policy (INFO): quote_tokens and rate_limits are service_role only on purpose.
--    An explicit RESTRICTIVE deny policy for anon/authenticated documents that intent. With no
--    permissive policy the result is unchanged (no rows); service_role bypasses RLS.
-- 4. unindexed_foreign_keys (INFO): covering indexes for the foreign keys it listed.
--
-- Idempotent.

-- 1. initplan ---------------------------------------------------------------------------------
alter policy profiles_select_self_or_manager on public.profiles
  using (id = (select auth.uid()) or public.is_manager_or_admin());

alter policy lead_notes_insert on public.lead_notes
  with check (author_id = (select auth.uid()) and public.can_access_lead(lead_id));

alter policy leads_select on public.leads
  using (public.is_manager_or_admin()
         or (assigned_to = (select auth.uid()) and public.is_internal()));

alter policy leads_update on public.leads
  using (public.is_manager_or_admin()
         or (assigned_to = (select auth.uid()) and public.is_internal()))
  with check (public.is_manager_or_admin()
              or (assigned_to = (select auth.uid()) and public.is_internal()));

-- 2. merge permissive policies ----------------------------------------------------------------
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_update_self_or_admin on public.profiles;
-- Admin: any profile. Others: own row while active (0016). profiles_guard_columns still blocks
-- role / is_active changes by non-admins.
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (public.is_admin() or (id = (select auth.uid()) and public.is_internal()))
  with check (public.is_admin() or (id = (select auth.uid()) and public.is_internal()));

drop policy if exists tape_presets_select_active on public.tape_presets;
drop policy if exists tape_presets_select_admin on public.tape_presets;
drop policy if exists tape_presets_select_authenticated on public.tape_presets;
-- Public designer reads active presets.
create policy tape_presets_select_active on public.tape_presets
  for select to anon
  using (is_active);
-- Logged-in users read active presets; admin also sees inactive ones.
create policy tape_presets_select_authenticated on public.tape_presets
  for select to authenticated
  using (is_active or public.is_admin());

-- 3. explicit deny on service-role-only tables -------------------------------------------------
drop policy if exists quote_tokens_deny_api on public.quote_tokens;
create policy quote_tokens_deny_api on public.quote_tokens
  as restrictive for all to anon, authenticated
  using (false) with check (false);

drop policy if exists rate_limits_deny_api on public.rate_limits;
create policy rate_limits_deny_api on public.rate_limits
  as restrictive for all to anon, authenticated
  using (false) with check (false);

-- 4. covering indexes for foreign keys --------------------------------------------------------
create index if not exists designs_preset_id_idx           on public.designs (preset_id);
create index if not exists lead_assignments_assigned_by_idx on public.lead_assignments (assigned_by);
create index if not exists lead_assignments_assigned_to_idx on public.lead_assignments (assigned_to);
create index if not exists lead_notes_author_id_idx        on public.lead_notes (author_id);
create index if not exists lead_status_log_changed_by_idx  on public.lead_status_log (changed_by);
create index if not exists quotes_created_by_idx           on public.quotes (created_by);
