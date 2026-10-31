// Hộp thoại mật khẩu: chế độ "export" (đặt mật khẩu + nhập lại) hoặc "import" (nhập mật khẩu)
(function () {
  const mode = new URLSearchParams(window.location.search).get('mode') === 'export' ? 'export' : 'import';
  const form = document.getElementById('passphraseForm');
  const passphrase = document.getElementById('passphrase');
  const confirm = document.getElementById('confirm');
  const errorBox = document.getElementById('error');
  const submitButton = document.getElementById('submitButton');
  const cancelButton = document.getElementById('cancelButton');

  if (mode === 'export') {
    document.getElementById('heading').textContent = 'Đặt mật khẩu cho tệp cấu hình';
    document.getElementById('description').textContent =
      'Tệp cấu hình sẽ được mã hóa. Dùng ít nhất 10 ký tự. Báo mật khẩu cho người nhập bằng kênh khác (gọi điện, gặp trực tiếp), không gửi kèm tệp.';
    document.getElementById('confirmGroup').hidden = false;
    submitButton.textContent = 'Mã hóa và lưu';
  } else {
    document.getElementById('heading').textContent = 'Mật khẩu tệp cấu hình';
    document.getElementById('description').textContent = 'Nhập mật khẩu đã đặt khi xuất tệp cấu hình này.';
    passphrase.setAttribute('autocomplete', 'current-password');
    submitButton.textContent = 'Giải mã và nhập';
  }

  function setBusy(busy) {
    submitButton.disabled = busy;
    cancelButton.disabled = busy;
    passphrase.disabled = busy;
    confirm.disabled = busy;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.textContent = '';
    setBusy(true);
    try {
      const result = await window.passphraseAPI.submit(passphrase.value, mode === 'export' ? confirm.value : '');
      if (!result || !result.ok) {
        errorBox.textContent = (result && result.error) || 'Mật khẩu không hợp lệ';
        setBusy(false);
        passphrase.select();
        passphrase.focus();
      }
    } catch (_) {
      errorBox.textContent = 'Không gửi được mật khẩu';
      setBusy(false);
    }
  });

  cancelButton.addEventListener('click', () => { window.passphraseAPI.cancel(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !cancelButton.disabled) window.passphraseAPI.cancel();
  });
  passphrase.focus();
})();
