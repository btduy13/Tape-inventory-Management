# features/workshop

**Owner:** `workshop` feature builder. Only this feature edits files in this folder.

Workshop ("xưởng") production dashboard: jobs assigned to the logged-in workshop user grouped by
step, job detail with design preview, one-tap next step (+ note), realtime refresh. Admin gets the
same board for all jobs (overview), assigns workshop users and converts leads to production.
"Chuyển sang sản xuất" (convert_lead_to_production) lives here (moved from features/admin).

## Routes

- /portal/xuong (`ROUTES.workshop`)
- /portal/xuong/[id] (`ROUTES.workshopJob`)
- /portal/xuong/[id]/phieu-giao (`ROUTES.workshopDeliveryNote`): A5 delivery note + QR
- lead detail pages embed `ProductionHandoffPanel` (admin)

## Data (migrations 0021, 0024)

- rpc `workshop_jobs` (specs only, `order_name` = title), `convert_lead_to_production`,
  `assign_production_job`, `assign_workshop_job` (by job id, lead-less jobs too),
  `advance_production_step`, `create_delivery_note` (raw token only in its response: the Server
  Action turns it into the QR SVG and never returns it as text)
- `production_step_log` (RLS read), Storage `previews` / `logos` (RLS read for assigned jobs)
- never `leads`, `quotes`, legacy tables directly

## Rules

- Pages: `requireRole(ROLE_GROUPS.production)`; Server Actions re-check with `assertRole`.
- Due date: default today + 7, min today (Vietnam date, `lib/dates.ts`); SQL re-checks.
- Step rules in `lib/steps.ts` mirror `production_step_next()` / `advance_production_step()`:
  4 steps (Chờ sản xuất → Đang sản xuất → Sẵn sàng giao → Đã giao). Workshop: next step only,
  no going back, no Đã giao button (the delivery note QR confirms delivery). Admin: any step,
  moving back confirms in red.
- Workshop views show the order name, never order / customer codes; admin gets the code as a
  small second line. The delivery note shows recipient name / phone / address (own job only).
