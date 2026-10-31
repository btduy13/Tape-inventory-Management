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

test('amount in words reads Vietnamese numbers correctly (PDF and voucher share this helper)', () => {
  const cases = [
    [12500000, 'Mười hai triệu năm trăm nghìn'],
    [1005, 'Một nghìn không trăm lẻ năm'],
    [1005000, 'Một triệu không trăm lẻ năm nghìn'],
    [24, 'Hai mươi tư'],
    [1080000, 'Một triệu không trăm tám mươi nghìn'],
    [0, 'Không'],
    [105, 'Một trăm lẻ năm'],
    [1000000000, 'Một tỷ'],
    [21, 'Hai mươi mốt'],
    [15, 'Mười lăm'],
    [115000, 'Một trăm mười lăm nghìn']
  ];
  for (const [amount, words] of cases) {
    assert.equal(orderMath.toVietnameseWords(amount), words, String(amount));
  }
});

test('negative amounts are read with an "Âm" prefix instead of being clamped to zero', () => {
  assert.equal(orderMath.toVietnameseWords(-1005), 'Âm một nghìn không trăm lẻ năm');
  assert.equal(orderMath.toVietnameseWords(-24), 'Âm hai mươi tư');
});

test('VAT is rounded once per line so subtotal + VAT equals the total exactly', () => {
  const line = orderMath.calculateStandardOrder({ quantity: 3, salePrice: 33333, vatPercent: 10 });
  assert.equal(line.saleTotal, 99999);
  assert.equal(line.vat, 10000);
  assert.ok(Number.isInteger(line.vat));
  assert.equal(line.outstanding, line.saleTotal + line.vat);

  const printed = orderMath.calculatePrintedTape({
    quantity: 7, salePrice: 12345, vatPercent: 8, rollLength: 90, rollsPerTree: 60,
    isNewAxis: true, axisQuantity: 3, axisCostPrice: 1000, axisSalePrice: 33333, axisVatPercent: 8
  });
  assert.equal(printed.vat, Math.round(86415 * 0.08));
  assert.equal(printed.axis.vat, Math.round(99999 * 0.08));
  assert.ok(Number.isInteger(printed.vat) && Number.isInteger(printed.axis.vat));
  assert.equal(printed.outstanding, printed.combinedSaleTotal + printed.vat + printed.axis.vat);

  const bundle = orderMath.calculateQuoteBundle([
    { quantity: 1, total: 100.4, vat: 10.04 },
    { quantity: 1, total: 100.4, vat: 10.04, axes: [{ quantity: 1, total: 50.6, vat: 5.06 }] }
  ]);
  assert.equal(bundle.productSubtotal, 200);
  assert.equal(bundle.vat, 20);
  assert.equal(bundle.axisSubtotal, 51);
  assert.equal(bundle.axisVat, 5);
  assert.equal(bundle.totalPayable, bundle.productSubtotal + bundle.axisSubtotal + bundle.vat + bundle.axisVat);
});

test('net profit is derived from already-rounded parts', () => {
  const line = orderMath.calculateStandardOrder({ quantity: 3, costPrice: 1000.4, salePrice: 1999.7, commissionPercent: 7.5, shipping: 1000.6 });
  for (const key of ['costTotal', 'saleTotal', 'commission', 'shipping', 'netProfit']) {
    assert.ok(Number.isInteger(line[key]), key);
  }
  assert.equal(line.profit - line.commission - line.shipping, line.netProfit);
});

test('printed tape flags a zero or empty roll length / rolls per tree instead of silently costing 0', () => {
  const base = { quantity: 10, baseCost: 900000, salePrice: 20000, rollsPerTree: 60, rollLength: 90 };
  assert.equal(orderMath.calculatePrintedTape(base).valid, true);
  assert.equal(orderMath.STANDARD_ROLL_LENGTH_M, 90);
  assert.equal(orderMath.calculatePrintedTape(base).product.costPrice, 900000 / 90 * 90 / 60);

  const zeroLength = orderMath.calculatePrintedTape({ ...base, rollLength: 0 });
  assert.equal(zeroLength.valid, false);
  assert.ok(zeroLength.errors.some(message => /Quy cách \(m\)/.test(message)));

  const emptyRolls = orderMath.calculatePrintedTape({ ...base, rollsPerTree: '' });
  assert.equal(emptyRolls.valid, false);
  assert.ok(emptyRolls.errors.some(message => /cuộn\/cây/.test(message)));
});

test('negative quantity or prices never produce negative money', () => {
  const result = orderMath.calculateStandardOrder({ quantity: -5, costPrice: 1000, salePrice: 2000, vatPercent: 10 });
  assert.equal(result.quantity, 0);
  assert.equal(result.saleTotal, 0);
  assert.equal(result.vat, 0);
  assert.equal(result.outstanding, 0);
  const negativePrice = orderMath.calculateLine({ quantity: 2, salePrice: -100 });
  assert.equal(negativePrice.saleTotal, 0);
});

test('next order id uses the numeric suffix so -999 rolls over to -1000 and beyond', () => {
  assert.equal(orderMath.nextOrderId('BK-10-26', []), 'BK-10-26-001');
  assert.equal(orderMath.nextOrderId('BK-10-26', ['BK-10-26-998', 'BK-10-26-999']), 'BK-10-26-1000');
  // Lexically "-999" > "-1000"; the helper must still continue after -1000.
  assert.equal(orderMath.nextOrderId('BK-10-26', ['BK-10-26-999', 'BK-10-26-1000']), 'BK-10-26-1001');
  assert.equal(orderMath.nextOrderId('BK-10-26', ['BK-10-26-1000', 'BK-10-26-999', 'BK-10-26-1001']), 'BK-10-26-1002');
  // Other prefixes / malformed ids are ignored.
  assert.equal(orderMath.nextOrderId('B-10-26', ['BK-10-26-500', 'B-10-26-007', 'B-10-26-x']), 'B-10-26-008');
  // Retry after a unique violation asks for a sequence above the colliding one.
  assert.equal(orderMath.nextOrderId('TI-10-26', ['TI-10-26-004'], orderMath.orderIdSequence('TI-10-26-009')), 'TI-10-26-010');
});

test('unique violations are detected from pg code or message', () => {
  assert.equal(orderMath.isUniqueViolation({ ok: false, code: '23505' }), true);
  assert.equal(orderMath.isUniqueViolation({ ok: false, error: 'duplicate key value violates unique constraint "bang_keo_orders_pkey"' }), true);
  assert.equal(orderMath.isUniqueViolation({ ok: false, error: 'connection refused' }), false);
  assert.equal(orderMath.isUniqueViolation(null), false);
});

test('stored quote items are only trusted while they still match the order columns', () => {
  const items = [{ quantity: 2, unitPrice: 100, total: 200, vat: 16, axes: [{ quantity: 1, unitPrice: 300, total: 300, vat: 30 }] }];
  const order = { thanh_tien_ban: 200, loai_truc: 'moi', truc_thanh_tien_ban: 300, truc_vat: 30, quote_items: JSON.stringify(items) };
  assert.equal(orderMath.quoteItemsMatchOrder(order), true);
  assert.equal(orderMath.quoteItemsMatchOrder({ ...order, truc_thanh_tien_ban: 450 }), false);
  assert.equal(orderMath.quoteItemsMatchOrder({ ...order, thanh_tien_ban: 999 }), false);
  assert.equal(orderMath.quoteItemsMatchOrder({ ...order, quote_items: 'invalid' }), false);
});

test('nextOrderId reuses the highest sequence once it is freed (documented behaviour)', () => {
  assert.equal(orderMath.nextOrderId('BK-10-26', ['BK-10-26-001', 'BK-10-26-002']), 'BK-10-26-003');
  // Đơn 003 đã bị xóa: mã tiếp theo lại là 003, nên tệp đính kèm phải được xóa cùng đơn
  assert.equal(orderMath.nextOrderId('BK-10-26', ['BK-10-26-001', 'BK-10-26-002']), 'BK-10-26-003');
  assert.equal(orderMath.nextOrderId('BK-10-26', ['BK-10-26-001'], 5), 'BK-10-26-006');
});
