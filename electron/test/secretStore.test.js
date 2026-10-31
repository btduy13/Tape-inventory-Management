const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PREFIX,
  decryptConfigSecrets,
  decryptValue,
  encryptConfigSecrets,
  encryptValue,
  hasPlaintextSecrets,
  isEncryptedValue
} = require('../secretStore');

// safeStorage giả: "mã hóa" có thể đảo ngược để kiểm tra luồng dữ liệu, không phải mật mã thật
function fakeSafeStorage({ available = true, failDecrypt = false } = {}) {
  return {
    isEncryptionAvailable: () => available,
    encryptString: text => Buffer.from(`enc(${text})`, 'utf8'),
    decryptString: buffer => {
      if (failDecrypt) throw new Error('DPAPI failure');
      const text = Buffer.from(buffer).toString('utf8');
      return text.slice(4, -1);
    }
  };
}

const plainConfig = {
  DATABASE_URL: 'postgresql://electron_app:secret@db.example.com:5432/postgres',
  DATABASE_SSL_CA: '-----BEGIN CERTIFICATE-----',
  EMAIL_CONFIG: { server: 'smtp.gmail.com', port: 587, username: 'u@x.vn', password: 'app-pass', sender: 'x' }
};

test('secrets are encrypted at rest and other fields stay readable', () => {
  const encrypted = encryptConfigSecrets(plainConfig, fakeSafeStorage());
  assert.ok(isEncryptedValue(encrypted.DATABASE_URL));
  assert.ok(isEncryptedValue(encrypted.EMAIL_CONFIG.password));
  assert.ok(!JSON.stringify(encrypted).includes('secret@db'));
  assert.ok(!JSON.stringify(encrypted).includes('app-pass'));
  assert.equal(encrypted.EMAIL_CONFIG.username, 'u@x.vn');
  assert.equal(encrypted.DATABASE_SSL_CA, plainConfig.DATABASE_SSL_CA);
  assert.equal(plainConfig.DATABASE_URL.startsWith('postgresql://'), true, 'input is not mutated');
  assert.equal(hasPlaintextSecrets(plainConfig), true);
  assert.equal(hasPlaintextSecrets(encrypted), false);

  const { values, errors } = decryptConfigSecrets(encrypted, fakeSafeStorage());
  assert.deepEqual(errors, []);
  assert.deepEqual(values, plainConfig);
});

test('encryption is idempotent and skips empty values', () => {
  const storage = fakeSafeStorage();
  const once = encryptValue('abc', storage);
  assert.equal(encryptValue(once, storage), once);
  assert.equal(encryptValue('', storage), '');
  assert.equal(once.startsWith(PREFIX), true);
  assert.equal(decryptValue('plain-value', storage), 'plain-value');
});

test('without OS encryption the value is kept as before instead of being lost', () => {
  const storage = fakeSafeStorage({ available: false });
  assert.equal(encryptValue('abc', storage), 'abc');
  assert.equal(encryptValue('abc', null), 'abc');
  assert.throws(() => decryptValue(`${PREFIX}AAAA`, storage), /nhập lại cấu hình/);
});

test('a config copied from another Windows account blanks the secret and reports it', () => {
  const encrypted = encryptConfigSecrets(plainConfig, fakeSafeStorage());
  const { values, errors } = decryptConfigSecrets(encrypted, fakeSafeStorage({ failDecrypt: true }));
  assert.equal(values.DATABASE_URL, '');
  assert.equal(values.EMAIL_CONFIG.password, '');
  assert.equal(errors.length, 2);
  assert.ok(errors.every(message => !message.includes('secret')));
});

test('malformed config shapes do not throw', () => {
  assert.deepEqual(decryptConfigSecrets(null, fakeSafeStorage()).values, {});
  assert.deepEqual(encryptConfigSecrets({ EMAIL_CONFIG: 'x' }, fakeSafeStorage()), { EMAIL_CONFIG: 'x' });
});
