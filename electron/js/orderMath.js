(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.orderMath = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function percent(value) {
    return Math.min(100, Math.max(0, number(value)));
  }

  function calculateLine(input = {}) {
    const quantity = Math.max(0, number(input.quantity));
    const costPrice = Math.max(0, number(input.costPrice));
    const salePrice = Math.max(0, number(input.salePrice));
    const shipping = Math.max(0, number(input.shipping));
    const commissionPercent = percent(input.commissionPercent);
    const costTotal = quantity * costPrice;
    const saleTotal = quantity * salePrice;
    const profit = saleTotal - costTotal;
    const commission = Math.max(0, profit) * commissionPercent / 100;

    return {
      quantity,
      costPrice,
      salePrice,
      costTotal,
      saleTotal,
      profit,
      commissionPercent,
      commission,
      netProfit: profit - commission - shipping
    };
  }

  function calculateStandardOrder(input = {}) {
    const line = calculateLine(input);
    return {
      ...line,
      outstanding: input.settled ? 0 : Math.max(0, line.saleTotal - Math.max(0, number(input.deposit)))
    };
  }

  function calculatePrintedTape(input = {}) {
    const rollLength = Math.max(0, number(input.rollLength));
    const rollsPerTree = Math.max(0, number(input.rollsPerTree));
    const baseAndFees = [
      input.baseCost,
      input.quantityFee,
      input.glueFee,
      input.colorFee,
      input.sizeFee,
      input.cuttingFee
    ].reduce((sum, value) => sum + Math.max(0, number(value)), 0);
    const costPrice = rollLength > 0 && rollsPerTree > 0
      ? baseAndFees / 90 * rollLength / rollsPerTree
      : 0;
    const product = calculateLine({
      quantity: input.quantity,
      costPrice,
      salePrice: input.salePrice,
      commissionPercent: input.commissionPercent,
      shipping: input.shipping
    });
    const axis = input.isNewAxis
      ? calculateLine({
          quantity: input.axisQuantity,
          costPrice: input.axisCostPrice,
          salePrice: input.axisSalePrice,
          commissionPercent: input.axisCommissionPercent
        })
      : calculateLine();
    const deposit = Math.max(0, number(input.deposit));
    const combinedSaleTotal = product.saleTotal + axis.saleTotal;

    return {
      product,
      axis,
      deposit,
      combinedCostTotal: product.costTotal + axis.costTotal,
      combinedSaleTotal,
      combinedProfit: product.profit + axis.profit,
      combinedCommission: product.commission + axis.commission,
      combinedNetProfit: product.netProfit + axis.netProfit,
      outstanding: input.settled ? 0 : Math.max(0, combinedSaleTotal - deposit)
    };
  }

  function outstandingFromOrder(order = {}, orderType = 'bang_keo_in') {
    const saleTotal = Math.max(0, number(order.thanh_tien_ban));
    if (orderType !== 'bang_keo_in') return order.da_tat_toan ? 0 : saleTotal;
    const axisTotal = order.loai_truc === 'moi' ? Math.max(0, number(order.truc_thanh_tien_ban)) : 0;
    const deposit = Math.max(0, number(order.tien_coc));
    return order.da_tat_toan ? 0 : Math.max(0, saleTotal + axisTotal - deposit);
  }

  function calculateVoucherTotals(products = [], depositValue = 0) {
    const totals = products.reduce((result, product = {}) => {
      result.subtotal += Math.max(0, number(product.total));
      result.vat += Math.max(0, number(product.vat));
      return result;
    }, { subtotal: 0, vat: 0 });
    const deposit = Math.max(0, number(depositValue));
    const totalPayable = totals.subtotal + totals.vat;

    return {
      ...totals,
      deposit,
      totalPayable,
      remaining: Math.max(0, totalPayable - deposit)
    };
  }

  function toVietnameseWords(value) {
    const amount = Math.round(Math.max(0, number(value)));
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
    number,
    percent,
    calculateLine,
    calculateStandardOrder,
    calculatePrintedTape,
    outstandingFromOrder,
    calculateVoucherTotals,
    toVietnameseWords
  };
});
