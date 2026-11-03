# features/admin-orders

Admin-only pages for printed-tape orders (`bang_keo_in_orders`), shared by the desktop app and the web.

## Routes

- /admin/don-hang (`OrdersView`): `admin_orders_list` with search, workshop step, delivered, settled and date filters, paged in SQL. Shows origin (App / Web / Khách web).
- /admin/don-hang/moi (`NewOrderView`): the desktop form's fields with live totals. Saving calls `admin_order_create`, and the order trigger creates the workshop job.
- /admin/don-hang/[id] (`OrderDetailView`): `admin_order_get`. Shows costs, profit, debt, the axis, the job and step history, and delivery notes with signed photo links.

## Rules

- `don-hang/layout.tsx` and every page call `requireRole(ROLE_GROUPS.admin)`, so managers are kept out. The RPCs are admin-only in SQL (42501).
- Never pass these rows to workshop components: they hold prices, costs and customer contacts.
- `lib/order-math.ts` is a port of `electron/js/orderMath.js`, kept in sync by `order-math.parity.test.ts`. It is display only: SQL recomputes and stores every amount.
- Origin comes from `lead_id` (portal lead) or from the trigger's first step-log note (`Đơn mới từ web` / `app`).
- Copy lives in `lib/copy.ts`. Only `portalUi.navOrders` is in the shared dictionary.
