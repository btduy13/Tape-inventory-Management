// JS/APP.JS - TẬP TRUNG ĐIỀU HƯỚNG VÀ ORCHESTRATOR TOÀN BỘ FRONTEND
let activeTab = 'dashboard';
let editOrderIdGlobal = null;
let editOrderTypeGlobal = null;
let editOrderDataGlobal = null;
let commandPaletteFilteredActions = [];
let commandPaletteSelectedIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Kích hoạt định dạng tiền tệ
  utils.setupCurrencyInputs();

  // 2. Điền ngày mặc định vào các form (Ngày mai)
  setDefaultDates();
  initializeTheme();
  initializeUiEnhancements();
  initializeAppVersion();
  initializeUpdateListeners();

  // 3. Tải dữ liệu cho Dashboard mặc định
  const databaseConnected = await initializeDatabaseStatus();
  if (databaseConnected) await switchTab('dashboard');
});

// Thiết lập ngày mặc định (Ngày mai)
function setDefaultDates() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const ids = [
    'bki-ngay-du-kien', 'bk-ngay-du-kien', 'ti-ngay-du-kien',
    'q-bki-ngay-du-kien', 'q-bk-ngay-du-kien', 'q-ti-ngay-du-kien'
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = tomorrowStr;
  });
}

// Chuyển đổi qua lại giữa các tab chức năng chính
async function switchTab(tabId) {
  activeTab = tabId;
  
  // 1. Toggled class active ở Sidebar Menu
  document.querySelectorAll('.sidebar-menu li').forEach(li => {
    li.classList.remove('active');
    if (li.dataset.tab === tabId) li.classList.add('active');
  });

  // 2. Toggled active ở Tab Panes nội dung
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  
  const targetPane = document.getElementById(`pane-${tabId}`);
  if (targetPane) targetPane.classList.add('active');

  // 3. Cập nhật Tiêu đề trang & Breadcrumbs
  const menuTitles = {
    'dashboard': 'Tổng quan',
    'sales': 'Quản Lý Bán Hàng',
    'quotes-creation': 'Báo Giá Đơn Hàng',
    'quotes-list': 'Các Đơn Báo Giá',
    'thong-ke': 'Báo Cáo Thống Kê'
  };
  
  const title = menuTitles[tabId] || 'Hệ Thống';
  document.getElementById('page-display-title').innerText = title;
  document.getElementById('breadcrumb-page-name').innerText = title;

  // 4. Kích hoạt tải dữ liệu đặc trưng của từng trang
  if (tabId === 'dashboard') {
    await loadDashboardData();
  } else if (tabId === 'thong-ke') {
    await loadStatsData();
  } else if (tabId === 'quotes-list') {
    await loadQuotationsData();
  }
}

// Chuyển đổi form trong tab Bán Hàng
function switchSalesForm(paneId) {
  document.querySelectorAll('#pane-sales .sales-form-pane').forEach(p => {
    p.style.display = 'none';
  });
  const target = document.getElementById(paneId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('#pane-sales .subtabs-bar .pill').forEach(btn => {
    btn.classList.remove('active');
  });

  const buttonMap = {
    'sales-form-bang-keo-in': 'btn-sales-bki',
    'sales-form-bang-keo': 'btn-sales-bk',
    'sales-form-truc-in': 'btn-sales-ti'
  };
  const btnId = buttonMap[paneId];
  if (btnId) document.getElementById(btnId).classList.add('active');
}

// Chuyển đổi form trong tab Báo Giá
function switchQuotesForm(paneId) {
  document.querySelectorAll('#pane-quotes-creation .quotes-form-pane').forEach(p => {
    p.style.display = 'none';
  });
  const target = document.getElementById(paneId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('#pane-quotes-creation .subtabs-bar .pill').forEach(btn => {
    btn.classList.remove('active');
  });

  const buttonMap = {
    'quotes-form-bang-keo-in': 'btn-quotes-bki',
    'quotes-form-bang-keo': 'btn-quotes-bk',
    'quotes-form-truc-in': 'btn-quotes-ti'
  };
  const btnId = buttonMap[paneId];
  if (btnId) document.getElementById(btnId).classList.add('active');
}

// Xóa trắng form dựa trên loại
function clearForm(type, mode = 'order') {
  if (type === 'bang-keo-in') {
    if (typeof clearFormBangKeoIn === 'function') clearFormBangKeoIn(mode);
  } else if (type === 'bang-keo') {
    if (typeof clearFormBangKeo === 'function') clearFormBangKeo(mode);
  } else if (type === 'truc-in') {
    if (typeof clearFormTrucIn === 'function') clearFormTrucIn(mode);
  }
  if (mode === 'quote' && typeof clearQuoteItems === 'function') {
    const quoteType = type === 'bang-keo-in' ? 'bang_keo_in' : (type === 'truc-in' ? 'truc_in' : 'bang_keo');
    clearQuoteItems(quoteType);
  }
}

// Nút làm mới trang tiện ích
async function refreshCurrentPage() {
  utils.showToast("Đang làm mới dữ liệu...", "warning");
  await switchTab(activeTab);
  utils.showToast("Đã cập nhật dữ liệu mới!", "success");
}

// Bật/Tắt Chế độ Sáng/Tối (Light/Dark Theme Toggle)
const THEME_STORAGE_KEY = 'bang-keo-ui-theme';

function applyTheme(isLight) {
  document.body.classList.toggle('light-theme', isLight);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerText = isLight ? 'Sáng' : 'Tối';
    btn.classList.toggle('active', !isLight);
  }
}

function initializeTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const isLight = saved ? saved === 'light' : true;
  applyTheme(isLight);
}

function toggleTheme() {
  const isLight = !document.body.classList.contains('light-theme');
  applyTheme(isLight);
  localStorage.setItem(THEME_STORAGE_KEY, isLight ? 'light' : 'dark');

  // Vẽ lại biểu đồ theo màu chữ mới của theme
  if (activeTab === 'dashboard') {
    updateDashboardCharts(document.querySelector('.chart-filters button.active').id.replace('filter-', ''));
    loadProductDistributionChart();
  }
}

// Mở Modal đóng
function closeModal(modalId) {
  if (modalId === 'modal-confirm-action') {
    utils.resolveConfirmAction(false);
    return;
  }
  document.getElementById(modalId)?.classList.remove('active');
}

function getTopActiveModal() {
  const activeModals = document.querySelectorAll('.modal-overlay.active');
  return activeModals.length > 0 ? activeModals[activeModals.length - 1] : null;
}

// --- LOGIC DIALOG CHỈNH SỬA ĐƠN HÀNG ĐỘNG (EDIT DIALOG CONTROL) ---
async function openEditOrderDialog(orderId, orderType) {
  orderType = utils.normalizeOrderType(orderType);
  editOrderIdGlobal = orderId;
  editOrderTypeGlobal = orderType;

  const tableName = utils.getOrderTableName(orderType);

  const res = await window.electronAPI.dbQuery(`SELECT * FROM ${tableName} WHERE id = $1`, [orderId]);
  if (!res.ok || res.rows.length === 0) {
    utils.showToast("Không tìm thấy dữ liệu đơn hàng", "danger");
    return;
  }

  const order = res.rows[0];
  editOrderDataGlobal = order;
  const modalBody = document.getElementById('edit-modal-body');
  
  // Nạp form động dựa theo loại đơn hàng
  if (orderType === 'bang_keo_in') {
    modalBody.innerHTML = generateBangKeoInEditForm(order);
  } else if (orderType === 'truc_in') {
    modalBody.innerHTML = generateTrucInEditForm(order);
  } else {
    modalBody.innerHTML = generateBangKeoEditForm(order);
  }

  // Khởi chạy định dạng tiền tệ cho form edit
  utils.setupCurrencyInputs();
  if (orderType === 'bang_keo_in') toggleEditAxisFields();
  
  // Bật modal
  document.getElementById('modal-edit-order').classList.add('active');
}

// HTML Generator cho form sửa Băng Keo In
function escapeAppHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEditInput(label, id, value, options = {}) {
  const type = options.type || 'text';
  const classes = `form-control${options.currency ? ' currency-format' : ''}`;
  const required = options.required ? ' required' : '';
  const min = options.min !== undefined ? ` min="${options.min}"` : '';
  const max = options.max !== undefined ? ` max="${options.max}"` : '';
  const readonly = options.readonly ? ' readonly' : '';
  const step = type === 'number' ? ' step="any"' : '';
  return `
    <div class="form-group">
      <label class="form-label" for="${id}">${label}${options.required ? ' *' : ''}</label>
      <input type="${type}" id="${id}" class="${classes}" value="${escapeAppHtml(value)}"${step}${min}${max}${required}${readonly}>
    </div>
  `;
}

function generateBangKeoInEditForm(o) {
  return `
    <form id="edit-order-form" class="form-grid edit-order-grid">
      <h4 class="edit-section-title">Thông tin đơn hàng</h4>
      ${buildEditInput('Mã đơn hàng', 'edit-order-id', o.id, { readonly: true })}
      ${buildEditInput('Tên hàng', 'edit-ten-hang', o.ten_hang, { required: true })}
      ${buildEditInput('Khách hàng', 'edit-ten-khach-hang', o.ten_khach_hang, { required: true })}
      ${buildEditInput('Ngày giao dự kiến', 'edit-ngay-du-kien', o.ngay_du_kien ? new Date(o.ngay_du_kien).toISOString().split('T')[0] : '', { type: 'date', required: true })}
      ${buildEditInput('Quy cách (mm)', 'edit-qc-mm', o.quy_cach_mm, { type: 'number' })}
      ${buildEditInput('Quy cách (m)', 'edit-qc-m', o.quy_cach_m, { type: 'number' })}
      ${buildEditInput('Quy cách (mic)', 'edit-qc-mic', o.quy_cach_mic, { type: 'number' })}
      ${buildEditInput('Cuộn / cây', 'edit-cuon-cay', o.cuon_cay, { type: 'number' })}
      ${buildEditInput('Màu keo', 'edit-mau-keo', o.mau_keo)}
      ${buildEditInput('Màu sắc', 'edit-mau-sac', o.mau_sac)}
      ${buildEditInput('Lõi giấy', 'edit-loi-giay', o.loi_giay)}
      ${buildEditInput('Thùng / bao', 'edit-thung-bao', o.thung_bao)}

      <h4 class="edit-section-title">Giá và chi phí</h4>
      ${buildEditInput('Số lượng', 'edit-so-luong', o.so_luong, { type: 'number', min: 0, required: true })}
      ${buildEditInput('Phí số lượng', 'edit-phi-sl', utils.formatCurrency(o.phi_sl), { currency: true })}
      ${buildEditInput('Phí keo', 'edit-phi-keo', utils.formatCurrency(o.phi_keo), { currency: true })}
      ${buildEditInput('Phí màu', 'edit-phi-mau', utils.formatCurrency(o.phi_mau), { currency: true })}
      ${buildEditInput('Phí size', 'edit-phi-size', utils.formatCurrency(o.phi_size), { currency: true })}
      ${buildEditInput('Phí cắt', 'edit-phi-cat', utils.formatCurrency(o.phi_cat), { currency: true })}
      ${buildEditInput('Đơn giá vốn', 'edit-don-gia-von', utils.formatCurrency(o.don_gia_von), { currency: true })}
      ${buildEditInput('Đơn giá bán', 'edit-don-gia-ban', utils.formatCurrency(o.don_gia_ban), { currency: true, required: true })}
      ${buildEditInput('Tiền cọc', 'edit-tien-coc', utils.formatCurrency(o.tien_coc), { currency: true })}
      ${buildEditInput('VAT (đ)', 'edit-vat', utils.formatCurrency(o.vat), { currency: true })}
      ${buildEditInput('CTV', 'edit-ctv', o.ctv)}
      ${buildEditInput('Hoa hồng (%)', 'edit-hoa-hong-percent', o.hoa_hong, { type: 'number', min: 0, max: 100 })}
      ${buildEditInput('Tiền ship', 'edit-tien-ship', utils.formatCurrency(o.tien_ship), { currency: true })}

      <h4 class="edit-section-title">Trục in</h4>
      <div class="form-group">
        <label class="form-label" for="edit-loai-truc">Loại trục</label>
        <select id="edit-loai-truc" class="form-control" onchange="toggleEditAxisFields()">
          <option value="cu" ${o.loai_truc !== 'moi' ? 'selected' : ''}>Trục cũ</option>
          <option value="moi" ${o.loai_truc === 'moi' ? 'selected' : ''}>Trục mới</option>
        </select>
      </div>
      <div class="edit-axis-fields ${o.loai_truc === 'moi' ? 'active' : ''}" id="edit-axis-fields">
        ${buildEditInput('Tên trục', 'edit-truc-ten', o.ten_truc)}
        ${buildEditInput('Chu vi', 'edit-truc-chu-vi', o.truc_chu_vi, { type: 'number', min: 0 })}
        ${buildEditInput('Số lượng trục', 'edit-truc-so-luong', o.truc_so_luong, { type: 'number', min: 0 })}
        ${buildEditInput('Giá gốc trục', 'edit-truc-gia-goc', utils.formatCurrency(o.truc_gia_goc), { currency: true })}
        ${buildEditInput('Giá bán trục', 'edit-truc-gia-ban', utils.formatCurrency(o.truc_gia_ban), { currency: true })}
        ${buildEditInput('VAT trục', 'edit-truc-vat', utils.formatCurrency(o.truc_vat), { currency: true })}
        ${buildEditInput('CTV trục', 'edit-truc-ctv', o.truc_ctv)}
        ${buildEditInput('Hoa hồng trục (%)', 'edit-truc-hoa-hong-percent', o.truc_hoa_hong, { type: 'number', min: 0, max: 100 })}
      </div>
    </form>
  `;
}

function toggleEditAxisFields() {
  const isNewAxis = document.getElementById('edit-loai-truc')?.value === 'moi';
  const fields = document.getElementById('edit-axis-fields');
  if (!fields) return;
  fields.classList.toggle('active', isNewAxis);
  ['edit-truc-ten', 'edit-truc-so-luong', 'edit-truc-gia-goc', 'edit-truc-gia-ban'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.required = isNewAxis;
  });
}

// HTML Generator cho form sửa Trục In
function generateTrucInEditForm(o) {
  return `
    <form id="edit-order-form" class="form-grid edit-order-grid">
      <h4 class="edit-section-title">Thông tin đơn hàng</h4>
      ${buildEditInput('Mã đơn hàng', 'edit-order-id', o.id, { readonly: true })}
      ${buildEditInput('Tên hàng', 'edit-ten-hang', o.ten_hang, { required: true })}
      ${buildEditInput('Khách hàng', 'edit-ten-khach-hang', o.ten_khach_hang, { required: true })}
      ${buildEditInput('Ngày giao dự kiến', 'edit-ngay-du-kien', o.ngay_du_kien ? new Date(o.ngay_du_kien).toISOString().split('T')[0] : '', { type: 'date', required: true })}
      ${buildEditInput('Quy cách', 'edit-quy-cach', o.quy_cach)}
      ${buildEditInput('Màu sắc', 'edit-mau-sac', o.mau_sac)}
      ${editOrderTypeGlobal === 'truc_in' ? buildEditInput('Màu keo', 'edit-mau-keo', o.mau_keo) : ''}
      <h4 class="edit-section-title">Giá và chi phí</h4>
      ${buildEditInput('Số lượng', 'edit-so-luong', o.so_luong, { type: 'number', min: 0, required: true })}
      ${buildEditInput('Đơn giá gốc', 'edit-don-gia-goc', utils.formatCurrency(o.don_gia_goc), { currency: true, required: true })}
      ${buildEditInput('Đơn giá bán', 'edit-don-gia-ban', utils.formatCurrency(o.don_gia_ban), { currency: true, required: true })}
      ${buildEditInput('VAT (đ)', 'edit-vat', utils.formatCurrency(o.vat), { currency: true })}
      ${buildEditInput('Hoa hồng (%)', 'edit-hoa-hong-percent', o.hoa_hong, { type: 'number', min: 0, max: 100 })}
      ${buildEditInput('Tiền ship', 'edit-tien-ship', utils.formatCurrency(o.tien_ship), { currency: true })}
      ${buildEditInput('CTV', 'edit-ctv', o.ctv)}
    </form>
  `;
}

// HTML Generator cho form sửa Băng Keo thường
function generateBangKeoEditForm(o) {
  return generateTrucInEditForm(o); // Cấu trúc tương tự Trục In
}

// Gửi lệnh Lưu chỉnh sửa đơn hàng
async function submitEditOrder() {
  try {
    const form = document.getElementById('edit-order-form');
    if (!form) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const tableName = utils.getOrderTableName(editOrderTypeGlobal);
    const tenHang = document.getElementById('edit-ten-hang').value.trim();
    const tenKhachHang = document.getElementById('edit-ten-khach-hang').value.trim();
    const ngayDuKien = document.getElementById('edit-ngay-du-kien').value;
    const soLuong = parseFloat(document.getElementById('edit-so-luong').value) || 0;
    const donGiaBan = utils.parseCurrency(document.getElementById('edit-don-gia-ban').value);
    const ctv = document.getElementById('edit-ctv').value.trim() || null;
    const hoaHong = orderMath.percent(document.getElementById('edit-hoa-hong-percent').value);
    const tienShip = utils.parseCurrency(document.getElementById('edit-tien-ship').value);
    const vat = utils.parseCurrency(document.getElementById('edit-vat')?.value);

    if (!tenHang || !tenKhachHang || !ngayDuKien || soLuong <= 0 || donGiaBan <= 0) {
      utils.showToast('Vui lòng nhập đủ tên hàng, khách hàng, ngày giao, số lượng và giá bán', 'warning');
      return;
    }

    let sql;
    let params;

    if (editOrderTypeGlobal === 'bang_keo_in') {
      const donGiaVon = utils.parseCurrency(document.getElementById('edit-don-gia-von').value);
      const quyCachM = parseFloat(document.getElementById('edit-qc-m').value) || 0;
      const cuonCay = parseFloat(document.getElementById('edit-cuon-cay').value) || 0;
      const tienCoc = utils.parseCurrency(document.getElementById('edit-tien-coc').value);
      const isNewAxis = document.getElementById('edit-loai-truc').value === 'moi';
      const axisQuantity = parseFloat(document.getElementById('edit-truc-so-luong').value) || 0;
      const axisCostPrice = utils.parseCurrency(document.getElementById('edit-truc-gia-goc').value);
      const axisSalePrice = utils.parseCurrency(document.getElementById('edit-truc-gia-ban').value);
      const axisVat = isNewAxis ? utils.parseCurrency(document.getElementById('edit-truc-vat').value) : 0;

      if (isNewAxis && (!document.getElementById('edit-truc-ten').value.trim() || axisQuantity <= 0 || axisCostPrice <= 0 || axisSalePrice <= 0)) {
        utils.showToast('Trục mới cần đủ tên trục, số lượng, giá gốc và giá bán', 'warning');
        return;
      }

      const result = orderMath.calculatePrintedTape({
        quantity: soLuong,
        baseCost: donGiaVon,
        quantityFee: utils.parseCurrency(document.getElementById('edit-phi-sl').value),
        glueFee: utils.parseCurrency(document.getElementById('edit-phi-keo').value),
        colorFee: utils.parseCurrency(document.getElementById('edit-phi-mau').value),
        sizeFee: utils.parseCurrency(document.getElementById('edit-phi-size').value),
        cuttingFee: utils.parseCurrency(document.getElementById('edit-phi-cat').value),
        salePrice: donGiaBan,
        deposit: tienCoc,
        vat,
        commissionPercent: hoaHong,
        shipping: tienShip,
        rollLength: quyCachM,
        rollsPerTree: cuonCay,
        isNewAxis,
        axisQuantity,
        axisCostPrice,
        axisSalePrice,
        axisVat,
        axisCommissionPercent: document.getElementById('edit-truc-hoa-hong-percent').value,
        settled: !!editOrderDataGlobal?.da_tat_toan
      });

      sql = `
        UPDATE bang_keo_in_orders SET
          ten_hang=$1, ten_khach_hang=$2, ngay_du_kien=$3, quy_cach_mm=$4, quy_cach_m=$5,
          quy_cach_mic=$6, cuon_cay=$7, so_luong=$8, phi_sl=$9, mau_keo=$10, phi_keo=$11,
          mau_sac=$12, phi_mau=$13, phi_size=$14, phi_cat=$15, don_gia_von=$16,
          don_gia_goc=$17, thanh_tien_goc=$18, don_gia_ban=$19, thanh_tien_ban=$20,
          tien_coc=$21, cong_no_khach=$22, ctv=$23, hoa_hong=$24, tien_hoa_hong=$25,
          loi_giay=$26, thung_bao=$27, loi_nhuan=$28, tien_ship=$29, loi_nhuan_rong=$30,
          loai_truc=$31, ten_truc=$32, truc_chu_vi=$33, truc_so_luong=$34, truc_gia_goc=$35,
          truc_gia_ban=$36, truc_thanh_tien_goc=$37, truc_thanh_tien_ban=$38, truc_ctv=$39,
          truc_hoa_hong=$40, truc_tien_hoa_hong=$41, truc_loi_nhuan=$42, truc_loi_nhuan_rong=$43,
          truc_vat=$44, vat=$45
        WHERE id=$46
      `;
      params = [
        tenHang, tenKhachHang, ngayDuKien,
        parseFloat(document.getElementById('edit-qc-mm').value) || null, quyCachM || null,
        parseFloat(document.getElementById('edit-qc-mic').value) || null, cuonCay || null, soLuong,
        utils.parseCurrency(document.getElementById('edit-phi-sl').value), document.getElementById('edit-mau-keo').value.trim() || null,
        utils.parseCurrency(document.getElementById('edit-phi-keo').value), document.getElementById('edit-mau-sac').value.trim() || null,
        utils.parseCurrency(document.getElementById('edit-phi-mau').value), utils.parseCurrency(document.getElementById('edit-phi-size').value),
        utils.parseCurrency(document.getElementById('edit-phi-cat').value), donGiaVon,
        result.product.costPrice, result.product.costTotal, donGiaBan, result.product.saleTotal,
        tienCoc, result.outstanding, ctv, hoaHong, result.product.commission,
        document.getElementById('edit-loi-giay').value.trim() || null, document.getElementById('edit-thung-bao').value.trim() || null,
        result.product.profit, tienShip, result.product.netProfit, isNewAxis ? 'moi' : 'cu',
        isNewAxis ? document.getElementById('edit-truc-ten').value.trim() : null,
        isNewAxis ? (parseFloat(document.getElementById('edit-truc-chu-vi').value) || null) : null,
        isNewAxis ? axisQuantity : 0, isNewAxis ? axisCostPrice : 0, isNewAxis ? axisSalePrice : 0,
        result.axis.costTotal, result.axis.saleTotal,
        isNewAxis ? (document.getElementById('edit-truc-ctv').value.trim() || null) : null,
        isNewAxis ? result.axis.commissionPercent : 0, result.axis.commission, result.axis.profit, result.axis.netProfit, axisVat, vat,
        editOrderIdGlobal
      ];
    } else {
      const donGiaGoc = utils.parseCurrency(document.getElementById('edit-don-gia-goc').value);
      if (donGiaGoc <= 0) {
        utils.showToast('Đơn giá gốc phải lớn hơn 0', 'warning');
        return;
      }
      const result = orderMath.calculateStandardOrder({
        quantity: soLuong,
        costPrice: donGiaGoc,
        salePrice: donGiaBan,
        commissionPercent: hoaHong,
        shipping: tienShip,
        vat,
        settled: !!editOrderDataGlobal?.da_tat_toan
      });
      const common = [
        tenHang, tenKhachHang, ngayDuKien, document.getElementById('edit-quy-cach').value.trim() || null,
        soLuong, document.getElementById('edit-mau-sac').value.trim() || null
      ];

      if (editOrderTypeGlobal === 'truc_in') {
        sql = `UPDATE truc_in_orders SET ten_hang=$1, ten_khach_hang=$2, ngay_du_kien=$3, quy_cach=$4,
          so_luong=$5, mau_sac=$6, mau_keo=$7, don_gia_goc=$8, don_gia_ban=$9, ctv=$10,
          hoa_hong=$11, tien_ship=$12, thanh_tien_goc=$13, thanh_tien_ban=$14, cong_no_khach=$15,
          loi_nhuan=$16, tien_hoa_hong=$17, loi_nhuan_rong=$18, vat=$19 WHERE id=$20`;
        params = [...common, document.getElementById('edit-mau-keo').value.trim() || null, donGiaGoc, donGiaBan,
          ctv, hoaHong, tienShip, result.costTotal, result.saleTotal, result.outstanding,
          result.profit, result.commission, result.netProfit, vat, editOrderIdGlobal];
      } else {
        sql = `UPDATE bang_keo_orders SET ten_hang=$1, ten_khach_hang=$2, ngay_du_kien=$3, quy_cach=$4,
          so_luong=$5, mau_sac=$6, don_gia_goc=$7, don_gia_ban=$8, ctv=$9, hoa_hong=$10,
          tien_ship=$11, thanh_tien=$12, thanh_tien_ban=$13, cong_no_khach=$14,
          loi_nhuan=$15, tien_hoa_hong=$16, loi_nhuan_rong=$17, vat=$18 WHERE id=$19`;
        params = [...common, donGiaGoc, donGiaBan, ctv, hoaHong, tienShip, result.costTotal,
          result.saleTotal, result.outstanding, result.profit, result.commission, result.netProfit, vat, editOrderIdGlobal];
      }
    }

    const res = await window.electronAPI.dbRun(sql, params);
    if (res.ok) {
      utils.showToast(`Đã lưu thay đổi cho đơn ${editOrderIdGlobal}`, "success");
      closeModal('modal-edit-order');
      editOrderDataGlobal = null;
      await switchTab(activeTab);
      if (typeof loadDashboardData === 'function' && activeTab !== 'dashboard') loadDashboardData();
    } else {
      utils.showToast("Lỗi cập nhật đơn hàng: " + res.error, "danger");
    }

  } catch (err) {
    window.electronAPI.writeLog('error', 'Lỗi lưu chỉnh sửa đơn hàng: ' + err.message);
    utils.showToast("Không thể cập nhật đơn hàng", "danger");
  }
}

// ==========================================
// PHẦN MỚI: QUẢN LÝ PHÍM TẮT TOÀN CỤC & XUẤT EXCEL TỪ FORM
// ==========================================

// Helper xuất Excel một dòng dữ liệu từ form
async function writeSingleRowExcel(data, prefix) {
  try {
    const worksheet = XLSX.utils.json_to_sheet([data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Chi tiết đơn hàng");

    const savePath = await window.electronAPI.showSaveDialog({
      title: "Lưu file đơn hàng xuất Excel",
      defaultPath: `don_hang_${prefix}_${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (savePath && !savePath.canceled && savePath.filePath) {
      const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const result = await window.electronAPI.writeFileBase64(savePath.filePath, base64);
      if (!result.ok) throw new Error(result.error || 'Không thể ghi file Excel');
      utils.showToast("Xuất Excel thành công!", "success");
    }
  } catch (err) {
    utils.showToast("Lỗi xuất Excel: " + err.message, "danger");
  }
}

// Hàm xuất Excel cho form hiện tại
async function exportCurrentFormToExcel() {
  let mode = 'order';
  
  if (activeTab === 'quotes-creation') {
    mode = 'quote';
  } else if (activeTab === 'sales') {
    mode = 'order';
  } else if (activeTab === 'thong-ke') {
    exportStatsExcel();
    return;
  } else {
    utils.showToast("Không hỗ trợ xuất Excel cho tab hiện tại", "warning");
    return;
  }

  const prefix = (mode === 'quote') ? 'q-' : '';
  
  // Xác định xem form nào đang active
  let activeForm = '';
  if (mode === 'order') {
    if (document.getElementById('sales-form-bang-keo-in').style.display !== 'none') activeForm = 'bang-keo-in';
    else if (document.getElementById('sales-form-bang-keo').style.display !== 'none') activeForm = 'bang-keo';
    else if (document.getElementById('sales-form-truc-in').style.display !== 'none') activeForm = 'truc-in';
  } else {
    if (document.getElementById('quotes-form-bang-keo-in').style.display !== 'none') activeForm = 'bang-keo-in';
    else if (document.getElementById('quotes-form-bang-keo').style.display !== 'none') activeForm = 'bang-keo';
    else if (document.getElementById('quotes-form-truc-in').style.display !== 'none') activeForm = 'truc-in';
  }

  if (activeForm === 'bang-keo-in') {
    const data = {
      'Tên Hàng': document.getElementById(`${prefix}bki-ten-hang`).value.trim(),
      'Ngày dự kiến': document.getElementById(`${prefix}bki-ngay-du-kien`).value,
      'Tên Khách Hàng': document.getElementById(`${prefix}bki-ten-khach-hang`).value.trim(),
      'Quy Cách (mm)': parseFloat(document.getElementById(`${prefix}bki-qc-mm`).value) || '',
      'Quy Cách (m)': parseFloat(document.getElementById(`${prefix}bki-qc-m`).value) || '',
      'Quy Cách (mic)': parseFloat(document.getElementById(`${prefix}bki-qc-mic`).value) || '',
      'Cuộn/Cây': parseFloat(document.getElementById(`${prefix}bki-cuon-cay`).value) || '',
      'Số lượng': parseFloat(document.getElementById(`${prefix}bki-so-luong`).value) || 0,
      'Phí SL': utils.parseCurrency(document.getElementById(`${prefix}bki-phi-sl`).value),
      'Màu keo': document.getElementById(`${prefix}bki-mau-keo`).value.trim(),
      'Phí keo': utils.parseCurrency(document.getElementById(`${prefix}bki-phi-keo`).value),
      'Màu sắc': document.getElementById(`${prefix}bki-mau-sac`).value.trim(),
      'Phí màu': utils.parseCurrency(document.getElementById(`${prefix}bki-phi-mau`).value),
      'Phí size': utils.parseCurrency(document.getElementById(`${prefix}bki-phi-size`).value),
      'Phí cắt': utils.parseCurrency(document.getElementById(`${prefix}bki-phi-cat`).value),
      'Đơn giá vốn': utils.parseCurrency(document.getElementById(`${prefix}bki-don-gia-von`).value),
      'Đơn giá gốc': utils.parseCurrency(document.getElementById(`${prefix}bki-don-gia-goc`).value),
      'Thành tiền gốc': utils.parseCurrency(document.getElementById(`${prefix}bki-thanh-tien-goc`).value),
      'Đơn giá bán': utils.parseCurrency(document.getElementById(`${prefix}bki-don-gia-ban`).value),
      'Thành tiền bán': utils.parseCurrency(document.getElementById(`${prefix}bki-thanh-tien-ban`).value),
      'VAT': utils.parseCurrency(document.getElementById(`${prefix}bki-vat`)?.value),
      'Tiền cọc': utils.parseCurrency(document.getElementById(`${prefix}bki-tien-coc`).value),
      'Công nợ khách': utils.parseCurrency(document.getElementById(`${prefix}bki-cong-no-khach`).value),
      'CTV': document.getElementById(`${prefix}bki-ctv`).value.trim(),
      'Hoa hồng (%)': parseFloat(document.getElementById(`${prefix}bki-hoa-hong-percent`).value) || 0,
      'Tiền hoa hồng': utils.parseCurrency(document.getElementById(`${prefix}bki-tien-hoa-hong`).value),
      'Lõi Giấy': document.getElementById(`${prefix}bki-loi-giay`).value.trim(),
      'Thùng/Bao bì': document.getElementById(`${prefix}bki-thung-bao`).value.trim(),
      'Loại trục': document.getElementById(`${prefix}bki-loai-truc`)?.value === 'moi' ? 'Trục mới' : 'Trục cũ',
      'Tên Trục': document.getElementById(`${prefix}bki-truc-ten`)?.value.trim() || '',
      'Chu vi Trục': parseFloat(document.getElementById(`${prefix}bki-truc-chu-vi`)?.value) || '',
      'Số lượng Trục': parseFloat(document.getElementById(`${prefix}bki-truc-so-luong`)?.value) || '',
      'Giá gốc Trục': utils.parseCurrency(document.getElementById(`${prefix}bki-truc-gia-goc`)?.value),
      'Giá bán Trục': utils.parseCurrency(document.getElementById(`${prefix}bki-truc-gia-ban`)?.value),
      'Thành tiền gốc Trục': utils.parseCurrency(document.getElementById(`${prefix}bki-truc-thanh-tien-goc`)?.value),
      'Thành tiền bán Trục': utils.parseCurrency(document.getElementById(`${prefix}bki-truc-thanh-tien-ban`)?.value),
      'CTV Trục': document.getElementById(`${prefix}bki-truc-ctv`)?.value.trim() || '',
      'Hoa hồng Trục (%)': parseFloat(document.getElementById(`${prefix}bki-truc-hoa-hong-percent`)?.value) || 0,
      'Lãi Trục': utils.parseCurrency(document.getElementById(`${prefix}bki-truc-loi-nhuan`)?.value),
      'Lãi ròng Trục': utils.parseCurrency(document.getElementById(`${prefix}bki-truc-loi-nhuan-rong`)?.value),
      'Lợi nhuận': utils.parseCurrency(document.getElementById(`${prefix}bki-loi-nhuan`).value),
      'Tiền ship': utils.parseCurrency(document.getElementById(`${prefix}bki-tien-ship`).value),
      'Lợi nhuận ròng': utils.parseCurrency(document.getElementById(`${prefix}bki-loi-nhuan-rong`).value)
    };
    await writeSingleRowExcel(data, mode === 'quote' ? 'q-bki' : 'bki');
  } else if (activeForm === 'bang-keo') {
    const data = {
      'Tên Hàng': document.getElementById(`${prefix}bk-ten-hang`).value.trim(),
      'Ngày dự kiến': document.getElementById(`${prefix}bk-ngay-du-kien`).value,
      'Tên Khách Hàng': document.getElementById(`${prefix}bk-ten-khach-hang`).value.trim(),
      'Quy Cách': document.getElementById(`${prefix}bk-quy-cach`).value.trim(),
      'Số lượng': parseFloat(document.getElementById(`${prefix}bk-so-luong`).value) || 0,
      'Màu sắc': document.getElementById(`${prefix}bk-mau-sac`).value.trim(),
      'Đơn giá gốc': utils.parseCurrency(document.getElementById(`${prefix}bk-don-gia-goc`).value),
      'Thành tiền gốc': utils.parseCurrency(document.getElementById(`${prefix}bk-thanh-tien-goc`).value),
      'Đơn giá bán': utils.parseCurrency(document.getElementById(`${prefix}bk-don-gia-ban`).value),
      'Thành tiền bán': utils.parseCurrency(document.getElementById(`${prefix}bk-thanh-tien-ban`).value),
      'Công nợ khách': utils.parseCurrency(document.getElementById(`${prefix}bk-cong-no-khach`).value),
      'VAT': utils.parseCurrency(document.getElementById(`${prefix}bk-vat`)?.value),
      'CTV': document.getElementById(`${prefix}bk-ctv`).value.trim(),
      'Hoa hồng (%)': parseFloat(document.getElementById(`${prefix}bk-hoa-hong-percent`).value) || 0,
      'Tiền hoa hồng': utils.parseCurrency(document.getElementById(`${prefix}bk-tien-hoa-hong`).value),
      'Lợi nhuận': utils.parseCurrency(document.getElementById(`${prefix}bk-loi-nhuan`).value),
      'Tiền ship': utils.parseCurrency(document.getElementById(`${prefix}bk-tien-ship`).value),
      'Lợi nhuận ròng': utils.parseCurrency(document.getElementById(`${prefix}bk-loi-nhuan-rong`).value)
    };
    await writeSingleRowExcel(data, mode === 'quote' ? 'q-bk' : 'bk');
  } else if (activeForm === 'truc-in') {
    const data = {
      'Tên Hàng': document.getElementById(`${prefix}ti-ten-hang`).value.trim(),
      'Ngày dự kiến': document.getElementById(`${prefix}ti-ngay-du-kien`).value,
      'Tên Khách Hàng': document.getElementById(`${prefix}ti-ten-khach-hang`).value.trim(),
      'Quy Cách': document.getElementById(`${prefix}ti-quy-cach`).value.trim(),
      'Số lượng': parseFloat(document.getElementById(`${prefix}ti-so-luong`).value) || 0,
      'Màu sắc': document.getElementById(`${prefix}ti-mau-sac`).value.trim(),
      'Màu keo': document.getElementById(`${prefix}ti-mau-keo`).value.trim(),
      'Đơn giá gốc': utils.parseCurrency(document.getElementById(`${prefix}ti-don-gia-goc`).value),
      'Thành tiền gốc': utils.parseCurrency(document.getElementById(`${prefix}ti-thanh-tien-goc`).value),
      'Đơn giá bán': utils.parseCurrency(document.getElementById(`${prefix}ti-don-gia-ban`).value),
      'Thành tiền bán': utils.parseCurrency(document.getElementById(`${prefix}ti-thanh-tien-ban`).value),
      'Công nợ khách': utils.parseCurrency(document.getElementById(`${prefix}ti-cong-no-khach`).value),
      'VAT': utils.parseCurrency(document.getElementById(`${prefix}ti-vat`)?.value),
      'CTV': document.getElementById(`${prefix}ti-ctv`).value.trim(),
      'Hoa hồng (%)': parseFloat(document.getElementById(`${prefix}ti-hoa-hong-percent`).value) || 0,
      'Tiền hoa hồng': utils.parseCurrency(document.getElementById(`${prefix}ti-tien-hoa-hong`).value),
      'Lợi nhuận': utils.parseCurrency(document.getElementById(`${prefix}ti-loi-nhuan`).value),
      'Tiền ship': utils.parseCurrency(document.getElementById(`${prefix}ti-tien-ship`).value),
      'Lợi nhuận ròng': utils.parseCurrency(document.getElementById(`${prefix}ti-loi-nhuan-rong`).value)
    };
    await writeSingleRowExcel(data, mode === 'quote' ? 'q-ti' : 'ti');
  }
}

// Lắng nghe phím tắt toàn cục
const commandPaletteActions = [
  { title: 'Tổng quan', description: 'Mở dashboard và biểu đồ doanh số', group: 'Trang', run: () => switchTab('dashboard') },
  { title: 'Tạo đơn Băng Keo In', description: 'Mở form bán hàng Băng Keo In Logo', group: 'Bán hàng', run: () => jumpToSalesForm('sales-form-bang-keo-in') },
  { title: 'Tạo đơn Băng Keo thường', description: 'Mở form bán hàng Băng Keo thường', group: 'Bán hàng', run: () => jumpToSalesForm('sales-form-bang-keo') },
  { title: 'Tạo đơn Trục In', description: 'Mở form gia công Trục In', group: 'Bán hàng', run: () => jumpToSalesForm('sales-form-truc-in') },
  { title: 'Tạo báo giá', description: 'Mở khu vực báo giá đơn hàng', group: 'Báo giá', run: () => switchTab('quotes-creation') },
  { title: 'Danh sách báo giá', description: 'Xem và chuyển báo giá thành đơn hàng', group: 'Báo giá', run: () => switchTab('quotes-list') },
  { title: 'Thống kê', description: 'Theo dõi giao hàng, công nợ, lịch sử đơn và xuất Excel', group: 'Báo cáo', run: () => switchTab('thong-ke') },
  { title: 'Đơn quá hạn', description: 'Lọc nhanh các đơn chưa giao đã quá hạn', group: 'Báo cáo', run: () => jumpToStatsFilter('overdue') },
  { title: 'Đơn sắp hạn', description: 'Lọc nhanh các đơn cần giao trong 3 ngày', group: 'Báo cáo', run: () => jumpToStatsFilter('near-due') },
  { title: 'Công nợ chưa tất toán', description: 'Lọc các đơn còn công nợ mở', group: 'Báo cáo', run: () => jumpToStatsFilter('unsettled') },
  { title: 'Tải mẫu nhập Excel', description: 'Tạo file mẫu theo loại đơn đang chọn trong Thống kê', group: 'Dữ liệu', run: () => { switchTab('thong-ke'); exportImportTemplate(); } },
  { title: 'Nhập đơn từ Excel', description: 'Nhập nhiều đơn hàng và tự tính tiền', group: 'Dữ liệu', run: () => importOrdersFromExcel() },
  { title: 'Xuất đơn / phiếu giao', description: 'Mở trình chọn nhiều đơn để in chứng từ', group: 'Chứng từ', run: () => openMultiOrderExportDialog() },
  { title: 'Xuất Excel form hiện tại', description: 'Xuất dữ liệu từ form hoặc lịch sử đang mở', group: 'Xuất file', run: () => exportCurrentFormToExcel() },
  { title: 'Làm mới dữ liệu', description: 'Tải lại dữ liệu của trang hiện tại', group: 'Hệ thống', run: () => refreshCurrentPage() },
  { title: 'Kiểm tra cập nhật', description: 'Tìm phiên bản mới trên GitHub Releases', group: 'Hệ thống', run: () => checkForAppUpdates() },
  { title: 'Cấu hình dữ liệu', description: 'Kiểm tra, xuất hoặc nhập kết nối cho máy mới', group: 'Hệ thống', run: () => openDatabaseConfigManager() },
  { title: 'Phím tắt', description: 'Xem danh sách phím tắt thao tác nhanh', group: 'Hệ thống', run: () => openShortcutsModal() }
];

function initializeUiEnhancements() {
  updateFooterClock();
  setInterval(updateFooterClock, 30000);
  renderCommandResults();
}

function updateFooterClock() {
  const el = document.getElementById('footer-db-time');
  if (!el) return;

  const now = new Date();
  el.innerText = `Cập nhật: ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

function setConnectionStatus(isConnected, label) {
  const badge = document.getElementById('connection-status-badge');
  const text = document.getElementById('connection-status-text');
  const footer = document.getElementById('footer-status-text');

  if (badge) badge.classList.toggle('offline', !isConnected);
  if (text) text.innerText = label || (isConnected ? 'Mây: Kết nối' : 'Mây: Mất kết nối');
  if (footer) footer.innerText = isConnected ? 'Đã sẵn sàng' : 'Không thể tải dữ liệu mới';
}

async function initializeDatabaseStatus() {
  try {
    const status = await window.electronAPI.getDatabaseStatus();
    setConnectionStatus(!!status.connected, status.connected ? 'Mây: Kết nối' : 'Mây: Cần cấu hình');
    return !!status.connected;
  } catch (_) {
    setConnectionStatus(false, 'Mây: Mất kết nối');
    return false;
  }
}

async function openDatabaseConfigManager() {
  const result = await window.electronAPI.manageDatabaseConfig();
  if (!result) return;

  if (result.exported) {
    utils.showToast('Đã xuất cấu hình. Chỉ chuyển tệp này sang máy tin cậy.', 'success');
  } else if (result.connected) {
    setConnectionStatus(true);
    utils.showToast('Kết nối cơ sở dữ liệu hoạt động bình thường.', 'success');
    await switchTab(activeTab);
  } else if (result.error) {
    setConnectionStatus(false, 'Mây: Mất kết nối');
    utils.showToast('Không thể kết nối: ' + result.error, 'danger');
  }
}

function openCommandPalette() {
  const modal = document.getElementById('modal-command-palette');
  const input = document.getElementById('command-palette-input');
  if (!modal || !input) return;

  modal.classList.add('active');
  input.value = '';
  commandPaletteSelectedIndex = 0;
  renderCommandResults();
  setTimeout(() => input.focus(), 30);
}

function renderCommandResults() {
  const input = document.getElementById('command-palette-input');
  const results = document.getElementById('command-palette-results');
  if (!input || !results) return;

  const query = input.value.toLowerCase().trim();
  commandPaletteFilteredActions = commandPaletteActions.filter(action => {
    const haystack = `${action.title} ${action.description} ${action.group}`.toLowerCase();
    return !query || haystack.includes(query);
  });

  if (commandPaletteSelectedIndex >= commandPaletteFilteredActions.length) {
    commandPaletteSelectedIndex = Math.max(0, commandPaletteFilteredActions.length - 1);
  }
  if (commandPaletteSelectedIndex < 0) {
    commandPaletteSelectedIndex = 0;
  }

  if (commandPaletteFilteredActions.length === 0) {
    results.innerHTML = '<div class="command-empty">Không tìm thấy thao tác phù hợp</div>';
    return;
  }

  results.innerHTML = commandPaletteFilteredActions.map((action, index) => `
    <button class="command-result ${index === commandPaletteSelectedIndex ? 'active' : ''}" onclick="executeCommandPaletteAction(${index})">
      <span>
        <strong>${action.title}</strong>
        <small>${action.description}</small>
      </span>
      <span class="badge badge-gray">${action.group}</span>
    </button>
  `).join('');
}

function handleCommandPaletteKey(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    commandPaletteSelectedIndex = Math.max(0, Math.min(commandPaletteSelectedIndex + 1, commandPaletteFilteredActions.length - 1));
    renderCommandResults();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    commandPaletteSelectedIndex = Math.max(commandPaletteSelectedIndex - 1, 0);
    renderCommandResults();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    executeCommandPaletteAction(commandPaletteSelectedIndex);
  }
}

async function executeCommandPaletteAction(index) {
  const action = commandPaletteFilteredActions[index];
  if (!action) return;

  closeModal('modal-command-palette');
  await action.run();
}

async function jumpToSalesForm(formId) {
  await switchTab('sales');
  switchSalesForm(formId);
}

async function jumpToStatsFilter(statusFilter) {
  await switchTab('thong-ke');

  const filter = document.getElementById('stats-status-filter');
  if (filter) {
    filter.value = statusFilter;
    filterStatsTable();
  }
}

function openShortcutsModal() {
  const modal = document.getElementById('modal-shortcuts');
  if (modal) modal.classList.add('active');
}

window.addEventListener('keydown', async (e) => {
  const isCtrl = e.ctrlKey || e.metaKey;
  const key = e.key;
  const lowerKey = key.toLowerCase();

  // 1. Phím Escape - Đóng Modal
  if (key === 'Escape') {
    const activeModal = getTopActiveModal();
    if (activeModal) {
      e.preventDefault();
      if (activeModal.id === 'modal-confirm-action') {
        utils.resolveConfirmAction(false);
      } else if (activeModal.id === 'modal-email-dialog') {
        closeEmailDialogModal();
      } else {
        closeModal(activeModal.id);
      }
      return;
    }
  }

  // 2. Phím F5 - Làm mới dữ liệu theo tab
  if (isCtrl && lowerKey === 'k') {
    e.preventDefault();
    openCommandPalette();
    return;
  }

  if (isCtrl && key === '/') {
    e.preventDefault();
    openShortcutsModal();
    return;
  }

  if (key === 'F5') {
    e.preventDefault();
    if (activeTab === 'thong-ke') {
      loadStatsData();
      utils.showToast("Đã cập nhật thống kê", "success");
    } else if (activeTab === 'dashboard') {
      loadDashboardData();
      utils.showToast("Đã cập nhật tổng quan", "success");
    } else if (activeTab === 'quotes-list') {
      loadQuotationsData();
      utils.showToast("Đã cập nhật danh sách báo giá", "success");
    } else {
      refreshCurrentPage();
    }
    return;
  }

  // 3. Phím Delete - Xóa các dòng lịch sử đã chọn
  if (key === 'Delete') {
    const activeEl = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeEl !== 'input' && activeEl !== 'textarea' && !document.activeElement.isContentEditable) {
      if (activeTab === 'thong-ke') {
        e.preventDefault();
        deleteSelectedStats();
      }
    }
    return;
  }

  // 4. Tổ hợp phím có Ctrl
  if (isCtrl) {

    // Ctrl + S: Lưu / Gửi / Cập nhật
    if (lowerKey === 's') {
      e.preventDefault();
      
      const activeModal = getTopActiveModal();
      if (activeModal) {
        if (activeModal.id === 'modal-edit-order') {
          submitEditOrder();
        } else if (activeModal.id === 'modal-email-dialog') {
          submitSendEmail();
        } else if (activeModal.id === 'modal-order-export') {
          proceedToExportPreview();
        } else if (activeModal.id === 'modal-export-preview') {
          generateCombinedPrintInvoice();
        }
        return;
      }

      if (activeTab === 'sales') {
        if (document.getElementById('sales-form-bang-keo-in').style.display !== 'none') saveBangKeoIn(null, 'order');
        else if (document.getElementById('sales-form-bang-keo').style.display !== 'none') saveBangKeo(null, 'order');
        else if (document.getElementById('sales-form-truc-in').style.display !== 'none') saveTrucIn(null, 'order');
      } else if (activeTab === 'quotes-creation') {
        if (document.getElementById('quotes-form-bang-keo-in').style.display !== 'none') saveBangKeoIn(null, 'quote');
        else if (document.getElementById('quotes-form-bang-keo').style.display !== 'none') saveBangKeo(null, 'quote');
        else if (document.getElementById('quotes-form-truc-in').style.display !== 'none') saveTrucIn(null, 'quote');
      }
      return;
    }

    // Ctrl + T: Tính toán số liệu form
    if (lowerKey === 't') {
      e.preventDefault();
      if (activeTab === 'sales') {
        if (document.getElementById('sales-form-bang-keo-in').style.display !== 'none') calculateBangKeoIn('order');
        else if (document.getElementById('sales-form-bang-keo').style.display !== 'none') calculateBangKeo('order');
        else if (document.getElementById('sales-form-truc-in').style.display !== 'none') calculateTrucIn('order');
      } else if (activeTab === 'quotes-creation') {
        if (document.getElementById('quotes-form-bang-keo-in').style.display !== 'none') calculateBangKeoIn('quote');
        else if (document.getElementById('quotes-form-bang-keo').style.display !== 'none') calculateBangKeo('quote');
        else if (document.getElementById('quotes-form-truc-in').style.display !== 'none') calculateTrucIn('quote');
      }
      return;
    }

    // Ctrl + E: Xuất Excel
    if (lowerKey === 'e') {
      e.preventDefault();
      exportCurrentFormToExcel();
      return;
    }

    // Ctrl + F: Focus ô tìm kiếm nhanh
    if (lowerKey === 'f') {
      e.preventDefault();
      if (activeTab === 'thong-ke') {
        const input = document.getElementById('stats-search');
        if (input) {
          input.focus();
          input.select();
        }
      } else if (activeTab === 'quotes-list') {
        const input = document.getElementById('quote-list-search');
        if (input) {
          input.focus();
          input.select();
        }
      }
      return;
    }

    // Ctrl + M: Mở hộp thoại gửi Email cho dòng được chọn
    if (lowerKey === 'm') {
      e.preventDefault();
      if (activeTab === 'thong-ke') {
        sendSelectedStatsEmail();
      }
      return;
    }

    // Ctrl + D: Quản lý đính kèm cho dòng được chọn
    if (lowerKey === 'd') {
      e.preventDefault();
      if (activeTab === 'thong-ke') {
        openAttachmentsManager();
      }
      return;
    }

    // Ctrl + Q: Đóng modal hoặc Thoát chương trình
    if (lowerKey === 'q') {
      e.preventDefault();
      const activeModal = getTopActiveModal();
      if (activeModal) {
        if (activeModal.id === 'modal-email-dialog') {
          closeEmailDialogModal();
        } else {
          closeModal(activeModal.id);
        }
      } else {
        if (await utils.confirmAction(
          'Bạn có muốn đóng phần mềm không?',
          { title: 'Đóng phần mềm', confirmText: 'Đóng' }
        )) {
          window.close();
        }
      }
      return;
    }
  }
});
