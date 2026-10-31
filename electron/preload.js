// PRELOAD.JS - GIAO DIỆN BẢO MẬT GIỮA FRONTEND VÀ BACKEND
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Trả về phiên bản hiện tại của app
  getVersion: () => ipcRenderer.invoke('get-version'),

  getDatabaseStatus: () => ipcRenderer.invoke('get-database-status'),
  manageDatabaseConfig: () => ipcRenderer.invoke('manage-database-config'),

  onDatabaseStatus: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('database-status', listener);
    return () => ipcRenderer.removeListener('database-status', listener);
  },

  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  onUpdateStatus: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  },

  // Mở liên kết ngoài trình duyệt
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Ghi log lỗi/hoạt động hệ thống
  writeLog: (level, message) => ipcRenderer.invoke('write-log', level, message),

  // In ấn màn hình hóa đơn/phiếu giao hàng
  printWindow: () => ipcRenderer.invoke('print-window'),

  // --- THAO TÁC DATABASE THEO TÊN (renderer chỉ gửi tên thao tác + tham số) ---
  // dbQuery: thao tác đọc đã đăng ký ở db/readActions.js, ví dụ dbQuery('order.getById', { orderType, id })
  dbQuery: (action, params) => ipcRenderer.invoke('db-read', String(action || ''), params ?? {}),

  // dbRun: thao tác ghi đã đăng ký ở db/writeActions.js, trả về rowCount/rows
  dbRun: (action, params) => ipcRenderer.invoke('db-write', String(action || ''), params ?? {}),

  // dbTransaction: [{ action, params }] — chỉ thao tác ghi, chạy trong một transaction
  dbTransaction: (steps) => ipcRenderer.invoke('db-transaction', steps),

  // --- GỬI EMAIL ---
  sendEmail: (toAddress, subject, body, htmlBody, attachments, dbAttachmentIds) => 
    ipcRenderer.invoke('send-email', toAddress, subject, body, htmlBody, attachments, dbAttachmentIds),
  getEmailConfig: () => ipcRenderer.invoke('get-email-config'),
  saveEmailConfig: (config) => ipcRenderer.invoke('save-email-config', config),
  testEmailConfig: () => ipcRenderer.invoke('test-email-config'),

  // --- HỘP THOẠI HỆ THỐNG ---
  // Chọn nơi lưu file (dùng khi xuất Excel)
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // Chọn file nguồn để mở (dùng khi nhập Excel)
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Đọc file ra base64
  readFileAsBase64: (filePath, purpose) => ipcRenderer.invoke('read-file-base64', filePath, purpose),

  writeFileBase64: (filePath, base64Data) => ipcRenderer.invoke('write-file-base64', filePath, base64Data),

  // Xuất file PDF báo giá
  printToPdf: (htmlContent, savePath) => ipcRenderer.invoke('print-to-pdf', htmlContent, savePath)
});
