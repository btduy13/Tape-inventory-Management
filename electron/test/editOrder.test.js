const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const orderMath = require('../js/orderMath');

function editHarness(type) {
  const elements = new Map();
  const context = vm.createContext({
    orderMath,
    document: { addEventListener() {}, getElementById: id => elements.get(id) },
    window: { addEventListener() {} }
  });
  for (const file of ['utils.js', 'app.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
  }
  vm.runInContext(`editOrderTypeGlobal = '${type}'; editOrderDataGlobal = {};`, context);
  const order = { id: 'test', ten_hang: 'Hàng', ten_khach_hang: 'Khách', ngay_du_kien: '2026-09-09',
    so_luong: 10, don_gia_goc: 600, don_gia_ban: 1000, hoa_hong: 20, vat_percent: 8,
    tien_ship: 100, don_gia_von: 600, quy_cach_m: 90, cuon_cay: 1,
    loai_truc: 'moi', ten_truc: 'Trục', truc_so_luong: 2, truc_gia_goc: 100,
    truc_gia_ban: 500, truc_hoa_hong: 25, truc_vat_percent: 10, tien_coc: 1000 };
  const html = type === 'bang_keo_in' ? context.generateBangKeoInEditForm(order) : context.generateTrucInEditForm(order);
  for (const match of html.matchAll(/<input[^>]*id="([^"]+)"[^>]*value="([^"]*)"[^>]*>/g)) {
    elements.set(match[1], { value: match[2], readonly: match[0].includes(' readonly') });
  }
  elements.set('edit-loai-truc', { value: 'moi' });
  elements.set('edit-order-form', { checkValidity: () => true });
  elements.set('edit-axis-fields', { classList: { toggle() {} }, querySelectorAll: () =>
    [...elements].filter(([id]) => id.startsWith('edit-truc-')).map(([, input]) => input) });
  return { context, elements, html };
}

for (const type of ['bang_keo', 'truc_in', 'bang_keo_in']) {
  test(`edit ${type}: commission and VAT update from current inputs`, () => {
    const { context, elements } = editHarness(type);
    context.updateEditOrderCalculations();
    assert.equal(elements.get('edit-tien-hoa-hong').value, '800');
    assert.equal(elements.get('edit-tien-vat').value, '800');
    assert.equal(elements.get('edit-loi-nhuan-rong').value, '3,100');
    assert.equal(elements.get('edit-tien-hoa-hong').readonly, true);
    elements.get('edit-hoa-hong-percent').value = '50';
    elements.get('edit-so-luong').value = '20';
    context.updateEditOrderCalculations();
    assert.equal(elements.get('edit-tien-hoa-hong').value, '4,000');
    assert.equal(elements.get('edit-tien-vat').value, '1,600');
    elements.get('edit-don-gia-ban').value = '500';
    context.updateEditOrderCalculations();
    assert.equal(elements.get('edit-tien-hoa-hong').value, '0', 'loss must not generate commission');
    vm.runInContext('editOrderDataGlobal.da_tat_toan = true', context);
    context.updateEditOrderCalculations();
    assert.equal(elements.get('edit-cong-no-khach').value, '0');
  });
  test(`edit ${type}: saved commission and VAT equal preview calculations`, async () => {
    const { context, elements } = editHarness(type);
    const calls = [];
    const toasts = [];
    context.window.electronAPI = {
      dbRun: async (sql, params) => { calls.push({ sql, params }); return { ok: true }; },
      writeLog: (_, message) => { throw new Error(message); }
    };
    context.captureToast = (...args) => toasts.push(args);
    vm.runInContext('utils.showToast = captureToast; closeModal = () => {}; switchTab = async () => {};', context);
    elements.get('edit-hoa-hong-percent').value = '35';
    elements.get('edit-vat').value = '10';
    context.updateEditOrderCalculations();
    await context.submitEditOrder();
    assert.equal(calls.length, 1, JSON.stringify(toasts));
    const saved = column => {
      const index = Number(calls[0].sql.match(new RegExp(`\\b${column}=\\$(\\d+)`))[1]);
      return calls[0].params[index - 1];
    };
    assert.equal(saved('tien_hoa_hong'), 1400);
    assert.equal(saved('vat'), 1000);
    assert.equal(elements.get('edit-tien-hoa-hong').value, '1,400');
    assert.equal(elements.get('edit-tien-vat').value, '1,000');
    if (type === 'bang_keo_in') {
      assert.equal(saved('truc_tien_hoa_hong'), 200);
      assert.equal(saved('truc_vat'), 100);
    }
  });
}

test('converted quote edit preserves stored multi-size totals and only saves shared information', async () => {
  const { context, elements } = editHarness('bang_keo_in');
  context.storedOrder = { quote_items: [{ quantity: 2, unitPrice: 100 }, { quantity: 3, unitPrice: 200 }],
    thanh_tien_ban: 800, tien_hoa_hong: 50, vat: 64, loi_nhuan_rong: 100, cong_no_khach: 974,
    loai_truc: 'moi', truc_thanh_tien_ban: 100, truc_vat: 10, truc_tien_hoa_hong: 20 };
  vm.runInContext('editOrderDataGlobal = storedOrder;', context);
  context.updateEditOrderCalculations();
  assert.equal(elements.get('edit-tien-hoa-hong').value, '50');
  assert.equal(elements.get('edit-tong-thanh-toan').value, '974');
  const calls = [];
  context.window.electronAPI = { dbRun: async (sql, params) => { calls.push({ sql, params }); return { ok: true }; } };
  vm.runInContext('utils.showToast = () => {}; closeModal = () => {}; switchTab = async () => {};', context);
  elements.get('edit-ten-khach-hang').value = 'Khách đã sửa';
  await context.submitEditOrder();
  assert.equal(calls.length, 1);
  assert.doesNotMatch(calls[0].sql, /quote_items|thanh_tien|hoa_hong|vat|so_luong/);
  assert.equal(calls[0].params[1], 'Khách đã sửa');
  assert.equal(context.storedOrder.thanh_tien_ban, 800);
  assert.equal(context.storedOrder.quote_items.length, 2);
});

test('edit attached axis: totals, VAT, commission and old-axis validation stay consistent', () => {
  const { context, elements } = editHarness('bang_keo_in');
  context.updateEditOrderCalculations();
  assert.equal(elements.get('edit-truc-tien-hoa-hong').value, '200');
  assert.equal(elements.get('edit-truc-tien-vat').value, '100');
  assert.equal(elements.get('edit-tong-thanh-toan').value, '11,900');
  assert.equal(elements.get('edit-cong-no-khach').value, '10,900');
  elements.get('edit-loai-truc').value = 'cu';
  elements.get('edit-truc-hoa-hong-percent').value = '150';
  context.toggleEditAxisFields();
  assert.equal(elements.get('edit-truc-hoa-hong-percent').disabled, true);
  assert.equal(elements.get('edit-truc-ten').required, false);
  assert.equal(elements.get('edit-truc-tien-hoa-hong').value, '0');
  assert.equal(elements.get('edit-tong-thanh-toan').value, '10,800');
  assert.equal(elements.get('edit-cong-no-khach').value, '9,800');
  elements.get('edit-loai-truc').value = 'moi';
  context.toggleEditAxisFields();
  assert.equal(elements.get('edit-truc-ten').disabled, false);
  assert.equal(elements.get('edit-truc-ten').required, true);
});
