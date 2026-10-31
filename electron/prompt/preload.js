// Preload của hộp thoại mật khẩu: chỉ hai hàm, không lộ ipcRenderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('passphraseAPI', {
  submit: (passphrase, confirm) => ipcRenderer.invoke('passphrase-prompt', {
    action: 'submit',
    passphrase: String(passphrase ?? ''),
    confirm: String(confirm ?? '')
  }),
  cancel: () => ipcRenderer.invoke('passphrase-prompt', { action: 'cancel' })
});
