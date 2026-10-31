// Hộp thoại mật khẩu Xuất/Nhập cấu hình: IPC chỉ nhận từ đúng cửa sổ hộp thoại (BrowserWindow/ipcMain giả)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { CHANNEL, HTML_PATH, createPassphrasePrompt } = require('../passphrasePrompt');

const HTML_URL = pathToFileURL(HTML_PATH).toString();

function setup() {
  const handlers = new Map();
  const windows = [];
  const ipcMain = { handle: (channel, fn) => { assert.ok(!handlers.has(channel)); handlers.set(channel, fn); } };
  class FakeWindow {
    constructor(options) {
      this.options = options;
      this.destroyed = false;
      this.listeners = {};
      const mainFrame = { parent: null, url: HTML_URL };
      this.webContents = { id: windows.length + 1, mainFrame };
      windows.push(this);
    }
    setMenu() {}
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; (this.listeners.closed || []).forEach(fn => fn()); }
    on(name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn); }
    once(name, fn) { this.on(name, fn); }
    show() {}
    loadFile(file, opts) { this.loaded = { file, opts }; return Promise.resolve(); }
  }
  const hardened = [];
  const prompt = createPassphrasePrompt({
    BrowserWindow: FakeWindow,
    ipcMain,
    onWebContents: (contents, isAllowed) => hardened.push({ contents, isAllowed }),
    log: () => {}
  });
  const invoke = (win, payload, frame = win.webContents.mainFrame) =>
    handlers.get(CHANNEL)({ sender: win.webContents, senderFrame: frame }, payload);
  return { prompt, windows, invoke, hardened, handlers };
}

test('prompt window is sandboxed, isolated and hardened', async () => {
  const { prompt, windows, hardened, invoke } = setup();
  const pending = prompt.prompt({ mode: 'import', verify: async () => ({ ok: true, value: 1 }) });
  const prefs = windows[0].options.webPreferences;
  assert.equal(prefs.nodeIntegration, false);
  assert.equal(prefs.contextIsolation, true);
  assert.equal(prefs.sandbox, true);
  assert.equal(prefs.webSecurity, true);
  assert.equal(prefs.devTools, false);
  assert.equal(windows[0].loaded.file, HTML_PATH);
  assert.deepEqual(windows[0].loaded.opts, { query: { mode: 'import' } });
  assert.equal(hardened.length, 1);
  assert.equal(hardened[0].isAllowed(HTML_URL), true);
  assert.equal(hardened[0].isAllowed('https://evil.example/'), false);
  await invoke(windows[0], { action: 'cancel' });
  assert.deepEqual(await pending, { ok: false, canceled: true });
});

test('IPC from any other webContents, subframe or page is rejected', async () => {
  const { prompt, windows, invoke } = setup();
  const pending = prompt.prompt({ mode: 'import', verify: async () => ({ ok: true, value: 'x' }) });
  const win = windows[0];
  const other = { webContents: { id: 99, mainFrame: { parent: null, url: HTML_URL } } };
  await assert.rejects(invoke(other, { action: 'submit', passphrase: 'p' }), /không hợp lệ/);
  await assert.rejects(invoke(win, { action: 'submit', passphrase: 'p' }, { parent: {}, url: HTML_URL }), /không hợp lệ/);
  const appIndex = pathToFileURL(path.join(__dirname, '..', 'index.html')).toString();
  await assert.rejects(invoke(win, { action: 'submit', passphrase: 'p' }, { parent: null, url: appIndex }), /không hợp lệ/);
  assert.deepEqual(await invoke(win, { action: 'submit', passphrase: 'p' }), { ok: true });
  assert.deepEqual(await pending, { ok: true, value: 'x' });
  // Sau khi đóng, cửa sổ cũ không gửi được nữa
  await assert.rejects(invoke(win, { action: 'cancel' }), /không hợp lệ/);
});

test('export mode requires matching confirmation and reports verify errors', async () => {
  const { prompt, windows, invoke } = setup();
  const seen = [];
  const pending = prompt.prompt({
    mode: 'export',
    verify: async (pass) => { seen.push(pass); return pass.length >= 10 ? { ok: true, value: 'sealed' } : { ok: false, error: 'too short' }; }
  });
  const win = windows[0];
  assert.deepEqual(await invoke(win, { action: 'submit', passphrase: 'aaaaaaaaaa', confirm: 'bbbbbbbbbb' }), { ok: false, error: 'Hai lần nhập mật khẩu không khớp' });
  assert.deepEqual(seen, [], 'verify not called on mismatch');
  assert.deepEqual(await invoke(win, { action: 'submit', passphrase: 'short', confirm: 'short' }), { ok: false, error: 'too short' });
  assert.deepEqual(await invoke(win, { action: 'submit', passphrase: 'long enough!', confirm: 'long enough!' }), { ok: true });
  assert.deepEqual(await pending, { ok: true, value: 'sealed' });
  assert.equal(win.isDestroyed(), true);
});

test('too many wrong attempts closes the prompt with an error', async () => {
  const { prompt, windows, invoke } = setup();
  const pending = prompt.prompt({ mode: 'import', verify: async () => ({ ok: false, error: 'wrong' }) });
  for (let i = 0; i < 4; i += 1) {
    assert.deepEqual(await invoke(windows[0], { action: 'submit', passphrase: 'x' }), { ok: false, error: 'wrong' });
  }
  await invoke(windows[0], { action: 'submit', passphrase: 'x' });
  const result = await pending;
  assert.equal(result.ok, false);
  assert.match(result.error, /Quá nhiều lần thử/);
});

test('closing the window cancels; only one prompt at a time; unknown mode rejected', async () => {
  const { prompt, windows } = setup();
  const pending = prompt.prompt({ mode: 'import', verify: async () => ({ ok: true }) });
  await assert.rejects(prompt.prompt({ mode: 'import', verify: async () => ({ ok: true }) }), /đang mở/);
  windows[0].destroy();
  assert.deepEqual(await pending, { ok: false, canceled: true });
  assert.equal(prompt.isOpen(), false);
  await assert.rejects(prompt.prompt({ mode: 'evil', verify: async () => ({ ok: true }) }), /không hợp lệ/);
});

test('prompt page has a strict CSP and the preload exposes only submit/cancel', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /style-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|https?:/);
  assert.doesNotMatch(html, /\sstyle="|<style|\son[a-z]+="/i);
  const preload = fs.readFileSync(path.join(__dirname, '..', 'prompt', 'preload.js'), 'utf8');
  assert.match(preload, /exposeInMainWorld\('passphraseAPI'/);
  assert.doesNotMatch(preload, /ipcRenderer\.send\(|ipcRenderer\.on\(|exposeInMainWorld\([^)]*ipcRenderer\s*\)/);
});

test('main.js import/export use the passphrase format and warn on legacy plaintext', () => {
  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  assert.match(mainSource, /encryptPortableConfig\(portable, passphrase\)/);
  assert.match(mainSource, /decryptPortableConfig\(fileContent, passphrase\)/);
  assert.match(mainSource, /isEncryptedPortableConfig\(fileContent\)/);
  assert.match(mainSource, /Tệp cấu hình không được mã hóa/);
  // Export không còn ghi thẳng cấu hình dạng văn bản thường
  assert.doesNotMatch(mainSource, /JSON\.stringify\(currentPortableConfig\(\)/);
  assert.match(mainSource, /if \(configFlowDepth > 0\) return;/);
});
