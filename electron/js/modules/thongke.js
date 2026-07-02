// JS/MODULES/THONGKE.JS - LOGIC XỬ LÝ PHÂN HỆ THỐNG KÊ CHI TIẾT
let statsActiveSubtab = 'bang-keo-in';
let statsAllOrders = []; // Lưu trữ để tìm kiếm filter offline nhanh chóng

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
      SUM(loi_nhuan_rong) AS tong_loi_nhuan
    FROM (
      SELECT da_giao, ngay_du_kien, da_tat_toan, cong_no_khach, loi_nhuan_rong FROM bang_keo_in_orders
      UNION ALL
      SELECT da_giao, ngay_du_kien, da_tat_toan, cong_no_khach, loi_nhuan_rong FROM truc_in_orders
      UNION ALL
      SELECT da_giao, ngay_du_kien, da_tat_toan, cong_no_khach, loi_nhuan_rong FROM bang_keo_orders
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

  loadStatsTableData();
}

// Tải bảng dữ liệu thống kê
async function loadStatsTableData() {
  let tableName = 'bang_keo_in_orders';
  if (statsActiveSubtab === 'truc-in') tableName = 'truc_in_orders';
  if (statsActiveSubtab === 'bang-keo') tableName = 'bang_keo_orders';

  const sql = `
    SELECT id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien, cong_no_khach, da_giao, da_tat_toan, da_gui_email 
    FROM ${tableName} 
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

// Render dữ liệu vào Table
function renderStatsTable(rows) {
  const header = document.getElementById('stats-table-header');
  const body = document.getElementById('stats-table-body');
  
  if (!header || !body) return;

  // 1. Tạo headers tiếng Việt
  header.innerHTML = `
    <th>Mã đơn hàng</th>
    <th>Ngày đặt</th>
    <th>Tên đơn hàng</th>
    <th>Khách hàng</th>
    <th>Ngày giao</th>
    <th>Công nợ khách</th>
    <th>Giao hàng</th>
    <th>Tất toán</th>
    <th>Đã Email</th>
  `;

  // 2. Chèn dữ liệu
  body.innerHTML = "";
  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">Không tìm thấy đơn hàng nào</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    
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

    // Sự kiện Click chọn dòng
    tr.addEventListener('click', function(e) {
      document.querySelectorAll('#stats-table-body tr').forEach(r => r.classList.remove('selected'));
      this.classList.add('selected');
    });

    // Sự kiện Double-click sửa đơn hàng
    tr.addEventListener('dblclick', () => {
      openEditOrderDialog(row.id, statsActiveSubtab);
    });

    // Sự kiện Right-click chuột phải mở Context Menu
    tr.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      document.querySelectorAll('#stats-table-body tr').forEach(r => r.classList.remove('selected'));
      this.classList.add('selected');
      showStatsContextMenu(e, row);
    });

    body.appendChild(tr);
  });
}

// 7. Lọc dữ liệu bằng Search & Comboboxes (Offline Filter cực nhanh)
function filterStatsTable() {
  const query = document.getElementById('stats-search').value.toLowerCase().trim();
  const monthFilter = document.getElementById('stats-month-filter').value;
  const statusFilter = document.getElementById('stats-status-filter').value;

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

    return matchQuery && matchMonth && matchStatus;
  });

  renderStatsTable(filtered);
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
  } else {
    utils.showToast("Không thể thay đổi trạng thái giao hàng", "danger");
  }
}

// 10. Thực hiện thay đổi trạng thái tất toán từ chuột phải
async function toggleSettlementStatus(orderId, currentStatus) {
  let tableName = 'bang_keo_in_orders';
  if (statsActiveSubtab === 'truc-in') tableName = 'truc_in_orders';
  if (statsActiveSubtab === 'bang-keo') tableName = 'bang_keo_orders';

  const newStatus = !currentStatus;
  const sql = `UPDATE ${tableName} SET da_tat_toan = $1 WHERE id = $2`;
  const res = await window.electronAPI.dbRun(sql, [newStatus, orderId]);
  
  if (res.ok) {
    utils.showToast(`Đã cập nhật trạng thái tất toán đơn ${orderId}`, "success");
    loadStatsData();
  } else {
    utils.showToast("Không thể cập nhật trạng thái tất toán", "danger");
  }
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
