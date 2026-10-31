// SỔ ĐĂNG KÝ THAO TÁC DỮ LIỆU ĐẶT TÊN
// Renderer chỉ được gửi { action, params }. Tiến trình chính tra tên thao tác trong sổ này,
// kiểm tra tham số và tự dựng câu SQL có tham số hóa. Renderer không bao giờ gửi SQL.
const { validateRendererSql } = require('../dbPolicy');
const { paramError, plainObject } = require('./params');
const { readActions } = require('./readActions');
const { writeActions } = require('./writeActions');

const ACTIONS = new Map([
  ...Object.entries(readActions).map(([name, build]) => [name, { kind: 'read', build }]),
  ...Object.entries(writeActions).map(([name, build]) => [name, { kind: 'write', build }])
]);

const KIND_COMMANDS = Object.freeze({
  read: ['SELECT'],
  write: ['INSERT', 'UPDATE', 'DELETE']
});

const MAX_TRANSACTION_STEPS = 5000;

function actionName(value) {
  if (typeof value !== 'string' || !ACTIONS.has(value)) {
    throw paramError(`Thao tác dữ liệu không hợp lệ: ${String(value).slice(0, 64)}`);
  }
  return value;
}

// Dựng câu lệnh cho một thao tác. kind = 'read' | 'write' bắt buộc khớp loại của thao tác.
function buildDbAction(name, params, kind) {
  const action = ACTIONS.get(actionName(name));
  if (kind && action.kind !== kind) {
    throw paramError(`Thao tác ${name} không dùng được qua kênh ${kind === 'read' ? 'đọc' : 'ghi'}`);
  }
  const { sql, values } = action.build(plainObject(params));
  // Lớp phòng thủ thứ hai: SQL do chính tiến trình chính dựng vẫn phải qua bộ kiểm tra cũ
  const validatedSql = validateRendererSql(sql, KIND_COMMANDS[action.kind]);
  return { action: name, kind: action.kind, sql: validatedSql, values };
}

function buildDbTransaction(steps) {
  if (!Array.isArray(steps) || steps.length === 0) throw paramError('Transaction không có câu lệnh');
  if (steps.length > MAX_TRANSACTION_STEPS) {
    throw paramError('Quá nhiều câu lệnh trong một lần (tối đa 5000 dòng), vui lòng chia nhỏ tệp');
  }
  return steps.map(step => {
    const source = plainObject(step, 'bước transaction');
    return buildDbAction(source.action, source.params, 'write');
  });
}

function listActions() {
  return Array.from(ACTIONS, ([name, { kind }]) => ({ name, kind }));
}

module.exports = { buildDbAction, buildDbTransaction, listActions, MAX_TRANSACTION_STEPS };
