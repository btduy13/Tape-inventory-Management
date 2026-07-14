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

const excelImportAliases = {
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

function nextDateString() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

function normalizeExcelKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
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
  const text = String(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseImportText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function parseImportBoolean(value) {
  if (typeof value === 'boolean') return value;
  const text = normalizeExcelKey(value);
  return ['1', 'true', 'yes', 'x', 'roi', 'xong', 'dagiao', 'datattoan', 'co'].includes(text);
}

function parseImportDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const text = String(value || '').trim();
  if (!text) return new Date(nextDateString());
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;
  const parts = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (parts) {
    const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
    return new Date(Number(year), Number(parts[2]) - 1, Number(parts[1]));
  }
  return new Date(nextDateString());
}

function calculateSimpleImport(data) {
  const result = orderMath.calculateStandardOrder({
    quantity: data.so_luong,
    costPrice: data.don_gia_goc,
    salePrice: data.don_gia_ban,
    commissionPercent: data.hoa_hong,
    shipping: data.tien_ship,
    settled: data.da_tat_toan
  });
  data.hoa_hong = result.commissionPercent;
  data.thanh_tien_goc = result.costTotal;
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

  const canCalculateUnitCost = data.cuon_cay > 0 && data.quy_cach_m > 0;
  data.don_gia_goc = canCalculateUnitCost
    ? (data.don_gia_von + data.phi_sl + data.phi_mau + data.phi_keo + data.phi_size + data.phi_cat) / 90 * data.quy_cach_m / data.cuon_cay
    : parseImportNumber(get('don_gia_goc'));
  data.thanh_tien_goc = data.don_gia_goc * data.so_luong;
  data.thanh_tien_ban = data.don_gia_ban * data.so_luong;
  data.cong_no_khach = Math.max(0, data.thanh_tien_ban - data.tien_coc);
  data.loi_nhuan = data.thanh_tien_ban - data.thanh_tien_goc;
  data.hoa_hong = orderMath.percent(data.hoa_hong);
  data.tien_hoa_hong = Math.max(0, data.loi_nhuan) * (data.hoa_hong / 100);
  data.loi_nhuan_rong = data.loi_nhuan - data.tien_hoa_hong - data.tien_ship;

  const axisType = normalizeExcelKey(get('loai_truc', 'Trục cũ'));
  const isNewAxis = ['moi', 'trucmoi', 'new'].includes(axisType);
  data.loai_truc = isNewAxis ? 'moi' : 'cu';
  data.ten_truc = isNewAxis ? parseImportText(get('ten_truc')) : null;
  data.truc_chu_vi = isNewAxis ? (parseImportNumber(get('truc_chu_vi')) || null) : null;
  data.truc_so_luong = isNewAxis ? parseImportNumber(get('truc_so_luong')) : 0;
  data.truc_gia_goc = isNewAxis ? parseImportNumber(get('truc_gia_goc')) : 0;
  data.truc_gia_ban = isNewAxis ? parseImportNumber(get('truc_gia_ban')) : 0;
  data.truc_thanh_tien_goc = data.truc_so_luong * data.truc_gia_goc;
  data.truc_thanh_tien_ban = data.truc_so_luong * data.truc_gia_ban;
  data.truc_ctv = isNewAxis ? parseImportText(get('truc_ctv')) : null;
  data.truc_hoa_hong = isNewAxis ? orderMath.percent(parseImportNumber(get('truc_hoa_hong'))) : 0;
  data.truc_loi_nhuan = data.truc_thanh_tien_ban - data.truc_thanh_tien_goc;
  data.truc_tien_hoa_hong = Math.max(0, data.truc_loi_nhuan) * data.truc_hoa_hong / 100;
  data.truc_loi_nhuan_rong = data.truc_loi_nhuan - data.truc_tien_hoa_hong;
  data.cong_no_khach = data.da_tat_toan
    ? 0
    : Math.max(0, data.thanh_tien_ban + data.truc_thanh_tien_ban - data.tien_coc);

  return data;
}

function mapSimpleImport(row, type) {
  const get = buildExcelGetter(row);
  return calculateSimpleImport({
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
    da_giao: parseImportBoolean(get('da_giao')),
    da_tat_toan: parseImportBoolean(get('da_tat_toan')),
    da_gui_email: false,
    is_quote: false
  });
}

function validateImportData(data, rowNumber) {
  const errors = [];
  if (!data.ten_hang) errors.push(`Dòng ${rowNumber}: thiếu Tên hàng`);
  if (!data.ten_khach_hang) errors.push(`Dòng ${rowNumber}: thiếu Tên khách hàng`);
  if (!data.so_luong || data.so_luong <= 0) errors.push(`Dòng ${rowNumber}: Số lượng phải lớn hơn 0`);
  if (!data.don_gia_ban || data.don_gia_ban <= 0) errors.push(`Dòng ${rowNumber}: Đơn giá bán phải lớn hơn 0`);
  if ('don_gia_goc' in data && data.don_gia_goc <= 0) errors.push(`Dòng ${rowNumber}: Đơn giá gốc phải lớn hơn 0`);
  if (data.loai_truc === 'moi' && (!data.ten_truc || data.truc_so_luong <= 0 || data.truc_gia_ban <= 0)) {
    errors.push(`Dòng ${rowNumber}: Trục mới cần Tên Trục, Số lượng Trục và Giá bán Trục`);
  }
  return errors;
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
      defaultPath: `${config.templateName}_${new Date().toISOString().split('T')[0]}.xlsx`,
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
      const data = orderType === 'bang_keo_in' ? mapBangKeoInImport(row) : mapSimpleImport(row, orderType);
      const rowNumber = index + 2;
      validationErrors.push(...validateImportData(data, rowNumber));
      mappedRows.push(data);
    });

    if (validationErrors.length > 0) {
      utils.showToast(validationErrors.slice(0, 4).join('\n'), 'danger');
      return;
    }

    const confirmed = confirm(`Nhập ${mappedRows.length} đơn ${config.label} từ Excel?`);
    if (!confirmed) return;

    let imported = 0;
    for (const data of mappedRows) {
      const orderId = await generateOrderId(config.idPrefix, config.table);
      const result = orderType === 'bang_keo_in'
        ? await insertBangKeoInImport(orderId, data)
        : await insertSimpleImport(orderId, data, orderType);
      if (result.ok) imported++;
    }

    utils.showToast(`Đã nhập ${imported}/${mappedRows.length} đơn ${config.label}`, imported === mappedRows.length ? 'success' : 'warning');
    await loadStatsData();
    if (typeof loadDashboardData === 'function') loadDashboardData();
  } catch (err) {
    window.electronAPI.writeLog('error', 'Lỗi nhập Excel: ' + err.message);
    utils.showToast('Lỗi nhập Excel: ' + err.message, 'danger');
  }
}

async function insertBangKeoInImport(orderId, data) {
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
      truc_hoa_hong, truc_tien_hoa_hong, truc_loi_nhuan, truc_loi_nhuan_rong
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
      $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
      $42, $43, $44, $45, $46, $47, $48, $49
    )
  `;

  return window.electronAPI.dbRun(sql, [
    orderId, data.thoi_gian, data.ten_hang, data.ten_khach_hang, data.ngay_du_kien,
    data.quy_cach_mm, data.quy_cach_m, data.quy_cach_mic, data.cuon_cay, data.so_luong,
    data.phi_sl, data.mau_keo, data.phi_keo, data.mau_sac, data.phi_mau, data.phi_size,
    data.phi_cat, data.don_gia_von, data.don_gia_goc, data.thanh_tien_goc, data.don_gia_ban,
    data.thanh_tien_ban, data.tien_coc, data.cong_no_khach, data.ctv, data.hoa_hong,
    data.tien_hoa_hong, data.loi_giay, data.thung_bao, data.loi_nhuan, data.tien_ship,
    data.loi_nhuan_rong, data.da_giao, data.da_tat_toan, data.da_gui_email, data.is_quote,
    data.loai_truc, data.ten_truc, data.truc_chu_vi, data.truc_so_luong, data.truc_gia_goc,
    data.truc_gia_ban, data.truc_thanh_tien_goc, data.truc_thanh_tien_ban, data.truc_ctv,
    data.truc_hoa_hong, data.truc_tien_hoa_hong, data.truc_loi_nhuan, data.truc_loi_nhuan_rong
  ]);
}

async function insertSimpleImport(orderId, data, type) {
  if (type === 'truc_in') {
    const sql = `
      INSERT INTO truc_in_orders (
        id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien,
        quy_cach, so_luong, mau_sac, mau_keo, don_gia_goc, thanh_tien_goc,
        don_gia_ban, thanh_tien_ban, cong_no_khach, ctv, hoa_hong,
        tien_hoa_hong, loi_nhuan, tien_ship, loi_nhuan_rong,
        da_giao, da_tat_toan, da_gui_email, is_quote
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24
      )
    `;
    return window.electronAPI.dbRun(sql, [
      orderId, data.thoi_gian, data.ten_hang, data.ten_khach_hang, data.ngay_du_kien,
      data.quy_cach, data.so_luong, data.mau_sac, data.mau_keo, data.don_gia_goc, data.thanh_tien_goc,
      data.don_gia_ban, data.thanh_tien_ban, data.cong_no_khach, data.ctv, data.hoa_hong,
      data.tien_hoa_hong, data.loi_nhuan, data.tien_ship, data.loi_nhuan_rong,
      data.da_giao, data.da_tat_toan, data.da_gui_email, data.is_quote
    ]);
  }

  const sql = `
    INSERT INTO bang_keo_orders (
      id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien,
      quy_cach, so_luong, mau_sac, don_gia_goc, thanh_tien,
      don_gia_ban, thanh_tien_ban, cong_no_khach, ctv, hoa_hong,
      tien_hoa_hong, loi_nhuan, tien_ship, loi_nhuan_rong,
      da_giao, da_tat_toan, da_gui_email, is_quote
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21, $22, $23
    )
  `;
  return window.electronAPI.dbRun(sql, [
    orderId, data.thoi_gian, data.ten_hang, data.ten_khach_hang, data.ngay_du_kien,
    data.quy_cach, data.so_luong, data.mau_sac, data.don_gia_goc, data.thanh_tien,
    data.don_gia_ban, data.thanh_tien_ban, data.cong_no_khach, data.ctv, data.hoa_hong,
    data.tien_hoa_hong, data.loi_nhuan, data.tien_ship, data.loi_nhuan_rong,
    data.da_giao, data.da_tat_toan, data.da_gui_email, data.is_quote
  ]);
}
