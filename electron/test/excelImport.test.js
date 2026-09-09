const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const orderMath = require('../js/orderMath');

function loadImport() {
  const calls = [];
  const context = vm.createContext({ Date, orderMath, window: { electronAPI: {
    dbRun: async (sql, params) => { calls.push({ sql, params }); return { ok: true }; }
  } } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/modules/excelImport.js'), 'utf8'), context);
  return { context, calls };
}

test('Excel parses app thousands and decimal rates without changing numeric cells', () => {
  const { context: c } = loadImport();
  for (const [value, expected] of [['125,000', 125000], ['125.000', 125000], ['8.5', 8.5], ['8,5', 8.5], ['0.125', 0.125], ['1,234.50', 1234.5], ['1.234,50', 1234.5], [1.234, 1.234]]) {
    assert.equal(c.parseImportNumber(value), expected);
  }
  const date = c.parseImportDate('06/08/2026');
  assert.equal(date.getMonth(), 7);
  assert.equal(date.getDate(), 6);
});

test('simple Excel import preserves cost and VAT through SQL insert', async () => {
  const { context: c, calls } = loadImport();
  for (const type of ['bang_keo', 'truc_in']) {
    const data = c.mapSimpleImport({ 'Tên hàng': 'A', 'Tên khách hàng': 'B', 'Số lượng': 2, 'Đơn giá gốc': 100, 'Đơn giá bán': 200, 'VAT (%)': 8, 'Hoa hồng (%)': 10 }, type);
    assert.equal(data.vat, 32);
    assert.equal(data.cong_no_khach, 432);
    assert.equal(data.thanh_tien, 200);
    assert.equal(data.tien_hoa_hong, 20);
    await c.insertSimpleImport('test', data, type);
    const { sql, params } = calls.at(-1);
    assert.equal(Number([...sql.matchAll(/\$(\d+)/g)].at(-1)[1]), params.length);
    assert.deepEqual(Array.from(params.slice(-2)), [32, 8]);
    assert.ok(!params.includes(undefined));
  }
  const legacy = c.mapSimpleImport({ 'Số lượng': 2, 'Đơn giá bán': 200, VAT: 32 }, 'bang_keo');
  assert.equal(legacy.vat_percent, 8);
});

test('BKI import adds product and axis VAT and rejects report child rows', async () => {
  const { context: c, calls } = loadImport();
  const data = c.mapBangKeoInImport({ 'Tên hàng': 'A', 'Tên khách hàng': 'B', 'Số lượng': 2, 'Đơn giá gốc': 100, 'Đơn giá bán': 200, 'VAT (%)': 8, 'Loại trục': 'Trục mới', 'Tên Trục': 'Đỏ', 'Số lượng Trục': 1, 'Giá gốc Trục': 100, 'Giá bán Trục': 300, 'VAT Trục (%)': 10, 'Tiền cọc': 50 });
  assert.equal(data.vat, 32);
  assert.equal(data.truc_vat, 30);
  assert.equal(data.cong_no_khach, 712);
  await c.insertBangKeoInImport('test', data);
  const { sql, params } = calls[0];
  assert.equal(Number([...sql.matchAll(/\$(\d+)/g)].at(-1)[1]), params.length);
  assert.deepEqual(Array.from(params.slice(-4)), [32, 8, 30, 10]);
  assert.ok(!params.includes(undefined));
  assert.equal(c.isInlineAxisImportRow({ 'Tên Hàng': '↳ Trục kèm BKI: Đỏ' }), true);
  assert.equal(c.isInlineAxisImportRow({ 'Loại Trục': 'Trục kèm BKI' }), true);
  assert.equal(c.isInlineAxisImportRow({ 'Tên Hàng': 'Băng keo' }), false);
});
