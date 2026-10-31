const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const orderMath = require('../js/orderMath');

function voucherHarness() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { id, value: '', innerText: '', classList: { add() {}, remove() {} } });
    return elements.get(id);
  };
  const toasts = [];
  const context = vm.createContext({
    console, orderMath,
    document: { getElementById: element },
    utils: {
      formatCurrency: value => String(Math.round(Number(value) || 0)),
      showToast: (message, type) => toasts.push({ message, type })
    },
    window: { electronAPI: {} }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/modules/exportManager.js'), 'utf8'), context);
  return { context, element, toasts };
}

test('voucher lines use the sale value only, never the cost fallback', () => {
  const { context } = voucherHarness();
  const lines = context.buildExportProductsFromOrder({ id: 'B-1', ten_hang: 'BK', so_luong: 2, don_gia_ban: 0, thanh_tien_ban: 0, thanh_tien: 999999, vat: 0 }, 'bang_keo_orders');
  assert.equal(lines[0].total, 0);
  const tiLines = context.buildExportProductsFromOrder({ id: 'TI-1', ten_hang: 'TI', so_luong: 2, don_gia_ban: 0, thanh_tien_ban: null, thanh_tien_goc: 5000 }, 'truc_in_orders');
  assert.equal(tiLines[0].total, 0);
});

test('converted multi-size quotes print one line per size so quantity x price == line total', () => {
  const { context } = voucherHarness();
  const items = [
    { specification: '48mm', quantity: 10, unitPrice: 12000, total: 120000, vat: 9600, axes: [{ name: 'Đỏ', quantity: 1, unitPrice: 300000, total: 300000, vat: 24000 }] },
    { specification: '60mm', quantity: 5, unitPrice: 15000, total: 75000, vat: 6000 }
  ];
  const lines = context.buildExportProductsFromOrder({
    id: 'BK-1', ten_hang: 'Tape', so_luong: 15, don_gia_ban: 12000, thanh_tien_ban: 195000, vat: 15600,
    loai_truc: 'moi', truc_thanh_tien_ban: 300000, truc_vat: 24000, quote_items: JSON.stringify(items)
  }, 'bang_keo_in_orders');
  assert.equal(lines.length, 3);
  for (const line of lines) assert.equal(line.quantity * line.price, line.total);
  assert.deepEqual(Array.from(lines, line => line.specs), ['48mm', '', '60mm']);
  const totals = orderMath.calculateVoucherTotals(lines, 0);
  assert.equal(totals.subtotal, 495000);
  assert.equal(totals.vat, 39600);
});

test('editing quantity/price recomputes VAT from the stored percent and rejects negatives', () => {
  const { context, element, toasts } = voucherHarness();
  element('preview-deposit').value = '0';
  vm.runInContext(`exportPreviewData = { products: [{ quantity: 10, price: 1000, total: 10000, vat: 800, vatPercent: 8 }], deposit: 0 }`, context);
  context.updatePreviewProductNumeric(0, 'quantity', '3');
  const product = vm.runInContext('exportPreviewData.products[0]', context);
  assert.equal(product.total, 3000);
  assert.equal(product.vat, 240);
  const input = { value: '-2' };
  context.updatePreviewProductNumeric(0, 'price', '-2', input);
  assert.equal(product.price, 1000);
  assert.equal(input.value, '1000');
  assert.ok(toasts.some(toast => /không được âm/.test(toast.message)));
});

test('shared quantity formatter never prints NaN', () => {
  const { context } = voucherHarness();
  assert.equal(context.formatExportQuantity('abc'), '0');
  assert.equal(context.formatExportQuantity(undefined), '0');
  assert.equal(context.formatExportQuantity(1234.5), (1234.5).toLocaleString('vi-VN', { maximumFractionDigits: 3 }));
});

test('voucher HTML strings have no inline event handlers', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/modules/exportManager.js'), 'utf8');
  assert.doesNotMatch(source, /\son(click|input|change)="/);
  assert.doesNotMatch(source, /thanh_tien_ban \|\| order\.thanh_tien_goc/);
});

test('Băng Keo spec prints free-text quy_cach as-is and only appends kg to a bare number', () => {
  const { context } = voucherHarness();
  const spec = quyCach => context.getExportSpecsAndUnit({ quy_cach: quyCach }, 'bang_keo_orders');
  assert.equal(spec('48mm x 100y').specs, '48mm x 100y');
  assert.equal(spec('25').specs, '25kg');
  assert.equal(spec('2.5').specs, '2.5kg');
  assert.equal(spec('').specs, '');
  assert.equal(spec(null).specs, '');
  assert.equal(spec('25').unit, 'KG');
});

test('refiltering keeps selections across searches and reports orders hidden by the filter', () => {
  const { context, element } = voucherHarness();
  const tbody = { innerHTML: '', rows: [], appendChild(row) { this.rows.push(row); } };
  const countLabel = element('export-selected-count');
  context.utils.formatDate = value => String(value ?? '');
  context.document.getElementById = id => (id === 'export-orders-tbody' ? tbody : element(id));
  context.document.createElement = () => ({ dataset: {}, innerHTML: '', querySelector: () => null, addEventListener() {} });
  const year = new Date().getFullYear();
  vm.runInContext(`exportAllOrders = [
    { id: 'BK-1', type: 'bang_keo_in', thoi_gian: new Date(${year}, 0, 5) },
    { id: 'B-2', type: 'bang_keo', thoi_gian: new Date(${year}, 0, 6) }
  ]; selectedExportOrderIds.add('BK-1'); selectedExportOrderIds.add('B-2');`, context);
  element('export-filter-year').value = String(year);
  element('export-filter-month').value = 'all';
  element('export-filter-search').value = '';
  element('export-filter-type').value = 'bang_keo';
  context.loadExportOrdersTable();
  assert.deepEqual(Array.from(vm.runInContext('Array.from(selectedExportOrderIds)', context)), ['BK-1', 'B-2']);
  assert.equal(countLabel.textContent, 'Đã chọn 2 đơn (1 đơn đang bị bộ lọc ẩn)');
  element('export-filter-type').value = 'all';
  context.loadExportOrdersTable();
  assert.equal(countLabel.textContent, 'Đã chọn 2 đơn');
  assert.equal(element('export-orders-select-all').checked, true);
});

test('a failed or missing order aborts the export preview with the failing ids', async () => {
  const { context, element, toasts } = voucherHarness();
  const opened = [];
  element('modal-export-preview').classList = { add: () => opened.push('preview'), remove() {} };
  context.window.electronAPI = {
    dbQuery: async (action, params) => {
      assert.equal(action, 'order.getById');
      assert.equal(params.orderType, { BK: 'bang_keo_in', B: 'bang_keo', TI: 'truc_in' }[params.id.split('-')[0]]);
      if (params.id === 'B-2') return { ok: true, rows: [] };
      if (params.id === 'TI-3') return { ok: false, error: 'timeout' };
      return { ok: true, rows: [{ id: params.id, ten_hang: 'X', so_luong: 1, don_gia_ban: 10, thanh_tien_ban: 10 }] };
    }
  };
  vm.runInContext(`selectedExportOrderIds.clear(); ['BK-1', 'B-2', 'TI-3'].forEach(id => selectedExportOrderIds.add(id));`, context);
  await context.proceedToExportPreview();
  const toast = toasts.at(-1);
  assert.equal(toast.type, 'danger');
  assert.match(toast.message, /B-2, TI-3/);
  assert.deepEqual(opened, []);
});
