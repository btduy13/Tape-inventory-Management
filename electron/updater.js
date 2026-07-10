// UPDATER.JS - TỰ ĐỘNG KIỂM TRA VÀ CÀI ĐẶT BẢN CẬP NHẬT TỪ GITHUB RELEASES
const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
let mainWindowRef = null;
let manualCheckResolve = null;

function sendUpdateStatus(payload) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('update-status', payload);
  }
}

function setupAutoUpdater(mainWindow, writeLog) {
  mainWindowRef = mainWindow;

  if (!app.isPackaged) {
    writeLog('info', 'Bỏ qua auto-update (chế độ phát triển).');
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = {
    info: (msg) => writeLog('info', `[updater] ${msg}`),
    warn: (msg) => writeLog('warning', `[updater] ${msg}`),
    error: (msg) => writeLog('error', `[updater] ${msg}`)
  };

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({ type: 'available', version: info.version });

    if (manualCheckResolve) {
      manualCheckResolve({ ok: true, updateAvailable: true, version: info.version });
      manualCheckResolve = null;
      return;
    }

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Có bản cập nhật mới',
      message: `Phiên bản ${info.version} đã có sẵn.`,
      detail: 'Bạn có muốn tải và cài đặt ngay không?',
      buttons: ['Tải ngay', 'Để sau'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate().catch((err) => {
          writeLog('error', 'Lỗi tải cập nhật: ' + err.message);
          sendUpdateStatus({ type: 'error', message: err.message });
        });
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({ type: 'not-available' });
    if (manualCheckResolve) {
      manualCheckResolve({ ok: true, updateAvailable: false });
      manualCheckResolve = null;
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      type: 'downloading',
      percent: Math.round(progress.percent || 0)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({ type: 'downloaded', version: info.version });

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Sẵn sàng cập nhật',
      message: `Bản cập nhật v${info.version} đã tải xong.`,
      detail: 'Khởi động lại ứng dụng để áp dụng bản mới?',
      buttons: ['Khởi động lại', 'Để sau'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (err) => {
    writeLog('error', 'Auto-update lỗi: ' + err.message);
    sendUpdateStatus({ type: 'error', message: err.message });
    if (manualCheckResolve) {
      manualCheckResolve({ ok: false, error: err.message });
      manualCheckResolve = null;
    }
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      writeLog('warning', 'Không kiểm tra được cập nhật lúc khởi động: ' + err.message);
    });
  }, 8000);

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, CHECK_INTERVAL_MS);
}

async function checkForUpdatesManual() {
  if (!app.isPackaged) {
    return { ok: false, message: 'Chế độ phát triển không kiểm tra cập nhật tự động.' };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (manualCheckResolve) {
        manualCheckResolve = null;
        resolve({ ok: false, error: 'Hết thời gian chờ kiểm tra cập nhật.' });
      }
    }, 30000);

    manualCheckResolve = (result) => {
      clearTimeout(timeout);
      resolve(result);
    };

    autoUpdater.checkForUpdates().catch((err) => {
      clearTimeout(timeout);
      manualCheckResolve = null;
      resolve({ ok: false, error: err.message });
    });
  });
}

module.exports = { setupAutoUpdater, checkForUpdatesManual };
