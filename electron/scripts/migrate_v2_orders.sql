-- Gộp lịch sử đơn cũ từ các bảng *_v2 vào bảng chính mà app đang đọc.
--   bang_keo_in_orders_v2 (180 đơn, 01–06/2026) -> bang_keo_in_orders
--   bang_keo_orders_v2    (32 đơn, 12/2024–05/2026) -> bang_keo_orders
--   truc_in_orders_v2 trùng 100% với truc_in_orders -> bỏ qua.
--
-- An toàn khi chạy lại: chỉ chèn id chưa có trong bảng chính.
-- Không xoá/sửa bảng *_v2 (giữ làm bản sao lưu).
-- Trigger trg_sync_customer_debt / trg_sync_supplier_debt sẽ tính lại cong_no_khach / cong_no_ncc
-- theo cùng công thức với đơn mới (đơn đã tất toán -> 0).
--
-- Chạy: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate_v2_orders.sql

BEGIN READ WRITE;

-- Đơn cũ không đưa vào xưởng: tắt trigger bang_keo_in_orders_production_sync trong giao dịch này.
SET LOCAL app.production_sync = 'off';

-- Các bảng *_v2 hiện không có đơn nào bật VAT hoặc trục in (has_vat / has_truc_in đều false).
-- Nếu có, cách quy đổi (truc_quy_cach, VAT theo % nào) cần kiểm tra lại trước khi gộp: dừng hẳn.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM bang_keo_in_orders_v2 WHERE has_vat OR has_truc_in OR is_quote)
     OR EXISTS (SELECT 1 FROM bang_keo_orders_v2 WHERE has_vat OR is_quote) THEN
    RAISE EXCEPTION 'Có đơn *_v2 dùng VAT/trục in/báo giá — cần rà lại ánh xạ cột trước khi gộp';
  END IF;
END $$;

INSERT INTO bang_keo_in_orders (
  id, thoi_gian, ten_hang, ngay_du_kien, quy_cach_mm, quy_cach_m, quy_cach_mic, cuon_cay, so_luong,
  phi_sl, mau_keo, phi_keo, mau_sac, phi_mau, phi_size, phi_cat, don_gia_von, don_gia_goc, thanh_tien_goc,
  don_gia_ban, thanh_tien_ban, tien_coc, cong_no_khach, ctv, hoa_hong, tien_hoa_hong, loi_giay, thung_bao,
  loi_nhuan, da_giao, da_tat_toan, tien_ship, loi_nhuan_rong, ten_khach_hang, da_gui_email, is_quote,
  loai_truc, vat, vat_percent
)
SELECT
  v.id, v.thoi_gian, v.ten_hang, v.ngay_du_kien, v.quy_cach_mm, v.quy_cach_m, v.quy_cach_mic, v.cuon_cay, v.so_luong,
  v.phi_sl, v.mau_keo, v.phi_keo, v.mau_sac, v.phi_mau, v.phi_size, v.phi_cat, v.don_gia_von, v.don_gia_goc, v.thanh_tien_goc,
  v.don_gia_ban, v.thanh_tien_ban, v.tien_coc, v.cong_no_khach, v.ctv, v.hoa_hong, v.tien_hoa_hong, v.loi_giay, v.thung_bao,
  v.loi_nhuan, COALESCE(v.da_giao, FALSE), COALESCE(v.da_tat_toan, FALSE), COALESCE(v.tien_ship, 0),
  COALESCE(v.loi_nhuan_rong, 0), COALESCE(v.ten_khach_hang, ''), COALESCE(v.da_gui_email, FALSE), FALSE,
  'cu', 0, 0
FROM bang_keo_in_orders_v2 v
WHERE NOT EXISTS (SELECT 1 FROM bang_keo_in_orders o WHERE o.id = v.id);

INSERT INTO bang_keo_orders (
  id, thoi_gian, ten_hang, ngay_du_kien, quy_cach, so_luong, mau_sac, don_gia_goc, thanh_tien,
  don_gia_ban, thanh_tien_ban, cong_no_khach, ctv, hoa_hong, tien_hoa_hong, loi_nhuan, da_giao,
  da_tat_toan, tien_ship, loi_nhuan_rong, ten_khach_hang, da_gui_email, is_quote, vat, vat_percent
)
SELECT
  v.id, v.thoi_gian, v.ten_hang, v.ngay_du_kien, v.quy_cach, v.so_luong, v.mau_sac, v.don_gia_goc, v.thanh_tien,
  v.don_gia_ban, v.thanh_tien_ban, v.cong_no_khach, v.ctv, v.hoa_hong, v.tien_hoa_hong, v.loi_nhuan,
  COALESCE(v.da_giao, FALSE), COALESCE(v.da_tat_toan, FALSE), COALESCE(v.tien_ship, 0),
  COALESCE(v.loi_nhuan_rong, 0), COALESCE(v.ten_khach_hang, ''), COALESCE(v.da_gui_email, FALSE), FALSE, 0, 0
FROM bang_keo_orders_v2 v
WHERE NOT EXISTS (SELECT 1 FROM bang_keo_orders o WHERE o.id = v.id);

-- Khách đã trả hết các đơn BKI tháng 1–6/2026 (xác nhận 2026-11-01): đánh dấu tất toán.
-- Trigger đưa cong_no_khach / cong_no_ncc về 0. Chỉ đụng tới đơn gộp từ *_v2.
UPDATE bang_keo_in_orders o
SET da_tat_toan = TRUE
FROM bang_keo_in_orders_v2 v
WHERE o.id = v.id AND NOT COALESCE(o.da_tat_toan, FALSE);

-- Các đơn cũ đều đã giao (xác nhận 2026-11-01): không để chúng bị đếm là quá hạn.
UPDATE bang_keo_in_orders o SET da_giao = TRUE
FROM bang_keo_in_orders_v2 v
WHERE o.id = v.id AND NOT COALESCE(o.da_giao, FALSE);

UPDATE bang_keo_orders o SET da_giao = TRUE
FROM bang_keo_orders_v2 v
WHERE o.id = v.id AND NOT COALESCE(o.da_giao, FALSE);

-- Kiểm tra: mọi id *_v2 phải có mặt trong bảng chính.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM bang_keo_in_orders_v2 v WHERE NOT EXISTS (SELECT 1 FROM bang_keo_in_orders o WHERE o.id = v.id))
     OR EXISTS (SELECT 1 FROM bang_keo_orders_v2 v WHERE NOT EXISTS (SELECT 1 FROM bang_keo_orders o WHERE o.id = v.id)) THEN
    RAISE EXCEPTION 'Gộp thiếu đơn — huỷ toàn bộ';
  END IF;
END $$;

COMMIT;
