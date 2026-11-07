const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const orderMath = require('../js/orderMath');
const { toStatement, toTransaction } = require('./helpers/ipcDb');
const utils = require('../js/utils');

function loadImport() {
  const calls = [];
  const context = vm.createContext({ Date, orderMath, utils, window: { electronAPI: {
    dbRun: async (action, params) => { calls.push(toStatement(action, params, 'write')); return { ok: true }; }
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
    const statement = c.buildSimpleImportStatement('test', data, type);
    const { sql, params } = toStatement(statement.action, statement.params, 'write');
    assert.equal(Number([...sql.matchAll(/\$(\d+)/g)].at(-1)[1]), params.length);
    assert.deepEqual(Array.from(params.slice(-2)), [32, 8]);
    assert.ok(!params.includes(undefined));
  }
  const legacy = c.mapSimpleImport({ 'Số lượng': 2, 'Đơn giá bán': 200, VAT: 32 }, 'bang_keo');
  assert.equal(legacy.vat_percent, 8);
});

test('BKI import adds product and axis VAT and rejects report child rows', async () => {
  const { context: c, calls } = loadImport();
  const data = c.mapBangKeoInImport({ 'Tên hàng': 'A', 'Tên khách hàng': 'B', 'Số lượng': 2, 'Đơn giá vốn': 600, 'Quy cách (m)': 90, 'Cuộn/Cây': 6, 'Đơn giá bán': 200, 'VAT (%)': 8, 'Loại trục': 'Trục mới', 'Tên Trục': 'Đỏ', 'Số lượng Trục': 1, 'Giá gốc Trục': 100, 'Giá bán Trục': 300, 'VAT Trục (%)': 10, 'Tiền cọc': 50 });
  assert.equal(data.vat, 32);
  assert.equal(data.truc_vat, 30);
  assert.equal(data.cong_no_khach, 712);
  const statement = c.buildBangKeoInImportStatement('test', data);
  const { sql, params } = toStatement(statement.action, statement.params, 'write');
  assert.equal(Number([...sql.matchAll(/\$(\d+)/g)].at(-1)[1]), params.length);
  assert.deepEqual(Array.from(params.slice(-4)), [32, 8, 30, 10]);
  assert.ok(!params.includes(undefined));
  assert.equal(c.isInlineAxisImportRow({ 'Tên Hàng': '↳ Trục kèm BKI: Đỏ' }), true);
  assert.equal(c.isInlineAxisImportRow({ 'Loại Trục': 'Trục kèm BKI' }), true);
  assert.equal(c.isInlineAxisImportRow({ 'Tên Hàng': 'Băng keo' }), false);
});

test('Excel dates: overflow or unparseable values return null instead of tomorrow', () => {
  const { context: c } = loadImport();
  for (const value of ['31/02/2026', '30/02/2026', '32/01/2026', '15/13/2026', '2026-02-31', 'abc', 'ngày mai', -5, new Date('x')]) {
    assert.equal(c.parseImportDate(value), null, String(value));
  }
  const leap = c.parseImportDate('29/02/2028');
  assert.equal(leap.getFullYear(), 2028);
  assert.equal(leap.getMonth(), 1);
  assert.equal(leap.getDate(), 29);
  const iso = c.parseImportDate('2026-09-09');
  assert.deepEqual([iso.getFullYear(), iso.getMonth(), iso.getDate()], [2026, 8, 9]);
  const shortYear = c.parseImportDate('6/8/26');
  assert.deepEqual([shortYear.getFullYear(), shortYear.getMonth(), shortYear.getDate()], [2026, 7, 6]);
  // Ô trống vẫn mặc định ngày mai theo giờ local
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const empty = c.parseImportDate('');
  assert.equal(empty.getDate(), tomorrow.getDate());
});

test('Excel validation flags invalid dates, negative amounts and out-of-range percents', () => {
  const { context: c } = loadImport();
  const base = { 'Tên hàng': 'A', 'Tên khách hàng': 'B', 'Ngày dự kiến': '10/10/2026', 'Số lượng': 2, 'Đơn giá gốc': 100, 'Đơn giá bán': 200 };
  assert.deepEqual(Array.from(c.validateImportData(c.mapSimpleImport(base, 'bang_keo'), 2)), []);

  const badDate = c.validateImportData(c.mapSimpleImport({ ...base, 'Ngày dự kiến': '31/02/2026' }, 'bang_keo'), 3);
  assert.ok(badDate.some(e => e.startsWith('Dòng 3:') && e.includes('Ngày dự kiến')), badDate.join('|'));

  const negShip = c.validateImportData(c.mapSimpleImport({ ...base, 'Tiền ship': -10 }, 'truc_in'), 4);
  assert.ok(negShip.some(e => e.includes('Tiền ship không được âm')), negShip.join('|'));

  const negQty = c.validateImportData(c.mapSimpleImport({ ...base, 'Số lượng': -2 }, 'bang_keo'), 5);
  assert.ok(negQty.some(e => e.includes('Số lượng')), negQty.join('|'));

  const badPercent = c.validateImportData(c.mapSimpleImport({ ...base, 'Hoa hồng (%)': -5, 'VAT (%)': 150 }, 'bang_keo'), 6);
  assert.ok(badPercent.some(e => e.includes('Hoa hồng (%)')), badPercent.join('|'));
  assert.ok(badPercent.some(e => e.includes('VAT (%)')), badPercent.join('|'));

  const bki = { 'Tên hàng': 'A', 'Tên khách hàng': 'B', 'Ngày dự kiến': '10/10/2026', 'Số lượng': 2, 'Đơn giá vốn': 900, 'Quy cách (m)': 90, 'Cuộn/Cây': 6, 'Đơn giá bán': 200 };
  assert.deepEqual(Array.from(c.validateImportData(c.mapBangKeoInImport(bki), 2)), []);
  const negBki = c.validateImportData(c.mapBangKeoInImport({ ...bki, 'Tiền cọc': -1, 'Phí keo': -3, 'Loại trục': 'Trục mới', 'Tên Trục': 'T', 'Số lượng Trục': 1, 'Giá gốc Trục': -100, 'Giá bán Trục': 300 }), 7);
  for (const label of ['Tiền cọc', 'Phí keo', 'Giá gốc Trục']) {
    assert.ok(negBki.some(e => e.includes(`${label} không được âm`)), `${label}: ${negBki.join('|')}`);
  }
});

test('Excel Date cells a few seconds before midnight round to the nearest day', () => {
  const { context: c } = loadImport();
  // SheetJS cellDates can return 23:59:30 of the previous day for a whole-day cell.
  const date = c.parseImportDate(new Date(2026, 10, 14, 23, 59, 30));
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 10);
  assert.equal(date.getDate(), 15);
  const exact = c.parseImportDate(new Date(2026, 10, 15, 0, 0, 0));
  assert.equal(exact.getDate(), 15);
});

test('Excel validation reports text longer than the DB column per row', () => {
  const { context: c } = loadImport();
  const base = { 'Tên hàng': 'A', 'Tên khách hàng': 'B', 'Ngày dự kiến': '10/10/2026', 'Số lượng': 2, 'Đơn giá gốc': 100, 'Đơn giá bán': 200 };
  const tooLong = c.validateImportData(c.mapBangKeoInImport({ ...base, 'Màu sắc': 'X'.repeat(101) }), 4);
  assert.ok(tooLong.some(e => e.startsWith('Dòng 4:') && e.includes('mau_sac')), tooLong.join('|'));
  const fits = c.validateImportData(c.mapBangKeoInImport({ ...base, 'Màu sắc': 'X'.repeat(100) }), 4);
  assert.ok(!fits.some(e => e.includes('mau_sac')), fits.join('|'));
});

test('Excel import generates unique sequential ids within one batch', () => {
  const { context: c } = loadImport();
  assert.deepEqual(Array.from(c.buildSequentialOrderIds('BK-10-26-008', 3)), ['BK-10-26-008', 'BK-10-26-009', 'BK-10-26-010']);
  assert.deepEqual(Array.from(c.buildSequentialOrderIds('B-10-26-999', 2)), ['B-10-26-999', 'B-10-26-1000']);
  assert.throws(() => c.buildSequentialOrderIds('', 1));
});

test('Excel import is all-or-nothing through dbTransaction and cannot run twice at once', async () => {
  const transactions = [];
  const toasts = [];
  let releaseConfirm;
  const rows = [
    { 'Tên hàng': 'A', 'Tên khách hàng': 'B', 'Ngày dự kiến': '10/10/2026', 'Số lượng': 2, 'Đơn giá gốc': 100, 'Đơn giá bán': 200 },
    { 'Tên hàng': 'C', 'Tên khách hàng': 'D', 'Ngày dự kiến': '11/10/2026', 'Số lượng': 1, 'Đơn giá gốc': 50, 'Đơn giá bán': 90 }
  ];
  const context = vm.createContext({
    Date, orderMath,
    XLSX: { read: () => ({ SheetNames: ['S'], Sheets: { S: {} } }), utils: { sheet_to_json: () => rows } },
    utils: {
      tomorrowDateInputValue: () => '2026-10-11',
      showToast: (message, type) => toasts.push({ message, type }),
      confirmAction: () => new Promise(resolve => { releaseConfirm = resolve; })
    },
    getStatsOrderTypeKey: () => 'bang_keo',
    generateOrderId: async () => 'B-10-26-005',
    loadStatsData: async () => {},
    window: { electronAPI: {
      showOpenDialog: async () => ({ canceled: false, filePaths: ['x.xlsx'] }),
      readFileAsBase64: async () => ({ ok: true, data: '' }),
      dbRun: async () => { throw new Error('dbRun must not be used when dbTransaction exists'); },
      dbTransaction: async steps => { transactions.push(toTransaction(steps)); return { ok: true, results: [] }; },
      writeLog: () => {}
    } }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/modules/excelImport.js'), 'utf8'), context);
  const first = context.importOrdersFromExcel();
  await new Promise(resolve => setImmediate(resolve));
  await context.importOrdersFromExcel();
  assert.ok(toasts.some(t => t.type === 'warning' && t.message.includes('Đang nhập Excel')));
  releaseConfirm(true);
  await first;
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].length, 2);
  assert.deepEqual(Array.from(transactions[0], s => s.params[0]), ['B-10-26-005', 'B-10-26-006']);
  for (const s of transactions[0]) assert.equal(Number([...s.sql.matchAll(/\$(\d+)/g)].at(-1)[1]), s.params.length);
  assert.ok(toasts.some(t => t.type === 'success'));
});

const BKI_ROW = {
  'Tên hàng': 'BKI', 'Tên khách hàng': 'Khách', 'Ngày dự kiến': '10/10/2026',
  'Quy cách (m)': 100, 'Cuộn/Cây': 7, 'Số lượng': 333, 'Đơn giá vốn': 123457, 'Phí SL': 1111, 'Phí keo': 2222,
  'Phí màu': 3333, 'Phí size': 444, 'Phí cắt': 555, 'Đơn giá bán': 25555.5, 'Tiền cọc': 100000.4,
  'Hoa hồng (%)': 7.5, 'Tiền ship': 12345.6, 'VAT (%)': 8,
  'Loại trục': 'Trục mới', 'Tên Trục': 'T48', 'Số lượng Trục': 3, 'Giá gốc Trục': 333333.3, 'Giá bán Trục': 456789.7,
  'Hoa hồng Trục (%)': 12.5, 'VAT Trục (%)': 10
};

test('BKI import money equals the form calculation (calculatePrintedTape) and is whole đồng', () => {
  const { context: c } = loadImport();
  const data = c.mapBangKeoInImport(BKI_ROW);
  assert.deepEqual(Array.from(c.validateImportData(data, 2)), []);
  const form = orderMath.calculatePrintedTape({
    quantity: 333, baseCost: 123457, quantityFee: 1111, glueFee: 2222, colorFee: 3333, sizeFee: 444, cuttingFee: 555,
    salePrice: 25555.5, deposit: 100000.4, vatPercent: 8, commissionPercent: 7.5, shipping: 12345.6,
    rollLength: 100, rollsPerTree: 7, isNewAxis: true, axisQuantity: 3, axisCostPrice: 333333.3, axisSalePrice: 456789.7,
    axisVatPercent: 10, axisCommissionPercent: 12.5
  });
  assert.equal(data.thanh_tien_goc, form.product.costTotal);
  assert.equal(data.thanh_tien_ban, form.product.saleTotal);
  assert.equal(data.loi_nhuan, form.product.profit);
  assert.equal(data.tien_hoa_hong, form.product.commission);
  assert.equal(data.loi_nhuan_rong, form.product.netProfit);
  assert.equal(data.vat, form.vat);
  assert.equal(data.truc_thanh_tien_goc, form.axis.costTotal);
  assert.equal(data.truc_thanh_tien_ban, form.axis.saleTotal);
  assert.equal(data.truc_tien_hoa_hong, form.axis.commission);
  assert.equal(data.truc_loi_nhuan_rong, form.axis.netProfit);
  assert.equal(data.truc_vat, form.axis.vat);
  assert.equal(data.cong_no_khach, form.outstanding);
  for (const key of ['thanh_tien_goc', 'thanh_tien_ban', 'loi_nhuan', 'tien_hoa_hong', 'loi_nhuan_rong', 'tien_ship', 'tien_coc', 'vat',
    'truc_thanh_tien_goc', 'truc_thanh_tien_ban', 'truc_tien_hoa_hong', 'truc_loi_nhuan', 'truc_loi_nhuan_rong', 'truc_vat', 'cong_no_khach']) {
    assert.ok(Number.isInteger(data[key]), `${key}=${data[key]}`);
  }
  assert.equal(data.loi_nhuan_rong, data.loi_nhuan - data.tien_hoa_hong - data.tien_ship);
});

test('BKI import rejects rows the form cannot calculate and new axes without cost price', () => {
  const { context: c } = loadImport();
  const noRoll = c.validateImportData(c.mapBangKeoInImport({ ...BKI_ROW, 'Cuộn/Cây': '' }), 5);
  assert.ok(noRoll.some(e => e.startsWith('Dòng 5:') && e.includes('cuộn/cây')), noRoll.join('|'));
  const noAxisCost = c.validateImportData(c.mapBangKeoInImport({ ...BKI_ROW, 'Giá gốc Trục': '' }), 6);
  assert.ok(noAxisCost.some(e => e.startsWith('Dòng 6:') && e.includes('Giá gốc Trục')), noAxisCost.join('|'));
  // Chu vi trục là tùy chọn
  const noCircumference = c.validateImportData(c.mapBangKeoInImport({ ...BKI_ROW, 'Chu vi Trục': '' }), 7);
  assert.deepEqual(Array.from(noCircumference), []);
});

test('simple import money is whole đồng and net profit is consistent', () => {
  const { context: c } = loadImport();
  const data = c.mapSimpleImport({ 'Tên hàng': 'A', 'Tên khách hàng': 'B', 'Số lượng': 3, 'Đơn giá gốc': 1000.3, 'Đơn giá bán': 2000.7, 'VAT (%)': 8, 'Hoa hồng (%)': 7.5, 'Tiền ship': 99.6 }, 'bang_keo');
  for (const key of ['thanh_tien_goc', 'thanh_tien_ban', 'loi_nhuan', 'tien_hoa_hong', 'loi_nhuan_rong', 'tien_ship', 'vat', 'cong_no_khach']) {
    assert.ok(Number.isInteger(data[key]), `${key}=${data[key]}`);
  }
  assert.equal(data.vat, orderMath.vatAmount(data.thanh_tien_ban, 8));
  assert.equal(data.loi_nhuan_rong, data.loi_nhuan - data.tien_hoa_hong - data.tien_ship);
});

test('Excel booleans accept values the app exports', () => {
  const { context: c } = loadImport();
  for (const value of ['Rồi', 'rồi', 'Xong', 'Rồi/Xong', 'Đã giao', 'Đã tất toán', 'Có', 'có', 'x', 'TRUE', 1, true]) {
    assert.equal(c.parseImportBoolean(value), true, String(value));
  }
  for (const value of ['Chưa', 'Không', '', null, undefined, 0, false, 'Chưa giao']) {
    assert.equal(c.parseImportBoolean(value), false, String(value));
  }
});
