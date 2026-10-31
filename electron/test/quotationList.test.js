const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const orderMath = require('../js/orderMath');

test('quotation list includes legacy VAT and axes alongside JSON bundle totals', async () => {
  let query;
  const rows = [
    { type: 'bang_keo_in', order_data: { id: 'old-bki', ten_hang: 'Tape', so_luong: 2, don_gia_ban: 100, thanh_tien_ban: 200, vat: 16, loai_truc: 'moi', ten_truc: 'Red', truc_so_luong: 1, truc_gia_ban: 300, truc_thanh_tien_ban: 300, truc_vat: 30 } },
    { type: 'bang_keo', order_data: { id: 'old-tape', so_luong: 2, don_gia_ban: 100, thanh_tien_ban: 200, vat: 16 } },
    { type: 'truc_in', order_data: { id: 'old-axis', so_luong: 1, don_gia_ban: 300, thanh_tien_ban: 300, vat: 30 } },
    { type: 'bang_keo_in', order_data: { id: 'bundle', so_luong: 2, don_gia_ban: 100, thanh_tien_ban: 999, vat: 999, quote_items: [{ specification: '48mm', quantity: 2, unitPrice: 100, total: 200, vat: 16, axes: [{ name: 'Red', quantity: 1, unitPrice: 300, total: 300, vat: 30 }] }] } }
  ];
  const tbody = { children: [], appendChild(row) { this.children.push(row); } };
  const context = vm.createContext({ console, orderMath,
    document: { addEventListener() {}, getElementById: () => tbody, createElement: () => ({}) },
    utils: { formatCurrency: value => String(value || 0), formatDate: () => '2026-09-09', escapeHtml: value => String(value ?? '') },
    window: { electronAPI: { dbQuery: async sql => { query = sql; return { ok: true, rows }; } } }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/modules/quotations.js'), 'utf8'), context);
  await context.loadQuotationsData();
  assert.equal((query.match(/to_jsonb\(q\)/g) || []).length, 3);
  assert.match(query, /ORDER BY thoi_gian DESC/);
  const parents = tbody.children.filter(row => row.className === 'quote-tree-parent');
  assert.equal(parents.length, 4);
  for (const [index, expected] of [546, 216, 330, 546].entries()) {
    assert.match(parents[index].innerHTML, new RegExp(`>${expected}đ</td>`));
  }
  const loaded = vm.runInContext('quotationsAllList', context);
  assert.equal(loaded[0].truc_vat, 30);
  assert.equal(loaded[0].type, 'bang_keo_in');
});

function quoteContext(overrides = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { id, value: '', disabled: false, classList: { add() {}, remove() {} }, textContent: '' });
    return elements.get(id);
  };
  const toasts = [];
  const context = vm.createContext({
    console, orderMath, setTimeout,
    document: { addEventListener() {}, getElementById: element, createElement: () => ({}) },
    utils: {
      formatCurrency: value => String(Math.round(Number(value) || 0)), formatDate: value => String(value ?? ''),
      escapeHtml: value => String(value ?? ''), showToast: (message, type) => toasts.push({ message, type }),
      confirmAction: async () => true
    },
    window: { electronAPI: {} },
    ...overrides
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/modules/bangkeoin.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/modules/quotations.js'), 'utf8'), context);
  return { context, element, toasts };
}

test('quote list text filter tolerates NULL product/customer names', () => {
  const { context, element } = quoteContext();
  const tbody = { innerHTML: '', children: [], appendChild(row) { this.children.push(row); } };
  context.document.getElementById = id => (id === 'quotes-list-tbody' ? tbody : element(id));
  element('quote-list-search').value = 'abc';
  element('quote-list-type').value = 'all';
  element('quote-list-month').value = 'all';
  vm.runInContext(`quotationsAllList = [
    { id: 'BG-1', ten_hang: null, ten_khach_hang: null, type: 'bang_keo', thoi_gian: '2026-10-01' },
    { id: 'BG-2', ten_hang: 'ABC tape', ten_khach_hang: null, type: 'bang_keo', thoi_gian: '2026-10-01' }
  ]`, context);
  assert.doesNotThrow(() => context.applyQuotesFilters());
  const parents = tbody.children.filter(row => row.className === 'quote-tree-parent');
  assert.equal(parents.length, 1);
  assert.match(parents[0].innerHTML, /BG-2/);
});

test('convert-to-order disables the button, retries duplicate ids and reports 0 updated rows', async () => {
  const transactions = [];
  let attempt = 0;
  const { context, toasts } = quoteContext();
  context.window.electronAPI = {
    dbQuery: async sql => ({ ok: true, rows: /SELECT id FROM/.test(sql) ? [{ id: 'B-10-26-999' }] : [] }),
    dbTransaction: async statements => {
      transactions.push(statements);
      attempt += 1;
      if (attempt === 1) return { ok: false, error: 'duplicate key value violates unique constraint' };
      return { ok: true, results: [{ rowCount: 0 }, { rowCount: 0 }] };
    }
  };
  const button = { disabled: false };
  let disabledDuringRun = false;
  context.utils.confirmAction = async () => { disabledDuringRun = button.disabled; return true; };
  await context.convertQuoteToOrder('BG-B-10-26-001', 'bang_keo', button);
  assert.equal(disabledDuringRun, true);
  assert.equal(button.disabled, false);
  assert.equal(transactions.length, 2);
  assert.match(transactions[0][0].sql, /UPDATE bang_keo_orders/);
  assert.match(transactions[0][1].sql, /UPDATE order_attachments/);
  // -999 rolls to -1000 numerically; the retry moves past the colliding id.
  assert.match(transactions[0][0].params[0], /^B-\d{2}-\d{2}-1000$/);
  assert.match(transactions[1][0].params[0], /^B-\d{2}-\d{2}-1001$/);
  assert.ok(toasts.some(toast => toast.type === 'danger' && /Không tìm thấy báo giá/.test(toast.message)), JSON.stringify(toasts));
  assert.ok(!toasts.some(toast => /Chuyển đơn thành công/.test(toast.message)));
});

test('quote PDF totals use rounded lines so subtotal + VAT equals the VAT-inclusive total', async () => {
  const { context, element } = quoteContext();
  element('modal-quote-pdf-preview');
  const frame = element('quote-pdf-preview-frame');
  context.utils.companyInfo = { name: 'Công ty', address: '', hotline: '' };
  await context.generateAndSaveQuotePDF('BG-BK-10-26-001', 'bang_keo_in', {
    ten_hang: 'Tape', ten_khach_hang: 'Khách', thoi_gian: '2026-10-11', tien_coc: 0,
    quote_items: [
      { specification: '48mm', quantity: 3, unitPrice: 33333, total: 99999, vat: 9999.9, axes: [{ name: 'Đỏ', quantity: 1, unitPrice: 33333.4, total: 33333.4, vat: 2666.67 }] },
      { specification: '60mm', quantity: 1, unitPrice: 100.4, total: 100.4, vat: 10.04 }
    ]
  });
  const html = frame.srcdoc;
  const money = label => Number(new RegExp(`${label}</td>\\s*<td>(\\d+)đ`).exec(html)?.[1]);
  const subtotal = money('Giá gốc \\(chưa VAT\\):');
  const vat = money('VAT \\([\\d.]+% tổng\\):');
  const total = money('Giá gồm VAT:');
  assert.equal(subtotal, 99999 + 33333 + 100);
  assert.equal(vat, 10000 + 2667 + 10);
  assert.equal(subtotal + vat, total);
  assert.match(html, /Một trăm bốn mươi sáu nghìn một trăm lẻ chín đồng chẵn/);
});

test('a new size tab copies product fields but starts with no axes and no deposit', () => {
  const { context } = quoteContext();
  const fields = context.buildNewQuoteDraftFields({
    'qc-mm': '48', 'qc-m': '100', 'so-luong': '500', 'mau-sac': 'Đỏ', 'tien-coc': '1.000.000',
    'loai-truc': 'moi', 'truc-ten': 'Viền', 'truc-so-luong': '2', 'truc-gia-goc': '30.000', 'truc-gia-ban': '50.000',
    'truc-vat': '8', 'truc-ctv': 'Thủy', 'truc-hoa-hong-percent': '5'
  });
  assert.equal(fields['qc-mm'], '48');
  assert.equal(fields['so-luong'], '500');
  assert.equal(fields['mau-sac'], 'Đỏ');
  assert.equal(fields['tien-coc'], '0');
  assert.equal(fields['loai-truc'], 'cu');
  assert.equal(fields['truc-ten'], '');
  assert.equal(fields['truc-so-luong'], '');
  assert.equal(fields['truc-gia-ban'], '0');
  assert.equal(fields['truc-ctv'], '');
  assert.equal(fields['truc-hoa-hong-percent'], '0');
  assert.equal(context.axisFromFields(fields), null);
  // Tabs of other quote types have no axis fields: none are invented.
  const plain = context.buildNewQuoteDraftFields({ 'quy-cach': '48mm x 100y', 'so-luong': '3' });
  assert.deepEqual(Object.keys(plain).sort(), ['quy-cach', 'so-luong']);
  const source = fs.readFileSync(path.join(__dirname, '../js/modules/quotations.js'), 'utf8');
  assert.match(source, /fields: buildNewQuoteDraftFields\(current\.fields\),\s*savedAxes: \[\]/);
});

test('quote month filter is year-aware (most recent occurrence of the month)', () => {
  const { context, element } = quoteContext();
  const now = new Date(2026, 9, 11); // 11/10/2026
  assert.equal(context.quoteMonthFilterMatches('2026-10-01T05:00:00', '10', now), true);
  assert.equal(context.quoteMonthFilterMatches('2025-10-01T05:00:00', '10', now), false);
  assert.equal(context.quoteMonthFilterMatches('2025-11-15T05:00:00', '11', now), true);
  assert.equal(context.quoteMonthFilterMatches('2026-11-15T05:00:00', '11', now), false);
  assert.equal(context.quoteMonthFilterMatches('2025-11-15T05:00:00', '2025-11', now), true);
  assert.equal(context.quoteMonthFilterMatches('bad', '10', now), false);
  assert.equal(context.quoteMonthFilterMatches(null, 'all', now), true);

  const tbody = { innerHTML: '', children: [], appendChild(row) { this.children.push(row); } };
  context.document.getElementById = id => (id === 'quotes-list-tbody' ? tbody : element(id));
  element('quote-list-search').value = '';
  element('quote-list-type').value = 'all';
  const today = new Date();
  element('quote-list-month').value = String(today.getMonth() + 1);
  context.quoteRowsForTest = [
    { id: 'BG-NOW', type: 'bang_keo', thoi_gian: new Date(today.getFullYear(), today.getMonth(), 1, 9).toISOString() },
    { id: 'BG-OLD', type: 'bang_keo', thoi_gian: new Date(today.getFullYear() - 1, today.getMonth(), 1, 9).toISOString() }
  ];
  vm.runInContext('quotationsAllList = quoteRowsForTest', context);
  context.applyQuotesFilters();
  const parents = tbody.children.filter(row => row.className === 'quote-tree-parent');
  assert.equal(parents.length, 1);
  assert.match(parents[0].innerHTML, /BG-NOW/);
});

test('multi-size quotes show an aggregate price instead of one tab price', () => {
  const { context } = quoteContext();
  assert.equal(context.quoteAggregateUnitPrice(300, 4), 75);
  assert.equal(context.quoteAggregateUnitPrice(300, 0), 0);
  const items = [{ quantity: 10, unitPrice: 100, total: 1000 }, { quantity: 30, unitPrice: 200, total: 6000 }];
  const multi = context.quoteListPriceSummary({ so_luong: 30, don_gia_ban: 200 }, items);
  assert.equal(multi.multiple, true);
  assert.equal(multi.quantity, 40);
  assert.equal(multi.unitPrice, 175);
  const single = context.quoteListPriceSummary({ so_luong: 5, don_gia_ban: 99 }, [{ quantity: 5, unitPrice: 99, total: 495 }]);
  assert.deepEqual({ ...single }, { multiple: false, quantity: 5, unitPrice: 99 });

  const tbody = { innerHTML: '', children: [], appendChild(row) { this.children.push(row); } };
  context.document.getElementById = id => (id === 'quotes-list-tbody' ? tbody : { value: '' });
  context.renderQuotationsTable([{ id: 'BG-M', type: 'bang_keo', so_luong: 40, don_gia_ban: 200, quote_items: items.map(item => ({ ...item, specification: 'x' })) }]);
  const parent = tbody.children.find(row => row.className === 'quote-tree-parent');
  assert.match(parent.innerHTML, /Nhiều kích thước/);
  assert.match(parent.innerHTML, /TB 175đ/);
  assert.doesNotMatch(parent.innerHTML, />200đ<\/td>/);
  assert.match(parent.innerHTML, /data-quote-list-action="delete"/);
});

test('quote edit never overwrites the original creation time', () => {
  const { context } = quoteContext();
  const columns = vm.runInContext('quoteUpdateColumns', context);
  for (const list of Object.values(columns)) assert.ok(!list.includes('thoi_gian'));
});

test('quote conversion sends client-local creation time and tomorrow as parameters', async () => {
  const { validateRendererSql } = require('../dbPolicy');
  const transactions = [];
  const { context } = quoteContext();
  context.utils.tomorrowDateInputValue = () => '2026-10-12';
  context.window.electronAPI = {
    dbQuery: async () => ({ ok: true, rows: [] }),
    dbTransaction: async statements => { transactions.push(statements); return { ok: true, results: [{ rowCount: 1 }, { rowCount: 0 }] }; }
  };
  context.switchTab = async () => {};
  await context.convertQuoteToOrder('BG-1', 'bang_keo');
  const [update] = transactions[0];
  assert.match(update.sql, /thoi_gian = \$3/);
  assert.match(update.sql, /ngay_du_kien = \$4/);
  assert.equal(Object.prototype.toString.call(update.params[2]), '[object Date]');
  assert.equal(update.params[3], '2026-10-12');
  for (const statement of transactions[0]) assert.doesNotThrow(() => validateRendererSql(statement.sql, ['INSERT', 'UPDATE', 'DELETE']));
});

test('deleting a quote removes it and its attachments in one guarded transaction', async () => {
  const { validateRendererSql } = require('../dbPolicy');
  const transactions = [];
  let reloads = 0;
  const { context, toasts } = quoteContext();
  let confirmOptions;
  context.utils.confirmAction = async (message, options) => { confirmOptions = options; return true; };
  context.window.electronAPI = {
    dbQuery: async () => { reloads += 1; return { ok: true, rows: [] }; },
    dbTransaction: async statements => { transactions.push(statements); return { ok: true, results: [{ rowCount: 2 }, { rowCount: 1 }] }; }
  };
  const button = { disabled: false };
  await context.deleteQuote('BG-TI-10-26-001', 'truc_in', button);
  assert.equal(confirmOptions.danger, true);
  assert.equal(transactions.length, 1);
  const [attachments, quote] = transactions[0];
  assert.match(attachments.sql, /DELETE FROM order_attachments/);
  assert.match(attachments.sql, /is_quote = TRUE/);
  assert.deepEqual(Array.from(attachments.params), ['BG-TI-10-26-001', 'truc_in']);
  assert.match(quote.sql, /^DELETE FROM truc_in_orders WHERE id = \$1 AND is_quote = TRUE$/);
  for (const statement of transactions[0]) assert.doesNotThrow(() => validateRendererSql(statement.sql, ['INSERT', 'UPDATE', 'DELETE']));
  assert.equal(button.disabled, false);
  assert.equal(reloads, 1);
  assert.ok(toasts.some(toast => toast.type === 'success' && /Đã xóa báo giá/.test(toast.message)));

  // Converted (no longer a quote) -> 0 rows: report it, no success toast.
  toasts.length = 0;
  context.window.electronAPI.dbTransaction = async () => ({ ok: true, results: [{ rowCount: 0 }, { rowCount: 0 }] });
  await context.deleteQuote('B-10-26-001', 'bang_keo');
  assert.ok(toasts.some(toast => toast.type === 'danger' && /Không tìm thấy báo giá/.test(toast.message)));
  assert.ok(!toasts.some(toast => toast.type === 'success'));

  // Cancelled confirmation -> nothing is sent.
  context.utils.confirmAction = async () => false;
  const before = transactions.length;
  await context.deleteQuote('BG-X', 'bang_keo');
  assert.equal(transactions.length, before);
});

test('quote PDF carries the company logo; the preview swaps in a resolvable source', async () => {
  const { context, element } = quoteContext();
  element('modal-quote-pdf-preview');
  const frame = element('quote-pdf-preview-frame');
  context.utils.companyInfo = { name: 'Công ty', logoUrl: 'assets/logo.png' };
  await context.generateAndSaveQuotePDF('BG-1', 'bang_keo', { ten_hang: 'Tape', quote_items: [{ specification: 'x', quantity: 1, unitPrice: 10, total: 10 }] });
  const pdfHtml = vm.runInContext('quotePdfPreviewState.htmlContent', context);
  // printToPdf HTML keeps the relative path (main.js adds <base> to the app folder).
  assert.match(pdfHtml, /<img class="company-logo" src="assets\/logo\.png"/);
  context.openQuotePdfPreview('BG-1', pdfHtml, 'data:image/png;base64,AAAA');
  assert.match(frame.srcdoc, /src="data:image\/png;base64,AAAA"/);
  assert.doesNotMatch(frame.srcdoc, /src="assets\/logo\.png"/);
  context.openQuotePdfPreview('BG-1', pdfHtml, 'file:///D:/Tools%20&%20Soft/assets/logo.png');
  assert.match(frame.srcdoc, /src="file:\/\/\/D:\/Tools%20&amp;%20Soft\/assets\/logo\.png"/);
});
