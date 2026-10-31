// Kiểm tra tĩnh cấu hình bảo mật của tiến trình chính / preload (không cần chạy Electron)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const preloadSource = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
const pkg = require('../package.json');

function windowPreferences(marker) {
  const start = mainSource.indexOf(marker);
  assert.ok(start >= 0, marker);
  const block = mainSource.slice(start, mainSource.indexOf('});', start));
  return block;
}

test('every BrowserWindow keeps isolation, sandbox and no Node integration', () => {
  for (const marker of ['mainWindow = new BrowserWindow({', 'pdfWindow = new BrowserWindow({']) {
    const prefs = windowPreferences(marker);
    assert.match(prefs, /nodeIntegration: false/, marker);
    assert.match(prefs, /contextIsolation: true/, marker);
    assert.match(prefs, /sandbox: true/, marker);
    assert.match(prefs, /webSecurity: true/, marker);
    assert.doesNotMatch(prefs, /webviewTag: true|nodeIntegrationInSubFrames: true|allowRunningInsecureContent: true/, marker);
  }
  assert.match(windowPreferences('mainWindow = new BrowserWindow({'), /devTools: !app\.isPackaged/);
  assert.match(mainSource, /app\.enableSandbox\(\)/);
  assert.equal((mainSource.match(/new BrowserWindow\(/g) || []).length, 2, 'new windows must be reviewed here');
});

test('navigation, new windows, webviews and permissions are blocked', () => {
  assert.match(mainSource, /app\.on\('web-contents-created'[\s\S]*?setWindowOpenHandler[\s\S]*?action: 'deny'/);
  assert.match(mainSource, /will-attach-webview/);
  assert.match(mainSource, /contents\.on\('will-navigate', guardNavigation\)/);
  assert.match(mainSource, /contents\.on\('will-redirect', guardNavigation\)/);
  assert.match(mainSource, /setPermissionRequestHandler\(\(_webContents, _permission, callback\) => callback\(false\)\)/);
  assert.match(mainSource, /setPermissionCheckHandler\(\(\) => false\)/);
  assert.match(mainSource, /isAllowedRendererRequest\(details\.url, appRoot\)/);
});

test('all IPC handlers validate the sender and no raw SQL channel remains', () => {
  const rawHandles = mainSource.match(/ipcMain\.handle\(/g) || [];
  assert.equal(rawHandles.length, 1, 'only handleTrusted may call ipcMain.handle');
  assert.match(mainSource, /function handleTrusted\(channel, handler\) {\s*ipcMain\.handle\(channel, \(event, \.\.\.args\) => {\s*assertTrustedSender\(event\);/);
  assert.doesNotMatch(mainSource, /ipcMain\.on\(/);
  assert.doesNotMatch(mainSource, /'db-query'|'db-run'/);
  assert.doesNotMatch(mainSource, /validateRendererSql\(sql/);
  assert.match(mainSource, /buildDbAction\(action, params, 'read'\)/);
  assert.match(mainSource, /buildDbAction\(action, params, 'write'\)/);
  assert.match(mainSource, /buildDbTransaction\(steps\)/);
});

test('preload exposes a narrow API and never the raw ipcRenderer or SQL', () => {
  assert.match(preloadSource, /contextBridge\.exposeInMainWorld\('electronAPI'/);
  assert.doesNotMatch(preloadSource, /exposeInMainWorld\([^)]*ipcRenderer\s*\)/);
  assert.doesNotMatch(preloadSource, /ipcRenderer\.send\(|ipcRenderer\.sendSync\(/);
  assert.doesNotMatch(preloadSource, /\bsql\b/i);
  assert.match(preloadSource, /dbQuery: \(action, params\) => ipcRenderer\.invoke\('db-read'/);
  assert.match(preloadSource, /dbRun: \(action, params\) => ipcRenderer\.invoke\('db-write'/);
  // Không có kênh nào trả mật khẩu/DATABASE_URL về renderer
  assert.doesNotMatch(mainSource, /password: config\.EMAIL_CONFIG\.password[\s\S]{0,40}}\s*}\)\);/);
  assert.doesNotMatch(mainSource, /handleTrusted\('[^']*',[^\n]*config\.DATABASE_URL/);
});

test('config secrets are written through safeStorage', () => {
  assert.match(mainSource, /encryptConfigSecrets\(data, safeStorage\)/);
  assert.match(mainSource, /decryptConfigSecrets\(parsed, safeStorage\)/);
  assert.match(mainSource, /await resolveConfigSecrets\(\);\s*const configured = await ensureStartupConfiguration\(\);/);
});

test('packaged build ships the main-process action registry', () => {
  assert.ok(pkg.build.files.includes('db/**/*'));
  assert.ok(pkg.build.files.includes('secretStore.js'));
  assert.ok(pkg.build.files.includes('!config.local.json'));
});

test('electron_app DB role migration is least-privilege and limited to the five tables', () => {
  const migrationPath = path.join(root, '..', 'supabase', 'migrations', '0010_electron_role.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const code = sql.replace(/--.*$/gm, '');
  const { ALLOWED_TABLES } = require('../dbPolicy');
  for (const table of ALLOWED_TABLES) assert.ok(code.includes(`'${table}'`), table);
  assert.match(code, /nobypassrls/);
  assert.match(code, /nosuperuser/);
  assert.match(code, /nocreaterole/);
  assert.match(code, /noinherit/);
  assert.match(code, /grant select, insert, update, delete on table public\.%I to electron_app/);
  assert.doesNotMatch(code, /grant all|truncate|with grant option|\bbypassrls\b/i);
  assert.doesNotMatch(code, /password\s+'/i, 'password must be set out of band');
  assert.match(code, /revoke all on all tables in schema public from electron_app/);
  assert.match(code, /create policy electron_app_full_access on public\.%I as permissive for all to electron_app/);
  // Exactly the five tables appear in the grant loop
  const loop = /foreach t in array array\[([^\]]+)\]/.exec(code);
  assert.ok(loop);
  const tables = loop[1].match(/'([a-z_]+)'/g).map(name => name.slice(1, -1)).sort();
  assert.deepEqual(tables, [...ALLOWED_TABLES].sort());
});

test('index.html CSP blocks workers, media, plugins and remote scripts', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  for (const directive of ["script-src 'self'", "object-src 'none'", "worker-src 'none'", "media-src 'none'", "base-uri 'self'", "default-src 'self'"]) {
    assert.ok(csp.includes(directive), directive);
  }
  assert.doesNotMatch(csp, /'unsafe-eval'|script-src[^;]*'unsafe-inline'|script-src[^;]*https?:/);
});
