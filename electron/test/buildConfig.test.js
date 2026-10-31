// electron-builder config: không bao giờ đóng gói config.local*.json hoặc tệp .env vào bản cài đặt
const test = require('node:test');
const assert = require('node:assert/strict');
const { minimatch } = require('minimatch');

const pkg = require('../package.json');

const REQUIRED_EXCLUDES = ['!**/config.local*.json', '!**/*.env', '!**/.env', '!**/.env.*'];
const SECRET_PATHS = [
  'config.local.json',
  'config.local.example.json',
  'config.local.prod.json',
  'config.local.backup.json',
  'resources/config.local.json',
  'js/config.local.json',
  'db/nested/config.local.old.json',
  '.env',
  '.env.local',
  '.env.production',
  'prod.env',
  'js/modules/.env',
  'assets/vendor/secrets.env'
];

// Cùng cách electron-builder áp dụng mẫu (minimatch, dot: true): tệp bị loại nếu khớp một mẫu "!..."
function isExcluded(filePath, patterns) {
  return patterns
    .filter(pattern => pattern.startsWith('!'))
    .some(pattern => minimatch(filePath, pattern.slice(1), { dot: true }));
}

test('build.files excludes every config.local*.json and .env variant', () => {
  const files = pkg.build.files;
  for (const pattern of REQUIRED_EXCLUDES) assert.ok(files.includes(pattern), pattern);
  for (const filePath of SECRET_PATHS) assert.ok(isExcluded(filePath, files), filePath);
});

test('exclusions come after every include, so no include can re-add a secret file', () => {
  const files = pkg.build.files;
  const lastInclude = Math.max(...files.map((p, i) => (p.startsWith('!') ? -1 : i)));
  for (const pattern of REQUIRED_EXCLUDES) assert.ok(files.indexOf(pattern) > lastInclude, pattern);
  // Không có mẫu include nào tự nó khớp tệp bí mật (ví dụ "**/*" hoặc "*.json")
  for (const include of files.filter(p => !p.startsWith('!'))) {
    for (const filePath of ['config.local.json', '.env', 'prod.env']) {
      assert.ok(!minimatch(filePath, include, { dot: true }), `${include} matches ${filePath}`);
    }
  }
});

test('the app files still ship (excludes are not too broad)', () => {
  const files = pkg.build.files;
  for (const filePath of ['main.js', 'config.js', 'secretStore.js', 'portableConfigCrypto.js', 'prompt/passphrase.html', 'certs/supabase-ca.crt', 'js/app.js']) {
    assert.ok(!isExcluded(filePath, files), filePath);
  }
  for (const required of ['portableConfigCrypto.js', 'passphrasePrompt.js', 'prompt/**/*', 'certs/*.crt']) {
    assert.ok(files.includes(required), required);
  }
});

test('extraResources / extraFiles cannot bring config.local*.json or .env into the package', () => {
  for (const key of ['extraResources', 'extraFiles']) {
    const entries = pkg.build[key];
    if (entries === undefined) continue;
    const list = Array.isArray(entries) ? entries : [entries];
    for (const entry of list) {
      // Mỗi mục phải có filter loại trừ tệp bí mật
      const filter = typeof entry === 'string' ? [entry] : [].concat(entry.filter || ['**/*']);
      for (const filePath of SECRET_PATHS) {
        const included = filter.some(p => !p.startsWith('!') && minimatch(filePath, p, { dot: true }));
        assert.ok(!included || isExcluded(filePath, filter), `${key}: ${filePath}`);
      }
    }
  }
  assert.deepEqual(pkg.build.extraResources, []);
  assert.deepEqual(pkg.build.extraFiles, []);
});
