// JS/MODULES/QUOTATIONS.JS - QUẢN LÝ DANH SÁCH BÁO GIÁ VÀ XUẤT PDF
let quotationsAllList = [];

// 1. Tải danh sách báo giá
async function loadQuotationsData() {
  try {
    const sql = `
      SELECT id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien, so_luong, don_gia_ban, thanh_tien_ban, 'bang_keo_in' AS type 
      FROM bang_keo_in_orders WHERE is_quote = TRUE
      UNION ALL
      SELECT id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien, so_luong, don_gia_ban, thanh_tien_ban, 'bang_keo' AS type 
      FROM bang_keo_orders WHERE is_quote = TRUE
      UNION ALL
      SELECT id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien, so_luong, don_gia_ban, thanh_tien_ban, 'truc_in' AS type 
      FROM truc_in_orders WHERE is_quote = TRUE
      ORDER BY thoi_gian DESC
    `;

    const res = await window.electronAPI.dbQuery(sql);
    if (res.ok) {
      quotationsAllList = res.rows;
      renderQuotationsTable(quotationsAllList);
    } else {
      utils.showToast("Không thể tải danh sách báo giá", "danger");
    }
  } catch (err) {
    console.error("Lỗi tải danh sách báo giá:", err);
  }
}

// 2. Render bảng báo giá
function renderQuotationsTable(rows) {
  const tbody = document.getElementById('quotes-list-tbody');
  if (!tbody) return;

  tbody.innerHTML = "";
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">Không tìm thấy bản ghi báo giá nào</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    
    let typeLabel = "Băng Keo In";
    if (row.type === 'bang_keo') typeLabel = "Băng Keo thường";
    if (row.type === 'truc_in') typeLabel = "Trục In";

    tr.innerHTML = `
      <td><strong>${row.id}</strong></td>
      <td>${utils.formatDate(row.thoi_gian)}</td>
      <td>${row.ten_hang} (${typeLabel})</td>
      <td>${row.ten_khach_hang}</td>
      <td>${utils.formatDate(row.ngay_du_kien)}</td>
      <td style="text-align: right;">${row.so_luong}</td>
      <td style="text-align: right;">${utils.formatCurrency(row.don_gia_ban)}đ</td>
      <td style="text-align: right; font-weight: 600;">${utils.formatCurrency(row.thanh_tien_ban)}đ</td>
      <td style="text-align: center;">
        <button class="btn btn-secondary btn-sm" onclick="downloadQuotePDFById('${row.id}', '${row.type}')" style="padding:2px 8px; font-size:11px; margin-right:4px;">🖨️ PDF</button>
        <button class="btn btn-primary btn-sm" onclick="convertQuoteToOrder('${row.id}', '${row.type}')" style="padding:2px 8px; font-size:11px;">🔄 Chuyển Đơn</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// 3. Lọc danh sách báo giá offline
function applyQuotesFilters() {
  const query = document.getElementById('quote-list-search').value.toLowerCase().trim();
  const typeFilter = document.getElementById('quote-list-type').value;
  const monthFilter = document.getElementById('quote-list-month').value;

  const filtered = quotationsAllList.filter(row => {
    const matchQuery = !query || 
      row.id.toLowerCase().includes(query) ||
      row.ten_hang.toLowerCase().includes(query) ||
      row.ten_khach_hang.toLowerCase().includes(query);

    const matchType = typeFilter === 'all' || row.type === typeFilter;

    const dateObj = new Date(row.thoi_gian);
    const matchMonth = monthFilter === 'all' || (dateObj.getMonth() + 1).toString() === monthFilter;

    return matchQuery && matchType && matchMonth;
  });

  renderQuotationsTable(filtered);
}

// 4. Tải và Lưu PDF bằng Quote ID (truy vấn DB trước)
async function downloadQuotePDFById(quoteId, type) {
  try {
    let tableName = 'bang_keo_in_orders';
    if (type === 'bang_keo') tableName = 'bang_keo_orders';
    if (type === 'truc_in') tableName = 'truc_in_orders';

    const res = await window.electronAPI.dbQuery(`SELECT * FROM ${tableName} WHERE id = $1`, [quoteId]);
    if (res.ok && res.rows.length > 0) {
      const data = res.rows[0];
      await generateAndSaveQuotePDF(quoteId, type, data);
    } else {
      utils.showToast("Không tìm thấy dữ liệu báo giá để xuất PDF", "danger");
    }
  } catch (err) {
    console.error("Lỗi xuất PDF báo giá:", err);
  }
}

// 5. Hàm tạo HTML và lưu PDF
async function generateAndSaveQuotePDF(quoteId, type, data) {
  try {
    // Hỏi đường dẫn lưu file trước
    const savePath = await window.electronAPI.showSaveDialog({
      title: "Lưu file báo giá PDF",
      defaultPath: `bao_gia_${quoteId}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!savePath || savePath.canceled || !savePath.filePath) {
      utils.showToast("Đã hủy xuất báo giá PDF", "warning");
      return;
    }

    utils.showToast("Đang tạo file PDF báo giá...", "warning");

    // Xác định Specs hiển thị
    let specsText = "";
    if (type === 'bang_keo_in') {
      const mm = data.quy_cach_mm || '-';
      const m = data.quy_cach_m || '-';
      const mic = data.quy_cach_mic || '-';
      specsText = `${mm}mm x ${m}m (${mic}mic)`;
    } else {
      specsText = data.quy_cach || "-";
    }

    const typeLabel = type === 'bang_keo_in' ? 'Băng Keo In Logo' : (type === 'bang_keo' ? 'Băng Keo thường' : 'Trục In');
    const hasNewAxis = type === 'bang_keo_in' && data.loai_truc === 'moi';
    const axisTotal = hasNewAxis ? parseFloat(data.truc_thanh_tien_ban || 0) : 0;
    const quoteTotal = parseFloat(data.thanh_tien_ban || 0) + axisTotal;
    const quoteRemaining = quoteTotal - parseFloat(data.tien_coc || 0);
    const totalWords = convertNumberToVietnameseWords(quoteTotal || 0) + " đồng chẵn";
    const axisQuoteRow = hasNewAxis ? `
            <tr>
              <td style="text-align: center;">2</td>
              <td><strong>${data.ten_truc || 'Trục mới'}</strong><br><small style="color:#64748b;">Trục mới</small></td>
              <td>Chu vi: ${data.truc_chu_vi || '-'}</td>
              <td style="text-align: right;">${data.truc_so_luong || 0}</td>
              <td style="text-align: right;">${utils.formatCurrency(data.truc_gia_ban || 0)}đ</td>
              <td style="text-align: right; font-weight: bold;">${utils.formatCurrency(axisTotal)}đ</td>
            </tr>
    ` : '';

    // Xây dựng template HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; line-height: 1.6; color: #1e293b; background-color: #fff; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .header-table td { vertical-align: top; }
          .title { font-size: 26px; color: #0284c7; font-weight: bold; margin: 0; }
          .company-name { font-size: 16px; font-weight: bold; color: #0f172a; margin: 0; text-transform: uppercase; }
          .info-text { font-size: 11px; color: #64748b; margin: 2px 0 0 0; }
          .meta-text { font-size: 12px; margin: 2px 0; text-align: right; }
          
          .divider { border-top: 2px solid #0284c7; margin-bottom: 25px; }
          
          .customer-table { width: 100%; margin-bottom: 20px; font-size: 13px; }
          .customer-table td { padding: 4px 0; }
          
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
          .data-table th { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; font-weight: bold; text-align: left; }
          .data-table td { border: 1px solid #cbd5e1; padding: 10px; }
          
          .summary-table { width: 45%; margin-left: auto; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
          .summary-table td { padding: 6px 8px; }
          .summary-table .label { font-weight: bold; text-align: left; }
          .summary-table .value { text-align: right; font-weight: 600; }
          .summary-table .grand-total { font-size: 15px; color: #0284c7; font-weight: 800; border-top: 1px double #cbd5e1; }
          
          .words-text { font-style: italic; font-size: 12px; color: #475569; margin-bottom: 40px; }
          
          .signatures { width: 100%; margin-top: 60px; font-size: 13px; text-align: center; }
          .signatures td { width: 50%; vertical-align: top; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 60%;">
              <p class="company-name">CÔNG TY TNHH SX TM BĂNG KEO LÊ THANH</p>
              <p class="info-text">Địa chỉ: D15/26/1A Võ Văn Vân, Ấp 4B, Vĩnh Lộc B, Bình Chánh, TP.HCM</p>
              <p class="info-text">Hotline: 0907.273.367 - Email: bangkeolethanh@gmail.com</p>
            </td>
            <td style="width: 40%; text-align: right;">
              <p class="title">BẢNG BÁO GIÁ</p>
              <p class="meta-text"><strong>Số:</strong> ${quoteId}</p>
              <p class="meta-text"><strong>Ngày:</strong> ${new Date(data.thoi_gian).toLocaleDateString('vi-VN')}</p>
            </td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <table class="customer-table">
          <tr>
            <td style="width: 15%;"><strong>Khách hàng:</strong></td>
            <td>${data.ten_khach_hang}</td>
          </tr>
          <tr>
            <td><strong>Ngày giao hàng:</strong></td>
            <td>${new Date(data.ngay_du_kien).toLocaleDateString('vi-VN')}</td>
          </tr>
          <tr>
            <td><strong>Liên hệ CTV:</strong></td>
            <td>${data.ctv || 'Trực tiếp'}</td>
          </tr>
        </table>
        
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 8%; text-align: center;">STT</th>
              <th style="width: 40%;">Tên Sản Phẩm</th>
              <th style="width: 18%;">Quy Cách</th>
              <th style="width: 10%; text-align: right;">Số Lượng</th>
              <th style="width: 12%; text-align: right;">Đơn Giá</th>
              <th style="width: 12%; text-align: right;">Thành Tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td><strong>${data.ten_hang}</strong><br><small style="color:#64748b;">Màu keo/sắc: ${data.mau_keo || ''} ${data.mau_sac || ''}</small></td>
              <td>${specsText}</td>
              <td style="text-align: right;">${data.so_luong}</td>
              <td style="text-align: right;">${utils.formatCurrency(data.don_gia_ban)}đ</td>
              <td style="text-align: right; font-weight: bold;">${utils.formatCurrency(data.thanh_tien_ban)}đ</td>
            </tr>
            ${axisQuoteRow}
          </tbody>
        </table>
        
        <table class="summary-table">
          <tr>
            <td class="label">Tổng tiền hàng:</td>
            <td class="value">${utils.formatCurrency(quoteTotal)}đ</td>
          </tr>
          <tr>
            <td class="label">Đặt cọc trước:</td>
            <td class="value">${utils.formatCurrency(data.tien_coc || 0)}đ</td>
          </tr>
          <tr class="grand-total">
            <td class="label">Còn lại cần thu:</td>
            <td class="value">${utils.formatCurrency(quoteRemaining)}đ</td>
          </tr>
        </table>
        
        <p class="words-text"><strong>Bằng chữ:</strong> ${totalWords}</p>
        
        <table class="signatures">
          <tr>
            <td>
              <p style="margin-bottom: 70px;"><strong>ĐẠI DIỆN KHÁCH HÀNG</strong></p>
              <p style="color: #64748b; font-size: 11px;">(Ký, ghi rõ họ tên)</p>
            </td>
            <td>
              <p style="margin-bottom: 70px;"><strong>NGƯỜI BÁO GIÁ</strong></p>
              <p><strong>LÊ THANH CO., LTD</strong></p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const resPdf = await window.electronAPI.printToPdf(htmlContent, savePath.filePath);
    if (resPdf.ok) {
      utils.showToast("Xuất báo giá PDF thành công!", "success");
    } else {
      utils.showToast("Lỗi xuất PDF: " + resPdf.error, "danger");
    }

  } catch (err) {
    console.error("Lỗi tiến trình in PDF báo giá:", err);
    utils.showToast("Lỗi in PDF báo giá", "danger");
  }
}

// 6. Chuyển Báo giá thành Đơn đặt hàng
async function convertQuoteToOrder(quoteId, type) {
  try {
    if (!confirm(`Bạn có chắc muốn chuyển báo giá ${quoteId} thành đơn đặt hàng thực tế không?\nHành động này sẽ tạo mã đơn hàng mới.`)) {
      return;
    }

    utils.showToast("Đang thực hiện chuyển đơn hàng...", "warning");

    let tableName = 'bang_keo_in_orders';
    let idPrefix = 'BK';
    if (type === 'bang_keo') {
      tableName = 'bang_keo_orders';
      idPrefix = 'B';
    }
    if (type === 'truc_in') {
      tableName = 'truc_in_orders';
      idPrefix = 'TI';
    }

    // 1. Tạo mã ID đơn hàng mới
    const newOrderId = await generateOrderId(idPrefix, tableName);

    // 2. Thực hiện chuyển đổi trong transaction với lock_timeout để tránh treo UI
    await window.electronAPI.dbRun('BEGIN');
    try {
      // Đặt lock_timeout 3 giây — nếu bị khóa bởi giao dịch khác thì tự hủy
      await window.electronAPI.dbRun('SET LOCAL lock_timeout = 3000');

      // Cập nhật polymorphic attachments liên quan
      const updateAttachSql = `
        UPDATE order_attachments
        SET order_id = $1, order_type = $2
        WHERE order_id = $3 AND order_type = $4
      `;
      await window.electronAPI.dbRun(updateAttachSql, [newOrderId, type, quoteId, type]);

      // Cập nhật báo giá thành đơn hàng chính thức
      const updateOrderSql = `
        UPDATE ${tableName}
        SET id = $1, is_quote = FALSE, thoi_gian = NOW()
        WHERE id = $2
      `;
      const res = await window.electronAPI.dbRun(updateOrderSql, [newOrderId, quoteId]);

      if (!res.ok) {
        throw new Error(res.error || 'Lỗi cập nhật đơn hàng');
      }

      await window.electronAPI.dbRun('COMMIT');

      utils.showToast(`Chuyển đơn thành công! Mã đơn mới: ${newOrderId}`, "success");

      // Chuyển sang tab Lịch sử để user thấy đơn hàng mới ngay lập tức
      if (typeof switchTab === 'function') {
        await switchTab('history');
      }
    } catch (txErr) {
      // Rollback transaction nếu có lỗi
      await window.electronAPI.dbRun('ROLLBACK');
      throw txErr;
    }

  } catch (err) {
    console.error("Lỗi chuyển báo giá thành đơn hàng:", err);
    const errMsg = err.message || '';
    if (errMsg.includes('lock') || errMsg.includes('timeout')) {
      utils.showToast("Hệ thống đang bận, vui lòng thử lại sau vài giây", "danger");
    } else if (errMsg.includes('duplicate') || errMsg.includes('unique')) {
      utils.showToast("Mã đơn hàng bị trùng, vui lòng thử lại", "danger");
    } else {
      utils.showToast("Không thể chuyển báo giá thành đơn hàng: " + errMsg, "danger");
    }
  }
}
