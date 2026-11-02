# Portal redesign spec (admin, staff/CTV, workshop)

Owner: `features/portal-ui` (shell, kit, list helpers). Page agents implement pages with this kit.
Living reference: `/admin/_kit` (dev only, admin only; folder `app/(portal)/admin/%5Fkit`).
Screenshots + browser checks: `web/test-results/portal-foundation/` (`node test-results/portal-foundation/kit-shots.mjs`).

## 1. Audit (what exists today, all kept)

| Route | Roles (page gate) | Shows | Actions (Server Actions / RPC) |
|---|---|---|---|
| `/admin` | admin | lead counts per status (links to `/portal?status=`) | none |
| `/portal` | admin, manager, staff, ctv (`internal`) | lead list, max 200, RLS: staff/ctv only assigned; `?status=` filter; realtime unread | none |
| `/portal/leads/[id]`, `/admin/leads/[id]` (pricing) | same page body | summary (customer, phone, email, company, qty, note, assignee, design spec, colours, preview), quotes, timeline | `changeStatusAction`, `addNoteAction`, `assignLeadAction` (admin), quote: create draft / save / new version / send / PDF (admin+manager), production: `assignWorkshopAction`, `convertToProductionAction` (admin) |
| `/portal/xuong` | admin, workshop (`production`) | jobs grouped by step, due badges, overdue | `advanceStepAction` (workshop: next step on card) |
| `/portal/xuong/[id]` | admin, workshop | specs, design, step history (NO price, NO customer contact) | `advanceStepAction`, `convertToProductionAction`, `assignWorkshopAction` (admin) |
| `/admin/users` | admin | users (name, email, role, active) | `inviteUserAction`, `updateUserAction` (self row locked) |
| `/admin/quy-cach` | admin | length limits, widths | `addWidth/toggleWidth/moveWidth/deleteWidth/saveLengthLimits` |
| `/admin/presets` | admin | landing showcase presets | `savePresetAction` |
| `/login`, `/auth/*` | anon | login / reset / update password | auth actions (not in the shell) |

Rules the UI must keep: staff/CTV never see prices editable (quotes read-only), workshop never sees price or
customer contact, staff/CTV only assigned leads (RLS; never add role filtering in UI as a security measure),
every page keeps its own `requireRole()` call, every action keeps zod + role checks.

## 2. Information architecture + navigation

Shell: `AppShell` in `app/(portal)/{admin,portal}/layout.tsx` (replaces `orders/PortalHeader`, now unused).
lg+ = fixed navy sidebar 256px (white logo tile, groups, user + role + logout at bottom). < lg = sticky white
top bar (logo, menu button) + left drawer (native `<dialog>`). Skip link first. Active item = yellow tape strip.

| Role | Home (logo) | Nav "Công việc" | Nav "Cấu hình" |
|---|---|---|---|
| admin | `/admin` | Tổng quan `/admin`, Khách hàng `/portal`, Xưởng `/portal/xuong` | Người dùng, Quy cách, Mẫu kích thước |
| manager | `/portal` | Khách hàng `/portal` | none |
| staff, ctv | `/portal` | Khách của tôi `/portal` | none |
| workshop | `/portal/xuong` | Đơn của tôi `/portal/xuong` | none |

Source: `lib/nav.ts` `navFor(role)`, `isNavActive(path, item)` (lead detail pages light "Khách hàng"; job detail lights "Xưởng").
Display only: hiding a link is not access control.

## 3. Lead workflow (status pipeline + who acts)

```
 Tư vấn ─────────────────────────────┐ Chốt đơn ───────────────┐ Sản xuất và giao ───────┐ Kết thúc
 new ──► assigned ──► consulting ──► quoted ──► accepted ──► production ──► shipping ──► done
  │         │             │             │           │             │              │
 Admin     Người phụ     Admin/Quản lý Khách hàng  Admin:        Xưởng: công     Xưởng: da_giao
 phân công trách: liên   lập + gửi     xem /q/link giao xưởng +   đoạn in → cắt   (staff/CTV cũng
           hệ, "Đang     báo giá       đồng ý →     chuyển SX     cuộn → đóng gói được "Hoàn tất")
           tư vấn"       (staff KHÔNG  accepted;   (hoặc xưởng   san_sang_giao
                         đặt giá)      yêu cầu sửa được giao bấm  → shipping
                                       → Admin/QL  "Chuyển SX")
                                       tạo phiên bản mới
 any open status ──► cancelled (admin/manager any; staff/ctv allowed by lib/lead-status.ts; job `huy` = admin)
```

Production steps (job): `cho_san_xuat → dang_in → dang_cat_cuon → dong_goi → san_sang_giao → da_giao` (+ `huy`).
Sync: accepted→production on convert, san_sang_giao→shipping, da_giao→done, huy→cancelled.

UI: `WorkflowStepper` on every lead detail (top, under the header) shows the strip + "Việc tiếp theo: … ·
Đến lượt bạn | Chờ: <actor>". `ProductionStepper` on job detail + lead production panel. Source of truth for
copy/owners: `lib/workflow.ts` (`LEAD_PIPELINE`, `nextActionFor(status, role)`); allowed transitions stay in
`lib/lead-status.ts` + SQL.

## 4. Page layouts (for page agents)

Every page: `<PageHeader title description? breadcrumbs? actions? meta? />` then content, gap 24px (shell does the container: max 1400px, gutters 16/24/32).

- **/admin Tổng quan**: header; `StatGrid` of `StatCard` per open status (href `/portal?status=x`, tone `LEAD_TONE`), "Cần xử lý" sections: new unassigned leads, quotes awaiting customer, accepted not converted, overdue jobs (each a small `DataTable` without pagination, link "Xem tất cả" to the filtered list). `LeadsLiveRefresher` stays.
- **/portal Khách hàng** (all internal roles): header (admin: none; title per role "Khách hàng" / "Khách của tôi"); `FilterBar` (search code/name/phone/company; chips status multi; select assignee (admin/manager only); date range created_at); `DataTable` columns Mã (link), Khách hàng (name + company/phone), Trạng thái (`StatusBadge`, mobile badge), Số cuộn (end), Người phụ trách (hidden for staff/ctv), Cập nhật; sort: updated (default desc), created, code, customer, quantity. Keep realtime unread via `rowClassName` + live dot in header `meta`. Server: `applyListQuery(db.from("leads").select(..., { count: "exact" }), LEADS_SPEC, state)`.
- **Lead detail**: header (title = code, meta = `StatusBadge size="md"`, breadcrumbs Khách hàng › code, actions = the role's primary next action button anchor e.g. "#bao-gia"); `WorkflowStepper`; 2 columns lg (`minmax(0,1fr) 22rem`): main = Khách hàng + Thiết kế (Section), Báo giá (`quotesSlot`), Lịch sử; aside = Phân công (admin), Sản xuất (admin), Đổi trạng thái, Ghi chú. Phone: aside panels come right after the stepper (action first).
- **/portal/xuong**: header + `FilterBar` (search order/lead code/print text; chips step; select assignee (admin); date range due_date `type: "date"`); toggle view Bảng / Theo công đoạn (`?view=board`) — board keeps grouping + one-tap next-step for workshop; table uses `applyListInMemory` over `workshop_jobs()`. Sort: due (default asc, nulls last), step, updated. Overdue rows: red tone badge, never colour alone.
- **Job detail**: header (order code, `StepBadge`), `ProductionStepper`, specs + design, aside = big next-step button (>= 48px), convert form, assign (admin), history.
- **/admin/users**: header action "Mời người dùng" (opens form section); `FilterBar` (search name/email/phone, select role, select active yes/no); `DataTable` with inline role/active form per row (row controls raised above the row link via `.pt-row` rules) — `applyListInMemory`.
- **/admin/quy-cach, /admin/presets**: `Section`s; lists sortable by `sort_order`/width; destructive actions use `ConfirmSubmit tone="danger"`.
- Route `loading.tsx`: `<LoadingState rows={6} />`; errors: `ErrorState` with a retry link.

## 5. Components (import from `@/features/portal-ui`)

Universal = no "use client", usable in server and client components (no server-only imports).

| Component | Props | Notes |
|---|---|---|
| `AppShell` | `profile: Profile, children` | layouts only |
| `PageHeader` | `title, description?, breadcrumbs?: Crumb[], actions?: ReactNode, meta?: ReactNode` | h1 lives here |
| `Breadcrumbs` | `items: {label, href?}[]` | last item `aria-current=page` |
| `Section` | `title?, description?, actions?, variant?: "surface"\|"plain", id?, className?, children` | h2 + aria-labelledby |
| `StatCard` / `StatGrid` | `label, value, href?, tone?: Tone, hint?` / `children` | grid 2/3/5 cols |
| `DataTable<T>` | `caption, columns: Column<T>[], rows, rowKey, rowHref?, rowClassName?, list?: {basePath, spec, state, total}, empty?: {title?, body?, action?}, filtered?, error?` | table ≥ md, cards < md, sort header links + `aria-sort`, mobile sort chips, pagination when `list` |
| `Column<T>` | `key, header, cell(row), sortKey?, align?: "start"\|"end", className?, mobile?: "title"\|"badge"\|"meta"\|"hidden"` | first column = row link |
| `FilterBar` | `basePath, spec, state, controls?: FilterControl[], searchPlaceholder?, dateRange?, dateLabel?` | GET form, works without JS; selects/dates auto-submit; chips are links; "Xóa bộ lọc" |
| `FilterControl` | `{ kind: "select"\|"chips", name, label, options: {value,label}[] }` | select = single enum / bool; chips = multi enum |
| `Pagination` | `basePath, spec, state, total` | inside DataTable already |
| `StatusBadge` / `StepBadge` / `ToneBadge` | `status` / `step` / `tone, children` ; `size?: "sm"\|"md"` | dot + text, cancelled struck |
| `WorkflowStepper` | `status, role, compact?` | lead pipeline + next action/owner |
| `ProductionStepper` | `step` | job steps |
| `ConfirmDialog` | `open, title, body?, confirmLabel?, cancelLabel?, tone?: "primary"\|"danger", onCancel, onConfirm?, confirmSubmit?: {name?, value?}` | client; native dialog, focus on cancel |
| `ConfirmSubmit` | `label, title, body?, confirmLabel?, tone?, disabled?, name?, value?, className?` | client; put inside a `<form action={...}>` |
| `Toast` | `toast: {id, message, tone?} \| null, durationMs?` | client; new `id` re-shows |
| `InlineStatus` / `ActionStatus` | `tone: success\|error\|info, children` / `state: {status, message?}` | replaces per-feature ActionMessage |
| `EmptyState` / `ErrorState` / `LoadingState` | `title?, body?, action?` / same / `rows?, label?` | |
| `Field`, `TextField`, `SelectField`, `TextareaField`, `CheckboxField` | label, hint?, error?, required? + native props (`SelectField`: `options, placeholder?`) | label/hint/error wired via ids, aria-invalid |
| `Icon` | `name, className?` | inline SVG |
| class recipes | `buttonClass(variant?: primary\|secondary\|ghost\|danger, size?: md\|sm, extra?)`, `inputClass`, `textareaClass`, `checkboxClass`, `surfaceClass`, `linkClass` | all controls ≥ 44px |

## 6. List helpers (pure, unit-tested: `lib/*.test.ts`)

```ts
const LEADS_SPEC = defineListSpec({
  sort: { keys: { updated: { column: "updated_at", firstDir: "desc" }, code: { column: "code" } }, default: { key: "updated", dir: "desc" }, tiebreak: "id" },
  search: { columns: ["code", "customer_name", "phone", "company"] },
  filters: { status: { kind: "enum", column: "status", values: LEAD_STATUSES, multi: true },
             active: { kind: "bool", column: "is_active" } },
  dateRange: { column: "created_at" /* type: "date" for date columns */ },
  pageSizes: [25, 50, 100],
});
const state = parseListParams(LEADS_SPEC, await searchParams);         // whitelist; junk dropped
const { data, count } = await applyListQuery(db.from("leads").select(cols, { count: "exact" }), LEADS_SPEC, state);
const { rows, total } = applyListInMemory(jobs, JOBS_SPEC, state);      // small / RPC lists, accent-insensitive search
```
URL params: `q, sort, dir, from, to, page, size` + one param per filter (`status=new,quoted`). Filter names
cannot be reserved names. Also: `serializeListParams`, `listHref`, `patchListState` (resets page),
`toggleSort`, `toggleFilterValue`, `clearFilters`, `hasActiveFilters`, `sanitizeSearch`, `pageCount`.
Security: columns only from the spec; search text is sanitized (letters/digits/space/`@.+-`, 80 chars) and
sent as a quoted `ilike` operand; dates validated and bounded in VN time (+07:00); RLS still decides rows.
DB search is not accent-insensitive (in-memory search is).

## 7. Tokens (globals.css, section "Portal", prefix `pt-`)

| Token | Hex | Use |
|---|---|---|
| `pt-canvas` | #f3f4f9 | page background (cool paper) |
| `pt-surface` | #ffffff | sections, tables, inputs |
| `pt-line` / `pt-line-strong` | #dde0ec / #b9bed3 | dividers / control borders |
| `pt-text` / `pt-muted` | #16173a / #555a78 | text (muted AA 6.1:1 on canvas) |
| `vt-blue` | #252a9a | primary actions, links, passed workflow steps, focus ring |
| `vt-navy-deep` | #1a1c4e | sidebar, drawer, toast |
| `vt-yellow` | #fef211 | the "tape": current step, active nav strip, "Đến lượt bạn", role chip, focus on dark |
| `vt-red-deep` | #cf1f27 | destructive buttons only |
| tones `pt-{red,blue,yellow,green,amber,grey}-{tint,ink}` | | badges/status: red = needs action now (new, overdue, errors), blue = sales work, yellow = waiting on customer / ready to ship, green = accepted/done, amber = in workshop, grey = closed/cancelled |

Type: system sans (Vietnamese glyphs), tabular numbers on the portal root, scale 12/14/16/24/30, weights 400/500/600/700.
Radius ladder: controls 8px, surfaces 12px, badges + chips pill. No shadows, no gradients; borders only.
Motion: drawer slide 180ms, toast rise 200ms, skeleton shimmer; all off under `prefers-reduced-motion`.
Rules: no inline `style` (CSP), no CSS modules, no all-caps labels, Vietnamese sentence-case copy in `vi.portalUi`.
A11y: AA contrast, visible focus everywhere, ≥ 44px targets, `aria-sort`, `aria-current`, dialogs native, skip link, 360–1920 without horizontal scroll (tables become cards < 768px; workflow strips scroll inside themselves; other wide tables go in `ScrollRegion`, which is focusable and named).
