// KIỂM TRA THAM SỐ CHO CÁC THAO TÁC DỮ LIỆU ĐẶT TÊN (chạy ở tiến trình chính)
// Renderer chỉ gửi tên thao tác + tham số; mọi tên bảng/cột đều lấy từ danh sách cố định ở đây.

const ORDER_TABLES = Object.freeze({
  bang_keo_in: 'bang_keo_in_orders',
  bang_keo: 'bang_keo_orders',
  truc_in: 'truc_in_orders'
});

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

function paramError(message) {
  const error = new Error(message);
  error.isSqlPolicyError = true;
  return error;
}

function plainObject(value, name = 'tham số') {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw paramError(`${name} không hợp lệ`);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw paramError(`${name} không hợp lệ`);
  return value;
}

function orderType(value) {
  const key = String(value || '');
  if (!Object.prototype.hasOwnProperty.call(ORDER_TABLES, key)) throw paramError('Loại đơn hàng không hợp lệ');
  return key;
}

function orderTable(value) {
  return ORDER_TABLES[orderType(value)];
}

function text(value, { name = 'giá trị', max = 1000, allowEmpty = false } = {}) {
  if (typeof value !== 'string') throw paramError(`${name} phải là chuỗi`);
  if (!allowEmpty && value.length === 0) throw paramError(`Thiếu ${name}`);
  if (value.length > max) throw paramError(`${name} quá dài`);
  if (CONTROL_CHARS.test(value)) throw paramError(`${name} chứa ký tự không hợp lệ`);
  return value;
}

// Mã đơn: chuỗi ngắn, không ký tự điều khiển (dữ liệu cũ có thể khác định dạng hiện tại)
function recordId(value, name = 'mã đơn') {
  return text(value, { name, max: 64 });
}

function orderIdPrefix(value) {
  const prefix = text(value, { name: 'tiền tố mã đơn', max: 32 });
  if (!/^[A-Z]{1,4}(-[A-Z]{1,4})?-\d{2}-\d{2}$/.test(prefix)) throw paramError('Tiền tố mã đơn không hợp lệ');
  return prefix;
}

function positiveInt(value, name = 'mã') {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) throw paramError(`${name} không hợp lệ`);
    return value;
  }
  // bigint/serial lớn có thể về renderer dạng chuỗi số
  if (typeof value === 'string' && /^[1-9]\d{0,17}$/.test(value)) return value;
  throw paramError(`${name} không hợp lệ`);
}

function bool(value, name = 'giá trị') {
  if (typeof value !== 'boolean') throw paramError(`${name} phải là đúng/sai`);
  return value;
}

function nonNegativeInt(value, name = 'giá trị') {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw paramError(`${name} không hợp lệ`);
  return value;
}

function timestamp(value, name = 'thời gian') {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw paramError(`${name} không hợp lệ`);
    return value;
  }
  if (typeof value === 'string' && ISO_DATETIME.test(value) && !Number.isNaN(Date.parse(value))) return value;
  throw paramError(`${name} không hợp lệ`);
}

function dateOnly(value, name = 'ngày') {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) throw paramError(`${name} không hợp lệ`);
  return value;
}

function oneOf(value, allowed, name = 'giá trị') {
  if (!allowed.includes(value)) throw paramError(`${name} không hợp lệ`);
  return value;
}

module.exports = {
  ORDER_TABLES,
  bool,
  dateOnly,
  nonNegativeInt,
  oneOf,
  orderIdPrefix,
  orderTable,
  orderType,
  paramError,
  plainObject,
  positiveInt,
  recordId,
  text,
  timestamp
};
