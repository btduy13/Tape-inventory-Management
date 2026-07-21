const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_LOG_LEVELS = new Set(['debug', 'info', 'warning', 'error', 'critical']);

function validateExternalUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || ''));
  } catch {
    throw new Error('Liên kết không hợp lệ');
  }

  if (!ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('Chỉ được phép mở liên kết HTTP hoặc HTTPS');
  }
  return parsed.toString();
}

function normalizeLogEntry(level, message) {
  const normalizedLevel = String(level || '').toLowerCase();
  const safeLevel = ALLOWED_LOG_LEVELS.has(normalizedLevel) ? normalizedLevel : 'info';
  const safeMessage = String(message ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 10000);
  return { level: safeLevel, message: safeMessage };
}

module.exports = { normalizeLogEntry, validateExternalUrl };
