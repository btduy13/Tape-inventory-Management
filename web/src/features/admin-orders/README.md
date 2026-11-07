# features/admin-orders

Admin-only order pages for the 4 order types (`bang_keo_in`, `bang_keo`, `truc_in`, `thank_you`) and app quotes (`is_quote`), shared by the desktop app and the web.

## Routes

- /admin/don-hang?type= (`OrdersView`): tabs per type + Báo giá, totals bar, sortable columns, overdue / due-soon highlight, multi-select with selection total, bulk actions (status, Đưa vào xưởng, Chuyển thành đơn, Xóa), CSV export. Everything filtered, sorted, totalled and paged in SQL (`admin_orders_list`). Auto refresh every 30 s and on focus (`OrdersAutoRefresh`).
- /admin/don-hang/moi?type=&quote=1 (`NewOrderView`): the desktop form of that type with live totals, customer picker, product-name suggestions and "Chép đơn gần nhất". Saves through `admin_order_create`.
- /admin/don-hang/[id]?type= (`OrderDetailView`): `admin_order_get`. Money, customer link, actions; for printed tape the job (assignee, step move via the workshop forms), step history and delivery notes.
- /admin/don-hang/[id]/sua?type= (`EditOrderView`): same form, `admin_order_update`. Orders from a multi-size quote only edit name, customer and due date.

Printed tape keeps URLs without `?type=` (old links).

## Rules

- `don-hang/layout.tsx` and every page call `requireRole(ROLE_GROUPS.admin)`, so managers are kept out. The RPCs are admin-only in SQL (42501); actions re-check the role and validate with zod.
- Never pass these rows to workshop components: they hold prices, costs and customer contacts.
- `lib/order-math.ts` is a port of `electron/js/orderMath.js`, kept in sync by `order-math.parity.test.ts`. It is display only: SQL recomputes and stores every amount.
- Origin comes from `lead_id` (portal lead) or from the trigger's first step-log note (`Đơn mới từ web` / `app`).
- Copy lives in `lib/copy.ts`. Step labels / tones come from the shared dictionary and portal-ui.
- Kept in the app: PDF / print, attachments, SMTP email, Excel import, multi-size quote builder.
