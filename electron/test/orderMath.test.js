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
