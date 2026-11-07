// DANH SÁCH CỘT ĐƯỢC PHÉP GHI CHO TỪNG BẢNG ĐƠN HÀNG
// order.insert / order.update chỉ chấp nhận các cột trong danh sách này; tên cột không bao giờ
// lấy trực tiếp từ renderer mà phải khớp chính xác một mục ở đây.
const { orderTable, paramError, plainObject, recordId, uuid } = require('./params');

const COMMON_HEAD = [
  'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien',
  'sdt_khach_hang', 'dia_chi_khach_hang', 'customer_id'
];
const COMMON_STATUS = ['da_giao', 'da_tat_toan', 'da_gui_email', 'is_quote'];

const INSERT_COLUMNS = Object.freeze({
  bang_keo_in_orders: new Set([
    ...COMMON_HEAD,
    'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 'cuon_cay', 'so_luong',
    'phi_sl', 'mau_keo', 'phi_keo', 'mau_sac', 'phi_mau', 'phi_size',
    'phi_cat', 'don_gia_von', 'don_gia_goc', 'thanh_tien_goc', 'don_gia_ban',
    'thanh_tien_ban', 'tien_coc', 'cong_no_khach', 'ctv', 'hoa_hong',
    'tien_hoa_hong', 'loi_giay', 'thung_bao', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong',
    ...COMMON_STATUS,
    'loai_truc', 'ten_truc', 'truc_chu_vi', 'truc_so_luong', 'truc_gia_goc',
    'truc_gia_ban', 'truc_thanh_tien_goc', 'truc_thanh_tien_ban', 'truc_ctv',
    'truc_hoa_hong', 'truc_tien_hoa_hong', 'truc_loi_nhuan', 'truc_loi_nhuan_rong',
    'truc_vat', 'truc_vat_percent', 'vat', 'vat_percent', 'quote_items'
  ]),
  bang_keo_orders: new Set([
    ...COMMON_HEAD,
    'quy_cach', 'so_luong', 'mau_sac', 'don_gia_goc', 'thanh_tien',
    'don_gia_ban', 'thanh_tien_ban', 'cong_no_khach', 'ctv', 'hoa_hong',
    'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong',
    ...COMMON_STATUS, 'vat', 'vat_percent', 'quote_items'
  ]),
  truc_in_orders: new Set([
    ...COMMON_HEAD,
    'quy_cach', 'so_luong', 'mau_sac', 'mau_keo', 'don_gia_goc', 'thanh_tien_goc',
    'don_gia_ban', 'thanh_tien_ban', 'cong_no_khach', 'ctv', 'hoa_hong',
    'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong',
    ...COMMON_STATUS, 'vat', 'vat_percent', 'quote_items'
  ]),
  // Băng keo Thank you (bảng 0027): không có quote_items, cong_no_* do trigger tính
  thank_you_orders: new Set([
    ...COMMON_HEAD,
    'kich_thuoc', 'mau_sac', 'so_luong', 'don_gia_ban', 'thanh_tien_ban', 'vat', 'vat_percent',
    'tien_coc', 'cong_no_khach', 'don_gia_von', 'thanh_tien_von', 'tien_ship', 'loi_nhuan',
    'loi_nhuan_rong', 'ctv', 'hoa_hong', 'tien_hoa_hong', 'ghi_chu',
    ...COMMON_STATUS
  ])
});

// Sửa đơn/báo giá không được đổi mã, ngày tạo hay các cờ trạng thái (có thao tác riêng cho chúng)
const UPDATE_EXCLUDED = new Set(['id', 'thoi_gian', ...COMMON_STATUS]);

const MAX_TEXT_LENGTH = 10000;
// Giới hạn riêng cho thông tin liên hệ khách (khớp maxlength trên form)
const COLUMN_TEXT_LIMITS = Object.freeze({ sdt_khach_hang: 30, dia_chi_khach_hang: 500, kich_thuoc: 255, ghi_chu: 2000 });
const MAX_QUOTE_ITEMS_LENGTH = 2 * 1024 * 1024;

function columnValue(column, value) {
  if (column === 'id') return recordId(value);
  if (column === 'customer_id') return value === null || value === undefined ? null : uuid(value, 'mã khách hàng');
  if (column === 'quote_items') {
    if (typeof value !== 'string' || value.length > MAX_QUOTE_ITEMS_LENGTH) throw paramError('Dữ liệu dòng báo giá không hợp lệ');
    let parsed;
    try { parsed = JSON.parse(value); } catch { throw paramError('Dữ liệu dòng báo giá không phải JSON'); }
    if (!Array.isArray(parsed)) throw paramError('Dữ liệu dòng báo giá phải là danh sách');
    return value;
  }
  // undefined giữ hành vi cũ của pg (tham số undefined được ghi là NULL)
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw paramError(`Giá trị cột ${column} không hợp lệ`);
    return value;
  }
  if (typeof value === 'string') {
    if (value.length > (COLUMN_TEXT_LIMITS[column] ?? MAX_TEXT_LENGTH)) throw paramError(`Giá trị cột ${column} quá dài`);
    return value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  throw paramError(`Giá trị cột ${column} không hợp lệ`);
}

// Trả về { table, columns, values } theo đúng thứ tự khóa renderer gửi
function pickOrderColumns(type, rawValues, mode) {
  const table = orderTable(type);
  const allowed = INSERT_COLUMNS[table];
  const source = plainObject(rawValues, 'dữ liệu đơn hàng');
  const columns = [];
  const values = [];
  for (const column of Object.keys(source)) {
    if (!allowed.has(column) || (mode === 'update' && UPDATE_EXCLUDED.has(column))) {
      throw paramError(`Không cho phép ghi cột ${String(column).slice(0, 64)}`);
    }
    columns.push(column);
    values.push(columnValue(column, source[column]));
  }
  if (columns.length === 0) throw paramError('Không có dữ liệu để ghi');
  if (mode === 'insert' && !columns.includes('id')) throw paramError('Thiếu mã đơn hàng');
  return { table, columns, values };
}

module.exports = { INSERT_COLUMNS, UPDATE_EXCLUDED, pickOrderColumns };
