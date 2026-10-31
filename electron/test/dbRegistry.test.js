const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDbAction, buildDbTransaction, listActions } = require('../db/registry');
const { INSERT_COLUMNS } = require('../db/orderColumns');

// Tham số mẫu hợp lệ cho mọi thao tác (đi qua structuredClone như IPC thật)
const SAMPLE = {
  orderType: 'bang_keo_in', id: 'BK-10-26-001', quoteOnly: true, query: 'keo', name: 'Băng keo',
  prefix: 'BG-BK-10-26', since: new Date(2026, 9, 1), period: 'week', orderId: 'BK-10-26-001',
  delivered: true, settled: false, quoteId: 'BG-BK-10-26-001', newId: 'BK-10-26-002',
  convertedAt: new Date(), deliveryDate: '2026-11-01', fileName: 'a.pdf', contentType: 'application/pdf',
  fileSize: 3, base64: 'AQID', address: 'a@b.vn'
};

function sampleParams(name) {
  const params = { ...SAMPLE };
  if (name === 'order.insert') params.values = { id: 'BK-10-26-003', ten_hang: 'X', quote_items: '[]' };
  if (name === 'order.update') params.values = { ten_hang: 'X', vat: 8, quote_items: '[]' };
  if (name.startsWith('attachment.') && name !== 'attachment.listForOrder' && name !== 'attachment.deleteForOrder' && name !== 'attachment.insert') params.id = 42;
  return structuredClone(params);
}

test('every registered action builds parameterized SQL that passes the SQL policy', () => {
  const actions = listActions();
  assert.ok(actions.length >= 30);
  for (const { name, kind } of actions) {
    const built = buildDbAction(name, sampleParams(name), kind);
    const placeholders = [...built.sql.matchAll(/\$(\d+)/g)].map(match => Number(match[1]));
    const highest = placeholders.length ? Math.max(...placeholders) : 0;
    assert.equal(highest, built.values.length, `${name}: placeholders must match values`);
    assert.doesNotMatch(built.sql, /;/, name);
  }
});

test('unknown actions and wrong channel kinds are rejected', () => {
  assert.throws(() => buildDbAction('SELECT * FROM pg_user', {}, 'read'), /Thao tác dữ liệu không hợp lệ/);
  assert.throws(() => buildDbAction('__proto__', {}, 'read'), /không hợp lệ/);
  assert.throws(() => buildDbAction('constructor', {}, 'read'), /không hợp lệ/);
  assert.throws(() => buildDbAction(undefined, {}, 'read'), /không hợp lệ/);
  assert.throws(() => buildDbAction('order.delete', sampleParams('order.delete'), 'read'), /kênh đọc/);
  assert.throws(() => buildDbAction('order.getById', sampleParams('order.getById'), 'write'), /kênh ghi/);
  assert.throws(() => buildDbAction('order.getById', ['BK-1'], 'read'), /không hợp lệ/);
});

test('table names come only from the order type enum', () => {
  for (const orderType of ['bang_keo_in_orders', 'users', "bang_keo; DROP TABLE x", '', null, 'BANG_KEO']) {
    assert.throws(() => buildDbAction('order.getById', { orderType, id: 'B-1' }, 'read'), /Loại đơn hàng/, String(orderType));
  }
  const built = buildDbAction('order.getById', { orderType: 'truc_in', id: 'TI-1' }, 'read');
  assert.equal(built.sql, 'SELECT * FROM truc_in_orders WHERE id = $1');
  assert.deepEqual(built.values, ['TI-1']);
});

test('insert/update only accept allowlisted columns and plain values', () => {
  const insert = (values, orderType = 'bang_keo') => buildDbAction('order.insert', { orderType, values }, 'write');
  const update = values => buildDbAction('order.update', { orderType: 'bang_keo', id: 'B-1', values }, 'write');
  for (const column of ['id; DROP TABLE x', 'ten_hang) VALUES (1); --', '__proto__', 'truc_vat', 'password']) {
    assert.throws(() => insert({ id: 'B-1', [column]: 1 }), /Không cho phép ghi cột/, column);
  }
  // Cột của bảng khác cũng bị từ chối (truc_vat chỉ có ở bang_keo_in_orders)
  assert.doesNotThrow(() => insert({ id: 'BK-1', truc_vat: 1 }, 'bang_keo_in'));
  assert.throws(() => insert({ ten_hang: 'thiếu id' }), /Thiếu mã đơn/);
  assert.throws(() => insert({}), /Không có dữ liệu/);
  for (const column of ['id', 'thoi_gian', 'is_quote', 'da_giao', 'da_tat_toan', 'da_gui_email']) {
    assert.throws(() => update({ [column]: 'x' }), /Không cho phép ghi cột/, column);
  }
  assert.throws(() => update({ ten_hang: { toString: () => 'x' } }), /không hợp lệ/);
  assert.throws(() => update({ ten_hang: ['x'] }), /không hợp lệ/);
  assert.throws(() => update({ vat: Infinity }), /không hợp lệ/);
  assert.throws(() => update({ quote_items: 'not json' }), /JSON/);
  assert.throws(() => update({ quote_items: '{"a":1}' }), /danh sách/);
  assert.throws(() => update({ ten_hang: 'x'.repeat(10001) }), /quá dài/);

  const built = update({ ten_hang: 'A', vat: 8, ngay_du_kien: '2026-10-12', ctv: undefined });
  assert.equal(built.sql, 'UPDATE bang_keo_orders SET ten_hang = $1, vat = $2, ngay_du_kien = $3, ctv = $4 WHERE id = $5');
  assert.deepEqual(built.values, ['A', 8, '2026-10-12', null, 'B-1']);
  const quote = buildDbAction('order.update', { orderType: 'truc_in', id: 'BG-TI-1', values: { ten_hang: 'A' }, quoteOnly: true }, 'write');
  assert.match(quote.sql, /WHERE id = \$2 AND is_quote = TRUE$/);

  const inserted = insert({ id: 'B-1', thoi_gian: new Date(0), ten_hang: "O'Reilly", quote_items: '[]' });
  assert.equal(inserted.sql, 'INSERT INTO bang_keo_orders (id, thoi_gian, ten_hang, quote_items) VALUES ($1, $2, $3, $4)');
  assert.equal(inserted.values[2], "O'Reilly");
});

test('insert column allowlists cover exactly the three order tables', () => {
  assert.deepEqual(Object.keys(INSERT_COLUMNS).sort(), ['bang_keo_in_orders', 'bang_keo_orders', 'truc_in_orders']);
  for (const columns of Object.values(INSERT_COLUMNS)) {
    for (const column of columns) assert.match(column, /^[a-z_]+$/);
  }
});

test('scalar parameters are validated', () => {
  assert.throws(() => buildDbAction('order.getById', { orderType: 'bang_keo', id: 'x'.repeat(65) }, 'read'), /quá dài/);
  assert.throws(() => buildDbAction('order.getById', { orderType: 'bang_keo', id: 'B-1\u0000' }, 'read'), /ký tự/);
  assert.throws(() => buildDbAction('order.getById', { orderType: 'bang_keo', id: 5 }, 'read'), /chuỗi/);
  assert.throws(() => buildDbAction('order.listIdsByPrefix', { orderType: 'bang_keo', prefix: '%' }, 'read'), /Tiền tố/);
  assert.throws(() => buildDbAction('dashboard.salesTrend', { period: "day'); DROP", since: new Date() }, 'read'), /chu kỳ/);
  assert.throws(() => buildDbAction('dashboard.monthMetrics', { since: 'yesterday' }, 'read'), /mốc thời gian/);
  assert.throws(() => buildDbAction('attachment.getData', { id: '1 OR 1=1' }, 'read'), /mã tệp/);
  assert.throws(() => buildDbAction('attachment.getData', { id: -1 }, 'read'), /mã tệp/);
  assert.throws(() => buildDbAction('attachment.insert', { ...SAMPLE, base64: 'not base64!' }, 'write'), /base64/);
  assert.throws(() => buildDbAction('order.setDeliveryAndSettlement', { orderType: 'bang_keo', id: 'B-1', delivered: 'true', settled: false }, 'write'), /đúng\/sai/);
  assert.throws(() => buildDbAction('quote.convertToOrder', { ...SAMPLE, deliveryDate: 'tomorrow' }, 'write'), /ngày giao/);
  assert.throws(() => buildDbAction('emailHistory.insert', { address: 'no-at-sign' }, 'write'), /email/);
  const prefix = buildDbAction('order.listIdsByPrefix', { orderType: 'bang_keo', prefix: 'BG-B-10-26' }, 'read');
  assert.deepEqual(prefix.values, ['BG-B-10-26-%']);
  const suggest = buildDbAction('order.suggestNames', { orderType: 'bang_keo', query: 'a' }, 'read');
  assert.deepEqual(suggest.values, ['%a%']);
  assert.equal(buildDbAction('attachment.getData', { id: '9007199254740993' }, 'read').values[0], '9007199254740993');
});

test('transactions accept only write actions and keep step order', () => {
  assert.throws(() => buildDbTransaction([]), /không có câu lệnh/);
  assert.throws(() => buildDbTransaction('x'), /không có câu lệnh/);
  assert.throws(() => buildDbTransaction([{ action: 'order.getById', params: { orderType: 'bang_keo', id: 'B-1' } }]), /kênh ghi/);
  assert.throws(() => buildDbTransaction([{ sql: 'DELETE FROM bang_keo_orders WHERE id = $1', params: ['B-1'] }]), /không hợp lệ/);
  assert.throws(() => buildDbTransaction(Array.from({ length: 5001 }, () => ({ action: 'order.delete', params: { orderType: 'bang_keo', id: 'B-1' } }))), /5000/);
  const steps = buildDbTransaction([
    { action: 'order.delete', params: { orderType: 'bang_keo', id: 'B-1' } },
    { action: 'attachment.deleteForOrder', params: { orderType: 'bang_keo', orderId: 'B-1' } }
  ]);
  assert.deepEqual(steps.map(step => step.action), ['order.delete', 'attachment.deleteForOrder']);
  assert.equal(steps[0].sql, 'DELETE FROM bang_keo_orders WHERE id = $1');
});
