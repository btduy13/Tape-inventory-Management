// UPDATER.JS - TỰ ĐỘNG KIỂM TRA VÀ CÀI ĐẶT BẢN CẬP NHẬT TỪ GITHUB RELEASES
const { app, dialog, BrowserWindow } = require('electron');

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MANUAL_CHECK_TIMEOUT_MS = 30000;

const UPDATE_STATES = Object.freeze({
  IDLE: 'idle',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded'
});

// Máy trạng thái thuần (không phụ thuộc Electron) để kiểm thử được.
// downloading/downloaded là trạng thái "bận": không kiểm tra/hỏi lại, không tải lần hai.
function createUpdateStateMachine() {
  let state = UPDATE_STATES.IDLE;
  let version = null;

  const isBusy = () => state === UPDATE_STATES.DOWNLOADING || state === UPDATE_STATES.DOWNLOADED;

  return {
    get state() { return state; },
    get version() { return version; },
    isBusy,
    canCheck() { return !isBusy(); },
    checking() {
      if (isBusy()) return false;
      state = UPDATE_STATES.CHECKING;
      return true;
    },
    available(nextVersion) {
      if (isBusy()) return false;
      state = UPDATE_STATES.AVAILABLE;
      version = nextVersion || null;
      return true;
    },
    notAvailable() {
      if (isBusy()) return false;
      state = UPDATE_STATES.IDLE;
      version = null;
      return true;
    },
    beginDownload() {
      if (state !== UPDATE_STATES.AVAILABLE) return false;
      state = UPDATE_STATES.DOWNLOADING;
      return true;
    },
    downloaded(nextVersion) {
      state = UPDATE_STATES.DOWNLOADED;
      if (nextVersion) version = nextVersion;
      return true;
    },
    // Trả về { wasDownloading } để biết lỗi thuộc lượt tải (cần báo UI) hay lượt kiểm tra
    error() {
      const wasDownloading = state === UPDATE_STATES.DOWNLOADING;
      if (wasDownloading) state = UPDATE_STATES.AVAILABLE; // cho phép thử tải lại
      else if (state === UPDATE_STATES.CHECKING) state = UPDATE_STATES.IDLE;
      return { wasDownloading };
    }
  };
}

const updateState = createUpdateStateMachine();
let autoUpdater = null;
let mainWindowRef = null;
let manualCheckResolve = null;
let manualCheckPromise = null;
let updaterInitialized = false;
let promptOpen = false;
let log = () => {};

function sendUpdateStatus(payload) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('update-status', payload);
  }
}

// Luôn dùng cửa sổ chính hiện tại (cửa sổ có thể đã được tạo lại sau khi đóng)
function currentDialogWindow() {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) return mainWindowRef;
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  return undefined;
}

function showUpdaterMessageBox(options) {
  const owner = currentDialogWindow();
  return owner ? dialog.showMessageBox(owner, options) : dialog.showMessageBox(options);
}

// Hiện một hộp thoại tại một thời điểm, luôn bắt lỗi để không có promise bị bỏ rơi
function showPrompt(options, onResponse) {
  if (promptOpen) return;
  promptOpen = true;
  showUpdaterMessageBox(options)
    .then(({ response }) => {
      promptOpen = false;
      onResponse(response);
    })
    .catch((err) => {
      promptOpen = false;
      log('error', 'Lỗi hiển thị hộp thoại cập nhật: ' + (err && err.message ? err.message : err));
    });
}

function startDownload() {
  if (!updateState.beginDownload()) {
    log('info', `Bỏ qua tải cập nhật (trạng thái: ${updateState.state}).`);
    return;
  }
  sendUpdateStatus({ type: 'downloading', percent: 0 });
  autoUpdater.downloadUpdate().catch((err) => {
    // Sự kiện 'error' đã báo UI; ở đây chỉ ghi log và trả trạng thái về để có thể thử lại
    log('error', 'Lỗi tải cập nhật: ' + err.message);
    updateState.error();
  });
}

function offerDownload(version) {
  showPrompt({
    type: 'info',
    title: 'Có bản cập nhật mới',
    message: `Phiên bản ${version} đã có sẵn.`,
    detail: 'Bạn có muốn tải và cài đặt ngay không?',
    buttons: ['Tải ngay', 'Để sau'],
    defaultId: 0,
    cancelId: 1
  }, (response) => {
    if (response === 0) startDownload();
  });
}

function offerInstall(version) {
  showPrompt({
    type: 'info',
    title: 'Sẵn sàng cập nhật',
    message: `Bản cập nhật v${version} đã tải xong.`,
    detail: 'Khởi động lại ứng dụng để áp dụng bản mới?\nNếu chọn "Để sau": Bản cập nhật sẽ được cài khi bạn thoát ứng dụng.',
    buttons: ['Khởi động lại', 'Để sau'],
    defaultId: 0,
    cancelId: 1
  }, (response) => {
    if (response === 0) autoUpdater.quitAndInstall(false, true);
  });
}

function settleManual(result) {
  if (manualCheckResolve) {
    const resolve = manualCheckResolve;
    manualCheckResolve = null;
    resolve(result);
  }
}

// Kiểm tra nền (khởi động/hằng ngày): không báo lỗi lên UI, bỏ qua khi đang tải/đã tải
function runBackgroundCheck(reason) {
  if (!updateState.canCheck()) {
    log('info', `Bỏ qua kiểm tra cập nhật ${reason} (trạng thái: ${updateState.state}).`);
    return;
  }
  if (promptOpen) {
    log('info', `Bỏ qua kiểm tra cập nhật ${reason} (đang hiển thị hộp thoại).`);
    return;
  }
  autoUpdater.checkForUpdates().catch((err) => {
    log('warning', `Không kiểm tra được cập nhật ${reason}: ` + err.message);
  });
}

function setupAutoUpdater(mainWindow, writeLog) {
  mainWindowRef = mainWindow;
  if (typeof writeLog === 'function') log = writeLog;

  if (!app.isPackaged) {
    log('info', 'Bỏ qua auto-update (chế độ phát triển).');
    return;
  }

  if (updaterInitialized) return;
  updaterInitialized = true;

  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = false;
  // Chỉ có tác dụng sau khi người dùng chọn "Tải ngay"; hộp thoại "Để sau" nói rõ sẽ cài khi thoát
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = {
    info: (msg) => log('info', `[updater] ${msg}`),
    warn: (msg) => log('warning', `[updater] ${msg}`),
    error: (msg) => log('error', `[updater] ${msg}`)
  };

  autoUpdater.on('checking-for-update', () => {
    if (updateState.checking()) sendUpdateStatus({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    if (!updateState.available(info.version)) return;
    sendUpdateStatus({ type: 'available', version: info.version });
    // Kiểm tra thủ công và tự động đều hiện cùng một lời mời tải
    settleManual({ ok: true, updateAvailable: true, version: info.version });
    offerDownload(info.version);
  });

  autoUpdater.on('update-not-available', () => {
    if (!updateState.notAvailable()) return;
    sendUpdateStatus({ type: 'not-available' });
    settleManual({ ok: true, updateAvailable: false });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      type: 'downloading',
      percent: Math.round(progress.percent || 0)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateState.downloaded(info.version);
    sendUpdateStatus({ type: 'downloaded', version: info.version });
    offerInstall(info.version);
  });

  autoUpdater.on('error', (err) => {
    const message = err && err.message ? err.message : String(err);
    log('error', 'Auto-update lỗi: ' + message);
    const { wasDownloading } = updateState.error();
    if (wasDownloading) {
      sendUpdateStatus({ type: 'error', message });
      return;
    }
    if (manualCheckResolve) {
      // Renderer tự hiện thông báo lỗi từ kết quả trả về
      settleManual({ ok: false, error: message });
    }
    // Lỗi kiểm tra nền: chỉ ghi log, không báo đỏ lên UI
  });

  setTimeout(() => runBackgroundCheck('lúc khởi động'), 8000);
  setInterval(() => runBackgroundCheck('định kỳ'), CHECK_INTERVAL_MS);
}

async function checkForUpdatesManual() {
  if (!app.isPackaged || !autoUpdater) {
    return { ok: false, message: 'Chế độ phát triển không kiểm tra cập nhật tự động.' };
  }

  if (updateState.state === UPDATE_STATES.DOWNLOADING) {
    return { ok: true, updateAvailable: true, downloading: true, version: updateState.version };
  }
  if (updateState.state === UPDATE_STATES.DOWNLOADED) {
    offerInstall(updateState.version);
    return { ok: true, updateAvailable: true, downloaded: true, version: updateState.version };
  }

  if (manualCheckPromise) return manualCheckPromise;

  const pending = new Promise((resolve) => {
    let settled = false;
    let timeout = null;
    // Chỉ resolve một lần dù timeout, sự kiện updater hay lỗi đến trước
    const settle = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (manualCheckResolve === settle) manualCheckResolve = null;
      resolve(result);
    };

    timeout = setTimeout(() => {
      settle({ ok: false, error: 'Hết thời gian chờ kiểm tra cập nhật.' });
    }, MANUAL_CHECK_TIMEOUT_MS);

    manualCheckResolve = settle;

    // Nếu một lượt kiểm tra tự động đang chạy, electron-updater dùng lại lượt đó;
    // sự kiện update-available vẫn hiện lời mời tải nên không bị "nuốt".
    autoUpdater.checkForUpdates()
      .then((result) => {
        if (!result) settle({ ok: false, error: 'Không kiểm tra được cập nhật.' });
      })
      .catch((err) => {
        settle({ ok: false, error: err.message });
      });
  });
  const tracked = pending.finally(() => {
    if (manualCheckPromise === tracked) manualCheckPromise = null;
  });
  manualCheckPromise = tracked;
  return tracked;
}

module.exports = { setupAutoUpdater, checkForUpdatesManual, createUpdateStateMachine, UPDATE_STATES };
