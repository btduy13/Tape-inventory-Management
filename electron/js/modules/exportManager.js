// JS/MODULES/EXPORTMANAGER.JS - LOGIC XUẤT ĐƠN / PHIẾU GIAO HÀNG HÀNG LOẠT

var activeExportDocType = 'don_dat_hang';
var selectedExportOrderIds = new Set();
var exportAllOrders = [];
var exportPreviewData = null;

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
  const sql = `
    SELECT id, thoi_gian, ten_hang, ten_khach_hang, so_luong, don_gia_ban, 'bang_keo_in' as type FROM bang_keo_in_orders
    UNION ALL
    SELECT id, thoi_gian, ten_hang, ten_khach_hang, so_luong, don_gia_ban, 'truc_in' as type FROM truc_in_orders
    UNION ALL
    SELECT id, thoi_gian, ten_hang, ten_khach_hang, so_luong, don_gia_ban, 'bang_keo' as type FROM bang_keo_orders
    ORDER BY thoi_gian DESC;
  `;
  const res = await window.electronAPI.dbQuery(sql);
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
      row.id.toLowerCase().includes(searchQuery) ||
      row.ten_hang.toLowerCase().includes(searchQuery) ||
      row.ten_khach_hang.toLowerCase().includes(searchQuery)
    );

    return matchYear && matchMonth && matchType && matchSearch;
  });

  // Render bảng
  const tbody = document.getElementById('export-orders-tbody');
  tbody.innerHTML = "";

  document.getElementById('export-orders-select-all').checked = false;

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
        <input type="checkbox" ${selectedExportOrderIds.has(row.id) ? 'checked' : ''} onchange="toggleSelectOrder('${row.id}', this.checked)">
      </td>
      <td><strong>${row.id}</strong></td>
      <td>${utils.formatDate(row.thoi_gian)}</td>
      <td>${row.ten_hang}</td>
      <td>${row.ten_khach_hang}</td>
      <td style="text-align: right;">${row.so_luong.toLocaleString()}${qtyLabel}</td>
      <td style="text-align: right;">${utils.formatCurrency(row.don_gia_ban)}đ</td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleSelectOrder(id, checked) {
  if (checked) {
    selectedExportOrderIds.add(id);
  } else {
    selectedExportOrderIds.delete(id);
  }
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

  for (const orderId of selectedExportOrderIds) {
    let tableName = 'bang_keo_orders';
    if (orderId.startsWith('BK')) tableName = 'bang_keo_in_orders';
    else if (orderId.startsWith('TI')) tableName = 'truc_in_orders';

    const res = await window.electronAPI.dbQuery(`SELECT * FROM ${tableName} WHERE id = $1`, [orderId]);
    if (res.ok && res.rows.length > 0) {
      const order = res.rows[0];
      if (!firstOrder) firstOrder = order;

      // Quy cách và đơn vị tính
      let specs = "";
      let unit = "cuộn";
      if (tableName === 'bang_keo_in_orders') {
        specs = `${parseInt(order.quy_cach_mm || 0)}mm x ${parseInt(order.quy_cach_m || 0)}m x ${parseInt(order.quy_cach_mic || 0)}mic`;
      } else if (tableName === 'truc_in_orders') {
        specs = order.quy_cach ? (order.quy_cach.toLowerCase().endsWith('mm') ? order.quy_cach : `${order.quy_cach}mm`) : "";
      } else {
        specs = order.quy_cach ? `${order.quy_cach}kg` : "";
        unit = "KG";
      }

      products.push({
        id: order.id,
        product: order.ten_hang,
        specs: specs,
        text_color: order.mau_sac || "",
        bg_color: order.mau_keo || "",
        unit: unit,
        quantity: order.so_luong || 0,
        price: order.don_gia_ban || 0,
        total: order.thanh_tien_ban || order.thanh_tien_goc || 0
      });
    }
  }

  exportPreviewData = {
    customer_name: firstOrder ? firstOrder.ten_khach_hang : "",
    address: "",
    products: products,
    vat: 0,
    deposit: 0
  };

  // Prefill form review
  document.getElementById('preview-customer-name').value = exportPreviewData.customer_name;
  document.getElementById('preview-customer-address').value = "";
  document.getElementById('preview-vat').value = "0";
  document.getElementById('preview-deposit').value = "0";

  // Vẽ bảng review các dòng đơn hàng
  renderPreviewProductsTable();

  // Đóng modal chọn đơn, mở modal review preview
  document.getElementById('modal-order-export').classList.remove('active');
  document.getElementById('modal-export-preview').classList.add('active');
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
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">Không có dữ liệu dòng hàng</td></tr>`;
    return;
  }

  exportPreviewData.products.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="preview-input" value="${p.product}" oninput="updatePreviewProduct(${idx}, 'product', this.value)"></td>
      <td><input type="text" class="preview-input" value="${p.specs}" oninput="updatePreviewProduct(${idx}, 'specs', this.value)"></td>
      <td><input type="text" class="preview-input" value="${p.bg_color}" oninput="updatePreviewProduct(${idx}, 'bg_color', this.value)"></td>
      <td><input type="text" class="preview-input" value="${p.text_color}" oninput="updatePreviewProduct(${idx}, 'text_color', this.value)"></td>
      <td><input type="text" class="preview-input" value="${p.unit}" oninput="updatePreviewProduct(${idx}, 'unit', this.value)"></td>
      <td><input type="number" class="preview-input" style="text-align: right;" value="${p.quantity}" oninput="updatePreviewProductNumeric(${idx}, 'quantity', this.value)"></td>
      <td><input type="number" class="preview-input" style="text-align: right;" value="${p.price}" oninput="updatePreviewProductNumeric(${idx}, 'price', this.value)"></td>
      <td style="text-align: right; font-weight: 500;" id="preview-product-total-${idx}">${utils.formatCurrency(p.total)}đ</td>
      <td style="text-align: center;">
        <button class="btn btn-danger btn-sm" onclick="deletePreviewProduct(${idx})" style="padding: 2px 6px;">×</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  recalculatePreviewTotals();
}

function updatePreviewProduct(idx, field, value) {
  exportPreviewData.products[idx][field] = value;
}

function updatePreviewProductNumeric(idx, field, value) {
  const num = parseFloat(value) || 0;
  exportPreviewData.products[idx][field] = num;

  // Tính lại thành tiền của dòng
  const rowTotal = exportPreviewData.products[idx].quantity * exportPreviewData.products[idx].price;
  exportPreviewData.products[idx].total = rowTotal;

  document.getElementById(`preview-product-total-${idx}`).innerText = utils.formatCurrency(rowTotal) + "đ";
  recalculatePreviewTotals();
}

function deletePreviewProduct(idx) {
  exportPreviewData.products.splice(idx, 1);
  renderPreviewProductsTable();
}

// Tính toán lại tổng tiền hàng, VAT, cọc và còn lại
function recalculatePreviewTotals() {
  const totalSum = exportPreviewData.products.reduce((acc, curr) => acc + curr.total, 0);
  const vat = parseFloat(document.getElementById('preview-vat').value) || 0;
  const deposit = parseFloat(document.getElementById('preview-deposit').value) || 0;
  
  const remaining = totalSum + vat - deposit;

  document.getElementById('preview-total-sum').value = utils.formatCurrency(totalSum) + "đ";
  document.getElementById('preview-remaining').value = utils.formatCurrency(remaining) + "đ";
}

// Khởi tạo hiển thị phiếu in và trigger modal xem trước chuẩn A4 Arial (ReportLab style)
function generateCombinedPrintInvoice() {
  const customerName = document.getElementById('preview-customer-name').value.trim();
  const address = document.getElementById('preview-customer-address').value.trim();
  const vat = parseFloat(document.getElementById('preview-vat').value) || 0;
  const deposit = parseFloat(document.getElementById('preview-deposit').value) || 0;
  
  const totalSum = exportPreviewData.products.reduce((acc, curr) => acc + curr.total, 0);
  const totalPayable = totalSum + vat;
  const remaining = totalPayable - deposit;

  if (exportPreviewData.products.length === 0) {
    utils.showToast("Không có sản phẩm nào để xuất!", "warning");
    return;
  }

  const printArea = document.getElementById('voucher-print-area');
  const title = activeExportDocType === 'phieu_giao_hang' ? 'PHIẾU GIAO HÀNG' : 'ĐƠN ĐẶT HÀNG';

  // Render rows
  let rowsHtml = "";
  exportPreviewData.products.forEach((p, idx) => {
    rowsHtml += `
      <tr>
        <td style="border: 0.5px solid #000; padding: 4px; text-align: left;">${p.product}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${p.specs}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${p.text_color || ""}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${p.bg_color || ""}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${p.unit}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${parseFloat(p.quantity).toLocaleString()}</td>
        <td style="border: 0.5px solid #000; padding: 4px;">${utils.formatCurrency(p.price)}</td>
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
            CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI<br>BĂNG KEO IN VĨNH THỊNH<br>
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
            LÝ THANH QUẾ<br>
            <span style="font-weight: normal; font-size: 8pt; font-style: italic;">HP:090 300 3882</span>
          </td>
        </tr>
      </table>
    `;
  }

  // Tiền bằng chữ
  const wordsAmount = convertNumToVietnameseWords(remaining);
  const dateStr = utils.formatDate(new Date());

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #000; line-height: 1.4; font-size: 10pt; padding: 10px;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 15px;">
        <div style="color: #ff0000; font-size: 15pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase;">CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI BĂNG KEO IN VĨNH THỊNH</div>
        <div style="font-size: 10pt; color: #000; margin-bottom: 2px;">90E đường số 18B, P. Bình Hưng Hòa A, Q. Bình Tân, TP. HCM, Việt Nam</div>
        <div style="font-size: 10pt; color: #000; margin-bottom: 10px;">Hotline: 0903003882 - 0936380405</div>
      </div>

      <!-- Title -->
      <div style="text-align: center; font-size: 20pt; font-weight: bold; margin-top: 15px; margin-bottom: 25px; text-transform: uppercase;">
        ${title}
      </div>

      <!-- Khách hàng -->
      <table style="width: 100%; border-collapse: collapse; border: none; font-size: 10pt; margin-bottom: 15px;">
        <tr style="height: 24px;">
          <td style="width: 12%; font-weight: bold; padding: 2px 0;">Kính gửi:</td>
          <td style="width: 68%; padding: 2px 0; font-size: 11pt;">${customerName || '................................................................................'}</td>
          <td style="width: 20%; padding: 2px 0; text-align: right; font-weight: bold;">Ngày: ${dateStr}</td>
        </tr>
        <tr style="height: 24px;">
          <td style="font-weight: bold; padding: 2px 0;">Địa chỉ:</td>
          <td colspan="2" style="padding: 2px 0;">${address || '................................................................................'}</td>
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
            <th colspan="2" style="border: 0.5px solid #000; padding: 4px; width: 22.6%;">Đơn Giá Theo Số Lượng</th>
            <th rowspan="2" style="border: 0.5px solid #000; padding: 4px; width: 13%;">Tổng Cộng</th>
          </tr>
          <tr style="background-color: #d3d3d3; font-weight: bold;">
            <th style="border: 0.5px solid #000; padding: 4px; width: 10.3%;">Màu Sắc</th>
            <th style="border: 0.5px solid #000; padding: 4px; width: 10.3%;">Màu Keo</th>
            <th style="border: 0.5px solid #000; padding: 4px; width: 11.3%;">Số lượng</th>
            <th style="border: 0.5px solid #000; padding: 4px; width: 11.3%;">Đơn Giá</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr>
            <td colspan="6" style="border: none;"></td>
            <td style="border: 0.5px solid #000; padding: 4px; text-align: right; font-weight: bold;">VAT</td>
            <td style="border: 0.5px solid #000; padding: 4px; text-align: right;">${utils.formatCurrency(vat)}</td>
          </tr>
          <tr>
            <td colspan="6" style="border: none;"></td>
            <td style="border: 0.5px solid #000; padding: 4px; text-align: right; font-weight: bold;">Tổng Cộng</td>
            <td style="border: 0.5px solid #000; padding: 4px; text-align: right; font-weight: bold;">${utils.formatCurrency(totalPayable)}</td>
          </tr>
          <tr>
            <td colspan="6" style="border: none;"></td>
            <td style="border: 0.5px solid #000; padding: 4px; text-align: right; font-style: italic;">Cọc</td>
            <td style="border: 0.5px solid #000; padding: 4px; text-align: right; color: red;">-${utils.formatCurrency(deposit)}</td>
          </tr>
          <tr style="background-color: #f9f9f9; font-weight: bold;">
            <td colspan="6" style="border: none;"></td>
            <td style="border: 0.5px solid #000; padding: 4px; text-align: right;">Còn Lại</td>
            <td style="border: 0.5px solid #000; padding: 4px; text-align: right; font-size:11pt; color: #1e3a8a;">${utils.formatCurrency(remaining)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Tiền bằng chữ -->
      <div style="font-style: italic; margin-bottom: 30px; font-size: 10pt;">
        Số tiền bằng chữ: <strong>${wordsAmount} đồng chẵn.</strong>
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

// Copy hàm chuyển số thành chữ từ thongke.js
function convertNumToVietnameseWords(number) {
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
