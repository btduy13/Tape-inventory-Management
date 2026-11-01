# features/workshop

**Owner:** `workshop` feature builder. Only this feature edits files in this folder.

Workshop ("xưởng") production dashboard: jobs assigned to the logged-in workshop user grouped by
step, job detail with design preview, one-tap next step (+ note), realtime refresh. Admin gets the
same board for all jobs (overview), assigns workshop users and converts leads to production.
"Chuyển sang sản xuất" (convert_lead_to_production) lives here (moved from features/admin).

## Routes

- /portal/xuong (`ROUTES.workshop`)
- /portal/xuong/[id] (`ROUTES.workshopJob`)
- lead detail pages embed `ProductionHandoffPanel` (admin)

## Data (migration 0021)

- rpc `workshop_jobs` (specs only), `convert_lead_to_production`, `assign_production_job`,
  `advance_production_step`
- `production_step_log` (RLS read), Storage `previews` / `logos` (RLS read for assigned jobs)
- never `leads`, `quotes`, legacy tables directly

## Rules

- Pages: `requireRole(ROLE_GROUPS.production)`; Server Actions re-check with `assertRole`.
- Due date: default today + 7, min today (Vietnam date, `lib/dates.ts`); SQL re-checks.
- Step rules in `lib/steps.ts` mirror `production_step_next()` / `advance_production_step()`.
