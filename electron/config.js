// CẤU HÌNH HỆ THỐNG PHẦN MỀM BĂNG KEO
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');

const DEFAULT_SMTP_PORT = 587;
const configWarnings = [];

// Cổng SMTP phải là số nguyên trong khoảng 1-65535
function parseSmtpPort(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_SMTP_PORT;
  const text = String(value).trim();
  if (!/^\d{1,5}$/.test(text)) throw new Error('Cổng SMTP phải là số nguyên từ 1 đến 65535');
  const port = Number(text);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Cổng SMTP phải là số nguyên từ 1 đến 65535');
  }
  return port;
}

function configCandidates() {
  const productName = pkg.build?.productName;
  return [
    // main.js đặt biến này = path.join(app.getPath('userData'), 'config.local.json') trước khi require config
    process.env.TAPE_CONFIG_PATH,
    process.env.APPDATA && productName ? path.join(process.env.APPDATA, productName, 'config.local.json') : '',
    process.env.APPDATA ? path.join(process.env.APPDATA, pkg.name, 'config.local.json') : '',
    path.join(__dirname, 'config.local.json'),
    process.resourcesPath ? path.join(process.resourcesPath, 'config.local.json') : '',
    path.join(path.dirname(process.execPath), 'config.local.json')
  ].filter(Boolean);
}

function loadLocalConfig() {
  for (const localPath of [...new Set(configCandidates())]) {
    if (!fs.existsSync(localPath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      return {
        data: data && typeof data === 'object' && !Array.isArray(data) ? data : {},
        source: localPath
      };
    } catch (error) {
      // Không làm sập tiến trình chính; main.js sẽ hiển thị lỗi và mời nhập lại cấu hình
      return { data: {}, source: localPath, error: `${localPath} không hợp lệ: ${error.message}` };
    }
  }

  return { data: {}, source: '', error: '' };
}

// DATABASE_SSL_CA có thể là nội dung PEM hoặc đường dẫn tới tệp PEM
function resolveSslCa(value, baseDir) {
  const raw = String(value || '').trim();
  if (!raw) return { ca: '', error: '' };
  if (raw.includes('-----BEGIN')) return { ca: raw.replace(/\\n/g, '\n'), error: '' };
  const caPath = path.isAbsolute(raw) ? raw : path.resolve(baseDir || process.cwd(), raw);
  try {
    return { ca: fs.readFileSync(caPath, 'utf8'), error: '' };
  } catch (error) {
    return { ca: '', error: `Không đọc được DATABASE_SSL_CA (${caPath}): ${error.message}` };
  }
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const SSL_URL_PARAMS = ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert', 'sslpassword', 'uselibpqcompat'];

function isLocalHost(host) {
  return LOCAL_HOSTS.has(String(host || '').replace(/^\[|\]$/g, '').toLowerCase());
}

// Quyết định cấu hình SSL cho pg.Pool từ DATABASE_URL và DATABASE_SSL_CA.
// Trả về { connectionString, ssl, insecure }: các tham số ssl* bị gỡ khỏi URL để tùy chọn ssl ở đây có hiệu lực.
function resolveDatabaseSsl(databaseUrl, ca = '') {
  let parsed = null;
  try {
    parsed = new URL(String(databaseUrl || ''));
  } catch {
    parsed = null;
  }
  if (!parsed) return { connectionString: databaseUrl, ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false }, insecure: !ca };

  const sslmode = String(parsed.searchParams.get('sslmode') || '').toLowerCase();
  for (const key of SSL_URL_PARAMS) parsed.searchParams.delete(key);
  const connectionString = parsed.toString();

  if (sslmode === 'disable') {
    return { connectionString, ssl: false, insecure: false };
  }
  if (ca) {
    return { connectionString, ssl: { ca, rejectUnauthorized: true }, insecure: false };
  }
  if (sslmode === 'verify-full' || sslmode === 'verify-ca') {
    // Người dùng yêu cầu xác thực chứng chỉ: dùng kho CA hệ thống
    return { connectionString, ssl: { rejectUnauthorized: true }, insecure: false };
  }
  // Giữ hành vi cũ (mã hóa nhưng không xác thực chứng chỉ) để không làm gián đoạn máy đang chạy
  return { connectionString, ssl: { rejectUnauthorized: false }, insecure: true };
}

const loaded = loadLocalConfig();
const local = loaded.data;
const localEmail = local.EMAIL_CONFIG && typeof local.EMAIL_CONFIG === 'object' ? local.EMAIL_CONFIG : {};
const smtpUsername = process.env.SMTP_USERNAME || localEmail.username || '';

let smtpPort = DEFAULT_SMTP_PORT;
try {
  smtpPort = parseSmtpPort(process.env.SMTP_PORT || localEmail.port);
} catch (error) {
  configWarnings.push(`${error.message}; dùng cổng mặc định ${DEFAULT_SMTP_PORT}`);
}

const sslCaInput = process.env.DATABASE_SSL_CA || local.DATABASE_SSL_CA || '';
const sslCa = resolveSslCa(
  sslCaInput,
  process.env.DATABASE_SSL_CA ? process.cwd() : (loaded.source ? path.dirname(loaded.source) : __dirname)
);
if (sslCa.error) configWarnings.push(sslCa.error);

// main.js gọi sau khi app sẵn sàng để giải mã bí mật dạng "safe:v1:..." (safeStorage) trong tệp cấu hình.
// resolve(value) trả về giá trị đã giải mã (hoặc '' nếu không giải mã được). Biến môi trường luôn được ưu tiên.
function applySecretResolver(resolve) {
  const fileDatabaseUrl = String(resolve(String(local.DATABASE_URL || '')) || '');
  const filePassword = String(resolve(String(localEmail.password || '')) || '');
  module.exports.FILE_VALUES.DATABASE_URL = fileDatabaseUrl;
  module.exports.FILE_VALUES.EMAIL_CONFIG.password = filePassword;
  if (!process.env.DATABASE_URL) module.exports.DATABASE_URL = fileDatabaseUrl;
  if (!process.env.SMTP_PASSWORD) module.exports.EMAIL_CONFIG.password = filePassword;
}

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL || local.DATABASE_URL || '',
  // 'env' | 'file' | '' — dùng để không ghi giá trị từ biến môi trường vào tệp cấu hình
  DATABASE_URL_SOURCE: process.env.DATABASE_URL ? 'env' : (local.DATABASE_URL ? 'file' : ''),
  DATABASE_SSL_CA: sslCa.ca,
  EMAIL_CONFIG: {
    server: process.env.SMTP_SERVER || localEmail.server || 'smtp.gmail.com',
    port: smtpPort,
    username: smtpUsername,
    password: process.env.SMTP_PASSWORD || localEmail.password || '',
    sender: process.env.SMTP_SENDER || localEmail.sender || (smtpUsername ? `Phần Mềm Quản Lý Đơn Hàng <${smtpUsername}>` : '')
  },
  // Giá trị đọc từ tệp cấu hình (không gồm biến môi trường)
  FILE_VALUES: {
    DATABASE_URL: String(local.DATABASE_URL || ''),
    DATABASE_SSL_CA: String(local.DATABASE_SSL_CA || ''),
    EMAIL_CONFIG: { ...localEmail }
  },
  APP_NAME: 'Quản lý Đơn hàng Băng Keo',
  APP_VERSION: pkg.version,
  CONFIG_SOURCE: loaded.source,
  CONFIG_ERROR: loaded.error || '',
  CONFIG_WARNINGS: configWarnings,
  applySecretResolver,
  isLocalHost,
  parseSmtpPort,
  resolveDatabaseSsl,
  resolveSslCa
};
