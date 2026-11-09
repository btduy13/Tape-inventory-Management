# Web admin ngang app Electron (đợt 2), phân quyền, tốc độ

Ngày 08/11/2026. Nguồn: `2026-11-08-electron-feature-inventory.md` (app làm gì, file:line) và
`2026-11-08-web-admin-audit.md` (web đang thế nào, nguyên nhân chậm).

## Yêu cầu chủ dự án

- Web làm được mọi thứ app làm: danh sách đơn như Thống kê của app, form lên / sửa đơn y như app (BKI kèm
  trục), cây BKI → trục, xuất đơn đặt hàng / phiếu giao hàng, báo giá nhiều kích thước, email, Excel, đính kèm.
- Danh sách đơn gọn: bỏ cột "Nguồn"; ngày đặt chỉ ngày; trạng thái gộp 1 cột, badge màu như app; công nợ hiện
  số còn nợ, đã tất toán thì hiện "Đã tất toán".
- Admin quản lý người dùng: vai trò + tick tab được xem + tick từng quyền (xem tiền lời/chi phí, lên đơn, sửa đơn,
  đổi trạng thái, xóa).
- Tab Khách hàng: giữ hàng chờ duyệt (không tự tạo khách). Dữ liệu có sau khi admin duyệt `/admin/khach-hang/gop`.
- Web nhanh, mượt hơn.

## Tên cố định (các gói dùng chung)

| Thứ | Tên |
|---|---|
| Migration | `supabase/migrations/0030_web_parity_permissions.sql` (một file; gói khác cần SQL thì thêm 0031+) |
| Quyền | `profiles.nav_tabs text[]` (null = mặc định theo vai trò), `profiles.permissions text[]` |
| Mã tab | `overview`, `leads`, `orders`, `quotes`, `customers`, `workshop`, `users`, `settings` |
| Mã quyền | `orders.view`, `orders.money` (xem giá vốn / lời / nợ NCC), `orders.create`, `orders.edit`, `orders.status`, `orders.delete`, `orders.export`, `customers.edit` |
| Hàm SQL | `public.has_perm(p text) returns boolean` (admin luôn true; người khác: tài khoản active và `p = any(permissions)`) |
| RPC đơn | các RPC `admin_order*` hiện có đổi `is_admin()` → `has_perm(...)` tương ứng; không có `orders.money` thì các cột tiền vốn / lời / nợ NCC / CTV / hoa hồng trả `null` |
| RPC mới | `admin_orders_totals(p_filter jsonb, p_type text)` (KPI tách khỏi list); `admin_orders_list` trả thêm `loai_truc, ten_truc, truc_chu_vi, truc_so_luong, truc_thanh_tien_ban, truc_ctv, truc_hoa_hong, truc_tien_hoa_hong, truc_loi_nhuan_rong, da_gui_email, tien_coc` |
| RPC xuất đơn | `admin_orders_for_export(p_ids text[])` trả mỗi đơn kèm loại, khách, địa chỉ, quy cách, số lượng, giá bán, VAT, cọc, `quote_items`, trục |
| Đính kèm | RPC `admin_order_attachments(p_type, p_id)`, `admin_order_attachment_get(p_attachment_id)`, `admin_order_attachment_add(...)`, `admin_order_attachment_delete(...)` trên bảng `order_attachments` hiện có (app lưu base64, ≤ 25 MB) |
| Email | gửi bằng `resend` (đã có trong web, dùng lại helper gửi mail hiện có); chưa cấu hình → nút báo "Chưa cấu hình email"; thành công → `da_gui_email = true` và ghi `email_history` |
| Excel | thêm dependency `xlsx` (SheetJS, app đang dùng `xlsx.full.min.js`) cho xuất / nhập / tải mẫu; cột như app |
| Route | `/admin/don-hang` (Thống kê), `/admin/don-hang/moi?type=`, `/admin/don-hang/[id]/sua`, `/admin/don-hang/xuat?ids=&doc=phieu_giao_hang\|don_dat_hang`, `/admin/bao-gia`, `/admin/bao-gia/moi`, `/admin/bao-gia/[id]`, `/admin/users` |
| Tiền | mọi công thức lấy từ `electron/js/orderMath.js` (web đã port ở `features/admin-orders/lib`); test parity giữ nguyên |

## Gói việc

1. **DB** (0030): quyền + `has_perm`, đổi gate RPC, cột trục trong list, `admin_orders_totals`, index
   (`thoi_gian`, `ten_khach_hang` trgm nếu có pg_trgm, `customer_id`), `admin_orders_for_export`, RPC đính kèm,
   `admin_order_get` trả luôn tên khách. pgTAP mới `20_permissions_parity`. Cập nhật `verify-production.sql`.
2. **Danh sách đơn** (`features/admin-orders/components/OrdersView|OrdersTable|...`): giống Tóm tắt của app:
   tab loại (Băng keo in, Trục in, Băng keo, Thank you, Tất cả), 5 thẻ KPI như app, bộ lọc như app (tên, tháng,
   trạng thái, từ/đến ngày, giao hàng, CTV), cột: Mã · Ngày đặt (chỉ ngày) · Tên đơn · Khách · Ngày giao (đỏ quá
   hạn / cam sắp hạn) · Công nợ (số hoặc badge "Đã tất toán") · Nợ NCC (chỉ khi có `orders.money`) · Trạng thái
   (một cột: bước xưởng nếu BKI, Đã/Chưa giao, Đã email) · thao tác. Dòng con `└ TRỤC` dưới BKI có trục mới
   (Chu vi · số trục · thành tiền · CTV/HH · lãi ròng). Bỏ Nguồn + `firstNotes`. Chọn nhiều + tổng công nợ đã
   chọn. Thao tác: cập nhật trạng thái (giữ nguyên / đã / chưa), xuất đơn, Excel xuất + nhập + tải mẫu, email,
   đính kèm, xóa, in phiếu giao 1 đơn. Tự làm mới 60 s, chỉ khi tab hiện.
3. **Form đơn** (`OrderForm` + edit): bố cục 2 thẻ như app ("Thông tin cơ bản", "Giá và Chi phí"), công tắc
   "Có trục mới" mở thẻ "Thông tin Trục mới" ở giữa (BKI), thứ tự trường như app, ô tiền có dấu chấm nghìn,
   ô tính sẵn chỉ đọc hiện ngay trong form. Cả 4 loại. Đơn từ báo giá nhiều kích thước: chỉ sửa tên, khách,
   SĐT, địa chỉ, ngày giao (như app).
4. **Xuất đơn + email**: trang chọn đơn (lọc năm/tháng/loại/tìm, chọn nhiều) → xem trước, sửa dòng, cọc →
   in / Lưu PDF (trình duyệt) chứng từ "ĐƠN ĐẶT HÀNG" / "PHIẾU GIAO HÀNG" đúng bố cục app (tiêu đề công ty,
   bảng 2 tầng, tổng, số tiền bằng chữ, chữ ký). Gửi email theo mẫu app.
5. **Báo giá**: tạo báo giá nhiều kích thước + nhiều trục mỗi kích thước (`quote_items`), danh sách dạng cây,
   in báo giá, chuyển thành đơn (đã có RPC).
6. **Người dùng + tốc độ**: `/admin/users` sửa vai trò, tên, SĐT, tick tab, tick quyền; menu và page gate đọc
   `nav_tabs` / `permissions`; `getCurrentProfile` bọc `cache()`; `loading.tsx` riêng cho chi tiết / mới / sửa;
   customer picker nhẹ hơn.
7. **QC** 3 hướng (bảo mật & dữ liệu, nghiệp vụ ngang app, UI/tốc độ/mobile) → sửa → chạy lại toàn bộ kiểm tra.

Production (migration, deploy) chỉ làm khi chủ dự án duyệt.
