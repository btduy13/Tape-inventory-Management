const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const xlsxContext = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../xlsx.full.min.js'), 'utf8'), xlsxContext);
const XLSX = xlsxContext.XLSX;
const orderMath = require('../js/orderMath');
const { toStatement, toTransaction } = require('./helpers/ipcDb');
const { settlementUpdateSql, settlementToggleSql, quoteConversionSql } = require('../db/writeActions');

function harness() {
  const controls = Object.fromEntries(Object.entries({
    'stats-search': '', 'stats-month-filter': 'all', 'stats-status-filter': 'all',
    'stats-date-from': '', 'stats-date-to': '', 'stats-giao-filter': 'all', 'stats-ctv-filter': ''
  }).map(([id, value]) => [id, { value }]));
  const context = vm.createContext({
    utils: { ...require('../js/utils'), formatDate: value => value || '', formatCurrency: value => String(value || 0), escapeHtml: String },
    document: { getElementById: id => controls[id], querySelectorAll: () => [] },
    orderMath,
    console
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/modules/thongke.js'), 'utf8'), context);
  return { context, controls, run: script => vm.runInContext(script, context) };
}

test('Excel child axes align with product columns and do not duplicate money on parent', () => {
  const { context } = harness();
  const rows = context.buildStatsExcelRows([
    { id: 'BKI-1', ten_hang: 'Băng keo', so_luong: '240', thanh_tien_ban: '2400000', tien_hoa_hong: '12000',
      loai_truc: 'moi', ten_truc: 'VIỀN', truc_so_luong: '2', truc_gia_goc: '30000',
      truc_gia_ban: '50000', truc_thanh_tien_ban: '100000', truc_thanh_tien_goc: '60000',
      truc_vat: '8000', truc_vat_percent: 0, truc_ctv: 'Thủy', truc_hoa_hong: '20', truc_tien_hoa_hong: '8000' },
    { id: 'BKI-2', ten_hang: 'Đơn kế tiếp', loai_truc: 'cu' }
  ], 'bang_keo_in');
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Đơn hàng');
  const file = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const restored = XLSX.utils.sheet_to_json(XLSX.read(file, { type: 'base64' }).Sheets['Đơn hàng']);
  assert.equal(restored.length, 3);
  assert.equal(restored[1]['Tên Hàng'], '↳ Trục kèm BKI: VIỀN');
  assert.equal(restored[1]['Số Lượng'], 2);
  assert.equal(restored[1]['Giá Bán'], 50000);
  assert.equal(restored[1]['Tiền Bán'], 100000);
  assert.equal(restored[1]['CTV'], 'Thủy');
  assert.equal(restored[1]['Tiền H.Hồng'], 8000);
  assert.equal(restored[0]['Tiền H.Hồng'], 12000);
  assert.equal(restored.reduce((sum, row) => sum + (row['Tiền H.Hồng'] || 0), 0), 20000);
  assert.equal(restored[1]['VAT (%)'], 8);
  assert.equal(restored[1]['Thành Tiền Gồm VAT'], 108000);
  assert.equal(restored[0]['Tiền Bán Trục'], undefined);
  assert.equal(restored[1]['Quy Cách (mm)'], undefined);
  assert.equal(restored.reduce((sum, row) => sum + (row['Tiền Bán'] || 0), 0), 2500000);
});

test('multiple stored axes keep order grouping; malformed entries do not break export', () => {
  const { context } = harness();
  const rows = context.buildStatsExcelRows([
    { id: 'A', loai_truc: 'moi', quote_items: JSON.stringify([{ axes: [null, { name: 'Đỏ', quantity: 1, unitPrice: 50 }, { name: 'Xanh', quantity: 2, unitPrice: 70 }] }]) },
    { id: 'B', loai_truc: 'cu', quote_items: 'invalid' }
  ], 'bang_keo_in');
  assert.deepEqual(Array.from(rows, row => row['Mã Đơn Hàng']), ['A', '↳ A', '↳ A', 'B']);
  assert.equal(rows[2]['Tiền Bán'], 140);
});

test('numeric and chronological sort, filtered exports, detail view and null fields stay consistent', () => {
  const { context, controls, run } = harness();
  context.orders = [
    { id: 'BK-10', ten_hang: null, ten_khach_hang: null, thoi_gian: '2026-01-31', cong_no_khach: '900', loai_truc: 'moi', truc_ctv: 'Thủy' },
    { id: 'BK-2', ten_hang: 'Hai', ten_khach_hang: 'B', thoi_gian: '2026-02-01', cong_no_khach: '100', ngay_du_kien: null },
    { id: 'BK-3', ten_hang: 'Ba', ten_khach_hang: 'C', thoi_gian: '2025-12-31', cong_no_khach: '20' }
  ];
  run('statsAllOrders = orders; statsSort = {key: "cong_no_khach", direction: "asc"}');
  const ids = () => Array.from(context.getFilteredStatsOrders(), row => row.id);
  assert.deepEqual(ids(), ['BK-3', 'BK-2', 'BK-10']);
  run('statsSort = {key: "thoi_gian", direction: "desc"}');
  assert.deepEqual(ids(), ['BK-2', 'BK-10', 'BK-3']);
  run('statsSort = {key: "id", direction: "asc"}');
  assert.deepEqual(ids(), ['BK-2', 'BK-3', 'BK-10']);
  run('statsColumnFilters.ten_khach_hang = new Set(["B"]); statsViewMode = "detail"');
  assert.deepEqual(ids(), ['BK-2']);
  run('statsColumnFilters = {}');
  controls['stats-search'].value = 'hai';
  assert.deepEqual(ids(), ['BK-2']);
  controls['stats-search'].value = '';
  controls['stats-ctv-filter'].value = 'thủy';
  assert.deepEqual(ids(), ['BK-10']);
  controls['stats-ctv-filter'].value = '';
  controls['stats-status-filter'].value = 'overdue';
  assert.deepEqual(ids(), []);
});

test('exportStatsExcel writes only filtered orders in chosen sort order', async () => {
  const { context, controls, run } = harness();
  let exported;
  context.XLSX = XLSX;
  context.window = { electronAPI: {
    showSaveDialog: async () => ({ filePath: 'test.xlsx' }),
    writeFileBase64: async (_path, data) => { exported = data; return { ok: true }; }
  } };
  context.utils.showToast = () => {};
  context.orders = [
    { id: 'BK-10', ten_hang: 'Chọn', loai_truc: 'moi', ten_truc: 'Đỏ', truc_so_luong: 1, truc_gia_ban: 20 },
    { id: 'BK-2', ten_hang: 'Chọn', loai_truc: 'cu' },
    { id: 'BK-1', ten_hang: 'Ẩn', loai_truc: 'cu' }
  ];
  run('statsAllOrders = orders; statsSort = {key: "id", direction: "asc"}');
  controls['stats-search'].value = 'chọn';
  await context.exportStatsExcel();
  const book = XLSX.read(exported, { type: 'base64' });
  assert.deepEqual(Array.from(book.SheetNames), ['Đơn hàng']);
  const rows = XLSX.utils.sheet_to_json(book.Sheets['Đơn hàng']);
  assert.deepEqual(Array.from(rows, row => row['Mã Đơn Hàng']), ['BK-2', 'BK-10', '↳ BK-10']);
});

// Tiny evaluator for the debt SQL subset (GREATEST / COALESCE / CASE WHEN loai_truc = 'moi') so the
// SQL formulas can be checked numerically against orderMath.outstandingFromOrder.
function evaluateDebtSql(expression, row) {
  const js = expression
    .replace(/CASE WHEN loai_truc = 'moi' THEN (.+?) ELSE 0 END/g, "(row.loai_truc === 'moi' ? ($1) : 0)")
    .replace(/COALESCE\((\w+), 0\)/g, 'num(row.$1)')
    .replace(/GREATEST\(/g, 'Math.max(');
  assert.doesNotMatch(js, /[A-Z]{3,}/, `unsupported SQL left in: ${js}`);
  const num = value => (value === null || value === undefined ? 0 : Number(value));
  return Function('row', 'num', `return ${js};`)(row, num);
}

const debtSampleRows = [
  { thanh_tien_ban: '3120000', vat: '249600', loai_truc: 'moi', truc_thanh_tien_ban: '1800000', truc_vat: '144000', tien_coc: '1000000' },
  { thanh_tien_ban: 3120000, vat: null, loai_truc: 'cu', truc_thanh_tien_ban: 1800000, truc_vat: 144000, tien_coc: 0 },
  { thanh_tien_ban: 100000, vat: 8000, loai_truc: 'moi', truc_thanh_tien_ban: null, truc_vat: null, tien_coc: 500000 },
  { thanh_tien_ban: null, vat: null, loai_truc: null, tien_coc: null }
];

test('debt SQL in settlement / toggle / quote conversion matches orderMath.outstandingFromOrder', () => {
  for (const [tableName, orderType] of [['bang_keo_in_orders', 'bang_keo_in'], ['bang_keo_orders', 'bang_keo'], ['truc_in_orders', 'truc_in'], ['thank_you_orders', 'thank_you']]) {
    const expression = orderMath.customerDebtSqlExpression(tableName);
    for (const row of debtSampleRows) {
      assert.equal(evaluateDebtSql(expression, row), orderMath.outstandingFromOrder(row, orderType), `${tableName} ${JSON.stringify(row)}`);
    }
    // Every SQL string the main process builds must embed exactly that shared formula.
    const settlementSql = settlementUpdateSql(tableName);
    const toggleSql = settlementToggleSql(tableName);
    const conversionSql = quoteConversionSql(tableName);
    for (const sql of [settlementSql, toggleSql, conversionSql]) {
      assert.ok(sql.includes('cong_no_khach = '), sql);
      assert.ok(sql.includes(expression), `${tableName} SQL must reuse the shared debt formula:\n${sql}`);
      assert.match(sql, /\bWHERE\b/);
    }
    assert.ok(settlementSql.includes(orderMath.supplierDebtSqlExpression(tableName)));
    assert.match(toggleSql, /da_tat_toan = NOT COALESCE\(da_tat_toan, FALSE\)/);
    assert.match(conversionSql, /AND is_quote = TRUE/);
    // Ngày tạo / ngày giao khi chuyển đơn lấy theo giờ máy (tham số), giống mọi thao tác ghi khác.
    assert.match(conversionSql, /thoi_gian = \$3/);
    assert.match(conversionSql, /ngay_du_kien = \$4/);
    assert.doesNotMatch(conversionSql, /NOW\(\)/);
    assert.doesNotMatch(conversionSql, /CURRENT_DATE/);
  }
});

test('profit card only adds new-axis profit and uses Vietnam time for due dates', async () => {
  const { context } = harness();
  let sql;
  context.window = { electronAPI: { dbQuery: async (action, params) => { sql = toStatement(action, params, 'read').sql; return { ok: true, rows: [] }; } } };
  await context.loadStatsWarningMetrics();
  assert.match(sql, /SUM\(loi_nhuan_rong \+ CASE WHEN loai_truc = 'moi' THEN truc_loi_nhuan_rong ELSE 0 END\)/);
  assert.doesNotMatch(sql, /CURRENT_DATE/);
  assert.match(sql, /NOW\(\) AT TIME ZONE 'Asia\/Ho_Chi_Minh'/);
});

test('stale stats responses are dropped so rows always match the active subtab', async () => {
  const { context, run } = harness();
  const pending = [];
  context.window = { electronAPI: { dbQuery: (action, params) => new Promise(resolve => pending.push({ sql: toStatement(action, params, 'read').sql, resolve })) } };
  run('statsActiveSubtab = "bang-keo-in"');
  const first = context.loadStatsTableData();
  run('statsActiveSubtab = "truc-in"');
  const second = context.loadStatsTableData();
  assert.match(pending[0].sql, /bang_keo_in_orders/);
  assert.match(pending[1].sql, /truc_in_orders/);
  assert.match(pending[1].sql, /::bigint DESC/);
  pending[1].resolve({ ok: true, rows: [{ id: 'TI-10-26-001' }] });
  await second;
  pending[0].resolve({ ok: true, rows: [{ id: 'BK-10-26-001' }] });
  await first;
  assert.deepEqual(Array.from(run('statsAllOrders'), row => row.id), ['TI-10-26-001']);
});

test('month filter compares year and month, not just getMonth()', () => {
  const { context } = harness();
  const now = new Date(2026, 9, 11);
  assert.equal(context.statsMonthFilterMatches(new Date(2026, 9, 5), '10', now), true);
  assert.equal(context.statsMonthFilterMatches(new Date(2025, 9, 5), '10', now), false);
  // A month that has not happened yet this year means last year's month.
  assert.equal(context.statsMonthFilterMatches(new Date(2025, 11, 20), '12', now), true);
  assert.equal(context.statsMonthFilterMatches(new Date(2026, 11, 20), '12', now), false);
  assert.equal(context.statsMonthFilterMatches(new Date(2024, 2, 1), '2024-03', now), true);
  assert.equal(context.statsMonthFilterMatches(new Date(2024, 2, 1), 'all', now), true);
});

test('delivery and settlement toggles flip the fresh DB value atomically', async () => {
  const { context, run } = harness();
  const calls = [];
  context.window = { electronAPI: {
    dbRun: async (action, params) => { calls.push(toStatement(action, params, 'write')); return { ok: true, rowCount: 1, rows: [{ da_giao: true, da_tat_toan: true }] }; },
    dbQuery: async () => ({ ok: true, rows: [] })
  } };
  context.utils.showToast = () => {};
  run('statsActiveSubtab = "bang-keo"');
  await context.toggleDeliveryStatus('B-10-26-001');
  await context.toggleSettlementStatus('B-10-26-001');
  assert.match(calls[0].sql, /UPDATE bang_keo_orders SET da_giao = NOT COALESCE\(da_giao, FALSE\) WHERE id = \$1 RETURNING da_giao/);
  assert.deepEqual(Array.from(calls[0].params), ['B-10-26-001']);
  assert.match(calls[1].sql, /RETURNING da_tat_toan/);
  assert.deepEqual(Array.from(calls[1].params), ['B-10-26-001']);
});

test('Excel VAT percent is rounded and VAT money matches the rounded screen values', () => {
  const { context } = harness();
  const rows = context.buildStatsExcelRows([
    { id: 'BK-1', thanh_tien_ban: '300000', vat: '25000.4', loai_truc: 'moi', ten_truc: 'A',
      truc_so_luong: 1, truc_gia_ban: 33333, truc_thanh_tien_ban: '33333', truc_vat: '2666.6' }
  ], 'bang_keo_in');
  assert.equal(rows[0]['VAT (%)'], 8.33);
  assert.equal(rows[0]['VAT'], 25000);
  assert.equal(rows[0]['Thành Tiền Gồm VAT'], 325000);
  assert.equal(rows[1]['VAT'], 2667);
  assert.equal(rows[1]['VAT (%)'], 8);
  assert.equal(rows[1]['Thành Tiền Gồm VAT'], 36000);
  assert.equal(rows[1]['Ghi Chú'], 'VAT 8% · Giá gồm VAT 36000đ');
});

test('Excel axis rows prefer truc_* columns when quote_items JSON is stale', () => {
  const { context } = harness();
  const staleItems = JSON.stringify([{ axes: [{ name: 'Cũ', quantity: 1, unitPrice: 100, total: 100, vat: 0 }] }]);
  const rows = context.buildStatsExcelRows([
    { id: 'BK-9', loai_truc: 'moi', quote_items: staleItems, ten_truc: 'Đã sửa', truc_so_luong: 2,
      truc_gia_ban: 250, truc_thanh_tien_ban: 500, truc_vat: 40 }
  ], 'bang_keo_in');
  assert.equal(rows.length, 2);
  assert.equal(rows[1]['Tên Hàng'], '↳ Trục kèm BKI: Đã sửa');
  assert.equal(rows[1]['Tiền Bán'], 500);
  assert.equal(rows[1]['VAT'], 40);

  const matching = context.buildStatsExcelRows([
    { id: 'BK-8', loai_truc: 'moi', quote_items: staleItems, truc_thanh_tien_ban: 100, truc_vat: 0 }
  ], 'bang_keo_in');
  assert.equal(matching[1]['Tên Hàng'], '↳ Trục kèm BKI: Cũ');
});

test('thongke no longer ships the broken amount-in-words helper or inline handlers', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/modules/thongke.js'), 'utf8');
  assert.doesNotMatch(source, /convertNumberToVietnameseWords/);
  assert.doesNotMatch(source, /\son(click|input|change)="/);
  assert.match(source, /revokeObjectURL/);
  assert.doesNotMatch(source, /reduce\(\(data, byte\) => data \+ String\.fromCharCode/);
});

test('Excel status words round-trip through the import boolean parser', () => {
  const { context } = harness();
  const importContext = vm.createContext({ Date, orderMath, utils: require('../js/utils'), window: { electronAPI: {} } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/modules/excelImport.js'), 'utf8'), importContext);
  const [done] = context.buildStatsExcelRows([{ id: 'B-1', da_giao: true, da_tat_toan: true, da_gui_email: true }], 'bang_keo');
  const [open] = context.buildStatsExcelRows([{ id: 'B-2', da_giao: false, da_tat_toan: false }], 'bang_keo');
  const values = Object.values(done).filter(value => value === 'Rồi' || value === 'Xong');
  assert.ok(values.includes('Rồi') && values.includes('Xong'), JSON.stringify(done));
  assert.ok(!Object.values(done).includes('Rồi/Xong'));
  for (const value of values) assert.equal(importContext.parseImportBoolean(value), true, value);
  assert.equal(importContext.parseImportBoolean('Chưa'), false);
  assert.ok(Object.values(open).includes('Chưa'));
});

function statsActionHarness(selectedIds = []) {
  const toasts = [];
  const transactions = [];
  const h = harness();
  h.context.document.querySelectorAll = () => selectedIds.map(id => ({ dataset: { id } }));
  h.context.utils.showToast = (message, type) => toasts.push({ message, type });
  h.context.utils.confirmAction = async () => true;
  h.context.loadStatsData = () => {};
  return { ...h, toasts, transactions };
}

test('deleting stats orders removes order + attachments in one transaction per order and reports failures', async () => {
  const { context, toasts, transactions } = statsActionHarness(['BK-1', 'BK-2']);
  context.window = { electronAPI: {
    dbRun: async () => { throw new Error('dbRun must not be used for the delete'); },
    dbTransaction: async steps => {
      const statements = toTransaction(steps);
      transactions.push(statements);
      return statements[0].params[0] === 'BK-2' ? { ok: false, error: 'locked' } : { ok: true, results: [{ rowCount: 1 }, { rowCount: 3 }] };
    }
  } };
  await context.deleteSelectedStats();
  assert.equal(transactions.length, 2);
  const [orderDelete, attachmentDelete] = transactions[0];
  assert.match(orderDelete.sql, /^DELETE FROM bang_keo_in_orders WHERE id = \$1$/);
  assert.match(attachmentDelete.sql, /DELETE FROM order_attachments WHERE order_id = \$1 AND order_type = \$2/);
  assert.deepEqual(Array.from(attachmentDelete.params), ['BK-1', 'bang_keo_in']);
  const toast = toasts.at(-1);
  assert.equal(toast.type, 'warning');
  assert.match(toast.message, /1\/2/);
  assert.match(toast.message, /BK-2/);
});

test('attachment manager pins the order once and decodes downloads into a Uint8Array', async () => {
  const { context, run, toasts } = statsActionHarness(['TI-7']);
  const queries = [];
  const runs = [];
  const nodes = {};
  context.document.getElementById = id => (nodes[id] ||= { innerText: '', innerHTML: '', classList: { add() {} }, appendChild() {} });
  context.document.createElement = () => ({ click() { this.clicked = true; } });
  context.window = {
    electronAPI: {
      dbQuery: async (action, params) => { queries.push(toStatement(action, params, 'read')); return { ok: true, rows: [] }; },
      dbRun: async (action, params) => { runs.push(toStatement(action, params, 'write')); return { ok: true, rowCount: 1 }; }
    },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }
  };
  context.atob = value => Buffer.from(value, 'base64').toString('binary');
  run('statsActiveSubtab = "truc-in"');
  await context.openAttachmentsManager();
  // The user switches subtab while the dialog is open: list/upload/delete still target TI-7 / truc_in.
  run('statsActiveSubtab = "bang-keo-in"');
  await context.loadAttachmentsList();
  assert.deepEqual(Array.from(queries.at(-1).params), ['TI-7', 'truc_in']);

  let reader;
  context.FileReader = function () { reader = this; this.readAsArrayBuffer = () => {}; };
  context.btoa = value => Buffer.from(value, 'binary').toString('base64');
  const input = { files: [{ name: 'a.txt', size: 3, type: 'text/plain' }], value: 'a.txt' };
  context.uploadAttachmentFile(input);
  run('statsAttachmentContext = { orderId: "OTHER", orderType: "bang_keo" }');
  await reader.onload.call({ result: new Uint8Array([1, 2, 3]).buffer });
  assert.deepEqual(Array.from(runs.at(-1).params.slice(0, 2)), ['truc_in', 'TI-7']);
  assert.ok(toasts.some(toast => /Đã thêm tệp/.test(toast.message)));
  reader.onerror();
  assert.equal(toasts.at(-1).type, 'danger');

  // Insert throwing -> error toast instead of an unhandled rejection.
  context.uploadAttachmentFile(input);
  context.window.electronAPI.dbRun = async () => { throw new Error('boom'); };
  await reader.onload.call({ result: new Uint8Array([1]).buffer });
  assert.match(toasts.at(-1).message, /boom/);

  // Delete is scoped to the pinned order.
  run('statsAttachmentContext = { orderId: "TI-7", orderType: "truc_in" }');
  context.window.electronAPI.dbRun = async (action, params) => { runs.push(toStatement(action, params, 'write')); return { ok: true, rowCount: 1 }; };
  await context.deleteAttachmentFile(42);
  assert.match(runs.at(-1).sql, /WHERE id = \$1 AND order_id = \$2 AND order_type = \$3/);
  assert.deepEqual(Array.from(runs.at(-1).params), [42, 'TI-7', 'truc_in']);

  const bytes = context.base64ToUint8Array(Buffer.from([0, 255, 128]).toString('base64'));
  assert.equal(Object.prototype.toString.call(bytes), '[object Uint8Array]');
  assert.deepEqual(Array.from(bytes), [0, 255, 128]);

  context.window.electronAPI.dbQuery = async () => ({ ok: true, rows: [{ content_type: 'text/plain', base64_data: '!!not base64!!' }] });
  context.Blob = function () {};
  context.atob = value => { if (/!/.test(value)) throw new Error('bad base64'); return Buffer.from(value, 'base64').toString('binary'); };
  await context.downloadAttachmentFile(1, 'a.txt');
  assert.equal(toasts.at(-1).type, 'danger');
  assert.ok(!toasts.some(toast => /thành công/.test(toast.message) && /tải tệp/i.test(toast.message)));
});
