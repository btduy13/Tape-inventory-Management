# Electron app — complete feature inventory (port reference for `web/`)

Date: 2026-11-08. Source: `electron/` at commit `f17a2bdd` (v1.5.22). All paths below are relative to `electron/`.
Purpose: exhaustive, line-referenced spec of every user-visible Electron feature so the Next.js admin can reach parity.

Conventions used in the app (apply everywhere):

| Concern | Rule | Ref |
|---|---|---|
| Money display | `utils.formatCurrency`: round half away from zero, `,` thousands separator, no decimals, suffix `đ` added by caller; null/NaN -> `"0"` | `js/utils.js:4` |
| Money input parse | `utils.parseCurrency`: accepts `.` and `,`; multiple separators -> last one is decimal only if followed by 1-2 digits; single separator + exactly 3 digits + int part 1-3 digits (not 0) = thousands | `js/utils.js:22` |
| Currency inputs | class `currency-format`: reformat on blur, block non-numeric keys | `js/utils.js:241` |
| Date display | `dd/mm/yyyy` local time | `js/utils.js:52` |
| Default delivery date | tomorrow (local, not UTC) for every order form + after "Xóa form" + quote conversion dialog | `js/app.js:28`, `js/utils.js:90` |
| Rounding | every money amount goes through `orderMath.money` = `Math.round`; VAT rounded once per line; totals = sum of rounded lines | `js/orderMath.js:21-28` |
| Order id | `PREFIX-MM-YY-NNN` (min 3 digits, numeric max of existing ids +1, retry up to 5x on unique violation 23505) | `js/orderMath.js:262`, `js/modules/bangkeoin.js:513-541` |
| Prefixes | BKI `BK`, BK `B`, TI `TI`, Thank you `TY`; quotes `BG-BK`, `BG-B`, `BG-TI` | `bangkeoin.js:369`, `bangkeo.js:189`, `trucin.js:191`, `thankyou.js:122`, `quotations.js:1418-1421` |
| Order type from id | `BK-`->bang_keo_in, `TI-`->truc_in, `TY-`->thank_you, else bang_keo | `js/modules/exportManager.js:17` |
| Toasts | `utils.showToast(msg, success/warning/danger/info)` | `js/utils.js:214` |
| Confirm dialog | `utils.confirmAction(msg, {title, confirmText, danger, date})` modal `#modal-confirm-action`, optional date input returns `YYYY-MM-DD` | `js/utils.js:139`, `index.html:1984-1994` |
| Double-submit guard | per-form Set + `utils.beginFormSubmit/endFormSubmit` | `bangkeoin.js:253-260` |

---

## 0. Shell / navigation

| Item | Detail | Ref |
|---|---|---|
| Sidebar tabs | Tổng quan (`dashboard`), Bán Hàng (`sales`), Báo Giá (`quotes-creation`), Các Đơn Báo Giá (`quotes-list`), Thống Kê (`thong-ke`) | `index.html:39-80` |
| Page titles | dashboard "Tổng quan", sales "Quản Lý Bán Hàng", quotes-creation "Báo Giá Đơn Hàng", quotes-list "Các Đơn Báo Giá", thong-ke "Báo Cáo Thống Kê" + breadcrumb "Trang chủ › …" | `js/app.js:60-66` |
| Tab load | dashboard -> `loadDashboardData`, thong-ke -> `loadStatsData`, quotes-list -> `loadQuotationsData` | `js/app.js:72-79` |
| Theme toggle | Sáng/Tối, saved in localStorage `bang-keo-ui-theme` | `index.html:85`, `js/app.js:158-187` |
| Header | Command palette button (Ctrl+K), company badge "BĂNG KEO VĨNH THỊNH", connection badge "Mây: Kết nối / Cần cấu hình / Mất kết nối" (click = DB config manager), shortcuts button, refresh button (F5) | `index.html:103-133`, `js/app.js:1046-1088` |
| Footer | status text "Đã sẵn sàng"/"Không thể tải dữ liệu mới", clock "Cập nhật: HH:MM" every 30 s | `index.html:1521-1523`, `js/app.js:1038` |
| Auto refresh | dashboard / thong-ke reload every 30 s and on window focus; skipped if modal/menu open or window hidden; keeps stats row selection | `js/app.js:985-1036` |
| Command palette | 19 actions (open tabs, create each order type, quotes, stats filters overdue/near-due/unsettled, Excel template/import, Xuất đơn, Excel export, refresh, check updates, DB config, shortcuts); ↑↓ Enter Esc | `js/app.js:963-983`, `1089-1170` |
| Shortcuts | Ctrl+K palette, Ctrl+/ shortcuts, F5 refresh per tab, Delete = delete selected stats rows (not in inputs), Ctrl+S save active form / submit active modal (edit, email, export select, export preview), Ctrl+T calculate active form, Ctrl+E export Excel (form or stats), Ctrl+F focus search (stats / quotes list), Ctrl+M email selected stats row, Ctrl+D attachments of selected row, Ctrl+Q close modal or quit (confirm), Esc close top modal | `js/app.js:1211-1388`, `index.html:1968-1975` |
| Ctrl+E on a sales/quote form | exports the current form as a 1-row xlsx (`don_hang_<prefix>_<date>.xlsx`, sheet "Chi tiết đơn hàng") | `js/app.js:776-960` |

## 1. Tổng quan (dashboard) — `js/modules/dashboard.js`, `index.html:141-243`

| Element | Content / formula | Ref |
|---|---|---|
| KPI "Đơn hàng" (Tháng này) | `COUNT(id)` all 4 tables, `thoi_gian >= 1st of current month (local)`, not quotes | `db/readActions.js:40`, `dashboard.js:8,89` |
| KPI "Doanh thu" (Tháng này) | `SUM(thanh_tien_ban)`; BKI adds `truc_thanh_tien_ban` when `loai_truc='moi'`; excl. VAT | `readActions.js:40-55` |
| KPI "Giá trị TB" (Mỗi đơn) | revenue / orders (0 if none) | `dashboard.js:87` |
| KPI "Sản phẩm chủ lực" (Top số lượng) | `ten_hang` with max `SUM(so_luong)` this month; label truncated 18/16 chars, full text in title | `readActions.js:57`, `dashboard.js:96` |
| Quick actions | "Tạo đơn Băng Keo In", "Tạo báo giá", "Xuất đơn / phiếu giao", "Mở lệnh nhanh" | `index.html:183-188` |
| Attention "Quá hạn giao" (danger) | not quote, not `da_giao`, `ngay_du_kien < today (Asia/Ho_Chi_Minh)`; click -> Thống kê status=overdue | `readActions.js:77-95`, `index.html:192` |
| Attention "Giao trong 3 ngày" (warning) | not quote, not delivered, `today <= ngay_du_kien <= today+3d`; click -> near-due | same |
| Attention "Công nợ mở" (info) | `SUM(cong_no_khach)` where not quote and not `da_tat_toan`; click -> unsettled | same |
| Attention "Nợ nhà cung cấp" (warning) | `SUM(cong_no_ncc)` not quote, not settled; click -> Thống kê | same |
| Attention "Báo giá chờ" (success) | `COUNT(is_quote)`; click -> quotes list | same |
| Chart "Thống kê doanh số" (line, 2 y-axes) | pills Ngày (30 days, day buckets, label `d/m`) / Tuần (12 weeks from Monday, `d/m/yy`) / Tháng (12 months from day 1, `Th.m/yy`); datasets "Số lượng cuộn/trục" = `SUM(so_luong)`, "Doanh thu (triệu đ)" = amount/1e6 (BKI incl. new axis) | `dashboard.js:128-250`, `readActions.js:97` |
| Chart "Phân bố sản phẩm" (pie) | `SUM(so_luong)` by `ten_hang`, all time, not quotes; slices < 3 % merged into "Khác"; labels truncated 12/10; 10-colour palette | `dashboard.js:253-323`, `readActions.js:117` |
| Attention-card border colours | danger `#ef4444`, warning `#f59e0b`, info `#6366f1`, success `#10b981` | `styles.css:25-31,564-567` |

## 2. Bán Hàng (order creation) — 4 sub-forms

Sub-tab pills: "Băng Keo In Logo", "Băng Keo Thường", "Gia Công Trục In", "Băng Keo Thank you" (`index.html:250-253`). Forms are restructured at runtime into cards (Tên hàng / Khách hàng / …) by `restructureSalesForm` (`quotations.js:131`). Every form has buttons **Xóa form**, **Tính toán**, **Lưu đơn hàng**; live recalculation on `input` of numeric fields.

Shared on every form:
- `Tên hàng *` with autocomplete: `order.suggestNames` (ILIKE `%q%`, non-quotes, 8 most recent distinct) -> selecting fills from `order.latestByName` (latest non-quote order with that name) and toasts "Đã tự điền thông tin cũ" (`readActions.js:14-33`, `bangkeoin.js:105-170`).
- `Ngày giao dự kiến *` date (default tomorrow; validated `YYYY-MM-DD` real date, `parseDeliveryDateInput` `bangkeoin.js:544`).
- `Tên khách hàng *`, `SĐT khách` (max 30), `Địa chỉ giao` (max 500).
- Customer picker (`js/modules/customers.js`): autocomplete on name and phone via `customer.search` (name/phone, empty = 20 most recently updated) labels `name · phone · company`; pick fills name/phone/address and stores `customer_id` in `dataset.customerId`, hint "Đã gắn khách: X"; button **Lưu thành khách mới** -> `customer.create` (SECURITY DEFINER fn; one phone match returns existing; multiple matches/no name -> error toast). If no customer picked, `customer_id` is not sent and a DB trigger links by phone. Autofill / clear resets picked customer.
- After successful save: toast "Đã lưu đơn hàng thành công! Mã: X", form cleared, then confirm "Đơn hàng đã được lưu. Bạn có muốn đính kèm tệp ngay bây giờ không?" -> OS multi-file picker -> each file inserted to `order_attachments` (content type by extension pdf/png/jpg/jpeg/xlsx/csv else octet-stream) (`bangkeoin.js:409-460`).
- Inserted with `thoi_gian = now`, `da_giao/da_tat_toan/da_gui_email = false`, `is_quote=false`.

### 2.1 Băng Keo In (BKI) — `bangkeoin.js`, `index.html:257-487`, table `bang_keo_in_orders`

| Field (label) | id / column | Type, default | Notes |
|---|---|---|---|
| Quy cách (mm) | `bki-qc-mm` / `quy_cach_mm` | number | |
| Quy cách (m) | `bki-qc-m` / `quy_cach_m` | number | must be > 0 (cost formula) |
| Quy cách (mic) | `bki-qc-mic` / `quy_cach_mic` | number | |
| Cuộn/Cây | `bki-cuon-cay` / `cuon_cay` | number | must be > 0 |
| Loại trục | `bki-loai-truc` / `loai_truc` | switch "Trục cũ"/"Trục mới", default `cu` | shows "Thông tin Trục mới" card |
| Số lượng * | `so_luong` | number | > 0 |
| Phí số lượng / Phí keo / Phí màu / Phí size / Phí cắt (đ) | `phi_sl, phi_keo, phi_mau, phi_size, phi_cat` | currency, 0 | |
| Màu keo, Màu sắc | `mau_keo, mau_sac` | text | |
| Đơn giá vốn (đ) | `don_gia_von` | currency, 0 | base cost per 90 m tree |
| Đơn giá bán * | `don_gia_ban` | currency | > 0 |
| Đơn giá gốc (đ) | `don_gia_goc` | readonly computed | |
| Thành tiền bán / gốc (đ) | `thanh_tien_ban`, `thanh_tien_goc` | readonly | |
| Tiền cọc (đ) | `tien_coc` | currency, 0 | |
| VAT tổng (%) | `vat_percent` (amount -> `vat`) | number 0-100 | "Tiền VAT (đ)" readonly |
| Công nợ khách (đ) | `cong_no_khach` | readonly | |
| Tiền ship (đ) | `tien_ship` | currency | |
| Cộng tác viên (CTV) | `ctv` | text | |
| Hoa hồng (%) | `hoa_hong` | 0-100 | "Tiền hoa hồng" readonly -> `tien_hoa_hong` |
| Lợi nhuận (đ) | `loi_nhuan` | readonly | |
| Lõi Giấy, Thùng/Bao bì | `loi_giay, thung_bao` | text | |
| Lợi nhuận ròng (đ) | `loi_nhuan_rong` | readonly, green bold | |

**Trục mới card** (`index.html:312-372`, visible only when `loai_truc='moi'`): Tên Trục `ten_truc`*, Chu vi `truc_chu_vi` (optional), Số lượng `truc_so_luong`*, Giá gốc `truc_gia_goc`*, Giá bán `truc_gia_ban`*, VAT trục (%) `truc_vat_percent` (+ readonly Tiền VAT trục -> `truc_vat`), readonly Thành tiền gốc/bán `truc_thanh_tien_goc/ban`, CTV `truc_ctv`, Hoa hồng (%) `truc_hoa_hong`, readonly Tiền hoa hồng `truc_tien_hoa_hong`, Lãi `truc_loi_nhuan`, Lãi ròng `truc_loi_nhuan_rong`. Required flags toggled by `setBangKeoInAxisMode` (`bangkeoin.js:37-71`); switching back to Trục cũ clears all axis fields (`:79-102`). When `cu`, all `truc_*` money saved as 0 and text as null (`:348-362`).

**Formulas** (`orderMath.calculatePrintedTape`, `js/orderMath.js:80-142`; `calculateLine` `:38-63`):

```
fees        = don_gia_von + phi_sl + phi_keo + phi_mau + phi_size + phi_cat   (each max 0)
don_gia_goc = fees / 90 * quy_cach_m / cuon_cay        (0 + invalid if m<=0 or cuon_cay<=0)
thanh_tien_goc = round(so_luong * don_gia_goc)
thanh_tien_ban = round(so_luong * don_gia_ban)
loi_nhuan      = thanh_tien_ban - thanh_tien_goc
tien_hoa_hong  = round(max(0, loi_nhuan) * hoa_hong% )
loi_nhuan_rong = loi_nhuan - tien_hoa_hong - round(tien_ship)
vat            = round(thanh_tien_ban * vat_percent/100)
-- axis (only moi), same calculateLine without shipping:
truc_thanh_tien_goc = round(truc_so_luong * truc_gia_goc); truc_thanh_tien_ban = round(truc_so_luong * truc_gia_ban)
truc_loi_nhuan = ban - goc; truc_tien_hoa_hong = round(max(0,truc_loi_nhuan)*truc_hoa_hong%); truc_loi_nhuan_rong = truc_loi_nhuan - truc_tien_hoa_hong
truc_vat = round(truc_thanh_tien_ban * truc_vat_percent/100)
cong_no_khach = settled ? 0 : max(0, thanh_tien_ban + truc_thanh_tien_ban + vat + truc_vat - tien_coc)
cong_no_ncc   (DB trigger) = settled ? 0 : max(0, thanh_tien_goc + (moi ? truc_thanh_tien_goc : 0))
```
Shipping is charged only to the product line; product `loi_nhuan_rong` excludes axis profit (axis has its own). Validation on save: name, customer, so_luong>0, don_gia_ban>0 ("Vui lòng điền đủ Tên hàng, Khách hàng, Số lượng & Đơn giá bán"); valid date; `quy_cach_m>0 && cuon_cay>0`; if moi: axis name, qty>0, cost>0, sale>0 (`bangkeoin.js:269-306`). Insert column order `BANG_KEO_IN_INSERT_COLUMNS` (`:463-476`).

**How the trục is stored**: there is NO separate child row/table. The axis lives in the same `bang_keo_in_orders` row (`loai_truc='moi'` + `truc_*` columns). The "└ TRỤC" sub-row in Thống kê is purely presentational (section 6.3). Quotes may additionally hold multiple axes inside `quote_items[].axes` JSON (section 3).

### 2.2 Băng Keo thường (BK) — `bangkeo.js`, `index.html:488-591`, table `bang_keo_orders`

Fields: Tên hàng*, Ngày giao*, Khách*, SĐT, Địa chỉ, Quy cách (KG) `quy_cach` (free text, e.g. "1.2kg"), Số lượng*, Màu sắc, Đơn giá gốc* `don_gia_goc`, Thành tiền gốc -> column **`thanh_tien`** (not thanh_tien_goc!), Đơn giá bán*, Thành tiền bán, VAT tổng (%), Tiền VAT, Công nợ khách, CTV, Hoa hồng (%), Tiền hoa hồng, Lợi nhuận, Tiền ship, Lợi nhuận ròng. No tiền cọc.
Formula: `orderMath.calculateStandardOrder` (`orderMath.js:65-78`) = calculateLine + `vat = round(thanh_tien_ban*vat%)`, `cong_no_khach = max(0, thanh_tien_ban + vat - deposit)` (deposit not passed -> 0). Validation additionally requires `don_gia_goc > 0` (`bangkeo.js:138`). Supplier debt trigger: `thanh_tien`.

### 2.3 Trục In (TI) — `trucin.js`, `index.html:595-701`, table `truc_in_orders`

Fields: Tên hàng* (placeholder "Tên trục in..."), Ngày giao*, Khách*, SĐT, Địa chỉ, Quy cách (text), Số lượng*, Màu sắc ("Số màu..."), Màu keo, Đơn giá gốc*, Thành tiền gốc `thanh_tien_goc`, Đơn giá bán*, Thành tiền bán, Công nợ khách, VAT (%), Tiền VAT, CTV, Hoa hồng (%), Tiền hoa hồng, Lợi nhuận, Tiền ship, Lợi nhuận ròng. Same formula/validation as BK (`trucin.js:84-141`). Supplier debt: `thanh_tien_goc`.

### 2.4 Thank you (TY) — `thankyou.js`, `index.html:705-815`, table `thank_you_orders`

Fields: Tên hàng* ("Băng keo Thank you..."), Ngày giao*, Khách*, SĐT, Địa chỉ, Kích thước `kich_thuoc` (max 255), Số lượng*, Màu sắc (max 100), Ghi chú `ghi_chu` (max 2000), Đơn giá vốn `don_gia_von`, Thành tiền vốn `thanh_tien_von`, Đơn giá bán*, Thành tiền bán, VAT (%), Tiền VAT, Tiền cọc `tien_coc`, Công nợ khách, CTV, Hoa hồng (%), Tiền hoa hồng, Lợi nhuận, Tiền ship, Lợi nhuận ròng.
Formula: `calculateStandardOrder` with `costPrice=don_gia_von`, `deposit=tien_coc` -> `cong_no_khach = max(0, ban + vat - coc)` (`thankyou.js:46-77`). Validation: name, customer, qty>0, sale>0 (cost may be 0). No quote form and no Excel import for Thank you. Supplier debt = `thanh_tien_von` (`orderMath.js:168`; DB trigger from web migration 0027).

## 3. Báo Giá (quote creation) — `quotations.js`, `index.html:821-1284`

- Sub-tabs: Băng Keo In Logo / Băng Keo Thường / Gia Công Trục In (no Thank you) (`index.html:825-827`).
- Same fields as the order forms minus `Ngày giao dự kiến` (quote `ngay_du_kien` = now) (`bangkeoin.js:274`). VAT label "VAT tổng báo giá (%)".
- **Multiple sizes ("Kích thước và giá")**: tab strip `#quote-drafts-<type>`; each tab = one draft `{id, fields, savedAxes}` (`quotations.js:336-456`). Tab label = `"<mm>mm × <m>m"` (BKI) or quy cách, fallback "Kích thước N"; × closes a tab (min 1); counter "N kích thước". **+ Thêm báo giá** / "+ Thêm kích thước" copies current fields except axis fields, `loai-truc=cu`, `tien-coc=0` (`:409-432`). Shared across tabs: ten-hang, ten-khach-hang, sdt, địa chỉ (`:16`).
- **Multiple axes per size (BKI only)**: card "Trục đang nhập" + button **+ Thêm trục tiếp theo** pushes the current axis into `draft.savedAxes` (needs name, qty>0, cost>0, sale>0) and clears inputs (`:457-472`). Card "Danh sách trục của kích thước này" (`#q-bki-axis-tree`) lists `├─/└─ Trục i: name`, sub-line `Chu vi X · SL n · price đ/trục · VAT p% = vđ`, total, buttons **Sửa** (moves axis back to inputs) / **Xóa** (`:474-534`). Axis object: `{name, circumference, quantity, costPrice, unitPrice, costTotal, total, vat, vatPercent, collaborator, commissionPercent, commission, profit, netProfit}` (`:600-616`).
- Công nợ khách on the quote form = current-tab outstanding + sum of saved axes (total+vat) (`bangkeoin.js:206-209`).
- Submit **Lưu toàn bộ & Xem trước PDF** (or "Cập nhật & Xem trước PDF" in edit mode) -> `prepareQuoteItems` (`quotations.js:842-897`):
  - validation: every BKI tab `qc-m>0 && cuon-cay>0`; every tab qty>0 & unit price>0; every axis complete.
  - `quote_items` = array of items `{specification, quantity, unitPrice, total, costTotal, vat, vatPercent, deposit, shipping, commission, profit, netProfit, axes[], details{mm,m,mic,rollsPerTree,glueColor,printColor,paperCore,packaging | color,glueColor}, fields{raw form fields}}` (`:618-657`). BKI specification = `"<mm>mm x <m>m (<mic>mic)"` (`:536`).
  - Row columns aggregated (`calculateQuoteBundle`, `orderMath.js:209`): `so_luong`=Σqty, `thanh_tien_ban`=Σtotal, `thanh_tien_goc`/`thanh_tien`=ΣcostTotal, if >1 size `don_gia_ban/goc` = weighted average (total/qty), `vat`=Σvat, `vat_percent` derived, `tien_coc`=Σdeposit, `tien_ship`=Σshipping, `loi_nhuan`, `tien_hoa_hong`, `loi_nhuan_rong = loi_nhuan - tien_hoa_hong - tien_ship`; BKI: `loai_truc = axes? 'moi':'cu'`, `ten_truc = "<n> trục in"`, `truc_so_luong`=Σ, `truc_gia_goc/ban` = averages, `truc_thanh_tien_goc/ban`, `truc_vat`, `truc_vat_percent`, `truc_loi_nhuan`, `truc_tien_hoa_hong`, `truc_loi_nhuan_rong`; `cong_no_khach = max(0, products + axes + vat + axisVat - deposit)`.
  - New quote -> insert with `is_quote=true`, id `BG-…`, then PDF preview opens and the form enters edit mode for that id. Edit mode banner "Mã X · mọi thay đổi sẽ ghi đè báo giá này" (`:741-751`); update uses `order.update` with `quoteOnly` and column list `quoteUpdateColumns` (never changes `thoi_gian`) (`:804-840`). "Xóa form" exits edit mode (`app.js:126-149`).

## 4. Các Đơn Báo Giá (quote list) — `quotations.js:905-1026`, `index.html:1288-1356`

| Item | Detail |
|---|---|
| Data | `quote.list`: all 4 tables `is_quote=TRUE`, `to_jsonb(row)`, newest first (`readActions.js:149`) |
| Filters (client) | "Tìm kiếm từ khóa" (id, tên hàng, khách), "Loại báo giá" (Tất cả/Băng Keo In/Băng Keo thường/Trục In/Thank you), "Tháng lọc" (Tất cả, Tháng 1-12 = most recent occurrence of that month), button **Làm mới** |
| Columns | Mã Báo Giá · Ngày Tạo · Tên Hàng · Tên Khách Hàng · Số Lượng (right) · Đơn Giá Bán (right) · Thành Tiền (right, bold) · Hành Động |
| Parent row (`quote-tree-parent`) | Tên Hàng = `ten_hang (TypeLabel)` + `<small>N kích thước · M trục</small>`; Số lượng = Σ qty (en-US, ≤3 decimals); Đơn giá = single price or "Nhiều kích thước / TB xđ"; Thành tiền = Σ(item.total+item.vat) + Σ(axis.total+axis.vat) |
| Child rows (`quote-tree-item`) | `├─/└─ Kích thước i`, spec (bold) + print colour small, qty, unit price, total |
| Grandchild rows (`quote-tree-axis`) | `└─ Trục j`, axis name + "Chu vi X", qty, unit price, total + `VAT p% = vđ` |
| Actions | ✏️ Sửa (BKI/BK/TI only -> reloads drafts into Báo Giá form), 👁️ Xem PDF, 🔄 Chuyển Đơn, 🗑️ Xóa |
| Legacy rows | if `quote_items` empty, a single item synthesized from row columns, incl. one axis if `loai_truc='moi'` (`normalizeStoredQuoteItems` `:546-590`) |
| Chuyển Đơn | confirm with date input (default tomorrow) -> transaction `quote.convertToOrder` (new id with order prefix, `is_quote=false`, `thoi_gian=now`, `ngay_du_kien=chosen`, delivered/settled false, recompute `cong_no_khach`) + `quote.moveAttachments`; retries on id clash; then switches to Thống kê (`:1400-1460`, `writeActions.js:45-56,114-127`) |
| Xóa | confirm "…Tệp đính kèm của báo giá cũng sẽ bị xóa…" -> transaction delete attachments + quote, both guarded `is_quote=TRUE` (`:1354-1398`) |

### Quote PDF (`generateAndSaveQuotePDF`, `quotations.js:1044-1231`)
A4, margins 24/18/18 mm, Segoe UI 12px. Layout: blue accent bar; header grid = logo 56px + company name (uppercase), "Địa chỉ:", "Hotline:" | right "BẢNG BÁO GIÁ" + pill "Số <id>", "Ngày <thoi_gian>". Section "Thông tin khách hàng": Khách hàng, Loại hàng (Băng Keo In Logo / Băng Keo thường / Trục In / Băng keo Thank you). Section "Chi tiết báo giá" table: STT · Tên sản phẩm (ten_hang + "Màu keo/sắc: …") · Quy cách · Số lượng · Đơn giá · Thành tiền; one row per size then one row per axis (name + "Trục của kích thước N", "Chu vi: X"). Totals box: if VAT>0 "Giá gốc (chưa VAT)", "VAT (p% tổng)", "Giá gồm VAT" else "Tổng tiền hàng"; "Đặt cọc trước"; grand "Còn lại cần thu". "Bằng chữ: <toVietnameseWords(remaining)> đồng chẵn"; note "Báo giá có hiệu lực theo thỏa thuận tại thời điểm xác nhận đơn hàng."; signatures "ĐẠI DIỆN KHÁCH HÀNG (Ký, ghi rõ họ tên)" | "NGƯỜI BÁO GIÁ" + representative + "HP: …". Preview in sandboxed iframe modal (`#modal-quote-pdf-preview`), buttons "Quay lại chỉnh sửa" / **Xuất PDF** -> save dialog `bao_gia_<id>.pdf` -> main `print-to-pdf` (A4) (`:1275-1330`, `main.js:910-968`).
Company constants: `utils.companyInfo` (`js/utils.js:97-105`): name "CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI BĂNG KEO IN VĨNH THỊNH", address "90E đường số 18B, P. Bình Hưng Hòa A, Q. Bình Tân, TP. HCM, Việt Nam", hotline "0903003882 - 0936380405", representative "LÝ THANH QUẾ", phone "090 300 3882", logo `assets/logo.png`.

## 5. Status model

| Status | Column | Change paths | Display |
|---|---|---|---|
| Giao hàng | `da_giao` bool | context menu toggle `order.toggleDelivery` (`NOT COALESCE`), bulk dialog, Excel import | summary badge `badge-success` "Đã giao" / `badge-gray` "Chưa giao"; detail "Rồi"/"Chưa" |
| Tất toán | `da_tat_toan` bool | context menu toggle `order.toggleSettlement` (also sets `cong_no_khach`/`cong_no_ncc` to 0 or recomputed), bulk `order.setDeliveryAndSettlement` (NULL = keep) | summary `badge-success` "Đã tất toán" / `badge-warning` "Chưa xong"; detail "Xong"/"Chưa" |
| Đã email | `da_gui_email` bool | set TRUE after successful send (`order.markEmailed`) | `badge-success` "Rồi" / `badge-gray` "Chưa" |
| Quá hạn | derived | not delivered and `ngay_du_kien < today` | Ngày giao cell red `var(--color-danger)` bold |
| Sắp hạn | derived | not delivered and `0 <= days <= 3` | Ngày giao cell amber `var(--color-warning)` bold |
| Báo giá | `is_quote` | quote create / convert | excluded from all order lists/KPIs |

Refs: `writeActions.js:19-56,77-96`, `thongke.js:335-361,415-422`. Badge styles: `styles.css:840-866` (success bg/green `#10b981`, warning bg/amber `#f59e0b`, gray `rgba(156,163,175,.1)` / secondary text; overridden to 4px radius, no uppercase at `styles.css:1983`). Row-colour days use local date; KPI SQL uses `Asia/Ho_Chi_Minh` date.

## 6. Thống kê (Báo cáo thống kê) — `js/modules/thongke.js`, `index.html:1359-1516`

### 6.1 KPI cards (`stats.warningMetrics`, `readActions.js:166-187`; all 4 tables, not quotes)

| Card | Value | Subtitle |
|---|---|---|
| Cảnh báo (red) | `sap_han + qua_han`; sap_han = not delivered & due today..+3d, qua_han = not delivered & due < today | "`X` sắp hạn, `Y` quá hạn" |
| Trạng thái (amber) | `chua_tat_toan` = count not settled | "`N` đã hoàn thành" (= count settled) |
| Tổng công nợ (indigo) | `Σ cong_no_khach` where not settled | "Công nợ khách hàng" |
| Nợ nhà cung cấp (amber) | `Σ cong_no_ncc` where not settled | "Giá vốn đơn chưa tất toán" |
| Lợi nhuận ròng (green) | `Σ (loi_nhuan_rong + (loai_truc='moi' ? truc_loi_nhuan_rong : 0))` all orders (settled or not) | "Ước tính thực tế" |

KPIs are global (not affected by sub-tab or filters). `thongke.js:121-143`.

### 6.2 Toolbar

- Sub-tabs: Băng Keo In / Trục In / Băng Keo / Thank you (switch resets all filters + sort) (`thongke.js:146-170`).
- View: **Tóm tắt** / **Chi tiết** (`:172-181`).
- Filters (client-side, `getFilteredStatsOrders` `:473-538`): "Tìm theo tên..." (id, ten_hang, ten_khach_hang, ten_truc), Tháng (all / 1-12, year = most recent occurrence), Trạng thái (Tất cả / Sắp đến hạn / Quá hạn / Chưa tất toán / Đã hoàn thành=settled), Từ ngày / Đến ngày (on `thoi_gian`, inclusive), Giao hàng (Tất cả/Đã giao/Chưa giao), CTV (matches `ctv` or `truc_ctv` when moi), plus Excel-style column filters.
- Column header button on every column: menu with "↑ Sắp xếp tăng dần", "↓ Sắp xếp giảm dần", value search, "Tất cả", "Bỏ chọn tất cả", "Xóa lọc", checkbox list of distinct display values ("(Trống)" for empty); active header highlighted; caret shows ↑/↓/▾ (`:600-748`). Sort: dates by timestamp, money/numeric cols numeric, else `localeCompare('vi', numeric)`; empties last. Default order from SQL: year desc, month desc, sequence numeric desc (`readActions.js:189-199`).

| Button | Action | Ref |
|---|---|---|
| ⟳ refresh | `loadStatsData` | `index.html:1461` |
| Xóa lọc | reset all filters, column filters, sort | `thongke.js:721` |
| ✓ Cập nhật trạng thái | modal: selected count, "Giao hàng" (Giữ nguyên/Đã giao/Chưa giao), "Tất toán" (Giữ nguyên/Đã tất toán/Chưa tất toán); one transaction; toast "Đã cập nhật x/n đơn" | `:1311-1355`, `index.html:1584-1610` |
| Xuất đơn | opens multi-order export (section 7) | `index.html:1471` |
| Tải mẫu nhập Excel | template for current sub-tab | `excelImport.js:454` |
| Nhập đơn từ Excel | import for current sub-tab | `excelImport.js:497` |
| Xuất Excel | selected rows, or all filtered rows | `thongke.js:898` |
| Gửi Email | first selected row -> email dialog | `:1106` |
| 🗑 Xóa đơn đã chọn | confirm "…Hành động này không thể hoàn tác!", per row transaction delete order + its attachments; partial-failure toast | `:850-896` |
| 📎 Đính kèm tệp | attachments modal for first selected row | `:1116` |
| Selection summary | "Đã chọn: N đơn" + "Tổng CN: Σcong_no_khach đ" | `:81-101` |

Row interaction: click select, Ctrl/Cmd toggle, Shift range; double-click = edit dialog; right-click context menu: 🚚 "Đánh dấu Đã giao/Chưa giao", 💳 "Đánh dấu Đã tất toán/Chưa tất toán", 🖨️ "Xem & In phiếu giao hàng" (single order straight to preview, doc type phiếu giao hàng), 📧 "Gửi email thông báo đơn", ✏️ "Sửa đổi đơn hàng", 🗑️ "Xóa đơn hàng" (deletes selection) (`:451-470,750-805`).

### 6.3 Tóm tắt view (`renderStatsTable`, `thongke.js:299-385`)

Columns (exact order, `statsColumnDefs` `:9-20`): **Mã đơn hàng** (bold) · **Ngày đặt** · **Tên đơn hàng** · **Khách hàng** · **Ngày giao** (overdue/near-due colouring) · **Công nợ khách** (`xđ`) · **Nợ NCC** (`xđ`) · **Giao hàng** (badge) · **Tất toán** (badge) · **Đã Email** (badge). Empty: "Không tìm thấy đơn hàng nào".

**BKI + trục tree** (only sub-tab Băng Keo In and `loai_truc='moi'`): parent `<tr>` gets class `stats-parent-with-axis`; directly after it a non-selectable `<tr class="stats-axis-child" data-parent-id=id>` (no `data-id`, no handlers) (`createStatsAxisChildRow` `:223-267`). Summary cell layout:

| Under column | Content |
|---|---|
| Mã đơn, Ngày đặt | empty |
| Tên đơn hàng + Khách hàng (colspan 2) | `└─` (primary colour, monospace) + badge "TRỤC" (`stats-axis-badge`, uppercase) + bold `ten_truc` (default "Trục mới") |
| Ngày giao | meta "Chu vi `truc_chu_vi` • `truc_so_luong` trục" (Chu vi part omitted if null) |
| Công nợ khách | small "Thành tiền" + bold `truc_thanh_tien_ban`đ (right aligned) |
| Nợ NCC + Giao hàng (colspan 2) | "CTV: `truc_ctv`" or "Không có CTV" • "HH `truc_hoa_hong`% • `truc_tien_hoa_hong`đ" |
| Tất toán | "Lãi ròng `truc_loi_nhuan_rong`đ" (green bold) |
| Đã Email | (no cell emitted — 9 cells for 10 columns) |

Styles `styles.css:2880-2975`.

### 6.4 Chi tiết view (`renderStatsDetailTable`, `:387-442`)

All raw columns per type (`statsDetailColumnsMap` `:47-72`, headers `statsDetailColumnHeaders` `:28-45`); money columns (`statsCurrencyColumns` `:74-79`) right-aligned `xđ`; dates dd/mm/yyyy; flags as badges (Rồi/Chưa, Xong/Chưa).

- BKI (53 cols): Mã Đơn Hàng, Ngày Tạo, Tên Hàng, Khách Hàng, SĐT Khách, Địa Chỉ Giao, Ngày Giao, Quy Cách (mm), Quy Cách (m), Quy Cách (mic), Cuộn/Cây, Số Lượng, Phí SL, Màu Keo, Phí Keo, Màu Sắc, Phí Màu, Phí Size, Phí Cắt, Giá Vốn, Giá Gốc, Tiền Gốc, Giá Bán, Tiền Bán, Tiền Cọc, Công Nợ Khách, Nợ NCC, CTV, Hoa Hồng (%), Tiền H.Hồng, Lõi Giấy, Thùng Bao, Loại Trục, Tên Trục, Chu Vi Trục, SL Trục, Giá Gốc Trục, Giá Bán Trục, VAT Trục, Tiền Gốc Trục, Tiền Bán Trục, CTV Trục, HH Trục (%), Tiền H.Hồng Trục, Lãi Trục, Lãi Ròng Trục, Lợi Nhuận, Tiền Ship, Lợi Nhuận Ròng, VAT, Đã Giao, Đã Tất Toán, Đã Email.
- Trục In: Mã, Ngày Tạo, Tên Hàng, Khách, SĐT, Địa Chỉ, Ngày Giao, Quy Cách, Số Lượng, Màu Sắc, Màu Keo, Giá Gốc, Tiền Gốc, Giá Bán, Tiền Bán, Công Nợ Khách, Nợ NCC, CTV, Hoa Hồng (%), Tiền H.Hồng, Lợi Nhuận, Tiền Ship, Lợi Nhuận Ròng, VAT, Đã Giao, Đã Tất Toán, Đã Email.
- Băng Keo: same as Trục In without Màu Keo and with **Thành Tiền** (`thanh_tien`) instead of Tiền Gốc.
- Thank you: Mã, Ngày Tạo, Tên Hàng, Khách, SĐT, Địa Chỉ, Ngày Giao, Kích Thước, Số Lượng, Màu Sắc, Giá Vốn, Tiền Vốn, Giá Bán, Tiền Bán, Tiền Cọc, Công Nợ Khách, Nợ NCC, CTV, Hoa Hồng (%), Tiền H.Hồng, Lợi Nhuận, Tiền Ship, Lợi Nhuận Ròng, VAT, Ghi Chú, Đã Giao, Đã Tất Toán, Đã Email.
- BKI axis child in detail mode: one `<td colspan=all>` with `└─` + badge "TRỤC ĐI KÈM" + name + "Chu vi X • N trục" + "Giá gốc xđ • Giá bán yđ" + "Thành tiền zđ" + "Hoa hồng p% • hđ" + green "Lãi ròng rđ" (`:233-248`).

### 6.5 Edit dialog (`openEditOrderDialog`, `js/app.js:294-538`)

Modal "Sửa thông tin đơn hàng" (Hủy bỏ / Lưu thay đổi, Ctrl+S). Fields per type (all pre-filled; VAT % = stored % or derived vat/base):
- BKI: Mã đơn (readonly), Tên hàng*, Khách hàng*, SĐT, Địa chỉ, Ngày giao*, Quy cách mm/m/mic, Cuộn/cây, Màu keo, Màu sắc, Lõi giấy, Thùng/bao | Số lượng*, Phí SL/keo/màu/size/cắt, Đơn giá vốn, Đơn giá bán*, Tiền cọc, VAT tổng (%), CTV, Hoa hồng (%), Tiền ship | section "Trục in": Loại trục select (Trục cũ/Trục mới) -> Tên trục*, Chu vi, Số lượng trục*, Giá gốc trục*, Giá bán trục*, VAT trục (%), CTV trục, Hoa hồng trục (%), readonly Tiền hoa hồng trục, Tiền VAT trục, Lợi nhuận ròng trục.
- TI / BK: Mã, Tên hàng, Khách, SĐT, Địa chỉ, Ngày giao, Quy cách, Màu sắc, (TI only) Màu keo | Số lượng, Đơn giá gốc* (>0), Đơn giá bán, VAT (%), Hoa hồng (%), Tiền ship, CTV.
- Thank you: Mã, Tên hàng, Khách, SĐT, Địa chỉ, Ngày giao, Kích thước, Màu sắc, Ghi chú | Số lượng, Đơn giá vốn, Đơn giá bán, Tiền cọc, VAT (%), Hoa hồng (%), Tiền ship, CTV.
- "Kết quả tính toán" (readonly, live): Tiền hoa hồng, Tiền VAT, Thành tiền bán, Lợi nhuận ròng, "Tổng thanh toán gồm VAT (và trục)" = ban+vat(+truc ban+truc vat), Công nợ khách (0 if settled).
- Orders that came from a quote with structured `quote_items`: only Tên hàng, Khách, SĐT, Địa chỉ, Ngày giao editable; note explains money is locked (`app.js:513-534`).
- Save recomputes all money columns with the same orderMath functions and `order.update` (id, thoi_gian, status flags not updatable — `db/orderColumns.js:51`). Customer picker attached with prefix `edit-`; `customer_id` sent only if changed.

### 6.6 Stats Excel export (`thongke.js:898-1104`)

File `don_hang_<orderType>_<YYYY-MM-DD>.xlsx`, sheet "Đơn hàng", widths: Tên Hàng 42, others max(16,len+2). Columns = detail columns with detail headers, BKI excludes `truc_*`/`ten_truc`; flags exported as "Rồi"/"Xong"/"Chưa"; money rounded numbers; then extra columns `VAT (%)`, `Thành Tiền Gồm VAT` (= thanh_tien_ban + vat), `Chu Vi Trục`, `Ghi Chú` (blank for product rows). For BKI each order is followed by one row per axis (from `quote_items[].axes` if their totals match DB `truc_*`, else the single inline axis): `Mã Đơn Hàng`="↳ <id>", `Tên Hàng`="↳ Trục kèm BKI: <name>", `Loại Trục`="Trục kèm BKI", Chu Vi Trục, Số Lượng, Giá Gốc, Giá Bán, VAT, VAT (%), Thành Tiền Gồm VAT, Tiền Gốc, Tiền Bán, CTV, Hoa Hồng (%), Tiền H.Hồng, Lợi Nhuận, Lợi Nhuận Ròng, Ghi Chú "VAT p% · Giá gồm VAT xđ".

### 6.7 Attachments (`thongke.js:1116-1309`, table `order_attachments`)

Modal "Quản lý tệp đính kèm" for first selected order: label "Đơn hàng: <id>", "➕ Thêm tệp mới" (single file ≤ 25 MB, base64 -> `attachment.insert`), table Tên tệp · Kích thước ("x.x KB") · Hành động (**Tải** = download via blob, **Xóa** = confirm then `attachment.delete`). Newest first. Also offered after each order save.

## 7. Xuất đơn / phiếu giao hàng — `js/modules/exportManager.js`

1. **Selector modal** "Xuất Đơn Đặt Hàng / Phiếu Giao Hàng" (`index.html:1766-1840`): doc type pills **Đơn đặt hàng** (default) / **Phiếu giao hàng**; filters Năm (current..-5, default current), Tháng (all/1-12), Loại (all/BKI/TI/BK/Thank you), search (id/tên hàng/khách). Data `export.listOrders` (non-quotes, all tables, newest first). Columns: ☐ · Mã đơn · Ngày đặt · Tên hàng · Khách hàng · Số lượng (`vi-VN` ≤3 decimals + " KG" for bang_keo else " cuộn") · Đơn giá. Row click toggles, double-click selects+continues, select-all; selection persists across filter changes with counter "Đã chọn N đơn (M đơn đang bị bộ lọc ẩn)". **Tiếp tục ➔**.
2. **Preview editor** "Xem trước & Điều chỉnh chứng từ": "Kính gửi (Khách hàng)" (first order's customer), "Địa chỉ" (first order's `dia_chi_khach_hang`); editable lines table Tên sản phẩm · Quy cách · Màu keo · Màu sắc · Đơn vị · Số lượng · Đơn giá · VAT · Thành tiền · Xóa; editing qty/price recomputes total and VAT at stored %; editing VAT stores new %. Totals: "Tổng tiền hàng" = "`subtotal`đ + VAT `vat`đ", "Đặt cọc trước" (default Σ `tien_coc` of selected orders), "Còn lại cần thu". Any order load failure aborts.
   - Line building (`buildExportProductsFromOrder` `:322-389`): if `quote_items` matches DB totals -> one line per size (`<id>-i`) + one line per axis (`<id>-i-TRUC-j`, unit "trục", Màu keo "Trục mới", specs "Chu vi X"); else one line from the row (`total=thanh_tien_ban`, sale values never cost) + for BKI moi an extra axis line `<id>-TRUC` (`ten_truc`, `truc_so_luong`, `truc_gia_ban`, `truc_vat`, `truc_thanh_tien_ban`).
   - Quy cách/unit: BKI `"<int mm>mm x <int m>m x <int mic>mic"` cuộn; TY `kich_thuoc` cuộn; TI `quy_cach` + "mm" if missing, cuộn; BK `quy_cach` (+ "kg" if purely numeric), unit **KG**.
3. **Print modal** "Xem trước Đơn đặt hàng / Phiếu giao hàng" (Đóng / Lưu PDF / In chứng từ) renders (`generateCombinedPrintInvoice` `:546-728`), Arial 10pt: header (6px blue top border) logo 64px + centred company name (15pt, uppercase, blue), address, "Hotline: …"; title **ĐƠN ĐẶT HÀNG** or **PHIẾU GIAO HÀNG** 20pt; "Kính gửi:" (dotted line if empty) + right "Ngày: <today>", "Địa chỉ:"; goods table grey header two-level: Tên Sản Phẩm | Quy Cách | In Ấn{Màu Sắc, Màu Keo} | Đơn Vị Tính | Đơn Giá Theo Số Lượng{Số lượng, Đơn Giá, VAT} | Tổng Cộng; footer rows "VAT", "Tổng cộng" (subtotal+VAT), "Tiền cọc" (red, "-x"), "Còn lại cần thu" (blue). "Số tiền bằng chữ: **<words> đồng chẵn.**" Signatures: phiếu giao hàng = "NGƯỜI GIAO HÀNG" | "NGƯỜI NHẬN HÀNG"; đơn đặt hàng = "NGƯỜI NHẬN HÀNG" | company name + "ĐẠI DIỆN THƯƠNG MẠI" + representative + "HP:…". Totals via `orderMath.calculateVoucherTotals` (`orderMath.js:174`).
   - **Lưu PDF**: `don_dat_hang_<date>.pdf` / `phieu_giao_hang_<date>.pdf`, A4 margin 12 mm (`:476-515`). **In chứng từ**: native print of the window (`print-window`).
4. Context-menu shortcut (single order, phiếu giao hàng) skips step 1 (`thongke.js:1358`).

## 8. Email — `js/modules/emailDialog.js`, `main.js:1104-1200`

| Part | Detail |
|---|---|
| Trigger | Thống kê toolbar / Ctrl+M / context menu (first selected order) |
| Default To | `tque197@gmail.com`; autocomplete from `email_history` (50 most recent/most sent), multiple recipients split by `,`/`;` |
| Subject | base = "<TypeLabel> <ten_hang>" (Băng Keo In / Trục In / Băng Keo Thank you / Băng Keo); checkbox **Trục mới** (pre-checked if BKI moi) prefixes "TRỤC MỚI - " else "TRỤC CŨ - " |
| Body template (contenteditable) | "Chào bác, / Bác làm giúp con đơn hàng <Type> "<b>ten_hang</b>" này nhé: / Thông tin đơn hàng: / ____ / Màu sắc: … (Mặc định) / Màu keo: … (Thường) / Số lượng: n KG\|cuộn / spec lines (BKI: "Quy cách: mm * m * mic", "Lõi giấy", "Thùng bao"; TI: Quy cách; TY: Kích thước + Ghi chú; BK: Quy cách (+KG if numeric)) / ____ / Cám ơn bác / Quế" |
| Editor toolbar | font family (Arial, Times New Roman, Courier New, Verdana, Tahoma, Calibri), size 10-36px, B / I / U, colour |
| Attachments | table ☐ · Tên tệp tin · Kích thước · Nguồn (DB attachments of the order pre-checked + "➕ Thêm tệp..." local files); total ≤ 25 MB |
| SMTP settings (collapsible "⚙️ Cài đặt SMTP") | Máy chủ SMTP, Cổng, Tài khoản, Mật khẩu ứng dụng (blank = keep), Người gửi hiển thị; "Kiểm tra kết nối", "Lưu cài đặt SMTP" (IPC get/save/test-email-config) |
| Send | main process shows native confirm (recipient, subject, attachment names) then nodemailer; on success `order.markEmailed` + email_history increment/insert per recipient (`emailDialog.js:549-578`) |

## 9. Excel import / template — `js/modules/excelImport.js` (BKI, TI, BK only; Thank you -> "Loại đơn này chưa hỗ trợ nhập/mẫu Excel")

- Template `mau_nhap_<type>.xlsx`: sheet `<label>` (headers + 1 sample row) + sheet "Huong dan". Headers: BKI: Tên hàng, Tên khách hàng, Ngày dự kiến, Quy cách (mm), Quy cách (m), Quy cách (mic), Cuộn/Cây, Số lượng, Phí SL, Màu keo, Phí keo, Màu sắc, Phí màu, Phí size, Phí cắt, Đơn giá vốn, Đơn giá bán, Tiền cọc, CTV, Hoa hồng (%), Lõi giấy, Thùng/Bao, Tiền ship, Loại trục, Tên Trục, Chu vi Trục, Số lượng Trục, Giá gốc Trục, Giá bán Trục, CTV Trục, Hoa hồng Trục (%), Đã giao, Đã tất toán, VAT (%), VAT Trục (%). TI: Tên hàng, Tên khách hàng, Ngày dự kiến, Quy cách, Số lượng, Màu sắc, Màu keo, Đơn giá gốc, Đơn giá bán, CTV, Hoa hồng (%), Tiền ship, Đã giao, Đã tất toán, VAT (%). BK: same minus Màu keo (`:2-56`).
- Import: first sheet, header aliases (accent-insensitive, `:57-143`), booleans accept 1/true/yes/y/x/rồi/xong/đã giao/có (`:169`), dates dd/mm/yyyy or Excel dates. Rows starting "↳" or Loại trục "Trục kèm BKI" are rejected (they're export detail rows). Validation per row (`:391-439`): text limits, required name/customer, qty>0, sale>0, cost>0 (TI/BK), complete new axis, valid date, non-negative fees, percents 0-100. All errors listed in one toast. Confirm "Nhập N đơn …", ids allocated sequentially from next id, whole batch in ONE transaction (retry 3x on 23505); money computed with same orderMath.

## 10. Settings / config / updates (brief)

| Feature | Detail | Ref |
|---|---|---|
| DB connection | Postgres pool; badge "Mây"; manager dialog to check/export/import encrypted portable config (passphrase), recovery dialog | `main.js:143-247,562-683` |
| Schema migrations | on startup, advisory-locked: `email_history`, `app_schema_meta`, adds `cong_no_ncc, is_quote, vat, vat_percent, quote_items, sdt/dia_chi` + BKI `truc_*`, backfills, triggers `trg_sync_customer_debt` / `trg_sync_supplier_debt` | `main.js:276-457` |
| Email config | SMTP saved by main process into user config (secrets encrypted via `secretStore.js`) | `main.js` IPC `get/save/test-email-config` |
| Update manager | version label "Phiên bản vX" in sidebar; "Kiểm tra cập nhật" (GitHub Releases via electron-updater), progress toasts | `js/modules/updateManager.js:1-82`, `updater.js` |
| Logging | `writeLog` to file | `main.js:256` |
| tape_presets / tape_widths / tape_spec_settings | **Not used anywhere in Electron** — web-only (`web/src/features/admin/server/presets.ts`, `tape-specs.ts`) | grep |
| Customers tab | **No customers list/management tab in Electron**; only the picker/create button on forms (section 2) | `customers.js` |

## 11. DB surface (everything the app reads/writes)

Read actions (`db/readActions.js`): `order.getById` (:8, opt. `quoteOnly`), `order.suggestNames` (:14), `order.latestByName` (:25), `order.listIdsByPrefix` (:35), `dashboard.monthMetrics` (:40), `dashboard.topProduct` (:57), `dashboard.attention` (:77), `dashboard.salesTrend` (:97), `dashboard.productDistribution` (:117), `export.listOrders` (:136), `quote.list` (:149), `stats.warningMetrics` (:166), `stats.listOrders` (:189), `attachment.listForOrder` (:201), `attachment.getData` (:210), `customer.search` -> `electron_customer_search(q, NULL, 20)` (:216), `customer.create` -> `electron_customer_create(name, phone, address)` (:223), `emailHistory.suggestions` (:232).

Write actions (`db/writeActions.js`): `order.insert` (:59), `order.update` (:67, opt. `quoteOnly`), `order.markEmailed` (:77), `order.toggleDelivery` (:82), `order.toggleSettlement` (:87), `order.setDeliveryAndSettlement` (:92), `order.delete` (:98), `quote.deleteAttachments` (:104), `quote.delete` (:109), `quote.convertToOrder` (:114), `quote.moveAttachments` (:120), `attachment.insert` (:129, ≤25 MB base64), `attachment.delete` (:147), `attachment.deleteForOrder` (:152), `emailHistory.increment` (:158), `emailHistory.insert` (:163). Transactions via `db-transaction` IPC.

Writable columns (`db/orderColumns.js:6-48`; update excludes `id, thoi_gian, da_giao, da_tat_toan, da_gui_email, is_quote`):

| Table | Columns |
|---|---|
| all | `id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien, sdt_khach_hang(30), dia_chi_khach_hang(500), customer_id(uuid), da_giao, da_tat_toan, da_gui_email, is_quote` |
| `bang_keo_in_orders` | `quy_cach_mm, quy_cach_m, quy_cach_mic, cuon_cay, so_luong, phi_sl, mau_keo, phi_keo, mau_sac, phi_mau, phi_size, phi_cat, don_gia_von, don_gia_goc, thanh_tien_goc, don_gia_ban, thanh_tien_ban, tien_coc, cong_no_khach, ctv, hoa_hong, tien_hoa_hong, loi_giay, thung_bao, loi_nhuan, tien_ship, loi_nhuan_rong, loai_truc, ten_truc, truc_chu_vi, truc_so_luong, truc_gia_goc, truc_gia_ban, truc_thanh_tien_goc, truc_thanh_tien_ban, truc_ctv, truc_hoa_hong, truc_tien_hoa_hong, truc_loi_nhuan, truc_loi_nhuan_rong, truc_vat, truc_vat_percent, vat, vat_percent, quote_items` |
| `bang_keo_orders` | `quy_cach, so_luong, mau_sac, don_gia_goc, thanh_tien, don_gia_ban, thanh_tien_ban, cong_no_khach, ctv, hoa_hong, tien_hoa_hong, loi_nhuan, tien_ship, loi_nhuan_rong, vat, vat_percent, quote_items` |
| `truc_in_orders` | `quy_cach, so_luong, mau_sac, mau_keo, don_gia_goc, thanh_tien_goc, don_gia_ban, thanh_tien_ban, cong_no_khach, ctv, hoa_hong, tien_hoa_hong, loi_nhuan, tien_ship, loi_nhuan_rong, vat, vat_percent, quote_items` |
| `thank_you_orders` | `kich_thuoc(255), mau_sac, so_luong, don_gia_ban, thanh_tien_ban, vat, vat_percent, tien_coc, cong_no_khach, don_gia_von, thanh_tien_von, tien_ship, loi_nhuan, loi_nhuan_rong, ctv, hoa_hong, tien_hoa_hong, ghi_chu(2000)` (no `quote_items`) |
| read-only (trigger) | `cong_no_ncc` all tables; `cong_no_khach` also re-derived by trigger |
| other tables | `order_attachments(id, order_type, order_id, file_name, content_type, file_size, data bytea, created_at)`, `email_history(email_address, last_sent_at, sent_count)`, `app_schema_meta`, `customers` (via functions) |

## 12. Port gotchas noticed

- Summary axis child row emits 9 cells for 10 columns (Đã Email cell missing) — `thongke.js:251-265`.
- BK cost total column is `thanh_tien` (others `thanh_tien_goc`, TY `thanh_tien_von`).
- KPI "Lợi nhuận ròng" sums all orders including settled; "Cảnh báo" counts include settled-but-undelivered orders.
- Due-date colouring uses local date; SQL KPIs use `Asia/Ho_Chi_Minh`.
- Quote form `ngay_du_kien` = save time; real delivery date chosen at conversion.
- Email default recipient and body signature ("Quế") are hard-coded.
