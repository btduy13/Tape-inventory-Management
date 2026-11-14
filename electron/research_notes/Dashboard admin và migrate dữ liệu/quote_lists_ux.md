# UX/UI for Quote (báo giá) and Quote-Request (yêu cầu báo giá / RFQ) list + detail pages

Research method note: the WebSearch and WebFetch tools failed in this session (model config error), so all sources below were fetched with curl from known URLs and read as raw text. No search-engine discovery was possible, so coverage of Pipedrive, Zoho, QuickBooks and Shopify B2B draft orders is thin (see Gaps). Every cited claim was read in the fetched page text.

## 1. Best layouts for quote/RFQ lists: table vs cards, columns, status pipeline, filters, saved views, search, bulk actions, empty states

### Takeaway
Use a table (not cards) on desktop: tables win for find/compare/act tasks. Put a human-readable identifier first (customer name / quote code), order columns by importance, use status tabs (saved views) above a search + a few dropdown filters, show bulk actions only after selection, make the whole row link to the detail page, and paginate at about 50 rows. Mature tools (HubSpot, Odoo) default to "my items" and ship preset tabs like "Expiring soon" / "Pending acceptance".

### Cited Findings
- NN/G names four core table tasks: find records matching criteria, compare data, view/edit/add a single row, take actions on records. — [NN/G, Data Tables: Four Major User Tasks (Apr 2022)](https://www.nngroup.com/articles/data-tables/)
- NN/G: cards make comparison "cognitively effortful and slow" because users must re-orient spatially for each card; tables let adjacent values be compared at a glance and scale in rows and columns. — [NN/G](https://www.nngroup.com/articles/data-tables/)
- NN/G: the first column should be a human-readable record identifier, not a "mystery meat" auto-generated ID; default column order should reflect importance, with related columns adjacent. — [NN/G](https://www.nngroup.com/articles/data-tables/)
- NN/G: filters must be discoverable and quick, and there must be a clear visual indication that filters are active. — [NN/G](https://www.nngroup.com/articles/data-tables/)
- NN/G: for viewing/editing one record, modals hide neighboring records (users often reference other rows while editing); a non-modal side panel or separate page is preferred; accordions clutter because users don't collapse them. — [NN/G](https://www.nngroup.com/articles/data-tables/)
- NN/G: inline row actions work for one or two actions; more get crowded or hidden under hover/"Actions" menus. Batch actions = row checkboxes + action buttons above/below the table, with "Select all" when applying to the whole set is common. — [NN/G](https://www.nngroup.com/articles/data-tables/)
- Polaris IndexTable best practices: rows should navigate to the resource's details page when clicked; support sorting and filtering if the list can be long; paginate when more than 50 items; numeric cells right-aligned with numeric text style; bulk actions use verb + noun labels; heading should identify the resource ("Showing 50 products"). — [Shopify Polaris IndexTable docs source (GitHub)](https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/components/tables/index-table.mdx)
- Polaris describes an index list as "a summary of these details pages": its jobs are scan at-a-glance, find which items need action first, act, and navigate to the detail page. Example variants include "saved views, search, filtering, and sorting", "row navigation link" (clicking row opens detail via a primary link), "empty state" that explains the list's purpose when no resources exist, and "subheaders" (rows grouped by a value). — [Polaris IndexTable mdx](https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/components/tables/index-table.mdx)
- HubSpot quotes index page: shows all quotes with status; tabs at the top for "all quotes, quotes expiring soon, pending acceptance, or pending approval"; users can add custom views; quick filter dropdowns for Status, Last activity date, Owner, Signing status, plus an "Advanced filters" panel. Actions on quotes include filter, countersign, recall, archive, void, delete, mark as signed, export. — [HubSpot KB, Manage quotes (updated Oct 28, 2026)](https://knowledge.hubspot.com/quotes/manage-quotes)
- Odoo 18 Sales: the Quotations dashboard opens with a default "My Quotations" filter (current user's quotes); list view is default, with Kanban, Calendar, Pivot, Graph, Activity views available; clicking a line opens the quotation form. — [Odoo 18 docs, Create quotations](https://www.odoo.com/documentation/18.0/applications/sales/sales/sales_quotations/create_quotations.html)
- Carbon DataTable: toolbar is reserved for global table actions (settings, filters, export), up to five actions, rest in overflow. Batch action bar appears at top of table once a row is selected; while in batch mode, per-row action icons should be disabled; exit via Cancel or deselect all. Pagination sits at the bottom. — [Carbon Design System, Data table usage](https://carbondesignsystem.com/components/data-table/usage/)
- Carbon: if a row's overflow menu would hold fewer than three options, show them as inline icon buttons instead. Row hover state should always be on. Use skeleton states, not spinners, for loading. — [Carbon](https://carbondesignsystem.com/components/data-table/usage/)
- Pencil & Paper: show bulk-action toolbar only once one or more rows are selected (reduces clutter); persist user view settings (columns, density) and always offer a "reset view". — [Pencil & Paper, Data Table Design UX Patterns](https://pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- Stripe quote lifecycle: draft (editable) → open (finalized/sent) → accepted (generates invoice/subscription) or canceled ("The quote expired or was canceled"). — [Stripe Docs, Quotes](https://docs.stripe.com/quotes)

### Inferences
- Suggested status tabs for the quote-request (RFQ) list, each a URL query (`?tab=`) so it is server-rendered and bookmarkable: "Mới (chưa giao)" · "Của tôi" · "Đang báo giá" · "Đã gửi" · "Quá hạn / chờ >24h" · "Đã chốt" · "Tất cả". Show a count on each tab. This mirrors HubSpot's preset tabs and Odoo's "My" default.
- Suggested RFQ columns (left to right): checkbox · Khách hàng (name bold, phone muted below) · Yêu cầu (product/qty summary, 1 line truncated with title tooltip) · File (paperclip icon + count) · Phụ trách (avatar/initials or "Chưa giao" muted) · Trạng thái (badge) · Đã chờ (relative age, colored by SLA) · Ngày tạo (muted, right). Notes go to detail page, not the list.
- Suggested quote list columns: checkbox · Mã + Khách hàng · Sản phẩm summary chip ("3 size · 5 trục") · Tổng tiền (right, tabular-nums) · Trạng thái · Hiệu lực đến (red when < 3 days or past) · Người tạo · Cập nhật.
- Keep filters to: search box (customer name/phone/code), Phụ trách dropdown, date range. Put everything else in tabs. Show active filters as removable chips plus "Xóa lọc".
- Bulk actions worth building for a small team: "Giao cho…" (assign) on RFQs, "Đánh dấu mất / hết hạn", "Xuất Excel". Skip column customization and density toggle at first (YAGNI for a small team).
- Empty states should differ per tab: "Không có yêu cầu mới — tốt lắm" vs. first-use "Chưa có báo giá nào. Tạo báo giá đầu tiên" with a primary button; and filtered-empty "Không có kết quả cho bộ lọc này · Xóa lọc".

### Gaps
- Could not fetch Pipedrive, Zoho, QuickBooks estimates or Shopify B2B draft orders docs (search unavailable; guessed URLs 404'd or returned shells). Their list/status specifics are not verified here.
- No quantitative study found comparing tabs vs. filter dropdowns for status.

## 2. Showing hierarchical line items (size → axis/trục) compactly in list and detail

### Takeaway
In the list, do not render the tree; show a summary chip ("2 size · 4 trục") and optionally an expand chevron. On the detail page, use a single table with parent rows (size, semibold, subtotal) and indented child rows (trục) — a "table tree" / nested rows pattern. Keep key info at the parent level, limit indentation, and wrap instead of truncating.

### Cited Findings
- Atlassian Table tree: "an expandable table for showing nested hierarchies"; use for grouped info so people read high-level data quickly and drill down when needed; put important information at the top level so most people don't need to open nested rows. — [Atlassian Design, Table tree usage](https://atlassian.design/components/table-tree/usage)
- Atlassian Table tree: avoid heavy indentation (less scannable, harder with screen magnification); prefer wrapping over truncation because truncation isn't accessible; each expand chevron needs an accessible name naming the row ("Expand <name>"); only make the whole row clickable to expand if the row has no other interactive elements. — [Atlassian](https://atlassian.design/components/table-tree/usage)
- Polaris IndexTable "nested rows" example: parent row (`rowType="data"`) shows group label in semibold with empty cells; child rows (`rowType="child"`) show the variant (size) with numeric, right-aligned price and quantity; parent checkbox selects all children. — [Polaris example source](https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/pages/examples/index-table-with-nested-rows.tsx)
- Polaris "subheaders" variant: rows grouped under a header by a relevant value. — [Polaris mdx](https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/components/tables/index-table.mdx)
- Carbon expandable rows: use for supplementary info or data needing extra query time; if the expanded area feels cramped, move to a dedicated page/side panel; "expand all" is not shown by default because it negates lazy-loading benefits. Expand icon goes left of the selection checkbox. — [Carbon](https://carbondesignsystem.com/components/data-table/usage/)
- Odoo quotation lines support "sections" (bold heading rows, drag-and-drop) and "notes" (italic rows under a product line) inside one line-item table. — [Odoo 18 docs](https://www.odoo.com/documentation/18.0/applications/sales/sales/sales_quotations/create_quotations.html)
- NN/G warns accordion rows clutter the list because users don't close them. — [NN/G](https://www.nngroup.com/articles/data-tables/)

### Inferences
- List page: one row per quote. Product cell = first size text ("48mm × 100y") + muted "+2 size · 5 trục". Optional `<details>`/chevron that reveals a small inner table; with SSR this is free via native `<details>` (no JS). Do not auto-expand.
- Detail page table layout (Tailwind sketch):
  - Parent row (size): `bg-slate-50 font-semibold`, cells: Size · Số trục · SL tổng · Thành tiền (subtotal, right).
  - Child rows (trục): first cell `pl-8` with a small "Trục 1" label and print spec (màu, mặt in), then quantity, unit price, line total right-aligned `tabular-nums`.
  - Footer: Tạm tính · VAT · Tổng cộng, right-aligned, bold total.
  - One indentation level only (size → trục); never nest further.
- If a size has exactly one trục, collapse to a single row (no child row) to cut noise.

### Gaps
- No source found specifically on quoting tools showing multi-level product variants in the quote list itself; inference above is extrapolated from Polaris/Atlassian.

## 3. Status badges, color, and aging/SLA indicators

### Takeaway
Use a small set of semantic colors (gray = draft/new, blue = in progress, yellow/amber = waiting on customer, green = won, red = lost/needs action, muted gray = expired/cancelled), always text + color (never color alone), and add one "aging" cue (relative time turning amber/red) rather than many badges.

### Cited Findings
- HubSpot quote status color mapping: Drafted = gray; Published / Sent / Viewed / Pending signature / Pending approval = yellow; Changes requested = red; Accepted = green. — [HubSpot, Manage quotes](https://knowledge.hubspot.com/quotes/manage-quotes)
- Atlassian Lozenge: use lozenges for workflow status, system state, priority; use semantic colors when color carries shared meaning; use tags (lower prominence) for descriptive metadata; don't overuse filled icons as it dilutes critical statuses. — [Atlassian, Lozenge usage](https://atlassian.design/components/lozenge/usage)
- Carbon status indicators: at least three of four elements (shape, color, icon, text) for WCAG compliance; when consolidating statuses, use the highest-attention color; avoid status indicators where no action is needed — use plain text; more than five or six indicators overwhelms users. — [Carbon, Status indicator pattern](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
- Polaris small-screen example uses `Badge progress="complete|partiallyComplete|incomplete"` — badges carry a progress shape plus label, not color alone. — [Polaris small-screen example](https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/pages/examples/index-table-small-screen.tsx)
- HubSpot exposes "quotes expiring soon" as a first-class tab, i.e. expiry is treated as an actionable view, not just a column. — [HubSpot](https://knowledge.hubspot.com/quotes/manage-quotes)

### Inferences
- Proposed mapping (Tailwind `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset`):
  - RFQ Mới: `bg-sky-50 text-sky-700 ring-sky-200` + dot
  - Đã giao: `bg-indigo-50 text-indigo-700`
  - Đang báo giá (priced, nháp): `bg-slate-100 text-slate-700`
  - Đã gửi / chờ khách: `bg-amber-50 text-amber-800`
  - Đã chốt (won → đơn hàng): `bg-emerald-50 text-emerald-700` + check icon
  - Mất: `bg-rose-50 text-rose-700`
  - Hết hạn / Hủy: `bg-slate-50 text-slate-500` (muted, closed)
  Max ~6 statuses visible, matching Carbon's 5–6 guideline.
- Aging/SLA: a separate "Đã chờ" column with relative time ("3 giờ", "2 ngày"); plain gray < 4h, amber 4–24h, red + clock icon > 24h for unassigned/unanswered RFQs. Plus a "Quá 24h" tab with count badge in the sidebar nav. Stop the clock once status reaches "Đã gửi".
- Quote expiry: "Hiệu lực đến" date turns amber within 3 days, red when past, and a nightly job (or query-time computation) shows status as "Hết hạn".
- Keep one status badge per row; sub-states (viewed, file missing) go as small muted icons, not extra badges.

### Gaps
- No published SLA threshold benchmark for B2B RFQ response found; 24h is the owner's stated threshold, the 4h amber step is an assumption.

## 4. Mobile-friendly list patterns (responsive table → cards)

### Takeaway
Below ~640px, switch each row into a stacked mini-card inside the same list (Polaris "condensed" pattern): line 1 muted code + date, line 2 customer (semibold) left + total right, line 3 badges. Hide bulk selection on small screens if not essential. If a wide table must stay a table, sticky header + sticky first column + visible cut-off cue.

### Cited Findings
- Polaris condensed/small-screen IndexTable row layout: muted small text "{order} • {date}"; then customer semibold left and total right on one line; then status badges row; padding 12px 16px. — [Polaris small-screen example](https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/pages/examples/index-table-small-screen.tsx)
- Polaris: hide bulk actions only below 490px, and only when bulk actions aren't essential, since it removes multi-select. — [Polaris mdx](https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/components/tables/index-table.mdx)
- NN/G mobile tables: design the large-screen table first; sticky column headers for tables longer than a screen; if horizontal scroll is needed make it obvious (cut-off columns or arrows; dots are often missed); lock the left identifier column; rotating the phone is a last resort; let users choose the subset of data. (2017, older but still standard guidance.) — [NN/G, Mobile Tables](https://www.nngroup.com/articles/mobile-tables/)
- Carbon: on touch devices, row overflow menus persist even when configured as hover-only. — [Carbon](https://carbondesignsystem.com/components/data-table/usage/)

### Inferences
- Tailwind implementation without a component lib: render `<table class="hidden md:table">` and `<ul class="md:hidden divide-y">` from the same row data in the server component; each `<li>` is an `<a>` to the detail page. Duplicated markup is cheaper than a responsive-table hack.
- Mobile card for RFQ: "BG-0123 · 2 giờ trước" (muted, red if > 24h) / "Cty An Phát" + "0909…" tap-to-call `tel:` link / badge + "Chưa giao". Phone tap-to-call is the highest-value mobile action for this business.
- Tabs scroll horizontally on mobile (`overflow-x-auto whitespace-nowrap`), with counts.

### Gaps
- NN/G mobile-table article is from 2017; no 2022–2026 NN/G replacement found.

## 5. Real-product examples (HubSpot, Odoo, Stripe, Linear, Polaris)

### Takeaway
Common pattern across products: list page = tabs/saved views + quick filters + table with status color + row click to a detail page; detail page = header with status pipeline and primary action, line items table, activity history. Linear's lesson is restraint: reduce chrome noise and align everything.

### Cited Findings
- HubSpot: preset tabs (All / Expiring soon / Pending acceptance / Pending approval), custom views, quick filter dropdowns, status colors gray/yellow/red/green. — [HubSpot](https://knowledge.hubspot.com/quotes/manage-quotes)
- Odoo: default "My Quotations" filter; list + Kanban + Calendar + Pivot + Graph + Activity views; line item sections and notes. — [Odoo 18 docs](https://www.odoo.com/documentation/18.0/applications/sales/sales/sales_quotations/create_quotations.html)
- Stripe: four-state quote model (draft, open, accepted, canceled) where expiry folds into canceled. — [Stripe Docs](https://docs.stripe.com/quotes)
- Linear redesign: goal was to "reduce visual noise, maintain visual alignment, and increase the hierarchy and density" of navigation; views use headers holding filters and display options, side panels for meta properties, and display modes list/board/split; they spent effort aligning labels, icons, buttons vertically and horizontally. — [Linear, How we redesigned the Linear UI part II](https://linear.app/now/how-we-redesigned-the-linear-ui)
- Polaris: details page holds all content and actions; the index is its summary. — [Polaris mdx](https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/components/tables/index-table.mdx)

### Inferences
- Detail page for an RFQ (two columns on desktop, stacked on mobile):
  - Header: customer name (h1), phone (tel link), status badge, age; primary action button that changes with status ("Nhận xử lý" → "Tạo báo giá" → "Gửi báo giá" → "Chuyển thành đơn hàng").
  - Horizontal stepper: Mới → Đã giao → Đã báo giá → Đã gửi → Chốt/Mất (Odoo-style status bar). Current step filled, done steps checked.
  - Left (2/3): customer's request (qty, notes in a quote block), design files as thumbnails grid with download, linked quote(s).
  - Right (1/3) sidebar: Phụ trách (assign dropdown), source, created/updated, timeline of activity (assigned by X, priced by Y, sent at…).
- Detail page for a quote: same header/stepper; line-item tree table (section 2); totals block; validity date; linked RFQ and resulting order as links.
- Linear-style polish that is cheap in Tailwind: one border color (`border-slate-200`), no vertical cell borders, consistent `h-10/h-11` rows, icons 16px aligned to text baseline, muted secondary text (`text-slate-500`).

### Gaps
- No Pipedrive/Zoho/QuickBooks/Shopify B2B verified detail; Linear and Stripe Dashboard list specifics (exact row heights, fonts) not documented publicly in fetched pages.

## 6. Typography, density, spacing rules; common mistakes

### Takeaway
Left-align text, right-align money/quantities with tabular numerals, never center-align, use one light 1px horizontal divider instead of grid lines or zebra stripes, keep row height 40–48px, header row same height as body, hover highlight always on, sticky header for long lists.

### Cited Findings
- Pencil & Paper: left-align text; header alignment must match column content; "Don't (ever) use center alignment"; right-align quantitative numbers; use tabular/monospace figures so $1,111.11 doesn't look smaller than $999.99; dates in the first column may be left-aligned. — [Pencil & Paper](https://pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- Pencil & Paper: vertical separators make tables busy — if used, 1px max, light gray; zebra stripes conflict with hover/selected/disabled states (up to five gray levels), so prefer a light line divider. — [Pencil & Paper](https://pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- Pencil & Paper density: condensed 40px, regular 48px, relaxed 56px rows; vertically center when rows vary up to ~3 lines, top-align when more. — [Pencil & Paper](https://pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- Carbon row heights: xs 24px, sm 32px, md 40px (default), lg 48px, xl 64px (only for 2-line rows); header row must match body row height; toolbar, batch bar, and pagination heights match row height. — [Carbon](https://carbondesignsystem.com/components/data-table/usage/)
- NN/G: freeze headers (and first column) on large tables; borders, zebra striping, and hover highlight help users keep their place (NN/G accepts zebra; Pencil & Paper argues against it — conflicting advice, choose hover + dividers). — [NN/G](https://www.nngroup.com/articles/data-tables/); [Pencil & Paper](https://pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- Polaris: numeric cells right-aligned with numeric text style; secondary info in subdued tone. — [Polaris mdx](https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/components/tables/index-table.mdx)
- Atlassian: prefer wrapping over truncation (truncation not accessible); if truncating, cap with character limits. — [Atlassian Table tree](https://atlassian.design/components/table-tree/usage)

### Inferences
- Tailwind baseline for both lists:
  - Container: `rounded-lg border border-slate-200 bg-white overflow-hidden`.
  - `<thead>`: `sticky top-0 bg-slate-50 text-xs font-medium text-slate-500` (sentence case, not ALL CAPS bold), `h-10`.
  - Rows: `h-12 border-t border-slate-100 hover:bg-slate-50 cursor-pointer`; cells `px-4 py-2 text-sm text-slate-900 align-middle`.
  - Two-line cells: primary `font-medium`, secondary `text-xs text-slate-500`.
  - Money: `text-right tabular-nums whitespace-nowrap`, format with `Intl.NumberFormat('vi-VN')` + " ₫"; avoid decimals for VND.
  - Dates: relative ("2 giờ trước") with absolute in `title`.
- Common mistakes likely making the current pages "ugly" (to check against the app): too many columns of equal weight; ID first instead of customer; centered text/numbers; full grid borders or heavy zebra; multiple colored badges per row; raw ISO dates/unformatted numbers; action buttons repeated on every row; no empty/filtered-empty state; inconsistent row heights from wrapping notes.

### Gaps
- No source specific to Vietnamese typography in admin tables (diacritics need slightly more line-height; `leading-5`/`leading-6` advised by inference only). Not verified against a source.
