// THAO TÁC ĐỌC DỮ LIỆU (SELECT) — SQL cố định, chỉ giá trị đi qua tham số $n
const p = require('./params');

const NOT_QUOTE = '(is_quote = FALSE OR is_quote IS NULL)';
const VN_TODAY = "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date";

const readActions = {
  'order.getById': ({ orderType, id, quoteOnly = false }) => ({
    sql: `SELECT * FROM ${p.orderTable(orderType)} WHERE id = $1${p.bool(quoteOnly, 'quoteOnly') ? ' AND is_quote = TRUE' : ''}`,
    values: [p.recordId(id)]
  }),

  // Gợi ý tên hàng từ lịch sử đơn (không gồm báo giá)
  'order.suggestNames': ({ orderType, query }) => ({
    sql: `
    SELECT ten_hang
    FROM ${p.orderTable(orderType)}
    WHERE ten_hang ILIKE $1 AND ${NOT_QUOTE}
    GROUP BY ten_hang
    ORDER BY MAX(thoi_gian) DESC
    LIMIT 8`,
    values: [`%${p.text(query, { name: 'từ khóa', max: 200, allowEmpty: true })}%`]
  }),

  'order.latestByName': ({ orderType, name }) => ({
    sql: `
      SELECT * FROM ${p.orderTable(orderType)}
      WHERE ten_hang ILIKE $1 AND ${NOT_QUOTE}
      ORDER BY thoi_gian DESC
      LIMIT 1`,
    values: [p.text(name, { name: 'tên hàng', max: 500 })]
  }),

  // Danh sách mã cùng tiền tố tháng (BK-MM-YY) để sinh mã kế tiếp
  'order.listIdsByPrefix': ({ orderType, prefix }) => ({
    sql: `SELECT id FROM ${p.orderTable(orderType)} WHERE id LIKE $1`,
    values: [`${p.orderIdPrefix(prefix)}-%`]
  }),

  'dashboard.monthMetrics': ({ since }) => ({
    sql: `
    SELECT
      COUNT(id) AS total_orders,
      COALESCE(SUM(thanh_tien_ban), 0) AS total_revenue
    FROM (
      SELECT id, thoi_gian, COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) ELSE 0 END AS thanh_tien_ban FROM bang_keo_in_orders WHERE thoi_gian >= $1 AND ${NOT_QUOTE}
      UNION ALL
      SELECT id, thoi_gian, thanh_tien_ban FROM truc_in_orders WHERE thoi_gian >= $1 AND ${NOT_QUOTE}
      UNION ALL
      SELECT id, thoi_gian, thanh_tien_ban FROM bang_keo_orders WHERE thoi_gian >= $1 AND ${NOT_QUOTE}
    ) AS combined`,
    values: [p.timestamp(since, 'mốc thời gian')]
  }),

  'dashboard.topProduct': ({ since }) => ({
    sql: `
    SELECT
      ten_hang,
      SUM(so_luong) AS total_qty
    FROM (
      SELECT ten_hang, thoi_gian, so_luong FROM bang_keo_in_orders WHERE thoi_gian >= $1 AND ${NOT_QUOTE}
      UNION ALL
      SELECT ten_hang, thoi_gian, so_luong FROM truc_in_orders WHERE thoi_gian >= $1 AND ${NOT_QUOTE}
      UNION ALL
      SELECT ten_hang, thoi_gian, so_luong FROM bang_keo_orders WHERE thoi_gian >= $1 AND ${NOT_QUOTE}
    ) AS combined
    GROUP BY ten_hang
    ORDER BY total_qty DESC NULLS LAST
    LIMIT 1`,
    values: [p.timestamp(since, 'mốc thời gian')]
  }),

  'dashboard.attention': () => ({
    sql: `
    SELECT
      SUM(CASE WHEN NOT COALESCE(is_quote, FALSE) AND NOT COALESCE(da_giao, FALSE) AND ngay_du_kien >= ${VN_TODAY} AND ngay_du_kien <= ${VN_TODAY} + INTERVAL '3 days' THEN 1 ELSE 0 END) AS due_soon,
      SUM(CASE WHEN NOT COALESCE(is_quote, FALSE) AND NOT COALESCE(da_giao, FALSE) AND ngay_du_kien < ${VN_TODAY} THEN 1 ELSE 0 END) AS overdue,
      SUM(CASE WHEN NOT COALESCE(is_quote, FALSE) AND NOT COALESCE(da_tat_toan, FALSE) THEN COALESCE(cong_no_khach, 0) ELSE 0 END) AS open_debt,
      SUM(CASE WHEN NOT COALESCE(is_quote, FALSE) AND NOT COALESCE(da_tat_toan, FALSE) THEN COALESCE(cong_no_ncc, 0) ELSE 0 END) AS supplier_debt,
      SUM(CASE WHEN COALESCE(is_quote, FALSE) THEN 1 ELSE 0 END) AS pending_quotes
    FROM (
      SELECT ngay_du_kien, da_giao, da_tat_toan, cong_no_khach, cong_no_ncc, is_quote FROM bang_keo_in_orders
      UNION ALL
      SELECT ngay_du_kien, da_giao, da_tat_toan, cong_no_khach, cong_no_ncc, is_quote FROM truc_in_orders
      UNION ALL
      SELECT ngay_du_kien, da_giao, da_tat_toan, cong_no_khach, cong_no_ncc, is_quote FROM bang_keo_orders
    ) AS combined`,
    values: []
  }),

  'dashboard.salesTrend': ({ period, since }) => ({
    sql: `
    SELECT
      DATE_TRUNC($1, thoi_gian) AS period,
      SUM(so_luong) AS quantity,
      SUM(thanh_tien_ban) AS amount
    FROM (
      SELECT thoi_gian, so_luong, COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) ELSE 0 END AS thanh_tien_ban FROM bang_keo_in_orders WHERE thoi_gian >= $2 AND ${NOT_QUOTE}
      UNION ALL
      SELECT thoi_gian, so_luong, thanh_tien_ban FROM truc_in_orders WHERE thoi_gian >= $2 AND ${NOT_QUOTE}
      UNION ALL
      SELECT thoi_gian, so_luong, thanh_tien_ban FROM bang_keo_orders WHERE thoi_gian >= $2 AND ${NOT_QUOTE}
    ) AS combined
    GROUP BY period
    ORDER BY period`,
    values: [p.oneOf(period, ['day', 'week', 'month'], 'chu kỳ'), p.timestamp(since, 'mốc thời gian')]
  }),

  'dashboard.productDistribution': () => ({
    sql: `
    SELECT
      ten_hang,
      SUM(so_luong) AS total_quantity
    FROM (
      SELECT ten_hang, so_luong FROM bang_keo_in_orders WHERE ${NOT_QUOTE}
      UNION ALL
      SELECT ten_hang, so_luong FROM truc_in_orders WHERE ${NOT_QUOTE}
      UNION ALL
      SELECT ten_hang, so_luong FROM bang_keo_orders WHERE ${NOT_QUOTE}
    ) AS combined
    GROUP BY ten_hang
    ORDER BY total_quantity DESC`,
    values: []
  }),

  'export.listOrders': () => ({
    sql: `
    SELECT id, thoi_gian, ten_hang, ten_khach_hang, so_luong, don_gia_ban, 'bang_keo_in' as type FROM bang_keo_in_orders WHERE ${NOT_QUOTE}
    UNION ALL
    SELECT id, thoi_gian, ten_hang, ten_khach_hang, so_luong, don_gia_ban, 'truc_in' as type FROM truc_in_orders WHERE ${NOT_QUOTE}
    UNION ALL
    SELECT id, thoi_gian, ten_hang, ten_khach_hang, so_luong, don_gia_ban, 'bang_keo' as type FROM bang_keo_orders WHERE ${NOT_QUOTE}
    ORDER BY thoi_gian DESC`,
    values: []
  }),

  'quote.list': () => ({
    sql: `
      SELECT to_jsonb(q) AS order_data, thoi_gian, 'bang_keo_in' AS type
      FROM bang_keo_in_orders q WHERE is_quote = TRUE
      UNION ALL
      SELECT to_jsonb(q) AS order_data, thoi_gian, 'bang_keo' AS type
      FROM bang_keo_orders q WHERE is_quote = TRUE
      UNION ALL
      SELECT to_jsonb(q) AS order_data, thoi_gian, 'truc_in' AS type
      FROM truc_in_orders q WHERE is_quote = TRUE
      ORDER BY thoi_gian DESC`,
    values: []
  }),

  'stats.warningMetrics': () => ({
    sql: `
    SELECT
      SUM(CASE WHEN NOT COALESCE(da_giao, FALSE) AND ngay_du_kien >= ${VN_TODAY} AND ngay_du_kien <= ${VN_TODAY} + INTERVAL '3 days' THEN 1 ELSE 0 END) AS sap_han,
      SUM(CASE WHEN NOT COALESCE(da_giao, FALSE) AND ngay_du_kien < ${VN_TODAY} THEN 1 ELSE 0 END) AS qua_han,
      SUM(CASE WHEN NOT COALESCE(da_tat_toan, FALSE) THEN 1 ELSE 0 END) AS chua_tat_toan,
      SUM(CASE WHEN COALESCE(da_tat_toan, FALSE) THEN 1 ELSE 0 END) AS hoan_thanh,
      SUM(CASE WHEN NOT COALESCE(da_tat_toan, FALSE) THEN COALESCE(cong_no_khach, 0) ELSE 0 END) AS tong_cong_no,
      SUM(CASE WHEN NOT COALESCE(da_tat_toan, FALSE) THEN COALESCE(cong_no_ncc, 0) ELSE 0 END) AS tong_cong_no_ncc,
      SUM(loi_nhuan_rong + CASE WHEN loai_truc = 'moi' THEN truc_loi_nhuan_rong ELSE 0 END) AS tong_loi_nhuan
    FROM (
      SELECT da_giao, ngay_du_kien, da_tat_toan, cong_no_khach, cong_no_ncc, COALESCE(loi_nhuan_rong, 0) AS loi_nhuan_rong, COALESCE(truc_loi_nhuan_rong, 0) AS truc_loi_nhuan_rong, loai_truc FROM bang_keo_in_orders WHERE ${NOT_QUOTE}
      UNION ALL
      SELECT da_giao, ngay_du_kien, da_tat_toan, cong_no_khach, cong_no_ncc, COALESCE(loi_nhuan_rong, 0) AS loi_nhuan_rong, 0 AS truc_loi_nhuan_rong, NULL AS loai_truc FROM truc_in_orders WHERE ${NOT_QUOTE}
      UNION ALL
      SELECT da_giao, ngay_du_kien, da_tat_toan, cong_no_khach, cong_no_ncc, COALESCE(loi_nhuan_rong, 0) AS loi_nhuan_rong, 0 AS truc_loi_nhuan_rong, NULL AS loai_truc FROM bang_keo_orders WHERE ${NOT_QUOTE}
    ) AS combined`,
    values: []
  }),

  // Sắp xếp theo năm, tháng rồi số thứ tự dạng số (không theo thứ tự chữ)
  'stats.listOrders': ({ orderType }) => ({
    sql: `
    SELECT * FROM ${p.orderTable(orderType)}
    WHERE ${NOT_QUOTE}
    ORDER BY
      split_part(id, '-', 3) DESC,
      split_part(id, '-', 2) DESC,
      NULLIF(regexp_replace(split_part(id, '-', 4), '[^0-9]', '', 'g'), '')::bigint DESC NULLS LAST,
      split_part(id, '-', 4) DESC`,
    values: []
  }),

  'attachment.listForOrder': ({ orderId, orderType }) => ({
    sql: `
    SELECT id, file_name, file_size
    FROM order_attachments
    WHERE order_id = $1 AND order_type = $2
    ORDER BY created_at DESC`,
    values: [p.recordId(orderId), p.orderType(orderType)]
  }),

  'attachment.getData': ({ id }) => ({
    sql: "SELECT content_type, encode(data, 'base64') AS base64_data FROM order_attachments WHERE id = $1",
    values: [p.positiveInt(id, 'mã tệp')]
  }),

  'emailHistory.suggestions': () => ({
    sql: 'SELECT email_address, SUM(sent_count) as total_count FROM email_history GROUP BY email_address ORDER BY MAX(last_sent_at) DESC, total_count DESC LIMIT 50',
    values: []
  })
};

module.exports = { readActions };
