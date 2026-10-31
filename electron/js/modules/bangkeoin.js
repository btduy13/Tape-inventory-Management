// JS/MODULES/BANGKEOIN.JS - LOGIC CHO PHÂN HỆ BĂNG KEO IN
document.addEventListener('DOMContentLoaded', () => {
  // Gắn sự kiện tính toán tự động khi gõ số (Đơn hàng & Báo giá)
  const inputSuffixes = [
    'so-luong', 'phi-sl', 'phi-keo', 'phi-mau', 'phi-size',
    'phi-cat', 'don-gia-von', 'don-gia-ban', 'tien-coc',
    'tien-ship', 'hoa-hong-percent', 'vat', 'qc-m', 'cuon-cay',
    'truc-so-luong', 'truc-gia-goc', 'truc-gia-ban', 'truc-vat', 'truc-hoa-hong-percent'
  ];
  
  inputSuffixes.forEach(suffix => {
    const el = document.getElementById(`bki-${suffix}`);
    if (el) el.addEventListener('input', () => calculateBangKeoIn('order'));

    const qEl = document.getElementById(`q-bki-${suffix}`);
    if (qEl) qEl.addEventListener('input', () => calculateBangKeoIn('quote'));
  });

  // Autocomplete cho Đơn hàng
  const tenHangEl = document.getElementById('bki-ten-hang');
  const suggsEl = document.getElementById('bki-suggestions');
  if (tenHangEl && suggsEl) {
    utils.setupAutocomplete(tenHangEl, suggsEl, queryBangKeoInSuggestions, (val) => autofillBangKeoInData(val, 'order'));
  }

  // Autocomplete cho Báo giá
  const qTenHangEl = document.getElementById('q-bki-ten-hang');
  const qSuggsEl = document.getElementById('q-bki-suggestions');
  if (qTenHangEl && qSuggsEl) {
    utils.setupAutocomplete(qTenHangEl, qSuggsEl, queryBangKeoInSuggestions, (val) => autofillBangKeoInData(val, 'quote'));
  }

  setBangKeoInAxisMode('order', 'cu');
  setBangKeoInAxisMode('quote', 'cu');
});

function setBangKeoInAxisMode(mode = 'order', axisMode = 'cu', options = {}) {
  const prefix = (mode === 'quote') ? 'q-bki-' : 'bki-';
  const isNewAxis = axisMode === 'moi';

  const valueEl = document.getElementById(`${prefix}loai-truc`);
  const cardEl = document.getElementById(`${prefix}new-axis-card`);
  const switchButton = document.getElementById(`${prefix}axis-switch`);

  if (valueEl) valueEl.value = axisMode;
  if (cardEl) cardEl.style.display = isNewAxis ? 'block' : 'none';
  if (switchButton) {
    switchButton.classList.toggle('is-new', isNewAxis);
    switchButton.setAttribute('aria-checked', String(isNewAxis));
    switchButton.setAttribute('aria-label', isNewAxis ? 'Đang dùng trục mới. Nhấn để chuyển sang trục cũ' : 'Đang dùng trục cũ. Nhấn để chuyển sang trục mới');
  }

  ['truc-ten', 'truc-so-luong', 'truc-gia-goc', 'truc-gia-ban'].forEach(suffix => {
    const el = document.getElementById(`${prefix}${suffix}`);
    if (el) el.required = isNewAxis;
  });
  // Chu vi trục là thông tin tùy chọn, không bắt buộc kể cả khi dùng trục mới
  const axisCircumferenceEl = document.getElementById(`${prefix}truc-chu-vi`);
  if (axisCircumferenceEl) axisCircumferenceEl.required = false;

  if (!isNewAxis && !options.preserveFields) {
    clearBangKeoInAxisFields(mode);
    if (mode === 'quote' && typeof getActiveQuoteDraft === 'function') {
      getActiveQuoteDraft('bang_keo_in').savedAxes = [];
    }
  }

  if (mode === 'quote' && typeof renderQuoteAxisTree === 'function') renderQuoteAxisTree();

  calculateBangKeoIn(mode);
}

function toggleBangKeoInAxisMode(mode = 'order') {
  const prefix = mode === 'quote' ? 'q-bki-' : 'bki-';
  const currentMode = document.getElementById(`${prefix}loai-truc`)?.value || 'cu';
  setBangKeoInAxisMode(mode, currentMode === 'moi' ? 'cu' : 'moi');
}

function clearBangKeoInAxisFields(mode = 'order') {
  const prefix = (mode === 'quote') ? 'q-bki-' : 'bki-';
  const defaults = {
    'truc-ten': '',
    'truc-chu-vi': '',
    'truc-so-luong': '',
    'truc-gia-goc': '0',
    'truc-gia-ban': '0',
    'truc-vat': '0',
    'truc-thanh-tien-goc': '0',
    'truc-thanh-tien-ban': '0',
    'truc-vat-amount': '0',
    'truc-ctv': '',
    'truc-hoa-hong-percent': '0',
    'truc-tien-hoa-hong': '0',
    'truc-loi-nhuan': '0',
    'truc-loi-nhuan-rong': '0'
  };

  Object.entries(defaults).forEach(([suffix, value]) => {
    const el = document.getElementById(`${prefix}${suffix}`);
    if (el) el.value = value;
  });
}

// 1. Tìm gợi ý tên hàng từ lịch sử đơn Băng Keo In
async function queryBangKeoInSuggestions(query) {
  const res = await window.electronAPI.dbQuery('order.suggestNames', { orderType: 'bang_keo_in', query: String(query ?? '') });
  if (res.ok) {
    return res.rows.map(r => r.ten_hang);
  }
  return [];
}

// 2. Tự động điền dữ liệu từ đơn hàng gần nhất
async function autofillBangKeoInData(tenHang, mode = 'order') {
  try {
    const prefix = (mode === 'quote') ? 'q-bki-' : 'bki-';
    const res = await window.electronAPI.dbQuery('order.latestByName', { orderType: 'bang_keo_in', name: tenHang });
    if (res.ok && res.rows.length > 0) {
      const order = res.rows[0];
      
      document.getElementById(`${prefix}ten-khach-hang`).value = order.ten_khach_hang || "";
      document.getElementById(`${prefix}qc-mm`).value = order.quy_cach_mm || "";
      document.getElementById(`${prefix}qc-m`).value = order.quy_cach_m || "";
      document.getElementById(`${prefix}qc-mic`).value = order.quy_cach_mic || "";
      document.getElementById(`${prefix}cuon-cay`).value = order.cuon_cay || "";
      document.getElementById(`${prefix}mau-keo`).value = order.mau_keo || "";
      document.getElementById(`${prefix}mau-sac`).value = order.mau_sac || "";
      document.getElementById(`${prefix}loi-giay`).value = order.loi_giay || "";
      document.getElementById(`${prefix}thung-bao`).value = order.thung_bao || "";

      document.getElementById(`${prefix}so-luong`).value = order.so_luong || "";
      document.getElementById(`${prefix}phi-sl`).value = utils.formatCurrency(order.phi_sl || 0);
      document.getElementById(`${prefix}phi-keo`).value = utils.formatCurrency(order.phi_keo || 0);
      document.getElementById(`${prefix}phi-mau`).value = utils.formatCurrency(order.phi_mau || 0);
      document.getElementById(`${prefix}phi-size`).value = utils.formatCurrency(order.phi_size || 0);
      document.getElementById(`${prefix}phi-cat`).value = utils.formatCurrency(order.phi_cat || 0);
      document.getElementById(`${prefix}don-gia-von`).value = utils.formatCurrency(order.don_gia_von || 0);
      document.getElementById(`${prefix}don-gia-ban`).value = utils.formatCurrency(order.don_gia_ban || 0);
      document.getElementById(`${prefix}tien-coc`).value = utils.formatCurrency(order.tien_coc || 0);
      document.getElementById(`${prefix}tien-ship`).value = utils.formatCurrency(order.tien_ship || 0);
      document.getElementById(`${prefix}ctv`).value = order.ctv || "";
      document.getElementById(`${prefix}hoa-hong-percent`).value = order.hoa_hong || 0;
      document.getElementById(`${prefix}vat`).value = Number(order.vat_percent) > 0
        ? order.vat_percent
        : (order.thanh_tien_ban ? (Number(order.vat || 0) / Number(order.thanh_tien_ban) * 100).toFixed(2) : 0);

      if (order.loai_truc === 'moi') {
        setBangKeoInAxisMode(mode, 'moi');
        document.getElementById(`${prefix}truc-ten`).value = order.ten_truc || "";
        document.getElementById(`${prefix}truc-chu-vi`).value = order.truc_chu_vi || "";
        document.getElementById(`${prefix}truc-so-luong`).value = order.truc_so_luong || "";
        document.getElementById(`${prefix}truc-gia-goc`).value = utils.formatCurrency(order.truc_gia_goc || 0);
        document.getElementById(`${prefix}truc-gia-ban`).value = utils.formatCurrency(order.truc_gia_ban || 0);
        document.getElementById(`${prefix}truc-vat`).value = Number(order.truc_vat_percent) > 0
          ? order.truc_vat_percent
          : (order.truc_thanh_tien_ban ? (Number(order.truc_vat || 0) / Number(order.truc_thanh_tien_ban) * 100).toFixed(2) : 0);
        document.getElementById(`${prefix}truc-ctv`).value = order.truc_ctv || "";
        document.getElementById(`${prefix}truc-hoa-hong-percent`).value = order.truc_hoa_hong || 0;
      } else {
        setBangKeoInAxisMode(mode, 'cu');
      }

      calculateBangKeoIn(mode);
      utils.showToast("Đã tự điền thông tin cũ", "success");
    }
  } catch (err) {
    window.electronAPI.writeLog('error', 'Lỗi tự động điền đơn Băng Keo In: ' + err.message);
  }
}

// 3. Tính toán tiền nong của đơn Băng Keo In
function calculateBangKeoIn(mode = 'order') {
  try {
    const prefix = (mode === 'quote') ? 'q-bki-' : 'bki-';
    const isNewAxis = document.getElementById(`${prefix}loai-truc`)?.value === 'moi';
    const result = orderMath.calculatePrintedTape({
      quantity: document.getElementById(`${prefix}so-luong`).value,
      baseCost: utils.parseCurrency(document.getElementById(`${prefix}don-gia-von`).value),
      quantityFee: utils.parseCurrency(document.getElementById(`${prefix}phi-sl`).value),
      glueFee: utils.parseCurrency(document.getElementById(`${prefix}phi-keo`).value),
      colorFee: utils.parseCurrency(document.getElementById(`${prefix}phi-mau`).value),
      sizeFee: utils.parseCurrency(document.getElementById(`${prefix}phi-size`).value),
      cuttingFee: utils.parseCurrency(document.getElementById(`${prefix}phi-cat`).value),
      salePrice: utils.parseCurrency(document.getElementById(`${prefix}don-gia-ban`).value),
      deposit: utils.parseCurrency(document.getElementById(`${prefix}tien-coc`).value),
      vatPercent: orderMath.percent(document.getElementById(`${prefix}vat`)?.value),
      commissionPercent: document.getElementById(`${prefix}hoa-hong-percent`).value,
      shipping: utils.parseCurrency(document.getElementById(`${prefix}tien-ship`).value),
      rollLength: document.getElementById(`${prefix}qc-m`).value,
      rollsPerTree: document.getElementById(`${prefix}cuon-cay`).value,
      isNewAxis,
      axisQuantity: document.getElementById(`${prefix}truc-so-luong`)?.value,
      axisCostPrice: utils.parseCurrency(document.getElementById(`${prefix}truc-gia-goc`)?.value),
      axisSalePrice: utils.parseCurrency(document.getElementById(`${prefix}truc-gia-ban`)?.value),
      axisVatPercent: orderMath.percent(document.getElementById(`${prefix}truc-vat`)?.value),
      axisCommissionPercent: document.getElementById(`${prefix}truc-hoa-hong-percent`)?.value
    });

    // C. Cập nhật lên UI
    document.getElementById(`${prefix}don-gia-goc`).value = utils.formatCurrency(result.product.costPrice);
    document.getElementById(`${prefix}thanh-tien-goc`).value = utils.formatCurrency(result.product.costTotal);
    document.getElementById(`${prefix}thanh-tien-ban`).value = utils.formatCurrency(result.product.saleTotal);
    const vatAmountEl = document.getElementById(`${prefix}vat-amount`);
    if (vatAmountEl) vatAmountEl.value = utils.formatCurrency(result.vat);
    const savedAxisTotal = mode === 'quote' && typeof getActiveQuoteDraft === 'function'
      ? (getActiveQuoteDraft('bang_keo_in').savedAxes || []).reduce((sum, axis) => sum + orderMath.number(axis.total) + orderMath.number(axis.vat), 0)
      : 0;
    document.getElementById(`${prefix}cong-no-khach`).value = utils.formatCurrency(result.outstanding + savedAxisTotal);
    document.getElementById(`${prefix}tien-hoa-hong`).value = utils.formatCurrency(result.product.commission);
    document.getElementById(`${prefix}loi-nhuan`).value = utils.formatCurrency(result.product.profit);
    calculateBangKeoInAxis(mode, result.axis);
    document.getElementById(`${prefix}loi-nhuan-rong`).value = utils.formatCurrency(result.product.netProfit);

    return result;
  } catch (err) {
    console.error('Lỗi tính toán Băng Keo In:', err);
    return null;
  }
}

// 4. Lưu đơn hàng Băng Keo In mới
function calculateBangKeoInAxis(mode = 'order', axisResult = null) {
  const prefix = (mode === 'quote') ? 'q-bki-' : 'bki-';
  const axisModeEl = document.getElementById(`${prefix}loai-truc`);
  const isNewAxis = axisModeEl && axisModeEl.value === 'moi';

  const axisVatAmountEl = document.getElementById(`${prefix}truc-vat-amount`);
  if (!isNewAxis) {
    if (axisVatAmountEl) axisVatAmountEl.value = '0';
    return;
  }

  const result = axisResult || orderMath.calculateLine({
    quantity: document.getElementById(`${prefix}truc-so-luong`).value,
    costPrice: utils.parseCurrency(document.getElementById(`${prefix}truc-gia-goc`).value),
    salePrice: utils.parseCurrency(document.getElementById(`${prefix}truc-gia-ban`).value),
    commissionPercent: document.getElementById(`${prefix}truc-hoa-hong-percent`).value
  });

  document.getElementById(`${prefix}truc-thanh-tien-goc`).value = utils.formatCurrency(result.costTotal);
  document.getElementById(`${prefix}truc-thanh-tien-ban`).value = utils.formatCurrency(result.saleTotal);
  if (axisVatAmountEl) {
    const axisVatAmount = axisResult?.vat ?? orderMath.vatAmount(result.saleTotal, document.getElementById(`${prefix}truc-vat`)?.value);
    axisVatAmountEl.value = utils.formatCurrency(axisVatAmount);
  }
  document.getElementById(`${prefix}truc-tien-hoa-hong`).value = utils.formatCurrency(result.commission);
  document.getElementById(`${prefix}truc-loi-nhuan`).value = utils.formatCurrency(result.profit);
  document.getElementById(`${prefix}truc-loi-nhuan-rong`).value = utils.formatCurrency(result.netProfit);
}

// Chặn bấm lưu hai lần (kể cả Ctrl+S trong lúc form đang gửi).
const bangKeoInSavingModes = new Set();

async function saveBangKeoIn(event, mode = 'order') {
  if (event) event.preventDefault();
  const formId = mode === 'quote' ? 'form-quote-bang-keo-in' : 'form-bang-keo-in';
  if (bangKeoInSavingModes.has(mode)) return;
  if (!utils.beginFormSubmit(event, formId)) return;
  bangKeoInSavingModes.add(mode);

  try {
    const prefix = (mode === 'quote') ? 'q-bki-' : 'bki-';
    const tenHang = document.getElementById(`${prefix}ten-hang`).value.trim();
    const tenKhachHang = document.getElementById(`${prefix}ten-khach-hang`).value.trim();
    const soLuong = parseFloat(document.getElementById(`${prefix}so-luong`).value) || 0;
    const donGiaBan = utils.parseCurrency(document.getElementById(`${prefix}don-gia-ban`).value);

    if (!tenHang || !tenKhachHang || soLuong <= 0 || donGiaBan <= 0) {
      utils.showToast("Vui lòng điền đủ Tên hàng, Khách hàng, Số lượng & Đơn giá bán", "warning");
      return;
    }

    const deliveryDate = mode === 'quote' ? new Date() : parseDeliveryDateInput(document.getElementById(`${prefix}ngay-du-kien`)?.value);
    if (!deliveryDate) {
      utils.showToast("Ngày giao dự kiến không hợp lệ, vui lòng chọn lại ngày", "warning");
      return;
    }

    const isNewAxis = document.getElementById(`${prefix}loai-truc`)?.value === 'moi';
    // Mọi số tiền lưu xuống DB lấy trực tiếp từ kết quả tính (đã làm tròn), không đọc lại chữ hiển thị.
    const result = calculateBangKeoIn(mode);
    if (!result) {
      utils.showToast("Không thể tính toán đơn hàng, vui lòng kiểm tra lại số liệu", "danger");
      return;
    }
    if (!result.valid) {
      utils.showToast("Quy cách (m) và Số cuộn/cây phải lớn hơn 0 để tính giá gốc", "warning");
      return;
    }
    const axis = isNewAxis ? result.axis : null;

    if (isNewAxis) {
      const savedAxisCount = mode === 'quote' && typeof getActiveQuoteDraft === 'function'
        ? (getActiveQuoteDraft('bang_keo_in').savedAxes || []).length
        : 0;
      const axisName = document.getElementById(`${prefix}truc-ten`).value.trim();
      const axisQuantity = parseFloat(document.getElementById(`${prefix}truc-so-luong`).value) || 0;
      const axisCost = utils.parseCurrency(document.getElementById(`${prefix}truc-gia-goc`).value);
      const axisSale = utils.parseCurrency(document.getElementById(`${prefix}truc-gia-ban`).value);
      const currentAxisStarted = !!axisName || axisQuantity > 0 || axisCost > 0 || axisSale > 0;
      if ((savedAxisCount === 0 || currentAxisStarted) && (!axisName || axisQuantity <= 0 || axisCost <= 0 || axisSale <= 0)) {
        utils.showToast("Trục mới cần đủ tên, số lượng, giá gốc và giá bán", "warning");
        return;
      }
    }

    const data = {
      thoi_gian: new Date(),
      ten_hang: tenHang,
      ten_khach_hang: tenKhachHang,
      ngay_du_kien: deliveryDate,
      quy_cach_mm: parseFloat(document.getElementById(`${prefix}qc-mm`).value) || null,
      quy_cach_m: parseFloat(document.getElementById(`${prefix}qc-m`).value) || null,
      quy_cach_mic: parseFloat(document.getElementById(`${prefix}qc-mic`).value) || null,
      cuon_cay: parseFloat(document.getElementById(`${prefix}cuon-cay`).value) || null,
      so_luong: soLuong,
      phi_sl: utils.parseCurrency(document.getElementById(`${prefix}phi-sl`).value),
      mau_keo: document.getElementById(`${prefix}mau-keo`).value.trim() || null,
      phi_keo: utils.parseCurrency(document.getElementById(`${prefix}phi-keo`).value),
      mau_sac: document.getElementById(`${prefix}mau-sac`).value.trim() || null,
      phi_mau: utils.parseCurrency(document.getElementById(`${prefix}phi-mau`).value),
      phi_size: utils.parseCurrency(document.getElementById(`${prefix}phi-size`).value),
      phi_cat: utils.parseCurrency(document.getElementById(`${prefix}phi-cat`).value),
      don_gia_von: utils.parseCurrency(document.getElementById(`${prefix}don-gia-von`).value),
      don_gia_goc: result.product.costPrice,
      thanh_tien_goc: result.product.costTotal,
      don_gia_ban: donGiaBan,
      thanh_tien_ban: result.product.saleTotal,
      tien_coc: result.deposit,
      cong_no_khach: result.outstanding,
      ctv: document.getElementById(`${prefix}ctv`).value.trim() || null,
      hoa_hong: parseFloat(document.getElementById(`${prefix}hoa-hong-percent`).value) || 0,
      tien_hoa_hong: result.product.commission,
      loi_giay: document.getElementById(`${prefix}loi-giay`).value.trim() || null,
      thung_bao: document.getElementById(`${prefix}thung-bao`).value.trim() || null,
      loi_nhuan: result.product.profit,
      tien_ship: result.product.shipping,
      // loi_nhuan - tien_hoa_hong - tien_ship == loi_nhuan_rong (các phần đã làm tròn)
      loi_nhuan_rong: result.product.netProfit,
      vat: result.vat,
      vat_percent: result.vatPercent,
      da_giao: false,
      da_tat_toan: false,
      da_gui_email: false,
      is_quote: (mode === 'quote'),
      loai_truc: isNewAxis ? 'moi' : (document.getElementById(`${prefix}loai-truc`)?.value || 'cu'),
      ten_truc: isNewAxis ? (document.getElementById(`${prefix}truc-ten`).value.trim() || null) : null,
      truc_chu_vi: isNewAxis ? (parseFloat(document.getElementById(`${prefix}truc-chu-vi`).value) || null) : null,
      truc_so_luong: axis ? axis.quantity : 0,
      truc_gia_goc: axis ? axis.costPrice : 0,
      truc_gia_ban: axis ? axis.salePrice : 0,
      truc_thanh_tien_goc: axis ? axis.costTotal : 0,
      truc_thanh_tien_ban: axis ? axis.saleTotal : 0,
      truc_vat: axis ? axis.vat : 0,
      truc_vat_percent: axis ? result.axisVatPercent : 0,
      truc_ctv: isNewAxis ? (document.getElementById(`${prefix}truc-ctv`).value.trim() || null) : null,
      truc_hoa_hong: isNewAxis ? (parseFloat(document.getElementById(`${prefix}truc-hoa-hong-percent`).value) || 0) : 0,
      truc_tien_hoa_hong: axis ? axis.commission : 0,
      truc_loi_nhuan: axis ? axis.profit : 0,
      truc_loi_nhuan_rong: axis ? axis.netProfit : 0
    };

    if (mode === 'quote' && !prepareQuoteItems('bang_keo_in', data)) return;
    if (mode === 'quote' && await saveEditedQuoteIfNeeded('bang_keo_in', data)) return;

    // Tạo mã ID đơn hàng tự động
    const idPrefix = (mode === 'quote') ? "BG-BK" : "BK";

    const { orderId, result: res } = await runWithGeneratedOrderId(
      idPrefix,
      'bang_keo_in',
      id => window.electronAPI.dbRun('order.insert', {
        orderType: 'bang_keo_in',
        values: buildOrderInsertValues(id, data, BANG_KEO_IN_INSERT_COLUMNS)
      })
    );

    if (res.ok) {
      if (mode === 'quote') {
        utils.showToast(`Đã lưu báo giá thành công! Mã: ${orderId}`, "success");
        // Gọi hàm xuất PDF ngay lập tức
        if (typeof generateAndSaveQuotePDF === 'function') {
          await generateAndSaveQuotePDF(orderId, 'bang_keo_in', data);
        }
        editingQuoteState = { id: orderId, type: 'bang_keo_in', original: data };
        setQuoteEditingUi('bang_keo_in', orderId);
        await loadQuotationsData();
      } else {
        utils.showToast(`Đã lưu đơn hàng thành công! Mã: ${orderId}`, "success");
        clearFormBangKeoIn('order');
        await promptOrderAttachments(orderId, 'bang_keo_in');
      }
    } else {
      utils.showToast("Lỗi khi ghi đơn hàng: " + res.error, "danger");
    }

  } catch (err) {
    window.electronAPI.writeLog('error', 'Lỗi lưu đơn hàng Băng Keo In: ' + err.message);
    utils.showToast("Không thể lưu đơn hàng", "danger");
  } finally {
    bangKeoInSavingModes.delete(mode);
    utils.endFormSubmit(event, formId);
  }
}

// 5. Đóng gói đính kèm tệp đơn hàng lên database
async function promptOrderAttachments(orderId, orderType) {
  const shouldAttach = await utils.confirmAction(
    'Đơn hàng đã được lưu. Bạn có muốn đính kèm tệp ngay bây giờ không?',
    { title: 'Đính kèm tệp', confirmText: 'Chọn tệp' }
  );
  if (!shouldAttach) return;

  const files = await window.electronAPI.showOpenDialog({
    title: 'Chọn tệp đính kèm đơn hàng',
    properties: ['openFile', 'multiSelections']
  });
  if (files && !files.canceled && files.filePaths?.length > 0) {
    await saveOrderAttachments(orderId, orderType, files.filePaths);
  }
}

async function saveOrderAttachments(orderId, orderType, filePaths) {
  try {
    let savedCount = 0;
    for (const filePath of filePaths) {
      try {
        const fileName = filePath.split(/[\\/]/).pop();
        const resFile = await window.electronAPI.readFileAsBase64(filePath);
        if (!resFile.ok) continue;

        const base64Data = resFile.data;
        const sizeBytes = resFile.size || Math.floor(base64Data.length * 3 / 4);
        const ext = fileName.split('.').pop().toLowerCase();
        const contentType = {
          'pdf': 'application/pdf',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'csv': 'text/csv'
        }[ext] || 'application/octet-stream';

        const res = await window.electronAPI.dbRun('attachment.insert', {
          orderType, orderId, fileName, contentType, fileSize: sizeBytes, base64: base64Data
        });
        if (res.ok) savedCount++;
      } catch (err) {
        console.error('Lỗi lưu tệp: ' + filePath, err);
      }
    }
    if (savedCount > 0) {
      utils.showToast(`Đã đính kèm ${savedCount} tệp tin lên cloud thành công!`, "success");
    }
  } catch (err) {
    console.error('Lỗi tiến trình đính kèm:', err);
  }
}

// Cột ghi khi tạo đơn Băng Keo In (thứ tự giữ nguyên như câu INSERT cũ)
const BANG_KEO_IN_INSERT_COLUMNS = [
  'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien',
  'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 'cuon_cay', 'so_luong',
  'phi_sl', 'mau_keo', 'phi_keo', 'mau_sac', 'phi_mau', 'phi_size',
  'phi_cat', 'don_gia_von', 'don_gia_goc', 'thanh_tien_goc', 'don_gia_ban',
  'thanh_tien_ban', 'tien_coc', 'cong_no_khach', 'ctv', 'hoa_hong',
  'tien_hoa_hong', 'loi_giay', 'thung_bao', 'loi_nhuan', 'tien_ship',
  'loi_nhuan_rong', 'da_giao', 'da_tat_toan', 'da_gui_email', 'is_quote',
  'loai_truc', 'ten_truc', 'truc_chu_vi', 'truc_so_luong', 'truc_gia_goc',
  'truc_gia_ban', 'truc_thanh_tien_goc', 'truc_thanh_tien_ban', 'truc_ctv',
  'truc_hoa_hong', 'truc_tien_hoa_hong', 'truc_loi_nhuan', 'truc_loi_nhuan_rong', 'truc_vat', 'truc_vat_percent', 'vat', 'vat_percent', 'quote_items'
];

// Dựng giá trị cho thao tác order.insert (tiến trình chính kiểm tra tên cột theo danh sách cho phép)
function buildOrderInsertValues(orderId, data, columns) {
  const values = {};
  for (const column of columns) {
    if (column === 'id') values.id = orderId;
    else if (column === 'quote_items') values.quote_items = JSON.stringify(data.quote_items || []);
    else values[column] = data[column];
  }
  return values;
}

// Helper tạo mã ID tự động (BK-MM-YY-NNN)
// Số thứ tự lớn nhất được tính theo giá trị số (orderMath.nextOrderId), không theo thứ tự chữ:
// "ORDER BY id DESC" coi "-999" > "-1000" nên trước đây bị kẹt mãi ở -1000.
// orderType: 'bang_keo_in' | 'bang_keo' | 'truc_in'
async function generateOrderId(prefix, orderType, minimumSequence = 0) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).substring(2);

  const basePrefix = `${prefix}-${month}-${year}`;

  const res = await window.electronAPI.dbQuery('order.listIdsByPrefix', { orderType, prefix: basePrefix });
  if (!res.ok) {
    throw new Error(res.error || 'Không thể tạo mã đơn hàng mới');
  }

  return orderMath.nextOrderId(basePrefix, (res.rows || []).map(row => row.id), minimumSequence);
}

// Chạy thao tác ghi dùng mã đơn mới; nếu trùng khóa (pg 23505, do hai máy cùng lưu)
// thì lấy mã kế tiếp và thử lại vài lần.
async function runWithGeneratedOrderId(prefix, orderType, runner, maxAttempts = 5) {
  let minimumSequence = 0;
  let orderId = null;
  let result = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    orderId = await generateOrderId(prefix, orderType, minimumSequence);
    result = await runner(orderId);
    if (result?.ok || !orderMath.isUniqueViolation(result)) break;
    minimumSequence = orderMath.orderIdSequence(orderId);
  }
  return { orderId, result: result || { ok: false, error: 'Không thể tạo mã đơn hàng mới' } };
}

// Giá trị mặc định cho ô ngày giao: ngày mai theo giờ địa phương (YYYY-MM-DD).
function tomorrowDeliveryDateValue() {
  if (typeof utils !== 'undefined' && typeof utils.tomorrowDateInputValue === 'function') {
    return utils.tomorrowDateInputValue();
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
}

// Ctrl+S có thể bỏ qua kiểm tra của form, nên tự kiểm tra ngày giao (YYYY-MM-DD) trước khi lưu.
function parseDeliveryDateInput(value) {
  const text = String(value ?? '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) return null;
  // Nửa đêm giờ máy (không phải UTC) để pg gửi đúng ngày cho cột DATE ở mọi múi giờ.
  return check;
}

// 6. Xóa trắng form Băng Keo In
function clearFormBangKeoIn(mode = 'order') {
  const prefix = (mode === 'quote') ? 'q-bki-' : 'bki-';
  if (!document.getElementById(`${prefix}ten-hang`)) return;

  document.getElementById(`${prefix}ten-hang`).value = "";
  document.getElementById(`${prefix}ten-khach-hang`).value = "";
  document.getElementById(`${prefix}qc-mm`).value = "";
  document.getElementById(`${prefix}qc-m`).value = "";
  document.getElementById(`${prefix}qc-mic`).value = "";
  document.getElementById(`${prefix}cuon-cay`).value = "";
  document.getElementById(`${prefix}so-luong`).value = "";
  document.getElementById(`${prefix}phi-sl`).value = "0";
  document.getElementById(`${prefix}mau-keo`).value = "";
  document.getElementById(`${prefix}phi-keo`).value = "0";
  document.getElementById(`${prefix}mau-sac`).value = "";
  document.getElementById(`${prefix}phi-mau`).value = "0";
  document.getElementById(`${prefix}phi-size`).value = "0";
  document.getElementById(`${prefix}phi-cat`).value = "0";
  document.getElementById(`${prefix}don-gia-von`).value = "0";
  document.getElementById(`${prefix}don-gia-ban`).value = "";
  document.getElementById(`${prefix}don-gia-goc`).value = "0";
  document.getElementById(`${prefix}thanh-tien-goc`).value = "0";
  document.getElementById(`${prefix}thanh-tien-ban`).value = "0";
  document.getElementById(`${prefix}tien-coc`).value = "0";
  document.getElementById(`${prefix}cong-no-khach`).value = "0";
  document.getElementById(`${prefix}tien-ship`).value = "0";
  document.getElementById(`${prefix}ctv`).value = "";
  document.getElementById(`${prefix}hoa-hong-percent`).value = "0";
  document.getElementById(`${prefix}tien-hoa-hong`).value = "0";
  document.getElementById(`${prefix}loi-giay`).value = "";
  document.getElementById(`${prefix}thung-bao`).value = "";
  document.getElementById(`${prefix}loi-nhuan`).value = "0";
  document.getElementById(`${prefix}loi-nhuan-rong`).value = "0";
  const vatEl = document.getElementById(`${prefix}vat`);
  if (vatEl) vatEl.value = "0";
  const vatAmountEl = document.getElementById(`${prefix}vat-amount`);
  if (vatAmountEl) vatAmountEl.value = "0";
  setBangKeoInAxisMode(mode, 'cu');
  
  // Đặt ngày dự kiến mặc định là hôm sau (theo giờ địa phương, không dùng toISOString/UTC)
  const deliveryDate = document.getElementById(`${prefix}ngay-du-kien`);
  if (deliveryDate) deliveryDate.value = tomorrowDeliveryDateValue();
}
