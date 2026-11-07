// Thank you orders, the customer picker, bulk status, quote-convert date prompt and auto refresh (WP11).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const orderMath = require('../js/orderMath');
const realUtils = require('../js/utils');
const { toStatement, toTransaction } = require('./helpers/ipcDb');

const CUSTOMER_ID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const load = (context, ...files) => files.forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context));

function fakeDom(initialValues = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        id, value: '', dataset: {}, style: {}, hidden: false, textContent: '',
        parentElement: { style: {}, append() {} }, after() {},
        classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, addEventListener() {}, querySelectorAll: () => [], focus() {}
      });
    }
    return elements.get(id);
  };
  Object.entries(initialValues).forEach(([id, value]) => { element(id).value = value; });
  return {
    element,
    document: {
      addEventListener() {}, getElementById: element,
      createElement: () => ({ style: {}, dataset: {}, addEventListener() {}, setAttribute() {} })
    }
  };
}

function thankYouHarness(values) {
  const { element, document } = fakeDom(values);
  const toasts = [];
  const calls = [];
  const context = vm.createContext({
    console, orderMath, setTimeout, document,
    utils: { ...realUtils, beginFormSubmit: () => true, endFormSubmit: () => {}, showToast: (message, type) => toasts.push({ message, type }), confirmAction: async () => false },
    window: { electronAPI: {
      dbQuery: async (action, params) => ({ ok: true, rows: /SELECT id FROM thank_you_orders/.test(toStatement(action, params, 'read').sql) ? [{ id: 'TY-x' }] : [] }),
      dbRun: async (action, params) => { calls.push(toStatement(action, params, 'write')); return { ok: true }; },
      writeLog: () => {}
    } }
  });
  load(context, 'modules/bangkeoin.js', 'modules/thankyou.js', 'modules/customers.js');
  return { context, element, toasts, calls };
}

const validThankYou = {
  'ty-ten-hang': 'Thank you 5cm', 'ty-ten-khach-hang': 'Chị Lan', 'ty-ngay-du-kien': '2026-11-20', 'ty-kich-thuoc': '48mm x 100m',
  'ty-so-luong': '120', 'ty-don-gia-von': '7,333', 'ty-don-gia-ban': '12,345', 'ty-vat': '8', 'ty-tien-coc': '500,000',
  'ty-hoa-hong-percent': '7.5', 'ty-tien-ship': '30,000', 'ty-sdt-khach-hang': '0909 000 111', 'ty-ghi-chu': 'in 2 màu'
};

test('Thank you order: TY id, money equals calculateStandardOrder with deposit, picked customer is saved', async () => {
  const { context, element, calls } = thankYouHarness(validThankYou);
  context.setPickedCustomer('ty-', CUSTOMER_ID, 'Chị Lan');
  await context.saveThankYou(null);
  assert.equal(calls.length, 1);
  const { sql, input } = calls[0];
  assert.match(sql, /^INSERT INTO thank_you_orders \(/);
  const v = input.values;
  assert.match(v.id, /^TY-\d{2}-\d{2}-001$/);
  const expected = orderMath.calculateStandardOrder({ quantity: '120', costPrice: 7333, salePrice: 12345, commissionPercent: '7.5', shipping: 30000, vatPercent: '8', deposit: 500000 });
  assert.equal(v.thanh_tien_von, expected.costTotal);
  assert.equal(v.thanh_tien_ban, expected.saleTotal);
  assert.equal(v.vat, expected.vat);
  assert.equal(v.cong_no_khach, expected.outstanding);
  assert.equal(v.cong_no_khach, expected.saleTotal + expected.vat - 500000);
  assert.equal(v.tien_coc, 500000);
  assert.equal(v.loi_nhuan_rong, expected.netProfit);
  assert.equal(v.loi_nhuan - v.tien_hoa_hong - v.tien_ship, v.loi_nhuan_rong);
  assert.equal(v.kich_thuoc, '48mm x 100m');
  assert.equal(v.ghi_chu, 'in 2 màu');
  assert.equal(v.customer_id, CUSTOMER_ID);
  assert.equal(v.is_quote, false);
  // The form is cleared afterwards and the picked customer forgotten.
  assert.equal(element('ty-ten-khach-hang').dataset.customerId, undefined);
});

test('Thank you order without a picked customer sends customer_id NULL (the DB trigger links by phone)', async () => {
  const { context, calls, toasts } = thankYouHarness(validThankYou);
  await context.saveThankYou(null);
  assert.equal(calls[0].input.values.customer_id, undefined);
  assert.equal(calls[0].params[calls[0].sql.split('(')[1].split(', ').indexOf('customer_id')], null);
  const missing = thankYouHarness({ ...validThankYou, 'ty-don-gia-ban': '' });
  await missing.context.saveThankYou(null);
  assert.equal(missing.calls.length, 0);
  assert.ok(toasts.some(toast => toast.type === 'success'));
});

test('customer picker: search by name/phone, pick fills the form, create links the new id', async () => {
  const { context, element, toasts } = thankYouHarness({ 'bk-ten-khach-hang': 'lan' });
  const pickers = [];
  context.utils.setupAutocomplete = (input, list, search, pick) => pickers.push({ input, list, search, pick });
  const queries = [];
  context.window.electronAPI.dbQuery = async (action, params) => {
    queries.push(toStatement(action, params, 'read'));
    return action === 'customer.create'
      ? { ok: true, rows: [{ id: CUSTOMER_ID }] }
      : { ok: true, rows: [{ id: CUSTOMER_ID, name: 'Chị Lan', phone: '0909000111', address: '5 Lê Lợi', company: 'Shop Lan' }] };
  };
  context.attachCustomerPicker('bk-');
  context.attachCustomerPicker('bk-'); // idempotent
  assert.deepEqual(pickers.map(p => p.input.id), ['bk-ten-khach-hang', 'bk-sdt-khach-hang']);
  const labels = await pickers[1].search('0909');
  assert.match(queries[0].sql, /FROM electron_customer_search\(\$1, NULL, 20\)/);
  assert.deepEqual(Array.from(labels), ['Chị Lan · 0909000111 · Shop Lan']);
  await pickers[1].pick(labels[0]);
  assert.equal(element('bk-ten-khach-hang').value, 'Chị Lan');
  assert.equal(element('bk-sdt-khach-hang').value, '0909000111');
  assert.equal(element('bk-dia-chi-khach-hang').value, '5 Lê Lợi');
  assert.equal(context.readCustomerContact('bk-').customer_id, CUSTOMER_ID);
  context.fillCustomerContact('bk-', {});
  assert.equal(context.readCustomerContact('bk-').customer_id, undefined);

  element('bk-ten-khach-hang').value = 'Anh Tư';
  await context.createCustomerFromForm('bk-', { disabled: false });
  assert.match(queries.at(-1).sql, /^SELECT electron_customer_create\(\$1, \$2, \$3\) AS id$/);
  assert.equal(queries.at(-1).params[0], 'Anh Tư');
  assert.equal(context.readCustomerContact('bk-').customer_id, CUSTOMER_ID);
  context.window.electronAPI.dbQuery = async () => ({ ok: false, error: 'Lỗi cơ sở dữ liệu (mã 22023)', code: '22023' });
  context.setPickedCustomer('bk-', '');
  await context.createCustomerFromForm('bk-', { disabled: false });
  assert.equal(context.readCustomerContact('bk-').customer_id, undefined);
  assert.match(toasts.at(-1).message, /gõ tên hoặc SĐT để chọn khách có sẵn/);
});

function appHarness(extra = {}) {
  const { element, document } = fakeDom();
  document.querySelectorAll = () => [];
  const context = vm.createContext({ orderMath, document, setTimeout, window: { addEventListener() {} }, ...extra });
  load(context, 'utils.js', 'app.js', 'modules/thankyou.js');
  return { context, element };
}

test('plain-tape edit form has no glue colour (bang_keo_orders has no mau_keo); axis edit keeps it', () => {
  const { context } = appHarness();
  vm.runInContext("editOrderTypeGlobal = 'truc_in'", context);
  assert.doesNotMatch(context.generateBangKeoEditForm({ id: 'B-1' }), /edit-mau-keo/);
  vm.runInContext("editOrderTypeGlobal = 'bang_keo'", context);
  assert.match(context.generateTrucInEditForm({ id: 'TI-1', mau_keo: 'Trong' }), /id="edit-mau-keo"[^>]*value="Trong"/);
  assert.match(context.generateThankYouEditForm({ id: 'TY-1', kich_thuoc: '5x5' }), /id="edit-kich-thuoc"[^>]*value="5x5"/);
});

test('edit dialog sends customer_id only when the user picked a different customer', async () => {
  const { context, element } = appHarness();
  const html = context.generateBangKeoEditForm({ id: 'B-1', ten_hang: 'H', ten_khach_hang: 'K', ngay_du_kien: '2026-11-20', so_luong: 1, don_gia_goc: 1, don_gia_ban: 2 });
  for (const match of html.matchAll(/<input[^>]*id="([^"]+)"[^>]*value="([^"]*)"[^>]*>/g)) element(match[1]).value = match[2];
  element('edit-order-form').checkValidity = () => true;
  vm.runInContext("editOrderTypeGlobal = 'bang_keo'; editOrderIdGlobal = 'B-1'; editOrderDataGlobal = { customer_id: 'aaaaaaaa-0000-4000-8000-000000000000' }", context);
  const calls = [];
  context.window.electronAPI = { dbRun: async (action, params) => { calls.push(params.values); return { ok: true }; } };
  vm.runInContext('utils.showToast = () => {}; closeModal = () => {}; switchTab = async () => {};', context);
  element('edit-ten-khach-hang').dataset.customerId = 'aaaaaaaa-0000-4000-8000-000000000000';
  await context.submitEditOrder();
  assert.equal('customer_id' in calls[0], false, 'stale customer_id is not written back');
  element('edit-ten-khach-hang').dataset.customerId = CUSTOMER_ID;
  await context.submitEditOrder();
  assert.equal(calls[1].customer_id, CUSTOMER_ID);
});

test('auto refresh reloads Thống kê, keeps the selected rows and skips while a dialog is open', async () => {
  const rows = ['A', 'B'].map(id => ({ dataset: { id }, classList: { selected: false, toggle(_, on) { this.selected = on; } } }));
  let loads = 0;
  const { context } = appHarness({
    loadStatsData: async () => { loads += 1; },
    getSelectedStatsOrderIds: () => ['B'],
    getVisibleStatsRows: () => rows,
    updateStatsSelectionSummary: () => {}
  });
  vm.runInContext("activeTab = 'thong-ke'", context);
  await context.autoRefreshActiveTab();
  assert.equal(loads, 1);
  assert.deepEqual(rows.map(row => row.classList.selected), [false, true]);
  vm.runInContext("activeTab = 'sales'", context);
  await context.autoRefreshActiveTab();
  assert.equal(loads, 1, 'only dashboard and stats refresh');
  vm.runInContext("activeTab = 'thong-ke'; getTopActiveModal = () => ({})", context);
  await context.autoRefreshActiveTab();
  assert.equal(loads, 1, 'never refresh under an open dialog');
});

test('confirm dialog with a date returns the chosen date, or false when cancelled', async () => {
  const { context, element } = appHarness();
  context.utils = vm.runInContext('utils', context);
  const pending = context.utils.confirmAction('Chuyển?', { date: '2026-11-08' });
  assert.equal(element('confirm-action-date').hidden, false);
  assert.equal(element('confirm-action-date').value, '2026-11-08');
  element('confirm-action-date').value = '2026-11-15';
  context.utils.resolveConfirmAction(true);
  assert.equal(await pending, '2026-11-15');
  const plain = context.utils.confirmAction('Xóa?');
  assert.equal(element('confirm-action-date').hidden, true);
  context.utils.resolveConfirmAction(true);
  assert.equal(await plain, true);
  const cancelled = context.utils.confirmAction('Chuyển?', { date: '2026-11-08' });
  context.utils.resolveConfirmAction(false);
  assert.equal(await cancelled, false);
});

test('bulk status: one transaction, only the chosen flag changes', async () => {
  const { element, document } = fakeDom({ 'bulk-stats-da-giao': '', 'bulk-stats-da-tat-toan': 'true' });
  document.querySelectorAll = () => ['TY-1', 'TY-2'].map(id => ({ dataset: { id } }));
  const toasts = [];
  const transactions = [];
  const context = vm.createContext({
    orderMath, document,
    utils: { ...realUtils, showToast: (message, type) => toasts.push({ message, type }) },
    closeModal: () => {},
    window: { electronAPI: { dbTransaction: async steps => { transactions.push(toTransaction(steps)); return { ok: true, results: [{ rowCount: 1 }, { rowCount: 1 }] }; } } }
  });
  load(context, 'modules/thongke.js');
  context.loadStatsData = () => {};
  vm.runInContext("statsActiveSubtab = 'thank-you'", context);
  await context.applyBulkStatsStatus();
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].length, 2);
  assert.match(transactions[0][0].sql, /^UPDATE thank_you_orders/);
  assert.deepEqual(Array.from(transactions[0][1].params), [null, true, 'TY-2']);
  assert.match(toasts.at(-1).message, /2\/2/);
  element('bulk-stats-da-tat-toan').value = '';
  await context.applyBulkStatsStatus();
  assert.equal(transactions.length, 1, 'nothing chosen -> nothing sent');
});

test('Thank you debt: SQL formula and orderMath agree (deposit lowers debt, never below 0)', () => {
  const sql = orderMath.customerDebtSqlExpression('thank_you_orders');
  assert.equal(sql, 'GREATEST(COALESCE(thanh_tien_ban, 0) + COALESCE(vat, 0) - COALESCE(tien_coc, 0), 0)');
  assert.equal(orderMath.supplierDebtSqlExpression('thank_you_orders'), 'GREATEST(COALESCE(thanh_tien_von, 0), 0)');
  assert.equal(orderMath.outstandingFromOrder({ thanh_tien_ban: 1000, vat: 80, tien_coc: 300 }, 'thank_you'), 780);
  assert.equal(orderMath.outstandingFromOrder({ thanh_tien_ban: 1000, vat: 80, tien_coc: 3000 }, 'thank_you'), 0);
  assert.equal(orderMath.outstandingFromOrder({ thanh_tien_ban: 1000, da_tat_toan: true }, 'thank_you'), 0);
  assert.equal(orderMath.outstandingFromOrder({ thanh_tien_ban: 1000, vat: 80, tien_coc: 300 }, 'bang_keo'), 1080, 'plain tape ignores deposit');
});

test('dashboard, warning metrics and export include Thank you orders', () => {
  for (const [action, params] of [['dashboard.monthMetrics', { since: new Date() }], ['dashboard.attention', {}], ['stats.warningMetrics', {}],
    ['dashboard.salesTrend', { period: 'day', since: new Date() }], ['dashboard.productDistribution', {}], ['dashboard.topProduct', { since: new Date() }], ['export.listOrders', {}]]) {
    assert.match(toStatement(action, params, 'read').sql, /FROM thank_you_orders/, action);
  }
  assert.match(toStatement('stats.listOrders', { orderType: 'thank_you' }, 'read').sql, /FROM thank_you_orders/);
});
