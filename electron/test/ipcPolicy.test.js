const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const {
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

test('external URLs must be http or https', () => {
  assert.equal(validateExternalUrl('https://example.com/a'), 'https://example.com/a');
  assert.throws(() => validateExternalUrl('file:///C:/Windows/system32/calc.exe'));
  assert.throws(() => validateExternalUrl('javascript:alert(1)'));
});
