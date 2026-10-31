(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.orderMath = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  // Giá vốn băng keo in được báo theo cây chuẩn dài 90m:
  // đơn giá gốc / cuộn = (giá vốn + phụ phí) / 90 * số mét mỗi cuộn / số cuộn mỗi cây.
  const STANDARD_ROLL_LENGTH_M = 90;

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function percent(value) {
    return Math.min(100, Math.max(0, number(value)));
  }

  // Làm tròn tiền về đơn vị đồng. Mọi số tiền lưu/hiển thị/in đều đi qua hàm này
  // để màn hình, DB, PDF, Excel và phiếu giao hàng luôn khớp nhau tới từng đồng.
  function money(value) {
    return Math.round(number(value));
  }

  // VAT được làm tròn MỘT lần cho mỗi dòng hàng; tổng = cộng các dòng đã làm tròn.
  function vatAmount(base, vatPercentValue) {
    return money(Math.max(0, number(base)) * percent(vatPercentValue) / 100);
  }

  // Tỷ lệ VAT hiển thị (2 chữ số thập phân), ưu tiên tỷ lệ đã lưu, nếu không thì suy ra từ số tiền VAT.
  function vatPercentFromAmount(vat, base, storedPercent) {
    if (number(storedPercent) > 0) return Math.round(percent(storedPercent) * 100) / 100;
    const total = number(base);
    if (total <= 0) return 0;
    return Math.round(Math.max(0, number(vat)) / total * 10000) / 100;
  }

  function calculateLine(input = {}) {
    const quantity = Math.max(0, number(input.quantity));
    const costPrice = Math.max(0, number(input.costPrice));
    const salePrice = Math.max(0, number(input.salePrice));
    const shipping = money(Math.max(0, number(input.shipping)));
    const commissionPercent = percent(input.commissionPercent);
    // Các thành phần tiền được làm tròn trước, lợi nhuận ròng tính từ phần đã làm tròn
    // để loi_nhuan - tien_hoa_hong - tien_ship == loi_nhuan_rong chính xác.
    const costTotal = money(quantity * costPrice);
    const saleTotal = money(quantity * salePrice);
    const profit = saleTotal - costTotal;
    const commission = money(Math.max(0, profit) * commissionPercent / 100);

    return {
      quantity,
      costPrice,
      salePrice,
      costTotal,
      saleTotal,
      profit,
      commissionPercent,
      commission,
      shipping,
      netProfit: profit - commission - shipping
    };
  }

  function calculateStandardOrder(input = {}) {
    const line = calculateLine(input);
    const vatPercent = percent(input.vatPercent);
    // `vat` remains a backwards-compatible amount for legacy callers/data.
    const hasVatPercent = Object.prototype.hasOwnProperty.call(input, 'vatPercent');
    const vat = hasVatPercent ? vatAmount(line.saleTotal, vatPercent) : money(Math.max(0, number(input.vat)));
    const deposit = money(Math.max(0, number(input.deposit)));
    return {
      ...line,
      vatPercent,
      vat,
      outstanding: input.settled ? 0 : Math.max(0, line.saleTotal + vat - deposit)
    };
  }

  function calculatePrintedTape(input = {}) {
    const rollLength = Math.max(0, number(input.rollLength));
    const rollsPerTree = Math.max(0, number(input.rollsPerTree));
    // Thiếu số mét/cuộn hoặc số cuộn/cây thì không thể tính giá gốc: gắn cờ để form từ chối lưu
    // thay vì âm thầm coi giá gốc = 0.
    const errors = [];
    if (!(rollLength > 0)) errors.push('Quy cách (m) phải lớn hơn 0');
    if (!(rollsPerTree > 0)) errors.push('Số cuộn/cây phải lớn hơn 0');
    const baseAndFees = [
      input.baseCost,
      input.quantityFee,
      input.glueFee,
      input.colorFee,
      input.sizeFee,
      input.cuttingFee
    ].reduce((sum, value) => sum + Math.max(0, number(value)), 0);
    const costPrice = errors.length === 0
      ? baseAndFees / STANDARD_ROLL_LENGTH_M * rollLength / rollsPerTree
      : 0;
    const product = calculateLine({
      quantity: input.quantity,
      costPrice,
      salePrice: input.salePrice,
      commissionPercent: input.commissionPercent,
      shipping: input.shipping
    });
    const axisVatPercent = input.isNewAxis ? percent(input.axisVatPercent) : 0;
    const hasAxisVatPercent = Object.prototype.hasOwnProperty.call(input, 'axisVatPercent');
    const axis = input.isNewAxis
      ? { ...calculateLine({
          quantity: input.axisQuantity,
          costPrice: input.axisCostPrice,
          salePrice: input.axisSalePrice,
          commissionPercent: input.axisCommissionPercent
        }), vatPercent: axisVatPercent }
      : { ...calculateLine(), vat: 0 };
    const deposit = money(Math.max(0, number(input.deposit)));
    const vatPercent = percent(input.vatPercent);
    const hasVatPercent = Object.prototype.hasOwnProperty.call(input, 'vatPercent');
    const vat = hasVatPercent ? vatAmount(product.saleTotal, vatPercent) : money(Math.max(0, number(input.vat)));
    const axisVat = input.isNewAxis
      ? (hasAxisVatPercent ? vatAmount(axis.saleTotal, axisVatPercent) : money(Math.max(0, number(input.axisVat))))
      : 0;
    axis.vat = axisVat;
    const combinedSaleTotal = product.saleTotal + axis.saleTotal;

    return {
      valid: errors.length === 0,
      errors,
      product,
      axis,
      deposit,
      vatPercent,
      axisVatPercent,
      vat,
      combinedCostTotal: product.costTotal + axis.costTotal,
      combinedSaleTotal,
      combinedProfit: product.profit + axis.profit,
      combinedCommission: product.commission + axis.commission,
      combinedNetProfit: product.netProfit + axis.netProfit,
      outstanding: input.settled ? 0 : Math.max(0, combinedSaleTotal + vat + axisVat - deposit)
    };
  }

  function outstandingFromOrder(order = {}, orderType = 'bang_keo_in') {
    const saleTotal = Math.max(0, number(order.thanh_tien_ban));
    const vat = Math.max(0, number(order.vat));
    if (orderType !== 'bang_keo_in') return order.da_tat_toan ? 0 : saleTotal + vat;
    const axisTotal = order.loai_truc === 'moi' ? Math.max(0, number(order.truc_thanh_tien_ban)) : 0;
    const axisVat = order.loai_truc === 'moi' ? Math.max(0, number(order.truc_vat)) : 0;
    const deposit = Math.max(0, number(order.tien_coc));
    return order.da_tat_toan ? 0 : Math.max(0, saleTotal + axisTotal + vat + axisVat - deposit);
  }

  // Biểu thức SQL công nợ khách / nợ NCC dùng chung cho tất toán, mở lại và chuyển báo giá thành đơn.
  // Phải luôn khớp outstandingFromOrder (có test kiểm tra chéo).
  function customerDebtSqlExpression(tableName) {
    return tableName === 'bang_keo_in_orders'
      ? `GREATEST(COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) + COALESCE(truc_vat, 0) ELSE 0 END + COALESCE(vat, 0) - COALESCE(tien_coc, 0), 0)`
      : `GREATEST(COALESCE(thanh_tien_ban, 0) + COALESCE(vat, 0), 0)`;
  }

  function supplierDebtSqlExpression(tableName) {
    if (tableName === 'bang_keo_in_orders') {
      return `GREATEST(COALESCE(thanh_tien_goc, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_goc, 0) ELSE 0 END, 0)`;
    }
    return tableName === 'bang_keo_orders'
      ? `GREATEST(COALESCE(thanh_tien, 0), 0)`
      : `GREATEST(COALESCE(thanh_tien_goc, 0), 0)`;
  }

  function calculateVoucherTotals(products = [], depositValue = 0) {
    const totals = products.reduce((result, product = {}) => {
      result.subtotal += money(Math.max(0, number(product.total)));
      result.vat += money(Math.max(0, number(product.vat)));
      return result;
    }, { subtotal: 0, vat: 0 });
    const deposit = money(Math.max(0, number(depositValue)));
    const totalPayable = totals.subtotal + totals.vat;

    return {
      ...totals,
      deposit,
      totalPayable,
      remaining: Math.max(0, totalPayable - deposit)
    };
  }

  function calculateQuoteItems(items = []) {
    const normalizedItems = items.map(item => {
      const quantity = Math.max(0, number(item?.quantity));
      const unitPrice = Math.max(0, number(item?.unitPrice));
      return {
        specification: String(item?.specification || '-'),
        quantity,
        unitPrice,
        total: money(quantity * unitPrice)
      };
    });
    return {
      items: normalizedItems,
      quantity: normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: normalizedItems.reduce((sum, item) => sum + item.total, 0)
    };
  }

  function calculateQuoteBundle(items = []) {
    return items.reduce((totals, item = {}) => {
      totals.quantity += Math.max(0, number(item.quantity));
      totals.productSubtotal += money(Math.max(0, number(item.total)));
      totals.costTotal += money(Math.max(0, number(item.costTotal)));
      totals.vat += money(Math.max(0, number(item.vat)));
      totals.deposit += money(Math.max(0, number(item.deposit)));
      totals.shipping += money(Math.max(0, number(item.shipping)));
      (Array.isArray(item.axes) ? item.axes : []).forEach(axis => {
        totals.axisCount += 1;
        totals.axisQuantity += Math.max(0, number(axis.quantity));
        totals.axisSubtotal += money(Math.max(0, number(axis.total)));
        totals.axisCostTotal += money(Math.max(0, number(axis.costTotal)));
        totals.axisVat += money(Math.max(0, number(axis.vat)));
      });
      totals.totalPayable = totals.productSubtotal + totals.axisSubtotal + totals.vat + totals.axisVat;
      totals.remaining = Math.max(0, totals.totalPayable - totals.deposit);
      return totals;
    }, {
      quantity: 0, productSubtotal: 0, costTotal: 0, vat: 0, deposit: 0, shipping: 0,
      axisCount: 0, axisQuantity: 0, axisSubtotal: 0, axisCostTotal: 0, axisVat: 0, totalPayable: 0, remaining: 0
    });
  }

  // Đọc quote_items (JSON hoặc chuỗi JSON) thành mảng an toàn.
  function parseQuoteItems(value) {
    let items = value;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (_) { items = []; }
    }
    return Array.isArray(items) ? items.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : [];
  }

  // Chi tiết kích thước/trục trong quote_items chỉ dùng khi tổng của nó còn khớp các cột tiền
  // của đơn (thanh_tien_ban, truc_*). Nếu đơn đã bị sửa sau đó, các cột DB là nguồn đúng
  // (khớp cong_no_khach), nên bỏ qua JSON cũ.
  function quoteItemsMatchOrder(order = {}, items = parseQuoteItems(order.quote_items)) {
    if (!items.length) return false;
    const totals = calculateQuoteBundle(items);
    const productMatches = money(totals.productSubtotal) === money(order.thanh_tien_ban);
    const axisSale = order.loai_truc === 'moi' ? money(order.truc_thanh_tien_ban) : 0;
    const axisVat = order.loai_truc === 'moi' ? money(order.truc_vat) : 0;
    const axisMatches = totals.axisCount === 0
      ? axisSale === 0
      : money(totals.axisSubtotal) === axisSale && money(totals.axisVat) === axisVat;
    return productMatches && axisMatches;
  }

  // Mã đơn dạng PREFIX-MM-YY-NNN: tìm số thứ tự lớn nhất theo GIÁ TRỊ SỐ (không theo chữ),
  // nên "-1000" lớn hơn "-999" và chuỗi không bị kẹt.
  // Lưu ý: mã được tính từ các mã CÒN TỒN TẠI, nên xóa đơn có số lớn nhất rồi tạo đơn mới sẽ dùng lại
  // đúng số đó. Vì vậy khi xóa đơn phải xóa luôn order_attachments của nó trong cùng transaction,
  // nếu không tệp đính kèm cũ sẽ "dính" sang đơn mới trùng mã.
  function nextOrderId(basePrefix, existingIds = [], minimumSequence = 0) {
    const prefix = `${basePrefix}-`;
    const maxSequence = (Array.isArray(existingIds) ? existingIds : []).reduce((max, rawId) => {
      const id = String(rawId ?? '');
      if (!id.startsWith(prefix)) return max;
      const suffix = id.slice(prefix.length);
      if (!/^\d+$/.test(suffix)) return max;
      return Math.max(max, parseInt(suffix, 10));
    }, 0);
    const sequence = Math.max(maxSequence, number(minimumSequence)) + 1;
    return `${prefix}${String(sequence).padStart(3, '0')}`;
  }

  function orderIdSequence(id) {
    const match = /-(\d+)$/.exec(String(id ?? ''));
    return match ? parseInt(match[1], 10) : 0;
  }

  // PostgreSQL unique_violation (23505); kênh IPC hiện chỉ trả message nên kiểm tra cả nội dung.
  function isUniqueViolation(result) {
    if (!result) return false;
    if (String(result.code || '') === '23505') return true;
    return /duplicate key|unique constraint|23505/i.test(String(result.error || result.message || ''));
  }

  function toVietnameseWords(value) {
    const rounded = Math.round(number(value));
    if (rounded < 0) {
      const positive = toVietnameseWords(-rounded);
      return `Âm ${positive.charAt(0).toLowerCase()}${positive.slice(1)}`;
    }
    const amount = rounded;
    if (amount === 0) return 'Không';

    const digits = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
    const groups = [];
    let remaining = amount;

    while (remaining > 0) {
      groups.push(remaining % 1000);
      remaining = Math.floor(remaining / 1000);
    }

    const readGroup = (group, forceHundreds) => {
      const words = [];
      const hundreds = Math.floor(group / 100);
      const tens = Math.floor((group % 100) / 10);
      const ones = group % 10;

      if (hundreds > 0) words.push(`${digits[hundreds]} trăm`);
      else if (forceHundreds) words.push('không trăm');

      if (tens > 1) {
        words.push(`${digits[tens]} mươi`);
        if (ones === 1) words.push('mốt');
        else if (ones === 4) words.push('tư');
        else if (ones === 5) words.push('lăm');
        else if (ones > 0) words.push(digits[ones]);
      } else if (tens === 1) {
        words.push('mười');
        if (ones === 5) words.push('lăm');
        else if (ones > 0) words.push(digits[ones]);
      } else if (ones > 0) {
        if (hundreds > 0 || forceHundreds) words.push('lẻ');
        words.push(digits[ones]);
      }

      return words.join(' ');
    };

    const words = [];
    let hasHigherGroup = false;
    for (let index = groups.length - 1; index >= 0; index -= 1) {
      const group = groups[index];
      if (group === 0) continue;
      words.push(readGroup(group, hasHigherGroup && group < 100));
      if (scales[index]) words.push(scales[index]);
      hasHigherGroup = true;
    }

    const result = words.join(' ').replace(/\s+/g, ' ').trim();
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  return {
    STANDARD_ROLL_LENGTH_M,
    number,
    percent,
    money,
    vatAmount,
    vatPercentFromAmount,
    calculateLine,
    calculateStandardOrder,
    calculatePrintedTape,
    outstandingFromOrder,
    customerDebtSqlExpression,
    supplierDebtSqlExpression,
    calculateVoucherTotals,
    calculateQuoteItems,
    calculateQuoteBundle,
    parseQuoteItems,
    quoteItemsMatchOrder,
    nextOrderId,
    orderIdSequence,
    isUniqueViolation,
    toVietnameseWords
  };
});
