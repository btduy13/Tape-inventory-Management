// JS/MODULES/BANGKEO.JS - LOGIC CHO PHÂN HỆ BĂNG KEO THƯỜNG
document.addEventListener('DOMContentLoaded', () => {
  // Gắn sự kiện tính toán tự động
  const inputSuffixes = [
    'so-luong', 'don-gia-goc', 'don-gia-ban', 
    'hoa-hong-percent', 'tien-ship', 'vat'
  ];
  
  inputSuffixes.forEach(suffix => {
    const el = document.getElementById(`bk-${suffix}`);
    if (el) el.addEventListener('input', () => calculateBangKeo('order'));

    const qEl = document.getElementById(`q-bk-${suffix}`);
    if (qEl) qEl.addEventListener('input', () => calculateBangKeo('quote'));
  });

  // Autocomplete cho Đơn hàng
  const tenHangEl = document.getElementById('bk-ten-hang');
  const suggsEl = document.getElementById('bk-suggestions');
  if (tenHangEl && suggsEl) {
    utils.setupAutocomplete(tenHangEl, suggsEl, queryBangKeoSuggestions, (val) => autofillBangKeoData(val, 'order'));
  }

  // Autocomplete cho Báo giá
  const qTenHangEl = document.getElementById('q-bk-ten-hang');
  const qSuggsEl = document.getElementById('q-bk-suggestions');
  if (qTenHangEl && qSuggsEl) {
    utils.setupAutocomplete(qTenHangEl, qSuggsEl, queryBangKeoSuggestions, (val) => autofillBangKeoData(val, 'quote'));
  }
});

// 1. Tìm gợi ý tên hàng từ lịch sử đơn Băng Keo thường
async function queryBangKeoSuggestions(query) {
  const sql = `
    SELECT ten_hang
    FROM bang_keo_orders
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
async function autofillBangKeoData(tenHang, mode = 'order') {
  try {
    const prefix = (mode === 'quote') ? 'q-bk-' : 'bk-';
    const sql = `
      SELECT * FROM bang_keo_orders 
      WHERE ten_hang ILIKE $1 AND (is_quote = FALSE OR is_quote IS NULL)
      ORDER BY thoi_gian DESC 
      LIMIT 1
    `;
    const res = await window.electronAPI.dbQuery(sql, [tenHang]);
    if (res.ok && res.rows.length > 0) {
      const order = res.rows[0];
      
      document.getElementById(`${prefix}ten-khach-hang`).value = order.ten_khach_hang || "";
      document.getElementById(`${prefix}quy-cach`).value = order.quy_cach || "";
      document.getElementById(`${prefix}so-luong`).value = order.so_luong || "";
      document.getElementById(`${prefix}mau-sac`).value = order.mau_sac || "";
      
      document.getElementById(`${prefix}don-gia-goc`).value = utils.formatCurrency(order.don_gia_goc || 0);
      document.getElementById(`${prefix}don-gia-ban`).value = utils.formatCurrency(order.don_gia_ban || 0);
      document.getElementById(`${prefix}ctv`).value = order.ctv || "";
      document.getElementById(`${prefix}hoa-hong-percent`).value = order.hoa_hong || 0;
      document.getElementById(`${prefix}tien-ship`).value = utils.formatCurrency(order.tien_ship || 0);
      document.getElementById(`${prefix}vat`).value = Number(order.vat_percent) > 0
        ? order.vat_percent
        : (order.thanh_tien_ban ? (Number(order.vat || 0) / Number(order.thanh_tien_ban) * 100).toFixed(2) : 0);

      calculateBangKeo(mode);
      utils.showToast("Đã tự điền thông tin cũ", "success");
    }
  } catch (err) {
    window.electronAPI.writeLog('error', 'Lỗi tự động điền đơn Băng Keo: ' + err.message);
  }
}

// 3. Tính toán giá cả đơn Băng Keo
function calculateBangKeo(mode = 'order') {
  try {
    const prefix = (mode === 'quote') ? 'q-bk-' : 'bk-';
    const soLuong = parseFloat(document.getElementById(`${prefix}so-luong`).value) || 0;
    const donGiaGoc = utils.parseCurrency(document.getElementById(`${prefix}don-gia-goc`).value);
    const donGiaBan = utils.parseCurrency(document.getElementById(`${prefix}don-gia-ban`).value);
    const hoaHongPercent = parseFloat(document.getElementById(`${prefix}hoa-hong-percent`).value) || 0;
    const tienShip = utils.parseCurrency(document.getElementById(`${prefix}tien-ship`).value);
    const vatPercent = orderMath.percent(document.getElementById(`${prefix}vat`)?.value);

    const result = orderMath.calculateStandardOrder({
      quantity: soLuong,
      costPrice: donGiaGoc,
      salePrice: donGiaBan,
      commissionPercent: hoaHongPercent,
      shipping: tienShip,
      vatPercent
    });

    // Cập nhật giao diện
    document.getElementById(`${prefix}thanh-tien-goc`).value = utils.formatCurrency(result.costTotal);
    document.getElementById(`${prefix}thanh-tien-ban`).value = utils.formatCurrency(result.saleTotal);
    document.getElementById(`${prefix}cong-no-khach`).value = utils.formatCurrency(result.outstanding);
    document.getElementById(`${prefix}tien-hoa-hong`).value = utils.formatCurrency(result.commission);
    document.getElementById(`${prefix}loi-nhuan`).value = utils.formatCurrency(result.profit);
    document.getElementById(`${prefix}loi-nhuan-rong`).value = utils.formatCurrency(result.netProfit);

  } catch (err) {
    console.error('Lỗi tính toán Băng Keo thường:', err);
  }
}

// 4. Lưu đơn Băng Keo thường
async function saveBangKeo(event, mode = 'order') {
  if (event) event.preventDefault();
  const formId = mode === 'quote' ? 'form-quote-bang-keo' : 'form-bang-keo';
  if (!utils.beginFormSubmit(event, formId)) return;

  try {
    const prefix = (mode === 'quote') ? 'q-bk-' : 'bk-';
    const tenHang = document.getElementById(`${prefix}ten-hang`).value.trim();
    const tenKhachHang = document.getElementById(`${prefix}ten-khach-hang`).value.trim();
    const soLuong = parseFloat(document.getElementById(`${prefix}so-luong`).value) || 0;
    const donGiaBan = utils.parseCurrency(document.getElementById(`${prefix}don-gia-ban`).value);
    const donGiaGoc = utils.parseCurrency(document.getElementById(`${prefix}don-gia-goc`).value);

    if (!tenHang || !tenKhachHang || soLuong <= 0 || donGiaBan <= 0 || donGiaGoc <= 0) {
      utils.showToast("Vui lòng điền đủ Tên hàng, Khách hàng, Số lượng & Giá mua/bán", "warning");
      return;
    }

    calculateBangKeo(mode);
    const vatPercent = orderMath.percent(document.getElementById(`${prefix}vat`)?.value);
    const vatAmount = orderMath.calculateStandardOrder({ quantity: soLuong, costPrice: donGiaGoc, salePrice: donGiaBan, vatPercent }).vat;

    const data = {
      thoi_gian: new Date(),
      ten_hang: tenHang,
      ten_khach_hang: tenKhachHang,
      ngay_du_kien: mode === 'quote' ? new Date() : new Date(document.getElementById(`${prefix}ngay-du-kien`).value),
      quy_cach: document.getElementById(`${prefix}quy-cach`).value.trim() || null,
      so_luong: soLuong,
      mau_sac: document.getElementById(`${prefix}mau-sac`).value.trim() || null,
      don_gia_goc: donGiaGoc,
      thanh_tien: utils.parseCurrency(document.getElementById(`${prefix}thanh-tien-goc`).value), // Lưu thành tiền gốc
      don_gia_ban: donGiaBan,
      thanh_tien_ban: utils.parseCurrency(document.getElementById(`${prefix}thanh-tien-ban`).value),
      cong_no_khach: utils.parseCurrency(document.getElementById(`${prefix}cong-no-khach`).value),
      ctv: document.getElementById(`${prefix}ctv`).value.trim() || null,
      hoa_hong: parseFloat(document.getElementById(`${prefix}hoa-hong-percent`).value) || 0,
      tien_hoa_hong: utils.parseCurrency(document.getElementById(`${prefix}tien-hoa-hong`).value),
      loi_nhuan: utils.parseCurrency(document.getElementById(`${prefix}loi-nhuan`).value),
      tien_ship: utils.parseCurrency(document.getElementById(`${prefix}tien-ship`).value),
      loi_nhuan_rong: utils.parseCurrency(document.getElementById(`${prefix}loi-nhuan-rong`).value),
      vat: vatAmount,
      vat_percent: vatPercent,
      da_giao: false,
      da_tat_toan: false,
      da_gui_email: false,
      is_quote: (mode === 'quote')
    };

    if (mode === 'quote' && !prepareQuoteItems('bang_keo', data)) return;
    if (mode === 'quote' && await saveEditedQuoteIfNeeded('bang_keo', data)) return;

    // Tạo ID mới tự động (B-MM-YY-NNN hoặc BG-B-MM-YY-NNN)
    const idPrefix = (mode === 'quote') ? "BG-B" : "B";
    const orderId = await generateOrderId(idPrefix, "bang_keo_orders");

    const sql = `
      INSERT INTO bang_keo_orders (
        id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien, 
        quy_cach, so_luong, mau_sac, don_gia_goc, thanh_tien, 
        don_gia_ban, thanh_tien_ban, cong_no_khach, ctv, hoa_hong, 
        tien_hoa_hong, loi_nhuan, tien_ship, loi_nhuan_rong, 
        da_giao, da_tat_toan, da_gui_email, is_quote, vat, vat_percent, quote_items
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
    `;

    const params = [
      orderId, data.thoi_gian, data.ten_hang, data.ten_khach_hang, data.ngay_du_kien,
      data.quy_cach, data.so_luong, data.mau_sac, data.don_gia_goc, data.thanh_tien,
      data.don_gia_ban, data.thanh_tien_ban, data.cong_no_khach, data.ctv, data.hoa_hong,
      data.tien_hoa_hong, data.loi_nhuan, data.tien_ship, data.loi_nhuan_rong,
        data.da_giao, data.da_tat_toan, data.da_gui_email, data.is_quote, data.vat, data.vat_percent,
      JSON.stringify(data.quote_items || [])
    ];

    const res = await window.electronAPI.dbRun(sql, params);

    if (res.ok) {
      if (mode === 'quote') {
        utils.showToast(`Đã lưu báo giá thành công! Mã: ${orderId}`, "success");
        if (typeof generateAndSaveQuotePDF === 'function') {
          await generateAndSaveQuotePDF(orderId, 'bang_keo', data);
        }
        editingQuoteState = { id: orderId, type: 'bang_keo', original: data };
        setQuoteEditingUi('bang_keo', orderId);
        await loadQuotationsData();
      } else {
        utils.showToast(`Đã lưu đơn Băng Keo thành công! Mã: ${orderId}`, "success");
        clearFormBangKeo('order');
        await promptOrderAttachments(orderId, 'bang_keo');
      }
    } else {
      utils.showToast("Lỗi khi lưu đơn: " + res.error, "danger");
    }

  } catch (err) {
    window.electronAPI.writeLog('error', 'Lỗi lưu đơn Băng Keo: ' + err.message);
    utils.showToast("Không thể lưu đơn hàng", "danger");
  } finally {
    utils.endFormSubmit(event, formId);
  }
}

// 5. Xóa trắng form Băng Keo
function clearFormBangKeo(mode = 'order') {
  const prefix = (mode === 'quote') ? 'q-bk-' : 'bk-';
  if (!document.getElementById(`${prefix}ten-hang`)) return;

  document.getElementById(`${prefix}ten-hang`).value = "";
  document.getElementById(`${prefix}ten-khach-hang`).value = "";
  document.getElementById(`${prefix}quy-cach`).value = "";
  document.getElementById(`${prefix}so-luong`).value = "";
  document.getElementById(`${prefix}mau-sac`).value = "";
  document.getElementById(`${prefix}don-gia-goc`).value = "";
  document.getElementById(`${prefix}thanh-tien-goc`).value = "0";
  document.getElementById(`${prefix}don-gia-ban`).value = "";
  document.getElementById(`${prefix}thanh-tien-ban`).value = "0";
  document.getElementById(`${prefix}cong-no-khach`).value = "0";
  document.getElementById(`${prefix}ctv`).value = "";
  document.getElementById(`${prefix}hoa-hong-percent`).value = "0";
  document.getElementById(`${prefix}tien-hoa-hong`).value = "0";
  document.getElementById(`${prefix}loi-nhuan`).value = "0";
  document.getElementById(`${prefix}tien-ship`).value = "0";
  document.getElementById(`${prefix}loi-nhuan-rong`).value = "0";
  const vatEl = document.getElementById(`${prefix}vat`);
  if (vatEl) vatEl.value = "0";

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const deliveryDate = document.getElementById(`${prefix}ngay-du-kien`);
  if (deliveryDate) deliveryDate.value = tomorrow.toISOString().split('T')[0];
}
