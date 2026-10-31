const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Trỏ config.js tới một tệp giả để không bao giờ đọc config.local.json thật
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tape-config-test-'));
const fakeConfigPath = path.join(tempDir, 'config.local.json');
fs.writeFileSync(fakeConfigPath, JSON.stringify({
  DATABASE_URL: 'postgresql://user:pass@db.example.com:5432/tape',
  EMAIL_CONFIG: { server: 'smtp.example.com', port: 'abc', username: 'u@example.com', password: 'x' }
}));
const savedEnv = { ...process.env };
for (const key of ['DATABASE_URL', 'DATABASE_SSL_CA', 'SMTP_PORT', 'SMTP_SERVER', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'SMTP_SENDER']) {
  delete process.env[key];
}
process.env.TAPE_CONFIG_PATH = fakeConfigPath;
const config = require('../config');
process.env = savedEnv;

test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

test('reads the config from TAPE_CONFIG_PATH first and tracks the source', () => {
  assert.equal(config.CONFIG_SOURCE, fakeConfigPath);
  assert.equal(config.DATABASE_URL_SOURCE, 'file');
  assert.equal(config.FILE_VALUES.DATABASE_URL, 'postgresql://user:pass@db.example.com:5432/tape');
});

test('invalid SMTP port falls back to 587 with a warning', () => {
  assert.equal(config.EMAIL_CONFIG.port, 587);
  assert.ok(config.CONFIG_WARNINGS.some(w => w.includes('SMTP')));
});

test('parseSmtpPort rejects non-numeric and out-of-range values', () => {
  assert.equal(config.parseSmtpPort(465), 465);
  assert.equal(config.parseSmtpPort('587'), 587);
  assert.equal(config.parseSmtpPort(undefined), 587);
  for (const bad of ['abc', '0', 0, '65536', -1, '25.5', '1e3', '587; rm']) {
    assert.throws(() => config.parseSmtpPort(bad), undefined, String(bad));
  }
});

test('resolveDatabaseSsl picks the right SSL mode', () => {
  const local = config.resolveDatabaseSsl('postgresql://u:p@127.0.0.1:55432/tape?sslmode=disable');
  assert.equal(local.ssl, false);
  assert.ok(!local.connectionString.includes('sslmode'));

  // Localhost without sslmode=disable keeps SSL (SSH tunnel / local pooler to Supabase).
  assert.notEqual(config.resolveDatabaseSsl('postgresql://u:p@localhost/tape').ssl, false);
  assert.equal(config.resolveDatabaseSsl('postgresql://u:p@db.example.com/tape?sslmode=disable').ssl, false);

  const withCa = config.resolveDatabaseSsl('postgresql://u:p@db.example.com/tape?sslmode=require', '-----BEGIN CERTIFICATE-----');
  assert.deepEqual(withCa.ssl, { ca: '-----BEGIN CERTIFICATE-----', rejectUnauthorized: true });
  assert.equal(withCa.insecure, false);
  assert.ok(!withCa.connectionString.includes('sslmode'));

  const legacy = config.resolveDatabaseSsl('postgresql://u:p@db.example.com/tape');
  assert.deepEqual(legacy.ssl, { rejectUnauthorized: false });
  assert.equal(legacy.insecure, true);

  assert.deepEqual(config.resolveDatabaseSsl('postgresql://u:p@db.example.com/tape?sslmode=verify-full').ssl, { rejectUnauthorized: true });
});

test('resolveSslCa accepts PEM text or a file path', () => {
  const pem = '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----';
  assert.equal(config.resolveSslCa(pem).ca, pem);
  const caPath = path.join(tempDir, 'ca.pem');
  fs.writeFileSync(caPath, pem);
  assert.equal(config.resolveSslCa(caPath).ca, pem);
  assert.equal(config.resolveSslCa('ca.pem', tempDir).ca, pem);
  const missing = config.resolveSslCa(path.join(tempDir, 'missing.pem'));
  assert.equal(missing.ca, '');
  assert.ok(missing.error);
});

test('applySecretResolver swaps in decrypted file secrets without touching env overrides', () => {
  const seen = [];
  config.applySecretResolver(value => { seen.push(value); return value ? `decrypted(${value.length})` : ''; });
  try {
    assert.ok(seen.includes('postgresql://user:pass@db.example.com:5432/tape'));
    assert.ok(seen.includes('x'));
    assert.equal(config.FILE_VALUES.DATABASE_URL, 'decrypted(47)');
    assert.equal(config.FILE_VALUES.EMAIL_CONFIG.password, 'decrypted(1)');
    if (!process.env.DATABASE_URL) assert.equal(config.DATABASE_URL, 'decrypted(47)');
    if (!process.env.SMTP_PASSWORD) assert.equal(config.EMAIL_CONFIG.password, 'decrypted(1)');
  } finally {
    config.applySecretResolver(value => value);
  }
  assert.equal(config.FILE_VALUES.DATABASE_URL, 'postgresql://user:pass@db.example.com:5432/tape');
});

test('bundled Supabase CA: loaded when present, ignored when missing, rejected when not PEM', () => {
  assert.equal(config.BUNDLED_SSL_CA_PATH, path.join(__dirname, '..', 'certs', 'supabase-ca.crt'));
  assert.deepEqual(config.loadBundledSslCa(path.join(tempDir, 'none.crt')), { ca: '', error: '' });
  const pem = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n';
  const good = path.join(tempDir, 'supabase-ca.crt');
  fs.writeFileSync(good, pem);
  assert.deepEqual(config.loadBundledSslCa(good), { ca: pem, error: '' });
  const bad = path.join(tempDir, 'bad.crt');
  fs.writeFileSync(bad, 'not a certificate');
  const result = config.loadBundledSslCa(bad);
  assert.equal(result.ca, '');
  assert.match(result.error, /PEM/);
  // Với CA đóng gói, kết nối "sslmode=require" chuyển sang xác thực chứng chỉ
  const verified = config.resolveDatabaseSsl('postgresql://u:p@aws-0-x.pooler.supabase.com:5432/postgres?sslmode=require', pem);
  assert.deepEqual(verified.ssl, { ca: pem, rejectUnauthorized: true });
  assert.equal(verified.insecure, false);
});

test('without any CA (env, file or bundled) the legacy unverified mode stays and is flagged insecure', () => {
  // Test config file has no DATABASE_SSL_CA; the repo ships no certs/supabase-ca.crt by default
  if (fs.existsSync(config.BUNDLED_SSL_CA_PATH)) {
    assert.equal(config.DATABASE_SSL_CA_SOURCE, 'bundled');
    return;
  }
  assert.equal(config.DATABASE_SSL_CA, '');
  assert.equal(config.DATABASE_SSL_CA_SOURCE, '');
  assert.equal(config.resolveDatabaseSsl(config.DATABASE_URL, config.DATABASE_SSL_CA).insecure, true);
  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  assert.match(mainSource, /if \(sslSettings\.insecure && !insecureSslWarned\)[\s\S]{0,200}writeLogToFile\('warning'/);
});
