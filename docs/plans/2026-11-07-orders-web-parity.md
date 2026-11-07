# Đơn hàng lên web (ngang app), khách hàng, Thank you

Ngày 07/11/2026. Dựa trên audit `2026-11-07-audit-app-vs-web.md`.

## Quyết định đã chốt (chủ dự án)

- Web và app Electron chạy song song trên cùng bảng: sửa bên nào, bên kia thấy.
- Chỉ admin: lên đơn, sửa giá, đổi trạng thái, xóa, xem chi phí / lời / công nợ.
- Khách hàng: bảng `customers`, 1 khách nhiều đơn. Đơn cũ tự gom, ca không chắc vào danh sách chờ admin duyệt.
- App Electron có ô chọn / tạo khách khi lên đơn.
- Băng keo Thank you: loại đơn riêng, bảng riêng, mã `TY-MM-YY-NNN`, tab riêng trên web và app. Ô riêng: tên, kích thước, màu (+ khách, số lượng, giá như đơn thường). Tách toàn bộ đơn Thank you hiện có (production: 8 đơn ở `bang_keo_in_orders`, 11 ở `bang_keo_orders`, khớp `ten_hang ILIKE '%thank%'`) sang bảng mới, giữ mã cũ trong bảng map để tra / hoàn tác.

## Mặc định (đổi được, chủ dự án chưa nói khác)

- Thank you KHÔNG qua xưởng (sản phẩm chuyên biệt). Chỉ băng keo in qua xưởng như hiện tại.
- Báo giá nhiều kích thước (`quote_items`): vẫn tạo trong app; web xem, chuyển thành đơn, xóa.
- Giữ trong app: nhập Excel, gửi email SMTP, file đính kèm, in PDF đơn/hóa đơn. Web: xuất CSV.
- Đồng bộ: web tự làm mới 30 s + khi quay lại tab; app tự làm mới tab Thống kê.
- 21 đơn cũ "Chưa vào xưởng": nút "Đưa vào xưởng" từng đơn + chọn nhiều.

## Tên cố định

| Thứ | Tên |
|---|---|
| Bảng Thank you | `public.thank_you_orders`, id `TY-MM-YY-NNN` |
| Cột Thank you | `ten_hang, kich_thuoc, mau_sac, so_luong, don_gia_ban, thanh_tien_ban, vat, vat_percent, tien_coc, cong_no_khach, don_gia_von, thanh_tien_von, tien_ship, loi_nhuan, ctv, hoa_hong, tien_hoa_hong, ghi_chu` + chung `id, thoi_gian, ngay_du_kien, ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang, customer_id, da_giao, da_tat_toan, da_gui_email, is_quote` |
| Map tách Thank you | `public.thank_you_migration_map(old_table, old_id, new_id, old_row jsonb, migrated_at)` |
| Khách hàng | `public.customers(id uuid, name, phone, phone_norm, address, company, note, created_at, updated_at)`; `customer_id uuid` nullable trên 4 bảng đơn + `leads` |
| Kiểu đơn (RPC `p_type`) | `bang_keo_in` \| `bang_keo` \| `truc_in` \| `thank_you` |
| Route | `/admin/don-hang?type=`, `/admin/don-hang/moi?type=`, `/admin/don-hang/[id]`, `/admin/don-hang/[id]/sua`, `/admin/khach-hang`, `/admin/khach-hang/[id]`, `/admin/khach-hang/gop` |

## Gói việc

1. **DB-1** (0025–0027): bảng cũ cho local (guard `to_regclass`, không đổi production), RPC đơn chung 4 kiểu (list + tổng, update, set status hàng loạt, delete, convert quote, đưa vào xưởng, gợi ý tên), bảng Thank you + tách dữ liệu + quyền `electron_app`.
2. **DB-2** (0028): customers, trigger gắn khách theo SĐT chuẩn hóa, RPC khách (list/get/create/update/merge), sửa RPC đơn nhận `customer_id`, script backfill dry-run + apply (`supabase/scripts/customers_backfill.sql`) và hàng chờ duyệt.
3. **Web đơn hàng**: tab theo kiểu (BKI / Băng keo / Trục in / Thank you / Báo giá), thanh tổng, sắp xếp, tô đỏ quá hạn, chọn nhiều, nút trạng thái, sửa giá, xóa, chuyển báo giá, đưa vào xưởng, CSV, tự làm mới; form tạo/sửa 4 kiểu y như app, chọn khách.
4. **Web khách hàng**: danh sách, chi tiết (mọi đơn 4 bảng, công nợ), tạo/sửa, gộp, màn duyệt ghép đơn cũ.
5. **Web tổng quan admin**: KPI tháng, cảnh báo, xu hướng; xóa overview cũ chết.
6. **Electron**: tab Thank you (tạo/sửa/list/thống kê/công nợ), ô chọn/tạo khách, tự làm mới, sửa lỗi `mau_keo` băng keo trơn, ngày khi chuyển báo giá, đặt trạng thái hàng loạt atomic, ponytail Electron.
7. **Ponytail web**: xóa code chết theo audit mục 4 sau khi 3–5 xong.
8. **QC** 3 hướng (bảo mật/dữ liệu, nghiệp vụ & đồng bộ app↔web, UI/a11y) → sửa → chạy lại toàn bộ kiểm tra.

Production (migration, tách Thank you, backfill khách, deploy, build app) chỉ làm khi chủ dự án duyệt.
