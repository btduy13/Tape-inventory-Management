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
    tr.dataset.id = row.id;
    tr.dataset.type = row.type;
    
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

    // Click chọn dòng (Ctrl/Shift hỗ trợ chọn nhiều)
    tr.addEventListener('click', function(e) {
      if (e.target.closest('button')) return;
      utils.handleRowSelection(tbody, this, e);
    });

    // Double-click mở form chỉnh sửa báo giá
    tr.addEventListener('dblclick', (e) => {
      if (e.target.closest('button')) return;
      openEditOrderDialog(row.id, row.type);
    });

    // Chuột phải mở menu thao tác nhanh
    tr.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      if (!this.classList.contains('selected')) {
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        this.classList.add('selected');
      }
      showQuoteContextMenu(e, row);
    });

    tbody.appendChild(tr);
  });
}

// Menu chuột phải cho bảng Báo giá
function showQuoteContextMenu(e, row) {
  const menu = document.getElementById('custom-context-menu');
  if (!menu) return;

  menu.innerHTML = `
    <div class="context-menu-item" onclick="downloadQuotePDFById('${row.id}', '${row.type}')">
      <span>🖨️</span> <span>Xuất báo giá PDF</span>
    </div>
    <div class="context-menu-item" onclick="convertQuoteToOrder('${row.id}', '${row.type}')">
      <span>🔄</span> <span>Chuyển thành đơn hàng</span>
    </div>
    <hr style="border:0; border-top: 1px solid var(--border-color); margin: 4px 0;">
    <div class="context-menu-item" onclick="openEditOrderDialog('${row.id}', '${row.type}')">
      <span>✏️</span> <span>Sửa báo giá</span>
    </div>
    <div class="context-menu-item context-menu-danger" onclick="deleteQuotation('${row.id}', '${row.type}')">
      <span>🗑️</span> <span>Xóa báo giá</span>
    </div>
  `;

  utils.openContextMenu(menu, e.clientX, e.clientY);
}

// Xóa một báo giá khỏi hệ thống
async function deleteQuotation(quoteId, type) {
  if (!confirm(`Bạn có chắc chắn muốn xóa báo giá ${quoteId} không?\nHành động này không thể hoàn tác!`)) return;

  let tableName = 'bang_keo_in_orders';
  if (type === 'bang_keo') tableName = 'bang_keo_orders';
  if (type === 'truc_in') tableName = 'truc_in_orders';

  const res = await window.electronAPI.dbRun(`DELETE FROM ${tableName} WHERE id = $1 AND is_quote = TRUE`, [quoteId]);
  if (res.ok) {
    await window.electronAPI.dbRun(`DELETE FROM order_attachments WHERE order_id = $1 AND order_type = $2`, [quoteId, type]);
    utils.showToast(`Đã xóa báo giá ${quoteId}`, "success");
    loadQuotationsData();
  } else {
    utils.showToast("Không thể xóa báo giá: " + res.error, "danger");
  }
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
function escapeQuoteHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

async function generateAndSaveQuotePDF(quoteId, type, data) {
  try {
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
    const company = utils.companyInfo || {};
    const hasNewAxis = type === 'bang_keo_in' && data.loai_truc === 'moi';
    const axisTotal = hasNewAxis ? parseFloat(data.truc_thanh_tien_ban || 0) : 0;
    const quoteSubtotal = parseFloat(data.thanh_tien_ban || 0) + axisTotal;
    const vatAmount = parseFloat(data.vat || 0);
    const quoteTotal = quoteSubtotal + vatAmount;
    const deposit = parseFloat(data.tien_coc || 0);
    const quoteRemaining = quoteTotal - deposit;
    const totalWords = convertNumberToVietnameseWords(quoteRemaining || 0) + " đồng chẵn";
    const axisQuoteRow = hasNewAxis ? `
            <tr>
              <td style="text-align: center;">2</td>
              <td><strong>${escapeQuoteHtml(data.ten_truc || 'Trục mới')}</strong><br><small>Trục mới</small></td>
              <td>Chu vi: ${escapeQuoteHtml(data.truc_chu_vi || '-')}</td>
              <td style="text-align: right;">${data.truc_so_luong || 0}</td>
              <td style="text-align: right;">${utils.formatCurrency(data.truc_gia_ban || 0)}đ</td>
              <td style="text-align: right; font-weight: bold;">${utils.formatCurrency(axisTotal)}đ</td>
            </tr>
    ` : '';
    const vatRow = vatAmount > 0 ? `
          <tr>
            <td>VAT theo yêu cầu:</td>
            <td>${utils.formatCurrency(vatAmount)}đ</td>
          </tr>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 24mm 18mm 18mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; color: #172033; background: #fff; font-size: 12px; line-height: 1.45; }
          .accent { height: 8px; background: #2563eb; border-radius: 999px; margin-bottom: 18px; }
          .header { display: table; width: 100%; margin-bottom: 18px; }
          .company, .quote-meta { display: table-cell; vertical-align: top; }
          .company { width: 63%; }
          .quote-meta { width: 37%; text-align: right; }
          .company-name { margin: 0 0 6px; font-size: 15px; line-height: 1.35; font-weight: 800; color: #0f172a; text-transform: uppercase; }
          .info-text { margin: 2px 0; color: #475569; }
          .title { margin: 0 0 8px; font-size: 26px; font-weight: 800; color: #1d4ed8; }
          .meta-pill { display: inline-block; min-width: 180px; padding: 8px 10px; border: 1px solid #dbeafe; border-radius: 8px; background: #eff6ff; text-align: left; }
          .meta-row { display: table; width: 100%; margin: 2px 0; }
          .meta-row span, .meta-row strong { display: table-cell; }
          .meta-row strong { text-align: right; }
          .section-title { margin: 18px 0 8px; font-size: 12px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; }
          .info-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; background: #f8fafc; margin-bottom: 16px; }
          .info-grid { width: 100%; border-collapse: collapse; }
          .info-grid td { padding: 3px 0; vertical-align: top; }
          .info-grid .label { width: 120px; color: #64748b; font-weight: 700; }
          .data-table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 10px 0 16px; overflow: hidden; border: 1px solid #dbe4f0; border-radius: 10px; }
          .data-table th { background: #1d4ed8; color: #fff; padding: 10px 9px; font-size: 11px; text-align: left; text-transform: uppercase; }
          .data-table td { border-top: 1px solid #e5edf6; padding: 10px 9px; vertical-align: top; }
          .data-table small { color: #64748b; }
          .data-table tbody tr:nth-child(even) td { background: #f8fbff; }
          .totals { width: 45%; margin-left: auto; border-collapse: collapse; font-size: 12px; }
          .totals td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          .totals td:first-child { color: #475569; font-weight: 700; }
          .totals td:last-child { text-align: right; font-weight: 800; }
          .totals .grand td { border-bottom: 0; background: #eff6ff; color: #1d4ed8; font-size: 15px; }
          .words-text { margin: 16px 0 34px; padding: 10px 12px; border-left: 4px solid #2563eb; background: #f8fafc; color: #334155; font-style: italic; }
          .note { margin-top: 18px; color: #64748b; font-size: 11px; }
          .signatures { width: 100%; margin-top: 48px; text-align: center; border-collapse: collapse; }
          .signatures td { width: 50%; vertical-align: top; }
          .sign-name { margin-top: 64px; font-weight: 800; color: #0f172a; }
        </style>
      </head>
      <body>
        <div class="accent"></div>
        <div class="header">
          <div class="company">
            <p class="company-name">${escapeQuoteHtml(company.name)}</p>
            <p class="info-text"><strong>Địa chỉ:</strong> ${escapeQuoteHtml(company.address)}</p>
            <p class="info-text"><strong>Hotline:</strong> ${escapeQuoteHtml(company.hotline)}</p>
          </div>
          <div class="quote-meta">
            <p class="title">BẢNG BÁO GIÁ</p>
            <div class="meta-pill">
              <div class="meta-row"><span>Số</span><strong>${escapeQuoteHtml(quoteId)}</strong></div>
              <div class="meta-row"><span>Ngày</span><strong>${new Date(data.thoi_gian).toLocaleDateString('vi-VN')}</strong></div>
            </div>
          </div>
        </div>

        <div class="section-title">Thông tin khách hàng</div>
        <div class="info-card">
          <table class="info-grid">
            <tr><td class="label">Khách hàng</td><td><strong>${escapeQuoteHtml(data.ten_khach_hang)}</strong></td></tr>
            <tr><td class="label">Ngày giao hàng</td><td>${new Date(data.ngay_du_kien).toLocaleDateString('vi-VN')}</td></tr>
            <tr><td class="label">Loại hàng</td><td>${escapeQuoteHtml(typeLabel)}</td></tr>
            <tr><td class="label">Liên hệ CTV</td><td>${escapeQuoteHtml(data.ctv || 'Trực tiếp')}</td></tr>
          </table>
        </div>

        <div class="section-title">Chi tiết báo giá</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 8%; text-align: center;">STT</th>
              <th style="width: 40%;">Tên sản phẩm</th>
              <th style="width: 18%;">Quy cách</th>
              <th style="width: 10%; text-align: right;">Số lượng</th>
              <th style="width: 12%; text-align: right;">Đơn giá</th>
              <th style="width: 12%; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td><strong>${escapeQuoteHtml(data.ten_hang)}</strong><br><small>Màu keo/sắc: ${escapeQuoteHtml(`${data.mau_keo || ''} ${data.mau_sac || ''}`.trim() || '-')}</small></td>
              <td>${escapeQuoteHtml(specsText)}</td>
              <td style="text-align: right;">${data.so_luong}</td>
              <td style="text-align: right;">${utils.formatCurrency(data.don_gia_ban)}đ</td>
              <td style="text-align: right; font-weight: bold;">${utils.formatCurrency(data.thanh_tien_ban)}đ</td>
            </tr>
            ${axisQuoteRow}
          </tbody>
        </table>

        <table class="totals">
          <tr>
            <td>Tổng tiền hàng:</td>
            <td>${utils.formatCurrency(quoteSubtotal)}đ</td>
          </tr>
          ${vatRow}
          <tr>
            <td>Đặt cọc trước:</td>
            <td>${utils.formatCurrency(deposit)}đ</td>
          </tr>
          <tr class="grand">
            <td>Còn lại cần thu:</td>
            <td>${utils.formatCurrency(quoteRemaining)}đ</td>
          </tr>
        </table>

        <p class="words-text"><strong>Bằng chữ:</strong> ${escapeQuoteHtml(totalWords)}</p>
        <p class="note">Báo giá có hiệu lực theo thỏa thuận tại thời điểm xác nhận đơn hàng. VAT chỉ được thể hiện khi khách hàng yêu cầu.</p>

        <table class="signatures">
          <tr>
            <td>
              <p><strong>ĐẠI DIỆN KHÁCH HÀNG</strong></p>
              <p class="sign-name">(Ký, ghi rõ họ tên)</p>
            </td>
            <td>
              <p><strong>NGƯỜI BÁO GIÁ</strong></p>
              <p class="sign-name">${escapeQuoteHtml(company.representative || '')}</p>
              <p style="margin: 4px 0 0; color:#64748b;">HP: ${escapeQuoteHtml(company.representativePhone || '')}</p>
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
