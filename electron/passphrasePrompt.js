// Hộp thoại nhập mật khẩu cho Xuất/Nhập cấu hình (Electron không có hộp thoại nhập văn bản gốc).
// Cửa sổ riêng: sandbox, contextIsolation, không Node, preload hẹp, CSP không 'unsafe-inline'.
// IPC chỉ được chấp nhận từ khung chính của đúng cửa sổ hộp thoại đang mở và đúng trang prompt/passphrase.html.
'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const { isTrustedAppUrl, isTrustedIpcSender } = require('./ipcPolicy');

const CHANNEL = 'passphrase-prompt';
const PROMPT_DIR = path.join(__dirname, 'prompt');
const HTML_PATH = path.join(PROMPT_DIR, 'passphrase.html');
const PRELOAD_PATH = path.join(PROMPT_DIR, 'preload.js');
const HTML_URL = pathToFileURL(HTML_PATH).toString();
const MODES = new Set(['export', 'import']);
const MAX_ATTEMPTS = 5;

function createPassphrasePrompt({ BrowserWindow, ipcMain, onWebContents = () => {}, log = () => {} }) {
  let active = null;
  let registered = false;

  function isPromptSender(event) {
    return Boolean(active) && isTrustedIpcSender({
      senderWebContents: event?.sender,
      mainWebContents: active.win.isDestroyed() ? null : active.win.webContents,
      senderFrame: event?.senderFrame,
      appIndexUrl: HTML_URL
    });
  }

  function register() {
    if (registered) return;
    registered = true;
    ipcMain.handle(CHANNEL, async (event, payload) => {
      if (!isPromptSender(event)) {
        log('warning', 'Đã từ chối IPC hộp thoại mật khẩu từ nguồn không tin cậy');
        throw new Error('Yêu cầu IPC không hợp lệ');
      }
      const current = active;
      const action = payload && typeof payload === 'object' ? payload.action : '';
      if (action === 'cancel') {
        current.finish(null);
        return { ok: true };
      }
      if (action !== 'submit' || current.busy) return { ok: false, error: 'Yêu cầu không hợp lệ' };
      const passphrase = typeof payload.passphrase === 'string' ? payload.passphrase : '';
      const confirm = typeof payload.confirm === 'string' ? payload.confirm : '';
      if (current.mode === 'export' && passphrase !== confirm) {
        return { ok: false, error: 'Hai lần nhập mật khẩu không khớp' };
      }
      current.busy = true;
      try {
        let result;
        try {
          result = await current.verify(passphrase);
        } catch (error) {
          result = { ok: false, error: error.message };
        }
        if (current.done) return { ok: false, error: 'Hộp thoại đã đóng' };
        if (result && result.ok) {
          current.finish(result);
          return { ok: true };
        }
        current.attempts += 1;
        if (current.attempts >= MAX_ATTEMPTS) {
          current.finish({ ok: false, error: `Quá nhiều lần thử sai (${MAX_ATTEMPTS} lần)` });
          return { ok: false, error: 'Quá nhiều lần thử' };
        }
        return { ok: false, error: String(result?.error || 'Mật khẩu không hợp lệ') };
      } finally {
        current.busy = false;
      }
    });
  }

  // verify(passphrase) => { ok: true, value } | { ok: false, error }.
  // Kết quả: { ok: true, value } | { ok: false, canceled: true } | { ok: false, error } (quá số lần thử).
  function prompt({ parent = null, mode, verify }) {
    if (!MODES.has(mode)) return Promise.reject(new Error('Chế độ hộp thoại không hợp lệ'));
    if (active) return Promise.reject(new Error('Hộp thoại mật khẩu đang mở'));
    register();
    return new Promise((resolve) => {
      const win = new BrowserWindow({
        parent: parent && !parent.isDestroyed() ? parent : undefined,
        modal: Boolean(parent && !parent.isDestroyed()),
        width: 460,
        height: mode === 'export' ? 400 : 320,
        resizable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        autoHideMenuBar: true,
        show: false,
        title: mode === 'export' ? 'Đặt mật khẩu cho tệp cấu hình' : 'Mật khẩu tệp cấu hình',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          preload: PRELOAD_PATH,
          webSecurity: true,
          allowRunningInsecureContent: false,
          experimentalFeatures: false,
          navigateOnDragDrop: false,
          spellcheck: false,
          devTools: false
        }
      });
      win.setMenu(null);
      onWebContents(win.webContents, url => isTrustedAppUrl(url, HTML_URL));

      const state = {
        win,
        mode,
        verify,
        busy: false,
        attempts: 0,
        done: false,
        finish(result) {
          if (state.done) return;
          state.done = true;
          if (active === state) active = null;
          if (!win.isDestroyed()) win.destroy();
          if (result && result.ok) resolve({ ok: true, value: result.value });
          else if (result) resolve({ ok: false, error: result.error || 'Mật khẩu không hợp lệ' });
          else resolve({ ok: false, canceled: true });
        }
      };
      active = state;
      win.on('closed', () => state.finish(null));
      win.once('ready-to-show', () => { if (!win.isDestroyed()) win.show(); });
      win.loadFile(HTML_PATH, { query: { mode } }).catch(() => state.finish(null));
    });
  }

  return { prompt, isOpen: () => Boolean(active) };
}

module.exports = { CHANNEL, HTML_PATH, PRELOAD_PATH, createPassphrasePrompt };
