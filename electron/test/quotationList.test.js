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
