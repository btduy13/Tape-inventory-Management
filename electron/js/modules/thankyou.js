// JS/MODULES/THANKYOU.JS - ĐƠN BĂNG KEO THANK YOU (bảng thank_you_orders, mã TY-MM-YY-NNN)
// Không qua xưởng. Tiền tính bằng orderMath.calculateStandardOrder (giá vốn = don_gia_von, có tiền cọc),
// giống order_compute('thank_you') trên web.
document.addEventListener('DOMContentLoaded', () => {
  ['so-luong', 'don-gia-von', 'don-gia-ban', 'hoa-hong-percent', 'tien-ship', 'vat', 'tien-coc'].forEach(suffix => {
    document.getElementById(`ty-${suffix}`)?.addEventListener('input', () => calculateThankYou());
  });
  const tenHangEl = document.getElementById('ty-ten-hang');
  const suggsEl = document.getElementById('ty-suggestions');
  if (tenHangEl && suggsEl) utils.setupAutocomplete(tenHangEl, suggsEl, queryThankYouSuggestions, autofillThankYouData);
});

const THANK_YOU_INSERT_COLUMNS = [
  'id', 'thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien', 'sdt_khach_hang', 'dia_chi_khach_hang', 'customer_id',
  'kich_thuoc', 'so_luong', 'mau_sac', 'don_gia_von', 'thanh_tien_von', 'don_gia_ban', 'thanh_tien_ban',
  'vat', 'vat_percent', 'tien_coc', 'cong_no_khach', 'ctv', 'hoa_hong', 'tien_hoa_hong', 'loi_nhuan',
  'tien_ship', 'loi_nhuan_rong', 'ghi_chu', 'da_giao', 'da_tat_toan', 'da_gui_email', 'is_quote'
];

async function queryThankYouSuggestions(query) {
  const res = await window.electronAPI.dbQuery('order.suggestNames', { orderType: 'thank_you', query: String(query ?? '') });
  return res.ok ? res.rows.map(r => r.ten_hang) : [];
}

async function autofillThankYouData(tenHang) {
  const res = await window.electronAPI.dbQuery('order.latestByName', { orderType: 'thank_you', name: tenHang });
  if (!res.ok || res.rows.length === 0) return;
  const o = res.rows[0];
  const set = (id, value) => { document.getElementById(`ty-${id}`).value = value ?? ''; };
  set('ten-khach-hang', o.ten_khach_hang);
  fillCustomerContact('ty-', o);
  set('kich-thuoc', o.kich_thuoc);
  set('so-luong', o.so_luong);
  set('mau-sac', o.mau_sac);
  set('ghi-chu', o.ghi_chu);
  set('don-gia-von', utils.formatCurrency(o.don_gia_von || 0));
  set('don-gia-ban', utils.formatCurrency(o.don_gia_ban || 0));
  set('ctv', o.ctv);
  set('hoa-hong-percent', o.hoa_hong || 0);
  set('tien-ship', utils.formatCurrency(o.tien_ship || 0));
  set('vat', Number(o.vat_percent) || 0);
  calculateThankYou();
  utils.showToast('Đã tự điền thông tin cũ', 'success');
}

function calculateThankYou() {
  const value = id => document.getElementById(`ty-${id}`)?.value;
  const result = orderMath.calculateStandardOrder({
    quantity: value('so-luong'),
    costPrice: utils.parseCurrency(value('don-gia-von')),
    salePrice: utils.parseCurrency(value('don-gia-ban')),
    commissionPercent: value('hoa-hong-percent'),
    shipping: utils.parseCurrency(value('tien-ship')),
    vatPercent: value('vat'),
    deposit: utils.parseCurrency(value('tien-coc'))
  });
  const outputs = {
    'thanh-tien-von': result.costTotal, 'thanh-tien-ban': result.saleTotal, 'vat-amount': result.vat,
    'cong-no-khach': result.outstanding, 'tien-hoa-hong': result.commission,
    'loi-nhuan': result.profit, 'loi-nhuan-rong': result.netProfit
  };
  Object.entries(outputs).forEach(([id, amount]) => {
    const el = document.getElementById(`ty-${id}`);
    if (el) el.value = utils.formatCurrency(amount);
  });
  return result;
}

// Cột tiền ghi xuống DB (dùng chung cho tạo đơn và form sửa)
function thankYouMoneyColumns(result, deposit) {
  return {
    thanh_tien_von: result.costTotal, thanh_tien_ban: result.saleTotal, vat: result.vat, vat_percent: result.vatPercent,
    tien_coc: orderMath.money(Math.max(0, orderMath.number(deposit))), cong_no_khach: result.outstanding,
    tien_hoa_hong: result.commission, loi_nhuan: result.profit, tien_ship: result.shipping, loi_nhuan_rong: result.netProfit
  };
}

let thankYouSaving = false;

async function saveThankYou(event) {
  if (event) event.preventDefault();
  if (thankYouSaving || !utils.beginFormSubmit(event, 'form-thank-you')) return;
  thankYouSaving = true;
  try {
    const value = id => document.getElementById(`ty-${id}`).value.trim();
    const tenHang = value('ten-hang');
    const tenKhachHang = value('ten-khach-hang');
    const soLuong = parseFloat(value('so-luong')) || 0;
    const donGiaBan = utils.parseCurrency(value('don-gia-ban'));
    if (!tenHang || !tenKhachHang || soLuong <= 0 || donGiaBan <= 0) {
      utils.showToast('Vui lòng điền đủ Tên hàng, Khách hàng, Số lượng và Giá bán', 'warning');
      return;
    }
    const deliveryDate = parseDeliveryDateInput(value('ngay-du-kien'));
    if (!deliveryDate) {
      utils.showToast('Ngày giao dự kiến không hợp lệ, vui lòng chọn lại ngày', 'warning');
      return;
    }
    const result = calculateThankYou();
    const tienCoc = utils.parseCurrency(value('tien-coc'));
    const data = {
      thoi_gian: new Date(),
      ten_hang: tenHang,
      ten_khach_hang: tenKhachHang,
      ...readCustomerContact('ty-'),
      ngay_du_kien: deliveryDate,
      kich_thuoc: value('kich-thuoc') || null,
      so_luong: soLuong,
      mau_sac: value('mau-sac') || null,
      ghi_chu: value('ghi-chu') || null,
      don_gia_von: utils.parseCurrency(value('don-gia-von')),
      don_gia_ban: donGiaBan,
      ctv: value('ctv') || null,
      hoa_hong: result.commissionPercent,
      ...thankYouMoneyColumns(result, tienCoc),
      da_giao: false,
      da_tat_toan: false,
      da_gui_email: false,
      is_quote: false
    };

    const { orderId, result: res } = await runWithGeneratedOrderId('TY', 'thank_you', id =>
      window.electronAPI.dbRun('order.insert', { orderType: 'thank_you', values: buildOrderInsertValues(id, data, THANK_YOU_INSERT_COLUMNS) })
    );
    if (res.ok) {
      utils.showToast(`Đã lưu đơn Thank you thành công! Mã: ${orderId}`, 'success');
      clearFormThankYou();
      await promptOrderAttachments(orderId, 'thank_you');
    } else {
      utils.showToast('Lỗi khi lưu đơn: ' + res.error, 'danger');
    }
  } catch (err) {
    window.electronAPI.writeLog('error', 'Lỗi lưu đơn Thank you: ' + err.message);
    utils.showToast('Không thể lưu đơn hàng', 'danger');
  } finally {
    thankYouSaving = false;
    utils.endFormSubmit(event, 'form-thank-you');
  }
}

function clearFormThankYou() {
  const form = document.getElementById('form-thank-you');
  if (!form) return;
  form.querySelectorAll('input').forEach(input => {
    input.value = input.readOnly || input.classList.contains('currency-format') || input.type === 'number' && input.id !== 'ty-so-luong' ? '0' : '';
  });
  document.getElementById('ty-don-gia-ban').value = '';
  fillCustomerContact('ty-', {});
  document.getElementById('ty-ngay-du-kien').value = utils.tomorrowDateInputValue();
}
