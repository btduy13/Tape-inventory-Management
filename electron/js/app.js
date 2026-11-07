// JS/APP.JS - TẬP TRUNG ĐIỀU HƯỚNG VÀ ORCHESTRATOR TOÀN BỘ FRONTEND
let activeTab = 'dashboard';
let editOrderIdGlobal = null;
let editOrderTypeGlobal = null;
let editOrderDataGlobal = null;
let editOrderRequestId = 0;
let editOrderSubmitting = false;
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
  const tomorrowStr = utils.tomorrowDateInputValue();

  const ids = [
    'bki-ngay-du-kien', 'bk-ngay-du-kien', 'ti-ngay-du-kien', 'ty-ngay-du-kien'
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
    'sales-form-truc-in': 'btn-sales-ti',
    'sales-form-thank-you': 'btn-sales-ty'
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
  } else if (type === 'thank-you') {
    if (typeof clearFormThankYou === 'function') clearFormThankYou();
  }
  if (mode === 'quote' && typeof clearQuoteItems === 'function') {
    const quoteType = type === 'bang-keo-in' ? 'bang_keo_in' : (type === 'truc-in' ? 'truc_in' : 'bang_keo');
    clearQuoteItems(quoteType);
  }
  if (mode === 'quote') {
    // Xóa form = bắt đầu báo giá mới: thoát chế độ sửa để lần lưu sau không ghi đè báo giá cũ.
    const quoteType = type === 'bang-keo-in' ? 'bang_keo_in' : (type === 'truc-in' ? 'truc_in' : 'bang_keo');
    if (typeof editingQuoteState !== 'undefined' && editingQuoteState && editingQuoteState.type === quoteType) {
      editingQuoteState = null;
    }
    if (typeof setQuoteEditingUi === 'function') setQuoteEditingUi(quoteType);
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
    const activeFilter = document.querySelector('.chart-filters button.active[id^="filter-"]');
    updateDashboardCharts(activeFilter?.id ? activeFilter.id.replace('filter-', '') : 'daily');
    loadProductDistributionChart();
  }
}

// Mở Modal đóng
function closeModal(modalId) {
  if (modalId === 'modal-confirm-action') {
    utils.resolveConfirmAction(false);
    return;
  }
  if (modalId === 'modal-quote-pdf-preview' && typeof closeQuotePdfPreview === 'function') {
    closeQuotePdfPreview();
    return;
  }
  document.getElementById(modalId)?.classList.remove('active');
}

// Ngăn xếp modal theo THỨ TỰ MỞ (không theo thứ tự DOM) để Escape/Ctrl+Q đóng đúng modal trên cùng.
// Theo dõi bằng MutationObserver trên class `active`, nên cả modal do các module khác mở cũng được ghi nhận.
const openModalStack = [];
const modalFocusOrigins = new Map();
const MODAL_FOCUSABLE_SELECTOR = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function isModalVisible(modal) {
  return !!modal && modal.classList.contains('active');
}

function focusIntoModal(modal) {
  // Modal tự đặt focus (bảng lệnh, hộp xác nhận) thì giữ nguyên.
  if (!isModalVisible(modal) || modal.contains(document.activeElement)) return;
  const candidates = [...modal.querySelectorAll(MODAL_FOCUSABLE_SELECTOR)].filter(el => el.offsetParent !== null || el === document.activeElement);
  const preferred = candidates.find(el => el.hasAttribute('autofocus'))
    || candidates.find(el => !el.classList.contains('modal-close') && !el.readOnly)
    || candidates.find(el => !el.classList.contains('modal-close'))
    || candidates[0];
  if (preferred && typeof preferred.focus === 'function') preferred.focus();
}

function syncModalStack(modal) {
  const index = openModalStack.indexOf(modal);
  const isOpen = isModalVisible(modal);
  if (isOpen && index === -1) {
    openModalStack.push(modal);
    if (modal.id !== 'modal-confirm-action') {
      // utils.confirmAction tự quản lý focus của hộp xác nhận.
      modalFocusOrigins.set(modal, document.activeElement);
      setTimeout(() => focusIntoModal(modal), 0);
    }
  } else if (!isOpen && index !== -1) {
    openModalStack.splice(index, 1);
    const origin = modalFocusOrigins.get(modal);
    modalFocusOrigins.delete(modal);
    const focusLost = !document.activeElement || document.activeElement === document.body || modal.contains(document.activeElement);
    if (origin && focusLost && origin.isConnected && typeof origin.focus === 'function') {
      const owner = origin.closest?.('.modal-overlay');
      if (!owner || isModalVisible(owner)) origin.focus();
    }
  }
}

function initializeModalTracking() {
  if (typeof MutationObserver !== 'function') return;
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(modal => { if (isModalVisible(modal)) syncModalStack(modal); });
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.target?.classList?.contains('modal-overlay')) syncModalStack(mutation.target);
    });
  });
  modals.forEach(modal => observer.observe(modal, { attributes: true, attributeFilter: ['class'] }));
}

function getTopActiveModal() {
  for (let i = openModalStack.length - 1; i >= 0; i -= 1) {
    if (isModalVisible(openModalStack[i])) return openModalStack[i];
  }
  // Dự phòng khi chưa khởi tạo theo dõi: lấy theo thứ tự DOM.
  const activeModals = document.querySelectorAll?.('.modal-overlay.active') || [];
  return activeModals.length > 0 ? activeModals[activeModals.length - 1] : null;
}

// Đóng modal trên cùng bằng đúng hàm đóng riêng của nó (dọn trạng thái kèm theo).
function closeTopModal(activeModal) {
  if (!activeModal) return;
  if (activeModal.id === 'modal-confirm-action') {
    utils.resolveConfirmAction(false);
  } else if (activeModal.id === 'modal-email-dialog' && typeof closeEmailDialogModal === 'function') {
    closeEmailDialogModal();
  } else if (activeModal.id === 'modal-quote-pdf-preview' && typeof closeQuotePdfPreview === 'function') {
    closeQuotePdfPreview();
  } else {
    closeModal(activeModal.id);
  }
}

function isEditableTarget(element) {
  if (!element) return false;
  const tag = String(element.tagName || '').toLowerCase();
  return ['input', 'textarea', 'select', 'button'].includes(tag) || !!element.isContentEditable;
}

// --- LOGIC DIALOG CHỈNH SỬA ĐƠN HÀNG ĐỘNG (EDIT DIALOG CONTROL) ---
// VAT (%) hiển thị trong form sửa: ưu tiên % đã lưu, nếu không thì suy ra từ số tiền (pg trả numeric dạng chuỗi).
function editVatPercentValue(percent, vat, base) {
  if (Number(percent) > 0) return Number(percent);
  const baseAmount = Number(base);
  if (!(baseAmount > 0)) return 0;
  return Math.round(Number(vat || 0) / baseAmount * 10000) / 100;
}

async function openEditOrderDialog(orderId, orderType) {
  orderType = utils.normalizeOrderType(orderType);
  // Mỗi lần mở có một mã yêu cầu riêng: phản hồi cũ về sau không được ghi đè form mới hơn.
  const requestId = ++editOrderRequestId;

  const res = await window.electronAPI.dbQuery('order.getById', { orderType, id: orderId });
  if (requestId !== editOrderRequestId) return;
  if (!res?.ok || !res.rows?.length) {
    utils.showToast("Không tìm thấy dữ liệu đơn hàng", "danger");
    return;
  }

  const order = res.rows[0];
  // Chỉ gán id/loại khi chắc chắn form này sẽ được hiển thị, để Lưu luôn khớp form đang mở.
  editOrderIdGlobal = orderId;
  editOrderTypeGlobal = orderType;
  editOrderDataGlobal = order;
  const modalBody = document.getElementById('edit-modal-body');
  
  // Nạp form động dựa theo loại đơn hàng
  if (orderType === 'bang_keo_in') {
    modalBody.innerHTML = generateBangKeoInEditForm(order);
  } else if (orderType === 'truc_in') {
    modalBody.innerHTML = generateTrucInEditForm(order);
  } else if (orderType === 'thank_you') {
    modalBody.innerHTML = generateThankYouEditForm(order);
  } else {
    modalBody.innerHTML = generateBangKeoEditForm(order);
  }
  // Ô chọn khách: giữ customer_id đang lưu; chỉ gửi lên khi người dùng chọn/tạo khách khác
  if (typeof attachCustomerPicker === 'function') {
    attachCustomerPicker('edit-');
    setPickedCustomer('edit-', order.customer_id || '');
  }

  // Khởi chạy định dạng tiền tệ cho form edit
  utils.setupCurrencyInputs();
  if (orderType === 'bang_keo_in') toggleEditAxisFields();
  const editForm = document.getElementById('edit-order-form');
  editForm.dataset.orderId = String(orderId);
  editForm.dataset.orderType = orderType;
  configureStructuredOrderEdit(editForm);
  editForm.addEventListener('input', updateEditOrderCalculations);
  editForm.addEventListener('change', updateEditOrderCalculations);
  document.getElementById('edit-loai-truc')?.addEventListener('change', toggleEditAxisFields);
  editForm.addEventListener('submit', event => {
    event.preventDefault();
    submitEditOrder();
  });
  updateEditOrderCalculations();
  
  // Bật modal
  document.getElementById('modal-edit-order').classList.add('active');
}

function buildEditInput(label, id, value, options = {}) {
  const type = options.type || 'text';
  const classes = `form-control${options.currency ? ' currency-format' : ''}`;
  const required = options.required ? ' required' : '';
  const min = options.min !== undefined ? ` min="${options.min}"` : '';
  const max = options.max !== undefined ? ` max="${options.max}"` : '';
  const readonly = options.readonly ? ' readonly' : '';
  const step = type === 'number' ? ' step="any"' : '';
  const maxlength = options.maxlength ? ` maxlength="${options.maxlength}"` : '';
  return `
    <div class="form-group">
      <label class="form-label" for="${id}">${label}${options.required ? ' *' : ''}</label>
      <input type="${type}" id="${id}" class="${classes}" value="${utils.escapeHtml(value)}"${step}${min}${max}${maxlength}${required}${readonly}>
    </div>
  `;
}

// SĐT và địa chỉ giao: không bắt buộc, dùng chung cho form sửa của cả 3 loại đơn
function buildEditCustomerContactInputs(o) {
  return `
      ${buildEditInput('SĐT khách', 'edit-sdt-khach-hang', o.sdt_khach_hang, { type: 'tel', maxlength: 30 })}
      ${buildEditInput('Địa chỉ giao', 'edit-dia-chi-khach-hang', o.dia_chi_khach_hang, { maxlength: 500 })}`;
}

function generateBangKeoInEditForm(o) {
  return `
    <form id="edit-order-form" class="form-grid edit-order-grid">
      <h4 class="edit-section-title">Thông tin đơn hàng</h4>
      ${buildEditInput('Mã đơn hàng', 'edit-order-id', o.id, { readonly: true })}
      ${buildEditInput('Tên hàng', 'edit-ten-hang', o.ten_hang, { required: true })}
      ${buildEditInput('Khách hàng', 'edit-ten-khach-hang', o.ten_khach_hang, { required: true })}
      ${buildEditCustomerContactInputs(o)}
      ${buildEditInput('Ngày giao dự kiến', 'edit-ngay-du-kien', utils.toDateInputValue(o.ngay_du_kien), { type: 'date', required: true })}
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
      ${buildEditInput('VAT tổng (%)', 'edit-vat', editVatPercentValue(o.vat_percent, o.vat, o.thanh_tien_ban), { type: 'number', min: 0, max: 100, step: 'any' })}
      ${buildEditInput('CTV', 'edit-ctv', o.ctv)}
      ${buildEditInput('Hoa hồng (%)', 'edit-hoa-hong-percent', o.hoa_hong, { type: 'number', min: 0, max: 100 })}
      ${buildEditInput('Tiền ship', 'edit-tien-ship', utils.formatCurrency(o.tien_ship), { currency: true })}

      <h4 class="edit-section-title">Trục in</h4>
      <div class="form-group">
        <label class="form-label" for="edit-loai-truc">Loại trục</label>
        <select id="edit-loai-truc" class="form-control">
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
        ${buildEditInput('VAT trục (%)', 'edit-truc-vat', editVatPercentValue(o.truc_vat_percent, o.truc_vat, o.truc_thanh_tien_ban), { type: 'number', min: 0, max: 100, step: 'any' })}
        ${buildEditInput('CTV trục', 'edit-truc-ctv', o.truc_ctv)}
        ${buildEditInput('Hoa hồng trục (%)', 'edit-truc-hoa-hong-percent', o.truc_hoa_hong, { type: 'number', min: 0, max: 100 })}
        ${buildEditInput('Tiền hoa hồng trục (đ)', 'edit-truc-tien-hoa-hong', 0, { readonly: true })}
        ${buildEditInput('Tiền VAT trục (đ)', 'edit-truc-tien-vat', 0, { readonly: true })}
        ${buildEditInput('Lợi nhuận ròng trục (đ)', 'edit-truc-loi-nhuan-rong', 0, { readonly: true })}
      </div>
      ${generateEditCalculationFields()}
    </form>
  `;
}

function toggleEditAxisFields() {
  const isNewAxis = document.getElementById('edit-loai-truc')?.value === 'moi';
  const fields = document.getElementById('edit-axis-fields');
  if (!fields) return;
  fields.classList.toggle('active', isNewAxis);
  fields.querySelectorAll('input').forEach(input => { input.disabled = !isNewAxis; });
  ['edit-truc-ten', 'edit-truc-so-luong', 'edit-truc-gia-goc', 'edit-truc-gia-ban'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.required = isNewAxis;
  });
  updateEditOrderCalculations();
}

// HTML Generator cho form sửa Trục In / Băng keo thường (bang_keo_orders không có cột mau_keo)
function generateTrucInEditForm(o, orderType = 'truc_in') {
  return `
    <form id="edit-order-form" class="form-grid edit-order-grid">
      <h4 class="edit-section-title">Thông tin đơn hàng</h4>
      ${buildEditInput('Mã đơn hàng', 'edit-order-id', o.id, { readonly: true })}
      ${buildEditInput('Tên hàng', 'edit-ten-hang', o.ten_hang, { required: true })}
      ${buildEditInput('Khách hàng', 'edit-ten-khach-hang', o.ten_khach_hang, { required: true })}
      ${buildEditCustomerContactInputs(o)}
      ${buildEditInput('Ngày giao dự kiến', 'edit-ngay-du-kien', utils.toDateInputValue(o.ngay_du_kien), { type: 'date', required: true })}
      ${buildEditInput('Quy cách', 'edit-quy-cach', o.quy_cach)}
      ${buildEditInput('Màu sắc', 'edit-mau-sac', o.mau_sac)}
      ${orderType === 'truc_in' ? buildEditInput('Màu keo', 'edit-mau-keo', o.mau_keo) : ''}
      <h4 class="edit-section-title">Giá và chi phí</h4>
      ${buildEditInput('Số lượng', 'edit-so-luong', o.so_luong, { type: 'number', min: 0, required: true })}
      ${buildEditInput('Đơn giá gốc', 'edit-don-gia-goc', utils.formatCurrency(o.don_gia_goc), { currency: true, required: true })}
      ${buildEditInput('Đơn giá bán', 'edit-don-gia-ban', utils.formatCurrency(o.don_gia_ban), { currency: true, required: true })}
      ${buildEditInput('VAT tổng (%)', 'edit-vat', editVatPercentValue(o.vat_percent, o.vat, o.thanh_tien_ban), { type: 'number', min: 0, max: 100, step: 'any' })}
      ${buildEditInput('Hoa hồng (%)', 'edit-hoa-hong-percent', o.hoa_hong, { type: 'number', min: 0, max: 100 })}
      ${buildEditInput('Tiền ship', 'edit-tien-ship', utils.formatCurrency(o.tien_ship), { currency: true })}
      ${buildEditInput('CTV', 'edit-ctv', o.ctv)}
      ${generateEditCalculationFields()}
    </form>
  `;
}

// HTML Generator cho form sửa Băng Keo thường
function generateBangKeoEditForm(o) {
  return generateTrucInEditForm(o, 'bang_keo');
}

// HTML Generator cho form sửa Băng keo Thank you
function generateThankYouEditForm(o) {
  return `
    <form id="edit-order-form" class="form-grid edit-order-grid">
      <h4 class="edit-section-title">Thông tin đơn hàng</h4>
      ${buildEditInput('Mã đơn hàng', 'edit-order-id', o.id, { readonly: true })}
      ${buildEditInput('Tên hàng', 'edit-ten-hang', o.ten_hang, { required: true })}
      ${buildEditInput('Khách hàng', 'edit-ten-khach-hang', o.ten_khach_hang, { required: true })}
      ${buildEditCustomerContactInputs(o)}
      ${buildEditInput('Ngày giao dự kiến', 'edit-ngay-du-kien', utils.toDateInputValue(o.ngay_du_kien), { type: 'date', required: true })}
      ${buildEditInput('Kích thước', 'edit-kich-thuoc', o.kich_thuoc, { maxlength: 255 })}
      ${buildEditInput('Màu sắc', 'edit-mau-sac', o.mau_sac)}
      ${buildEditInput('Ghi chú', 'edit-ghi-chu', o.ghi_chu, { maxlength: 2000 })}
      <h4 class="edit-section-title">Giá và chi phí</h4>
      ${buildEditInput('Số lượng', 'edit-so-luong', o.so_luong, { type: 'number', min: 0, required: true })}
      ${buildEditInput('Đơn giá vốn', 'edit-don-gia-von', utils.formatCurrency(o.don_gia_von), { currency: true })}
      ${buildEditInput('Đơn giá bán', 'edit-don-gia-ban', utils.formatCurrency(o.don_gia_ban), { currency: true, required: true })}
      ${buildEditInput('Tiền cọc', 'edit-tien-coc', utils.formatCurrency(o.tien_coc), { currency: true })}
      ${buildEditInput('VAT tổng (%)', 'edit-vat', editVatPercentValue(o.vat_percent, o.vat, o.thanh_tien_ban), { type: 'number', min: 0, max: 100, step: 'any' })}
      ${buildEditInput('Hoa hồng (%)', 'edit-hoa-hong-percent', o.hoa_hong, { type: 'number', min: 0, max: 100 })}
      ${buildEditInput('Tiền ship', 'edit-tien-ship', utils.formatCurrency(o.tien_ship), { currency: true })}
      ${buildEditInput('CTV', 'edit-ctv', o.ctv)}
      ${generateEditCalculationFields()}
    </form>
  `;
}

function generateEditCalculationFields() {
  return `<h4 class="edit-section-title">Kết quả tính toán</h4>
    ${buildEditInput('Tiền hoa hồng (đ)', 'edit-tien-hoa-hong', 0, { readonly: true })}
    ${buildEditInput('Tiền VAT (đ)', 'edit-tien-vat', 0, { readonly: true })}
    ${buildEditInput('Thành tiền bán (đ)', 'edit-thanh-tien-ban', 0, { readonly: true })}
    ${buildEditInput('Lợi nhuận ròng (đ)', 'edit-loi-nhuan-rong', 0, { readonly: true })}
    ${buildEditInput(editOrderTypeGlobal === 'bang_keo_in' ? 'Tổng thanh toán gồm VAT và trục (đ)' : 'Tổng thanh toán gồm VAT (đ)', 'edit-tong-thanh-toan', 0, { readonly: true })}
    ${buildEditInput('Công nợ khách (đ)', 'edit-cong-no-khach', 0, { readonly: true })}`;
}

function hasStructuredEditItems() {
  let items = editOrderDataGlobal?.quote_items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (_) { return false; }
  }
  return Array.isArray(items) && items.some(item => item && typeof item === 'object' && !Array.isArray(item));
}

function configureStructuredOrderEdit(form) {
  if (!hasStructuredEditItems()) return;
  const editable = new Set(['edit-ten-hang', 'edit-ten-khach-hang', 'edit-sdt-khach-hang', 'edit-dia-chi-khach-hang', 'edit-ngay-du-kien']);
  form.querySelectorAll('input, select').forEach(input => {
    if (!editable.has(input.id)) { input.disabled = true; input.required = false; }
  });
  const note = document.createElement('p');
  note.className = 'edit-section-title';
  note.setAttribute('role', 'note');
  note.textContent = 'Đơn này được chuyển từ báo giá và có chi tiết kích thước/trục riêng. Tại đây chỉ sửa tên hàng, khách hàng, SĐT, địa chỉ giao và ngày giao; các giá trị tài chính được giữ nguyên. Hiện cần chỉnh kích thước, giá và trục trong báo giá trước khi chuyển thành đơn hàng.';
  form.prepend(note);
}

// Preview and save share the same calculation so commission/VAT cannot diverge.
function calculateEditOrder() {
  if (hasStructuredEditItems()) {
    const order = editOrderDataGlobal;
    const n = key => orderMath.number(order[key]);
    const product = {
      saleTotal: n('thanh_tien_ban'), commission: n('tien_hoa_hong'), netProfit: n('loi_nhuan_rong')
    };
    const common = { vat: n('vat'), outstanding: order.da_tat_toan ? 0 : n('cong_no_khach') };
    if (editOrderTypeGlobal !== 'bang_keo_in') return { ...product, ...common };
    const axis = order.loai_truc === 'moi'
      ? { saleTotal: n('truc_thanh_tien_ban'), vat: n('truc_vat'), commission: n('truc_tien_hoa_hong'), netProfit: n('truc_loi_nhuan_rong') }
      : { saleTotal: 0, vat: 0, commission: 0, netProfit: 0 };
    return { product, axis, ...common };
  }
  const value = id => document.getElementById(id)?.value || '';
  const money = id => utils.parseCurrency(value(id));
  const common = {
    quantity: value('edit-so-luong'),
    salePrice: money('edit-don-gia-ban'),
    commissionPercent: value('edit-hoa-hong-percent'),
    shipping: money('edit-tien-ship'),
    vatPercent: value('edit-vat'),
    settled: !!editOrderDataGlobal?.da_tat_toan
  };
  if (editOrderTypeGlobal === 'thank_you') {
    return orderMath.calculateStandardOrder({ ...common, costPrice: money('edit-don-gia-von'), deposit: money('edit-tien-coc') });
  }
  if (editOrderTypeGlobal !== 'bang_keo_in') {
    return orderMath.calculateStandardOrder({ ...common, costPrice: money('edit-don-gia-goc') });
  }
  return orderMath.calculatePrintedTape({
    ...common,
    baseCost: money('edit-don-gia-von'),
    quantityFee: money('edit-phi-sl'),
    glueFee: money('edit-phi-keo'),
    colorFee: money('edit-phi-mau'),
    sizeFee: money('edit-phi-size'),
    cuttingFee: money('edit-phi-cat'),
    deposit: money('edit-tien-coc'),
    rollLength: value('edit-qc-m'),
    rollsPerTree: value('edit-cuon-cay'),
    isNewAxis: value('edit-loai-truc') === 'moi',
    axisQuantity: value('edit-truc-so-luong'),
    axisCostPrice: money('edit-truc-gia-goc'),
    axisSalePrice: money('edit-truc-gia-ban'),
    axisVatPercent: value('edit-truc-vat'),
    axisCommissionPercent: value('edit-truc-hoa-hong-percent')
  });
}

function updateEditOrderCalculations() {
  if (!document.getElementById('edit-order-form')) return;
  const result = calculateEditOrder();
  const product = result.product || result;
  const axis = result.axis;
  const outputs = {
    'edit-tien-hoa-hong': product.commission,
    'edit-tien-vat': result.vat,
    'edit-thanh-tien-ban': product.saleTotal,
    'edit-loi-nhuan-rong': product.netProfit,
    'edit-tong-thanh-toan': product.saleTotal + result.vat + (axis ? axis.saleTotal + axis.vat : 0),
    'edit-cong-no-khach': result.outstanding,
    'edit-truc-tien-hoa-hong': axis?.commission || 0,
    'edit-truc-tien-vat': axis?.vat || 0,
    'edit-truc-loi-nhuan-rong': axis?.netProfit || 0
  };
  Object.entries(outputs).forEach(([id, amount]) => {
    const input = document.getElementById(id);
    if (input) input.value = utils.formatCurrency(amount);
  });
}

// Gửi lệnh Lưu chỉnh sửa đơn hàng
async function submitEditOrder() {
  // Chặn bấm Lưu / Ctrl+S nhiều lần khi lệnh cập nhật trước chưa xong.
  if (editOrderSubmitting) return;
  const form = document.getElementById('edit-order-form');
  if (!form) return;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  // Luôn lưu theo id/loại của form đang hiển thị.
  const editOrderId = form.dataset?.orderId || editOrderIdGlobal;
  const editOrderType = utils.normalizeOrderType(form.dataset?.orderType || editOrderTypeGlobal);
  const submitButton = document.querySelector?.('#modal-edit-order .modal-footer .btn-primary');
  editOrderSubmitting = true;
  if (submitButton) submitButton.disabled = true;
  try {

    const tenHang = document.getElementById('edit-ten-hang').value.trim();
    const tenKhachHang = document.getElementById('edit-ten-khach-hang').value.trim();
    const ngayDuKien = document.getElementById('edit-ngay-du-kien').value;
    const contact = {
      sdt_khach_hang: document.getElementById('edit-sdt-khach-hang')?.value.trim() || null,
      dia_chi_khach_hang: document.getElementById('edit-dia-chi-khach-hang')?.value.trim() || null
    };
    // Không ghi lại customer_id cũ của dòng: chỉ gửi khi người dùng đã chọn/tạo khách khác
    const pickedCustomer = document.getElementById('edit-ten-khach-hang')?.dataset?.customerId || '';
    if (pickedCustomer && pickedCustomer !== String(editOrderDataGlobal?.customer_id || '')) contact.customer_id = pickedCustomer;
    if (hasStructuredEditItems()) {
      if (!tenHang || !tenKhachHang || !ngayDuKien) {
        utils.showToast('Vui lòng nhập đủ tên hàng, khách hàng và ngày giao', 'warning');
        return;
      }
      const response = await window.electronAPI.dbRun('order.update', {
        orderType: editOrderType,
        id: editOrderId,
        values: { ten_hang: tenHang, ten_khach_hang: tenKhachHang, ngay_du_kien: ngayDuKien, ...contact }
      });
      if (!response.ok) {
        utils.showToast('Lỗi cập nhật đơn hàng: ' + response.error, 'danger');
        return;
      }
      utils.showToast(`Đã lưu thông tin đơn ${editOrderId}; giữ nguyên chi tiết và số tiền`, 'success');
      closeModal('modal-edit-order');
      editOrderDataGlobal = null;
      await switchTab(activeTab);
      if (typeof loadDashboardData === 'function' && activeTab !== 'dashboard') loadDashboardData();
      return;
    }
    const soLuong = parseFloat(document.getElementById('edit-so-luong').value) || 0;
    const donGiaBan = utils.parseCurrency(document.getElementById('edit-don-gia-ban').value);
    const ctv = document.getElementById('edit-ctv').value.trim() || null;
    const hoaHong = orderMath.percent(document.getElementById('edit-hoa-hong-percent').value);
    const tienShip = utils.parseCurrency(document.getElementById('edit-tien-ship').value);
    const vatPercent = orderMath.percent(document.getElementById('edit-vat')?.value);

    if (!tenHang || !tenKhachHang || !ngayDuKien || soLuong <= 0 || donGiaBan <= 0) {
      utils.showToast('Vui lòng nhập đủ tên hàng, khách hàng, ngày giao, số lượng và giá bán', 'warning');
      return;
    }

    let values;

    if (editOrderType === 'bang_keo_in') {
      const donGiaVon = utils.parseCurrency(document.getElementById('edit-don-gia-von').value);
      const quyCachM = parseFloat(document.getElementById('edit-qc-m').value) || 0;
      const cuonCay = parseFloat(document.getElementById('edit-cuon-cay').value) || 0;
      const tienCoc = utils.parseCurrency(document.getElementById('edit-tien-coc').value);
      const isNewAxis = document.getElementById('edit-loai-truc').value === 'moi';
      const axisQuantity = parseFloat(document.getElementById('edit-truc-so-luong').value) || 0;
      const axisCostPrice = utils.parseCurrency(document.getElementById('edit-truc-gia-goc').value);
      const axisSalePrice = utils.parseCurrency(document.getElementById('edit-truc-gia-ban').value);
      const axisVatPercent = isNewAxis ? orderMath.percent(document.getElementById('edit-truc-vat').value) : 0;

      if (isNewAxis && (!document.getElementById('edit-truc-ten').value.trim() || axisQuantity <= 0 || axisCostPrice <= 0 || axisSalePrice <= 0)) {
        utils.showToast('Trục mới cần đủ tên trục, số lượng, giá gốc và giá bán', 'warning');
        return;
      }

      const result = calculateEditOrder();
      // Giống form tạo đơn: không lưu khi Quy cách (m) / Số cuộn/cây không hợp lệ (giá gốc sẽ sai).
      if (result && result.valid === false) {
        const detail = Array.isArray(result.errors) && result.errors.length ? result.errors.join('; ') : 'Quy cách (m) và Số cuộn/cây phải lớn hơn 0 để tính giá gốc';
        utils.showToast(detail, 'warning');
        return;
      }

      values = {
        ten_hang: tenHang, ten_khach_hang: tenKhachHang, ngay_du_kien: ngayDuKien, ...contact,
        quy_cach_mm: parseFloat(document.getElementById('edit-qc-mm').value) || null, quy_cach_m: quyCachM || null,
        quy_cach_mic: parseFloat(document.getElementById('edit-qc-mic').value) || null, cuon_cay: cuonCay || null, so_luong: soLuong,
        phi_sl: utils.parseCurrency(document.getElementById('edit-phi-sl').value), mau_keo: document.getElementById('edit-mau-keo').value.trim() || null,
        phi_keo: utils.parseCurrency(document.getElementById('edit-phi-keo').value), mau_sac: document.getElementById('edit-mau-sac').value.trim() || null,
        phi_mau: utils.parseCurrency(document.getElementById('edit-phi-mau').value), phi_size: utils.parseCurrency(document.getElementById('edit-phi-size').value),
        phi_cat: utils.parseCurrency(document.getElementById('edit-phi-cat').value), don_gia_von: donGiaVon,
        don_gia_goc: result.product.costPrice, thanh_tien_goc: result.product.costTotal, don_gia_ban: donGiaBan, thanh_tien_ban: result.product.saleTotal,
        tien_coc: tienCoc, cong_no_khach: result.outstanding, ctv, hoa_hong: hoaHong, tien_hoa_hong: result.product.commission,
        loi_giay: document.getElementById('edit-loi-giay').value.trim() || null, thung_bao: document.getElementById('edit-thung-bao').value.trim() || null,
        loi_nhuan: result.product.profit, tien_ship: tienShip, loi_nhuan_rong: result.product.netProfit, loai_truc: isNewAxis ? 'moi' : 'cu',
        ten_truc: isNewAxis ? document.getElementById('edit-truc-ten').value.trim() : null,
        truc_chu_vi: isNewAxis ? (parseFloat(document.getElementById('edit-truc-chu-vi').value) || null) : null,
        truc_so_luong: isNewAxis ? axisQuantity : 0, truc_gia_goc: isNewAxis ? axisCostPrice : 0, truc_gia_ban: isNewAxis ? axisSalePrice : 0,
        truc_thanh_tien_goc: result.axis.costTotal, truc_thanh_tien_ban: result.axis.saleTotal,
        truc_ctv: isNewAxis ? (document.getElementById('edit-truc-ctv').value.trim() || null) : null,
        truc_hoa_hong: isNewAxis ? result.axis.commissionPercent : 0, truc_tien_hoa_hong: result.axis.commission,
        truc_loi_nhuan: result.axis.profit, truc_loi_nhuan_rong: result.axis.netProfit,
        truc_vat: result.axis.vat, truc_vat_percent: axisVatPercent, vat: result.vat, vat_percent: vatPercent
      };
    } else if (editOrderType === 'thank_you') {
      const value = id => document.getElementById(id).value.trim() || null;
      values = {
        ten_hang: tenHang, ten_khach_hang: tenKhachHang, ngay_du_kien: ngayDuKien, ...contact,
        kich_thuoc: value('edit-kich-thuoc'), mau_sac: value('edit-mau-sac'), ghi_chu: value('edit-ghi-chu'),
        so_luong: soLuong, don_gia_von: utils.parseCurrency(document.getElementById('edit-don-gia-von').value),
        don_gia_ban: donGiaBan, ctv, hoa_hong: hoaHong,
        ...thankYouMoneyColumns(calculateEditOrder(), utils.parseCurrency(document.getElementById('edit-tien-coc').value))
      };
    } else {
      const donGiaGoc = utils.parseCurrency(document.getElementById('edit-don-gia-goc').value);
      if (donGiaGoc <= 0) {
        utils.showToast('Đơn giá gốc phải lớn hơn 0', 'warning');
        return;
      }
      const result = calculateEditOrder();
      const common = {
        ten_hang: tenHang, ten_khach_hang: tenKhachHang, ngay_du_kien: ngayDuKien, ...contact,
        quy_cach: document.getElementById('edit-quy-cach').value.trim() || null,
        so_luong: soLuong, mau_sac: document.getElementById('edit-mau-sac').value.trim() || null
      };

      if (editOrderType === 'truc_in') {
        values = { ...common, mau_keo: document.getElementById('edit-mau-keo').value.trim() || null,
          don_gia_goc: donGiaGoc, don_gia_ban: donGiaBan, ctv, hoa_hong: hoaHong, tien_ship: tienShip,
          thanh_tien_goc: result.costTotal, thanh_tien_ban: result.saleTotal, cong_no_khach: result.outstanding,
          loi_nhuan: result.profit, tien_hoa_hong: result.commission, loi_nhuan_rong: result.netProfit,
          vat: result.vat, vat_percent: vatPercent };
      } else {
        values = { ...common, don_gia_goc: donGiaGoc, don_gia_ban: donGiaBan, ctv, hoa_hong: hoaHong,
          tien_ship: tienShip, thanh_tien: result.costTotal, thanh_tien_ban: result.saleTotal,
          cong_no_khach: result.outstanding, loi_nhuan: result.profit, tien_hoa_hong: result.commission,
          loi_nhuan_rong: result.netProfit, vat: result.vat, vat_percent: vatPercent };
      }
    }

    const res = await window.electronAPI.dbRun('order.update', { orderType: editOrderType, id: editOrderId, values });
    if (res.ok) {
      utils.showToast(`Đã lưu thay đổi cho đơn ${editOrderId}`, "success");
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
  } finally {
    editOrderSubmitting = false;
    if (submitButton) submitButton.disabled = false;
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
      defaultPath: `don_hang_${prefix}_${utils.toDateInputValue(new Date())}.xlsx`,
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
    else if (document.getElementById('sales-form-thank-you')?.style.display === 'block') activeForm = 'thank-you';
  } else {
    if (document.getElementById('quotes-form-bang-keo-in').style.display !== 'none') activeForm = 'bang-keo-in';
    else if (document.getElementById('quotes-form-bang-keo').style.display !== 'none') activeForm = 'bang-keo';
    else if (document.getElementById('quotes-form-truc-in').style.display !== 'none') activeForm = 'truc-in';
  }

  const getVatExportValues = (totalId, vatId) => {
    const total = utils.parseCurrency(document.getElementById(totalId)?.value);
    const percent = orderMath.percent(document.getElementById(vatId)?.value);
    // Cùng công thức làm tròn với form/DB (orderMath.vatAmount), không để số lẻ trong Excel.
    return { percent, amount: orderMath.vatAmount(total, percent) };
  };

  if (activeForm === 'bang-keo-in') {
    const productVat = getVatExportValues(`${prefix}bki-thanh-tien-ban`, `${prefix}bki-vat`);
    const axisVat = getVatExportValues(`${prefix}bki-truc-thanh-tien-ban`, `${prefix}bki-truc-vat`);
    const data = {
      'Tên Hàng': document.getElementById(`${prefix}bki-ten-hang`).value.trim(),
      'Ngày dự kiến': document.getElementById(`${prefix}bki-ngay-du-kien`)?.value || '',
      'Tên Khách Hàng': document.getElementById(`${prefix}bki-ten-khach-hang`).value.trim(),
      'SĐT khách': document.getElementById(`${prefix}bki-sdt-khach-hang`)?.value.trim() || '',
      'Địa chỉ giao': document.getElementById(`${prefix}bki-dia-chi-khach-hang`)?.value.trim() || '',
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
      'VAT (%)': productVat.percent,
      'Tiền VAT': productVat.amount,
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
      'VAT Trục (%)': axisVat.percent,
      'Tiền VAT Trục': axisVat.amount,
      'CTV Trục': document.getElementById(`${prefix}bki-truc-ctv`)?.value.trim() || '',
      'Hoa hồng Trục (%)': parseFloat(document.getElementById(`${prefix}bki-truc-hoa-hong-percent`)?.value) || 0,
      'Tiền hoa hồng Trục': document.getElementById(`${prefix}bki-loai-truc`)?.value === 'moi'
        ? utils.parseCurrency(document.getElementById(`${prefix}bki-truc-tien-hoa-hong`)?.value) : 0,
      'Lãi Trục': utils.parseCurrency(document.getElementById(`${prefix}bki-truc-loi-nhuan`)?.value),
      'Lãi ròng Trục': utils.parseCurrency(document.getElementById(`${prefix}bki-truc-loi-nhuan-rong`)?.value),
      'Lợi nhuận': utils.parseCurrency(document.getElementById(`${prefix}bki-loi-nhuan`).value),
      'Tiền ship': utils.parseCurrency(document.getElementById(`${prefix}bki-tien-ship`).value),
      'Lợi nhuận ròng': utils.parseCurrency(document.getElementById(`${prefix}bki-loi-nhuan-rong`).value)
    };
    await writeSingleRowExcel(data, mode === 'quote' ? 'q-bki' : 'bki');
  } else if (activeForm === 'bang-keo') {
    const vat = getVatExportValues(`${prefix}bk-thanh-tien-ban`, `${prefix}bk-vat`);
    const data = {
      'Tên Hàng': document.getElementById(`${prefix}bk-ten-hang`).value.trim(),
      'Ngày dự kiến': document.getElementById(`${prefix}bk-ngay-du-kien`)?.value || '',
      'Tên Khách Hàng': document.getElementById(`${prefix}bk-ten-khach-hang`).value.trim(),
      'SĐT khách': document.getElementById(`${prefix}bk-sdt-khach-hang`)?.value.trim() || '',
      'Địa chỉ giao': document.getElementById(`${prefix}bk-dia-chi-khach-hang`)?.value.trim() || '',
      'Quy Cách': document.getElementById(`${prefix}bk-quy-cach`).value.trim(),
      'Số lượng': parseFloat(document.getElementById(`${prefix}bk-so-luong`).value) || 0,
      'Màu sắc': document.getElementById(`${prefix}bk-mau-sac`).value.trim(),
      'Đơn giá gốc': utils.parseCurrency(document.getElementById(`${prefix}bk-don-gia-goc`).value),
      'Thành tiền gốc': utils.parseCurrency(document.getElementById(`${prefix}bk-thanh-tien-goc`).value),
      'Đơn giá bán': utils.parseCurrency(document.getElementById(`${prefix}bk-don-gia-ban`).value),
      'Thành tiền bán': utils.parseCurrency(document.getElementById(`${prefix}bk-thanh-tien-ban`).value),
      'Công nợ khách': utils.parseCurrency(document.getElementById(`${prefix}bk-cong-no-khach`).value),
      'VAT (%)': vat.percent,
      'Tiền VAT': vat.amount,
      'CTV': document.getElementById(`${prefix}bk-ctv`).value.trim(),
      'Hoa hồng (%)': parseFloat(document.getElementById(`${prefix}bk-hoa-hong-percent`).value) || 0,
      'Tiền hoa hồng': utils.parseCurrency(document.getElementById(`${prefix}bk-tien-hoa-hong`).value),
      'Lợi nhuận': utils.parseCurrency(document.getElementById(`${prefix}bk-loi-nhuan`).value),
      'Tiền ship': utils.parseCurrency(document.getElementById(`${prefix}bk-tien-ship`).value),
      'Lợi nhuận ròng': utils.parseCurrency(document.getElementById(`${prefix}bk-loi-nhuan-rong`).value)
    };
    await writeSingleRowExcel(data, mode === 'quote' ? 'q-bk' : 'bk');
  } else if (activeForm === 'truc-in') {
    const vat = getVatExportValues(`${prefix}ti-thanh-tien-ban`, `${prefix}ti-vat`);
    const data = {
      'Tên Hàng': document.getElementById(`${prefix}ti-ten-hang`).value.trim(),
      'Ngày dự kiến': document.getElementById(`${prefix}ti-ngay-du-kien`)?.value || '',
      'Tên Khách Hàng': document.getElementById(`${prefix}ti-ten-khach-hang`).value.trim(),
      'SĐT khách': document.getElementById(`${prefix}ti-sdt-khach-hang`)?.value.trim() || '',
      'Địa chỉ giao': document.getElementById(`${prefix}ti-dia-chi-khach-hang`)?.value.trim() || '',
      'Quy Cách': document.getElementById(`${prefix}ti-quy-cach`).value.trim(),
      'Số lượng': parseFloat(document.getElementById(`${prefix}ti-so-luong`).value) || 0,
      'Màu sắc': document.getElementById(`${prefix}ti-mau-sac`).value.trim(),
      'Màu keo': document.getElementById(`${prefix}ti-mau-keo`).value.trim(),
      'Đơn giá gốc': utils.parseCurrency(document.getElementById(`${prefix}ti-don-gia-goc`).value),
      'Thành tiền gốc': utils.parseCurrency(document.getElementById(`${prefix}ti-thanh-tien-goc`).value),
      'Đơn giá bán': utils.parseCurrency(document.getElementById(`${prefix}ti-don-gia-ban`).value),
      'Thành tiền bán': utils.parseCurrency(document.getElementById(`${prefix}ti-thanh-tien-ban`).value),
      'Công nợ khách': utils.parseCurrency(document.getElementById(`${prefix}ti-cong-no-khach`).value),
      'VAT (%)': vat.percent,
      'Tiền VAT': vat.amount,
      'CTV': document.getElementById(`${prefix}ti-ctv`).value.trim(),
      'Hoa hồng (%)': parseFloat(document.getElementById(`${prefix}ti-hoa-hong-percent`).value) || 0,
      'Tiền hoa hồng': utils.parseCurrency(document.getElementById(`${prefix}ti-tien-hoa-hong`).value),
      'Lợi nhuận': utils.parseCurrency(document.getElementById(`${prefix}ti-loi-nhuan`).value),
      'Tiền ship': utils.parseCurrency(document.getElementById(`${prefix}ti-tien-ship`).value),
      'Lợi nhuận ròng': utils.parseCurrency(document.getElementById(`${prefix}ti-loi-nhuan-rong`).value)
    };
    await writeSingleRowExcel(data, mode === 'quote' ? 'q-ti' : 'ti');
  } else if (activeForm === 'thank-you') {
    const text = id => document.getElementById(`ty-${id}`)?.value.trim() || '';
    const money = id => utils.parseCurrency(text(id));
    const result = calculateThankYou();
    await writeSingleRowExcel({
      'Tên Hàng': text('ten-hang'), 'Ngày dự kiến': text('ngay-du-kien'), 'Tên Khách Hàng': text('ten-khach-hang'),
      'SĐT khách': text('sdt-khach-hang'), 'Địa chỉ giao': text('dia-chi-khach-hang'), 'Kích thước': text('kich-thuoc'),
      'Số lượng': parseFloat(text('so-luong')) || 0, 'Màu sắc': text('mau-sac'), 'Ghi chú': text('ghi-chu'),
      'Đơn giá vốn': money('don-gia-von'), 'Thành tiền vốn': result.costTotal, 'Đơn giá bán': money('don-gia-ban'),
      'Thành tiền bán': result.saleTotal, 'VAT (%)': result.vatPercent, 'Tiền VAT': result.vat, 'Tiền cọc': money('tien-coc'),
      'Công nợ khách': result.outstanding, 'CTV': text('ctv'), 'Hoa hồng (%)': result.commissionPercent,
      'Tiền hoa hồng': result.commission, 'Lợi nhuận': result.profit, 'Tiền ship': result.shipping, 'Lợi nhuận ròng': result.netProfit
    }, 'ty');
  }
}

// Lắng nghe phím tắt toàn cục
const commandPaletteActions = [
  { title: 'Tổng quan', description: 'Mở dashboard và biểu đồ doanh số', group: 'Trang', run: () => switchTab('dashboard') },
  { title: 'Tạo đơn Băng Keo In', description: 'Mở form bán hàng Băng Keo In Logo', group: 'Bán hàng', run: () => jumpToSalesForm('sales-form-bang-keo-in') },
  { title: 'Tạo đơn Băng Keo thường', description: 'Mở form bán hàng Băng Keo thường', group: 'Bán hàng', run: () => jumpToSalesForm('sales-form-bang-keo') },
  { title: 'Tạo đơn Trục In', description: 'Mở form gia công Trục In', group: 'Bán hàng', run: () => jumpToSalesForm('sales-form-truc-in') },
  { title: 'Tạo đơn Thank you', description: 'Mở form bán hàng Băng keo Thank you', group: 'Bán hàng', run: () => jumpToSalesForm('sales-form-thank-you') },
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
  // Web và máy khác cùng sửa một bảng: tự tải lại Tổng quan / Thống kê mỗi 30 giây và khi quay lại cửa sổ
  setInterval(autoRefreshActiveTab, 30000);
  window.addEventListener('focus', autoRefreshActiveTab);
  // Ủy quyền sự kiện cho danh sách lệnh (không dùng onclick inline để tương thích CSP)
  document.getElementById('command-palette-results')?.addEventListener('click', event => {
    const button = event.target.closest('[data-command-index]');
    if (button) executeCommandPaletteAction(Number(button.dataset.commandIndex));
  });
  renderCommandResults();
  initializeModalTracking();
  // Mục menu/breadcrumb dạng role="button" (không phải <button>): Enter/Space kích hoạt như bấm chuột.
  document.addEventListener('keydown', event => {
    const target = event.target;
    if (!target || target.getAttribute?.('role') !== 'button' || String(target.tagName || '').toLowerCase() === 'button') return;
    const key = String(event.key || '');
    const isAnchor = String(target.tagName || '').toLowerCase() === 'a' && target.hasAttribute('href');
    // <a href> đã tự phát sinh click khi nhấn Enter; chỉ cần xử lý thêm phím Space.
    if (key === ' ' || key === 'Spacebar' || (key === 'Enter' && !isAnchor)) {
      event.preventDefault();
      target.click();
    }
  });
}

let autoRefreshRunning = false;

// Bỏ qua khi đang mở hộp thoại/menu hoặc cửa sổ ẩn; Thống kê giữ nguyên các dòng đang chọn.
async function autoRefreshActiveTab() {
  if (autoRefreshRunning || document.hidden || getTopActiveModal()) return;
  if (activeTab !== 'dashboard' && activeTab !== 'thong-ke') return;
  const menuOpen = ['custom-context-menu', 'stats-column-filter-menu'].some(id => document.getElementById(id)?.style.display === 'block');
  if (menuOpen) return;
  autoRefreshRunning = true;
  try {
    if (activeTab === 'dashboard') {
      await loadDashboardData();
      return;
    }
    const selected = new Set(getSelectedStatsOrderIds());
    await loadStatsData();
    if (selected.size === 0) return;
    getVisibleStatsRows().forEach(row => row.classList.toggle('selected', selected.has(row.dataset.id)));
    updateStatsSelectionSummary();
  } catch (_) {
    // Lỗi tải đã được từng hàm báo; lần sau thử lại
  } finally {
    autoRefreshRunning = false;
  }
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

  // Chỉ đổi badge theo kết quả kiểm tra kết nối thật (có khóa `connected`);
  // lỗi xuất/nhập tệp cấu hình không có nghĩa là mất kết nối cơ sở dữ liệu.
  const isConnectionCheck = Object.prototype.hasOwnProperty.call(result, 'connected') && !result.canceled;
  if (result.exported) {
    utils.showToast('Đã xuất cấu hình. Chỉ chuyển tệp này sang máy tin cậy.', 'success');
  } else if (isConnectionCheck && result.connected) {
    setConnectionStatus(true);
    utils.showToast('Kết nối cơ sở dữ liệu hoạt động bình thường.', 'success');
    await switchTab(activeTab);
  } else if (isConnectionCheck) {
    setConnectionStatus(false, 'Mây: Mất kết nối');
    utils.showToast('Không thể kết nối: ' + (result.error || 'Không rõ lỗi'), 'danger');
  } else if (result.error && !result.dialogShown) {
    // Tiến trình chính chưa hiện hộp thoại lỗi (ví dụ xuất cấu hình thất bại) thì mới báo bằng toast.
    utils.showToast('Không thể xử lý cấu hình: ' + result.error, 'danger');
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
  // Modal đã hiển thị (display:flex) nên focus được ngay; setTimeout chỉ là dự phòng.
  input.focus();
  setTimeout(() => { if (modal.classList.contains('active')) input.focus(); }, 30);
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
    results.innerHTML = '<div class="command-empty" role="option" aria-disabled="true">Không tìm thấy thao tác phù hợp</div>';
    input.removeAttribute('aria-activedescendant');
    return;
  }

  results.innerHTML = commandPaletteFilteredActions.map((action, index) => `
    <button type="button" id="command-result-${index}" role="option" tabindex="-1" aria-selected="${index === commandPaletteSelectedIndex ? 'true' : 'false'}" class="command-result ${index === commandPaletteSelectedIndex ? 'active' : ''}" data-command-index="${index}">
      <span>
        <strong>${utils.escapeHtml(action.title)}</strong>
        <small>${utils.escapeHtml(action.description)}</small>
      </span>
      <span class="badge badge-gray">${utils.escapeHtml(action.group)}</span>
    </button>
  `).join('');

  // Đồng bộ mục đang chọn cho trình đọc màn hình và cuộn tới mục đó khi dùng phím mũi tên.
  input.setAttribute('aria-activedescendant', `command-result-${commandPaletteSelectedIndex}`);
  const activeItem = document.getElementById(`command-result-${commandPaletteSelectedIndex}`);
  if (activeItem && typeof activeItem.scrollIntoView === 'function') activeItem.scrollIntoView({ block: 'nearest' });
}

// Gõ từ khóa mới: luôn chọn lại mục đầu tiên của danh sách đã lọc.
function onCommandPaletteInput() {
  commandPaletteSelectedIndex = 0;
  renderCommandResults();
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

// Xác định form Bán hàng / Báo giá đang hiển thị để Ctrl+S gửi đúng form
function getActiveSaveFormId() {
  const isVisible = id => {
    const pane = document.getElementById(id);
    return !!pane && pane.style.display !== 'none';
  };
  if (activeTab === 'sales') {
    if (isVisible('sales-form-bang-keo-in')) return 'form-bang-keo-in';
    if (isVisible('sales-form-bang-keo')) return 'form-bang-keo';
    if (isVisible('sales-form-truc-in')) return 'form-truc-in';
    if (isVisible('sales-form-thank-you')) return 'form-thank-you';
  } else if (activeTab === 'quotes-creation') {
    if (isVisible('quotes-form-bang-keo-in')) return 'form-quote-bang-keo-in';
    if (isVisible('quotes-form-bang-keo')) return 'form-quote-bang-keo';
    if (isVisible('quotes-form-truc-in')) return 'form-quote-truc-in';
  }
  return null;
}

function openShortcutsModal() {
  const modal = document.getElementById('modal-shortcuts');
  if (modal) modal.classList.add('active');
}

window.addEventListener('keydown', async (e) => {
  const isCtrl = e.ctrlKey || e.metaKey;
  const key = String(e.key || '');
  const lowerKey = key.toLowerCase();

  // 1. Phím Escape - Đóng Modal
  if (key === 'Escape') {
    const activeModal = getTopActiveModal();
    if (activeModal) {
      e.preventDefault();
      closeTopModal(activeModal);
      return;
    }
  }

  // Khi đang mở modal: chặn các phím tắt toàn cục (trừ Ctrl+S / Ctrl+Q xử lý theo modal bên dưới).
  if (getTopActiveModal()) {
    if (key === 'F5') {
      e.preventDefault();
      return;
    }
    if (isCtrl && ['k', '/', 't', 'e', 'f', 'm', 'd'].includes(lowerKey)) {
      e.preventDefault();
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
    // Không xóa khi đang mở modal hoặc focus nằm trong ô nhập/nút/vùng soạn thảo.
    if (!getTopActiveModal() && !isEditableTarget(document.activeElement) && activeTab === 'thong-ke') {
      e.preventDefault();
      deleteSelectedStats();
    }
    return;
  }

  // 4. Tổ hợp phím có Ctrl
  if (isCtrl) {

    // Ctrl + S: Lưu / Gửi / Cập nhật
    if (lowerKey === 's') {
      e.preventDefault();
      // Giữ phím sẽ sinh nhiều sự kiện lặp: bỏ qua để không lưu trùng.
      if (e.repeat) return;

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

      // Gửi form đang mở qua requestSubmit() để chạy kiểm tra `required` gốc và đúng handler submit.
      const activeFormId = getActiveSaveFormId();
      const activeForm = activeFormId ? document.getElementById(activeFormId) : null;
      if (activeForm) {
        if (typeof activeForm.requestSubmit === 'function') activeForm.requestSubmit();
        else if (activeForm.reportValidity()) activeForm.dispatchEvent(new Event('submit', { cancelable: true }));
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
        else if (document.getElementById('sales-form-thank-you').style.display !== 'none') calculateThankYou();
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
        closeTopModal(activeModal);
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
