// Tệp cấu hình di động mã hóa bằng mật khẩu (scrypt + AES-256-GCM, định dạng v2)
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  FORMAT,
  VERSION,
  DEFAULT_SCRYPT,
  decryptPortableConfig,
  encryptPortableConfig,
  isEncryptedPortableConfig,
  validatePassphrase
} = require('../portableConfigCrypto');

const SAMPLE = {
  DATABASE_URL: 'postgresql://electron_app.ref:secret-pw@pooler.example.com:5432/postgres?sslmode=require',
  EMAIL_CONFIG: { server: 'smtp.example.com', port: 587, username: 'u@example.com', password: 'smtp-secret', sender: 'X <u@example.com>' }
};
const PASS = 'correct horse battery';
const FAST = { scrypt: { N: 2 ** 14, r: 8, p: 1 } };

test('round trip with the default scrypt cost restores the exact config', async () => {
  const envelope = await encryptPortableConfig(SAMPLE, PASS);
  assert.equal(envelope.format, FORMAT);
  assert.equal(envelope.version, VERSION);
  assert.equal(envelope.kdf.name, 'scrypt');
  assert.equal(envelope.kdf.N, DEFAULT_SCRYPT.N);
  assert.equal(envelope.cipher.name, 'aes-256-gcm');
  assert.deepEqual(await decryptPortableConfig(envelope, PASS), SAMPLE);
  // survives JSON serialization (what is written to disk)
  assert.deepEqual(await decryptPortableConfig(JSON.parse(JSON.stringify(envelope)), PASS), SAMPLE);
});

test('the file contains no plaintext secret and uses fresh salt/iv each time', async () => {
  const a = await encryptPortableConfig(SAMPLE, PASS, FAST);
  const b = await encryptPortableConfig(SAMPLE, PASS, FAST);
  const text = JSON.stringify(a);
  for (const secret of ['secret-pw', 'smtp-secret', 'postgresql://', 'DATABASE_URL', 'u@example.com']) {
    assert.ok(!text.includes(secret), secret);
  }
  assert.notEqual(a.kdf.salt, b.kdf.salt);
  assert.notEqual(a.cipher.iv, b.cipher.iv);
  assert.notEqual(a.data, b.data);
});

test('wrong passphrase fails with EDECRYPT', async () => {
  const envelope = await encryptPortableConfig(SAMPLE, PASS, FAST);
  await assert.rejects(decryptPortableConfig(envelope, 'correct horse battery!'), { code: 'EDECRYPT' });
  await assert.rejects(decryptPortableConfig(envelope, ''), { code: 'EDECRYPT' });
  await assert.rejects(decryptPortableConfig(envelope, undefined), { code: 'EDECRYPT' });
});

test('any tampering is detected', async () => {
  const envelope = await encryptPortableConfig(SAMPLE, PASS, FAST);
  const flip = (b64) => {
    const buf = Buffer.from(b64, 'base64');
    buf[buf.length - 1] ^= 0x01;
    return buf.toString('base64');
  };
  const mutations = {
    data: e => { e.data = flip(e.data); },
    tag: e => { e.cipher.tag = flip(e.cipher.tag); },
    iv: e => { e.cipher.iv = flip(e.cipher.iv); },
    salt: e => { e.kdf.salt = flip(e.kdf.salt); },
    scryptN: e => { e.kdf.N = 2 ** 15; },
    scryptR: e => { e.kdf.r = 4; },
    truncated: e => { e.data = Buffer.from(e.data, 'base64').subarray(0, 5).toString('base64'); }
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    const copy = JSON.parse(JSON.stringify(envelope));
    mutate(copy);
    await assert.rejects(decryptPortableConfig(copy, PASS), { code: 'EDECRYPT' }, name);
  }
});

test('malformed or unsupported envelopes are rejected before any key derivation', async () => {
  const envelope = await encryptPortableConfig(SAMPLE, PASS, FAST);
  const cases = {
    version: [e => { e.version = 3; }, 'EVERSION'],
    cipherName: [e => { e.cipher.name = 'aes-128-cbc'; }, 'EFORMAT'],
    kdfName: [e => { e.kdf.name = 'pbkdf2'; }, 'EFORMAT'],
    hugeN: [e => { e.kdf.N = 2 ** 24; }, 'EFORMAT'],
    notPow2: [e => { e.kdf.N = 20000; }, 'EFORMAT'],
    hugeP: [e => { e.kdf.p = 64; }, 'EFORMAT'],
    shortTag: [e => { e.cipher.tag = Buffer.alloc(8).toString('base64'); }, 'EFORMAT'],
    badBase64: [e => { e.data = '!!not base64!!'; }, 'EFORMAT']
  };
  for (const [name, [mutate, code]] of Object.entries(cases)) {
    const copy = JSON.parse(JSON.stringify(envelope));
    mutate(copy);
    await assert.rejects(decryptPortableConfig(copy, PASS), { code }, name);
  }
  await assert.rejects(decryptPortableConfig(SAMPLE, PASS), { code: 'EFORMAT' });
});

test('legacy plaintext files are recognized as not encrypted', async () => {
  assert.equal(isEncryptedPortableConfig(SAMPLE), false);
  assert.equal(isEncryptedPortableConfig(null), false);
  assert.equal(isEncryptedPortableConfig([]), false);
  assert.equal(isEncryptedPortableConfig(await encryptPortableConfig(SAMPLE, PASS, FAST)), true);
});

test('export requires a passphrase of at least 10 characters', async () => {
  assert.throws(() => validatePassphrase('short'), { code: 'EPASSPHRASE' });
  assert.throws(() => validatePassphrase(12345678901), { code: 'EPASSPHRASE' });
  assert.throws(() => validatePassphrase('x'.repeat(1025)), { code: 'EPASSPHRASE' });
  assert.equal(validatePassphrase('0123456789'), '0123456789');
  await assert.rejects(encryptPortableConfig(SAMPLE, 'short', FAST), { code: 'EPASSPHRASE' });
});

test('Unicode passphrases are normalized (NFC vs NFD give the same key)', async () => {
  const nfc = 'mật khẩu Băng Keo'.normalize('NFC');
  const nfd = nfc.normalize('NFD');
  assert.notEqual(nfc, nfd);
  const envelope = await encryptPortableConfig(SAMPLE, nfc, FAST);
  assert.deepEqual(await decryptPortableConfig(envelope, nfd), SAMPLE);
});
