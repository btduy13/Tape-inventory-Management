// Mô phỏng đường đi IPC của thao tác dữ liệu: renderer gửi { action, params } (structured clone),
// tiến trình chính dựng SQL qua db/registry.js. Test dùng kết quả { action, sql, params } để kiểm tra
// cả lời gọi phía renderer lẫn câu SQL thực sự sẽ chạy.
const { buildDbAction, buildDbTransaction } = require('../../db/registry');

function toStatement(action, params, kind) {
  const built = buildDbAction(action, structuredClone(params ?? {}), kind);
  return { action: built.action, kind: built.kind, sql: built.sql, params: built.values, input: params };
}

function toTransaction(steps) {
  return buildDbTransaction(structuredClone(steps)).map((built, index) => ({
    action: built.action,
    kind: built.kind,
    sql: built.sql,
    params: built.values,
    input: steps[index].params
  }));
}

module.exports = { toStatement, toTransaction };
