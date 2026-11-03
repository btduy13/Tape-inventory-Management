const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const orderMath = require('../js/orderMath');
const { toStatement } = require('./helpers/ipcDb');

// Mã đơn dùng tháng/năm hiện tại (generateOrderId chỉ xét mã cùng tháng)
const NOW_MONTH_YEAR = `${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getFullYear()).slice(2)}`;

function saveHarness(initialValues = {}, dbRunImpl) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        id, value: '', required: false, style: {}, dataset: {},
        classList: { toggle() {}, add() {}, remove() {} },
        setAttribute() {}, addEventListener() {}, querySelector: () => null
      });
    }
    return elements.get(id);
  };
  Object.entries(initialValues).forEach(([id, value]) => { element(id).value = value; });
  const toasts = [];
  const calls = [];
  const context = vm.createContext({
    console, orderMath, setTimeout,
    document: { addEventListener() {}, getElementById: element },
    utils: {
      formatCurrency: value => String(Math.round(Number(value) || 0)),
      parseCurrency: value => Number(String(value ?? '').replace(/,/g, '')) || 0,
      beginFormSubmit: () => true,
      endFormSubmit: () => {},
      showToast: (message, type) => toasts.push({ message, type }),
      confirmAction: async () => false
    },
    window: { electronAPI: {
      dbQuery: async () => ({ ok: true, rows: [] }),
      dbRun: async (action, params) => {
        const statement = toStatement(action, params, 'write');
        calls.push(statement);
        return dbRunImpl ? dbRunImpl(statement.sql, statement.params, calls.length) : { ok: true };
      },
      writeLog: () => {}
    } }
  });
  for (const file of ['bangkeoin.js', 'bangkeo.js', 'trucin.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/modules', file), 'utf8'), context);
  }
  return { context, element, toasts, calls };
}

const validBki = {
  'bki-ten-hang': 'Băng keo in', 'bki-ten-khach-hang': 'Khách A', 'bki-ngay-du-kien': '2026-10-12',
  'bki-so-luong': '7', 'bki-don-gia-von': '900000', 'bki-don-gia-ban': '12345', 'bki-qc-m': '100',
  'bki-cuon-cay': '60', 'bki-vat': '8', 'bki-hoa-hong-percent': '7.5', 'bki-tien-ship': '1000', 'bki-loai-truc': 'cu'
};

test('saveBangKeoIn rejects a zero roll length or rolls per tree with a Vietnamese message', async () => {
  for (const override of [{ 'bki-qc-m': '0' }, { 'bki-cuon-cay': '' }]) {
    const { context, toasts, calls } = saveHarness({ ...validBki, ...override });
    await context.saveBangKeoIn(null, 'order');
    assert.equal(calls.length, 0);
    assert.ok(toasts.some(toast => toast.type === 'warning' && /Quy cách \(m\) và Số cuộn\/cây phải lớn hơn 0/.test(toast.message)), JSON.stringify(toasts));
  }
});

test('order saves reject an invalid delivery date even when the form validation is bypassed', async () => {
  const cases = [
    ['saveBangKeoIn', { ...validBki, 'bki-ngay-du-kien': '' }],
    ['saveBangKeo', { 'bk-ten-hang': 'BK', 'bk-ten-khach-hang': 'K', 'bk-so-luong': '2', 'bk-don-gia-goc': '10', 'bk-don-gia-ban': '20', 'bk-ngay-du-kien': '2026-02-31' }],
    ['saveTrucIn', { 'ti-ten-hang': 'TI', 'ti-ten-khach-hang': 'K', 'ti-so-luong': '2', 'ti-don-gia-goc': '10', 'ti-don-gia-ban': '20', 'ti-ngay-du-kien': 'abc' }]
  ];
  for (const [fn, values] of cases) {
    const { context, toasts, calls } = saveHarness(values);
    await context[fn](null, 'order');
    assert.equal(calls.length, 0, fn);
    assert.ok(toasts.some(toast => /Ngày giao dự kiến không hợp lệ/.test(toast.message)), fn);
  }
});

test('saveBangKeoIn stores calculated numbers (not rounded display text) and consistent profit', async () => {
  const { context, calls } = saveHarness(validBki);
  await context.saveBangKeoIn(null, 'order');
  assert.equal(calls.length, 1);
  const columns = /INSERT INTO bang_keo_in_orders \(([^)]*)\)/.exec(calls[0].sql)[1].split(',').map(column => column.trim());
  const saved = Object.fromEntries(columns.map((column, index) => [column, calls[0].params[index]]));
  const expectedCostPrice = 900000 / 90 * 100 / 60;
  assert.equal(saved.don_gia_goc, expectedCostPrice);
  assert.equal(saved.thanh_tien_goc, Math.round(7 * expectedCostPrice));
  assert.equal(saved.thanh_tien_ban, 86415);
  assert.equal(saved.vat, Math.round(86415 * 0.08));
  assert.equal(saved.vat_percent, 8);
  assert.equal(saved.loi_nhuan - saved.tien_hoa_hong - saved.tien_ship, saved.loi_nhuan_rong);
  assert.equal(saved.cong_no_khach, saved.thanh_tien_ban + saved.vat);
  assert.match(saved.id, /^BK-\d{2}-\d{2}-001$/);
});

test('standard order saves use the rounded VAT and identical profit parts', async () => {
  const { context, calls } = saveHarness({
    'ti-ten-hang': 'TI', 'ti-ten-khach-hang': 'K', 'ti-so-luong': '3', 'ti-don-gia-goc': '1000.4',
    'ti-don-gia-ban': '33333', 'ti-vat': '10', 'ti-hoa-hong-percent': '7.5', 'ti-tien-ship': '1000.6', 'ti-ngay-du-kien': '2026-10-12'
  });
  await context.saveTrucIn(null, 'order');
  assert.equal(calls.length, 1);
  const columns = /INSERT INTO truc_in_orders \(([^)]*)\)/.exec(calls[0].sql)[1].split(',').map(column => column.trim());
  const saved = Object.fromEntries(columns.map((column, index) => [column, calls[0].params[index]]));
  assert.equal(saved.thanh_tien_ban, 99999);
  assert.equal(saved.vat, 10000);
  assert.equal(saved.loi_nhuan - saved.tien_hoa_hong - saved.tien_ship, saved.loi_nhuan_rong);
});

test('order saves include optional customer phone and delivery address', async () => {
  const { context, calls } = saveHarness({
    'bk-ten-hang': 'BK', 'bk-ten-khach-hang': 'K', 'bk-so-luong': '2', 'bk-don-gia-goc': '10', 'bk-don-gia-ban': '20',
    'bk-ngay-du-kien': '2026-10-12', 'bk-sdt-khach-hang': ' 0901234567 ', 'bk-dia-chi-khach-hang': '12 Lê Lợi, Q1'
  });
  await context.saveBangKeo(null, 'order');
  assert.equal(calls.length, 1);
  const columns = /INSERT INTO bang_keo_orders \(([^)]*)\)/.exec(calls[0].sql)[1].split(',').map(column => column.trim());
  const saved = Object.fromEntries(columns.map((column, index) => [column, calls[0].params[index]]));
  assert.equal(saved.sdt_khach_hang, '0901234567');
  assert.equal(saved.dia_chi_khach_hang, '12 Lê Lợi, Q1');

  const empty = saveHarness({ ...validBki });
  await empty.context.saveBangKeoIn(null, 'order');
  const emptyColumns = /INSERT INTO bang_keo_in_orders \(([^)]*)\)/.exec(empty.calls[0].sql)[1].split(',').map(column => column.trim());
  assert.equal(empty.calls[0].params[emptyColumns.indexOf('sdt_khach_hang')], null);
  assert.equal(empty.calls[0].params[emptyColumns.indexOf('dia_chi_khach_hang')], null);
});

test('inserts retry with the next id after a unique violation', async () => {
  const { context, calls } = saveHarness(validBki, (sql, params, attempt) => (
    attempt === 1 ? { ok: false, error: 'duplicate key value violates unique constraint "bang_keo_in_orders_pkey"' } : { ok: true }
  ));
  context.window.electronAPI.dbQuery = async () => ({ ok: true, rows: [{ id: `BK-${NOW_MONTH_YEAR}-999` }] });
  const ids = [];
  const { orderId, result } = await context.runWithGeneratedOrderId('BK', 'bang_keo_in', async id => {
    ids.push(id);
    return context.window.electronAPI.dbRun('order.insert', { orderType: 'bang_keo_in', values: { id } });
  });
  assert.equal(result.ok, true);
  assert.equal(ids.length, 2);
  assert.match(ids[0], /-1000$/);
  assert.match(ids[1], /-1001$/);
  assert.equal(orderId, ids[1]);
  assert.equal(calls.length, 2);
});

test('generateOrderId queries ids of the month without lexical ORDER BY', async () => {
  const { context } = saveHarness();
  let query;
  context.window.electronAPI.dbQuery = async (action, params) => { query = toStatement(action, params, 'read'); return { ok: true, rows: [{ id: `B-${NOW_MONTH_YEAR}-999` }, { id: `B-${NOW_MONTH_YEAR}-1000` }] }; };
  const id = await context.generateOrderId('B', 'bang_keo');
  assert.match(id, /^B-\d{2}-\d{2}-1001$/);
  assert.doesNotMatch(query.sql, /ORDER BY id/);
  assert.match(query.sql, /FROM bang_keo_orders WHERE id LIKE \$1/);
  assert.match(query.params[0], /^B-\d{2}-\d{2}-%$/);
});

test('default delivery date is local tomorrow, not a UTC date string', () => {
  const { context } = saveHarness();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const expected = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  assert.equal(context.tomorrowDeliveryDateValue(), expected);
  context.utils.tomorrowDateInputValue = () => '2030-01-02';
  assert.equal(context.tomorrowDeliveryDateValue(), '2030-01-02');
  for (const file of ['bangkeoin.js', 'bangkeo.js', 'trucin.js']) {
    const source = fs.readFileSync(path.join(__dirname, '../js/modules', file), 'utf8');
    assert.doesNotMatch(source, /toISOString\(\)\.split/, file);
  }
});

test('a second save while the first is still running is ignored', async () => {
  let release;
  const { context, calls } = saveHarness(validBki, () => new Promise(resolve => { release = () => resolve({ ok: true }); }));
  const first = context.saveBangKeoIn(null, 'order');
  await new Promise(resolve => setTimeout(resolve, 0));
  await context.saveBangKeoIn(null, 'order');
  assert.equal(calls.length, 1);
  release();
  await first;
});
