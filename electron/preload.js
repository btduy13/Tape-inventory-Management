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

  // --- TRUY VẤN DATABASE SUPABASE POSTGRESQL ---
  // SELECT query trả về danh sách hàng/bản ghi
  dbQuery: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  
  // INSERT/UPDATE/DELETE query trả về số bản ghi thay đổi
  dbRun: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
  dbTransaction: (statements) => ipcRenderer.invoke('db-transaction', statements),

  // --- GỬI EMAIL ---
  sendEmail: (toAddress, subject, body, htmlBody, attachments, dbAttachmentIds) => 
    ipcRenderer.invoke('send-email', toAddress, subject, body, htmlBody, attachments, dbAttachmentIds),

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
