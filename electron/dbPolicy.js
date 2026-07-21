function validateRendererSql(sql, allowedCommands) {
  if (typeof sql !== 'string' || sql.length === 0 || sql.length > 50000) {
    throw new Error('Câu lệnh SQL không hợp lệ');
  }
  const normalized = sql.trim().replace(/;\s*$/, '');
  if (normalized.includes(';') || /(--|\/\*)/.test(normalized)) {
    throw new Error('Không cho phép nhiều câu lệnh hoặc chú thích SQL');
  }
  const command = normalized.match(/^([A-Z]+)/i)?.[1]?.toUpperCase();
  if (!command || !allowedCommands.includes(command)) {
    throw new Error(`Không cho phép thao tác SQL ${command || 'không xác định'}`);
  }
  return normalized;
}

module.exports = { validateRendererSql };
