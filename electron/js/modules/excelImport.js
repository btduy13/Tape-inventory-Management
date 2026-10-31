// Import/export Excel templates for bulk order entry.
const excelImportConfigs = {
  bang_keo_in: {
    label: 'Băng Keo In',
    table: 'bang_keo_in_orders',
    idPrefix: 'BK',
    templateName: 'mau_nhap_bang_keo_in',
    headers: [
      'Tên hàng', 'Tên khách hàng', 'Ngày dự kiến', 'Quy cách (mm)', 'Quy cách (m)',
      'Quy cách (mic)', 'Cuộn/Cây', 'Số lượng', 'Phí SL', 'Màu keo', 'Phí keo',
      'Màu sắc', 'Phí màu', 'Phí size', 'Phí cắt', 'Đơn giá vốn', 'Đơn giá bán',
      'Tiền cọc', 'CTV', 'Hoa hồng (%)', 'Lõi giấy', 'Thùng/Bao', 'Tiền ship',
      'Loại trục', 'Tên Trục', 'Chu vi Trục', 'Số lượng Trục', 'Giá gốc Trục',
      'Giá bán Trục', 'CTV Trục', 'Hoa hồng Trục (%)', 'Đã giao', 'Đã tất toán'
    ],
    sample: [
      'Băng keo in logo', 'Khách A', nextDateString(), 48, 90, 50, 6, 100,
      0, 'Trong', 0, 'Đỏ', 0, 0, 0, 120000, 25000, 500000, 'CTV A', 5,
      '3 ly', 'Thùng', 0, 'Trục mới', 'Trục 48', 150, 1, 300000, 450000, 'CTV A', 10, 'Chưa', 'Chưa'
    ]
  },
  truc_in: {
    label: 'Trục In',
    table: 'truc_in_orders',
    idPrefix: 'TI',
    templateName: 'mau_nhap_truc_in',
    headers: [
      'Tên hàng', 'Tên khách hàng', 'Ngày dự kiến', 'Quy cách', 'Số lượng',
      'Màu sắc', 'Màu keo', 'Đơn giá gốc', 'Đơn giá bán', 'CTV',
      'Hoa hồng (%)', 'Tiền ship', 'Đã giao', 'Đã tất toán'
    ],
    sample: ['Trục in mẫu', 'Khách B', nextDateString(), '48x90', 2, 'Đỏ', 'Trong', 200000, 350000, '', 0, 0, 'Chưa', 'Chưa']
  },
  bang_keo: {
    label: 'Băng Keo',
    table: 'bang_keo_orders',
    idPrefix: 'B',
    templateName: 'mau_nhap_bang_keo',
    headers: [
      'Tên hàng', 'Tên khách hàng', 'Ngày dự kiến', 'Quy cách', 'Số lượng',
      'Màu sắc', 'Đơn giá gốc', 'Đơn giá bán', 'CTV', 'Hoa hồng (%)',
      'Tiền ship', 'Đã giao', 'Đã tất toán'
    ],
    sample: ['Băng keo trong', 'Khách C', nextDateString(), '48mm x 100y', 50, 'Trong', 12000, 18000, '', 0, 0, 'Chưa', 'Chưa']
  }
};

Object.entries(excelImportConfigs).forEach(([type, config]) => {
  config.headers.push('VAT (%)');
  config.sample.push(0);
  if (type === 'bang_keo_in') {
    config.headers.push('VAT Trục (%)');
    config.sample.push(0);
  }
});

const excelImportAliases = {
  vat_percent: ['VAT (%)', 'VAT tổng (%)', 'vat_percent'],
  vat: ['VAT', 'Tiền VAT', 'vat'],
  truc_vat_percent: ['VAT Trục (%)', 'truc_vat_percent'],
  truc_vat: ['VAT Trục', 'Tiền VAT Trục', 'truc_vat'],
  ten_hang: ['Tên hàng', 'Ten hang', 'ten_hang'],
  ten_khach_hang: ['Tên khách hàng', 'Khách hàng', 'Ten khach hang', 'ten_khach_hang'],
  ngay_du_kien: ['Ngày dự kiến', 'Ngày giao', 'Ngay du kien', 'ngay_du_kien'],
  quy_cach_mm: ['Quy cách (mm)', 'QC mm', 'quy_cach_mm'],
  quy_cach_m: ['Quy cách (m)', 'QC m', 'quy_cach_m'],
  quy_cach_mic: ['Quy cách (mic)', 'QC mic', 'quy_cach_mic'],
  cuon_cay: ['Cuộn/Cây', 'Cuon/Cay', 'cuon_cay'],
  so_luong: ['Số lượng', 'So luong', 'so_luong'],
  phi_sl: ['Phí SL', 'Phi SL', 'phi_sl'],
  mau_keo: ['Màu keo', 'Mau keo', 'mau_keo'],
  phi_keo: ['Phí keo', 'Phi keo', 'phi_keo'],
  mau_sac: ['Màu sắc', 'Mau sac', 'mau_sac'],
  phi_mau: ['Phí màu', 'Phi mau', 'phi_mau'],
  phi_size: ['Phí size', 'Phi size', 'phi_size'],
  phi_cat: ['Phí cắt', 'Phi cat', 'phi_cat'],
  don_gia_von: ['Đơn giá vốn', 'Don gia von', 'don_gia_von'],
  don_gia_goc: ['Đơn giá gốc', 'Giá gốc', 'Don gia goc', 'don_gia_goc'],
  don_gia_ban: ['Đơn giá bán', 'Giá bán', 'Don gia ban', 'don_gia_ban'],
  tien_coc: ['Tiền cọc', 'Tien coc', 'tien_coc'],
  ctv: ['CTV', 'ctv'],
  hoa_hong: ['Hoa hồng (%)', 'Hoa hong (%)', 'hoa_hong'],
  loi_giay: ['Lõi giấy', 'Loi giay', 'loi_giay'],
  thung_bao: ['Thùng/Bao', 'Thung/Bao', 'thung_bao'],
  tien_ship: ['Tiền ship', 'Tien ship', 'tien_ship'],
  loai_truc: ['Loại trục', 'Loai truc', 'loai_truc'],
  ten_truc: ['Tên Trục', 'Tên trục', 'Ten truc', 'ten_truc'],
  truc_chu_vi: ['Chu vi Trục', 'Chu vi trục', 'truc_chu_vi'],
  truc_so_luong: ['Số lượng Trục', 'Số lượng trục', 'SL Trục', 'truc_so_luong'],
  truc_gia_goc: ['Giá gốc Trục', 'Giá gốc trục', 'truc_gia_goc'],
  truc_gia_ban: ['Giá bán Trục', 'Giá bán trục', 'truc_gia_ban'],
  truc_ctv: ['CTV Trục', 'CTV trục', 'truc_ctv'],
  truc_hoa_hong: ['Hoa hồng Trục (%)', 'Hoa hồng trục (%)', 'truc_hoa_hong'],
  da_giao: ['Đã giao', 'Da giao', 'da_giao'],
  da_tat_toan: ['Đã tất toán', 'Da tat toan', 'da_tat_toan'],
  quy_cach: ['Quy cách', 'Quy cach', 'quy_cach']
};

let excelImportInProgress = false;

// Ngày mai theo giờ máy (không dùng toISOString vì UTC lùi ngày ở UTC+7)
function nextDateString() {
  if (typeof utils !== 'undefined' && typeof utils.tomorrowDateInputValue === 'function') {
    return utils.tomorrowDateInputValue();
  }
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayImportDateString() {
  if (typeof utils !== 'undefined' && typeof utils.toDateInputValue === 'function') {
    return utils.toDateInputValue(new Date());
  }
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Tạo ngày local và từ chối ngày tràn (vd. 31/02 sẽ không bị đẩy sang tháng 3)
function buildValidImportDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function isValidImportDate(value) {
  return Object.prototype.toString.call(value) === '[object Date]' && !Number.isNaN(value.getTime());
}

function normalizeExcelKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/%/g, 'percent')
    .replace(/[^a-z0-9]/g, '');
}

function buildExcelGetter(row) {
  const normalizedRow = {};
  Object.entries(row).forEach(([key, value]) => {
    normalizedRow[normalizeExcelKey(key)] = value;
  });

  return (field, fallback = '') => {
    const aliases = excelImportAliases[field] || [field];
    for (const alias of aliases) {
      const key = normalizeExcelKey(alias);
      if (Object.prototype.hasOwnProperty.call(normalizedRow, key)) {
        return normalizedRow[key];
      }
    }
    return fallback;
  };
}

function parseImportNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  let text = String(value).trim().replace(/[^\d,.-]/g, '');
  if (text.includes(',') && text.includes('.')) {
    const decimal = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.';
    text = text.replace(decimal === ',' ? /\./g : /,/g, '').replace(',', '.');
  } else if (/^-?[1-9]\d{0,2}([,.]\d{3})+$/.test(text)) {
    text = text.replace(/[,.]/g, '');
  } else {
    text = text.replace(',', '.');
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseImportText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

// Chấp nhận cả giá trị do chính ứng dụng xuất ra (Rồi / Xong / Rồi/Xong / Đã giao / Đã tất toán / Có),
// so khớp không dấu, không phân biệt hoa thường và bỏ ký tự phân cách.
const IMPORT_TRUE_VALUES = ['1', 'true', 'yes', 'y', 'x', 'roi', 'xong', 'roixong', 'dagiao', 'datattoan', 'co'];

function parseImportBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return IMPORT_TRUE_VALUES.includes(normalizeExcelKey(value));
}

// Trả về Date (giờ local) hoặc null nếu ngày không đọc được / không tồn tại.
// Ô trống mặc định là ngày mai như form nhập tay.
function parseImportDate(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (!isValidImportDate(value)) return null;
    // SheetJS (cellDates) có thể trả 23:59:30 ngày hôm trước do lệch múi giờ lịch sử; làm tròn về ngày gần nhất.
    const rounded = new Date(value.getTime() + 12 * 60 * 60 * 1000);
    return buildValidImportDate(rounded.getFullYear(), rounded.getMonth() + 1, rounded.getDate());
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    const parsed = typeof XLSX !== 'undefined' ? XLSX.SSF.parse_date_code(value) : null;
    return parsed ? buildValidImportDate(parsed.y, parsed.m, parsed.d) : null;
  }
  const text = String(value ?? '').trim();
  if (!text) {
    const [y, m, d] = nextDateString().split('-').map(Number);
    return buildValidImportDate(y, m, d);
  }
  const parts = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
  if (parts) {
    const year = parts[3].length === 2 ? Number(`20${parts[3]}`) : Number(parts[3]);
    return buildValidImportDate(year, Number(parts[2]), Number(parts[1]));
  }
  const iso = text.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})(?:[T\s].*)?$/);
  if (iso) {
    return buildValidImportDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  return null;
}

// Ưu tiên cột VAT (%); file cũ chỉ có số tiền VAT thì suy ra tỷ lệ từ thành tiền (đã làm tròn đồng).
function importVat(get, field, subtotal) {
  const roundedSubtotal = orderMath.money(subtotal);
  const rawPercent = get(`${field}_percent`, '');
  const rate = rawPercent === '' ? (roundedSubtotal > 0 ? parseImportNumber(get(field)) / roundedSubtotal * 100 : 0) : parseImportNumber(rawPercent);
  const vatPercent = orderMath.percent(rate);
  return { vatPercent, vat: orderMath.vatAmount(roundedSubtotal, vatPercent) };
}

function isInlineAxisImportRow(row) {
  const get = buildExcelGetter(row);
  return /^\s*↳/.test(String(get('ten_hang'))) || normalizeExcelKey(get('loai_truc')) === 'truckembki';
}

function calculateSimpleImport(data) {
  const result = orderMath.calculateStandardOrder({
    quantity: data.so_luong,
    costPrice: data.don_gia_goc,
    salePrice: data.don_gia_ban,
    commissionPercent: data.hoa_hong,
    shipping: data.tien_ship,
    vatPercent: data.vat_percent,
    settled: data.da_tat_toan
  });
  data.hoa_hong = result.commissionPercent;
  // Làm tròn tiền ship về đồng nhưng giữ dấu để kiểm tra dữ liệu vẫn bắt được số âm
  data.tien_ship = orderMath.money(data.tien_ship);
  data.thanh_tien_goc = result.costTotal;
  data.thanh_tien = result.costTotal;
  data.vat = result.vat;
  data.thanh_tien_ban = result.saleTotal;
  data.cong_no_khach = result.outstanding;
  data.loi_nhuan = result.profit;
  data.tien_hoa_hong = result.commission;
  data.loi_nhuan_rong = result.netProfit;
  return data;
}

function mapBangKeoInImport(row) {
  const get = buildExcelGetter(row);
  const data = {
    thoi_gian: new Date(),
    ten_hang: parseImportText(get('ten_hang')),
    ten_khach_hang: parseImportText(get('ten_khach_hang')),
    ngay_du_kien: parseImportDate(get('ngay_du_kien')),
    quy_cach_mm: parseImportNumber(get('quy_cach_mm')) || null,
    quy_cach_m: parseImportNumber(get('quy_cach_m')) || null,
    quy_cach_mic: parseImportNumber(get('quy_cach_mic')) || null,
    cuon_cay: parseImportNumber(get('cuon_cay')) || null,
    so_luong: parseImportNumber(get('so_luong')),
    phi_sl: parseImportNumber(get('phi_sl')),
    mau_keo: parseImportText(get('mau_keo')),
    phi_keo: parseImportNumber(get('phi_keo')),
    mau_sac: parseImportText(get('mau_sac')),
    phi_mau: parseImportNumber(get('phi_mau')),
    phi_size: parseImportNumber(get('phi_size')),
    phi_cat: parseImportNumber(get('phi_cat')),
    don_gia_von: parseImportNumber(get('don_gia_von')),
    don_gia_ban: parseImportNumber(get('don_gia_ban')),
    tien_coc: parseImportNumber(get('tien_coc')),
    ctv: parseImportText(get('ctv')),
    hoa_hong: parseImportNumber(get('hoa_hong')),
    loi_giay: parseImportText(get('loi_giay')),
    thung_bao: parseImportText(get('thung_bao')),
    tien_ship: parseImportNumber(get('tien_ship')),
    da_giao: parseImportBoolean(get('da_giao')),
    da_tat_toan: parseImportBoolean(get('da_tat_toan')),
    da_gui_email: false,
    is_quote: false
  };

  const axisType = normalizeExcelKey(get('loai_truc', 'Trục cũ'));
  const isNewAxis = ['moi', 'trucmoi', 'new'].includes(axisType);
  data.loai_truc = isNewAxis ? 'moi' : 'cu';
  data.ten_truc = isNewAxis ? parseImportText(get('ten_truc')) : null;
  // Chu vi trục là tùy chọn
  data.truc_chu_vi = isNewAxis ? (parseImportNumber(get('truc_chu_vi')) || null) : null;
  data.truc_so_luong = isNewAxis ? parseImportNumber(get('truc_so_luong')) : 0;
  data.truc_gia_goc = isNewAxis ? parseImportNumber(get('truc_gia_goc')) : 0;
  data.truc_gia_ban = isNewAxis ? parseImportNumber(get('truc_gia_ban')) : 0;
  data.truc_ctv = isNewAxis ? parseImportText(get('truc_ctv')) : null;
  data.truc_hoa_hong = isNewAxis ? orderMath.percent(parseImportNumber(get('truc_hoa_hong'))) : 0;
  data.hoa_hong = orderMath.percent(data.hoa_hong);

  // Tính tiền giống hệt form nhập tay (orderMath.calculatePrintedTape): mọi cột tiền là số đồng nguyên
  // và loi_nhuan_rong == loi_nhuan - tien_hoa_hong - tien_ship.
  const productVat = importVat(get, 'vat', data.so_luong * data.don_gia_ban);
  const axisVat = importVat(get, 'truc_vat', data.truc_so_luong * data.truc_gia_ban);
  const result = orderMath.calculatePrintedTape({
    quantity: data.so_luong,
    baseCost: data.don_gia_von,
    quantityFee: data.phi_sl,
    glueFee: data.phi_keo,
    colorFee: data.phi_mau,
    sizeFee: data.phi_size,
    cuttingFee: data.phi_cat,
    salePrice: data.don_gia_ban,
    deposit: data.tien_coc,
    vatPercent: productVat.vatPercent,
    commissionPercent: data.hoa_hong,
    shipping: data.tien_ship,
    rollLength: data.quy_cach_m,
    rollsPerTree: data.cuon_cay,
    isNewAxis,
    axisQuantity: data.truc_so_luong,
    axisCostPrice: data.truc_gia_goc,
    axisSalePrice: data.truc_gia_ban,
    axisVatPercent: axisVat.vatPercent,
    axisCommissionPercent: data.truc_hoa_hong,
    settled: data.da_tat_toan
  });
  data._importCalcErrors = result.valid ? [] : result.errors.slice();

  data.don_gia_goc = result.product.costPrice;
  data.thanh_tien_goc = result.product.costTotal;
  data.thanh_tien_ban = result.product.saleTotal;
  // Giữ dấu của tiền cọc / tiền ship (chỉ làm tròn) để validateImportData vẫn bắt được số âm
  data.tien_coc = orderMath.money(data.tien_coc);
  data.tien_ship = orderMath.money(data.tien_ship);
  data.loi_nhuan = result.product.profit;
  data.tien_hoa_hong = result.product.commission;
  data.loi_nhuan_rong = result.product.netProfit;
  data.vat = result.vat;
  data.vat_percent = result.vatPercent;

  const axis = isNewAxis ? result.axis : null;
  data.truc_thanh_tien_goc = axis ? axis.costTotal : 0;
  data.truc_thanh_tien_ban = axis ? axis.saleTotal : 0;
  data.truc_tien_hoa_hong = axis ? axis.commission : 0;
  data.truc_loi_nhuan = axis ? axis.profit : 0;
  data.truc_loi_nhuan_rong = axis ? axis.netProfit : 0;
  data.truc_vat = axis ? axis.vat : 0;
  data.truc_vat_percent = axis ? result.axisVatPercent : 0;
  data.cong_no_khach = result.outstanding;
  // Giữ giá trị % gốc (trước khi bị kẹp 0-100) để kiểm tra dữ liệu
  data._importRawPercents = {
    hoa_hong: parseImportNumber(get('hoa_hong')),
    vat_percent: parseImportNumber(get('vat_percent')),
    truc_hoa_hong: isNewAxis ? parseImportNumber(get('truc_hoa_hong')) : 0,
    truc_vat_percent: isNewAxis ? parseImportNumber(get('truc_vat_percent')) : 0
  };

  return data;
}

function mapSimpleImport(row, type) {
  const get = buildExcelGetter(row);
  const vat = importVat(get, 'vat', parseImportNumber(get('so_luong')) * parseImportNumber(get('don_gia_ban')));
  const data = calculateSimpleImport({
    thoi_gian: new Date(),
    ten_hang: parseImportText(get('ten_hang')),
    ten_khach_hang: parseImportText(get('ten_khach_hang')),
    ngay_du_kien: parseImportDate(get('ngay_du_kien')),
    quy_cach: parseImportText(get('quy_cach')),
    so_luong: parseImportNumber(get('so_luong')),
    mau_sac: parseImportText(get('mau_sac')),
    mau_keo: type === 'truc_in' ? parseImportText(get('mau_keo')) : null,
    don_gia_goc: parseImportNumber(get('don_gia_goc')),
    don_gia_ban: parseImportNumber(get('don_gia_ban')),
    ctv: parseImportText(get('ctv')),
    hoa_hong: parseImportNumber(get('hoa_hong')),
    tien_ship: parseImportNumber(get('tien_ship')),
    vat_percent: vat.vatPercent,
    da_giao: parseImportBoolean(get('da_giao')),
    da_tat_toan: parseImportBoolean(get('da_tat_toan')),
    da_gui_email: false,
    is_quote: false
  });
  // Giữ giá trị % gốc (trước khi bị kẹp 0-100) để kiểm tra dữ liệu
  data._importRawPercents = {
    hoa_hong: parseImportNumber(get('hoa_hong')),
    vat_percent: parseImportNumber(get('vat_percent'))
  };
  return data;
}

// Giới hạn độ dài theo cột varchar trong DB để báo lỗi theo dòng thay vì lỗi 22001 chung.
const IMPORT_TEXT_LIMITS = { ten_hang: 255, ten_khach_hang: 255, mau_keo: 100, mau_sac: 100, ctv: 100, loi_giay: 100, thung_bao: 100, quy_cach: 100 };

function validateImportData(data, rowNumber) {
  const errors = [];
  Object.entries(IMPORT_TEXT_LIMITS).forEach(([column, limit]) => {
    if (data[column] != null && String(data[column]).length > limit) {
      errors.push(`Dòng ${rowNumber}: ${column} dài quá ${limit} ký tự`);
    }
  });
  if (!data.ten_hang) errors.push(`Dòng ${rowNumber}: thiếu Tên hàng`);
  if (!data.ten_khach_hang) errors.push(`Dòng ${rowNumber}: thiếu Tên khách hàng`);
  if (!data.so_luong || data.so_luong <= 0) errors.push(`Dòng ${rowNumber}: Số lượng phải lớn hơn 0`);
  if (!data.don_gia_ban || data.don_gia_ban <= 0) errors.push(`Dòng ${rowNumber}: Đơn giá bán phải lớn hơn 0`);
  (data._importCalcErrors || []).forEach(message => errors.push(`Dòng ${rowNumber}: ${message}`));
  if ('don_gia_goc' in data && data.don_gia_goc <= 0 && !(data._importCalcErrors || []).length) {
    errors.push(`Dòng ${rowNumber}: Đơn giá gốc phải lớn hơn 0`);
  }
  // Giống form: Trục mới bắt buộc Tên, Số lượng, Giá gốc và Giá bán (Chu vi trục không bắt buộc)
  if (data.loai_truc === 'moi' && (!data.ten_truc || !(data.truc_so_luong > 0) || !(data.truc_gia_goc > 0) || !(data.truc_gia_ban > 0))) {
    errors.push(`Dòng ${rowNumber}: Trục mới cần Tên Trục, Số lượng Trục, Giá gốc Trục và Giá bán Trục`);
  }
  if (!isValidImportDate(data.ngay_du_kien)) {
    errors.push(`Dòng ${rowNumber}: Ngày dự kiến không hợp lệ (dùng dd/mm/yyyy, ví dụ 25/12/2026)`);
  }

  // Không chấp nhận số âm cho giá, phí, tiền cọc, tiền ship, quy cách, trục
  // (Số lượng, Đơn giá bán, Đơn giá gốc đã được kiểm tra phải > 0 ở trên)
  const nonNegativeFields = {
    don_gia_von: 'Đơn giá vốn',
    phi_sl: 'Phí SL', phi_keo: 'Phí keo', phi_mau: 'Phí màu', phi_size: 'Phí size', phi_cat: 'Phí cắt',
    tien_coc: 'Tiền cọc', tien_ship: 'Tiền ship', quy_cach_mm: 'Quy cách (mm)', quy_cach_m: 'Quy cách (m)',
    quy_cach_mic: 'Quy cách (mic)', cuon_cay: 'Cuộn/Cây', truc_chu_vi: 'Chu vi Trục',
    truc_so_luong: 'Số lượng Trục', truc_gia_goc: 'Giá gốc Trục', truc_gia_ban: 'Giá bán Trục'
  };
  Object.entries(nonNegativeFields).forEach(([field, label]) => {
    if (!(field in data) || data[field] === null || data[field] === undefined) return;
    const value = Number(data[field]);
    if (!Number.isFinite(value) || value < 0) errors.push(`Dòng ${rowNumber}: ${label} không được âm`);
  });

  const percentLabels = { hoa_hong: 'Hoa hồng (%)', vat_percent: 'VAT (%)', truc_hoa_hong: 'Hoa hồng Trục (%)', truc_vat_percent: 'VAT Trục (%)' };
  const rawPercents = data._importRawPercents || {};
  Object.entries(percentLabels).forEach(([field, label]) => {
    const raw = field in rawPercents ? rawPercents[field] : data[field];
    if (raw === null || raw === undefined) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) errors.push(`Dòng ${rowNumber}: ${label} phải từ 0 đến 100`);
  });
  return errors;
}

// Sinh dãy mã đơn liên tiếp cho một lần nhập, từ mã đầu tiên lấy trên DB (vd. BK-10-26-007 -> 008, 009...)
function buildSequentialOrderIds(firstId, count) {
  const text = String(firstId || '');
  const dashIndex = text.lastIndexOf('-');
  const seqText = dashIndex >= 0 ? text.slice(dashIndex + 1) : '';
  const start = Number.parseInt(seqText, 10);
  if (dashIndex < 0 || !/^\d+$/.test(seqText) || !Number.isFinite(start)) {
    throw new Error('Không tạo được mã đơn hàng cho lần nhập');
  }
  const base = text.slice(0, dashIndex);
  const width = Math.max(3, seqText.length);
  return Array.from({ length: count }, (_, index) => `${base}-${String(start + index).padStart(width, '0')}`);
}

async function exportImportTemplate() {
  const orderType = typeof getStatsOrderTypeKey === 'function' ? getStatsOrderTypeKey() : 'bang_keo_in';
  const config = excelImportConfigs[orderType];
  if (!config) return;

  try {
    const worksheet = XLSX.utils.aoa_to_sheet([config.headers, config.sample]);
    worksheet['!cols'] = config.headers.map(header => ({ wch: Math.max(14, header.length + 4) }));

    const guideSheet = XLSX.utils.aoa_to_sheet([
      ['Hướng dẫn'],
      ['Mỗi dòng là một đơn hàng mới. Có thể xóa dòng mẫu trước khi nhập.'],
      ['Các cột thành tiền, công nợ, hoa hồng, lợi nhuận sẽ được ứng dụng tự tính khi import.'],
      ['Với Băng Keo In: nhập "Trục mới" ở cột Loại trục nếu cần thêm chi phí trục mới, ngược lại để "Trục cũ".']
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, config.label);
    XLSX.utils.book_append_sheet(workbook, guideSheet, 'Huong dan');

    const savePath = await window.electronAPI.showSaveDialog({
      title: `Lưu mẫu nhập ${config.label}`,
      defaultPath: `${config.templateName}_${todayImportDateString()}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (!savePath || savePath.canceled || !savePath.filePath) return;

    const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const res = await window.electronAPI.writeFileBase64(savePath.filePath, base64);
    if (res.ok) {
      utils.showToast(`Đã tạo mẫu nhập ${config.label}`, 'success');
    } else {
      utils.showToast('Không thể lưu mẫu Excel: ' + res.error, 'danger');
    }
  } catch (err) {
    utils.showToast('Lỗi tạo mẫu Excel: ' + err.message, 'danger');
  }
}

async function importOrdersFromExcel() {
  // Không cho chạy hai lần nhập cùng lúc (bấm đúp / mở lại từ bảng lệnh)
  if (excelImportInProgress) {
    utils.showToast('Đang nhập Excel, vui lòng chờ hoàn tất', 'warning');
    return;
  }
  excelImportInProgress = true;
  try {
    await runExcelImport();
  } finally {
    excelImportInProgress = false;
  }
}

async function runExcelImport() {
  const orderType = typeof getStatsOrderTypeKey === 'function' ? getStatsOrderTypeKey() : 'bang_keo_in';
  const config = excelImportConfigs[orderType];
  if (!config) return;

  const file = await window.electronAPI.showOpenDialog({
    title: `Chọn file Excel nhập ${config.label}`,
    properties: ['openFile'],
    filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
  });

  if (!file || file.canceled || !file.filePaths || file.filePaths.length === 0) return;

  try {
    const fileData = await window.electronAPI.readFileAsBase64(file.filePaths[0], 'excel');
    if (!fileData.ok) {
      utils.showToast('Không thể đọc file Excel: ' + fileData.error, 'danger');
      return;
    }

    const workbook = XLSX.read(fileData.data, { type: 'base64', cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    const cleanRows = rows.filter(row => Object.values(row).some(value => String(value).trim() !== ''));

    if (cleanRows.length === 0) {
      utils.showToast('File Excel không có dữ liệu để nhập', 'warning');
      return;
    }

    const mappedRows = [];
    const validationErrors = [];
    cleanRows.forEach((row, index) => {
      if (isInlineAxisImportRow(row)) {
        validationErrors.push(`Dòng ${index + 2}: trục kèm BKI là dòng chi tiết xuất báo cáo; hãy dùng mẫu nhập Excel và khai báo trục trên cùng dòng đơn hàng.`);
        return;
      }
      const data = orderType === 'bang_keo_in' ? mapBangKeoInImport(row) : mapSimpleImport(row, orderType);
      const rowNumber = index + 2;
      validationErrors.push(...validateImportData(data, rowNumber));
      mappedRows.push({ data, rowNumber });
    });

    if (validationErrors.length > 0) {
      showExcelImportErrors(validationErrors);
      return;
    }

    const confirmed = await utils.confirmAction(
      `Nhập ${mappedRows.length} đơn ${config.label} từ Excel?`,
      { title: 'Xác nhận nhập Excel', confirmText: 'Nhập dữ liệu' }
    );
    if (!confirmed) return;

    // Lấy mã đầu tiên một lần rồi tăng dần trong lô để các đơn không trùng mã
    const buildStatements = async () => {
      const firstOrderId = await generateOrderId(config.idPrefix, config.table);
      const orderIds = buildSequentialOrderIds(firstOrderId, mappedRows.length);
      return mappedRows.map(({ data }, index) => (orderType === 'bang_keo_in'
        ? buildBangKeoInImportStatement(orderIds[index], data)
        : buildSimpleImportStatement(orderIds[index], data, orderType)));
    };
    let statements = await buildStatements();

    let imported = 0;
    const insertErrors = [];
    if (typeof window.electronAPI.dbTransaction === 'function') {
      // Nhập toàn bộ trong một transaction: lỗi một dòng thì không đơn nào được ghi
      let result = await window.electronAPI.dbTransaction(statements);
      // Máy khác vừa lưu đơn cùng mã (23505): lấy lại dãy mã mới và thử lại
      for (let attempt = 0; attempt < 3 && !result?.ok && String(result?.code || '') === '23505'; attempt++) {
        statements = await buildStatements();
        result = await window.electronAPI.dbTransaction(statements);
      }
      if (result?.ok) {
        imported = mappedRows.length;
      } else {
        insertErrors.push(`Không đơn nào được nhập (đã hoàn tác): ${result?.error || 'Lỗi không xác định'}`);
      }
    } else {
      for (let index = 0; index < statements.length; index++) {
        const { sql, params } = statements[index];
        const result = await window.electronAPI.dbRun(sql, params);
        if (result?.ok) imported++;
        else insertErrors.push(`Dòng ${mappedRows[index].rowNumber}: ${result?.error || 'Lỗi không xác định'}`);
      }
    }

    if (insertErrors.length > 0) {
      window.electronAPI.writeLog('error', 'Lỗi nhập Excel: ' + insertErrors.join(' | '));
      showExcelImportErrors(insertErrors, `Đã nhập ${imported}/${mappedRows.length} đơn ${config.label}.`);
    } else {
      utils.showToast(`Đã nhập ${imported}/${mappedRows.length} đơn ${config.label}`, 'success');
    }
    if (imported > 0) {
      await loadStatsData();
      if (typeof loadDashboardData === 'function') loadDashboardData();
    }
  } catch (err) {
    window.electronAPI.writeLog('error', 'Lỗi nhập Excel: ' + err.message);
    utils.showToast('Lỗi nhập Excel: ' + err.message, 'danger');
  }
}

// Hiển thị danh sách lỗi theo dòng (toast chỉ đủ chỗ cho vài dòng đầu)
function showExcelImportErrors(errors, summary = '') {
  const maxShown = 4;
  const lines = errors.slice(0, maxShown);
  if (errors.length > maxShown) lines.push(`... và ${errors.length - maxShown} lỗi khác`);
  utils.showToast([summary, ...lines].filter(Boolean).join('\n'), 'danger');
}

function buildBangKeoInImportStatement(orderId, data) {
  const sql = `
    INSERT INTO bang_keo_in_orders (
      id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien,
      quy_cach_mm, quy_cach_m, quy_cach_mic, cuon_cay, so_luong,
      phi_sl, mau_keo, phi_keo, mau_sac, phi_mau, phi_size,
      phi_cat, don_gia_von, don_gia_goc, thanh_tien_goc, don_gia_ban,
      thanh_tien_ban, tien_coc, cong_no_khach, ctv, hoa_hong,
      tien_hoa_hong, loi_giay, thung_bao, loi_nhuan, tien_ship,
      loi_nhuan_rong, da_giao, da_tat_toan, da_gui_email, is_quote,
      loai_truc, ten_truc, truc_chu_vi, truc_so_luong, truc_gia_goc,
      truc_gia_ban, truc_thanh_tien_goc, truc_thanh_tien_ban, truc_ctv,
      truc_hoa_hong, truc_tien_hoa_hong, truc_loi_nhuan, truc_loi_nhuan_rong,
      vat, vat_percent, truc_vat, truc_vat_percent
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
      $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
      $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53
    )
  `;

  return { sql, params: [
    orderId, data.thoi_gian, data.ten_hang, data.ten_khach_hang, data.ngay_du_kien,
    data.quy_cach_mm, data.quy_cach_m, data.quy_cach_mic, data.cuon_cay, data.so_luong,
    data.phi_sl, data.mau_keo, data.phi_keo, data.mau_sac, data.phi_mau, data.phi_size,
    data.phi_cat, data.don_gia_von, data.don_gia_goc, data.thanh_tien_goc, data.don_gia_ban,
    data.thanh_tien_ban, data.tien_coc, data.cong_no_khach, data.ctv, data.hoa_hong,
    data.tien_hoa_hong, data.loi_giay, data.thung_bao, data.loi_nhuan, data.tien_ship,
    data.loi_nhuan_rong, data.da_giao, data.da_tat_toan, data.da_gui_email, data.is_quote,
    data.loai_truc, data.ten_truc, data.truc_chu_vi, data.truc_so_luong, data.truc_gia_goc,
    data.truc_gia_ban, data.truc_thanh_tien_goc, data.truc_thanh_tien_ban, data.truc_ctv,
    data.truc_hoa_hong, data.truc_tien_hoa_hong, data.truc_loi_nhuan, data.truc_loi_nhuan_rong,
    data.vat, data.vat_percent, data.truc_vat, data.truc_vat_percent
  ] };
}

function buildSimpleImportStatement(orderId, data, type) {
  if (type === 'truc_in') {
    const sql = `
      INSERT INTO truc_in_orders (
        id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien,
        quy_cach, so_luong, mau_sac, mau_keo, don_gia_goc, thanh_tien_goc,
        don_gia_ban, thanh_tien_ban, cong_no_khach, ctv, hoa_hong,
        tien_hoa_hong, loi_nhuan, tien_ship, loi_nhuan_rong,
        da_giao, da_tat_toan, da_gui_email, is_quote, vat, vat_percent
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
    `;
    return { sql, params: [
      orderId, data.thoi_gian, data.ten_hang, data.ten_khach_hang, data.ngay_du_kien,
      data.quy_cach, data.so_luong, data.mau_sac, data.mau_keo, data.don_gia_goc, data.thanh_tien_goc,
      data.don_gia_ban, data.thanh_tien_ban, data.cong_no_khach, data.ctv, data.hoa_hong,
      data.tien_hoa_hong, data.loi_nhuan, data.tien_ship, data.loi_nhuan_rong,
      data.da_giao, data.da_tat_toan, data.da_gui_email, data.is_quote, data.vat, data.vat_percent
    ] };
  }

  const sql = `
    INSERT INTO bang_keo_orders (
      id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien,
      quy_cach, so_luong, mau_sac, don_gia_goc, thanh_tien,
      don_gia_ban, thanh_tien_ban, cong_no_khach, ctv, hoa_hong,
      tien_hoa_hong, loi_nhuan, tien_ship, loi_nhuan_rong,
      da_giao, da_tat_toan, da_gui_email, is_quote, vat, vat_percent
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
    )
  `;
  return { sql, params: [
    orderId, data.thoi_gian, data.ten_hang, data.ten_khach_hang, data.ngay_du_kien,
    data.quy_cach, data.so_luong, data.mau_sac, data.don_gia_goc, data.thanh_tien,
    data.don_gia_ban, data.thanh_tien_ban, data.cong_no_khach, data.ctv, data.hoa_hong,
    data.tien_hoa_hong, data.loi_nhuan, data.tien_ship, data.loi_nhuan_rong,
    data.da_giao, data.da_tat_toan, data.da_gui_email, data.is_quote, data.vat, data.vat_percent
  ] };
}

async function insertBangKeoInImport(orderId, data) {
  const statement = buildBangKeoInImportStatement(orderId, data);
  return window.electronAPI.dbRun(statement.sql, statement.params);
}

async function insertSimpleImport(orderId, data, type) {
  const statement = buildSimpleImportStatement(orderId, data, type);
  return window.electronAPI.dbRun(statement.sql, statement.params);
}
