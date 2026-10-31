// THAO TÁC GHI DỮ LIỆU (INSERT/UPDATE/DELETE) — SQL dựng ở tiến trình chính, giá trị qua tham số $n
const p = require('./params');
const { pickOrderColumns } = require('./orderColumns');
const orderMath = require('../js/orderMath');

const MAX_ATTACHMENT_BASE64 = Math.ceil((25 * 1024 * 1024) / 3) * 4 + 4;

function placeholders(count, start = 1) {
  return Array.from({ length: count }, (_, index) => `$${index + start}`).join(', ');
}

// Địa chỉ đã được emailPolicy kiểm tra trước khi gửi; ở đây chỉ chặn giá trị bất thường
function emailAddress(value) {
  const address = p.text(value, { name: 'địa chỉ email', max: 320 });
  if (!address.includes('@')) throw p.paramError('Địa chỉ email không hợp lệ');
  return address;
}

// Cập nhật cờ tất toán + công nợ trong cùng câu lệnh; công thức dùng chung với orderMath.outstandingFromOrder
function settlementUpdateSql(table) {
  const customerDebt = orderMath.customerDebtSqlExpression(table);
  const supplierDebt = orderMath.supplierDebtSqlExpression(table);
  return `UPDATE ${table}
      SET da_giao = $1,
          da_tat_toan = $2,
          cong_no_khach = CASE WHEN $2 THEN 0 ELSE ${customerDebt} END,
          cong_no_ncc = CASE WHEN $2 THEN 0 ELSE ${supplierDebt} END
      WHERE id = $3`;
}

// Đảo trạng thái tất toán dựa trên giá trị hiện có trong DB (vế phải UPDATE đọc giá trị cũ của dòng)
function settlementToggleSql(table) {
  const customerDebt = orderMath.customerDebtSqlExpression(table);
  const supplierDebt = orderMath.supplierDebtSqlExpression(table);
  return `UPDATE ${table}
    SET da_tat_toan = NOT COALESCE(da_tat_toan, FALSE),
        cong_no_khach = CASE WHEN NOT COALESCE(da_tat_toan, FALSE) THEN 0 ELSE ${customerDebt} END,
        cong_no_ncc = CASE WHEN NOT COALESCE(da_tat_toan, FALSE) THEN 0 ELSE ${supplierDebt} END
    WHERE id = $1
    RETURNING da_tat_toan`;
}

// Chuyển báo giá thành đơn: thoi_gian ($3) và ngay_du_kien ($4) lấy theo giờ máy như mọi thao tác ghi khác
function quoteConversionSql(table) {
  return `
        UPDATE ${table}
        SET id = $1,
            is_quote = FALSE,
            thoi_gian = $3,
            ngay_du_kien = $4,
            da_giao = FALSE,
            da_tat_toan = FALSE,
            cong_no_khach = ${orderMath.customerDebtSqlExpression(table)}
        WHERE id = $2 AND is_quote = TRUE`;
}

const writeActions = {
  'order.insert': ({ orderType, values }) => {
    const { table, columns, values: params } = pickOrderColumns(orderType, values, 'insert');
    return {
      sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders(columns.length)})`,
      values: params
    };
  },

  'order.update': ({ orderType, id, values, quoteOnly = false }) => {
    const { table, columns, values: params } = pickOrderColumns(orderType, values, 'update');
    const assignments = columns.map((column, index) => `${column} = $${index + 1}`).join(', ');
    const quoteFilter = p.bool(quoteOnly, 'quoteOnly') ? ' AND is_quote = TRUE' : '';
    return {
      sql: `UPDATE ${table} SET ${assignments} WHERE id = $${columns.length + 1}${quoteFilter}`,
      values: [...params, p.recordId(id)]
    };
  },

  'order.markEmailed': ({ orderType, id }) => ({
    sql: `UPDATE ${p.orderTable(orderType)} SET da_gui_email = TRUE WHERE id = $1`,
    values: [p.recordId(id)]
  }),

  'order.toggleDelivery': ({ orderType, id }) => ({
    sql: `UPDATE ${p.orderTable(orderType)} SET da_giao = NOT COALESCE(da_giao, FALSE) WHERE id = $1 RETURNING da_giao`,
    values: [p.recordId(id)]
  }),

  'order.toggleSettlement': ({ orderType, id }) => ({
    sql: settlementToggleSql(p.orderTable(orderType)),
    values: [p.recordId(id)]
  }),

  'order.setDeliveryAndSettlement': ({ orderType, id, delivered, settled }) => ({
    sql: settlementUpdateSql(p.orderTable(orderType)),
    values: [p.bool(delivered, 'đã giao'), p.bool(settled, 'đã tất toán'), p.recordId(id)]
  }),

  'order.delete': ({ orderType, id }) => ({
    sql: `DELETE FROM ${p.orderTable(orderType)} WHERE id = $1`,
    values: [p.recordId(id)]
  }),

  // Cả hai câu xóa báo giá đều kiểm tra is_quote = TRUE: đơn thật không thể bị xóa từ danh sách báo giá
  'quote.deleteAttachments': ({ orderType, id }) => ({
    sql: `DELETE FROM order_attachments WHERE order_id = $1 AND order_type = $2 AND EXISTS (SELECT 1 FROM ${p.orderTable(orderType)} WHERE id = $1 AND is_quote = TRUE)`,
    values: [p.recordId(id), p.orderType(orderType)]
  }),

  'quote.delete': ({ orderType, id }) => ({
    sql: `DELETE FROM ${p.orderTable(orderType)} WHERE id = $1 AND is_quote = TRUE`,
    values: [p.recordId(id)]
  }),

  'quote.convertToOrder': ({ orderType, quoteId, newId, convertedAt, deliveryDate }) => ({
    sql: quoteConversionSql(p.orderTable(orderType)),
    values: [p.recordId(newId), p.recordId(quoteId), p.timestamp(convertedAt), p.dateOnly(deliveryDate, 'ngày giao')]
  }),

  // Tệp đính kèm chỉ chuyển theo khi đơn mới thực sự tồn tại trong cùng transaction
  'quote.moveAttachments': ({ orderType, quoteId, newId }) => ({
    sql: `
        UPDATE order_attachments
        SET order_id = $1, order_type = $2
        WHERE order_id = $3 AND order_type = $4
          AND EXISTS (SELECT 1 FROM ${p.orderTable(orderType)} WHERE id = $1)`,
    values: [p.recordId(newId), p.orderType(orderType), p.recordId(quoteId), p.orderType(orderType)]
  }),

  'attachment.insert': ({ orderType, orderId, fileName, contentType, fileSize, base64 }) => {
    const data = p.text(base64, { name: 'dữ liệu tệp', max: MAX_ATTACHMENT_BASE64 });
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) throw p.paramError('Dữ liệu tệp không phải base64');
    return {
      sql: `
        INSERT INTO order_attachments (order_type, order_id, file_name, content_type, file_size, data)
        VALUES ($1, $2, $3, $4, $5, decode($6, 'base64'))`,
      values: [
        p.orderType(orderType),
        p.recordId(orderId),
        p.text(fileName, { name: 'tên tệp', max: 255 }),
        p.text(contentType, { name: 'kiểu tệp', max: 255 }),
        p.nonNegativeInt(fileSize, 'kích thước tệp'),
        data
      ]
    };
  },

  'attachment.delete': ({ id, orderId, orderType }) => ({
    sql: 'DELETE FROM order_attachments WHERE id = $1 AND order_id = $2 AND order_type = $3',
    values: [p.positiveInt(id, 'mã tệp'), p.recordId(orderId), p.orderType(orderType)]
  }),

  'attachment.deleteForOrder': ({ orderId, orderType }) => ({
    sql: 'DELETE FROM order_attachments WHERE order_id = $1 AND order_type = $2',
    values: [p.recordId(orderId), p.orderType(orderType)]
  }),

  // Bộ đếm tăng nguyên tử trong một câu UPDATE (không đọc rồi ghi)
  'emailHistory.increment': ({ address }) => ({
    sql: 'UPDATE email_history SET sent_count = COALESCE(sent_count, 0) + 1, last_sent_at = CURRENT_TIMESTAMP WHERE lower(email_address) = $1',
    values: [emailAddress(address)]
  }),

  'emailHistory.insert': ({ address }) => ({
    sql: 'INSERT INTO email_history (email_address, last_sent_at, sent_count) VALUES ($1, CURRENT_TIMESTAMP, 1)',
    values: [emailAddress(address)]
  })
};

module.exports = { writeActions, settlementUpdateSql, settlementToggleSql, quoteConversionSql };
