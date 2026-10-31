// JS/MODULES/EXPORTMANAGER.JS - LOGIC XUẤT ĐƠN / PHIẾU GIAO HÀNG HÀNG LOẠT

var activeExportDocType = 'don_dat_hang';
var selectedExportOrderIds = new Set();
var exportVisibleOrderIds = null;
var exportAllOrders = [];
var exportPreviewData = null;

function escapeExportHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Một bộ định dạng số lượng dùng chung cho bảng chọn đơn, bảng xem trước và phiếu in (không bao giờ ra "NaN").
function formatExportQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0';
  return parsed.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
}

function getExportTableNameByOrderId(orderId) {
  if (orderId.startsWith('BK-')) return 'bang_keo_in_orders';
  if (orderId.startsWith('TI-')) return 'truc_in_orders';
  return 'bang_keo_orders';
}

// Loại đơn (khóa thao tác dữ liệu) suy từ tiền tố mã đơn, khớp getExportTableNameByOrderId
function getExportOrderTypeByOrderId(orderId) {
  if (orderId.startsWith('BK-')) return 'bang_keo_in';
  if (orderId.startsWith('TI-')) return 'truc_in';
  return 'bang_keo';
}

// Khởi động Modal chọn đơn hàng để xuất
async function openMultiOrderExportDialog() {
  try {
    selectedExportOrderIds.clear();
    
    // Nạp danh sách năm vào select
    const yearSelect = document.getElementById('export-filter-year');
    yearSelect.innerHTML = "";
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.innerText = y.toString();
      yearSelect.appendChild(opt);
    }

    // Set filter mặc định
    document.getElementById('export-filter-month').value = 'all';
    document.getElementById('export-filter-type').value = 'all';
    document.getElementById('export-filter-search').value = '';
    
    // Bật pill active cho Loại tài liệu
    setExportDocumentType('don_dat_hang');

    // Tải toàn bộ đơn hàng để phục vụ lọc offline
    await loadExportAllOrdersFromDb();

    // Mở modal
    document.getElementById('modal-order-export').classList.add('active');
  } catch (err) {
    utils.showToast("Lỗi khởi tạo hộp thoại xuất đơn: " + err.message, "danger");
  }
}

// Thiết lập loại chứng từ xuất (pill switcher)
function setExportDocumentType(docType) {
  activeExportDocType = docType;
  
  const docOrderBtn = document.getElementById('export-doc-order');
  const docDelivBtn = document.getElementById('export-doc-delivery');
  
  if (docType === 'don_dat_hang') {
    docOrderBtn.classList.add('active');
    docDelivBtn.classList.remove('active');
  } else {
    docOrderBtn.classList.remove('active');
    docDelivBtn.classList.add('active');
  }
}

// Tải tất cả đơn hàng từ database
async function loadExportAllOrdersFromDb() {
  const res = await window.electronAPI.dbQuery('export.listOrders');
  if (res.ok) {
    exportAllOrders = res.rows;
    loadExportOrdersTable();
  } else {
    utils.showToast("Không thể tải danh sách đơn hàng từ database", "danger");
  }
}

// Lọc dữ liệu offline và hiển thị lên table
function loadExportOrdersTable() {
  const selectedYear = parseInt(document.getElementById('export-filter-year').value);
  const selectedMonth = document.getElementById('export-filter-month').value;
  const selectedType = document.getElementById('export-filter-type').value;
  const searchQuery = document.getElementById('export-filter-search').value.trim().toLowerCase();

  const filtered = exportAllOrders.filter(row => {
    const d = new Date(row.thoi_gian);
    
    // Lọc năm
    const matchYear = d.getFullYear() === selectedYear;
    
    // Lọc tháng
    const matchMonth = selectedMonth === 'all' ? true : (d.getMonth() + 1 === parseInt(selectedMonth));
    
    // Lọc loại
    const matchType = selectedType === 'all' ? true : (row.type === selectedType);
    
    // Tìm kiếm từ khóa
    const matchSearch = !searchQuery ? true : (
      String(row.id || '').toLowerCase().includes(searchQuery) ||
      String(row.ten_hang || '').toLowerCase().includes(searchQuery) ||
      String(row.ten_khach_hang || '').toLowerCase().includes(searchQuery)
    );

    return matchYear && matchMonth && matchType && matchSearch;
  });

  // Giữ lựa chọn qua các lần tìm kiếm (chọn đơn của nhiều khách); bộ đếm báo rõ số đơn đang bị bộ lọc ẩn.
  exportVisibleOrderIds = new Set(filtered.map(row => row.id));

  // Render bảng
  const tbody = document.getElementById('export-orders-tbody');
  tbody.innerHTML = "";

  const selectAll = document.getElementById('export-orders-select-all');
  if (selectAll) selectAll.checked = filtered.length > 0 && filtered.every(row => selectedExportOrderIds.has(row.id));
  updateExportSelectedCount();

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Không tìm thấy đơn hàng nào khớp bộ lọc</td></tr>`;
    return;
  }

  filtered.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    // Phân biệt ký hiệu số lượng
    const qtyLabel = row.type === 'bang_keo' ? ' KG' : ' cuộn';

    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" ${selectedExportOrderIds.has(row.id) ? 'checked' : ''}>
      </td>
      <td><strong>${escapeExportHtml(row.id)}</strong></td>
      <td>${escapeExportHtml(utils.formatDate(row.thoi_gian))}</td>
      <td>${escapeExportHtml(row.ten_hang)}</td>
      <td>${escapeExportHtml(row.ten_khach_hang)}</td>
      <td style="text-align: right;">${formatExportQuantity(row.so_luong)}${qtyLabel}</td>
      <td style="text-align: right;">${utils.formatCurrency(row.don_gia_ban)}đ</td>
    `;
    tr.querySelector('input[type="checkbox"]')?.addEventListener('change', event => {
      toggleSelectOrder(row.id, event.target.checked);
    });
    tr.addEventListener('click', (event) => {
      if (event.target.tagName === 'INPUT') return;
      const checkbox = tr.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      toggleSelectOrder(row.id, checkbox.checked);
    });
    tr.addEventListener('dblclick', () => {
      const checkbox = tr.querySelector('input[type="checkbox"]');
      checkbox.checked = true;
      toggleSelectOrder(row.id, true);
      proceedToExportPreview();
    });
    tbody.appendChild(tr);
  });
}

function toggleSelectOrder(id, checked) {
  if (checked) {
    selectedExportOrderIds.add(id);
  } else {
    selectedExportOrderIds.delete(id);
  }
  updateExportSelectedCount();
}

// Hiển thị số đơn đang chọn cạnh nút Tiếp tục (phần tử tạo bằng JS, không cần sửa markup).
function updateExportSelectedCount() {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  let label = document.getElementById('export-selected-count');
  if (!label && typeof document.querySelector === 'function' && typeof document.createElement === 'function') {
    const proceedButton = document.querySelector('#modal-order-export [data-action-click="proceedToExportPreview"]');
    if (proceedButton?.parentNode) {
      label = document.createElement('span');
      label.id = 'export-selected-count';
      label.className = 'export-selected-count';
      label.style.marginRight = 'auto';
      label.style.alignSelf = 'center';
      label.style.color = 'var(--text-muted)';
      label.style.fontSize = '12px';
      proceedButton.parentNode.insertBefore(label, proceedButton.parentNode.firstChild);
    }
  }
  if (!label) return;
  const hidden = exportVisibleOrderIds
    ? Array.from(selectedExportOrderIds).filter(id => !exportVisibleOrderIds.has(id)).length
    : 0;
  label.textContent = hidden > 0
    ? `Đã chọn ${selectedExportOrderIds.size} đơn (${hidden} đơn đang bị bộ lọc ẩn)`
    : `Đã chọn ${selectedExportOrderIds.size} đơn`;
}

function toggleAllExportOrders(checked) {
  const checkboxes = document.querySelectorAll('#export-orders-tbody input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = checked;
    const tr = cb.closest('tr');
    if (tr && tr.dataset.id) {
      toggleSelectOrder(tr.dataset.id, checked);
    }
  });
}

// Bấm Tiếp tục sang modal Review Preview
async function proceedToExportPreview() {
  if (selectedExportOrderIds.size === 0) {
    utils.showToast("Vui lòng chọn ít nhất một đơn hàng để xuất!", "warning");
    return;
  }

  utils.showToast("Đang tải dữ liệu đơn hàng...", "info");

  // Nạp chi tiết các đơn hàng đã chọn
  const products = [];
  let firstOrder = null;
  let depositTotal = 0;

  const failedIds = [];

  for (const orderId of selectedExportOrderIds) {
    const tableName = getExportTableNameByOrderId(orderId);

    let res;
    try {
      res = await window.electronAPI.dbQuery('order.getById', { orderType: getExportOrderTypeByOrderId(orderId), id: orderId });
    } catch (err) {
      res = { ok: false, error: err?.message };
    }
    if (res?.ok && res.rows?.length > 0) {
      const order = res.rows[0];
      if (!firstOrder) firstOrder = order;
      depositTotal += Math.max(0, orderMath.money(order.tien_coc));
      products.push(...buildExportProductsFromOrder(order, tableName));
    } else {
      failedIds.push(orderId);
    }
  }

  // Thiếu đơn nào thì dừng hẳn: chứng từ thiếu dòng hàng/tiền cọc sẽ sai tổng tiền.
  if (failedIds.length > 0) {
    utils.showToast(`Không tải được dữ liệu đơn: ${failedIds.join(', ')}. Đã hủy xuất chứng từ.`, "danger");
    return;
  }

  exportPreviewData = {
    customer_name: firstOrder ? firstOrder.ten_khach_hang : "",
    address: "",
    products: products,
    deposit: depositTotal
  };

  // Prefill form review
  document.getElementById('preview-customer-name').value = exportPreviewData.customer_name;
  document.getElementById('preview-customer-address').value = "";
  // Tiền cọc mặc định = tổng tiền cọc của các đơn đã chọn (vẫn sửa được trước khi in).
  document.getElementById('preview-deposit').value = String(depositTotal);

  // Vẽ bảng review các dòng đơn hàng
  renderPreviewProductsTable();

  // Đóng modal chọn đơn, mở modal review preview
  document.getElementById('modal-order-export').classList.remove('active');
  document.getElementById('modal-export-preview').classList.add('active');
}

function getExportSpecsAndUnit(order, tableName) {
  let specs = "";
  let unit = "cuộn";
  if (tableName === 'bang_keo_in_orders') {
    specs = `${parseInt(order.quy_cach_mm || 0)}mm x ${parseInt(order.quy_cach_m || 0)}m x ${parseInt(order.quy_cach_mic || 0)}mic`;
  } else if (tableName === 'truc_in_orders') {
    const quyCach = String(order.quy_cach ?? '');
    specs = quyCach ? (quyCach.toLowerCase().endsWith('mm') ? quyCach : `${quyCach}mm`) : "";
  } else {
    // quy_cach là chữ tự do (vd '48mm x 100y'): chỉ thêm 'kg' khi giá trị chỉ là một con số.
    const quyCach = String(order.quy_cach ?? '').trim();
    specs = /^\d+(?:[.,]\d+)?$/.test(quyCach) ? `${quyCach}kg` : quyCach;
    unit = "KG";
  }
  return { specs, unit };
}

function buildExportLine(fields) {
  const quantity = Math.max(0, orderMath.number(fields.quantity));
  const price = Math.max(0, orderMath.number(fields.price));
  const storedTotal = Math.max(0, orderMath.money(fields.total));
  const total = storedTotal || orderMath.money(quantity * price);
  const vat = Math.max(0, orderMath.money(fields.vat));
  return {
    id: fields.id,
    product: fields.product,
    specs: fields.specs,
    text_color: fields.text_color || "",
    bg_color: fields.bg_color || "",
    unit: fields.unit,
    quantity,
    price,
    vat,
    // Tỷ lệ VAT được giữ lại để khi sửa số lượng/đơn giá thì VAT được tính lại đúng tỷ lệ.
    vatPercent: orderMath.vatPercentFromAmount(vat, total, fields.vatPercent),
    total
  };
}

// Dòng hàng trên phiếu = giá trị BÁN cho khách (không bao giờ lấy giá vốn). Đơn chuyển từ báo giá nhiều
// kích thước dùng từng dòng quote_items (giống PDF/Excel) để số lượng × đơn giá = thành tiền.
function buildExportProductsFromOrder(order, tableName) {
  const { specs, unit } = getExportSpecsAndUnit(order, tableName);
  const lines = [];
  const items = orderMath.parseQuoteItems(order.quote_items);
  if (items.length > 0 && orderMath.quoteItemsMatchOrder(order, items)) {
    items.forEach((item, itemIndex) => {
      lines.push(buildExportLine({
        id: `${order.id}-${itemIndex + 1}`,
        product: order.ten_hang,
        specs: item.specification && item.specification !== '-' ? item.specification : specs,
        text_color: item.details?.printColor || item.details?.color || order.mau_sac || "",
        bg_color: item.details?.glueColor || order.mau_keo || "",
        unit,
        quantity: item.quantity,
        price: item.unitPrice,
        vat: item.vat,
        vatPercent: item.vatPercent,
        total: item.total
      }));
      (Array.isArray(item.axes) ? item.axes : []).filter(axis => axis && typeof axis === 'object').forEach((axis, axisIndex) => {
        lines.push(buildExportLine({
          id: `${order.id}-${itemIndex + 1}-TRUC-${axisIndex + 1}`,
          product: axis.name || 'Trục mới',
          specs: axis.circumference ? `Chu vi ${axis.circumference}` : '',
          bg_color: 'Trục mới',
          unit: 'trục',
          quantity: axis.quantity,
          price: axis.unitPrice,
          vat: axis.vat,
          vatPercent: axis.vatPercent,
          total: axis.total
        }));
      });
    });
    return lines;
  }

  lines.push(buildExportLine({
    id: order.id,
    product: order.ten_hang,
    specs,
    text_color: order.mau_sac || "",
    bg_color: order.mau_keo || "",
    unit,
    quantity: order.so_luong,
    price: order.don_gia_ban,
    vat: order.vat,
    vatPercent: order.vat_percent,
    // Mọi bảng đều lưu giá bán ở thanh_tien_ban (bang_keo dùng thanh_tien cho giá vốn).
    total: order.thanh_tien_ban
  }));

  if (tableName === 'bang_keo_in_orders' && order.loai_truc === 'moi') {
    lines.push(buildExportLine({
      id: `${order.id}-TRUC`,
      product: order.ten_truc || 'Trục mới',
      specs: order.truc_chu_vi ? `Chu vi ${order.truc_chu_vi}` : '',
      bg_color: 'Trục mới',
      unit: 'trục',
      quantity: order.truc_so_luong,
      price: order.truc_gia_ban,
      vat: order.truc_vat,
      vatPercent: order.truc_vat_percent,
      total: order.truc_thanh_tien_ban
    }));
  }
  return lines;
}

// Trở lại màn hình chọn đơn hàng
function goBackToExportSelection() {
  document.getElementById('modal-export-preview').classList.remove('active');
  document.getElementById('modal-order-export').classList.add('active');
}

// Vẽ bảng các dòng sản phẩm có thể sửa đổi trong modal Review
function renderPreviewProductsTable() {
  const tbody = document.getElementById('preview-products-tbody');
  tbody.innerHTML = "";

  if (exportPreviewData.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--text-muted);">Không có dữ liệu dòng hàng</td></tr>`;
    return;
  }

  exportPreviewData.products.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="preview-input" value="${escapeExportHtml(p.product)}" data-preview-field="product"></td>
      <td><input type="text" class="preview-input" value="${escapeExportHtml(p.specs)}" data-preview-field="specs"></td>
      <td><input type="text" class="preview-input" value="${escapeExportHtml(p.bg_color)}" data-preview-field="bg_color"></td>
      <td><input type="text" class="preview-input" value="${escapeExportHtml(p.text_color)}" data-preview-field="text_color"></td>
      <td><input type="text" class="preview-input" value="${escapeExportHtml(p.unit)}" data-preview-field="unit"></td>
      <td><input type="number" min="0" class="preview-input" style="text-align: right;" value="${escapeExportHtml(p.quantity)}" data-preview-numeric="quantity"></td>
      <td><input type="number" min="0" class="preview-input" style="text-align: right;" value="${escapeExportHtml(p.price)}" data-preview-numeric="price"></td>
      <td><input type="number" min="0" class="preview-input" style="text-align: right;" value="${escapeExportHtml(p.vat || 0)}" data-preview-numeric="vat"></td>
      <td style="text-align: right; font-weight: 500;" id="preview-product-total-${idx}">${utils.formatCurrency(p.total)}đ</td>
      <td style="text-align: center;">
        <button class="btn btn-danger btn-sm" data-preview-delete style="padding: 2px 6px;">×</button>
      </td>
    `;
    tr.querySelectorAll('[data-preview-field]').forEach(input => {
      input.addEventListener('input', () => updatePreviewProduct(idx, input.dataset.previewField, input.value));
    });
    tr.querySelectorAll('[data-preview-numeric]').forEach(input => {
      input.addEventListener('input', () => updatePreviewProductNumeric(idx, input.dataset.previewNumeric, input.value, input));
    });
    tr.querySelector('[data-preview-delete]')?.addEventListener('click', () => deletePreviewProduct(idx));
    tbody.appendChild(tr);
  });

  recalculatePreviewTotals();
}

function updatePreviewProduct(idx, field, value) {
  exportPreviewData.products[idx][field] = value;
}

function updatePreviewProductNumeric(idx, field, value, inputEl = null) {
  const product = exportPreviewData.products[idx];
  if (!product) return;
  const text = String(value ?? '').trim();
  if (text === '') return; // đang xóa để gõ lại: giữ giá trị cũ
  const num = Number(text);
  if (!Number.isFinite(num) || num < 0) {
    utils.showToast("Số lượng, đơn giá và VAT không được âm", "warning");
    if (inputEl) inputEl.value = String(product[field] ?? 0);
    return;
  }

  if (field === 'vat') {
    // Sửa trực tiếp tiền VAT: ghi nhận tỷ lệ mới để lần sửa số lượng/đơn giá sau dùng tỷ lệ này.
    product.vat = orderMath.money(num);
    product.vatPercent = orderMath.vatPercentFromAmount(product.vat, product.total);
  } else {
    product[field] = num;
    // Tính lại thành tiền của dòng và VAT theo tỷ lệ VAT đã lưu
    product.total = orderMath.money(product.quantity * product.price);
    product.vat = orderMath.vatAmount(product.total, product.vatPercent);
    const vatInput = inputEl?.closest?.('tr')?.querySelector?.('[data-preview-numeric="vat"]');
    if (vatInput) vatInput.value = String(product.vat);
  }

  const totalCell = document.getElementById(`preview-product-total-${idx}`);
  if (totalCell) totalCell.innerText = utils.formatCurrency(product.total) + "đ";
  recalculatePreviewTotals();
}

function deletePreviewProduct(idx) {
  exportPreviewData.products.splice(idx, 1);
  renderPreviewProductsTable();
}

// Tính toán lại tổng tiền hàng, VAT, cọc và còn lại
function buildVoucherPdfHtml() {
  const content = document.getElementById('voucher-print-area')?.innerHTML || '';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; background: #fff; }
        @page { size: A4; margin: 12mm; }
      </style>
    </head>
    <body>${content}</body>
    </html>
  `;
}

function exportTodayFileDate() {
  if (typeof utils.toDateInputValue === 'function') return utils.toDateInputValue(new Date());
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function saveCurrentVoucherPdf() {
  const printArea = document.getElementById('voucher-print-area');
  if (!printArea || !printArea.innerHTML.trim()) {
    utils.showToast("Chưa có chứng từ để lưu PDF", "warning");
    return;
  }

  const prefix = activeExportDocType === 'phieu_giao_hang' ? 'phieu_giao_hang' : 'don_dat_hang';
  const savePath = await window.electronAPI.showSaveDialog({
    title: "Lưu chứng từ PDF",
    defaultPath: `${prefix}_${exportTodayFileDate()}.pdf`,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (!savePath || savePath.canceled || !savePath.filePath) return;

  const res = await window.electronAPI.printToPdf(buildVoucherPdfHtml(), savePath.filePath);
  if (res.ok) {
    utils.showToast("Đã lưu chứng từ PDF", "success");
  } else {
    utils.showToast("Không thể lưu PDF: " + res.error, "danger");
  }
}

async function triggerPrint() {
  const printArea = document.getElementById('voucher-print-area');
  if (!printArea || !printArea.innerHTML.trim()) {
    utils.showToast("Chưa có chứng từ để in", "warning");
    return;
  }

  const res = await window.electronAPI.printWindow();
  if (!res || !res.ok) {
    utils.showToast("Không thể mở hộp thoại in", "danger");
  }
}

function recalculatePreviewTotals() {
  const depositInput = document.getElementById('preview-deposit');
  if (Number(depositInput.value) < 0) {
    depositInput.value = '0';
    utils.showToast('Tiền cọc không được âm', 'warning');
  }
  const totals = orderMath.calculateVoucherTotals(
    exportPreviewData.products,
    document.getElementById('preview-deposit').value
  );

  document.getElementById('preview-total-sum').value = `${utils.formatCurrency(totals.subtotal)}đ + VAT ${utils.formatCurrency(totals.vat)}đ`;
  document.getElementById('preview-remaining').value = utils.formatCurrency(totals.remaining) + "đ";
}

// Khởi tạo hiển thị phiếu in và trigger modal xem trước chuẩn A4 Arial (ReportLab style)
function generateCombinedPrintInvoice() {
  const customerName = document.getElementById('preview-customer-name').value.trim();
  const address = document.getElementById('preview-customer-address').value.trim();
  const totals = orderMath.calculateVoucherTotals(
    exportPreviewData.products,
    document.getElementById('preview-deposit').value
  );
  const { vat, deposit, totalPayable, remaining } = totals;

  if (exportPreviewData.products.length === 0) {
    utils.showToast("Không có sản phẩm nào để xuất!", "warning");
    return;
  }

  const printArea = document.getElementById('voucher-print-area');
  const title = activeExportDocType === 'phieu_giao_hang' ? 'PHIẾU GIAO HÀNG' : 'ĐƠN ĐẶT HÀNG';
  const company = utils.companyInfo || {};

  // Render rows
  let rowsHtml = "";
  exportPreviewData.products.forEach((p, idx) => {
    rowsHtml += `
      <tr>
        <td style="border: 0.5px solid #000; padding: 4px; text-align: left;">${escapeExportHtml(p.product)}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${escapeExportHtml(p.specs)}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${escapeExportHtml(p.text_color || "")}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${escapeExportHtml(p.bg_color || "")}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${escapeExportHtml(p.unit)}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${formatExportQuantity(p.quantity)}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${utils.formatCurrency(p.price)}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${utils.formatCurrency(p.vat || 0)}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${utils.formatCurrency(p.total)}</td>
      </tr>
    `;
  });

  // Render sign sections
  let signSection = "";
  if (activeExportDocType === 'phieu_giao_hang') {
    signSection = `
      <table style="width: 100%; border-collapse: collapse; border: none; font-family: Arial, sans-serif; font-size: 9pt; margin-top: 40px; text-align: center;">
        <tr>
          <td style="width: 50%; text-align: left; font-weight: bold; vertical-align: top; padding-left: 20px;">
            NGƯỜI GIAO HÀNG
          </td>
          <td style="width: 50%; text-align: right; font-weight: bold; vertical-align: top; padding-right: 20px;">
            NGƯỜI NHẬN HÀNG
          </td>
        </tr>
        <tr style="height: 100px;">
          <td></td>
          <td></td>
        </tr>
      </table>
    `;
  } else {
    signSection = `
      <table style="width: 100%; border-collapse: collapse; border: none; font-family: Arial, sans-serif; font-size: 9pt; margin-top: 40px; text-align: center;">
        <tr>
          <td style="width: 50%; text-align: left; font-weight: bold; vertical-align: top; padding-left: 20px;">
            NGƯỜI NHẬN HÀNG
          </td>
          <td style="width: 50%; text-align: right; font-weight: bold; vertical-align: top; padding-right: 20px; line-height: 1.4;">
            ${escapeExportHtml(company.name || '')}<br>
            <span style="font-weight: normal; font-size: 8pt; display: block; margin-top: 2px;">ĐẠI DIỆN THƯƠNG MẠI</span>
          </td>
        </tr>
        <tr style="height: 60px;">
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td></td>
          <td style="text-align: right; font-weight: bold; padding-right: 20px; line-height: 1.3;">
            ${escapeExportHtml(company.representative || '')}<br>
            <span style="font-weight: normal; font-size: 8pt; font-style: italic;">HP:${escapeExportHtml(company.representativePhone || '')}</span>
          </td>
        </tr>
      </table>
    `;
  }

  // Tiền bằng chữ
  const wordsAmount = orderMath.toVietnameseWords(remaining);
  const dateStr = utils.formatDate(new Date());

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.4; font-size: 10pt; padding: 10px;">
      <!-- Header -->
      <div style="border-top: 6px solid #2563eb; border-bottom: 1px solid #dbe4f0; padding: 12px 16px 14px; margin-bottom: 18px;">
        <table style="width: 100%; border-collapse: collapse; border: none;">
          <tr>
            <td style="width: 72px; vertical-align: middle;">
              <img src="assets/logo.png" alt="Logo" style="width: 64px; height: 64px; object-fit: contain; display: block;">
            </td>
            <td style="text-align: center; vertical-align: middle;">
              <div style="color: #1d4ed8; font-size: 15pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase;">${escapeExportHtml(company.name || '')}</div>
              <div style="font-size: 10pt; color: #334155; margin-bottom: 2px;">${escapeExportHtml(company.address || '')}</div>
              <div style="font-size: 10pt; color: #334155;">Hotline: ${escapeExportHtml(company.hotline || '')}</div>
            </td>
            <td style="width: 72px;"></td>
          </tr>
        </table>
      </div>

      <!-- Title -->
      <div style="text-align: center; font-size: 20pt; font-weight: bold; margin-top: 15px; margin-bottom: 25px; text-transform: uppercase;">
        ${escapeExportHtml(title)}
      </div>

      <!-- Khách hàng -->
      <table style="width: 100%; border-collapse: collapse; border: none; font-size: 10pt; margin-bottom: 15px;">
        <tr style="height: 24px;">
          <td style="width: 12%; font-weight: bold; padding: 2px 0;">Kính gửi:</td>
          <td style="width: 68%; padding: 2px 0; font-size: 11pt;">${customerName ? escapeExportHtml(customerName) : '................................................................................'}</td>
          <td style="width: 20%; padding: 2px 0; text-align: right; font-weight: bold;">Ngày: ${dateStr}</td>
        </tr>
        <tr style="height: 24px;">
          <td style="font-weight: bold; padding: 2px 0;">Địa chỉ:</td>
          <td colspan="2" style="padding: 2px 0;">${address ? escapeExportHtml(address) : '................................................................................'}</td>
        </tr>
      </table>

      <!-- Bảng hàng hóa -->
      <table style="width: 100%; border-collapse: collapse; font-size: 9pt; border: 0.5px solid #000; text-align: center; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #d3d3d3; font-weight: bold;">
            <th rowspan="2" style="border: 0.5px solid #000; padding: 4px; text-align: left; width: 23.2%;">Tên Sản Phẩm</th>
            <th rowspan="2" style="border: 0.5px solid #000; padding: 4px; width: 10.3%;">Quy Cách</th>
            <th colspan="2" style="border: 0.5px solid #000; padding: 4px; width: 20.6%;">In Ấn</th>
            <th rowspan="2" style="border: 0.5px solid #000; padding: 4px; width: 10.3%;">Đơn Vị Tính</th>
            <th colspan="3" style="border: 0.5px solid #000; padding: 4px; width: 28.6%;">Đơn Giá Theo Số Lượng</th>
            <th rowspan="2" style="border: 0.5px solid #000; padding: 4px; width: 11%;">Tổng Cộng</th>
          </tr>
          <tr style="background-color: #d3d3d3; font-weight: bold;">
            <th style="border: 0.5px solid #000; padding: 4px; width: 10.3%;">Màu Sắc</th>
            <th style="border: 0.5px solid #000; padding: 4px; width: 10.3%;">Màu Keo</th>
            <th style="border: 0.5px solid #000; padding: 4px; width: 11.3%;">Số lượng</th>
            <th style="border: 0.5px solid #000; padding: 4px; width: 11.3%;">Đơn Giá</th>
            <th style="border: 0.5px solid #000; padding: 4px; width: 6%;">VAT</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr>
            <td colspan="6" style="border: none;"></td>
            <td colspan="2" style="border: 0.5px solid #000; padding: 6px 8px; text-align: right; font-weight: 600; white-space: nowrap;">VAT</td>
            <td style="border: 0.5px solid #000; padding: 6px 8px; text-align: right; white-space: nowrap;">${utils.formatCurrency(vat)}</td>
          </tr>
          <tr style="background-color: #f1f5f9;">
            <td colspan="6" style="border: none; background: #fff;"></td>
            <td colspan="2" style="border: 0.5px solid #000; padding: 6px 8px; text-align: right; font-weight: bold; white-space: nowrap;">Tổng cộng</td>
            <td style="border: 0.5px solid #000; padding: 6px 8px; text-align: right; font-weight: bold; white-space: nowrap;">${utils.formatCurrency(totalPayable)}</td>
          </tr>
          <tr>
            <td colspan="6" style="border: none;"></td>
            <td colspan="2" style="border: 0.5px solid #000; padding: 6px 8px; text-align: right; white-space: nowrap;">Tiền cọc</td>
            <td style="border: 0.5px solid #000; padding: 6px 8px; text-align: right; color: #dc2626; white-space: nowrap;">${deposit > 0 ? '-' : ''}${utils.formatCurrency(deposit)}</td>
          </tr>
          <tr style="background-color: #eaf2ff; font-weight: bold;">
            <td colspan="6" style="border: none; background: #fff;"></td>
            <td colspan="2" style="border: 0.5px solid #000; padding: 7px 8px; text-align: right; white-space: nowrap; color: #1e3a8a;">Còn lại cần thu</td>
            <td style="border: 0.5px solid #000; padding: 7px 8px; text-align: right; font-size: 11pt; color: #1e3a8a; white-space: nowrap;">${utils.formatCurrency(remaining)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Tiền bằng chữ -->
      <div style="font-style: italic; margin-bottom: 30px; font-size: 10pt;">
        Số tiền bằng chữ: <strong>${escapeExportHtml(wordsAmount)} đồng chẵn.</strong>
      </div>

      <!-- Ký tá -->
      ${signSection}
    </div>
  `;

  printArea.innerHTML = htmlContent;
  
  // Đóng modal preview điều chỉnh, mở modal in A4 chuẩn
  document.getElementById('modal-export-preview').classList.remove('active');
  document.getElementById('modal-view-voucher').classList.add('active');
}
