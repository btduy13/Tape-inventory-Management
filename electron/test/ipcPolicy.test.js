const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const {
  isAllowedRendererRequest,
  isTrustedAppUrl,
  isTrustedIpcSender,
  sanitizeDialogOptions,
  validateExternalUrl
} = require('../ipcPolicy');

const indexUrl = pathToFileURL(path.join(__dirname, '..', 'index.html')).toString();

test('trusts only the app index.html file URL', () => {
  assert.equal(isTrustedAppUrl(indexUrl, indexUrl), true);
  assert.equal(isTrustedAppUrl(`${indexUrl}#stats`, indexUrl), true);
  assert.equal(isTrustedAppUrl(indexUrl.toUpperCase().replace('FILE:', 'file:'), indexUrl), true);
  assert.equal(isTrustedAppUrl(pathToFileURL(path.join(__dirname, 'evil.html')).toString(), indexUrl), false);
  assert.equal(isTrustedAppUrl('https://example.com/index.html', indexUrl), false);
  assert.equal(isTrustedAppUrl('data:text/html,hi', indexUrl), false);
  assert.equal(isTrustedAppUrl('not a url', indexUrl), false);
});

test('IPC sender must be the main frame of the main window', () => {
  const main = {};
  const topFrame = { url: indexUrl, parent: null };
  assert.equal(isTrustedIpcSender({ senderWebContents: main, mainWebContents: main, senderFrame: topFrame, appIndexUrl: indexUrl }), true);
  assert.equal(isTrustedIpcSender({ senderWebContents: {}, mainWebContents: main, senderFrame: topFrame, appIndexUrl: indexUrl }), false);
  assert.equal(isTrustedIpcSender({ senderWebContents: main, mainWebContents: main, senderFrame: { url: indexUrl, parent: topFrame }, appIndexUrl: indexUrl }), false);
  assert.equal(isTrustedIpcSender({ senderWebContents: main, mainWebContents: main, senderFrame: null, appIndexUrl: indexUrl }), false);
  assert.equal(isTrustedIpcSender({ senderWebContents: main, mainWebContents: null, senderFrame: topFrame, appIndexUrl: indexUrl }), false);
  assert.equal(isTrustedIpcSender({ senderWebContents: main, mainWebContents: main, senderFrame: { url: 'https://evil.example', parent: null }, appIndexUrl: indexUrl }), false);
});

test('dialog options are whitelisted', () => {
  const save = sanitizeDialogOptions({
    title: 'Lưu file\r\n',
    defaultPath: 'C:\\Windows\\System32\\bao_gia.pdf',
    filters: [{ name: 'PDF Files', extensions: ['pdf', '../x', ''] }, { name: 'bad', extensions: [] }],
    properties: ['openDirectory'],
    securityScopedBookmarks: true,
    buttonLabel: 'x'
  }, 'save');
  assert.deepEqual(save, {
    title: 'Lưu file  ',
    defaultPath: 'bao_gia.pdf',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  const open = sanitizeDialogOptions({ title: 'Chọn', properties: ['multiSelections', 'openDirectory', 'showHiddenFiles'] }, 'open');
  assert.deepEqual(open, { title: 'Chọn', properties: ['openFile', 'multiSelections'] });
  assert.deepEqual(sanitizeDialogOptions(null, 'open'), { properties: ['openFile'] });
  assert.deepEqual(sanitizeDialogOptions('x', 'save'), {});
});

test('external URLs must be HTTPS links on the allowlist', () => {
  const release = 'https://github.com/btduy13/Tape-inventory-Management/releases/latest';
  assert.equal(validateExternalUrl(release), release);
  assert.equal(validateExternalUrl('https://GITHUB.com/btduy13/Tape-inventory-Management'), 'https://github.com/btduy13/Tape-inventory-Management');
  for (const bad of [
    'https://example.com/a',
    'http://github.com/btduy13/Tape-inventory-Management',
    'https://github.com/btduy13/Tape-inventory-Management-evil/x',
    'https://github.com.evil.example/btduy13/Tape-inventory-Management',
    'https://user:pass@github.com/btduy13/Tape-inventory-Management',
    'https://github.com/other/repo',
    'file:///C:/Windows/system32/calc.exe',
    'javascript:alert(1)',
    'ms-settings:',
    'not a url'
  ]) {
    assert.throws(() => validateExternalUrl(bad), undefined, bad);
  }
  assert.equal(validateExternalUrl('https://docs.example.com/x', [{ host: 'docs.example.com', pathPrefix: '/x' }]), 'https://docs.example.com/x');
});

test('main window may only load app files, data/blob URLs and Google Fonts', () => {
  const appRoot = path.join(__dirname, '..');
  const ok = url => isAllowedRendererRequest(url, appRoot);
  assert.equal(ok(indexUrl), true);
  assert.equal(ok(pathToFileURL(path.join(appRoot, 'assets', 'logo.png')).toString()), true);
  assert.equal(ok('data:image/png;base64,AAAA'), true);
  assert.equal(ok('blob:file:///abc'), true);
  assert.equal(ok('https://fonts.googleapis.com/css2?family=X'), true);
  assert.equal(ok('https://fonts.gstatic.com/s/x.woff2'), true);
  assert.equal(ok(pathToFileURL(path.join(appRoot, '..', 'secret.txt')).toString()), false);
  assert.equal(ok(`${pathToFileURL(appRoot).toString()}/../../Windows/win.ini`), false);
  assert.equal(ok('file://attacker-host/share/x.html'), false);
  assert.equal(ok('https://evil.example/collect?x=1'), false);
  assert.equal(ok('http://fonts.googleapis.com/css'), false);
  assert.equal(ok('ws://localhost:1234'), false);
  assert.equal(ok('garbage'), false);
});
