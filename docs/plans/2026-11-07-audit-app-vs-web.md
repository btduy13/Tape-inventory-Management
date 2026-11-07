# Orders: app vs web parity plan

This plan comes only from the four reports. I re-checked nothing. Where the reports disagree, both versions are given:
- The web report says Docker was down. The customers report reached the local DB: 2 rows in `bang_keo_in_orders` and 3 leads. Locally there is no `bang_keo_orders`, no `truc_in_orders`, no `trg_sync_*` triggers and no `order_attachments`.

## 1. Feature parity matrix

S = under 1 day, M = 1-3 days, L = more than 3 days.

| # | Feature | App (electron) | Web | Gap | Size |
|---|---|---|---|---|---|
| 1 | Order types: printed tape (BKI), plain tape, print axis | Yes, all 3 tables (`db/params.js:4-8`) | BKI only; `production_jobs.order_table` is limited to BKI (0024:104-110) | The 2 other tables are missing on the web, and locally they don't exist at all | L |
| 2 | Create BKI order | `saveBangKeoIn` (bangkeoin.js:255) | `admin_order_create` (0024:1064), `OrderForm.tsx` | Parity, except autocomplete and attachments | — |
| 3 | Create plain-tape / axis order | `bangkeo.js`, `trucin.js` | No | Form and RPC for 2 types | M |
| 4 | Product-name autocomplete and copy last order | `order.suggestNames`, `order.latestByName` (readActions.js:25) | No | Add 1 read RPC and a datalist | S |
| 5 | Edit order, including prices | `submitEditOrder` (app.js:578), recomputes money | No: detail page is read-only, no update RPC | `admin_order_update` and an edit form | M |
| 6 | Freeze money on converted multi-size orders (`quote_items`) | `configureStructuredOrderEdit` (app.js:494) | No | Same rule on the web | S |
| 7 | Toggle Đã giao (delivered) | `order.toggleDelivery` (writeActions.js:229), fires production trigger | Only indirectly, by moving the job to `da_giao`; orders without a job can't be marked | Status RPC and button | S |
| 8 | Toggle Tất toán (settled), with debt recompute | `order.toggleSettlement` (writeActions.js:180) | No | Same | S |
| 9 | Bulk status | Modal, both flags on by default, not atomic (thongke.js:1335) | No | Bulk RPC: atomic, each flag optional | S |
| 10 | Delete order and its attachments | `order.delete` + `attachment.deleteForOrder` | No | RPC, and the trigger already handles jobs | S |
| 11 | Create a multi-size quote (`quote_items`, several axes) | quotations.js:420-1059 | Leads have their own quote system (`quotes` table); no app-style quote | Large if ported fully | L |
| 12 | App quote list (`is_quote`) | `quote.list` | Excluded (0024:~990) | Quotes tab | S |
| 13 | Convert quote to order | `quote.convertToOrder`, delivery date always tomorrow | No | RPC with a date picker | S |
| 14 | Delete quote | Yes | No | Same RPC as #10 with an `is_quote` guard | S |
| 15 | Quote PDF | A4 iframe + `printToPdf` | react-pdf exists, but only for lead quotes | Template for `quote_items` | M |
| 16 | Order list: type subtabs, filters, column sort, overdue highlight | thongke.js | One type, fixed sort, no highlight | List UI | M |
| 17 | Multi-select and selection total | Yes (thongke.js:264, :75) | No | Part of the list UI | S |
| 18 | Summary or KPI cards (debt, supplier debt, net profit, due soon) | `stats.warningMetrics` (readActions.js:466) | No | Summary RPC and bar | S |
| 19 | Dashboard: monthly KPIs, trend chart, product doughnut, attention cards | dashboard.js | No | Admin overview page | M |
| 20 | Excel export | `exportStatsExcel` (thongke.js:895) | No | CSV export is enough (see section 4) | S |
| 21 | Excel import with template | excelImport.js | No | Defer, stays in the app | L |
| 22 | Order form / delivery note print and PDF (combined, editable lines) | exportManager.js | Web has QR delivery notes per job only (`create_delivery_note`) | Print view for an order | M |
| 23 | Attachments (bytea, up to 25MB) | `attachment.*` | No; the table doesn't exist locally | RPC or route and UI | M |
| 24 | Email to workshop over SMTP, with history and `da_gui_email` | emailDialog.js, main.js:1108 | No (Resend exists for leads) | Defer or redesign | L |
| 25 | Push "Chưa vào xưởng" order to workshop (the 21 legacy orders) | n/a | No RPC or button | `admin_order_send_to_workshop` | S |
| 26 | Assign a workshop user from the order page | n/a | Only from the job page | Reuse `assign_workshop_job` on the detail page | S |
| 27 | Cancel (`huy`) or move step from the order page | n/a | Only from `/portal/xuong/[id]` | Inline step control | S |
| 28 | Live sync between web and app | F5 / manual refresh | No realtime; order tables are not in the `supabase_realtime` publication | Polling on the web; optional auto-refresh in the app | S |
| 29 | Customer entity (1 customer, many orders) | None; free text, autofill by product name | None; free text, and leads link to only 1 order | New table, FK, backfill, UI | L |
| 30 | "Băng keo Thank you" tab | None | None | Owner must define the product | S-M |
| 31 | `cong_no_ncc` (supplier debt) on insert and update | Filled by prod triggers (main.js:386-447) | Prod triggers fill it; local DB doesn't have them | The web RPC must compute it explicitly | S |
| 32 | Deposit (`tien_coc`) on plain tape and axis | Missing, so debt ignores deposits | n/a | Decision (Q7) | S |
| 33 | Plain-tape edit: `mau_keo` missing | Bug: it reuses the axis generator | n/a | Electron fix | S |
| 34 | Command palette and shortcuts | Yes | No | Skip (ponytail) | — |

## 2. Work packages

Order: DB first, then the web layer, then UI. Each WP lists the files it owns. Two WPs never edit the same file at the same time; a later WP may touch a file only after the earlier one has merged.

**WP0. Local DB parity, no product change (S)**
- New migration `supabase/migrations/0025_legacy_order_tables.sql`. Guard every statement with `to_regclass ... is null`, so it does nothing on production.
- It creates `bang_keo_orders`, `truc_in_orders`, `order_attachments` and `email_history` using the production column set. Source: `electron/main.js:276-462` and the untracked `electron/scripts/migrate_v2_orders.sql`.
- It also ports the `sync_*_debt` functions and the `trg_sync_*` triggers, with `search_path=''` and EXECUTE revoked (0019 P4).
- Add a pgTAP check that the debt formulas match `orderMath.js:156-168`.
- Why: without this, nothing in WP1 can be tested locally against 3 tables.
- Depends on: nothing.

**WP1. Order RPCs, generic over the 3 tables (M)**
- One migration, `0026_admin_order_rpcs.sql`. Every RPC takes `p_type in ('bang_keo_in','bang_keo','truc_in')` and checks it with an IF/CASE on a whitelist. No dynamic table names from input.
- RPCs:
  - `admin_orders_list` v2: UNION of the 3 tables. Params: `p_type`, `p_is_quote`, filters, sort key and direction from a whitelist. Returns one totals row (Σ revenue, Σ `cong_no_khach` unsettled, Σ `cong_no_ncc`, Σ net profit, due-soon and overdue counts). This replaces separate KPI RPCs (covers #16, #18).
  - `admin_order_update`: same column whitelist as `orderColumns.js:12-40` minus `UPDATE_EXCLUDED`. Recomputes `cong_no_khach` and `cong_no_ncc` in SQL, identical to the triggers, so it works with or without them. Refuses money changes when `quote_items` is non-empty (#5, #6).
  - `admin_order_set_status(p_type, p_ids text[], p_da_giao bool null, p_da_tat_toan bool null)`: atomic. A null flag means "leave as is". Debt logic follows `writeActions.js:168-180`. A `da_giao` change fires the existing production trigger (#7-9).
  - `admin_order_delete(p_type, p_ids, p_quote_only bool)`: also deletes from `order_attachments` (#10, #14).
  - `admin_quote_convert(p_type, p_id, p_ngay_du_kien date)`: generates the ID with retry, moves attachments (#13).
  - `admin_order_send_to_workshop(p_id, p_workshop_user_id null)`: inserts the `production_jobs` row the trigger would have made (#25).
  - `admin_order_name_suggest(p_type, q)` and `admin_order_latest_by_name` (#4).
- Extend `admin_order_create` to the 3 types and to `is_quote`.
- All RPCs are admin only (Q1), SECURITY DEFINER, `search_path=''`, and run `set local app.production_sync` only where needed.
- Files: the new migration and `supabase/tests/*`.
- Depends on: WP0.

**WP2. Customers schema and backfill (M-L)**
- Migration `0027_customers.sql`, following the customers report §2:
  - `normalize_vn_phone`, the `customers` table, nullable `customer_id` FK (ON DELETE RESTRICT) on the 3 order tables and on `leads`;
  - guard-trigger updates (0003:104, 0013:51);
  - `orders_resolve_customer()` BEFORE trigger: links only on an exact phone match, never raises (exception handler);
  - `admin_customer_*` RPCs: list with debt and order count, get with orders, create, update, merge.
- Change `admin_order_create`, `admin_order_update` and `convert_lead_to_production` to accept or resolve `customer_id`.
  - This is a `create or replace` on WP1 functions, so it must merge after WP1. Do not run it in parallel.
- Backfill: a separate script in `supabase/scripts/customers_backfill.sql`. First a dry run into `customer_match_candidates`, then the apply step, logged in `customer_backfill_log`. Run it only after the owner signs off on the dry-run output from a production dump.
- Depends on: WP1. The backfill also depends on Q4.

**WP3. Web data layer (S)**
- Files: `web/src/features/admin-orders/server/{queries,mutations,actions}.ts`, `lib/schemas.ts`, `lib/types.ts`.
- Add typed wrappers and zod for every WP1 and WP2 RPC.
- At the same time, remove the duplicated `listWorkshopUsers` (import it from `workshop/server/queries.ts`) and the duplicated `ORDER_STEPS`. Use `lib/types.ts:27 ProductionStep`.
- `order-math.ts`: add `calculateStandardOrder` if it is missing, and extend `order-math.parity.test.ts`.
- Depends on: WP1. Customer wrappers come after WP2.

**WP4. Orders list UI (M)**
- Files: `components/OrdersView.tsx`, `lib/list-spec.ts`, `lib/copy.ts`, and a new `OrdersToolbar.tsx`.
- Tabs: BKI | Băng keo | Trục in | Báo giá | Thank you (Q2).
- Summary bar from the list totals row. Sortable columns. Red/amber highlight for overdue and due soon.
- Checkbox multi-select with a selection total. Row and bulk actions: delivered, settled, delete (with confirm), convert quote (date picker).
- CSV export of the filtered or selected rows.
- Refresh with `router.refresh()` every 30 s plus on window focus. Same pattern as `WorkshopLiveRefresher`, no realtime publication change. That would need the owner of the app-owned tables.
- Use one `STEP_TONE` from portal-ui. Remove `admin-orders/lib/copy.ts:5,16`, which fixes the colour mismatch between `/admin/don-hang` and `/portal/xuong`.
- Depends on: WP3.

**WP5. Order form: create and edit for 3 types, plus quote mode (M)**
- Files: `components/OrderForm.tsx`, `NewOrderView.tsx`, a new `EditOrderView.tsx`, and routes `/admin/don-hang/moi?type=` and `/admin/don-hang/[id]/sua`.
- Type switch, product autocomplete with "copy last order", deposit (`tien_coc`) for BKI.
- Single-size quote mode only. Multi-size `quote_items` stays read-only on the web: list it, show its PDF, convert it (Q6).
- Use `vnToday()` + `addDays()` from `workshop/lib/dates.ts` instead of `vnDay`.
- Add the customer picker once WP2 and WP3 are merged.
- Depends on: WP3, and WP2 for the picker.

**WP6. Order detail actions (S)**
- File: `components/OrderDetailView.tsx`.
- Status buttons: Đã giao, Tất toán, Sửa, Xoá.
- "Đưa vào xưởng" button for orders without a job.
- Workshop assignee select and inline step move, including Huỷ. Reuse the `workshop/server/actions.ts` actions `assignJobAction` (:101) and the admin step move.
- Customer link.
- Depends on: WP3. Do not run in parallel with WP4 if both touch `copy.ts`; assign `copy.ts` to WP4.

**WP7. Customers UI (M)**
- New feature folder `web/src/features/customers/` and routes `/admin/khach-hang` and `/admin/khach-hang/[id]`.
- List with search, debt and order count. Detail page with all orders across the 3 tables, create and edit, and a merge review list for the backfill leftovers.
- Edits `portal-ui/lib/nav.ts` and `lib/routes.ts`.
- Depends on: WP2 and WP3.

**WP8. Print and PDF for order form and delivery note (M)**
- New `admin-orders/server/pdf/` reusing the react-pdf setup in `quotes/server/pdf`. Port `generateCombinedPrintInvoice` (exportManager.js:560) and `toVietnameseWords`.
- Add a quote PDF for `quote_items` rows.
- Depends on: WP3.

**WP9. Dashboard KPIs on `/admin` (S-M)**
- New `admin_dashboard` RPC: the month metrics, attention items and trend data from readActions.js:41-160.
- Replace the dead `AdminOverview` (see section 4).
- Depends on: WP1.

**WP10. Attachments (M), optional**
- Upload, download and delete through a route handler and a service RPC on `order_attachments`, 25MB cap.
- Depends on: WP0 (the table exists locally) and WP6 (the detail page). Q8.

**WP11. Electron follow-ups (S each)**
- Auto-refresh the Thống kê tab every N s or on focus, so web changes show without F5 (thongke.js).
- Fix the missing `mau_keo` on plain-tape edit (app.js:446).
- Quote convert date prompt (quotations.js:1422).
- Bulk status: per-flag choice, and wrap it in `dbTransaction` (thongke.js:1335).
- Optional customer picker, Option 2 in the customers report §4: `orderColumns.js:6`, the column lists in 5 modules, `customer.search`, and a grant to `electron_app`. Q5.
- Depends on: WP2 for the picker only.

**WP12. Ponytail deletions (S)**
- See section 4. Run the electron part separately from WP11, and the web part after WP4-WP6 have merged, to avoid conflicts in `admin-orders`.

**Deferred** (stays app-only unless the owner asks): Excel import (#21), SMTP email (#24), multi-size quote builder (#11), command palette.

## 3. Open questions for the owner

1. **Who may edit prices, delete orders and change status on the web?** Admin only, or admin and manager (the pricing group)?
2. **What exactly is "băng keo Thank you"?**
   - Is it a stock pre-printed BKI design, a plain-tape SKU, or its own product with its own fields: sizes, colours, pricing per roll or per carton, stock on hand?
   - Is it priced from the BKI formula (`/90 * quy_cach_m / cuon_cay`) or from a fixed price list?
   - Does it go through the workshop?
   - Options:
     - (a) a `nhom_hang` / `product_line` column on the existing tables; the tab is a filter (cheapest);
     - (b) a filter on `ten_hang ILIKE '%thank you%'`, with no schema change but fragile;
     - (c) a new table and new type, needed only if it has its own stock or price list.
   - Recommendation: (a), unless stock tracking is needed.
3. **Should plain-tape and axis orders go to the workshop?** Today the constraint at 0024:104-110 allows BKI only. Widening it changes `production_jobs`, the sync trigger and the workshop UI.
4. **How should old orders be matched to customers?**
   - Is auto-linking on a normalized phone alone OK?
   - How should orders with a shared office phone or a reseller be handled?
   - Should rows without a phone get one customer per exact name, or stay unlinked?
   - Should old quotes be linked?
   - Is it OK to run the dry run on a restored production dump?
5. **Should Electron get a customer picker?** Option 1: a DB trigger links silently and the app is unchanged. Option 2: a picker in the app, which needs a grant to `electron_app` and a new app release.
6. **Is multi-size quote creation needed on the web?** This is the largest item. The recommendation is to keep it in the app for now; the web lists, shows the PDF and converts.
7. **Deposit on plain-tape and axis orders.** Should they get `tien_coc`? That changes the debt formula in the app, the web and the prod triggers.
8. **Attachments on the web.** Are they needed, and should the 25MB bytea limit stay or move to Storage?
9. **Email from the web.** Drop it, or move it to Resend? The default recipient `tque197@gmail.com` and the signature are hardcoded today.
10. **The 21 legacy "Chưa vào xưởng" orders.** Push them one at a time with a button, or bulk-push the undelivered ones? Which workshop account? Production has none yet.
11. **Live sync expectation.** Is a 30 s poll on the web plus an auto-refresh in the app enough, or is true realtime required? Realtime means adding the app-owned tables to the publication as their owner.
12. **Excel import.** Keep it app-only?
13. **`/mau` landing variants.** They are public in production. Delete them, or keep them for design comparison?

## 4. Ponytail deletions safe to do

Each item below was grep-checked by the audit. "Breaks nothing" is the audit's claim.

**Repository**
- `git rm -r --cached .codex-tmp` and add it to `.gitignore`. 15,545 tracked files; only `analyze.mjs` is real and nothing references it.
- `js/ui-interactions.js` at the repo root (682 lines). Never loaded.
- `RD` submodule: an empty gitlink. Remove it from `.gitmodules` and from the index.
- `web/public/{file,globe,next,vercel,window}.svg`.
- Disk only, not tracked: `web/test-results/`, `electron/x/`, `electron/dist-release-152`, `dist`, `installer_package`, `venv_build`, root `*.exe` and `*.zip`.

**Web: dead code**
- `features/admin/components/sections.tsx`, `StatusCounts.tsx`, `server/queries.ts:31 countByStatus`, `:38 leadStatusCounts`, and the barrel line `admin/index.ts:2`. WP9 replaces the overview.
- `features/orders/server/load.ts:16 loadLeadList` and `queries.ts:12,14,39`, plus the barrel lines `orders/index.ts:8-9`.
- `orders/components/LeadsLiveRefresher.tsx` and its test, plus `orders/index.ts:5`.
- `lead-intake/server/notify.ts:34 noopNotifier`.
- `admin/server/tape-specs.ts:35 getLengthLimits`.
- `designer/server/presets.ts getActivePresets` and its test. It duplicates `listActivePresets`.
- Dead types: `SchemaDriftCheck`, `LeadFieldsInput`, `LoginInput`, `ResetRequestInput`, `UpdatePasswordInput`, `QuoteLineInput`, `SaveDraftData`, `RespondInput`.
- Test-only exports, deleted together with their tests:
  - `workshop/lib/group.ts` (whole file)
  - `mockup3d/lib/ribbon.ts` (whole file)
  - `canMoveTo`, `isWorkshop`, `canUseWorkshop`, `timingSafeEqual`, `stripTextureMapping`, `leadIdSchema`, `ScrollRegion`, `toggleFilterValue`, `PHASE_OF`
- `/admin/_kit` page and `portal-ui/demo/*`, plus the barrel line `portal-ui/index.ts:28` and the mention in `DESIGN.md:4`.

**Web: merge duplicates (done inside WP3 and WP4)**
- `STEP_LABEL` becomes `t.productionStep`.
- Keep one `STEP_TONE`, the portal-ui one.
- `PRODUCTION_FLOW` becomes `FLOW_STEPS`.
- Keep one `listWorkshopUsers`.
- `vnDay` becomes `vnToday()` + `addDays()`.
- Move `instantVn` to a shared lib, used by 6 call sites.
- `money` becomes `formatVnd`.

**Electron**
- `thongke.js:1314-1319`: 5 compat aliases with no callers.
- `quotations.js:699 quoteDateInputValue`.
- `excelImport.js:686 insertBangKeoInImport` and `:691 insertSimpleImport`. Switch `test/excelImport.test.js:36,52` to `build*ImportStatement` first.
- HTML escaping: 4 copies, all replaced by `utils.escapeHtml`:
  - `app.js:340 escapeAppHtml`
  - `exportManager.js:9 escapeExportHtml`
  - `quotations.js:1049 escapeQuoteHtml`
  - the local copy at `utils.js:308`
- Date wrappers: replace with `utils.tomorrowDateInputValue` / `utils.toDateInputValue`. First check that the vm tests inject `utils`.
  - `bangkeoin.js:538`
  - `excelImport.js:105,113`
  - `quotations.js:701,1362`
  - `exportManager.js:502`
  - `thongke.js:937`

**Do not delete**
- The three copies of the order math (`orderMath.js`, `order-math.ts`, SQL). They are guarded by a parity test.
- Any dependency. All of them are used.
- `electron/db` actions. All 32 have callers.

**Ponytail scope cuts in the plan above**
- One generic RPC set with `p_type`, instead of 3 copies per table.
- Polling instead of realtime.
- CSV instead of an xlsx library.
- The list RPC returns the KPI totals, so there are no separate KPI RPCs.
- Excel import, SMTP email and the multi-size quote builder stay in the app.