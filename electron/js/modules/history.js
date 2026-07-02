// JS/MODULES/HISTORY.JS - LOGIC XỬ LÝ TRANG LỊCH SỬ ĐƠN HÀNG CHI TIẾT
let historyActiveTab = 'bang_keo_in';
let historyAllOrders = [];
let selectedOrderIdForAttachments = null;

const columnHeaders = {
  'id': 'Mã Đơn Hàng', 'thoi_gian': 'Ngày Tạo', 'ten_hang': 'Tên Hàng', 'ten_khach_hang': 'Khách Hàng',
  'ngay_du_kien': 'Ngày Giao', 'quy_cach': 'Quy Cách', 'quy_cach_mm': 'Quy Cách (mm)', 'quy_cach_m': 'Quy Cách (m)',
  'quy_cach_mic': 'Quy Cách (mic)', 'cuon_cay': 'Cuộn/Cây', 'so_luong': 'Số Lượng', 'phi_sl': 'Phí SL',
  'mau_keo': 'Màu Keo', 'phi_keo': 'Phí Keo', 'mau_sac': 'Màu Sắc', 'phi_mau': 'Phí Màu',
  'phi_size': 'Phí Size', 'phi_cat': 'Phí Cắt', 'don_gia_von': 'Giá Vốn', 'don_gia_goc': 'Giá Gốc',
  'thanh_tien_goc': 'Tiền Gốc', 'don_gia_ban': 'Giá Bán', 'thanh_tien_ban': 'Tiền Bán', 'tien_coc': 'Tiền Cọc',
  'cong_no_khach': 'Công Nợ', 'ctv': 'CTV', 'hoa_hong': 'Hoa Hồng (%)', 'tien_hoa_hong': 'Tiền H.Hồng',
  'loi_giay': 'Lõi Giấy', 'thung_bao': 'Thùng Bao', 'loi_nhuan': 'Lợi Nhuận', 'tien_ship': 'Tiền Ship',
  'loi_nhuan_rong': 'Lợi Nhuận Ròng', 'da_giao': 'Đã Giao', 'da_tat_toan': 'Đã Tất Toán', 'thanh_tien': 'Thành Tiền'
};

Object.assign(columnHeaders, {
  loai_truc: 'Loại Trục',
  ten_truc: 'Tên Trục',
  truc_chu_vi: 'Chu Vi Trục',
  truc_so_luong: 'SL Trục',
  truc_gia_goc: 'Giá Gốc Trục',
  truc_gia_ban: 'Giá Bán Trục',
  truc_thanh_tien_goc: 'Tiền Gốc Trục',
  truc_thanh_tien_ban: 'Tiền Bán Trục',
  truc_ctv: 'CTV Trục',
  truc_hoa_hong: 'HH Trục (%)',
  truc_loi_nhuan: 'Lãi Trục',
  truc_loi_nhuan_rong: 'Lãi Ròng Trục'
});

const historyColumnsMap = {
  'bang_keo_in': [
    'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien', 'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 
    'cuon_cay', 'so_luong', 'phi_sl', 'mau_keo', 'phi_keo', 'mau_sac', 'phi_mau', 'phi_size', 'phi_cat', 
    'don_gia_von', 'don_gia_goc', 'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban', 'tien_coc', 'cong_no_khach', 
    'ctv', 'hoa_hong', 'tien_hoa_hong', 'loi_giay', 'thung_bao', 'loai_truc', 'ten_truc', 'truc_chu_vi',
    'truc_so_luong', 'truc_gia_goc', 'truc_gia_ban', 'truc_thanh_tien_goc', 'truc_thanh_tien_ban',
    'truc_ctv', 'truc_hoa_hong', 'truc_loi_nhuan', 'truc_loi_nhuan_rong', 'loi_nhuan', 'tien_ship',
    'loi_nhuan_rong', 'da_giao', 'da_tat_toan'
  ],
  'truc_in': [
    'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien', 'quy_cach', 'so_luong', 'mau_sac', 'mau_keo', 
    'don_gia_goc', 'thanh_tien', 'don_gia_ban', 'thanh_tien_ban', 'cong_no_khach', 'ctv', 'hoa_hong', 
    'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'da_giao', 'da_tat_toan'
  ],
  'bang_keo': [
    'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien', 'quy_cach', 'so_luong', 'mau_sac', 
    'don_gia_goc', 'thanh_tien', 'don_gia_ban', 'thanh_tien_ban', 'cong_no_khach', 'ctv', 'hoa_hong', 
    'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'da_giao', 'da_tat_toan'
  ]
};

// Khởi chạy
async function loadHistoryData() {
  try {
    let tableName = 'bang_keo_in_orders';
    if (historyActiveTab === 'truc_in') tableName = 'truc_in_orders';
    if (historyActiveTab === 'bang_keo') tableName = 'bang_keo_orders';

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
      historyAllOrders = res.rows;
      renderHistoryTable(historyAllOrders);
    } else {
      utils.showToast("Lỗi tải lịch sử đơn hàng", "danger");
    }
  } catch (err) {
    console.error('Lỗi tải dữ liệu lịch sử:', err);
  }
}

// Chuyển tab đơn hàng lịch sử
function switchHistoryTab(type) {
  historyActiveTab = type;
  document.getElementById('hist-table-title').innerText = `Lịch sử đơn hàng: ${type === 'bang_keo_in' ? 'Băng Keo In' : (type === 'truc_in' ? 'Trục In' : 'Băng Keo')}`;
  
  // Reset các bộ lọc
  document.getElementById('hist-search').value = "";
  document.getElementById('hist-date-from').value = "";
  document.getElementById('hist-date-to').value = "";
  document.getElementById('hist-giao-filter').value = "all";
  document.getElementById('hist-ctv-filter').value = "";

  loadHistoryData();
}

// Render dữ liệu bảng lịch sử động
function renderHistoryTable(rows) {
  const header = document.getElementById('history-table-header');
  const body = document.getElementById('history-table-body');
  
  if (!header || !body) return;

  const cols = historyColumnsMap[historyActiveTab];

  // 1. Render Headers
  header.innerHTML = "";
  cols.forEach(col => {
    const th = document.createElement('th');
    th.innerText = columnHeaders[col] || col;
    header.appendChild(th);
  });

  // 2. Render Body Rows
  body.innerHTML = "";
  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="${cols.length}" style="text-align:center; color:var(--text-muted);">Không tìm thấy đơn hàng nào</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    cols.forEach(col => {
      const td = document.createElement('td');
      let val = row[col];

      // Format dữ liệu phù hợp
      if (col === 'thoi_gian' || col === 'ngay_du_kien') {
        td.innerText = utils.formatDate(val);
      } else if (col === 'da_giao') {
        td.innerHTML = val ? '<span class="badge badge-success">Rồi</span>' : '<span class="badge badge-gray">Chưa</span>';
      } else if (col === 'da_tat_toan') {
        td.innerHTML = val ? '<span class="badge badge-success">Xong</span>' : '<span class="badge badge-warning">Chưa</span>';
      } else if (['phi_sl', 'phi_keo', 'phi_mau', 'phi_size', 'phi_cat', 'don_gia_von', 'don_gia_goc', 'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban', 'tien_coc', 'cong_no_khach', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'thanh_tien', 'truc_gia_goc', 'truc_gia_ban', 'truc_thanh_tien_goc', 'truc_thanh_tien_ban', 'truc_loi_nhuan', 'truc_loi_nhuan_rong'].includes(col)) {
        td.innerText = utils.formatCurrency(val) + "đ";
        td.style.textAlign = "right";
      } else {
        td.innerText = val !== null ? val : "";
      }

      tr.appendChild(td);
    });

    // Sự kiện Click chọn nhiều dòng bằng cách Click (Toggle class selected)
    tr.addEventListener('click', function(e) {
      this.classList.toggle('selected');
    });

    // Double-click mở form chỉnh sửa
    tr.addEventListener('dblclick', () => {
      openEditOrderDialog(row.id, historyActiveTab);
    });

    body.appendChild(tr);
  });
}

// Áp dụng bộ lọc lịch sử (Tìm kiếm, Ngày tháng, Trạng thái giao, CTV)
function applyHistoryFilters() {
  const query = document.getElementById('hist-search').value.toLowerCase().trim();
  const dateFrom = document.getElementById('hist-date-from').value;
  const dateTo = document.getElementById('hist-date-to').value;
  const giaoFilter = document.getElementById('hist-giao-filter').value;
  const ctvQuery = document.getElementById('hist-ctv-filter').value.toLowerCase().trim();

  const filtered = historyAllOrders.filter(row => {
    // 1. Tìm kiếm tổng quát
    const matchQuery = !query || 
      row.id.toLowerCase().includes(query) ||
      row.ten_hang.toLowerCase().includes(query) ||
      row.ten_khach_hang.toLowerCase().includes(query);

    // 2. CTV
    const matchCtv = !ctvQuery || (row.ctv && row.ctv.toLowerCase().includes(ctvQuery));

    // 3. Trạng thái giao hàng
    let matchGiao = true;
    if (giaoFilter === 'giao') matchGiao = row.da_giao;
    if (giaoFilter === 'chua') matchGiao = !row.da_giao;

    // 4. Ngày tháng đặt hàng (thoi_gian)
    let matchDate = true;
    const orderDate = new Date(row.thoi_gian);
    orderDate.setHours(0,0,0,0);
    
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0,0,0,0);
      if (orderDate < from) matchDate = false;
    }
    
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(0,0,0,0);
      if (orderDate > to) matchDate = false;
    }

    return matchQuery && matchCtv && matchGiao && matchDate;
  });

  renderHistoryTable(filtered);
}

// Xóa các dòng đơn hàng đã chọn
async function deleteSelectedHistory() {
  const selectedRows = document.querySelectorAll('#history-table-body tr.selected');
  if (selectedRows.length === 0) {
    utils.showToast("Vui lòng chọn ít nhất 1 đơn hàng cần xóa", "warning");
    return;
  }

  const ids = Array.from(selectedRows).map(tr => tr.dataset.id);
  
  if (confirm(`Bạn có chắc chắn muốn xóa ${ids.length} đơn hàng đã chọn không?\nHành động này không thể hoàn tác!`)) {
    let tableName = 'bang_keo_in_orders';
    if (historyActiveTab === 'truc_in') tableName = 'truc_in_orders';
    if (historyActiveTab === 'bang_keo') tableName = 'bang_keo_orders';

    let successCount = 0;
    for (const id of ids) {
      const res = await window.electronAPI.dbRun(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
      if (res.ok) {
        // Xóa đính kèm liên quan
        await window.electronAPI.dbRun(`DELETE FROM order_attachments WHERE order_id = $1 AND order_type = $2`, [id, historyActiveTab]);
        successCount++;
      }
    }

    utils.showToast(`Đã xóa thành công ${successCount}/${ids.length} đơn hàng`, "success");
    loadHistoryData();
  }
}

// Xuất file Excel các đơn đã chọn (dùng thư viện SheetJS XLSX)
async function exportHistoryExcel() {
  const selectedRows = document.querySelectorAll('#history-table-body tr.selected');
  let rowsToExport = [];
  
  if (selectedRows.length === 0) {
    // Nếu không chọn dòng nào, xuất toàn bộ bảng hiện tại
    rowsToExport = historyAllOrders;
  } else {
    const ids = Array.from(selectedRows).map(tr => tr.dataset.id);
    rowsToExport = historyAllOrders.filter(r => ids.includes(r.id));
  }

  if (rowsToExport.length === 0) {
    utils.showToast("Không có dữ liệu đơn hàng để xuất Excel", "warning");
    return;
  }

  try {
    const cols = historyColumnsMap[historyActiveTab];
    
    // Tạo headers và dữ liệu xuất
    const excelData = rowsToExport.map(row => {
      let exportObj = {};
      cols.forEach(col => {
        const key = columnHeaders[col] || col;
        let val = row[col];
        if (col === 'thoi_gian' || col === 'ngay_du_kien') {
          exportObj[key] = utils.formatDate(val);
        } else if (col === 'da_giao' || col === 'da_tat_toan') {
          exportObj[key] = val ? 'Rồi/Xong' : 'Chưa';
        } else {
          exportObj[key] = val;
        }
      });
      return exportObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Đơn hàng");

    const savePath = await window.electronAPI.showSaveDialog({
      title: "Lưu file lịch sử xuất Excel",
      defaultPath: `don_hang_${historyActiveTab}_${new Date().toISOString().split('T')[0]}.xlsx`,
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

// Gửi Email đơn hàng đã chọn
async function sendSelectedHistoryEmail() {
  const selectedRows = document.querySelectorAll('#history-table-body tr.selected');
  if (selectedRows.length === 0) {
    utils.showToast("Vui lòng chọn 1 đơn hàng cần gửi email", "warning");
    return;
  }
  
  // Lấy dòng đầu tiên chọn
  const id = selectedRows[0].dataset.id;
  sendOrderNotificationEmail(id, historyActiveTab);
}

// --- LOGIC QUẢN LÝ FILE ĐÍNH KÈM (ATTACHMENTS) ---
async function openAttachmentsManager() {
  const selectedRows = document.querySelectorAll('#history-table-body tr.selected');
  if (selectedRows.length === 0) {
    utils.showToast("Vui lòng chọn 1 đơn hàng để đính kèm tệp", "warning");
    return;
  }

  selectedOrderIdForAttachments = selectedRows[0].dataset.id;
  document.getElementById('attach-status-label').innerText = `Đơn hàng: ${selectedOrderIdForAttachments}`;
  
  await loadAttachmentsList();
  document.getElementById('modal-attachments').classList.add('active');
}

async function loadAttachmentsList() {
  const body = document.getElementById('attachments-table-body');
  if (!body) return;

  body.innerHTML = `<tr><td colspan="3" style="text-align:center;">Đang tải tệp tin...</td></tr>`;

  const sql = `
    SELECT id, file_name, file_size 
    FROM order_attachments 
    WHERE order_id = $1 AND order_type = $2 
    ORDER BY created_at DESC
  `;

  const res = await window.electronAPI.dbQuery(sql, [selectedOrderIdForAttachments, historyActiveTab]);
  if (res.ok) {
    body.innerHTML = "";
    if (res.rows.length === 0) {
      body.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Chưa có tệp đính kèm nào</td></tr>`;
      return;
    }

    res.rows.forEach(att => {
      const tr = document.createElement('tr');
      const sizeKB = (att.file_size / 1024).toFixed(1) + " KB";
      
      tr.innerHTML = `
        <td><strong>${att.file_name}</strong></td>
        <td>${sizeKB}</td>
        <td style="text-align:right;">
          <button class="btn btn-secondary" onclick="downloadAttachmentFile(${att.id}, '${att.file_name}')" style="padding:2px 6px; font-size:11px;">Tải</button>
          <button class="btn btn-danger" onclick="deleteAttachmentFile(${att.id})" style="padding:2px 6px; font-size:11px;">Xóa</button>
        </td>
      `;
      body.appendChild(tr);
    });
  } else {
    body.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--color-danger);">Không thể tải tệp tin</td></tr>`;
  }
}

// Tải file đính kèm từ database
async function downloadAttachmentFile(attId, fileName) {
  try {
    utils.showToast("Đang tải tệp tin...", "warning");
    
    // Đọc data nhị phân được mã hóa dạng base64 từ PostgreSQL
    const sql = "SELECT content_type, encode(data, 'base64') AS base64_data FROM order_attachments WHERE id = $1";
    const res = await window.electronAPI.dbQuery(sql, [attId]);
    
    if (res.ok && res.rows.length > 0) {
      const att = res.rows[0];
      const base64Data = att.base64_data;
      const contentType = att.content_type;

      // Decode base64 trong browser/Electron renderer
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType });

      // Lưu file qua hộp thoại tải của Browser
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      
      utils.showToast("Đã tải tệp tin thành công!", "success");
    } else {
      utils.showToast("Lỗi tải tệp: file không tồn tại", "danger");
    }
  } catch (err) {
    console.error('Lỗi tải tệp: ', err);
  }
}

// Xóa file đính kèm
async function deleteAttachmentFile(attId) {
  if (confirm("Bạn có chắc muốn xóa tệp đính kèm này?")) {
    const res = await window.electronAPI.dbRun("DELETE FROM order_attachments WHERE id = $1", [attId]);
    if (res.ok) {
      utils.showToast("Đã xóa tệp đính kèm thành công", "success");
      loadAttachmentsList();
    } else {
      utils.showToast("Không thể xóa tệp đính kèm", "danger");
    }
  }
}

// Thêm file đính kèm mới từ Modal
async function uploadAttachmentFile(input) {
  if (input.files.length === 0) return;
  
  utils.showToast("Đang tải tệp lên...", "warning");
  
  const file = input.files[0];
  const fileReader = new FileReader();
  
  fileReader.onload = async function() {
    const arrayBuffer = this.result;
    const base64Data = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    const sql = `
      INSERT INTO order_attachments (order_type, order_id, file_name, content_type, file_size, data)
      VALUES ($1, $2, $3, $4, $5, decode($6, 'base64'))
    `;

    const res = await window.electronAPI.dbRun(sql, [
      historyActiveTab, 
      selectedOrderIdForAttachments, 
      file.name, 
      file.type || 'application/octet-stream', 
      file.size, 
      base64Data
    ]);

    if (res.ok) {
      utils.showToast("Đã thêm tệp đính kèm mới!", "success");
      loadAttachmentsList();
    } else {
      utils.showToast("Lỗi đính kèm: " + res.error, "danger");
    }
  };

  fileReader.readAsArrayBuffer(file);
  input.value = ""; // Đặt lại input để có thể chọn lại file cũ
}
