// JS/MODULES/BANGKEOIN.JS - LOGIC CHO PHÂN HỆ BĂNG KEO IN
document.addEventListener('DOMContentLoaded', () => {
  // Gắn sự kiện tính toán tự động khi gõ số (Đơn hàng & Báo giá)
  const inputSuffixes = [
    'so-luong', 'phi-sl', 'phi-keo', 'phi-mau', 'phi-size',
    'phi-cat', 'don-gia-von', 'don-gia-ban', 'tien-coc',
    'tien-ship', 'hoa-hong-percent', 'qc-m', 'cuon-cay',
    'truc-so-luong', 'truc-gia-goc', 'truc-gia-ban', 'truc-hoa-hong-percent'
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

function setBangKeoInAxisMode(mode = 'order', axisMode = 'cu') {
  const prefix = (mode === 'quote') ? 'q-bki-' : 'bki-';
  const isNewAxis = axisMode === 'moi';

  const valueEl = document.getElementById(`${prefix}loai-truc`);
  const cardEl = document.getElementById(`${prefix}new-axis-card`);
  const oldBtn = document.getElementById(`${prefix}axis-old`);
  const newBtn = document.getElementById(`${prefix}axis-new`);

  if (valueEl) valueEl.value = axisMode;
  if (cardEl) cardEl.style.display = isNewAxis ? 'block' : 'none';
  if (oldBtn) oldBtn.classList.toggle('active', !isNewAxis);
  if (newBtn) newBtn.classList.toggle('active', isNewAxis);

  ['truc-ten', 'truc-chu-vi', 'truc-so-luong', 'truc-gia-goc', 'truc-gia-ban'].forEach(suffix => {
    const el = document.getElementById(`${prefix}${suffix}`);
    if (el) el.required = isNewAxis;
  });

  if (!isNewAxis) {
    clearBangKeoInAxisFields(mode);
  }

  calculateBangKeoIn(mode);
}

function clearBangKeoInAxisFields(mode = 'order') {
  const prefix = (mode === 'quote') ? 'q-bki-' : 'bki-';
  const defaults = {
    'truc-ten': '',
    'truc-chu-vi': '',
    'truc-so-luong': '',
    'truc-gia-goc': '0',
    'truc-gia-ban': '0',
    'truc-thanh-tien-goc': '0',
    'truc-thanh-tien-ban': '0',
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
  const sql = `
    SELECT ten_hang
    FROM bang_keo_in_orders
    WHERE ten_hang ILIKE $1 AND (is_quote = FALSE OR is_quote IS NULL)
    GROUP BY ten_hang
    ORDER BY MAX(thoi_gian) DESC
    LIMIT 8
  `;
  const res = await window.electronAPI.dbQuery(sql, [`%${query}%`]);
  if (res.ok) {
    return res.rows.map(r => r.ten_hang);
  }
  return [];
}

// 2. Tự động điền dữ liệu từ đơn hàng gần nhất
async function autofillBangKeoInData(tenHang, mode = 'order') {
  try {
    const prefix = (mode === 'quote') ? 'q-bki-' : 'bki-';
    const sql = `
      SELECT * FROM bang_keo_in_orders 
      WHERE ten_hang ILIKE $1 AND (is_quote = FALSE OR is_quote IS NULL)
      ORDER BY thoi_gian DESC 
      LIMIT 1
    `;
    const res = await window.electronAPI.dbQuery(sql, [tenHang]);
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

      if (order.loai_truc === 'moi') {
        setBangKeoInAxisMode(mode, 'moi');
        document.getElementById(`${prefix}truc-ten`).value = order.ten_truc || "";
        document.getElementById(`${prefix}truc-chu-vi`).value = order.truc_chu_vi || "";
        document.getElementById(`${prefix}truc-so-luong`).value = order.truc_so_luong || "";
        document.getElementById(`${prefix}truc-gia-goc`).value = utils.formatCurrency(order.truc_gia_goc || 0);
        document.getElementById(`${prefix}truc-gia-ban`).value = utils.formatCurrency(order.truc_gia_ban || 0);
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
      commissionPercent: document.getElementById(`${prefix}hoa-hong-percent`).value,
      shipping: utils.parseCurrency(document.getElementById(`${prefix}tien-ship`).value),
      rollLength: document.getElementById(`${prefix}qc-m`).value,
      rollsPerTree: document.getElementById(`${prefix}cuon-cay`).value,
      isNewAxis,
      axisQuantity: document.getElementById(`${prefix}truc-so-luong`)?.value,
      axisCostPrice: utils.parseCurrency(document.getElementById(`${prefix}truc-gia-goc`)?.value),
      axisSalePrice: utils.parseCurrency(document.getElementById(`${prefix}truc-gia-ban`)?.value),
      axisCommissionPercent: document.getElementById(`${prefix}truc-hoa-hong-percent`)?.value
    });

    // C. Cập nhật lên UI
    document.getElementById(`${prefix}don-gia-goc`).value = utils.formatCurrency(result.product.costPrice);
    document.getElementById(`${prefix}thanh-tien-goc`).value = utils.formatCurrency(result.product.costTotal);
    document.getElementById(`${prefix}thanh-tien-ban`).value = utils.formatCurrency(result.product.saleTotal);
    document.getElementById(`${prefix}cong-no-khach`).value = utils.formatCurrency(result.outstanding);
    document.getElementById(`${prefix}tien-hoa-hong`).value = utils.formatCurrency(result.product.commission);
    document.getElementById(`${prefix}loi-nhuan`).value = utils.formatCurrency(result.product.profit);
    calculateBangKeoInAxis(mode, result.axis);
    document.getElementById(`${prefix}loi-nhuan-rong`).value = utils.formatCurrency(result.product.netProfit);

  } catch (err) {
    console.error('Lỗi tính toán Băng Keo In:', err);
  }
}

// 4. Lưu đơn hàng Băng Keo In mới
function calculateBangKeoInAxis(mode = 'order', axisResult = null) {
  const prefix = (mode === 'quote') ? 'q-bki-' : 'bki-';
  const axisModeEl = document.getElementById(`${prefix}loai-truc`);
  const isNewAxis = axisModeEl && axisModeEl.value === 'moi';

  if (!isNewAxis) return;

  const result = axisResult || orderMath.calculateLine({
    quantity: document.getElementById(`${prefix}truc-so-luong`).value,
    costPrice: utils.parseCurrency(document.getElementById(`${prefix}truc-gia-goc`).value),
    salePrice: utils.parseCurrency(document.getElementById(`${prefix}truc-gia-ban`).value),
    commissionPercent: document.getElementById(`${prefix}truc-hoa-hong-percent`).value
  });

  document.getElementById(`${prefix}truc-thanh-tien-goc`).value = utils.formatCurrency(result.costTotal);
  document.getElementById(`${prefix}truc-thanh-tien-ban`).value = utils.formatCurrency(result.saleTotal);
  document.getElementById(`${prefix}truc-tien-hoa-hong`).value = utils.formatCurrency(result.commission);
  document.getElementById(`${prefix}truc-loi-nhuan`).value = utils.formatCurrency(result.profit);
  document.getElementById(`${prefix}truc-loi-nhuan-rong`).value = utils.formatCurrency(result.netProfit);
}

async function saveBangKeoIn(event, mode = 'order') {
  if (event) event.preventDefault();
  const formId = mode === 'quote' ? 'form-quote-bang-keo-in' : 'form-bang-keo-in';
  if (!utils.beginFormSubmit(event, formId)) return;

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

    calculateBangKeoIn(mode);

    const isNewAxis = document.getElementById(`${prefix}loai-truc`)?.value === 'moi';
    if (isNewAxis) {
      const axisQuantity = parseFloat(document.getElementById(`${prefix}truc-so-luong`).value) || 0;
      const axisCost = utils.parseCurrency(document.getElementById(`${prefix}truc-gia-goc`).value);
      const axisSale = utils.parseCurrency(document.getElementById(`${prefix}truc-gia-ban`).value);
      if (axisQuantity <= 0 || axisCost <= 0 || axisSale <= 0) {
        utils.showToast("Trục mới cần có số lượng, giá gốc và giá bán lớn hơn 0", "warning");
        return;
      }
    }

    const data = {
      thoi_gian: new Date(),
      ten_hang: tenHang,
      ten_khach_hang: tenKhachHang,
      ngay_du_kien: new Date(document.getElementById(`${prefix}ngay-du-kien`).value),
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
      don_gia_goc: utils.parseCurrency(document.getElementById(`${prefix}don-gia-goc`).value),
      thanh_tien_goc: utils.parseCurrency(document.getElementById(`${prefix}thanh-tien-goc`).value),
      don_gia_ban: donGiaBan,
      thanh_tien_ban: utils.parseCurrency(document.getElementById(`${prefix}thanh-tien-ban`).value),
      tien_coc: utils.parseCurrency(document.getElementById(`${prefix}tien-coc`).value),
      cong_no_khach: utils.parseCurrency(document.getElementById(`${prefix}cong-no-khach`).value),
      ctv: document.getElementById(`${prefix}ctv`).value.trim() || null,
      hoa_hong: parseFloat(document.getElementById(`${prefix}hoa-hong-percent`).value) || 0,
      tien_hoa_hong: utils.parseCurrency(document.getElementById(`${prefix}tien-hoa-hong`).value),
      loi_giay: document.getElementById(`${prefix}loi-giay`).value.trim() || null,
      thung_bao: document.getElementById(`${prefix}thung-bao`).value.trim() || null,
      loi_nhuan: utils.parseCurrency(document.getElementById(`${prefix}loi-nhuan`).value),
      tien_ship: utils.parseCurrency(document.getElementById(`${prefix}tien-ship`).value),
      loi_nhuan_rong: utils.parseCurrency(document.getElementById(`${prefix}loi-nhuan-rong`).value),
      vat: mode === 'quote' ? utils.parseCurrency(document.getElementById(`${prefix}vat`)?.value) : 0,
      da_giao: false,
      da_tat_toan: false,
      da_gui_email: false,
      is_quote: (mode === 'quote'),
      loai_truc: document.getElementById(`${prefix}loai-truc`)?.value || 'cu',
      ten_truc: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? (document.getElementById(`${prefix}truc-ten`).value.trim() || null) : null,
      truc_chu_vi: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? (parseFloat(document.getElementById(`${prefix}truc-chu-vi`).value) || null) : null,
      truc_so_luong: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? (parseFloat(document.getElementById(`${prefix}truc-so-luong`).value) || 0) : 0,
      truc_gia_goc: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? utils.parseCurrency(document.getElementById(`${prefix}truc-gia-goc`).value) : 0,
      truc_gia_ban: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? utils.parseCurrency(document.getElementById(`${prefix}truc-gia-ban`).value) : 0,
      truc_thanh_tien_goc: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? utils.parseCurrency(document.getElementById(`${prefix}truc-thanh-tien-goc`).value) : 0,
      truc_thanh_tien_ban: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? utils.parseCurrency(document.getElementById(`${prefix}truc-thanh-tien-ban`).value) : 0,
      truc_ctv: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? (document.getElementById(`${prefix}truc-ctv`).value.trim() || null) : null,
      truc_hoa_hong: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? (parseFloat(document.getElementById(`${prefix}truc-hoa-hong-percent`).value) || 0) : 0,
      truc_tien_hoa_hong: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? utils.parseCurrency(document.getElementById(`${prefix}truc-tien-hoa-hong`).value) : 0,
      truc_loi_nhuan: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? utils.parseCurrency(document.getElementById(`${prefix}truc-loi-nhuan`).value) : 0,
      truc_loi_nhuan_rong: document.getElementById(`${prefix}loai-truc`)?.value === 'moi' ? utils.parseCurrency(document.getElementById(`${prefix}truc-loi-nhuan-rong`).value) : 0
    };

    // Tạo mã ID đơn hàng tự động
    const idPrefix = (mode === 'quote') ? "BG-BK" : "BK";
    const orderId = await generateOrderId(idPrefix, "bang_keo_in_orders");
    
    const sql = `
      INSERT INTO bang_keo_in_orders (
        id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien, 
        quy_cach_mm, quy_cach_m, quy_cach_mic, cuon_cay, so_luong, 
        phi_sl, mau_keo, phi_keo, mau_sac, phi_mau, phi_size, 
        phi_cat, don_gia_von, don_gia_goc, thanh_tien_goc, don_gia_ban, 
        thanh_tien_ban, tien_coc, cong_no_khach, ctv, hoa_hong, 
        tien_hoa_hong, loi_giay, thung_bao, loi_nhuan, tien_ship, 
        loi_nhuan_rong, da_giao, da_tat_toan, da_gui_email, is_quote,
        loai_truc, ten_truc, truc_chu_vi, truc_so_luong, truc_gia_goc,
        truc_gia_ban, truc_thanh_tien_goc, truc_thanh_tien_ban, truc_ctv,
        truc_hoa_hong, truc_tien_hoa_hong, truc_loi_nhuan, truc_loi_nhuan_rong, vat
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, 
        $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
        $42, $43, $44, $45, $46, $47, $48, $49, $50
      )
    `;

    const params = [
      orderId, data.thoi_gian, data.ten_hang, data.ten_khach_hang, data.ngay_du_kien,
      data.quy_cach_mm, data.quy_cach_m, data.quy_cach_mic, data.cuon_cay, data.so_luong,
      data.phi_sl, data.mau_keo, data.phi_keo, data.mau_sac, data.phi_mau, data.phi_size,
      data.phi_cat, data.don_gia_von, data.don_gia_goc, data.thanh_tien_goc, data.don_gia_ban,
      data.thanh_tien_ban, data.tien_coc, data.cong_no_khach, data.ctv, data.hoa_hong,
      data.tien_hoa_hong, data.loi_giay, data.thung_bao, data.loi_nhuan, data.tien_ship,
      data.loi_nhuan_rong, data.da_giao, data.da_tat_toan, data.da_gui_email, data.is_quote,
      data.loai_truc, data.ten_truc, data.truc_chu_vi, data.truc_so_luong, data.truc_gia_goc,
      data.truc_gia_ban, data.truc_thanh_tien_goc, data.truc_thanh_tien_ban, data.truc_ctv,
      data.truc_hoa_hong, data.truc_tien_hoa_hong, data.truc_loi_nhuan, data.truc_loi_nhuan_rong, data.vat
    ];

    const res = await window.electronAPI.dbRun(sql, params);
    
    if (res.ok) {
      if (mode === 'quote') {
        utils.showToast(`Đã lưu báo giá thành công! Mã: ${orderId}`, "success");
        // Gọi hàm xuất PDF ngay lập tức
        if (typeof generateAndSaveQuotePDF === 'function') {
          await generateAndSaveQuotePDF(orderId, 'bang_keo_in', data);
        }
        clearFormBangKeoIn('quote');
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

        const sql = `
          INSERT INTO order_attachments (order_type, order_id, file_name, content_type, file_size, data)
          VALUES ($1, $2, $3, $4, $5, decode($6, 'base64'))
        `;
        
        const res = await window.electronAPI.dbRun(sql, [orderType, orderId, fileName, contentType, sizeBytes, base64Data]);
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

// Helper tạo mã ID tự động (BK-MM-YY-NNN)
async function generateOrderId(prefix, tableName) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).substring(2);
  
  const basePrefix = `${prefix}-${month}-${year}`;
  
  const sql = `
    SELECT id FROM ${tableName} 
    WHERE id LIKE $1
    ORDER BY id DESC 
    LIMIT 1
  `;
  
  const res = await window.electronAPI.dbQuery(sql, [`${basePrefix}%`]);
  
  let newSequence = "001";
  if (res.ok && res.rows.length > 0) {
    const lastId = res.rows[0].id;
    const parts = lastId.split('-');
    const lastSeq = parseInt(parts[parts.length - 1]);
    newSequence = String(lastSeq + 1).padStart(3, '0');
  }
  
  return `${basePrefix}-${newSequence}`;
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
  setBangKeoInAxisMode(mode, 'cu');
  
  // Đặt ngày dự kiến mặc định là hôm sau
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById(`${prefix}ngay-du-kien`).value = tomorrow.toISOString().split('T')[0];
}
