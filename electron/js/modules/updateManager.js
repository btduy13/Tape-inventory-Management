// JS/MODULES/UPDATEMANAGER.JS - KIỂM TRA CẬP NHẬT TỪ GIAO DIỆN

const UPDATE_PROGRESS_STEP = 25;
let lastUpdateMilestone = 0;

// Trả về mốc % mới cần hiển thị (25/50/75/100) hoặc null.
// Dùng mốc cao nhất đã vượt qua nên không trùng lặp và không bỏ sót khi % nhảy cóc.
function nextUpdateMilestone(lastMilestone, percent) {
  const value = Number(percent);
  if (!Number.isFinite(value) || value <= 0) return null;
  const milestone = Math.min(100, Math.floor(value / UPDATE_PROGRESS_STEP) * UPDATE_PROGRESS_STEP);
  return milestone > (Number(lastMilestone) || 0) ? milestone : null;
}

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
    if (!data) return;
    if (data.type === 'checking' || data.type === 'available') {
      lastUpdateMilestone = 0;
    }
    if (data.type === 'downloading') {
      const milestone = nextUpdateMilestone(lastUpdateMilestone, data.percent);
      if (milestone !== null) {
        lastUpdateMilestone = milestone;
        utils.showToast(`Đang tải cập nhật: ${milestone}%`, 'info');
      }
    }
    if (data.type === 'downloaded') {
      lastUpdateMilestone = 100;
    }
    if (data.type === 'error' && data.message) {
      lastUpdateMilestone = 0;
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
  let result;
  try {
    result = await window.electronAPI.checkForUpdates();
  } catch (err) {
    utils.showToast('Không kiểm tra được cập nhật: ' + (err?.message || err), 'danger');
    return;
  }

  if (!result?.ok) {
    utils.showToast(result?.message || result?.error || 'Không kiểm tra được cập nhật.', 'warning');
    return;
  }

  if (!result.updateAvailable) {
    utils.showToast('Bạn đang dùng phiên bản mới nhất.', 'success');
    return;
  }

  if (result.downloading) {
    utils.showToast('Đang tải bản cập nhật, vui lòng chờ...', 'info');
  } else if (!result.downloaded && result.version) {
    utils.showToast(`Có phiên bản mới v${result.version}.`, 'info');
  }
}

if (typeof module === 'object' && module.exports) module.exports = { nextUpdateMilestone };
