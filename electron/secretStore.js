// MÃ HÓA BÍ MẬT TRONG TỆP CẤU HÌNH BẰNG ELECTRON safeStorage (DPAPI trên Windows)
// Chỉ tiến trình chính dùng module này. DATABASE_URL và mật khẩu SMTP được lưu dạng
// "safe:v1:<base64>" trong config.local.json của userData; renderer không bao giờ nhận các giá trị này.
// Tệp xuất để chuyển máy (portable) vẫn là văn bản thường vì DPAPI gắn với tài khoản Windows hiện tại.

const PREFIX = 'safe:v1:';
const SECRET_PATHS = Object.freeze([['DATABASE_URL'], ['EMAIL_CONFIG', 'password']]);

function isEncryptedValue(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

function encryptionAvailable(safeStorage) {
  try {
    return Boolean(safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable());
  } catch {
    return false;
  }
}

function encryptValue(value, safeStorage) {
  if (typeof value !== 'string' || value === '' || isEncryptedValue(value)) return value;
  if (!encryptionAvailable(safeStorage)) return value; // không có kho khóa hệ điều hành: giữ nguyên (hành vi cũ)
  return PREFIX + Buffer.from(safeStorage.encryptString(value)).toString('base64');
}

function decryptValue(value, safeStorage) {
  if (!isEncryptedValue(value)) return value;
  if (!encryptionAvailable(safeStorage)) {
    throw new Error('Không giải mã được cấu hình bảo mật trên máy này. Hãy nhập lại cấu hình dữ liệu.');
  }
  try {
    return safeStorage.decryptString(Buffer.from(value.slice(PREFIX.length), 'base64'));
  } catch {
    throw new Error('Không giải mã được cấu hình bảo mật (tệp có thể chép từ máy/tài khoản khác). Hãy nhập lại cấu hình dữ liệu.');
  }
}

function getAt(source, keys) {
  return keys.reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), source);
}

function setAt(target, keys, value) {
  const parent = keys.slice(0, -1).reduce((node, key) => node[key], target);
  parent[keys[keys.length - 1]] = value;
}

// Sao chép sâu đối tượng cấu hình (chỉ dữ liệu JSON) rồi biến đổi các trường bí mật
function mapSecrets(config, transform) {
  const copy = JSON.parse(JSON.stringify(config && typeof config === 'object' ? config : {}));
  for (const keys of SECRET_PATHS) {
    const current = getAt(copy, keys);
    if (current === undefined || current === null) continue;
    if (keys.length > 1 && (typeof getAt(copy, keys.slice(0, -1)) !== 'object')) continue;
    setAt(copy, keys, transform(current, keys.join('.')));
  }
  return copy;
}

function encryptConfigSecrets(config, safeStorage) {
  return mapSecrets(config, value => encryptValue(value, safeStorage));
}

// Trả về { values, errors }: trường không giải mã được bị để trống và ghi lỗi (không làm sập app)
function decryptConfigSecrets(config, safeStorage) {
  const errors = [];
  const values = mapSecrets(config, (value, name) => {
    try {
      return decryptValue(value, safeStorage);
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
      return '';
    }
  });
  return { values, errors };
}

function hasPlaintextSecrets(config) {
  return SECRET_PATHS.some(keys => {
    const value = getAt(config, keys);
    return typeof value === 'string' && value !== '' && !isEncryptedValue(value);
  });
}

module.exports = {
  PREFIX,
  decryptConfigSecrets,
  decryptValue,
  encryptConfigSecrets,
  encryptValue,
  encryptionAvailable,
  hasPlaintextSecrets,
  isEncryptedValue
};
