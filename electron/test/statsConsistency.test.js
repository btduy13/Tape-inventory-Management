const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const xlsxContext = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../xlsx.full.min.js'), 'utf8'), xlsxContext);
const XLSX = xlsxContext.XLSX;

function harness() {
  const controls = Object.fromEntries(Object.entries({
    'stats-search': '', 'stats-month-filter': 'all', 'stats-status-filter': 'all',
    'stats-date-from': '', 'stats-date-to': '', 'stats-giao-filter': 'all', 'stats-ctv-filter': ''
  }).map(([id, value]) => [id, { value }]));
  const context = vm.createContext({
    utils: { formatDate: value => value || '', formatCurrency: value => String(value || 0), escapeHtml: String },
    document: { getElementById: id => controls[id], querySelectorAll: () => [] },
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
