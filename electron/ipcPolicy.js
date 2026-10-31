const path = require('path');

const ALLOWED_LOG_LEVELS = new Set(['debug', 'info', 'warning', 'error', 'critical']);

// Chỉ mở bằng trình duyệt hệ thống các liên kết thuộc danh sách này (HTTPS, đúng host + tiền tố đường dẫn)
const EXTERNAL_URL_ALLOWLIST = Object.freeze([
  Object.freeze({ host: 'github.com', pathPrefix: '/btduy13/Tape-inventory-Management' })
]);

// Tài nguyên ngoài mà cửa sổ chính được phép tải (font Google trong index.html)
const ALLOWED_REMOTE_ORIGINS = new Set(['https://fonts.googleapis.com', 'https://fonts.gstatic.com']);

function validateExternalUrl(value, allowlist = EXTERNAL_URL_ALLOWLIST) {
  let parsed;
  try {
    parsed = new URL(String(value || ''));
  } catch {
    throw new Error('Liên kết không hợp lệ');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Chỉ được phép mở liên kết HTTPS');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Liên kết không được chứa thông tin đăng nhập');
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = allowlist.some(entry => host === entry.host && (
    parsed.pathname === entry.pathPrefix || parsed.pathname.startsWith(`${entry.pathPrefix}/`)
  ));
  if (!allowed) {
    throw new Error('Liên kết không nằm trong danh sách được phép mở');
  }
  return parsed.toString();
}

// Đường dẫn tệp cục bộ của URL file:// (Windows: bỏ dấu "/" trước ký tự ổ đĩa)
function fileUrlToLocalPath(url) {
  return decodeURIComponent(new URL(url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
}

// Yêu cầu mạng của cửa sổ chính: chỉ tệp trong thư mục ứng dụng, data:/blob: và font Google
function isAllowedRendererRequest(url, appRoot) {
  let parsed;
  try {
    parsed = new URL(String(url || ''));
  } catch {
    return false;
  }
  if (parsed.protocol === 'data:' || parsed.protocol === 'blob:' || parsed.protocol === 'devtools:') return true;
  if (parsed.protocol === 'file:') {
    if (parsed.host && parsed.host.toLowerCase() !== 'localhost') return false; // chặn đường dẫn mạng UNC (file://máy/chia-sẻ)
    try {
      const resolved = path.resolve(fileUrlToLocalPath(parsed.toString())).toLowerCase();
      const root = path.resolve(appRoot).toLowerCase();
      return resolved === root || resolved.startsWith(root + path.sep);
    } catch {
      return false;
    }
  }
  return ALLOWED_REMOTE_ORIGINS.has(parsed.origin);
}

// Giới hạn log từ renderer: mỗi dòng tối đa 4000 ký tự; chỉ xử lý tối đa 64 KiB đầu vào
const MAX_LOG_MESSAGE_CHARS = 4000;
const MAX_LOG_INPUT_CHARS = 64 * 1024;

function normalizeLogEntry(level, message) {
  const normalizedLevel = String(level || '').toLowerCase();
  const safeLevel = ALLOWED_LOG_LEVELS.has(normalizedLevel) ? normalizedLevel : 'info';
  const rawMessage = typeof message === 'string' ? message : String(message ?? '');
  const safeMessage = rawMessage
    .slice(0, MAX_LOG_INPUT_CHARS)
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, MAX_LOG_MESSAGE_CHARS);
  return { level: safeLevel, message: safeMessage };
}

// Giới hạn tốc độ ghi log từ renderer (cửa sổ cố định windowMs): tối đa maxEntries dòng và maxChars ký tự.
// Dòng vượt giới hạn bị bỏ; số dòng đã bỏ được báo một lần khi cửa sổ mới bắt đầu.
function createLogRateLimiter({ maxEntries = 120, maxChars = 200000, windowMs = 60000, now = Date.now } = {}) {
  let windowStart = now();
  let entries = 0;
  let chars = 0;
  let dropped = 0;
  return {
    // Trả về { allowed, droppedBefore }: droppedBefore > 0 khi cửa sổ trước có dòng bị bỏ
    check(messageLength) {
      const current = now();
      let droppedBefore = 0;
      if (current - windowStart >= windowMs || current < windowStart) {
        droppedBefore = dropped;
        windowStart = current;
        entries = 0;
        chars = 0;
        dropped = 0;
      }
      const length = Math.max(0, Number(messageLength) || 0);
      if (entries + 1 > maxEntries || chars + length > maxChars) {
        dropped += 1;
        return { allowed: false, droppedBefore };
      }
      entries += 1;
      chars += length;
      return { allowed: true, droppedBefore };
    }
  };
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
  EXTERNAL_URL_ALLOWLIST,
  isAllowedRendererRequest,
  isTrustedAppUrl,
  isTrustedIpcSender,
  MAX_LOG_MESSAGE_CHARS,
  createLogRateLimiter,
  normalizeLogEntry,
  sanitizeDialogOptions,
  validateExternalUrl
};
