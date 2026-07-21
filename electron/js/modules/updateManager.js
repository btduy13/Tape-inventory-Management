// JS/MODULES/UPDATEMANAGER.JS - KIỂM TRA CẬP NHẬT TỪ GIAO DIỆN

async function initializeAppVersion() {
  try {
    const version = await window.electronAPI.getVersion();
    const el = document.getElementById('app-version-display');
    if (el && version) {
      el.textContent = `Phiên bản v${version}`;
    }
  } catch (_) {}
}

function initializeUpdateListeners() {
  if (!window.electronAPI.onUpdateStatus) return;

  window.electronAPI.onUpdateStatus((data) => {
    if (data.type === 'downloading' && data.percent > 0 && data.percent % 25 === 0) {
      utils.showToast(`Đang tải cập nhật: ${data.percent}%`, 'info');
    }
    if (data.type === 'error' && data.message) {
      utils.showToast('Lỗi cập nhật: ' + data.message, 'danger');
    }
  });
}

async function checkForAppUpdates() {
  if (!window.electronAPI.checkForUpdates) {
    utils.showToast('Tính năng cập nhật không khả dụng.', 'warning');
    return;
  }

  utils.showToast('Đang kiểm tra cập nhật...', 'info');
  const result = await window.electronAPI.checkForUpdates();

  if (!result.ok) {
    utils.showToast(result.message || result.error || 'Không kiểm tra được cập nhật.', 'warning');
    return;
  }

  if (!result.updateAvailable) {
    utils.showToast('Bạn đang dùng phiên bản mới nhất.', 'success');
  }
}
