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

// Đường dẫn của URL file:// (bỏ query/hash, không phân biệt hoa thường vì chạy trên Windows)
function fileUrlPath(value) {
  const parsed = new URL(String(value || ''));
  if (parsed.protocol !== 'file:') return '';
  return decodeURIComponent(parsed.pathname).replace(/\\/g, '/').toLowerCase();
}

// URL có phải chính trang index.html của ứng dụng không
function isTrustedAppUrl(url, appIndexUrl) {
  try {
    const target = fileUrlPath(url);
    const expected = fileUrlPath(appIndexUrl);
    if (!target || !expected) return false;
    const targetHost = new URL(String(url)).host.toLowerCase();
    const expectedHost = new URL(String(appIndexUrl)).host.toLowerCase();
    return targetHost === expectedHost && target === expected;
  } catch {
    return false;
  }
}

// Kiểm tra người gửi IPC: chỉ khung chính của cửa sổ chính đang hiển thị index.html
function isTrustedIpcSender({ senderWebContents, mainWebContents, senderFrame, appIndexUrl }) {
  if (!senderWebContents || !mainWebContents || senderWebContents !== mainWebContents) return false;
  if (!senderFrame || senderFrame.parent) return false;
  return isTrustedAppUrl(senderFrame.url, appIndexUrl);
}

// Các tuỳ chọn hộp thoại được phép nhận từ renderer
const ALLOWED_OPEN_PROPERTIES = new Set(['openFile', 'multiSelections']);
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

function sanitizeDialogOptions(options, kind = 'save') {
  const source = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  const result = {};

  if (typeof source.title === 'string') {
    result.title = source.title.replace(CONTROL_CHARS, ' ').slice(0, 200);
  }

  if (typeof source.defaultPath === 'string') {
    // Chỉ giữ tên tệp gợi ý, không cho renderer chỉ định thư mục
    const baseName = source.defaultPath
      .split(/[\\/]/)
      .pop()
      .replace(CONTROL_CHARS, '')
      .replace(/[<>:"|?*]/g, '_')
      .trim()
      .slice(0, 180);
    if (baseName && baseName !== '.' && baseName !== '..') result.defaultPath = baseName;
  }

  if (Array.isArray(source.filters)) {
    const filters = source.filters.slice(0, 10).map(filter => {
      const name = typeof filter?.name === 'string' ? filter.name.replace(CONTROL_CHARS, ' ').slice(0, 100) : '';
      const extensions = Array.isArray(filter?.extensions)
        ? filter.extensions.filter(ext => typeof ext === 'string' && /^(\*|[A-Za-z0-9]{1,10})$/.test(ext)).slice(0, 20)
        : [];
      return name && extensions.length ? { name, extensions } : null;
    }).filter(Boolean);
    if (filters.length) result.filters = filters;
  }

  if (kind === 'open') {
    const requested = Array.isArray(source.properties)
      ? source.properties.filter(prop => ALLOWED_OPEN_PROPERTIES.has(prop))
      : [];
    result.properties = [...new Set(['openFile', ...requested])];
  }

  return result;
}

module.exports = {
  isTrustedAppUrl,
  isTrustedIpcSender,
  normalizeLogEntry,
  sanitizeDialogOptions,
  validateExternalUrl
};
