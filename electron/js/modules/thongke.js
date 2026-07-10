// JS/MODULES/THONGKE.JS - LOGIC XỬ LÝ PHÂN HỆ THỐNG KÊ CHI TIẾT
let statsActiveSubtab = 'bang-keo-in';
let statsColumnFilters = {};

const statsColumnDefs = [
  { key: 'id', label: 'Mã đơn hàng', value: row => row.id || '' },
  { key: 'thoi_gian', label: 'Ngày đặt', value: row => utils.formatDate(row.thoi_gian) },
  { key: 'ten_hang', label: 'Tên đơn hàng', value: row => row.ten_hang || '' },
  { key: 'ten_khach_hang', label: 'Khách hàng', value: row => row.ten_khach_hang || '' },
  { key: 'ngay_du_kien', label: 'Ngày giao', value: row => utils.formatDate(row.ngay_du_kien) },
  { key: 'cong_no_khach', label: 'Công nợ khách', value: row => `${utils.formatCurrency(row.cong_no_khach)}đ` },
  { key: 'da_giao', label: 'Giao hàng', value: row => row.da_giao ? 'Đã giao' : 'Chưa giao' },
  { key: 'da_tat_toan', label: 'Tất toán', value: row => row.da_tat_toan ? 'Đã tất toán' : 'Chưa xong' },
  { key: 'da_gui_email', label: 'Đã Email', value: row => row.da_gui_email ? 'Rồi' : 'Chưa' }
];
let statsAllOrders = []; // Lưu trữ để tìm kiếm filter offline nhanh chóng
let statsLastSelectedIndex = -1;
let statsViewMode = 'summary';
let selectedOrderIdForAttachments = null;

const statsDetailColumnHeaders = {
  id: 'Mã Đơn Hàng', thoi_gian: 'Ngày Tạo', ten_hang: 'Tên Hàng', ten_khach_hang: 'Khách Hàng',
  ngay_du_kien: 'Ngày Giao', quy_cach: 'Quy Cách', quy_cach_mm: 'Quy Cách (mm)', quy_cach_m: 'Quy Cách (m)',
  quy_cach_mic: 'Quy Cách (mic)', cuon_cay: 'Cuộn/Cây', so_luong: 'Số Lượng', phi_sl: 'Phí SL',
  mau_keo: 'Màu Keo', phi_keo: 'Phí Keo', mau_sac: 'Màu Sắc', phi_mau: 'Phí Màu',
  phi_size: 'Phí Size', phi_cat: 'Phí Cắt', don_gia_von: 'Giá Vốn', don_gia_goc: 'Giá Gốc',
  thanh_tien_goc: 'Tiền Gốc', don_gia_ban: 'Giá Bán', thanh_tien_ban: 'Tiền Bán', tien_coc: 'Tiền Cọc',
  cong_no_khach: 'Công Nợ', ctv: 'CTV', hoa_hong: 'Hoa Hồng (%)', tien_hoa_hong: 'Tiền H.Hồng',
  loi_giay: 'Lõi Giấy', thung_bao: 'Thùng Bao', loi_nhuan: 'Lợi Nhuận', tien_ship: 'Tiền Ship',
  loi_nhuan_rong: 'Lợi Nhuận Ròng', da_giao: 'Đã Giao', da_tat_toan: 'Đã Tất Toán', thanh_tien: 'Thành Tiền',
  loai_truc: 'Loại Trục', ten_truc: 'Tên Trục', truc_chu_vi: 'Chu Vi Trục', truc_so_luong: 'SL Trục',
  truc_gia_goc: 'Giá Gốc Trục', truc_gia_ban: 'Giá Bán Trục', truc_thanh_tien_goc: 'Tiền Gốc Trục',
  truc_thanh_tien_ban: 'Tiền Bán Trục', truc_ctv: 'CTV Trục', truc_hoa_hong: 'HH Trục (%)',
  truc_tien_hoa_hong: 'Tiền H.Hồng Trục',
  truc_loi_nhuan: 'Lãi Trục', truc_loi_nhuan_rong: 'Lãi Ròng Trục', da_gui_email: 'Đã Email'
};

const statsDetailColumnsMap = {
  bang_keo_in: [
    'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien', 'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic',
    'cuon_cay', 'so_luong', 'phi_sl', 'mau_keo', 'phi_keo', 'mau_sac', 'phi_mau', 'phi_size', 'phi_cat',
    'don_gia_von', 'don_gia_goc', 'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban', 'tien_coc', 'cong_no_khach',
    'ctv', 'hoa_hong', 'tien_hoa_hong', 'loi_giay', 'thung_bao', 'loai_truc', 'ten_truc', 'truc_chu_vi',
    'truc_so_luong', 'truc_gia_goc', 'truc_gia_ban', 'truc_thanh_tien_goc', 'truc_thanh_tien_ban',
    'truc_ctv', 'truc_hoa_hong', 'truc_tien_hoa_hong', 'truc_loi_nhuan', 'truc_loi_nhuan_rong', 'loi_nhuan', 'tien_ship',
    'loi_nhuan_rong', 'da_giao', 'da_tat_toan', 'da_gui_email'
  ],
  truc_in: [
    'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien', 'quy_cach', 'so_luong', 'mau_sac', 'mau_keo',
    'don_gia_goc', 'thanh_tien', 'don_gia_ban', 'thanh_tien_ban', 'cong_no_khach', 'ctv', 'hoa_hong',
    'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'da_giao', 'da_tat_toan', 'da_gui_email'
  ],
  bang_keo: [
    'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien', 'quy_cach', 'so_luong', 'mau_sac',
    'don_gia_goc', 'thanh_tien', 'don_gia_ban', 'thanh_tien_ban', 'cong_no_khach', 'ctv', 'hoa_hong',
    'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'da_giao', 'da_tat_toan', 'da_gui_email'
  ]
};

const statsCurrencyColumns = new Set([
  'phi_sl', 'phi_keo', 'phi_mau', 'phi_size', 'phi_cat', 'don_gia_von', 'don_gia_goc', 'thanh_tien_goc',
  'don_gia_ban', 'thanh_tien_ban', 'tien_coc', 'cong_no_khach', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong',
  'thanh_tien', 'truc_gia_goc', 'truc_gia_ban', 'truc_thanh_tien_goc', 'truc_thanh_tien_ban',
  'truc_tien_hoa_hong', 'truc_loi_nhuan', 'truc_loi_nhuan_rong'
]);

function getStatsTableName() {
  if (statsActiveSubtab === 'truc-in') return 'truc_in_orders';
  if (statsActiveSubtab === 'bang-keo') return 'bang_keo_orders';
  return 'bang_keo_in_orders';
}

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
  const sql = `
    SELECT 
      SUM(CASE WHEN NOT da_giao AND ngay_du_kien >= CURRENT_DATE AND ngay_du_kien <= CURRENT_DATE + INTERVAL '3 days' THEN 1 ELSE 0 END) AS sap_han,
      SUM(CASE WHEN NOT da_giao AND ngay_du_kien < CURRENT_DATE THEN 1 ELSE 0 END) AS qua_han,
      SUM(CASE WHEN NOT da_tat_toan THEN 1 ELSE 0 END) AS chua_tat_toan,
      SUM(CASE WHEN da_tat_toan THEN 1 ELSE 0 END) AS hoan_thanh,
      SUM(CASE WHEN NOT da_tat_toan THEN cong_no_khach ELSE 0 END) AS tong_cong_no,
      SUM(loi_nhuan_rong + truc_loi_nhuan_rong) AS tong_loi_nhuan
    FROM (
      SELECT da_giao, ngay_du_kien, da_tat_toan, cong_no_khach, COALESCE(loi_nhuan_rong, 0) AS loi_nhuan_rong, COALESCE(truc_loi_nhuan_rong, 0) AS truc_loi_nhuan_rong FROM bang_keo_in_orders WHERE (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT da_giao, ngay_du_kien, da_tat_toan, cong_no_khach, COALESCE(loi_nhuan_rong, 0) AS loi_nhuan_rong, 0 AS truc_loi_nhuan_rong FROM truc_in_orders WHERE (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT da_giao, ngay_du_kien, da_tat_toan, cong_no_khach, COALESCE(loi_nhuan_rong, 0) AS loi_nhuan_rong, 0 AS truc_loi_nhuan_rong FROM bang_keo_orders WHERE (is_quote = FALSE OR is_quote IS NULL)
    ) AS combined;
  `;

  const res = await window.electronAPI.dbQuery(sql);
  if (res.ok && res.rows.length > 0) {
    const data = res.rows[0];
    const sapHan = parseInt(data.sap_han || 0);
    const quaHan = parseInt(data.qua_han || 0);
    const chuaTatToan = parseInt(data.chua_tat_toan || 0);
    const hoanThanh = parseInt(data.hoan_thanh || 0);
    const tongCongNo = parseFloat(data.tong_cong_no || 0);
    const tongLoiNhuan = parseFloat(data.tong_loi_nhuan || 0);

    document.getElementById('stats-warning-count').innerText = (sapHan + quaHan).toString();
    document.getElementById('stats-warning-desc').innerText = `${sapHan} sắp hạn, ${quaHan} quá hạn`;
    
    document.getElementById('stats-pending-count').innerText = chuaTatToan.toString();
    document.getElementById('stats-pending-desc').innerText = `${hoanThanh} đã hoàn thành`;

    document.getElementById('stats-debt-sum').innerText = utils.formatCurrency(tongCongNo) + "đ";
    document.getElementById('stats-profit-sum').innerText = utils.formatCurrency(tongLoiNhuan) + "đ";
  }
}

// Chuyển đổi giữa các phân hệ con của Thống kê (Băng Keo In, Trục In, Băng Keo)
function switchStatsSubtab(subtab) {
  statsActiveSubtab = subtab;
  
  const pills = document.querySelectorAll('#stats-subtabs button');
  pills.forEach(p => p.classList.remove('active'));
  
  // Active pill tương ứng
  let index = 0;
  if (subtab === 'truc-in') index = 1;
  if (subtab === 'bang-keo') index = 2;
  pills[index].classList.add('active');

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
  let tableName = 'bang_keo_in_orders';
  if (statsActiveSubtab === 'truc-in') tableName = 'truc_in_orders';
  if (statsActiveSubtab === 'bang-keo') tableName = 'bang_keo_orders';

  const sql = `
    SELECT * FROM ${tableName}
    WHERE (is_quote = FALSE OR is_quote IS NULL)
    ORDER BY 
      split_part(id, '-', 3) DESC, 
      split_part(id, '-', 2) DESC, 
      split_part(id, '-', 4) DESC
  `;

  const res = await window.electronAPI.dbQuery(sql);
  if (res.ok) {
    statsAllOrders = res.rows;
    renderStatsTable(statsAllOrders);
  } else {
    utils.showToast("Không thể tải danh sách thống kê", "danger");
  }
}

function getStatsOrderTypeKey() {
  if (statsActiveSubtab === 'truc-in') return 'truc_in';
  if (statsActiveSubtab === 'bang-keo') return 'bang_keo';
  return 'bang_keo_in';
}

function getVisibleStatsRows() {
  return Array.from(document.querySelectorAll('#stats-table-body tr[data-id]'));
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
      <button type="button" class="table-filter-button ${statsColumnFilters[col.key]?.size ? 'active' : ''}" onclick="openStatsColumnFilter(event, '${col.key}')">
        <span>${col.label}</span>
        <span class="filter-caret">▾</span>
      </button>
    </th>
  `).join('');

  // 2. Chèn dữ liệu
  body.innerHTML = "";
  statsLastSelectedIndex = -1;
  updateStatsSelectionSummary();
  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">Không tìm thấy đơn hàng nào</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    
    // Đánh giá cảnh báo thời hạn
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(row.ngay_du_kien);
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
      <td><strong>${row.id}</strong></td>
      <td>${utils.formatDate(row.thoi_gian)}</td>
      <td>${row.ten_hang}</td>
      <td>${row.ten_khach_hang}</td>
      <td ${warningStyle}>${utils.formatDate(row.ngay_du_kien)}</td>
      <td>${utils.formatCurrency(row.cong_no_khach)}đ</td>
      <td>${daGiaoBadge}</td>
      <td>${daTatToanBadge}</td>
      <td>${daGuiEmailBadge}</td>
    `;

    bindStatsRowEvents(tr, row);
    body.appendChild(tr);
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

  header.innerHTML = cols.map(col => `<th>${statsDetailColumnHeaders[col] || col}</th>`).join('');
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
  });

  updateStatsSelectionSummary();
  updateStatsLayoutDebug('render-detail');
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
function filterStatsTable() {
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
      row.id.toLowerCase().includes(query) ||
      row.ten_hang.toLowerCase().includes(query) || 
      row.ten_khach_hang.toLowerCase().includes(query);

    // B. Lọc tháng đặt hàng
    const dateObj = new Date(row.thoi_gian);
    const matchMonth = monthFilter === 'all' || (dateObj.getMonth() + 1).toString() === monthFilter;

    // C. Lọc trạng thái
    const dueDate = new Date(row.ngay_du_kien);
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

    const matchColumnFilters = statsViewMode !== 'summary' || statsColumnDefs.every(col => {
      const selectedValues = statsColumnFilters[col.key];
      if (!selectedValues || selectedValues.size === 0) return true;
      return selectedValues.has(String(col.value(row)));
    });

    const matchCtv = !ctvQuery || (row.ctv && String(row.ctv).toLowerCase().includes(ctvQuery));

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

  renderStatsTable(filtered);
}

function openStatsColumnFilter(event, columnKey) {
  event.preventDefault();
  event.stopPropagation();

  const menu = document.getElementById('stats-column-filter-menu');
  const column = statsColumnDefs.find(col => col.key === columnKey);
  if (!menu || !column) return;

  const values = Array.from(new Set(statsAllOrders.map(row => String(column.value(row)))))
    .filter(value => value !== '')
    .sort((a, b) => a.localeCompare(b, 'vi'));
  const activeValues = statsColumnFilters[columnKey] || new Set();
  const isFiltered = activeValues.size > 0;

  menu.innerHTML = `
    <div class="column-filter-title">${column.label}</div>
    <input class="column-filter-search" type="text" placeholder="Tìm giá trị..." oninput="filterColumnFilterValues(this.value)">
    <div class="column-filter-actions">
      <button type="button" onclick="setStatsColumnFilterAll('${columnKey}')">Tất cả</button>
      <button type="button" onclick="clearStatsColumnFilter('${columnKey}')">Xóa lọc</button>
    </div>
    <div class="column-filter-values">
      ${values.map(value => `
        <label class="column-filter-value">
          <input type="checkbox" ${!isFiltered || activeValues.has(value) ? 'checked' : ''} onchange="toggleStatsColumnFilterValue('${columnKey}', decodeURIComponent('${encodeURIComponent(value)}'), this.checked)">
          <span>${value}</span>
        </label>
      `).join('')}
    </div>
  `;

  const rect = event.currentTarget.getBoundingClientRect();
  menu.style.display = 'block';
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;
  menu.style.top = `${rect.bottom + 6}px`;

  function closeMenu(e) {
    if (!menu.contains(e.target) && e.target !== event.currentTarget) {
      menu.style.display = 'none';
      document.removeEventListener('mousedown', closeMenu);
    }
  }
  setTimeout(() => document.addEventListener('mousedown', closeMenu), 50);
}

function toggleStatsColumnFilterValue(columnKey, value, checked) {
  const column = statsColumnDefs.find(col => col.key === columnKey);
  if (!column) return;

  const allValues = new Set(statsAllOrders.map(row => String(column.value(row))).filter(Boolean));
  if (!statsColumnFilters[columnKey] || statsColumnFilters[columnKey].size === 0) {
    statsColumnFilters[columnKey] = new Set(allValues);
  }

  if (checked) {
    statsColumnFilters[columnKey].add(value);
  } else {
    statsColumnFilters[columnKey].delete(value);
  }

  if (statsColumnFilters[columnKey].size === allValues.size) {
    delete statsColumnFilters[columnKey];
  }
  filterStatsTable();
}

function setStatsColumnFilterAll(columnKey) {
  delete statsColumnFilters[columnKey];
  document.getElementById('stats-column-filter-menu').style.display = 'none';
  filterStatsTable();
}

function clearStatsColumnFilter(columnKey) {
  delete statsColumnFilters[columnKey];
  document.getElementById('stats-column-filter-menu').style.display = 'none';
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

  const typeLabel = statsActiveSubtab === 'bang-keo-in' ? 'Băng Keo In' : (statsActiveSubtab === 'truc-in' ? 'Trục In' : 'Băng Keo');
  
  menu.innerHTML = `
    <div class="context-menu-item" onclick="toggleDeliveryStatus('${row.id}', ${row.da_giao})">
      <span>🚚</span> <span>Đánh dấu ${row.da_giao ? 'Chưa giao' : 'Đã giao'}</span>
    </div>
    <div class="context-menu-item" onclick="toggleSettlementStatus('${row.id}', ${row.da_tat_toan})">
      <span>💳</span> <span>Đánh dấu ${row.da_tat_toan ? 'Chưa tất toán' : 'Đã tất toán'}</span>
    </div>
    <hr style="border:0; border-top: 1px solid var(--border-color); margin: 4px 0;">
    <div class="context-menu-item" onclick="openOrderExportDialog('${row.id}', '${statsActiveSubtab}')">
      <span>🖨️</span> <span>Xem & In phiếu giao hàng</span>
    </div>
    <div class="context-menu-item" onclick="sendOrderNotificationEmail('${row.id}', '${statsActiveSubtab}')">
      <span>📧</span> <span>Gửi email thông báo đơn</span>
    </div>
    <div class="context-menu-item" onclick="openEditOrderDialog('${row.id}', '${statsActiveSubtab}')">
      <span>✏️</span> <span>Sửa đổi đơn hàng</span>
    </div>
    <hr style="border:0; border-top: 1px solid var(--border-color); margin: 4px 0;">
    <div class="context-menu-item" onclick="deleteSelectedStats()">
      <span>🗑️</span> <span>Xóa đơn hàng</span>
    </div>
  `;

  menu.style.display = 'block';
  menu.style.left = `${e.pageX}px`;
  menu.style.top = `${e.pageY}px`;

  // Tự động đóng menu khi click ra ngoài
  function closeMenu() {
    menu.style.display = 'none';
    document.removeEventListener('click', closeMenu);
  }
  setTimeout(() => document.addEventListener('click', closeMenu), 100);
}

// 9. Thực hiện thay đổi trạng thái giao hàng từ chuột phải
async function toggleDeliveryStatus(orderId, currentStatus) {
  let tableName = 'bang_keo_in_orders';
  if (statsActiveSubtab === 'truc-in') tableName = 'truc_in_orders';
  if (statsActiveSubtab === 'bang-keo') tableName = 'bang_keo_orders';

  const newStatus = !currentStatus;
  const sql = `UPDATE ${tableName} SET da_giao = $1 WHERE id = $2`;
  const res = await window.electronAPI.dbRun(sql, [newStatus, orderId]);
  
  if (res.ok) {
    utils.showToast(`Đã chuyển trạng thái giao hàng đơn ${orderId}`, "success");
    loadStatsData();
    if (typeof loadDashboardData === 'function') loadDashboardData();
  } else {
    utils.showToast("Không thể thay đổi trạng thái giao hàng", "danger");
  }
}

// 10. Thực hiện thay đổi trạng thái tất toán từ chuột phải
function getSettlementUpdateSql(tableName, includeDelivery = false) {
  const debtExpression = tableName === 'bang_keo_in_orders'
    ? `GREATEST(COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) ELSE 0 END - COALESCE(tien_coc, 0), 0)`
    : `GREATEST(COALESCE(thanh_tien_ban, 0), 0)`;

  if (includeDelivery) {
    return `UPDATE ${tableName}
      SET da_giao = $1,
          da_tat_toan = $2,
          cong_no_khach = CASE WHEN $2 THEN 0 ELSE ${debtExpression} END
      WHERE id = $3`;
  }

  return `UPDATE ${tableName}
    SET da_tat_toan = $1,
        cong_no_khach = CASE WHEN $1 THEN 0 ELSE ${debtExpression} END
    WHERE id = $2`;
}

async function toggleSettlementStatus(orderId, currentStatus) {
  let tableName = 'bang_keo_in_orders';
  if (statsActiveSubtab === 'truc-in') tableName = 'truc_in_orders';
  if (statsActiveSubtab === 'bang-keo') tableName = 'bang_keo_orders';

  const newStatus = !currentStatus;
  const sql = getSettlementUpdateSql(tableName);
  const res = await window.electronAPI.dbRun(sql, [newStatus, orderId]);
  
  if (res.ok) {
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

  if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} đơn hàng đã chọn không?\nHành động này không thể hoàn tác!`)) {
    return;
  }

  const tableName = getStatsTableName();
  const orderType = getStatsOrderTypeKey();
  let successCount = 0;

  for (const id of selectedIds) {
    const res = await window.electronAPI.dbRun(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
    if (res.ok) {
      await window.electronAPI.dbRun(
        `DELETE FROM order_attachments WHERE order_id = $1 AND order_type = $2`,
        [id, orderType]
      );
      successCount++;
    }
  }

  utils.showToast(
    `Đã xóa thành công ${successCount}/${selectedIds.length} đơn hàng`,
    successCount === selectedIds.length ? "success" : "warning"
  );
  loadStatsData();
  if (typeof loadDashboardData === 'function') loadDashboardData();
}

async function exportStatsExcel() {
  const selectedIds = getSelectedStatsOrderIds();
  let rowsToExport = [];

  if (selectedIds.length === 0) {
    rowsToExport = statsAllOrders;
  } else {
    rowsToExport = statsAllOrders.filter(row => selectedIds.includes(row.id));
  }

  if (rowsToExport.length === 0) {
    utils.showToast("Không có dữ liệu đơn hàng để xuất Excel", "warning");
    return;
  }

  try {
    const orderType = getStatsOrderTypeKey();
    const cols = statsDetailColumnsMap[orderType] || [];
    const excelData = rowsToExport.map(row => {
      const exportObj = {};
      cols.forEach(col => {
        const key = statsDetailColumnHeaders[col] || col;
        const val = row[col];
        if (col === 'thoi_gian' || col === 'ngay_du_kien') {
          exportObj[key] = utils.formatDate(val);
        } else if (col === 'da_giao' || col === 'da_tat_toan' || col === 'da_gui_email') {
          exportObj[key] = val ? 'Rồi/Xong' : 'Chưa';
        } else {
          exportObj[key] = val;
        }
      });
      return exportObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Đơn hàng');

    const savePath = await window.electronAPI.showSaveDialog({
      title: 'Lưu file xuất Excel',
      defaultPath: `don_hang_${orderType}_${new Date().toISOString().split('T')[0]}.xlsx`,
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
  document.getElementById('attach-status-label').innerText = `Đơn hàng: ${selectedOrderIdForAttachments}`;
  await loadAttachmentsList();
  document.getElementById('modal-attachments').classList.add('active');
}

async function loadAttachmentsList() {
  const body = document.getElementById('attachments-table-body');
  if (!body) return;

  body.innerHTML = '<tr><td colspan="3" style="text-align:center;">Đang tải tệp tin...</td></tr>';

  const sql = `
    SELECT id, file_name, file_size
    FROM order_attachments
    WHERE order_id = $1 AND order_type = $2
    ORDER BY created_at DESC
  `;

  const res = await window.electronAPI.dbQuery(sql, [selectedOrderIdForAttachments, getStatsOrderTypeKey()]);
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
    tr.innerHTML = `
      <td><strong>${att.file_name}</strong></td>
      <td>${sizeKB}</td>
      <td style="text-align:right;">
        <button class="btn btn-secondary" onclick="downloadAttachmentFile(${att.id}, '${att.file_name.replace(/'/g, "\\'")}')" style="padding:2px 6px; font-size:11px;">Tải</button>
        <button class="btn btn-danger" onclick="deleteAttachmentFile(${att.id})" style="padding:2px 6px; font-size:11px;">Xóa</button>
      </td>
    `;
    body.appendChild(tr);
  });
}

async function downloadAttachmentFile(attId, fileName) {
  try {
    utils.showToast('Đang tải tệp tin...', 'warning');
    const sql = "SELECT content_type, encode(data, 'base64') AS base64_data FROM order_attachments WHERE id = $1";
    const res = await window.electronAPI.dbQuery(sql, [attId]);

    if (!res.ok || res.rows.length === 0) {
      utils.showToast('Lỗi tải tệp: file không tồn tại', 'danger');
      return;
    }

    const att = res.rows[0];
    const byteCharacters = atob(att.base64_data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: att.content_type });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    utils.showToast('Đã tải tệp tin thành công!', 'success');
  } catch (err) {
    console.error('Lỗi tải tệp: ', err);
  }
}

async function deleteAttachmentFile(attId) {
  if (!confirm('Bạn có chắc muốn xóa tệp đính kèm này?')) return;

  const res = await window.electronAPI.dbRun('DELETE FROM order_attachments WHERE id = $1', [attId]);
  if (res.ok) {
    utils.showToast('Đã xóa tệp đính kèm thành công', 'success');
    loadAttachmentsList();
  } else {
    utils.showToast('Không thể xóa tệp đính kèm', 'danger');
  }
}

async function uploadAttachmentFile(input) {
  if (!input.files.length) return;

  utils.showToast('Đang tải tệp lên...', 'warning');
  const file = input.files[0];
  const fileReader = new FileReader();

  fileReader.onload = async function() {
    const base64Data = btoa(
      new Uint8Array(this.result).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const sql = `
      INSERT INTO order_attachments (order_type, order_id, file_name, content_type, file_size, data)
      VALUES ($1, $2, $3, $4, $5, decode($6, 'base64'))
    `;

    const res = await window.electronAPI.dbRun(sql, [
      getStatsOrderTypeKey(),
      selectedOrderIdForAttachments,
      file.name,
      file.type || 'application/octet-stream',
      file.size,
      base64Data
    ]);

    if (res.ok) {
      utils.showToast('Đã thêm tệp đính kèm mới!', 'success');
      loadAttachmentsList();
    } else {
      utils.showToast('Lỗi đính kèm: ' + res.error, 'danger');
    }
  };

  fileReader.readAsArrayBuffer(file);
  input.value = '';
}

// Tương thích với mã cũ sau khi gộp tab Lịch sử vào Thống kê
async function loadHistoryData() { return loadStatsData(); }
function applyHistoryFilters() { filterStatsTable(); }
async function deleteSelectedHistory() { return deleteSelectedStats(); }
async function exportHistoryExcel() { return exportStatsExcel(); }
async function sendSelectedHistoryEmail() { return sendSelectedStatsEmail(); }

function openBulkStatsStatusDialog() {
  const selectedIds = getSelectedStatsOrderIds();
  if (selectedIds.length === 0) {
    utils.showToast("Vui lòng chọn ít nhất 1 đơn trong bảng thống kê", "warning");
    return;
  }

  const label = document.getElementById('bulk-stats-status-label');
  if (label) label.innerText = `${selectedIds.length} đơn đã chọn`;
  document.getElementById('bulk-stats-da-giao').checked = true;
  document.getElementById('bulk-stats-da-tat-toan').checked = true;
  document.getElementById('modal-bulk-stats-status').classList.add('active');
}

async function applyBulkStatsStatus() {
  const selectedIds = getSelectedStatsOrderIds();
  if (selectedIds.length === 0) {
    utils.showToast("Không còn đơn nào được chọn", "warning");
    closeModal('modal-bulk-stats-status');
    return;
  }

  const daGiao = document.getElementById('bulk-stats-da-giao').checked;
  const daTatToan = document.getElementById('bulk-stats-da-tat-toan').checked;
  const tableName = getStatsTableName();

  let successCount = 0;
  for (const id of selectedIds) {
    const res = await window.electronAPI.dbRun(
      getSettlementUpdateSql(tableName, true),
      [daGiao, daTatToan, id]
    );
    if (res.ok) successCount++;
  }

  closeModal('modal-bulk-stats-status');
  utils.showToast(`Đã cập nhật ${successCount}/${selectedIds.length} đơn`, successCount === selectedIds.length ? "success" : "warning");
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

// Hàm phụ: Chuyển đổi số tiền thành chữ Tiếng Việt
function convertNumberToVietnameseWords(number) {
  if (number === 0) return "Không";
  
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const placeValues = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  
  let stringNumber = Math.round(number).toString();
  let len = stringNumber.length;
  
  if (len > 18) return "Số quá lớn";
  
  let numberGroups = [];
  while (stringNumber.length > 0) {
    numberGroups.push(stringNumber.substring(Math.max(0, stringNumber.length - 3)));
    stringNumber = stringNumber.substring(0, Math.max(0, stringNumber.length - 3));
  }
  
  let words = [];
  
  for (let i = 0; i < numberGroups.length; i++) {
    let groupVal = parseInt(numberGroups[i]);
    if (groupVal === 0) continue;
    
    let groupWords = [];
    let hundreds = Math.floor(groupVal / 100);
    let tens = Math.floor((groupVal % 100) / 10);
    let ones = groupVal % 10;
    
    if (hundreds > 0 || words.length > 0) {
      groupWords.push(units[hundreds] + " trăm");
    }
    
    if (tens > 1) {
      groupWords.push(units[tens] + " mươi");
      if (ones === 1) groupWords.push("mốt");
      else if (ones === 5) groupWords.push("lăm");
      else if (ones > 0) groupWords.push(units[ones]);
    } else if (tens === 1) {
      groupWords.push("mười");
      if (ones === 5) groupWords.push("lăm");
      else if (ones > 0) groupWords.push(units[ones]);
    } else if (hundreds > 0 && ones > 0) {
      groupWords.push("lẻ");
      groupWords.push(units[ones]);
    } else if (ones > 0) {
      groupWords.push(units[ones]);
    }
    
    words.unshift(groupWords.join(" ") + " " + placeValues[i]);
  }
  
  let finalResult = words.join(" ").trim();
  finalResult = finalResult.replace(/\s+/g, ' ');
  return finalResult.charAt(0).toUpperCase() + finalResult.slice(1);
}
