// JS/MODULES/THONGKE.JS - LOGIC XỬ LÝ PHÂN HỆ THỐNG KÊ CHI TIẾT
let statsActiveSubtab = 'bang-keo-in';
let statsColumnFilters = {};
let statsSort = { key: null, direction: 'asc' };
let statsColumnFilterCloseHandler = null;
// Mỗi lần tải bảng thống kê có một mã yêu cầu; phản hồi cũ (subtab trước) bị bỏ qua.
let statsTableRequestToken = 0;

const statsColumnDefs = [
  { key: 'id', label: 'Mã đơn hàng', value: row => row.id || '' },
  { key: 'thoi_gian', label: 'Ngày đặt', value: row => utils.formatDate(row.thoi_gian) },
  { key: 'ten_hang', label: 'Tên đơn hàng', value: row => row.ten_hang || '' },
  { key: 'ten_khach_hang', label: 'Khách hàng', value: row => row.ten_khach_hang || '' },
  { key: 'ngay_du_kien', label: 'Ngày giao', value: row => utils.formatDate(row.ngay_du_kien) },
  { key: 'cong_no_khach', label: 'Công nợ khách', value: row => `${utils.formatCurrency(row.cong_no_khach)}đ` },
  { key: 'cong_no_ncc', label: 'Nợ NCC', value: row => `${utils.formatCurrency(row.cong_no_ncc)}đ` },
  { key: 'da_giao', label: 'Giao hàng', value: row => row.da_giao ? 'Đã giao' : 'Chưa giao' },
  { key: 'da_tat_toan', label: 'Tất toán', value: row => row.da_tat_toan ? 'Đã tất toán' : 'Chưa xong' },
  { key: 'da_gui_email', label: 'Đã Email', value: row => row.da_gui_email ? 'Rồi' : 'Chưa' }
];
let statsAllOrders = []; // Lưu trữ để tìm kiếm filter offline nhanh chóng
let statsLastSelectedIndex = -1;
let statsViewMode = 'summary';
let selectedOrderIdForAttachments = null;
// Đơn đang mở trong hộp thoại đính kèm: chốt một lần khi mở, không đọc lại tab/lựa chọn hiện tại.
let statsAttachmentContext = null;

const statsDetailColumnHeaders = {
  id: 'Mã Đơn Hàng', thoi_gian: 'Ngày Tạo', ten_hang: 'Tên Hàng', ten_khach_hang: 'Khách Hàng',
  sdt_khach_hang: 'SĐT Khách', dia_chi_khach_hang: 'Địa Chỉ Giao',
  ngay_du_kien: 'Ngày Giao', quy_cach: 'Quy Cách', quy_cach_mm: 'Quy Cách (mm)', quy_cach_m: 'Quy Cách (m)',
  quy_cach_mic: 'Quy Cách (mic)', cuon_cay: 'Cuộn/Cây', so_luong: 'Số Lượng', phi_sl: 'Phí SL',
  mau_keo: 'Màu Keo', phi_keo: 'Phí Keo', mau_sac: 'Màu Sắc', phi_mau: 'Phí Màu',
  phi_size: 'Phí Size', phi_cat: 'Phí Cắt', don_gia_von: 'Giá Vốn', don_gia_goc: 'Giá Gốc',
  thanh_tien_goc: 'Tiền Gốc', don_gia_ban: 'Giá Bán', thanh_tien_ban: 'Tiền Bán', tien_coc: 'Tiền Cọc',
  cong_no_khach: 'Công Nợ Khách', cong_no_ncc: 'Nợ NCC', ctv: 'CTV', hoa_hong: 'Hoa Hồng (%)', tien_hoa_hong: 'Tiền H.Hồng',
  loi_giay: 'Lõi Giấy', thung_bao: 'Thùng Bao', loi_nhuan: 'Lợi Nhuận', tien_ship: 'Tiền Ship',
  loi_nhuan_rong: 'Lợi Nhuận Ròng', vat: 'VAT', da_giao: 'Đã Giao', da_tat_toan: 'Đã Tất Toán', thanh_tien: 'Thành Tiền',
  loai_truc: 'Loại Trục', ten_truc: 'Tên Trục', truc_chu_vi: 'Chu Vi Trục', truc_so_luong: 'SL Trục',
  truc_gia_goc: 'Giá Gốc Trục', truc_gia_ban: 'Giá Bán Trục', truc_vat: 'VAT Trục', truc_thanh_tien_goc: 'Tiền Gốc Trục',
  truc_thanh_tien_ban: 'Tiền Bán Trục', truc_ctv: 'CTV Trục', truc_hoa_hong: 'HH Trục (%)',
  truc_tien_hoa_hong: 'Tiền H.Hồng Trục',
  truc_loi_nhuan: 'Lãi Trục', truc_loi_nhuan_rong: 'Lãi Ròng Trục', da_gui_email: 'Đã Email',
  kich_thuoc: 'Kích Thước', thanh_tien_von: 'Tiền Vốn', ghi_chu: 'Ghi Chú'
};

const statsDetailColumnsMap = {
  bang_keo_in: [
    'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'sdt_khach_hang', 'dia_chi_khach_hang', 'ngay_du_kien', 'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic',
    'cuon_cay', 'so_luong', 'phi_sl', 'mau_keo', 'phi_keo', 'mau_sac', 'phi_mau', 'phi_size', 'phi_cat',
    'don_gia_von', 'don_gia_goc', 'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban', 'tien_coc', 'cong_no_khach', 'cong_no_ncc',
    'ctv', 'hoa_hong', 'tien_hoa_hong', 'loi_giay', 'thung_bao', 'loai_truc', 'ten_truc', 'truc_chu_vi',
    'truc_so_luong', 'truc_gia_goc', 'truc_gia_ban', 'truc_vat', 'truc_thanh_tien_goc', 'truc_thanh_tien_ban',
    'truc_ctv', 'truc_hoa_hong', 'truc_tien_hoa_hong', 'truc_loi_nhuan', 'truc_loi_nhuan_rong', 'loi_nhuan', 'tien_ship',
    'loi_nhuan_rong', 'vat', 'da_giao', 'da_tat_toan', 'da_gui_email'
  ],
  truc_in: [
    'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'sdt_khach_hang', 'dia_chi_khach_hang', 'ngay_du_kien', 'quy_cach', 'so_luong', 'mau_sac', 'mau_keo',
    'don_gia_goc', 'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban', 'cong_no_khach', 'cong_no_ncc', 'ctv', 'hoa_hong',
    'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'vat', 'da_giao', 'da_tat_toan', 'da_gui_email'
  ],
  bang_keo: [
    'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'sdt_khach_hang', 'dia_chi_khach_hang', 'ngay_du_kien', 'quy_cach', 'so_luong', 'mau_sac',
    'don_gia_goc', 'thanh_tien', 'don_gia_ban', 'thanh_tien_ban', 'cong_no_khach', 'cong_no_ncc', 'ctv', 'hoa_hong',
    'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'vat', 'da_giao', 'da_tat_toan', 'da_gui_email'
  ],
  thank_you: [
    'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'sdt_khach_hang', 'dia_chi_khach_hang', 'ngay_du_kien', 'kich_thuoc', 'so_luong', 'mau_sac',
    'don_gia_von', 'thanh_tien_von', 'don_gia_ban', 'thanh_tien_ban', 'tien_coc', 'cong_no_khach', 'cong_no_ncc', 'ctv', 'hoa_hong',
    'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'vat', 'ghi_chu', 'da_giao', 'da_tat_toan', 'da_gui_email'
  ]
};

const statsCurrencyColumns = new Set([
  'phi_sl', 'phi_keo', 'phi_mau', 'phi_size', 'phi_cat', 'don_gia_von', 'don_gia_goc', 'thanh_tien_goc',
  'don_gia_ban', 'thanh_tien_ban', 'tien_coc', 'cong_no_khach', 'cong_no_ncc', 'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'vat',
  'thanh_tien', 'thanh_tien_von', 'truc_gia_goc', 'truc_gia_ban', 'truc_vat', 'truc_thanh_tien_goc', 'truc_thanh_tien_ban',
  'truc_tien_hoa_hong', 'truc_loi_nhuan', 'truc_loi_nhuan_rong'
]);

function updateStatsSelectionSummary() {
  const selectedIds = getSelectedStatsOrderIds();
  const summary = document.getElementById('stats-selection-summary');
  if (!summary) return;

  if (selectedIds.length === 0) {
    summary.style.display = 'none';
    updateStatsLayoutDebug('selection-cleared');
    return;
  }

  const totalDebt = selectedIds.reduce((sum, id) => {
    const order = statsAllOrders.find(row => row.id === id);
    return sum + parseFloat(order?.cong_no_khach || 0);
  }, 0);

  document.getElementById('stats-selected-count').innerText = `Đã chọn: ${selectedIds.length} đơn`;
  document.getElementById('stats-selected-debt').innerText = `Tổng CN: ${utils.formatCurrency(totalDebt)}đ`;
  summary.style.display = 'inline-flex';
  updateStatsLayoutDebug('selection-updated');
}

function updateStatsLayoutDebug(trigger) {
  void trigger;
}

async function loadStatsData() {
  try {
    // 1. Tải số liệu Warning Metrics từ database
    await loadStatsWarningMetrics();

    // 2. Tải danh sách đơn hàng cho subtab hiện tại
    await loadStatsTableData();

  } catch (err) {
    window.electronAPI.writeLog('error', 'Lỗi tải trang thống kê: ' + err.message);
  }
}

// Tải số liệu Warnings và công nợ/lợi nhuận ròng ước tính
async function loadStatsWarningMetrics() {
  const res = await window.electronAPI.dbQuery('stats.warningMetrics');
  if (res.ok && res.rows.length > 0) {
    const data = res.rows[0];
    const sapHan = parseInt(data.sap_han || 0);
    const quaHan = parseInt(data.qua_han || 0);
    const chuaTatToan = parseInt(data.chua_tat_toan || 0);
    const hoanThanh = parseInt(data.hoan_thanh || 0);
    const tongCongNo = parseFloat(data.tong_cong_no || 0);
    const tongLoiNhuan = parseFloat(data.tong_loi_nhuan || 0);
    const tongCongNoNcc = parseFloat(data.tong_cong_no_ncc || 0);

    document.getElementById('stats-warning-count').innerText = (sapHan + quaHan).toString();
    document.getElementById('stats-warning-desc').innerText = `${sapHan} sắp hạn, ${quaHan} quá hạn`;
    
    document.getElementById('stats-pending-count').innerText = chuaTatToan.toString();
    document.getElementById('stats-pending-desc').innerText = `${hoanThanh} đã hoàn thành`;

    document.getElementById('stats-debt-sum').innerText = utils.formatCurrency(tongCongNo) + "đ";
    document.getElementById('stats-supplier-debt-sum').innerText = utils.formatCurrency(tongCongNoNcc) + "đ";
    document.getElementById('stats-profit-sum').innerText = utils.formatCurrency(tongLoiNhuan) + "đ";
  }
}

// Chuyển đổi giữa các phân hệ con của Thống kê (Băng Keo In, Trục In, Băng Keo)
function switchStatsSubtab(subtab) {
  statsActiveSubtab = subtab;
  statsSort = { key: null, direction: 'asc' };
  closeStatsColumnFilterMenu();
  
  const pills = document.querySelectorAll('#stats-subtabs button');
  pills.forEach(p => p.classList.remove('active'));
  
  // Active pill tương ứng
  const index = ['bang-keo-in', 'truc-in', 'bang-keo', 'thank-you'].indexOf(subtab);
  pills[Math.max(0, index)].classList.add('active');

  // Đặt lại các filters về mặc định
  document.getElementById('stats-search').value = "";
  document.getElementById('stats-month-filter').value = "all";
  document.getElementById('stats-status-filter').value = "all";
  document.getElementById('stats-date-from').value = "";
  document.getElementById('stats-date-to').value = "";
  document.getElementById('stats-giao-filter').value = "all";
  document.getElementById('stats-ctv-filter').value = "";
  statsColumnFilters = {};
  statsLastSelectedIndex = -1;

  loadStatsTableData();
}

function switchStatsViewMode(mode) {
  statsViewMode = mode;
  statsLastSelectedIndex = -1;

  document.querySelectorAll('#stats-view-modes button').forEach((pill, index) => {
    pill.classList.toggle('active', (mode === 'summary' && index === 0) || (mode === 'detail' && index === 1));
  });

  filterStatsTable();
}

// Tải bảng dữ liệu thống kê
async function loadStatsTableData() {
  const requestToken = ++statsTableRequestToken;
  const requestedSubtab = statsActiveSubtab;
  const res = await window.electronAPI.dbQuery('stats.listOrders', { orderType: getStatsOrderTypeKey() });
  // Người dùng đã chuyển subtab trong lúc chờ: bỏ kết quả cũ để statsAllOrders luôn khớp statsActiveSubtab.
  if (requestToken !== statsTableRequestToken || requestedSubtab !== statsActiveSubtab) return;
  if (res.ok) {
    statsAllOrders = res.rows;
    filterStatsTable();
  } else {
    setConnectionStatus(false, 'Mây: Cần cấu hình');
    utils.showToast(`Không thể tải Thống kê: ${res.error || 'Chưa kết nối dữ liệu'}. Bấm badge Mây để xử lý.`, "danger");
  }
}

function getStatsOrderTypeKey() {
  if (statsActiveSubtab === 'truc-in') return 'truc_in';
  if (statsActiveSubtab === 'bang-keo') return 'bang_keo';
  if (statsActiveSubtab === 'thank-you') return 'thank_you';
  return 'bang_keo_in';
}

function getVisibleStatsRows() {
  return Array.from(document.querySelectorAll('#stats-table-body tr[data-id]'));
}

function hasStatsAxisChild(row) {
  return statsActiveSubtab === 'bang-keo-in' && row?.loai_truc === 'moi';
}

function getStatsAxisMeta(row) {
  const parts = [];
  if (row.truc_chu_vi !== null && row.truc_chu_vi !== undefined && row.truc_chu_vi !== '') {
    parts.push(`Chu vi ${row.truc_chu_vi}`);
  }
  parts.push(`${utils.formatCurrency(row.truc_so_luong || 0)} trục`);
  return parts.join(' • ');
}

function createStatsAxisChildRow(row, columnCount = 9, detailMode = false) {
  const child = document.createElement('tr');
  child.className = `stats-axis-child${detailMode ? ' stats-axis-child--detail' : ''}`;
  child.dataset.parentId = row.id;

  const axisName = utils.escapeHtml(row.ten_truc || 'Trục mới');
  const axisMeta = utils.escapeHtml(getStatsAxisMeta(row));
  const axisCtv = row.truc_ctv ? `CTV: ${utils.escapeHtml(row.truc_ctv)}` : 'Không có CTV';
  const commissionText = `${utils.formatCurrency(row.truc_hoa_hong || 0)}% • ${utils.formatCurrency(row.truc_tien_hoa_hong || 0)}đ`;

  if (detailMode) {
    child.innerHTML = `
      <td colspan="${columnCount}">
        <div class="stats-axis-tree stats-axis-tree--detail">
          <span class="stats-tree-branch" aria-hidden="true">└─</span>
          <span class="stats-axis-badge">Trục đi kèm</span>
          <strong class="stats-axis-name">${axisName}</strong>
          <span class="stats-axis-meta">${axisMeta}</span>
          <span class="stats-axis-finance">Giá gốc ${utils.formatCurrency(row.truc_gia_goc || 0)}đ • Giá bán ${utils.formatCurrency(row.truc_gia_ban || 0)}đ</span>
          <span class="stats-axis-finance">Thành tiền ${utils.formatCurrency(row.truc_thanh_tien_ban || 0)}đ</span>
          <span class="stats-axis-finance">Hoa hồng ${commissionText}</span>
          <strong class="stats-axis-profit">Lãi ròng ${utils.formatCurrency(row.truc_loi_nhuan_rong || 0)}đ</strong>
        </div>
      </td>
    `;
    return child;
  }

  child.innerHTML = `
    <td class="stats-axis-empty"></td>
    <td class="stats-axis-empty"></td>
    <td colspan="2" class="stats-axis-tree-cell">
      <div class="stats-axis-tree">
        <span class="stats-tree-branch" aria-hidden="true">└─</span>
        <span class="stats-axis-badge">Trục</span>
        <strong class="stats-axis-name">${axisName}</strong>
      </div>
    </td>
    <td><span class="stats-axis-meta">${axisMeta}</span></td>
    <td class="stats-axis-money"><small>Thành tiền</small><strong>${utils.formatCurrency(row.truc_thanh_tien_ban || 0)}đ</strong></td>
    <td colspan="2"><span class="stats-axis-meta">${axisCtv} • HH ${commissionText}</span></td>
    <td class="stats-axis-profit">Lãi ròng ${utils.formatCurrency(row.truc_loi_nhuan_rong || 0)}đ</td>
  `;
  return child;
}

function handleStatsRowClick(event, rowEl) {
  const rows = getVisibleStatsRows();
  const currentIndex = rows.indexOf(rowEl);
  if (currentIndex === -1) return;

  if (event.shiftKey && statsLastSelectedIndex >= 0) {
    event.preventDefault();
    const start = Math.min(statsLastSelectedIndex, currentIndex);
    const end = Math.max(statsLastSelectedIndex, currentIndex);
    if (!event.ctrlKey && !event.metaKey) {
      rows.forEach(row => row.classList.remove('selected'));
    }
    for (let i = start; i <= end; i++) {
      rows[i].classList.add('selected');
    }
  } else if (event.ctrlKey || event.metaKey) {
    rowEl.classList.toggle('selected');
    statsLastSelectedIndex = currentIndex;
  } else {
    rows.forEach(row => {
      if (row !== rowEl) row.classList.remove('selected');
    });
    rowEl.classList.add('selected');
    statsLastSelectedIndex = currentIndex;
  }

  updateStatsSelectionSummary();
}

// Render dữ liệu vào Table
function renderStatsTable(rows) {
  if (statsViewMode === 'detail') {
    renderStatsDetailTable(rows);
    return;
  }

  const header = document.getElementById('stats-table-header');
  const body = document.getElementById('stats-table-body');
  
  if (!header || !body) return;

  // 1. Tạo headers tiếng Việt
  header.innerHTML = statsColumnDefs.map(col => `
    <th>
      <button type="button" class="table-filter-button ${Object.prototype.hasOwnProperty.call(statsColumnFilters, col.key) ? 'active' : ''}" data-stats-column="${utils.escapeHtml(col.key)}">
        <span>${col.label}</span>
        <span class="filter-caret">${statsSort.key === col.key ? (statsSort.direction === 'asc' ? '↑' : '↓') : '▾'}</span>
      </button>
    </th>
  `).join('');
  bindStatsHeaderFilterButtons(header);

  // 2. Chèn dữ liệu
  body.innerHTML = "";
  statsLastSelectedIndex = -1;
  updateStatsSelectionSummary();
  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="${statsColumnDefs.length}" style="text-align:center; color:var(--text-muted);">Không tìm thấy đơn hàng nào</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    if (hasStatsAxisChild(row)) tr.classList.add('stats-parent-with-axis');
    
    // Đánh giá cảnh báo thời hạn
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(row.ngay_du_kien || NaN);
    dueDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    let warningStyle = "";
    if (!row.da_giao) {
      if (diffDays < 0) {
        warningStyle = 'style="color: var(--color-danger); font-weight:700;"'; // Quá hạn
      } else if (diffDays <= 3) {
        warningStyle = 'style="color: var(--color-warning); font-weight:700;"'; // Sắp hạn
      }
    }

    const daGiaoBadge = row.da_giao 
      ? '<span class="badge badge-success">Đã giao</span>' 
      : '<span class="badge badge-gray">Chưa giao</span>';
      
    const daTatToanBadge = row.da_tat_toan 
      ? '<span class="badge badge-success">Đã tất toán</span>' 
      : '<span class="badge badge-warning">Chưa xong</span>';

    const daGuiEmailBadge = row.da_gui_email 
      ? '<span class="badge badge-success">Rồi</span>' 
      : '<span class="badge badge-gray">Chưa</span>';

    tr.innerHTML = `
      <td><strong>${utils.escapeHtml(row.id)}</strong></td>
      <td>${utils.escapeHtml(utils.formatDate(row.thoi_gian))}</td>
      <td>${utils.escapeHtml(row.ten_hang)}</td>
      <td>${utils.escapeHtml(row.ten_khach_hang)}</td>
      <td ${warningStyle}>${utils.escapeHtml(utils.formatDate(row.ngay_du_kien))}</td>
      <td>${utils.formatCurrency(row.cong_no_khach)}đ</td>
      <td>${utils.formatCurrency(row.cong_no_ncc)}đ</td>
      <td>${daGiaoBadge}</td>
      <td>${daTatToanBadge}</td>
      <td>${daGuiEmailBadge}</td>
    `;

    bindStatsRowEvents(tr, row);
    body.appendChild(tr);
    if (hasStatsAxisChild(row)) {
      body.appendChild(createStatsAxisChildRow(row));
    }
  });

  updateStatsSelectionSummary();
  updateStatsLayoutDebug('render-summary');
}

function renderStatsDetailTable(rows) {
  const header = document.getElementById('stats-table-header');
  const body = document.getElementById('stats-table-body');
  if (!header || !body) return;

  const orderType = getStatsOrderTypeKey();
  const cols = statsDetailColumnsMap[orderType] || [];

  header.innerHTML = cols.map(col => `<th><button type="button" class="table-filter-button ${Object.prototype.hasOwnProperty.call(statsColumnFilters, col) ? 'active' : ''}" data-stats-column="${utils.escapeHtml(col)}">${utils.escapeHtml(statsDetailColumnHeaders[col] || col)} <span>${statsSort.key === col ? (statsSort.direction === 'asc' ? '↑' : '↓') : '▾'}</span></button></th>`).join('');
  bindStatsHeaderFilterButtons(header);
  body.innerHTML = "";
  statsLastSelectedIndex = -1;
  updateStatsSelectionSummary();

  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="${cols.length || 1}" style="text-align:center; color:var(--text-muted);">Không tìm thấy đơn hàng nào</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    if (hasStatsAxisChild(row)) tr.classList.add('stats-parent-with-axis');

    cols.forEach(col => {
      const td = document.createElement('td');
      const val = row[col];

      if (col === 'thoi_gian' || col === 'ngay_du_kien') {
        td.innerText = utils.formatDate(val);
      } else if (col === 'da_giao') {
        td.innerHTML = val ? '<span class="badge badge-success">Rồi</span>' : '<span class="badge badge-gray">Chưa</span>';
      } else if (col === 'da_tat_toan') {
        td.innerHTML = val ? '<span class="badge badge-success">Xong</span>' : '<span class="badge badge-warning">Chưa</span>';
      } else if (col === 'da_gui_email') {
        td.innerHTML = val ? '<span class="badge badge-success">Rồi</span>' : '<span class="badge badge-gray">Chưa</span>';
      } else if (statsCurrencyColumns.has(col)) {
        td.innerText = utils.formatCurrency(val) + 'đ';
        td.style.textAlign = 'right';
      } else {
        td.innerText = val !== null && val !== undefined ? val : '';
      }

      tr.appendChild(td);
    });

    bindStatsRowEvents(tr, row);
    body.appendChild(tr);
    if (hasStatsAxisChild(row)) {
      body.appendChild(createStatsAxisChildRow(row, cols.length, true));
    }
  });

  updateStatsSelectionSummary();
  updateStatsLayoutDebug('render-detail');
}

// Nút lọc trên tiêu đề cột: gắn sự kiện bằng addEventListener (không dùng onclick nội tuyến).
function bindStatsHeaderFilterButtons(header) {
  header.querySelectorAll?.('[data-stats-column]').forEach(button => {
    button.addEventListener('click', event => openStatsColumnFilter(event, button.dataset.statsColumn));
  });
}

function bindStatsRowEvents(tr, row) {
  tr.addEventListener('mousedown', function(e) {
    if (e.shiftKey) e.preventDefault();
  });
  tr.addEventListener('click', function(e) {
    handleStatsRowClick(e, this);
  });
  tr.addEventListener('dblclick', () => {
    openEditOrderDialog(row.id, statsActiveSubtab);
  });
  tr.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    if (!this.classList.contains('selected')) {
      document.querySelectorAll('#stats-table-body tr').forEach(r => r.classList.remove('selected'));
      this.classList.add('selected');
    }
    updateStatsSelectionSummary();
    showStatsContextMenu(e, row);
  });
}

// 7. Lọc dữ liệu bằng Search & Comboboxes (Offline Filter cực nhanh)
function getFilteredStatsOrders() {
  const query = document.getElementById('stats-search').value.toLowerCase().trim();
  const monthFilter = document.getElementById('stats-month-filter').value;
  const statusFilter = document.getElementById('stats-status-filter').value;
  const dateFrom = document.getElementById('stats-date-from')?.value || '';
  const dateTo = document.getElementById('stats-date-to')?.value || '';
  const giaoFilter = document.getElementById('stats-giao-filter')?.value || 'all';
  const ctvQuery = (document.getElementById('stats-ctv-filter')?.value || '').toLowerCase().trim();

  const today = new Date();
  today.setHours(0,0,0,0);

  const filtered = statsAllOrders.filter(row => {
    // A. Lọc từ khóa tìm kiếm
    const matchQuery = !query || 
      [row.id, row.ten_hang, row.ten_khach_hang, row.ten_truc].some(value => String(value ?? '').toLowerCase().includes(query));

    // B. Lọc tháng đặt hàng
    const matchMonth = statsMonthFilterMatches(row.thoi_gian, monthFilter, today);

    // C. Lọc trạng thái
    const dueDate = new Date(row.ngay_du_kien || NaN);
    dueDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    let matchStatus = true;
    if (statusFilter === 'near-due') {
      matchStatus = !row.da_giao && diffDays >= 0 && diffDays <= 3;
    } else if (statusFilter === 'overdue') {
      matchStatus = !row.da_giao && diffDays < 0;
    } else if (statusFilter === 'unsettled') {
      matchStatus = !row.da_tat_toan;
    } else if (statusFilter === 'finished') {
      matchStatus = row.da_tat_toan;
    }

    const matchColumnFilters = Object.entries(statsColumnFilters).every(([key, selectedValues]) => {
      const col = getStatsFilterColumn(key);
      return !col || selectedValues.has(String(col.value(row)));
    });

    const matchCtv = !ctvQuery || [row.ctv, row.loai_truc === 'moi' ? row.truc_ctv : ''].some(value => String(value ?? '').toLowerCase().includes(ctvQuery));

    let matchGiao = true;
    if (giaoFilter === 'giao') matchGiao = !!row.da_giao;
    if (giaoFilter === 'chua') matchGiao = !row.da_giao;

    let matchDateRange = true;
    const orderDate = new Date(row.thoi_gian);
    orderDate.setHours(0, 0, 0, 0);
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (orderDate < from) matchDateRange = false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(0, 0, 0, 0);
      if (orderDate > to) matchDateRange = false;
    }

    return matchQuery && matchMonth && matchStatus && matchColumnFilters && matchCtv && matchGiao && matchDateRange;
  });

  return sortStatsOrders(filtered);
}

// Lọc theo tháng phải so cả NĂM, không chỉ getMonth(). Giá trị "YYYY-MM" dùng trực tiếp;
// giá trị chỉ có tháng lấy năm từ ô stats-year-filter (nếu có), nếu không thì lấy lần gần nhất
// của tháng đó: năm nay, hoặc năm trước nếu tháng đó chưa tới.
function statsMonthFilterMatches(dateValue, monthFilter, now = new Date()) {
  if (!monthFilter || monthFilter === 'all') return true;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  let year;
  let month;
  const yearMonth = /^(\d{4})-(\d{1,2})$/.exec(String(monthFilter));
  if (yearMonth) {
    year = Number(yearMonth[1]);
    month = Number(yearMonth[2]);
  } else {
    month = Number(monthFilter);
    const yearControl = typeof document !== 'undefined' ? document.getElementById('stats-year-filter')?.value : '';
    year = /^\d{4}$/.test(String(yearControl || ''))
      ? Number(yearControl)
      : (month <= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() - 1);
  }
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

function filterStatsTable() {
  renderStatsTable(getFilteredStatsOrders());
}

function getStatsFilterColumn(key) {
  const summary = statsColumnDefs.find(col => col.key === key);
  if (summary) return summary;
  if (!(statsDetailColumnsMap[getStatsOrderTypeKey()] || []).includes(key)) return null;
  return { key, label: statsDetailColumnHeaders[key] || key, value: row => row[key] ?? '' };
}

function compareStatsValues(a, b, key) {
  if (key === 'thoi_gian' || key === 'ngay_du_kien') {
    a = a ? Date.parse(a) : NaN;
    b = b ? Date.parse(b) : NaN;
  } else if (statsCurrencyColumns.has(key) || ['so_luong', 'truc_so_luong', 'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 'cuon_cay', 'truc_chu_vi', 'hoa_hong', 'truc_hoa_hong'].includes(key)) {
    a = a === null || a === undefined || a === '' ? NaN : Number(a);
    b = b === null || b === undefined || b === '' ? NaN : Number(b);
  }
  const missing = value => value === null || value === undefined || value === '' || (typeof value === 'number' && !Number.isFinite(value));
  if (missing(a) || missing(b)) return missing(a) === missing(b) ? 0 : (missing(a) ? 1 : -1);
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'vi', { numeric: true, sensitivity: 'base' });
}

function sortStatsOrders(rows) {
  if (!statsSort.key) return [...rows];
  return [...rows].sort((a, b) => compareStatsValues(a[statsSort.key], b[statsSort.key], statsSort.key) * (statsSort.direction === 'desc' ? -1 : 1));
}

function setStatsSort(key, direction) {
  if (!getStatsFilterColumn(key) || !['asc', 'desc'].includes(direction)) return;
  statsSort = { key, direction };
  closeStatsColumnFilterMenu();
  filterStatsTable();
}

function openStatsColumnFilter(event, columnKey) {
  event.preventDefault();
  event.stopPropagation();

  const menu = document.getElementById('stats-column-filter-menu');
  const column = getStatsFilterColumn(columnKey);
  if (!menu || !column) return;

  closeStatsColumnFilterMenu();

  const rawValues = new Map(statsAllOrders.map(row => [String(column.value(row)), row[columnKey]]));
  const values = [...rawValues.keys()].sort((a, b) => compareStatsValues(rawValues.get(a), rawValues.get(b), columnKey));
  const isFiltered = Object.prototype.hasOwnProperty.call(statsColumnFilters, columnKey);
  const activeValues = isFiltered ? statsColumnFilters[columnKey] : new Set(values);

  menu.innerHTML = `
    <div class="column-filter-title">${utils.escapeHtml(column.label)}</div>
    <div class="column-filter-actions column-sort-actions">
      <button type="button" data-stats-sort="asc">↑ Sắp xếp tăng dần</button>
      <button type="button" data-stats-sort="desc">↓ Sắp xếp giảm dần</button>
    </div>
    <input class="column-filter-search" type="text" placeholder="Tìm giá trị...">
    <div class="column-filter-actions">
      <button type="button" data-stats-filter-action="all">Tất cả</button>
      <button type="button" data-stats-filter-action="none">Bỏ chọn tất cả</button>
      <button type="button" class="column-filter-clear-action" data-stats-filter-action="clear">Xóa lọc</button>
    </div>
    <div class="column-filter-values">
      ${values.map((value, index) => `
        <label class="column-filter-value">
          <input type="checkbox" ${activeValues.has(value) ? 'checked' : ''} data-value-index="${index}">
          <span>${utils.escapeHtml(value || '(Trống)')}</span>
        </label>
      `).join('')}
    </div>
  `;

  menu.querySelectorAll('[data-stats-sort]').forEach(button => {
    button.addEventListener('click', () => setStatsSort(columnKey, button.dataset.statsSort));
  });
  menu.querySelector('.column-filter-search')?.addEventListener('input', e => filterColumnFilterValues(e.target.value));
  const filterActions = { all: setStatsColumnFilterAll, none: deselectAllStatsColumnFilter, clear: clearStatsColumnFilter };
  menu.querySelectorAll('[data-stats-filter-action]').forEach(button => {
    button.addEventListener('click', () => filterActions[button.dataset.statsFilterAction]?.(columnKey));
  });
  menu.querySelectorAll('input[data-value-index]').forEach(input => {
    input.addEventListener('change', () => toggleStatsColumnFilterValue(columnKey, values[Number(input.dataset.valueIndex)], input.checked));
  });

  const trigger = event.currentTarget;
  const rect = trigger.getBoundingClientRect();
  menu.style.display = 'block';
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;
  menu.style.top = `${rect.bottom + 6}px`;

  statsColumnFilterCloseHandler = function closeMenu(e) {
    if (!menu.contains(e.target) && e.target !== trigger && !trigger?.contains?.(e.target)) {
      closeStatsColumnFilterMenu();
    }
  };
  document.addEventListener('mousedown', statsColumnFilterCloseHandler);
}

function closeStatsColumnFilterMenu() {
  const menu = document.getElementById('stats-column-filter-menu');
  if (menu) menu.style.display = 'none';
  if (statsColumnFilterCloseHandler) {
    document.removeEventListener('mousedown', statsColumnFilterCloseHandler);
    statsColumnFilterCloseHandler = null;
  }
}

function toggleStatsColumnFilterValue(columnKey, value, checked) {
  const column = getStatsFilterColumn(columnKey);
  if (!column) return;

  const allValues = new Set(statsAllOrders.map(row => String(column.value(row))));
  if (!Object.prototype.hasOwnProperty.call(statsColumnFilters, columnKey)) {
    statsColumnFilters[columnKey] = new Set(allValues);
  }

  if (checked) {
    statsColumnFilters[columnKey].add(value);
  } else {
    statsColumnFilters[columnKey].delete(value);
  }

  if (allValues.size > 0 && [...allValues].every(value => statsColumnFilters[columnKey].has(value))) {
    delete statsColumnFilters[columnKey];
  }
  filterStatsTable();
}

function setStatsColumnFilterAll(columnKey) {
  delete statsColumnFilters[columnKey];
  document.querySelectorAll('#stats-column-filter-menu .column-filter-value input[type="checkbox"]').forEach(input => {
    input.checked = true;
  });
  filterStatsTable();
}

function deselectAllStatsColumnFilter(columnKey) {
  statsColumnFilters[columnKey] = new Set();
  document.querySelectorAll('#stats-column-filter-menu .column-filter-value input[type="checkbox"]').forEach(input => {
    input.checked = false;
  });
  filterStatsTable();
}

function clearStatsColumnFilter(columnKey) {
  delete statsColumnFilters[columnKey];
  const menu = document.getElementById('stats-column-filter-menu');
  const searchInput = menu?.querySelector('.column-filter-search');
  if (searchInput) searchInput.value = '';
  filterColumnFilterValues('');
  menu?.querySelectorAll('.column-filter-value input[type="checkbox"]').forEach(input => {
    input.checked = true;
  });
  filterStatsTable();
}

function clearAllStatsFilters() {
  statsSort = { key: null, direction: 'asc' };
  const defaults = {
    'stats-search': '',
    'stats-month-filter': 'all',
    'stats-status-filter': 'all',
    'stats-date-from': '',
    'stats-date-to': '',
    'stats-giao-filter': 'all',
    'stats-ctv-filter': ''
  };

  Object.entries(defaults).forEach(([id, value]) => {
    const control = document.getElementById(id);
    if (control) control.value = value;
  });
  statsColumnFilters = {};
  statsLastSelectedIndex = -1;
  closeStatsColumnFilterMenu();
  filterStatsTable();
}

function filterColumnFilterValues(query) {
  const normalized = String(query || '').toLowerCase().trim();
  document.querySelectorAll('#stats-column-filter-menu .column-filter-value').forEach(label => {
    label.style.display = label.innerText.toLowerCase().includes(normalized) ? 'flex' : 'none';
  });
}
// 8. Hiển thị menu chuột phải (Context Menu)
function showStatsContextMenu(e, row) {
  const menu = document.getElementById('custom-context-menu');
  if (!menu) return;

  const orderId = row.id;
  const subtab = statsActiveSubtab;
  menu.innerHTML = `
    <div class="context-menu-item" data-stats-menu-action="delivery">
      <span>🚚</span> <span>Đánh dấu ${row.da_giao ? 'Chưa giao' : 'Đã giao'}</span>
    </div>
    <div class="context-menu-item" data-stats-menu-action="settlement">
      <span>💳</span> <span>Đánh dấu ${row.da_tat_toan ? 'Chưa tất toán' : 'Đã tất toán'}</span>
    </div>
    <hr style="border:0; border-top: 1px solid var(--border-color); margin: 4px 0;">
    <div class="context-menu-item" data-stats-menu-action="export">
      <span>🖨️</span> <span>Xem & In phiếu giao hàng</span>
    </div>
    <div class="context-menu-item" data-stats-menu-action="email">
      <span>📧</span> <span>Gửi email thông báo đơn</span>
    </div>
    <div class="context-menu-item" data-stats-menu-action="edit">
      <span>✏️</span> <span>Sửa đổi đơn hàng</span>
    </div>
    <hr style="border:0; border-top: 1px solid var(--border-color); margin: 4px 0;">
    <div class="context-menu-item" data-stats-menu-action="delete">
      <span>🗑️</span> <span>Xóa đơn hàng</span>
    </div>
  `;

  // Mã đơn nằm trong closure, không chèn thô vào HTML/JS nội tuyến.
  const actions = {
    delivery: () => toggleDeliveryStatus(orderId),
    settlement: () => toggleSettlementStatus(orderId),
    export: () => openOrderExportDialog(orderId, subtab),
    email: () => sendOrderNotificationEmail(orderId, subtab),
    edit: () => openEditOrderDialog(orderId, subtab),
    delete: () => deleteSelectedStats()
  };
  menu.querySelectorAll('[data-stats-menu-action]').forEach(item => {
    item.addEventListener('click', () => actions[item.dataset.statsMenuAction]?.());
  });

  menu.style.display = 'block';
  menu.style.left = `${e.pageX}px`;
  menu.style.top = `${e.pageY}px`;

  // Tự động đóng menu khi click ra ngoài: luôn dùng cùng một hàm nên không cộng dồn listener.
  document.removeEventListener('click', closeStatsContextMenu);
  setTimeout(() => document.addEventListener('click', closeStatsContextMenu), 100);
}

function closeStatsContextMenu() {
  const menu = document.getElementById('custom-context-menu');
  if (menu) menu.style.display = 'none';
  document.removeEventListener('click', closeStatsContextMenu);
}

// 9. Thực hiện thay đổi trạng thái giao hàng từ chuột phải
// Trạng thái đích tính từ giá trị mới nhất trong DB (NOT da_giao) thay vì giá trị cũ trên màn hình,
// tránh ghi đè khi máy khác vừa đổi trạng thái.
async function toggleDeliveryStatus(orderId) {
  const res = await window.electronAPI.dbRun('order.toggleDelivery', { orderType: getStatsOrderTypeKey(), id: orderId });

  if (res.ok && Number(res.rowCount ?? res.rows?.length ?? 0) > 0) {
    const delivered = !!res.rows?.[0]?.da_giao;
    utils.showToast(`Đã chuyển đơn ${orderId} sang ${delivered ? 'Đã giao' : 'Chưa giao'}`, "success");
    loadStatsData();
    if (typeof loadDashboardData === 'function') loadDashboardData();
  } else if (res.ok) {
    utils.showToast(`Không tìm thấy đơn ${orderId} để cập nhật`, "danger");
    loadStatsData();
  } else {
    utils.showToast("Không thể thay đổi trạng thái giao hàng", "danger");
  }
}

// 10. Thực hiện thay đổi trạng thái tất toán từ chuột phải
// Đảo trạng thái dựa trên giá trị hiện tại trong DB; công nợ tính lại trong cùng câu lệnh
// (SQL dựng ở tiến trình chính: order.toggleSettlement / order.setDeliveryAndSettlement).
async function toggleSettlementStatus(orderId) {
  const res = await window.electronAPI.dbRun('order.toggleSettlement', { orderType: getStatsOrderTypeKey(), id: orderId });

  if (res.ok && Number(res.rowCount ?? res.rows?.length ?? 0) === 0) {
    utils.showToast(`Không tìm thấy đơn ${orderId} để cập nhật`, "danger");
    loadStatsData();
  } else if (res.ok) {
    utils.showToast(`Đã cập nhật trạng thái tất toán đơn ${orderId}`, "success");
    loadStatsData();
    if (typeof loadDashboardData === 'function') loadDashboardData();
  } else {
    utils.showToast("Không thể cập nhật trạng thái tất toán", "danger");
  }
}

function getSelectedStatsOrderIds() {
  return Array.from(document.querySelectorAll('#stats-table-body tr.selected'))
    .map(row => row.dataset.id)
    .filter(Boolean);
}

async function deleteSelectedStats() {
  const selectedIds = getSelectedStatsOrderIds();
  if (selectedIds.length === 0) {
    utils.showToast("Vui lòng chọn ít nhất 1 đơn hàng cần xóa", "warning");
    return;
  }

  if (!await utils.confirmAction(
    `Bạn có chắc chắn muốn xóa ${selectedIds.length} đơn hàng đã chọn không?\nHành động này không thể hoàn tác!`,
    { title: 'Xóa đơn hàng', confirmText: 'Xóa', danger: true }
  )) {
    return;
  }

  const orderType = getStatsOrderTypeKey();
  let successCount = 0;
  const failedIds = [];

  for (const id of selectedIds) {
    // Xóa đơn và tệp đính kèm trong cùng một transaction để không để lại tệp mồ côi.
    let res;
    try {
      res = await window.electronAPI.dbTransaction([
        { action: 'order.delete', params: { orderType, id } },
        { action: 'attachment.deleteForOrder', params: { orderId: id, orderType } }
      ]);
    } catch (err) {
      res = { ok: false, error: err?.message };
    }
    if (res?.ok && Number(res.results?.[0]?.rowCount || 0) > 0) {
      successCount++;
    } else {
      failedIds.push(id);
    }
  }

  if (failedIds.length > 0) {
    utils.showToast(
      `Đã xóa ${successCount}/${selectedIds.length} đơn hàng. Không xóa được: ${failedIds.join(', ')}`,
      successCount > 0 ? "warning" : "danger"
    );
  } else {
    utils.showToast(`Đã xóa thành công ${successCount}/${selectedIds.length} đơn hàng`, "success");
  }
  loadStatsData();
  if (typeof loadDashboardData === 'function') loadDashboardData();
}

async function exportStatsExcel() {
  const selectedIds = getSelectedStatsOrderIds();
  let rowsToExport = [];

  if (selectedIds.length === 0) {
    rowsToExport = getFilteredStatsOrders();
  } else {
    rowsToExport = getFilteredStatsOrders().filter(row => selectedIds.includes(row.id));
  }

  if (rowsToExport.length === 0) {
    utils.showToast("Không có dữ liệu đơn hàng để xuất Excel", "warning");
    return;
  }

  try {
    const orderType = getStatsOrderTypeKey();
    const excelData = buildStatsExcelRows(rowsToExport, orderType);

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = Object.keys(excelData[0]).map(key => ({ wch: key === 'Tên Hàng' ? 42 : Math.max(16, key.length + 2) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Đơn hàng');

    const savePath = await window.electronAPI.showSaveDialog({
      title: 'Lưu file xuất Excel',
      defaultPath: `don_hang_${orderType}_${utils.toDateInputValue(new Date())}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (savePath && !savePath.canceled && savePath.filePath) {
      const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const result = await window.electronAPI.writeFileBase64(savePath.filePath, base64);
      if (!result.ok) throw new Error(result.error || 'Không thể ghi file Excel');
      utils.showToast('Xuất Excel thành công!', 'success');
    }
  } catch (err) {
    utils.showToast('Lỗi xuất Excel: ' + err.message, 'danger');
  }
}

function buildStatsOrderExcelRow(row, orderType) {
  const exportObj = {};
  const cols = (statsDetailColumnsMap[orderType] || []).filter(col => orderType !== 'bang_keo_in' || !(col.startsWith('truc_') || col === 'ten_truc'));
  cols.forEach(col => {
    const key = statsDetailColumnHeaders[col] || col;
    const val = row[col];
    if (col === 'thoi_gian' || col === 'ngay_du_kien') {
      exportObj[key] = utils.formatDate(val);
    } else if (col === 'da_giao' || col === 'da_tat_toan' || col === 'da_gui_email') {
      // Một từ duy nhất mà parseImportBoolean (excelImport.js) đọc lại được: 'roi' / 'xong'.
      exportObj[key] = val ? (col === 'da_tat_toan' ? 'Xong' : 'Rồi') : 'Chưa';
    } else {
      exportObj[key] = statsCurrencyColumns.has(col) || ['so_luong', 'hoa_hong', 'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 'cuon_cay'].includes(col)
        ? (val == null || val === '' ? '' : (statsCurrencyColumns.has(col) ? orderMath.money(val) : Number(val))) : val;
    }
  });
  // Cùng số đã làm tròn như màn hình/PDF: VAT (%) 2 chữ số thập phân, tiền làm tròn đồng.
  const total = Math.max(0, orderMath.money(row.thanh_tien_ban));
  const vat = Math.max(0, orderMath.money(row.vat));
  if (Object.prototype.hasOwnProperty.call(exportObj, 'VAT')) exportObj['VAT'] = vat;
  exportObj['VAT (%)'] = orderMath.vatPercentFromAmount(vat, total, row.vat_percent);
  exportObj['Thành Tiền Gồm VAT'] = total + vat;
  exportObj['Chu Vi Trục'] = '';
  exportObj['Ghi Chú'] = '';
  return exportObj;
}

function buildBkiAxisInlineExcelRow(axis) {
  return {
    'Mã Đơn Hàng': `↳ ${axis['Mã Đơn Hàng']}`,
    'Ngày Tạo': axis['Ngày Tạo'],
    'Tên Hàng': `↳ Trục kèm BKI: ${axis['Tên Trục'] || ''}`,
    'Khách Hàng': axis['Khách Hàng'],
    'Loại Trục': 'Trục kèm BKI',
    'Chu Vi Trục': axis['Chu Vi Trục'],
    'Số Lượng': axis['Số Lượng Trục'],
    'Giá Gốc': axis['Giá Gốc Trục'],
    'Giá Bán': axis['Giá Bán Trục'],
    'VAT': axis['Tiền VAT Trục'],
    'VAT (%)': axis['VAT Trục (%)'],
    'Thành Tiền Gồm VAT': axis['Giá Trục Gồm VAT'],
    'Tiền Gốc': axis['Thành Tiền Gốc Trục'],
    'Tiền Bán': axis['Thành Tiền Bán Trục'],
    'CTV': axis['CTV Trục'],
    'Hoa Hồng (%)': axis['Hoa Hồng Trục (%)'],
    'Tiền H.Hồng': axis['Tiền Hoa Hồng Trục'],
    'Lợi Nhuận': axis['Lãi Trục'],
    'Lợi Nhuận Ròng': axis['Lãi Ròng Trục'],
    'Ghi Chú': `VAT ${axis['VAT Trục (%)']}% · Giá gồm VAT ${utils.formatCurrency(axis['Giá Trục Gồm VAT'])}đ`
  };
}

function buildStatsExcelRows(orders = [], orderType = getStatsOrderTypeKey()) {
  const result = [];
  orders.forEach(order => {
    result.push(buildStatsOrderExcelRow(order, orderType));
    if (orderType === 'bang_keo_in') {
      buildBkiAxisExcelRows([order]).forEach(axis => {
        result.push(buildBkiAxisInlineExcelRow(axis));
      });
    }
  });
  return result;
}

function parseBkiQuoteItemsForExcel(row = {}) {
  let items = row.quote_items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (_) { items = []; }
  }
  return Array.isArray(items) ? items : [];
}

function bkiQuoteAxesMatchOrder(order = {}) {
  const items = parseBkiQuoteItemsForExcel(order);
  const axes = items.flatMap(item => (Array.isArray(item?.axes) ? item.axes : []).filter(axis => axis && typeof axis === 'object'));
  if (axes.length === 0) return true;
  const hasDbAxisTotals = order.truc_thanh_tien_ban !== null && order.truc_thanh_tien_ban !== undefined && order.truc_thanh_tien_ban !== '';
  if (!hasDbAxisTotals) return true;
  if (order.loai_truc !== 'moi') return false;
  const jsonSale = axes.reduce((sum, axis) => sum + Math.max(0, orderMath.money(axis.total ?? orderMath.number(axis.quantity) * orderMath.number(axis.unitPrice))), 0);
  const jsonVat = axes.reduce((sum, axis) => sum + Math.max(0, orderMath.money(axis.vat)), 0);
  return jsonSale === Math.max(0, orderMath.money(order.truc_thanh_tien_ban))
    && jsonVat === Math.max(0, orderMath.money(order.truc_vat));
}

function buildBkiAxisExcelRow(order, axis, specification, axisIndex) {
  const quantity = Number(axis.quantity ?? axis.truc_so_luong ?? 0) || 0;
  const costPrice = Number(axis.costPrice ?? axis.truc_gia_goc ?? (quantity > 0 ? Number(axis.costTotal || 0) / quantity : 0)) || 0;
  const salePrice = Number(axis.unitPrice ?? axis.truc_gia_ban ?? 0) || 0;
  const saleTotal = Math.max(0, orderMath.money(axis.total ?? axis.truc_thanh_tien_ban ?? (quantity * salePrice)));
  const storedPercent = Number(axis.vatPercent ?? axis.truc_vat_percent ?? 0) || 0;
  const vatAmount = Math.max(0, orderMath.money(axis.vat ?? axis.truc_vat ?? orderMath.vatAmount(saleTotal, storedPercent)));
  const vatPercent = orderMath.vatPercentFromAmount(vatAmount, saleTotal, storedPercent);

  return {
    'Mã Đơn Hàng': order.id || '',
    'Ngày Tạo': utils.formatDate(order.thoi_gian),
    'Tên Hàng BKI': order.ten_hang || '',
    'Khách Hàng': order.ten_khach_hang || '',
    'Quy Cách BKI': specification || '',
    'STT Trục': axisIndex + 1,
    'Tên Trục': axis.name ?? axis.ten_truc ?? '',
    'Chu Vi Trục': axis.circumference ?? axis.truc_chu_vi ?? '',
    'Số Lượng Trục': quantity,
    'Giá Gốc Trục': costPrice,
    'Giá Bán Trục': salePrice,
    'Thành Tiền Gốc Trục': Math.max(0, orderMath.money(axis.costTotal ?? axis.truc_thanh_tien_goc ?? (quantity * costPrice))),
    'Thành Tiền Bán Trục': saleTotal,
    'VAT Trục (%)': vatPercent,
    'Tiền VAT Trục': vatAmount,
    'Giá Trục Gồm VAT': saleTotal + vatAmount,
    'CTV Trục': axis.collaborator ?? axis.truc_ctv ?? '',
    'Hoa Hồng Trục (%)': Number(axis.commissionPercent ?? axis.truc_hoa_hong ?? 0) || 0,
    'Tiền Hoa Hồng Trục': Number(axis.commission ?? axis.truc_tien_hoa_hong ?? 0) || 0,
    'Lãi Trục': Number(axis.profit ?? axis.truc_loi_nhuan ?? 0) || 0,
    'Lãi Ròng Trục': Number(axis.netProfit ?? axis.truc_loi_nhuan_rong ?? 0) || 0
  };
}

function buildBkiAxisExcelRows(orders = []) {
  const result = [];

  orders.forEach(order => {
    // quote_items có thể đã cũ nếu đơn được sửa sau khi chuyển từ báo giá (qua các cột truc_*):
    // khi tổng trục trong JSON lệch các cột DB thì dùng cột DB để Excel khớp cong_no_khach.
    const items = bkiQuoteAxesMatchOrder(order) ? parseBkiQuoteItemsForExcel(order) : [];
    let storedAxisCount = 0;

    items.forEach(item => {
      const axes = Array.isArray(item?.axes) ? item.axes.filter(axis => axis && typeof axis === 'object') : [];
      axes.forEach(axis => {
        result.push(buildBkiAxisExcelRow(order, axis, item.specification, storedAxisCount));
        storedAxisCount += 1;
      });
    });

    // Đơn bán hàng BKI hiện lưu một trục kèm trực tiếp trên bản ghi.
    // Không thêm lại dòng tổng hợp nếu quote_items đã chứa các trục chi tiết.
    if (storedAxisCount === 0 && order.loai_truc === 'moi') {
      const specification = [
        order.quy_cach_mm ? `${order.quy_cach_mm}mm` : '',
        order.quy_cach_m ? `${order.quy_cach_m}m` : '',
        order.quy_cach_mic ? `${order.quy_cach_mic}mic` : ''
      ].filter(Boolean).join(' x ');
      result.push(buildBkiAxisExcelRow(order, {
        ten_truc: order.ten_truc,
        truc_chu_vi: order.truc_chu_vi,
        truc_so_luong: order.truc_so_luong,
        truc_gia_goc: order.truc_gia_goc,
        truc_gia_ban: order.truc_gia_ban,
        truc_thanh_tien_goc: order.truc_thanh_tien_goc,
        truc_thanh_tien_ban: order.truc_thanh_tien_ban,
        truc_vat: order.truc_vat,
        truc_vat_percent: order.truc_vat_percent,
        truc_ctv: order.truc_ctv,
        truc_hoa_hong: order.truc_hoa_hong,
        truc_tien_hoa_hong: order.truc_tien_hoa_hong,
        truc_loi_nhuan: order.truc_loi_nhuan,
        truc_loi_nhuan_rong: order.truc_loi_nhuan_rong
      }, specification, 0));
    }
  });

  return result;
}

async function sendSelectedStatsEmail() {
  const selectedIds = getSelectedStatsOrderIds();
  if (selectedIds.length === 0) {
    utils.showToast('Vui lòng chọn 1 đơn hàng cần gửi email', 'warning');
    return;
  }

  sendOrderNotificationEmail(selectedIds[0], statsActiveSubtab);
}

async function openAttachmentsManager() {
  const selectedIds = getSelectedStatsOrderIds();
  if (selectedIds.length === 0) {
    utils.showToast('Vui lòng chọn 1 đơn hàng để đính kèm tệp', 'warning');
    return;
  }

  selectedOrderIdForAttachments = selectedIds[0];
  statsAttachmentContext = { orderId: selectedIds[0], orderType: getStatsOrderTypeKey() };
  document.getElementById('attach-status-label').innerText = `Đơn hàng: ${selectedOrderIdForAttachments}`;
  await loadAttachmentsList();
  document.getElementById('modal-attachments').classList.add('active');
}

async function loadAttachmentsList(context = statsAttachmentContext) {
  const body = document.getElementById('attachments-table-body');
  if (!body) return;
  if (!context?.orderId) {
    body.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Chưa chọn đơn hàng</td></tr>';
    return;
  }

  body.innerHTML = '<tr><td colspan="3" style="text-align:center;">Đang tải tệp tin...</td></tr>';

  let res;
  try {
    res = await window.electronAPI.dbQuery('attachment.listForOrder', { orderId: context.orderId, orderType: context.orderType });
  } catch (err) {
    res = { ok: false, error: err?.message };
  }
  // Hộp thoại đã chuyển sang đơn khác trong lúc chờ: bỏ kết quả cũ.
  if (context !== statsAttachmentContext) return;
  if (!res.ok) {
    body.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--color-danger);">Không thể tải tệp tin</td></tr>';
    return;
  }

  body.innerHTML = '';
  if (res.rows.length === 0) {
    body.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Chưa có tệp đính kèm nào</td></tr>';
    return;
  }

  res.rows.forEach(att => {
    const tr = document.createElement('tr');
    const sizeKB = (att.file_size / 1024).toFixed(1) + ' KB';
    const nameCell = document.createElement('td');
    const nameStrong = document.createElement('strong');
    nameStrong.textContent = att.file_name;
    nameCell.appendChild(nameStrong);
    const sizeCell = document.createElement('td');
    sizeCell.textContent = sizeKB;
    const actionCell = document.createElement('td');
    actionCell.style.textAlign = 'right';
    const downloadButton = document.createElement('button');
    downloadButton.className = 'btn btn-secondary btn-sm';
    downloadButton.textContent = 'Tải';
    downloadButton.addEventListener('click', () => downloadAttachmentFile(att.id, att.file_name));
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-danger btn-sm';
    deleteButton.textContent = 'Xóa';
    deleteButton.addEventListener('click', () => deleteAttachmentFile(att.id));
    actionCell.append(downloadButton, deleteButton);
    tr.append(nameCell, sizeCell, actionCell);
    body.appendChild(tr);
  });
}

async function downloadAttachmentFile(attId, fileName) {
  try {
    utils.showToast('Đang tải tệp tin...', 'warning');
    const res = await window.electronAPI.dbQuery('attachment.getData', { id: attId });

    if (!res.ok || res.rows.length === 0) {
      utils.showToast('Lỗi tải tệp: file không tồn tại', 'danger');
      return;
    }

    const att = res.rows[0];
    const bytes = base64ToUint8Array(att.base64_data);
    const blob = new Blob([bytes], { type: att.content_type || 'application/octet-stream' });
    const link = document.createElement('a');
    const objectUrl = window.URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = String(fileName || 'tep-dinh-kem').replace(/[\\/:*?"<>|]/g, '_');
    link.click();
    // Giải phóng bộ nhớ của Blob sau khi trình duyệt đã nhận lệnh tải.
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    utils.showToast('Đã tải xuống tệp tin', 'success');
  } catch (err) {
    console.error('Lỗi tải tệp: ', err);
    utils.showToast('Lỗi tải tệp: ' + (err?.message || 'không đọc được dữ liệu'), 'danger');
  }
}

// Giải mã base64 thẳng vào Uint8Array (không tạo mảng số JS trung gian với tệp lớn).
function base64ToUint8Array(base64) {
  const binary = atob(String(base64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deleteAttachmentFile(attId) {
  const context = statsAttachmentContext;
  if (!context?.orderId) return;
  if (!await utils.confirmAction(
    'Bạn có chắc muốn xóa tệp đính kèm này?',
    { title: 'Xóa tệp đính kèm', confirmText: 'Xóa', danger: true }
  )) return;

  let res;
  try {
    res = await window.electronAPI.dbRun('attachment.delete', {
      id: attId, orderId: context.orderId, orderType: context.orderType
    });
  } catch (err) {
    res = { ok: false, error: err?.message };
  }
  if (res.ok && Number(res.rowCount ?? 1) > 0) {
    utils.showToast('Đã xóa tệp đính kèm thành công', 'success');
    loadAttachmentsList(context);
  } else {
    utils.showToast('Không thể xóa tệp đính kèm', 'danger');
  }
}

// Chuyển ArrayBuffer sang base64 theo từng khối (cộng chuỗi từng byte là O(n^2) với tệp lớn).
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const parts = [];
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(offset, offset + chunkSize)));
  }
  return btoa(parts.join(''));
}

async function uploadAttachmentFile(input) {
  if (!input.files.length) return;

  const file = input.files[0];
  if (file.size > 25 * 1024 * 1024) {
    utils.showToast('Tệp đính kèm vượt quá giới hạn 25 MB', 'warning');
    input.value = '';
    return;
  }

  // Chốt đơn đích trước khi FileReader chạy: người dùng có thể đổi tab/đơn trong lúc đọc tệp.
  const context = statsAttachmentContext ? { ...statsAttachmentContext } : null;
  if (!context?.orderId) {
    utils.showToast('Chưa chọn đơn hàng để đính kèm tệp', 'warning');
    input.value = '';
    return;
  }

  utils.showToast('Đang tải tệp lên...', 'warning');
  const fileReader = new FileReader();

  fileReader.onload = async function() {
    try {
      const base64Data = arrayBufferToBase64(this.result);

      const res = await window.electronAPI.dbRun('attachment.insert', {
        orderType: context.orderType,
        orderId: context.orderId,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        base64: base64Data
      });

      if (res.ok) {
        utils.showToast('Đã thêm tệp đính kèm mới!', 'success');
        if (statsAttachmentContext?.orderId === context.orderId && statsAttachmentContext?.orderType === context.orderType) {
          loadAttachmentsList();
        }
      } else {
        utils.showToast('Lỗi đính kèm: ' + (res.error || 'không lưu được tệp'), 'danger');
      }
    } catch (err) {
      console.error('Lỗi đính kèm tệp: ', err);
      utils.showToast('Lỗi đính kèm: ' + (err?.message || 'không lưu được tệp'), 'danger');
    }
  };
  fileReader.onerror = function() {
    utils.showToast('Không đọc được tệp đính kèm', 'danger');
  };

  fileReader.readAsArrayBuffer(file);
  input.value = '';
}

function openBulkStatsStatusDialog() {
  const selectedIds = getSelectedStatsOrderIds();
  if (selectedIds.length === 0) {
    utils.showToast("Vui lòng chọn ít nhất 1 đơn trong bảng thống kê", "warning");
    return;
  }

  const label = document.getElementById('bulk-stats-status-label');
  if (label) label.innerText = `${selectedIds.length} đơn đã chọn`;
  document.getElementById('bulk-stats-da-giao').value = '';
  document.getElementById('bulk-stats-da-tat-toan').value = '';
  document.getElementById('modal-bulk-stats-status').classList.add('active');
}

async function applyBulkStatsStatus() {
  const selectedIds = getSelectedStatsOrderIds();
  if (selectedIds.length === 0) {
    utils.showToast("Không còn đơn nào được chọn", "warning");
    closeModal('modal-bulk-stats-status');
    return;
  }

  // '' = giữ nguyên, 'true' / 'false' = đặt cờ; mọi đơn cập nhật trong MỘT transaction (lỗi thì không đơn nào đổi)
  const flag = id => ({ true: true, false: false }[document.getElementById(id).value] ?? null);
  const delivered = flag('bulk-stats-da-giao');
  const settled = flag('bulk-stats-da-tat-toan');
  if (delivered === null && settled === null) {
    utils.showToast("Chọn ít nhất một trạng thái cần đổi", "warning");
    return;
  }
  const orderType = getStatsOrderTypeKey();
  const res = await window.electronAPI.dbTransaction(selectedIds.map(id => ({
    action: 'order.setDeliveryAndSettlement', params: { orderType, id, delivered, settled }
  })));

  closeModal('modal-bulk-stats-status');
  if (res?.ok) {
    const updated = (res.results || []).filter(result => Number(result.rowCount || 0) > 0).length;
    utils.showToast(`Đã cập nhật ${updated}/${selectedIds.length} đơn`, updated === selectedIds.length ? "success" : "warning");
  } else {
    utils.showToast(`Không cập nhật được trạng thái: ${res?.error || 'lỗi cơ sở dữ liệu'}`, "danger");
  }
  loadStatsData();
  if (typeof loadDashboardData === 'function') loadDashboardData();
}

// Xuất Đơn đặt hàng / Phiếu giao hàng
async function openOrderExportDialog(orderId, orderType) {
  try {
    selectedExportOrderIds.clear();
    selectedExportOrderIds.add(orderId);
    activeExportDocType = 'phieu_giao_hang';
    await proceedToExportPreview();
  } catch (err) {
    utils.showToast("Lỗi xuất đơn: " + err.message, "danger");
  }
}

// 11. Gửi Email thông báo trực tiếp
async function sendOrderNotificationEmail(orderId, orderType) {
  openEmailDialog(orderId, orderType);
}
