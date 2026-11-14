# Operational admin dashboard (home page) design for a small tape-printing factory

Research note. Method caveat: the WebSearch and WebFetch tools failed in this session (model error), so sources were pulled with `curl` from known, authoritative URLs and read as raw text. Coverage is therefore narrower than a normal search sweep. Polaris, Stripe, Linear, Vercel and Stephen Few primary pages could not be read usefully (redirects, 404s, PDF). Claims about those are listed under Gaps, not as findings.

Current-state context (read from the repo, not a web source): `web/src/features/admin/components/AdminDashboard.tsx` renders one flat `StatGrid` of 9 `StatCard`s (orders, revenue, profit, customer debt, supplier debt, overdue, due soon, pending quotes, new leads), with 5 different tones (red, green, amber, yellow, blue). A second section shows one card per production step. There are no charts and no comparisons. `web/package.json` has no chart library. The web CSP is nonce-only `style-src` (see comments in `web/src/app/not-found.tsx` and `web/src/features/lead-intake/components/TurnstileWidget.tsx`, and the test `landing.test.tsx` "uses no inline style attributes").

## 1. Information hierarchy: what to show first, and how many KPIs

### Takeaway
This home page is an operational dashboard, so it should open with "what needs action today" (overdue, due soon, not yet in the workshop, new leads), then a small KPI row for the month, then trend charts. Keep metrics few. Put the most important item top-left with the most contrast and size.

### Cited Findings
- NN/g defines a dashboard as a single-page set of visualizations giving "at-a-glance information on which users can act quickly". Dashboards are not for exploration. — [NN/g, Dashboards: Making Charts and Graphs Easier to Understand](https://www.nngroup.com/articles/dashboards-preattentive/)
- NN/g splits dashboards into two kinds. Operational dashboards support time-sensitive tasks and help spot "unacceptable deviations". Analytical dashboards (for example a daily sales dashboard) support later thought and analysis. — [NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)
- Carbon "presentation dashboard" best practices: rank data by importance and build a clear visual hierarchy. "The most important data should have the highest contrast and occupy the largest area." Place the most important item at the top and follow the F-pattern. — [Carbon Design System, Dashboards](https://carbondesignsystem.com/data-visualization/dashboards/)
- Carbon: "Limit the number of metrics. Non-essential information should be provided as needed." Strip away anything that distracts. — [Carbon, Dashboards](https://carbondesignsystem.com/data-visualization/dashboards/)
- Carbon cites Human Factors International: white space increases comprehension by almost 20 percent. (Secondary citation inside Carbon; original study not checked.) — [Carbon, Dashboards](https://carbondesignsystem.com/data-visualization/dashboards/)

### Inferences
- Suggested order for this app (mobile reads top to bottom in the same order):
  1. Attention strip ("Cần xử lý hôm nay"): overdue deliveries, due within N days, orders not yet in the workshop, new quote requests (leads), pending quotes. Each is a count plus a link to the filtered list. Hide an item, or show it muted, when its count is 0. The color then means something again.
  2. KPI row for the month, 4 cards at most: Doanh thu (incl. VAT), Lợi nhuận ròng, Công nợ khách hàng, Công nợ NCC. Each card gets a comparison to last month.
  3. Production pipeline (one horizontal bar or segmented bar for the 4 steps).
  4. Trend: 12-month revenue plus profit chart. Revenue mix by order type next to it.
  5. Lists: top overdue orders and top debtors, as short tables of 5 rows with a "Xem tất cả" link.
- This cuts the current 9 equal cards to 4 KPIs plus an attention strip. That fixes the "cluttered" feeling without removing any data, because each count still links to its list.

### Gaps
- No primary source found in this session for a specific "5 to 9 KPIs" rule. That figure circulates widely but was not verified here.

## 2. KPI card design

### Takeaway
A card holds a label, one big value, one comparison line ("+12% so với T10", with an arrow and sign) and an optional sparkline. Color the delta, not the whole card. Abbreviate big VND amounts with a custom formatter ("1,2 tỷ", "45,6 tr"). Do not rely on `Intl` compact notation. Show negative profit as a signed red value with a minus sign, never hidden.

### Cited Findings
- Carbon "differential indicator": a symbol, an optional color, and a label, to track changes. "Color is optional … as long as the value has either a '+' or '-' in front of it, a chevron icon, or an arrow icon." Positive is green, negative is red (unless the data is temperature). "Differential indicators are most often seen in dashboards." — [Carbon, Status indicators](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
- Carbon: relying only on color is insufficient. Pair color with text or another cue. — [Carbon, Status indicators](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
- Local test with Node `Intl.NumberFormat('vi-VN', {notation:'compact', maximumFractionDigits:1})` gave: 1,234,567,890 as "1,2 T", 45,600,000 as "45,6 Tr", 980,000 as "980 N", -12,500,000 as "-12,5 Tr". Currency style gave "1.234.567.890 ₫". (Run in this session; the output is from the CLDR data in the installed Node.) — local check, no URL.
- Tremor chart examples pass a `valueFormatter` prop (for example `Intl.NumberFormat(...)`) for axis and tooltip values. — [Tremor, Area chart](https://tremor.so/docs/visualizations/area-chart)

### Inferences
- The "T"/"Tr"/"N" abbreviations are not what Vietnamese owners usually write ("tỷ", "tr", "k" or "nghìn"). Use a small formatter: ≥1e9 gives "x,x tỷ", ≥1e6 gives "x,x tr", otherwise full `vi-VN` grouping. Keep the exact value in a `title` or tooltip and on detail pages.
- Delta wording: "▲ 12% so với tháng trước" or "▼ 8%". Grey text "Chưa có dữ liệu tháng trước" when the base is 0. Do not show "∞%".
- For debt cards, "up" is bad. Make color follow good/bad, not up/down. The sign and arrow still show the direction (this follows Carbon's rule that the sign carries the meaning).
- Negative net profit: show "-12,5 tr" in the danger text color plus a minus sign. Do not clamp it to 0 or hide it.
- Card tone: keep cards neutral (white or surface, thin border). Only the delta text or a small status dot gets color. The current code tints whole cards in 5 tones. That is the main source of visual noise.
- Sparkline: optional, 12 points, one neutral color, no axes. It is only worth it for revenue and profit.

### Gaps
- Stripe and Shopify KPI card specs could not be retrieved (Stripe docs page is a general "Web Dashboard" page; the Polaris data-viz URL redirected). Their card pattern (label, value, delta, sparkline) is common knowledge but not cited here.

## 3. Chart choice and color palettes

### Takeaway
Use bars and lines (length and 2D position). Avoid pies, donuts, gauges and treemaps on an at-a-glance dashboard. Use one consistent color per series across the whole app, grey for context, and a small curated categorical palette, never a rainbow.

### Cited Findings
- NN/g: length and 2D position are the preattentive attributes people judge accurately, so bar and line charts are easy to read. Bars are best sorted ascending or descending. — [NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)
- NN/g: color pops out but has no perceived order, so "color should not be used to communicate information about quantitative values or magnitude". It notes about 8% of men and 0.5% of women have a color-vision deficiency. — [NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)
- NN/g: pie and donut charts "are notoriously poor at most information-communication tasks" and should be avoided most of the time. Treemaps are "not appropriate for simple, actionable dashboards". Radial gauges use a lot of space for little information. — [NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)
- Carbon categorical palette, applied strictly in order to maximize neighbor contrast: 6929c4 (Purple 70), 1192e8 (Cyan 50), 005d5d (Teal 70), 9f1853 (Magenta 70), fa4d56 (Red 50), 570408, 198038, 002d9c, ee538b, b28600, 009d9a, 012749, 8a3800, a56eff. Single-series option: 6929c4, 002d9c, 1192e8 or 005d5d. — [Carbon, Color palettes](https://carbondesignsystem.com/data-visualization/color-palettes/)
- Carbon sequential palettes are monochrome ramps (for example Blue 10 edf5ff to Blue 100 001141). The darkest shade means the largest value in light themes. — [Carbon, Color palettes](https://carbondesignsystem.com/data-visualization/color-palettes/)
- Carbon alert palette for status: Red 60 da1e28 (danger), Orange 40 ff832b (serious warning), Yellow 30 f1c21b (warning), Green 60 198038 (success). — [Carbon, Color palettes](https://carbondesignsystem.com/data-visualization/color-palettes/)
- Carbon: "Always use consistent colors for each data set within a dashboard." — [Carbon, Dashboards](https://carbondesignsystem.com/data-visualization/dashboards/)
- Datawrapper (Lisa Charlotte Muth): "Gray is the most important color in data visualization". Use it for less important, missing or context data. Define lighter and darker shades of each hue for de-emphasis and ordered data. — [Datawrapper blog, A detailed guide to colors in data vis style guides](https://www.datawrapper.de/blog/colors-for-data-vis-style-guides)

### Inferences
- Monthly revenue plus profit: grouped or overlaid columns for revenue (12 months), with profit as a line or a darker inner bar in the same hue family. The current month is highlighted and earlier months use a lighter tint. Negative-profit months show as bars below a zero baseline.
- Revenue mix by 4 order types: one horizontal bar list sorted by value, with the label, VND value and %. Or use a single 100% stacked bar. Not a donut. Assign each order type one fixed color and reuse it on badges, filters and charts: băng keo in, trục in, băng keo trơn, thiệp Thank you.
- Debt aging: horizontal bars by bucket (chưa đến hạn, 1–30, 31–60, 61–90, >90 ngày). Use one sequential ramp, getting darker or more red with age, so order is carried by lightness, not by rainbow hues.
- Production pipeline (chờ SX, đang SX, sẵn sàng giao, đã giao trong tháng): a horizontal segmented bar or 4 bars with counts. Clicking a step opens the filtered workshop list. "Đã giao" can be muted grey, because it needs no action.
- Pick 4 categorical colors from one palette (for example Carbon's first 4: 6929c4, 1192e8, 005d5d, 9f1853) for order types, plus grey. Keep red, orange and green for status only, so they are never reused as category colors.

### Gaps
- Observable and Datawrapper "chart choice" articles were not retrieved. Chart guidance above rests on NN/g and Carbon.

## 4. Status color system (badges) for order and production states

### Takeaway
Define semantic tokens (neutral, info, progress, success, warning, danger), map each state to one token, and always pair color with a text label (and ideally an icon or shape). Meet 4.5:1 for badge text and 3:1 for non-text indicators. Badges are non-interactive and use adjective labels.

### Cited Findings
- WCAG 2.2 SC 1.4.11 Non-text Contrast (AA): graphical objects and UI components needed to understand content need at least 3:1 contrast against adjacent colors. — [W3C, Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- GOV.UK Tag: "Do not use colour alone to convey information" (WCAG 2.2 SC 1.4.1). Keep the same color for the same tag everywhere. Use the red tag for something like "Urgent". — [GOV.UK Design System, Tag](https://design-system.service.gov.uk/components/tag/)
- GOV.UK Tag: tags only indicate status. Do not make them links or buttons. Use adjectives, not verbs. Sometimes a single status is enough (no tag means the default state). Example mapping: grey Inactive, green New, teal Active, blue Pending, purple Received, magenta Sent, red for urgent items. — [GOV.UK, Tag](https://design-system.service.gov.uk/components/tag/)
- Carbon status indicators: use shape, color and label together. Avoid relying only on color and label. Keep at least 3:1 between status colors and against the background, so status still reads in grayscale. Avoid the same shape in different colors within one experience. — [Carbon, Status indicators](https://carbondesignsystem.com/patterns/status-indicator-pattern/)

### Inferences
- Suggested mapping (Tailwind-style tokens, adjust to the existing `portal-ui` tones):
  - Chờ sản xuất: neutral/grey with a hollow circle icon.
  - Đang sản xuất: info/blue with a half-filled circle or spinner icon.
  - Sẵn sàng giao: warning-free accent (teal or purple) with a box or package icon. It means "action: deliver", so it should stand out but not alarm.
  - Đã giao: success/green with a check icon.
  - Quá hạn giao: danger/red with an alert-triangle icon. This is an overlay flag, not a step, so show it as a second badge.
  - Sắp đến hạn: warning/amber with a clock icon.
- Badge style: light tinted background with dark text of the same hue (for example `bg-*-50 text-*-800 ring-1 ring-*-600/20`). That typically reaches 4.5:1 for text; verify each pair with a contrast checker.
- Never reuse red or green for categories (order types). Keep them for danger and success only.

### Gaps
- No contrast ratios were computed for the project's actual Tailwind tokens in this session.

## 5. Layout grid, density, whitespace, typography, responsive behavior

### Takeaway
Use a 12-column grid on desktop that collapses to 1 column on phones. Give sections consistent spacing and use whitespace instead of borders and color fills. Use tabular figures for numbers and right-align them in tables. Pick one row density and use it everywhere.

### Cited Findings
- Carbon data table offers 5 row heights: 24, 32, 40 (default), 48, 64 px. "Use consistent component sizes throughout a layout". Do not mix header and row heights. — [Carbon, Data table](https://carbondesignsystem.com/components/data-table/usage/)
- NN/g: in tables, the first column should be a human-readable identifier. Order columns by importance and keep related columns next to each other. Freeze headers, use light borders or zebra stripes, and show clearly when filters are active. — [NN/g, Data Tables: Four Major User Tasks (2022)](https://www.nngroup.com/articles/data-tables/)
- NN/g: tables beat card grids for comparison, because cards make users reorient for each card. — [NN/g, Data Tables](https://www.nngroup.com/articles/data-tables/)
- Carbon exploration dashboards: all charts use the same layout and spacing, with legends in the same position. — [Carbon, Dashboards](https://carbondesignsystem.com/data-visualization/dashboards/)

### Inferences
- Desktop (≥1024px): attention strip as a full-width row of compact chips or cards. KPI row of 4 equal columns. Then a 2-column row: revenue/profit chart (8 of 12 columns) and order-type mix (4 of 12). Then pipeline plus debt aging, then two 5-row tables.
- Phone (<640px): one column. The attention strip becomes a vertical list of tappable rows (≥44px tall). KPIs become a 2×2 grid with smaller values. Charts keep full width with fewer ticks (for example every 3rd month label). Tables become stacked rows with the key value on the right.
- Typography: one page title, section titles at one size, KPI values large (about 28–32px) with `tabular-nums`, labels small and muted. Two weights at most.
- Spacing: one scale (for example 4/8/16/24/32px). Same card padding everywhere. Section gap larger than card gap.

### Gaps
- No primary 2022–2026 source was retrieved on mobile dashboard patterns specifically.

## 6. Common mistakes that make admin dashboards look cluttered, and fixes

### Takeaway
The usual causes are too many equal-weight metrics, color used decoratively, area or round charts, inconsistent spacing and series colors, and no comparison context. All of these apply to the current page.

### Cited Findings
- Too many metrics: limit them, and give non-essential items on demand. — [Carbon, Dashboards](https://carbondesignsystem.com/data-visualization/dashboards/)
- No hierarchy: the most important item should get the highest contrast and the largest area. — [Carbon, Dashboards](https://carbondesignsystem.com/data-visualization/dashboards/)
- Pie, donut, gauge and treemap charts on at-a-glance dashboards. — [NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)
- Color used for magnitude, or as the only carrier of meaning. — [NN/g](https://www.nngroup.com/articles/dashboards-preattentive/); [GOV.UK Tag](https://design-system.service.gov.uk/components/tag/)
- Inconsistent series colors across charts. — [Carbon, Dashboards](https://carbondesignsystem.com/data-visualization/dashboards/)
- Too much saturated color; grey should carry context. — [Datawrapper](https://www.datawrapper.de/blog/colors-for-data-vis-style-guides)

### Inferences
- Concrete fixes for the current `AdminDashboard.tsx`:
  1. Split the 9 cards into an attention strip (counts) and 4 money KPIs.
  2. Make cards neutral. Color only zero-or-not alerts and deltas.
  3. Add "so với tháng trước" to every money KPI.
  4. Hide or mute zero-count alerts.
  5. Add 2 charts (12-month revenue/profit; mix by type) instead of more cards.
  6. Replace the step cards with one pipeline bar.

### Gaps
- Stephen Few's "Common Pitfalls in Dashboard Design" PDF (perceptualedge.com) did not download (empty response). His list of 13 pitfalls is therefore not cited.

## 7. Reference designs and design systems to borrow from

### Takeaway
Carbon is the most complete free reference for dashboard hierarchy, palettes and status indicators. GOV.UK is the simplest reference for status tags. NN/g supplies the perception rationale. Tremor and shadcn/ui charts are copy-paste Tailwind + Recharts components.

### Cited Findings
- Carbon: dashboards, color palettes, status indicators and data tables, all cited above. — [Carbon Data visualization](https://carbondesignsystem.com/data-visualization/dashboards/)
- GOV.UK Tag: status tag rules. — [GOV.UK Tag](https://design-system.service.gov.uk/components/tag/)
- Tremor is copy-paste chart components installed with `npm i recharts` plus helper hooks. Its site banner says "Tremor is joining Vercel". — [Tremor docs](https://www.tremor.so/docs/getting-started/installation); [Tremor area chart](https://tremor.so/docs/visualizations/area-chart)
- shadcn/ui `chart.tsx` is a `"use client"` wrapper around `recharts`. It themes series through a generated `<style>` element injected with `dangerouslySetInnerHTML` (line ~94 of the source). — [shadcn/ui chart.tsx source](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/chart.tsx)

### Inferences
- What to borrow: Carbon's hierarchy and palette, GOV.UK's tag rules, and Stripe's or Shopify's KPI-with-delta pattern (not verified here). Linear and Vercel are often cited for restraint (neutral greys, one accent color), but that is a style judgment, not a sourced claim.

### Gaps
- Polaris (data-viz page redirected to a general references page; Polaris Viz appears archived or moved), Stripe, Linear and Vercel dashboard docs were not readable in this session.

## 8. Chart libraries for Next.js 16 + Tailwind with SSR and strict CSP (nonce-only style-src)

### Takeaway
With a nonce-only `style-src`, any server-rendered `style="…"` attribute is blocked. Styles set from client JS through `element.style.prop` are allowed. For a few simple charts (bars, lines, segmented bars), hand-written server-rendered SVG plus Tailwind classes is the most CSP-safe, zero-dependency option. Recharts (directly, or via Tremor or shadcn) works only as client components, and needs checking for SSR style attributes and the shadcn `<style>` injection.

### Cited Findings
- MDN: under a `style-src` without `'unsafe-inline'`, inline `style` attributes are blocked, as are `setAttribute("style", …)` and `style.cssText = …`. "However, styles properties that are set directly on the element's style property will not be blocked". — [MDN, CSP style-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src)
- MDN: a nonce allows specific inline `<style>` blocks. — [MDN, CSP style-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src)
- Next.js CSP guide: nonce-based setup with `style-src 'self' 'nonce-${nonce}'`, generated in `proxy`. The nonce is passed in the `x-nonce` header. — [Next.js, Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)
- Recharts has a history of CSP issues. Issue #735 ("CSP problems on string length calculation", closed) and PR #1145 ("Update to allow CSP compliance on setting styles", closed). — [recharts #735](https://github.com/recharts/recharts/issues/735); [recharts PR #1145](https://github.com/recharts/recharts/pull/1145)
- shadcn/ui chart is a client component and injects a `<style>` via `dangerouslySetInnerHTML`. Under nonce-only CSP that element needs the nonce, or the colors must move to CSS classes or variables in a stylesheet. — [shadcn chart.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/chart.tsx)
- The repo already handles this constraint elsewhere: `DeliveryNoteSheet.tsx` uses a nonce'd `<style>`, `TurnstileWidget.tsx` avoids SSR `style=""`, and `landing.test.tsx` asserts no inline style attributes. — repo files under `web/src/`

### Inferences
- Options compared:
  - **Pure SVG, server component (recommended for this scope).** Bars, lines and stacked bars are about 50–100 lines each. Use SVG presentation attributes (`x`, `y`, `width`, `height`, `d`) and Tailwind `fill-*`/`stroke-*` classes. Neither is a `style` attribute, so CSP is fine. Zero JS shipped and no new dependency. Add `<title>` or `aria-label` plus a visually hidden table for accessibility. Tooltips can be a native `<title>`. Downside: no hover interactivity or animation.
  - **Recharts directly / Tremor / shadcn chart.** Rich interactivity and well known. It must be a client component (`"use client"`). `ResponsiveContainer` and wrappers emit inline `style` in SSR markup; verify in the browser console under the real CSP before adopting (not verified in this session). shadcn's `ChartStyle` needs a nonce. Adds roughly 100 KB+ of client JS (size not measured here).
  - **Chart.js.** Canvas-based, client-only. Canvas drawing is not affected by `style-src`, but Chart.js sets canvas sizes through styles from JS (likely `element.style`, which is allowed). Not verified.
  - **visx.** Low-level SVG primitives for React. Composable and SSR-friendly in principle, but more code than hand-written SVG for 4 simple charts.
- Given the ponytail and CSP constraints, start with server-rendered SVG components in `features/portal-ui` (`BarChart`, `LineBar`, `SegmentBar`, `Sparkline`). Move to Recharts only if hover tooltips or zooming become real requirements.

### Gaps
- Not tested here whether Recharts 2.x/3.x SSR output under Next 16 contains `style=` attributes. Not tested whether Chart.js triggers CSP violations. Bundle sizes not measured.
