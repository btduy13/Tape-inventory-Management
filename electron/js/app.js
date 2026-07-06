// JS/APP.JS - TẬP TRUNG ĐIỀU HƯỚNG VÀ ORCHESTRATOR TOÀN BỘ FRONTEND
let activeTab = 'dashboard';
let editOrderIdGlobal = null;
let editOrderTypeGlobal = null;
let commandPaletteFilteredActions = [];
let commandPaletteSelectedIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Kích hoạt định dạng tiền tệ
  utils.setupCurrencyInputs();

  // 2. Điền ngày mặc định vào các form (Ngày mai)
  setDefaultDates();
  initializeUiEnhancements();

  // 3. Tải dữ liệu cho Dashboard mặc định
  await switchTab('dashboard');
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
    'thong-ke': 'Báo Cáo Thống Kê',
    'history': 'Lịch Sử Đơn Hàng'
  };
  
  const title = menuTitles[tabId] || 'Hệ Thống';
  document.getElementById('page-display-title').innerText = title;
  document.getElementById('breadcrumb-page-name').innerText = title;

  // 4. Kích hoạt tải dữ liệu đặc trưng của từng trang
  if (tabId === 'dashboard') {
    await loadDashboardData();
  } else if (tabId === 'thong-ke') {
    await loadStatsData();
  } else if (tabId === 'history') {
    await loadHistoryData();
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
}

// Nút làm mới trang tiện ích
async function refreshCurrentPage() {
  utils.showToast("Đang làm mới dữ liệu...", "warning");
  await switchTab(activeTab);
  utils.showToast("Đã cập nhật dữ liệu mới!", "success");
}

// Bật/Tắt Chế độ Sáng/Tối (Light/Dark Theme Toggle)
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  const btn = document.getElementById('theme-toggle-btn');
  
  if (btn) {
    btn.innerText = isLight ? "Sáng" : "Tối";
    btn.classList.toggle('active', !isLight);
  }

  // Vẽ lại biểu đồ theo màu chữ mới của theme
  if (activeTab === 'dashboard') {
    updateDashboardCharts(document.querySelector('.chart-filters button.active').id.replace('filter-', ''));
    loadProductDistributionChart();
  }
}

// Mở Modal đóng
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
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
  
  // Bật modal
  document.getElementById('modal-edit-order').classList.add('active');
}

// HTML Generator cho form sửa Băng Keo In
function generateBangKeoInEditForm(o) {
  return `
    <form id="edit-order-form" class="form-grid" style="grid-template-columns: repeat(2, 1fr);">
      <div class="form-group">
        <label class="form-label">Mã đơn hàng</label>
        <input type="text" class="form-control" value="${o.id}" readonly>
      </div>
      <div class="form-group">
        <label class="form-label">Tên hàng</label>
        <input type="text" id="edit-ten-hang" class="form-control" value="${o.ten_hang || ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Tên khách hàng</label>
        <input type="text" id="edit-ten-khach-hang" class="form-control" value="${o.ten_khach_hang || ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Ngày giao dự kiến</label>
        <input type="date" id="edit-ngay-du-kien" class="form-control" value="${o.ngay_du_kien ? new Date(o.ngay_du_kien).toISOString().split('T')[0] : ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Số lượng</label>
        <input type="number" step="any" id="edit-so-luong" class="form-control" value="${o.so_luong || 0}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Đơn giá bán (đ)</label>
        <input type="text" id="edit-don-gia-ban" class="form-control currency-format" value="${utils.formatCurrency(o.don_gia_ban)}">
      </div>
      <div class="form-group">
        <label class="form-label">Tiền cọc (đ)</label>
        <input type="text" id="edit-tien-coc" class="form-control currency-format" value="${utils.formatCurrency(o.tien_coc)}">
      </div>
      <div class="form-group">
        <label class="form-label">Tiền ship (đ)</label>
        <input type="text" id="edit-tien-ship" class="form-control currency-format" value="${utils.formatCurrency(o.tien_ship)}">
      </div>
      <div class="form-group">
        <label class="form-label">Đơn giá vốn (đ)</label>
        <input type="text" id="edit-don-gia-von" class="form-control currency-format" value="${utils.formatCurrency(o.don_gia_von)}">
      </div>
      <div class="form-group">
        <label class="form-label">Quy cách (m)</label>
        <input type="number" step="any" id="edit-qc-m" class="form-control" value="${o.quy_cach_m || 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Cuộn/Cây</label>
        <input type="number" step="any" id="edit-cuon-cay" class="form-control" value="${o.cuon_cay || 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Hoa hồng (%)</label>
        <input type="number" step="any" id="edit-hoa-hong-percent" class="form-control" value="${o.hoa_hong || 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Cộng tác viên (CTV)</label>
        <input type="text" id="edit-ctv" class="form-control" value="${o.ctv || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Phí cắt (đ)</label>
        <input type="text" id="edit-phi-cat" class="form-control currency-format" value="${utils.formatCurrency(o.phi_cat)}">
      </div>
    </form>
  `;
}

// HTML Generator cho form sửa Trục In
function generateTrucInEditForm(o) {
  return `
    <form id="edit-order-form" class="form-grid" style="grid-template-columns: repeat(2, 1fr);">
      <div class="form-group">
        <label class="form-label">Mã đơn hàng</label>
        <input type="text" class="form-control" value="${o.id}" readonly>
      </div>
      <div class="form-group">
        <label class="form-label">Tên hàng</label>
        <input type="text" id="edit-ten-hang" class="form-control" value="${o.ten_hang || ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Tên khách hàng</label>
        <input type="text" id="edit-ten-khach-hang" class="form-control" value="${o.ten_khach_hang || ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Ngày giao dự kiến</label>
        <input type="date" id="edit-ngay-du-kien" class="form-control" value="${o.ngay_du_kien ? new Date(o.ngay_du_kien).toISOString().split('T')[0] : ''}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Số lượng</label>
        <input type="number" step="any" id="edit-so-luong" class="form-control" value="${o.so_luong || 0}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Đơn giá gốc (đ)</label>
        <input type="text" id="edit-don-gia-goc" class="form-control currency-format" value="${utils.formatCurrency(o.don_gia_goc)}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Đơn giá bán (đ)</label>
        <input type="text" id="edit-don-gia-ban" class="form-control currency-format" value="${utils.formatCurrency(o.don_gia_ban)}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Hoa hồng (%)</label>
        <input type="number" step="any" id="edit-hoa-hong-percent" class="form-control" value="${o.hoa_hong || 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Tiền ship (đ)</label>
        <input type="text" id="edit-tien-ship" class="form-control currency-format" value="${utils.formatCurrency(o.tien_ship)}">
      </div>
      <div class="form-group">
        <label class="form-label">Cộng tác viên (CTV)</label>
        <input type="text" id="edit-ctv" class="form-control" value="${o.ctv || ''}">
      </div>
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
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const tableName = utils.getOrderTableName(editOrderTypeGlobal);

    const tenHang = document.getElementById('edit-ten-hang').value.trim();
    const tenKhachHang = document.getElementById('edit-ten-khach-hang').value.trim();
    const ngayDuKien = new Date(document.getElementById('edit-ngay-du-kien').value);
    const soLuong = parseFloat(document.getElementById('edit-so-luong').value) || 0;
    const donGiaBan = utils.parseCurrency(document.getElementById('edit-don-gia-ban').value);
    const ctv = document.getElementById('edit-ctv').value.trim() || null;
    const hoaHong = parseFloat(document.getElementById('edit-hoa-hong-percent').value) || 0;
    const tienShip = utils.parseCurrency(document.getElementById('edit-tien-ship').value);

    let sql = "";
    let params = [];

    if (editOrderTypeGlobal === 'bang_keo_in') {
      const donGiaVon = utils.parseCurrency(document.getElementById('edit-don-gia-von').value);
      const quyCachM = parseFloat(document.getElementById('edit-qc-m').value) || 0;
      const cuonCay = parseFloat(document.getElementById('edit-cuon-cay').value) || 0;
      const phiCat = utils.parseCurrency(document.getElementById('edit-phi-cat').value);
      const tienCoc = utils.parseCurrency(document.getElementById('edit-tien-coc').value);

      // Tính toán lại
      let donGiaGoc = 0;
      if (cuonCay > 0 && quyCachM > 0) {
        donGiaGoc = (donGiaVon + phiCat) / 90 * quyCachM / cuonCay; 
      }
      
      const thanhTienGoc = donGiaGoc * soLuong;
      const thanhTienBan = donGiaBan * soLuong;
      const congNoKhach = thanhTienBan - tienCoc;
      const loiNhuan = thanhTienBan - thanhTienGoc;
      const tienHoaHong = loiNhuan * (hoaHong / 100);
      const loiNhuanRong = loiNhuan - tienHoaHong - tienShip;

      sql = `
        UPDATE bang_keo_in_orders SET 
          ten_hang = $1, ten_khach_hang = $2, ngay_du_kien = $3, so_luong = $4,
          don_gia_ban = $5, ctv = $6, hoa_hong = $7, tien_ship = $8,
          don_gia_von = $9, quy_cach_m = $10, cuon_cay = $11, phi_cat = $12,
          tien_coc = $13, don_gia_goc = $14, thanh_tien_goc = $15, thanh_tien_ban = $16,
          cong_no_khach = $17, loi_nhuan = $18, tien_hoa_hong = $19, loi_nhuan_rong = $20
        WHERE id = $21
      `;
      params = [
        tenHang, tenKhachHang, ngayDuKien, soLuong, donGiaBan, ctv, hoaHong, tienShip,
        donGiaVon, quyCachM, cuonCay, phiCat, tienCoc, donGiaGoc, thanhTienGoc, thanhTienBan,
        congNoKhach, loiNhuan, tienHoaHong, loiNhuanRong, editOrderIdGlobal
      ];

    } else {
      // Dành cho Trục In hoặc Băng Keo Thường
      const donGiaGoc = utils.parseCurrency(document.getElementById('edit-don-gia-goc').value);
      
      const thanhTien = donGiaGoc * soLuong;
      const thanhTienBan = donGiaBan * soLuong;
      const loiNhuan = thanhTienBan - thanhTien;
      const tienHoaHong = loiNhuan * (hoaHong / 100);
      const congNoKhach = thanhTienBan;
      const loiNhuanRong = loiNhuan - tienHoaHong - tienShip;

      sql = `
        UPDATE ${tableName} SET 
          ten_hang = $1, ten_khach_hang = $2, ngay_du_kien = $3, so_luong = $4,
          don_gia_goc = $5, don_gia_ban = $6, ctv = $7, hoa_hong = $8,
          tien_ship = $9, thanh_tien = $10, thanh_tien_ban = $11,
          cong_no_khach = $12, loi_nhuan = $13, tien_hoa_hong = $14, loi_nhuan_rong = $15
        WHERE id = $16
      `;
      params = [
        tenHang, tenKhachHang, ngayDuKien, soLuong, donGiaGoc, donGiaBan, ctv, hoaHong,
        tienShip, thanhTien, thanhTienBan, congNoKhach, loiNhuan, tienHoaHong, loiNhuanRong,
        editOrderIdGlobal
      ];
    }

    const res = await window.electronAPI.dbRun(sql, params);
    if (res.ok) {
      utils.showToast(`Đã lưu thay đổi cho đơn ${editOrderIdGlobal}`, "success");
      closeModal('modal-edit-order');
      
      // Reload dữ liệu trên trang hiện tại
      await switchTab(activeTab);
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
      XLSX.writeFile(workbook, savePath.filePath);
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
  } else if (activeTab === 'history') {
    exportHistoryExcel();
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

// ==========================================
// TIỆN ÍCH TƯƠNG TÁC BẢNG BẰNG BÀN PHÍM
// ==========================================

// Lấy ngữ cảnh bảng dữ liệu của trang đang mở (nếu có)
function getActiveTableContext() {
  if (activeTab === 'history') {
    return {
      tbody: document.getElementById('history-table-body'),
      getType: () => historyActiveTab,
      afterChange: () => updateHistorySelectionSummary(),
      selectAll: () => selectAllHistoryRows()
    };
  }
  if (activeTab === 'thong-ke') {
    return {
      tbody: document.getElementById('stats-table-body'),
      getType: () => statsActiveSubtab,
      afterChange: () => updateStatsSelectionSummary(),
      selectAll: () => {
        document.querySelectorAll('#stats-table-body tr').forEach(tr => {
          if (tr.dataset.id) tr.classList.add('selected');
        });
        updateStatsSelectionSummary();
      }
    };
  }
  if (activeTab === 'quotes-list') {
    return {
      tbody: document.getElementById('quotes-list-tbody'),
      getType: (tr) => tr?.dataset.type,
      afterChange: () => {},
      selectAll: () => {
        document.querySelectorAll('#quotes-list-tbody tr').forEach(tr => {
          if (tr.dataset.id) tr.classList.add('selected');
        });
      }
    };
  }
  return null;
}

// Kiểm tra người dùng có đang gõ trong ô nhập liệu không
function isTypingInField() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

// Enter trong form nhập liệu = chuyển sang ô kế tiếp (thay vì submit nhầm)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  if (e.defaultPrevented) return; // Autocomplete đang mở đã tự xử lý Enter

  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (['checkbox', 'radio', 'file', 'button', 'submit'].includes(target.type)) return;

  const form = target.closest('form');
  if (!form || !target.closest('.form-grid')) return;

  e.preventDefault();

  const fields = Array.from(form.querySelectorAll('input, select')).filter(el =>
    !el.disabled && el.type !== 'hidden' && !el.readOnly && el.offsetParent !== null
  );
  const idx = fields.indexOf(target);

  if (idx > -1 && idx < fields.length - 1) {
    const next = fields[idx + 1];
    next.focus();
    if (typeof next.select === 'function') next.select();
  } else {
    // Ô cuối cùng: blur để kích hoạt định dạng tiền tệ, không submit nhầm
    target.blur();
  }
});

// Lắng nghe phím tắt toàn cục
const commandPaletteActions = [
  { title: 'Tổng quan', description: 'Mở dashboard và biểu đồ doanh số', group: 'Trang', run: () => switchTab('dashboard') },
  { title: 'Tạo đơn Băng Keo In', description: 'Mở form bán hàng Băng Keo In Logo', group: 'Bán hàng', run: () => jumpToSalesForm('sales-form-bang-keo-in') },
  { title: 'Tạo đơn Băng Keo thường', description: 'Mở form bán hàng Băng Keo thường', group: 'Bán hàng', run: () => jumpToSalesForm('sales-form-bang-keo') },
  { title: 'Tạo đơn Trục In', description: 'Mở form gia công Trục In', group: 'Bán hàng', run: () => jumpToSalesForm('sales-form-truc-in') },
  { title: 'Tạo báo giá', description: 'Mở khu vực báo giá đơn hàng', group: 'Báo giá', run: () => switchTab('quotes-creation') },
  { title: 'Danh sách báo giá', description: 'Xem và chuyển báo giá thành đơn hàng', group: 'Báo giá', run: () => switchTab('quotes-list') },
  { title: 'Thống kê', description: 'Theo dõi giao hàng, công nợ và lợi nhuận', group: 'Báo cáo', run: () => switchTab('thong-ke') },
  { title: 'Đơn quá hạn', description: 'Lọc nhanh các đơn chưa giao đã quá hạn', group: 'Báo cáo', run: () => jumpToStatsFilter('overdue') },
  { title: 'Đơn sắp hạn', description: 'Lọc nhanh các đơn cần giao trong 3 ngày', group: 'Báo cáo', run: () => jumpToStatsFilter('near-due') },
  { title: 'Công nợ chưa tất toán', description: 'Lọc các đơn còn công nợ mở', group: 'Báo cáo', run: () => jumpToStatsFilter('unsettled') },
  { title: 'Lịch sử đơn hàng', description: 'Tra cứu, gửi email, đính kèm và xuất Excel', group: 'Dữ liệu', run: () => switchTab('history') },
  { title: 'Tải mẫu nhập Excel', description: 'Tạo file mẫu theo loại đơn đang chọn trong Lịch sử', group: 'Dữ liệu', run: () => exportImportTemplate() },
  { title: 'Nhập đơn từ Excel', description: 'Nhập nhiều đơn hàng và tự tính tiền', group: 'Dữ liệu', run: () => importOrdersFromExcel() },
  { title: 'Xuất đơn / phiếu giao', description: 'Mở trình chọn nhiều đơn để in chứng từ', group: 'Chứng từ', run: () => openMultiOrderExportDialog() },
  { title: 'Xuất Excel form hiện tại', description: 'Xuất dữ liệu từ form hoặc lịch sử đang mở', group: 'Xuất file', run: () => exportCurrentFormToExcel() },
  { title: 'Làm mới dữ liệu', description: 'Tải lại dữ liệu của trang hiện tại', group: 'Hệ thống', run: () => refreshCurrentPage() },
  { title: 'Phím tắt', description: 'Xem danh sách phím tắt thao tác nhanh', group: 'Hệ thống', run: () => openShortcutsModal() }
];

function initializeUiEnhancements() {
  updateFooterClock();
  setInterval(updateFooterClock, 30000);
  renderCommandResults();
  setupKeyboardFocusableControls();
}

// Cho phép điều hướng sidebar / breadcrumb bằng Tab + Enter/Space
function setupKeyboardFocusableControls() {
  document.querySelectorAll('.sidebar-menu a, .breadcrumb-item').forEach(el => {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  });
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

  // 1. Phím Escape - Đóng menu ngữ cảnh / Modal
  if (key === 'Escape') {
    // Ưu tiên đóng menu chuột phải hoặc menu lọc cột nếu đang mở
    const openMenus = [
      document.getElementById('custom-context-menu'),
      document.getElementById('stats-column-filter-menu')
    ].filter(m => m && m.style.display === 'block');

    if (openMenus.length > 0) {
      e.preventDefault();
      openMenus.forEach(m => m.style.display = 'none');
      return;
    }

    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) {
      e.preventDefault();
      if (activeModal.id === 'modal-email-dialog') {
        closeEmailDialogModal();
      } else {
        closeModal(activeModal.id);
      }
      return;
    }
  }

  // 1b. Alt + 1..6: Chuyển nhanh giữa các trang chính
  if (e.altKey && !isCtrl && !e.shiftKey) {
    const tabOrder = ['dashboard', 'sales', 'quotes-creation', 'quotes-list', 'thong-ke', 'history'];
    const num = parseInt(key, 10);
    if (num >= 1 && num <= tabOrder.length) {
      e.preventDefault();
      switchTab(tabOrder[num - 1]);
      return;
    }
  }

  // 1c. Điều hướng bảng dữ liệu bằng bàn phím (khi không gõ chữ và không mở modal)
  if (!isTypingInField() && !document.querySelector('.modal-overlay.active')) {
    const tableCtx = getActiveTableContext();

    if (tableCtx && tableCtx.tbody) {
      // Ctrl + A: chọn tất cả dòng đang hiển thị
      if (isCtrl && lowerKey === 'a') {
        e.preventDefault();
        tableCtx.selectAll();
        return;
      }

      // Mũi tên / Home / End: di chuyển dòng chọn (Shift để mở rộng vùng chọn)
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key) && !isCtrl) {
        e.preventDefault();
        const direction = key === 'ArrowDown' ? 'down' : key === 'ArrowUp' ? 'up' : key === 'Home' ? 'first' : 'last';
        utils.moveRowSelection(tableCtx.tbody, direction, e.shiftKey);
        tableCtx.afterChange();
        return;
      }

      // Enter: mở form sửa cho dòng đang chọn (bỏ qua nếu đang focus nút/link)
      if (key === 'Enter' && !e.defaultPrevented) {
        const focusTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (focusTag !== 'button' && focusTag !== 'a') {
          const selected = tableCtx.tbody.querySelector('tr.selected');
          if (selected && selected.dataset.id) {
            e.preventDefault();
            openEditOrderDialog(selected.dataset.id, tableCtx.getType(selected));
            return;
          }
        }
      }
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
    if (activeTab === 'history') {
      loadHistoryData();
      utils.showToast("Đã cập nhật lịch sử đơn hàng", "success");
    } else if (activeTab === 'thong-ke') {
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

  // 3. Phím Delete - Xóa các dòng đã chọn (Lịch sử / Báo giá)
  if (key === 'Delete') {
    if (!isTypingInField() && !document.querySelector('.modal-overlay.active')) {
      if (activeTab === 'history') {
        e.preventDefault();
        deleteSelectedHistory();
      } else if (activeTab === 'quotes-list') {
        const selected = document.querySelector('#quotes-list-tbody tr.selected');
        if (selected && selected.dataset.id) {
          e.preventDefault();
          deleteQuotation(selected.dataset.id, selected.dataset.type);
        }
      }
    }
    return;
  }

  // 4. Tổ hợp phím có Ctrl
  if (isCtrl) {

    // Ctrl + S: Lưu / Gửi / Cập nhật
    if (lowerKey === 's') {
      e.preventDefault();
      
      const activeModal = document.querySelector('.modal-overlay.active');
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
      if (activeTab === 'history') {
        const input = document.getElementById('hist-search');
        if (input) {
          input.focus();
          input.select();
        }
      } else if (activeTab === 'thong-ke') {
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
      if (activeTab === 'history') {
        sendSelectedHistoryEmail();
      }
      return;
    }

    // Ctrl + D: Quản lý đính kèm cho dòng được chọn
    if (lowerKey === 'd') {
      e.preventDefault();
      if (activeTab === 'history') {
        openAttachmentsManager();
      }
      return;
    }

    // Ctrl + Q: Đóng modal hoặc Thoát chương trình
    if (lowerKey === 'q') {
      e.preventDefault();
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal) {
        if (activeModal.id === 'modal-email-dialog') {
          closeEmailDialogModal();
        } else {
          closeModal(activeModal.id);
        }
      } else {
        if (confirm("Bạn có muốn đóng phần mềm không?")) {
          window.close();
        }
      }
      return;
    }
  }
});
