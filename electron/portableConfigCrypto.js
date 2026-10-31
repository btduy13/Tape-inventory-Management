// Mã hóa tệp cấu hình di động (Xuất/Nhập cấu hình) bằng mật khẩu do người dùng chọn.
// Định dạng v2: scrypt (dẫn xuất khóa) + AES-256-GCM (mã hóa có xác thực). Phần đầu tệp là AAD,
// nên sửa bất kỳ trường nào (định dạng, tham số scrypt, salt, iv, tag, dữ liệu) đều làm giải mã thất bại.
'use strict';

const crypto = require('crypto');

const FORMAT = 'bangkeo-portable-config';
const VERSION = 2;
const MIN_PASSPHRASE_LENGTH = 10;
const MAX_PASSPHRASE_LENGTH = 1024;
const DEFAULT_SCRYPT = Object.freeze({ N: 2 ** 17, r: 8, p: 1 });
// Giới hạn tham số đọc từ tệp: chặn tệp độc hại bắt máy tính scrypt với chi phí cực lớn
const SCRYPT_LIMITS = Object.freeze({ minN: 2 ** 14, maxN: 2 ** 20, maxR: 16, maxP: 4 });
const MAX_CIPHERTEXT_BYTES = 4 * 1024 * 1024;

class PortableConfigError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function validatePassphrase(passphrase) {
  if (typeof passphrase !== 'string') throw new PortableConfigError('Mật khẩu không hợp lệ', 'EPASSPHRASE');
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new PortableConfigError(`Mật khẩu phải có ít nhất ${MIN_PASSPHRASE_LENGTH} ký tự`, 'EPASSPHRASE');
  }
  if (passphrase.length > MAX_PASSPHRASE_LENGTH) throw new PortableConfigError('Mật khẩu quá dài', 'EPASSPHRASE');
  return passphrase.normalize('NFC');
}

function checkScryptParams({ N, r, p }) {
  const isPow2 = Number.isInteger(N) && N > 1 && (N & (N - 1)) === 0;
  if (!isPow2 || N < SCRYPT_LIMITS.minN || N > SCRYPT_LIMITS.maxN
    || !Number.isInteger(r) || r < 1 || r > SCRYPT_LIMITS.maxR
    || !Number.isInteger(p) || p < 1 || p > SCRYPT_LIMITS.maxP) {
    throw new PortableConfigError('Tham số mã hóa trong tệp không hợp lệ', 'EFORMAT');
  }
}

function deriveKey(passphrase, salt, { N, r, p }) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(passphrase, salt, 32, { N, r, p, maxmem: 256 * N * r + 1024 * 1024 }, (error, key) => {
      if (error) reject(error); else resolve(key);
    });
  });
}

// AAD: mọi trường của phần đầu theo thứ tự cố định (không phụ thuộc thứ tự khóa JSON)
function headerAad(envelope) {
  const { kdf, cipher } = envelope;
  return Buffer.from(JSON.stringify([
    envelope.format, envelope.version, kdf.name, kdf.N, kdf.r, kdf.p, kdf.salt, cipher.name, cipher.iv
  ]), 'utf8');
}

function decodeB64(value, expectedLength) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new PortableConfigError('Tệp cấu hình mã hóa bị hỏng', 'EFORMAT');
  }
  const buffer = Buffer.from(value, 'base64');
  if (expectedLength !== undefined && buffer.length !== expectedLength) {
    throw new PortableConfigError('Tệp cấu hình mã hóa bị hỏng', 'EFORMAT');
  }
  return buffer;
}

async function encryptPortableConfig(configObject, passphrase, { scrypt = DEFAULT_SCRYPT } = {}) {
  const secret = validatePassphrase(passphrase);
  checkScryptParams(scrypt);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const envelope = {
    format: FORMAT,
    version: VERSION,
    kdf: { name: 'scrypt', N: scrypt.N, r: scrypt.r, p: scrypt.p, salt: salt.toString('base64') },
    cipher: { name: 'aes-256-gcm', iv: iv.toString('base64'), tag: '' },
    data: ''
  };
  const key = await deriveKey(secret, salt, scrypt);
  try {
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(headerAad(envelope));
    const plaintext = Buffer.from(JSON.stringify(configObject), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    envelope.cipher.tag = cipher.getAuthTag().toString('base64');
    envelope.data = ciphertext.toString('base64');
    plaintext.fill(0);
  } finally {
    key.fill(0);
  }
  return envelope;
}

function isEncryptedPortableConfig(raw) {
  return Boolean(raw && typeof raw === 'object' && !Array.isArray(raw) && raw.format === FORMAT);
}

async function decryptPortableConfig(envelope, passphrase) {
  if (!isEncryptedPortableConfig(envelope)) throw new PortableConfigError('Tệp không phải cấu hình mã hóa', 'EFORMAT');
  if (envelope.version !== VERSION) {
    throw new PortableConfigError(`Phiên bản tệp cấu hình ${envelope.version} không được hỗ trợ`, 'EVERSION');
  }
  const { kdf, cipher } = envelope;
  if (!kdf || kdf.name !== 'scrypt' || !cipher || cipher.name !== 'aes-256-gcm' || typeof envelope.data !== 'string') {
    throw new PortableConfigError('Tệp cấu hình mã hóa bị hỏng', 'EFORMAT');
  }
  checkScryptParams(kdf);
  const salt = decodeB64(kdf.salt, 16);
  const iv = decodeB64(cipher.iv, 12);
  const tag = decodeB64(cipher.tag, 16);
  const ciphertext = decodeB64(envelope.data);
  if (ciphertext.length > MAX_CIPHERTEXT_BYTES) throw new PortableConfigError('Tệp cấu hình quá lớn', 'EFORMAT');

  const key = await deriveKey(validatePassphraseForDecrypt(passphrase), salt, kdf);
  let plaintext;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(headerAad(envelope));
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new PortableConfigError('Sai mật khẩu hoặc tệp cấu hình đã bị sửa đổi', 'EDECRYPT');
  } finally {
    key.fill(0);
  }
  try {
    return JSON.parse(plaintext.toString('utf8'));
  } finally {
    plaintext.fill(0);
  }
}

// Khi giải mã chỉ kiểm tra kiểu/độ dài tối đa (tệp cũ có thể đã dùng quy tắc độ dài khác)
function validatePassphraseForDecrypt(passphrase) {
  if (typeof passphrase !== 'string' || !passphrase || passphrase.length > MAX_PASSPHRASE_LENGTH) {
    throw new PortableConfigError('Sai mật khẩu hoặc tệp cấu hình đã bị sửa đổi', 'EDECRYPT');
  }
  return passphrase.normalize('NFC');
}

module.exports = {
  FORMAT,
  VERSION,
  MIN_PASSPHRASE_LENGTH,
  DEFAULT_SCRYPT,
  PortableConfigError,
  decryptPortableConfig,
  encryptPortableConfig,
  isEncryptedPortableConfig,
  validatePassphrase
};
