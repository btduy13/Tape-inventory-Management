const test = require('node:test');
const assert = require('node:assert/strict');
const orderMath = require('../js/orderMath');

test('standard order calculates totals, commission and debt', () => {
  const result = orderMath.calculateStandardOrder({
    quantity: 100,
    costPrice: 8000,
    salePrice: 12000,
    commissionPercent: 10,
    shipping: 50000
  });

  assert.equal(result.costTotal, 800000);
  assert.equal(result.saleTotal, 1200000);
  assert.equal(result.commission, 40000);
  assert.equal(result.netProfit, 310000);
  assert.equal(result.outstanding, 1200000);
});

test('printed tape includes a new axis in debt and profit', () => {
  const result = orderMath.calculatePrintedTape({
    quantity: 120,
    baseCost: 900000,
    rollLength: 90,
    rollsPerTree: 60,
    salePrice: 26000,
    commissionPercent: 5,
    shipping: 100000,
    deposit: 1000000,
    isNewAxis: true,
    axisQuantity: 1,
    axisCostPrice: 1200000,
    axisSalePrice: 1800000,
    axisCommissionPercent: 10
  });

  assert.equal(result.product.costPrice, 15000);
  assert.equal(result.product.saleTotal, 3120000);
  assert.equal(result.axis.saleTotal, 1800000);
  assert.equal(result.axis.commission, 60000);
  assert.equal(result.combinedSaleTotal, 4920000);
  assert.equal(result.outstanding, 3920000);
  assert.equal(result.combinedNetProfit, 1694000);
});

test('settled orders have no debt and reopening restores calculated debt', () => {
  const order = {
    thanh_tien_ban: 3120000,
    loai_truc: 'moi',
    truc_thanh_tien_ban: 1800000,
    tien_coc: 1000000
  };

  assert.equal(orderMath.outstandingFromOrder({ ...order, da_tat_toan: true }), 0);
  assert.equal(orderMath.outstandingFromOrder({ ...order, da_tat_toan: false }), 3920000);
});

test('overpayment and loss never create negative debt or commission', () => {
  const result = orderMath.calculateStandardOrder({
    quantity: 1,
    costPrice: 2000000,
    salePrice: 1000000,
    commissionPercent: 20,
    deposit: 1500000
  });

  assert.equal(result.commission, 0);
  assert.equal(result.outstanding, 0);
});

test('VAT is included in customer debt for standard and printed tape orders', () => {
  const standard = orderMath.calculateStandardOrder({ quantity: 2, salePrice: 100000, vat: 20000 });
  const printed = orderMath.calculatePrintedTape({ quantity: 2, salePrice: 100000, vat: 20000 });
  assert.equal(standard.outstanding, 220000);
  assert.equal(printed.outstanding, 220000);
});

test('VAT percentage is calculated from the total sale amount', () => {
  const standard = orderMath.calculateStandardOrder({ quantity: 2, salePrice: 100000, vatPercent: 10 });
  assert.equal(standard.vatPercent, 10);
  assert.equal(standard.vat, 20000);
  assert.equal(standard.outstanding, 220000);

  const withoutVat = orderMath.calculateStandardOrder({ quantity: 2, salePrice: 100000, vatPercent: 0, vat: 99999 });
  assert.equal(withoutVat.vat, 0);
  assert.equal(withoutVat.outstanding, 200000);
});

test('printed tape keeps product VAT and new-axis VAT separate in debt', () => {
  const result = orderMath.calculatePrintedTape({
    quantity: 10,
    salePrice: 20000,
    vat: 20000,
    deposit: 50000,
    isNewAxis: true,
    axisQuantity: 2,
    axisCostPrice: 30000,
    axisSalePrice: 50000,
    axisVat: 10000
  });
  assert.equal(result.vat, 20000);
  assert.equal(result.axis.vat, 10000);
  assert.equal(result.outstanding, 280000);
});

test('printed tape calculates product and new-axis VAT percentages from their totals', () => {
  const result = orderMath.calculatePrintedTape({
    quantity: 10,
    salePrice: 20000,
    vatPercent: 10,
    isNewAxis: true,
    axisQuantity: 2,
    axisCostPrice: 30000,
    axisSalePrice: 50000,
    axisVatPercent: 8
  });
  assert.equal(result.vat, 20000);
  assert.equal(result.axis.vat, 8000);
  assert.equal(result.outstanding, 328000);
});

test('one quotation aggregates multiple sizes of the same product', () => {
  const result = orderMath.calculateQuoteItems([
    { specification: '48mm x 100m', quantity: 10, unitPrice: 12000 },
    { specification: '60mm x 100m', quantity: 5, unitPrice: 15000 }
  ]);
  assert.equal(result.quantity, 15);
  assert.equal(result.subtotal, 195000);
  assert.equal(result.items.length, 2);
});

test('quotation bundle totals multiple prices, VAT and print axes', () => {
  const result = orderMath.calculateQuoteBundle([
    { quantity: 10, total: 120000, costTotal: 80000, vat: 12000, deposit: 20000, axes: [
      { quantity: 1, total: 900000, costTotal: 600000, vat: 90000 },
      { quantity: 1, total: 700000, costTotal: 500000 }
    ] },
    { quantity: 5, total: 75000, costTotal: 50000, vat: 7500, axes: [] }
  ]);
  assert.equal(result.quantity, 15);
  assert.equal(result.axisCount, 2);
  assert.equal(result.productSubtotal, 195000);
  assert.equal(result.axisSubtotal, 1600000);
  assert.equal(result.axisVat, 90000);
  assert.equal(result.totalPayable, 1904500);
  assert.equal(result.remaining, 1884500);
});

test('voucher totals add database numeric strings instead of concatenating them', () => {
  const totals = orderMath.calculateVoucherTotals([
    { total: '2400000', vat: '240000' },
    { total: '1800000', vat: '0' }
  ], '1000000');

  assert.equal(totals.subtotal, 4200000);
  assert.equal(totals.vat, 240000);
  assert.equal(totals.totalPayable, 4440000);
  assert.equal(totals.remaining, 3440000);
});

test('voucher totals reject invalid values and never return negative remaining debt', () => {
  const totals = orderMath.calculateVoucherTotals([
    { total: 'invalid', vat: -100 },
    { total: '1800000', vat: '0' }
  ], '2000000');

  assert.equal(totals.subtotal, 1800000);
  assert.equal(totals.vat, 0);
  assert.equal(totals.remaining, 0);
});

test('voucher amount in words keeps million groups in the correct order', () => {
  assert.equal(orderMath.toVietnameseWords(4200000), 'Bốn triệu hai trăm nghìn');
  assert.equal(orderMath.toVietnameseWords('4005000'), 'Bốn triệu không trăm lẻ năm nghìn');
  assert.equal(orderMath.toVietnameseWords(0), 'Không');
});
