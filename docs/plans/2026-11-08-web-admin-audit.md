# Web admin audit (2026-11-08)

Read-only audit of the Next.js web admin against the owner's complaints. All paths are relative to `web/src` unless they start with `supabase/` or `electron/`. Nothing was run against the remote DB or Vercel, so production row counts are not verified.

Owner complaints, in short:
1. The order list is cluttered.
2. The create form differs from the app.
3. The BKI + trục tree is missing.
4. The web has no delivery-note export.
5. The Customers tab is empty.
6. There is no per-user tab control.
7. The UI is slow.

## 1. Current web admin: pages, components, columns, forms

### 1.1 Routes (`app/(portal)/admin/**`)

| Route | File | Body component | Gate |
|---|---|---|---|
| `/admin` (overview) | `app/(portal)/admin/page.tsx:14-31` | `AdminDashboard` + `LeadOverview` + `LeadList` | admin |
| `/admin/don-hang` | `app/(portal)/admin/don-hang/page.tsx:10-13` | `features/admin-orders/components/OrdersView.tsx` | admin (layout + page) |
| `/admin/don-hang/moi?type=&quote=1` | `app/(portal)/admin/don-hang/moi/page.tsx:10-14` | `NewOrderView.tsx` and `OrderForm.tsx` | admin |
| `/admin/don-hang/[id]` | `app/(portal)/admin/don-hang/[id]/page.tsx` | `OrderDetailView.tsx` | admin |
| `/admin/don-hang/[id]/sua` | `app/(portal)/admin/don-hang/[id]/sua/page.tsx` | `EditOrderView.tsx` and `OrderForm.tsx` | admin |
| `/admin/khach-hang` | `app/(portal)/admin/khach-hang/page.tsx:10-13` | `features/customers/components/CustomersView.tsx` | admin |
| `/admin/khach-hang/[id]`, `/gop` (merge), review | `app/(portal)/admin/khach-hang/**` | `CustomerDetailView`, `MergeForm`, `ReviewView` | admin |
| `/admin/users` | `app/(portal)/admin/users/page.tsx:7-10` | `features/admin/components/users/UsersView.tsx` | admin |
| `/admin/quy-cach`, `/admin/presets` | `app/(portal)/admin/quy-cach/page.tsx`, `presets/page.tsx` | `TapeSpecsView`, presets | admin |
| `/admin/leads/[id]` | `app/(portal)/admin/leads/[id]/page.tsx` | lead detail | pricing (admin + manager) |
| `/portal/xuong`, `/portal/xuong/[id]`, `/portal/xuong/[id]/phieu-giao` | `app/(portal)/portal/xuong/**` | workshop board, job, delivery note | production (admin + workshop) |

`loading.tsx` files exist for `admin/`, `admin/don-hang/`, `admin/khach-hang/`, `admin/users/`, `admin/presets/` and `admin/quy-cach/`. `don-hang/[id]`, `moi` and `sua` have none, so they show the list skeleton from `don-hang/loading.tsx`.

### 1.2 Order list (`/admin/don-hang`)

- `OrdersView.tsx:27-96` is a server component with these parts:
  - `<OrdersAutoRefresh/>` (`:56`).
  - `PillNav` tabs for the 4 types + Báo giá + Tất cả (`:58`).
  - `StatGrid` with 7 KPI cards (`:59-69`): count, total, customer debt, supplier debt, net profit, overdue, due soon.
  - `FilterBar` with search, date range, step (BKI only), delivered, settled and due filters (`:44-52`, `:71-80`).
  - `OrdersTable` (`:81-92`).
- `OrdersTable.tsx` is a `"use client"` component. Its columns are defined at `:163-214`:

| # | Key | Header (`lib/copy.ts:61-73`) | Shown when | Content |
|---|---|---|---|---|
| 1 | select | Chọn | always | checkbox (`:164-169`) |
| 2 | order | Đơn hàng | always | name, plus `id · quy cách · nhiều size` (`:170-177`) |
| 3 | type | Loại | tab = quote or all | type label (`:178`) |
| 4 | step | Xưởng | tab = BKI | `OrderStepBadge` + "chưa giao thợ" (`:179-186`) |
| 5 | customer | Khách hàng | always | name + phone (`:187-192`) |
| 6 | date | **Ngày lên** | lg+ | `dateTimeVn(thoi_gian)`, **date + time** (`:193`) |
| 7 | due | Giao dự kiến | always | date + overdue/soon badge (`:194-202`) |
| 8 | qty | Số lượng | xl+ | (`:203`) |
| 9 | total | Tổng tiền | always | (`:204`) |
| 10 | debt | Công nợ | always | green badge `Đã tất toán` when `da_tat_toan`, otherwise `money(cong_no_khach)` (`:205-206`) **(already matches the request)** |
| 11 | profit | Lãi ròng | xl+ | (`:207-209`) |
| 12 | status | Trạng thái | not quotes, lg+ | `OrderStatusBadges`: 2 badges, delivered/not + settled/not (`:210-212`, `badges.tsx:44-52`) |
| 13 | origin | **Nguồn** | BKI, 2xl+ | `OriginBadge` app/web (`:213`, `badges.tsx:39-41`) |

There is also a selection toolbar (`:230-260`) with "select page", the selection total, `OrderActions` bulk actions and CSV export. Rows are tinted red/amber by due date (`:266-269`).

Status is spread over 3 columns: Xưởng (step), Trạng thái (2 badges) and the due-date badge.

### 1.3 Order form (`OrderForm.tsx`, client)

- **Layout.** 2 columns: fieldsets on the left, a sticky totals card and the Save button on the right (`:144`, `:222-228`).
- **Customer section (all types).** It holds these fields (`:151-186`):
  - `CustomerPicker`.
  - `ten_hang`, with a datalist suggestion debounced at 300 ms and a "Chép đơn gần nhất" button.
  - `ngay_du_kien`, `ten_khach_hang`, `sdt_khach_hang`, `dia_chi_khach_hang`.
- **Per-type groups** (`GROUPS`, `:31-45`):
  - `bang_keo_in`:
    - Quy cách: `quy_cach_mm`, `quy_cach_m`, `quy_cach_mic`, `cuon_cay`, `so_luong`, `mau_keo`, `mau_sac`.
    - Chi phí: `don_gia_von`, `phi_sl`, `phi_keo`, `phi_mau`, `phi_size`, `phi_cat`.
    - Bán: `don_gia_ban`, `vat_percent`, `tien_coc`.
    - CTV: `ctv`, `hoa_hong`, `tien_ship`, `loi_giay`, `thung_bao`.
  - `bang_keo` / `truc_in`:
    - Quy cách: `quy_cach`, `so_luong`, `mau_sac` (+ `mau_keo` for truc_in).
    - Giá: `don_gia_goc`, `don_gia_ban`, `vat_percent`.
    - CTV: `ctv`, `hoa_hong`, `tien_ship`.
  - `thank_you`:
    - `kich_thuoc`, `mau_sac`, `so_luong`.
    - `don_gia_von`, `don_gia_ban`, `vat_percent`, `tien_coc`.
    - CTV group.
    - `ghi_chu` (`:200-206`).
- **BKI trục.** A separate "Trục" fieldset sits **after** all money groups (`:190-198`). It has a `<select loai_truc>` with cu/moi. With `moi` it shows `AXIS_FIELDS` (`:47-50`): `ten_truc`, `truc_chu_vi`, `truc_so_luong`, `truc_gia_goc`, `truc_gia_ban`, `truc_vat_percent`, `truc_ctv`, `truc_hoa_hong`.
- **BKI workshop.** On create only (not quotes), BKI also gets `workshop_user_id` and `production_note` (`:208-219`).
- **Computed values.** Only the sidebar `OrderTotals` shows them (`form-totals.ts`). The fieldsets show no inline read-only fields.
- **Required fields** (`:53-58`): `ten_hang`, `ten_khach_hang`, `ngay_du_kien`, `so_luong`, `don_gia_ban`. BKI adds `quy_cach_m` and `cuon_cay`. BK/TI add `don_gia_goc`. Axis "moi" adds `ten_truc`, `truc_so_luong`, `truc_gia_goc`, `truc_gia_ban` (`:51`).

### 1.4 Order detail (`OrderDetailView.tsx:90+`)

- Sections: actions, summary, customer, spec, quote items, money, axis (`secAxis`), workshop and delivery notes.
- Delivery notes are only **listed** (`:142-157`), with status and photo link. There is no print/export button. The only path to a printable note is "Mở xưởng" (`:118`), then `/portal/xuong/[id]`, then `phieu-giao`. That path needs a job, so it works for BKI only.
- It also mounts `<OrdersAutoRefresh/>` (`:124`).

### 1.5 Customers

- `CustomersView.tsx:38` calls `admin_customers_list`. The SQL is in `supabase/migrations/0028_customers.sql:657-732`.
- **Why the list is empty.** The list shows only rows of `public.customers`. Old orders get linked only by the owner-run `supabase/scripts/customers_backfill.sql`:
  - `customer_backfill_dry_run()` fills `customer_match_candidates`.
  - `customer_backfill_apply()` creates or links the `auto` matches.
  - `review` rows wait in `ReviewView`.
- New orders link by phone through trigger `orders_resolve_customer` (0028:108).
- Until the backfill runs on prod, the list stays empty: 0 customers. This is a data step, not a UI bug.

## 2. User / role model

- **Enum.** `public.app_role` = `admin | manager | staff | ctv` (`supabase/migrations/0001_profiles_roles.sql:10`). `workshop` was added in `0020_workshop_role.sql:17`.
- **`public.profiles`** (`0001:12-21`) has these columns:
  - `id` (FK `auth.users`), `email`, `full_name`, `phone`.
  - `role app_role default 'ctv'`, `is_active`.
  - `created_at`, `updated_at`.
  - There is **no** column for per-user tab or permission overrides.
- **SQL helpers:**
  - `is_admin()` (`0001:57`), `is_manager_or_admin()` (`0001:68`), `is_internal()` (`0001:79`), `is_service_call()` (`0011:24`).
  - `is_staff_of(lead)` (`0003:65`), `is_workshop()` (`0021:133`).
  - The order and customer RPCs check `is_admin()` and raise 42501 otherwise. Example: `admin_orders_list` (`0026:403`).
- **TS role groups** (`lib/auth/roles.ts:4-19`):
  - `admin`, `pricing` (admin + manager), `field` (staff + ctv), `internal`.
  - `workshop`, `production` (admin + workshop), `portal`.
  - `hasRole` is at `:21`.
- **Page gates:** `requireRole()` / `assertRole()` (`lib/auth/require-role.ts:43-65`). Both call `getCurrentProfile()` (`lib/supabase/server.ts:38-45`), which does `auth.getUser()` + `profiles.select('*')`.
- **Proxy:** `src/proxy.ts:11-38` handles 3 things:
  - It builds the CSP nonce.
  - It calls `updateSession` (`lib/supabase/proxy.ts:16-44`), which does `auth.getUser()` on every matched request.
  - It optimistically redirects anonymous users to `/login` for protected paths.
  - It does no role checks.
- **Navigation:** `AppShell` (`features/portal-ui/components/AppShell.tsx:44-76`) renders `NavLinks role=...`.
  - Tabs come from `navFor(role)` in `features/portal-ui/lib/nav.ts:96-127`, a hard-coded switch per role.
  - admin gets Tổng quan, Leads, Xưởng, Đơn hàng, Khách hàng, plus the settings Users, Quy cách, Presets.
  - manager gets Leads. staff and ctv get "Leads của tôi". workshop gets "Việc của tôi".
  - There is no per-user override.
- **Existing user management:** `/admin/users` (`UsersView.tsx:44-106`). It has 4 parts:
  - A list with role and status filters and stats per role.
  - `InviteUserDialog` (invite by email + role, `server/users.ts:25`).
  - `UserActions`, which changes role and active/locked via `updateUser` (`server/users.ts:55-58`: `.update({ role, is_active })`).
  - `RoleMatrix`, a **display-only** table from `features/admin/lib/permissions.ts`.
- **Gap for "choose which tabs each user sees".** It needs 4 pieces:
  - Storage: for example `profiles.nav_tabs text[]`, or a `user_permissions` table.
  - `navFor` changed to filter by that list.
  - Every page gate changed to honour it. Today `requireRole` only checks the role.
  - RLS / RPC changes for any tab that lets a non-admin read orders. The order RPCs are hard-coded admin-only.

  Hiding tabs alone is cosmetic. Opening Đơn hàng to a non-admin would also need SQL changes.

## 3. Performance suspects (ranked)

1. **`admin_orders_list` does a full scan on every call.** It is defined at `supabase/migrations/0026_admin_order_rpcs.sql:338-548`.
   - It runs a `UNION ALL` over all 4 order tables (`:454-507`).
   - Then a left join to `production_jobs` and `profiles` (`:511-512`).
   - Then `ilike '%q%'` on 4 columns (`:514-515`) and `o.thoi_gian::date` range filters (`:522-523`).
   - Then 7 window aggregates `over ()` across the whole filtered set (`:530-536`).
   - Then a `CASE`-expression `ORDER BY` (`:538-545`) that no index can serve.
   - Only `thank_you_orders(thoi_gian)` has an index (`0027:75`).

   Every page load, filter change and 30 s poll pays this cost, and it grows with order count.
2. **30 s polling plus double refresh on focus.** `OrdersAutoRefresh.tsx:12-24` calls `router.refresh()` every 30 s. It also calls it on both `visibilitychange` and `focus`, so returning to the tab fires it **twice**. Each refresh re-renders the whole RSC tree, all layouts included. It is mounted on the list (`OrdersView.tsx:56`) and on the detail page (`OrderDetailView.tsx:124`).
3. **Repeated auth round trips per request.** `getCurrentProfile()` (`lib/supabase/server.ts:38-45`) is not wrapped in React `cache()`. On `/admin/don-hang` it runs 3 times:
   - `admin/layout.tsx:12`.
   - `don-hang/layout.tsx:7`.
   - `don-hang/page.tsx:11`.

   Each run is `auth.getUser()` (a network call to Supabase Auth) + a `profiles` select. Adding the proxy's `getUser()` (`lib/supabase/proxy.ts:43`), that is **4 Auth calls + 3 profile queries before any data**, repeated on every 30 s refresh.
4. **Sequential queries in the list.** `listOrders` (`features/admin-orders/server/queries.ts:40-49`) awaits the RPC, then runs a second query, `firstNotes` on `production_step_log` (`:65-75`), only to compute the "Nguồn" badge. Removing the Nguồn column also removes this round trip.
   - `OrdersView.tsx:32` also loads `listWorkshopUsers` on every refresh. It is needed only for bulk assign and could be loaded lazily.
5. **Sequential queries in detail and edit.**
   - `OrderDetailView.tsx:92-102`: `getOrder`, then `Promise.all(photos, workshopUsers, customerName)`.
   - `EditOrderView.tsx:17-35`: `getOrder`, then `getCustomerName`.

   `admin_order_get` could return the customer name itself.
6. **The customer list and picker aggregate every order.**
   - `admin_customers_list` (`0028:657-732`) groups `customer_order_rows()` (`0028:574-622`), a UNION ALL of all 4 tables, for every call.
   - The same RPC drives `CustomerPicker` search (`CustomerPicker.tsx:36-37`, `queries.ts:113-117`) on every debounced keystroke.
7. **The whole app is dynamic.**
   - `app/layout.tsx:32` calls `await connection()` for the CSP nonce, so nothing is static or cached and every navigation is a full server render.
   - No `unstable_cache` / `"use cache"` is used anywhere.
   - Accepted for CSP, but it makes points 1–3 count on every click.
8. **The overview page is heavy.** `/admin` (`admin/page.tsx:17-21`) runs `admin_dashboard` (UNION ALL of the 4 tables + job/lead counts, `0029:37-77`), `loadOverview` and `loadLeadListPage` in parallel. The lead list's realtime subscription then refreshes the whole page.
9. **Loading skeletons.** Detail, new and edit pages have no `loading.tsx` of their own, so they show the list skeleton. The page feels like it jumps, and that reads as slow.
10. **Client bundle.** The list ships a moderate amount of client code: `OrdersTable` (client) imports `OrderActions`, `Toast` and the CSV builder. That is fine at a 25/50/100 page size (`list-spec.ts:34`). The order list **is** paginated in SQL, so it is not a suspect. `UsersView` filters in memory, but the user count is small.

Cheapest wins, in order:
- Wrap `getCurrentProfile` in `cache()`.
- Drop the duplicate `focus` listener and raise the poll to 60 s, or poll only the list.
- Remove the Nguồn column + `firstNotes`.
- Add indexes, or a lighter count query, for `admin_orders_list`. Compute totals only on page 1, or in a separate RPC that is not polled.

## 4. Gap list vs the Electron app

App sources:
- List: `electron/js/modules/thongke.js` (summary columns `:9-20`, render `:300-382`, axis child row `:221-263`).
- BKI form: `electron/index.html:261-476`.
- Export: `electron/js/modules/exportManager.js`.

### 4.1 Order list

| Item | App | Web now | Gap / owner request |
|---|---|---|---|
| Columns | 10 fixed: Mã, Ngày đặt, Tên, Khách, Ngày giao, Công nợ khách, Nợ NCC, Giao hàng, Tất toán, Đã Email (`thongke.js:9-20`) | 9–13 by tab and breakpoint (§1.2) | Fewer, fixed columns |
| Nguồn column | none | `OrdersTable.tsx:213` | **Remove** (and `firstNotes`, `queries.ts:43,65-75`) |
| Ngày lên | `utils.formatDate` (date only, `thongke.js:369`) | `dateTimeVn` (`OrdersTable.tsx:193`) | Use `dateVn` |
| Statuses | separate badge columns: green/grey Giao hàng, green/amber Tất toán, green/grey Email (`thongke.js:351-361`) | 3 places: Xưởng step badge, Trạng thái 2 badges (hidden < lg), due badge in Giao dự kiến | **Merge into one "Trạng thái" column**: step (BKI) + Đã/Chưa giao + Đã/Chưa tất toán + Báo giá + Quá hạn/Sắp hạn, always visible. The email flag is not shown on web: `da_gui_email` is returned by the RPC but unused |
| Công nợ | number, no badge (`thongke.js:374`) | settled → "Đã tất toán" badge, otherwise remaining debt (`OrdersTable.tsx:205-206`) | Done. Optional: unsettled with 0 debt still shows 0 |
| Nợ NCC per row | yes | not a column (KPI card only) | Owner decision |
| Due highlight | red/amber text on the due date (`thongke.js:340-349`) | row tint + badge | OK |
| BKI + trục tree | child `<tr class="stats-axis-child">` with `└─ Trục <name>`, chu vi, count, thành tiền, CTV/HH, lãi ròng, after any row with `loai_truc = 'moi'` (`thongke.js:221-263`, `:376-379`) | none. `admin_orders_list` does not return `loai_truc`, `ten_truc` or other `truc_*` columns (`0026:340-379`), and `tong_tien` already includes the axis (`:463-465`) | Add `loai_truc` + `truc_*` to the RPC output, plus an indented child row in `OrdersTable`. `DataTable` has no child-row support today (`portal-ui/components/DataTable.tsx`) |
| Detail view mode (all columns) | `statsViewMode = 'detail'` with per-column filters (`thongke.js:392-425`) | no | Probably skip |
| Row multi-select | click / shift / ctrl (`thongke.js:265-293`) | checkboxes | OK |

### 4.2 Forms

| Item | App (`index.html`) | Web | Gap |
|---|---|---|---|
| BKI structure | 2 cards, "Thông tin cơ bản" (`:261`) and "Giá và Chi phí" (`:376`), with a **switch** `bki-axis-switch` (`:302-310`) in the basic card that reveals a "Thông tin Trục mới" card **between** them (`:312-370`) | 5–6 fieldsets (Khách hàng, Quy cách, Chi phí, Bán, CTV, Trục, Xưởng). Trục is a `<select>` at the end (`OrderForm.tsx:190-198`) | Reorder into the app's 2 cards + a switch-driven axis card in the same position |
| Read-only computed fields inline | yes: `bki-don-gia-goc`, `thanh-tien-ban`, `thanh-tien-goc`, `vat-amount`, `cong-no-khach`, `tien-hoa-hong`, `loi-nhuan`, `loi-nhuan-rong`; axis `truc-vat-amount`, `thanh-tien-goc/ban`, `tien-hoa-hong`, `loi-nhuan(-rong)` (`:341-369`, `:420-476`) | only in the sidebar `OrderTotals` | Render the computed values inline as read-only fields (values from `form-totals.ts`) |
| Field order (BKI price card) | so_luong, phi_sl, mau_keo, phi_keo, mau_sac, phi_mau, phi_size, phi_cat, don_gia_von, don_gia_ban, (goc), (tt ban), (tt goc), tien_coc, vat, (vat amt), (cong no), tien_ship, ctv, hoa_hong, (tien hh), (loi nhuan), loi_giay, thung_bao, (lnr) | split across Quy cách / Chi phí / Bán / CTV | Match the app's order |
| Money input format | `currency-format` text inputs with thousand separators | `type=number` | Add a thousand-separator display |
| Customer picker | app 1.5.22 has a picker (`electron/js/modules/customers.js`) | `CustomerPicker` | OK |
| Workshop assignee + production note | not on the app form | web only (`OrderForm.tsx:208-219`) | Keep (web extra) |
| BK / TI / Thank you | `index.html:491+`, `:597+`, `:707+` (same 2-card pattern) | flat groups | Same restructure |

### 4.3 Export (phiếu giao hàng / đơn đặt hàng)

- **App.** `exportManager.js` provides a multi-order export dialog (`:29`). You pick orders from all types (`:79-170`), choose doc type `phieu_giao_hang` or `don_dat_hang` (`:63`, `:561`), and edit preview lines (`:398-470`). Output is a combined A4 print or PDF (`:476-560`).
- **Web.** Only the per-job A5 QR delivery note exists:
  - Page: `app/(portal)/portal/xuong/[id]/phieu-giao/page.tsx`.
  - Components: `features/workshop/components/DeliveryNoteSheet.tsx`, `DeliveryNoteMaker.tsx`.
  - It works only for BKI orders that have a production job.
  - The orders list and detail have no print action. The detail only lists the notes (`OrderDetailView.tsx:142-157`).
- **Gap.** Add an "Xuất phiếu giao / đơn đặt hàng" bulk action in `OrdersTable` (selection, then a print page `/admin/don-hang/in?ids=`). It should reuse the `PRINT_CSS` / nonce pattern from `DeliveryNoteSheet.tsx:12-16` and have editable lines, like the app.

### 4.4 Statuses

- **App:** Đã giao / Chưa giao, Đã tất toán / Chưa xong, Email Rồi / Chưa. It has no production step in the list.
- **Web:** the production step (`BOARD_STEPS`), delivered, settled, quote and due flags, spread over 3 columns. `da_gui_email` is returned but not shown.
- **Target:** one column with a fixed badge order: step (BKI) → giao → tất toán → hạn. Use the app's tones: success = green, gray = grey, warning = amber.

### 4.5 Other owner items

- **Customers empty.** Run `supabase/scripts/customers_backfill.sql` on prod (owner-run), then work through the review queue (the review button on `/admin/khach-hang`, `CustomersView.tsx:39`). No code change is needed.
- **User management.** The base exists (`/admin/users`: invite, role, lock). Missing: a per-user tab whitelist, and an edit form for name/phone. See §2.
