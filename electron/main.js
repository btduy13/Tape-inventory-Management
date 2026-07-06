// MAIN.JS - TIẾN TRÌNH CHÍNH (BACKEND DESKTOP SHELL)
const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const config = require('./config');

// Tăng heap size để tối ưu hiệu năng
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow;
let dbPool;
let dbConnectionState = 'connecting'; // connecting | connected | disconnected
let dbReconnectTimer = null;
const LOG_DIR = path.join(app.getPath('userData'), 'logs');

// 1. KHỞI TẠO LOGGING SYSTEM
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function writeLogToFile(level, message) {
  try {
    ensureLogDir();
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOG_DIR, `app_${today}.log`);
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(logFile, logLine, 'utf8');
    console.log(logLine.trim());
  } catch (err) {
    console.error('Lỗi ghi file log:', err);
  }
}

function notifyDbStatus(status, message) {
  dbConnectionState = status;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('db-status-changed', { status, message });
  }
}

function createDbPool() {
  if (dbPool) {
    dbPool.end().catch(() => {});
    dbPool = null;
  }

  dbPool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: config.DB_CONNECTION_TIMEOUT_MS || 15000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  });

  dbPool.on('error', (err) => {
    writeLogToFile('error', 'Lỗi pool database (idle client): ' + err.message);
    dbConnectionState = 'disconnected';
    notifyDbStatus('disconnected', err.message);
    scheduleDbReconnect();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDatabaseMigrations() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS email_history (
      id SERIAL PRIMARY KEY,
      email_address VARCHAR(255) NOT NULL,
      last_sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_count INTEGER DEFAULT 1
    )
  `);
  writeLogToFile('info', 'Đã kiểm tra/khởi tạo bảng email_history thành công.');

  await dbPool.query(`SET lock_timeout = 2000`);
  await dbPool.query(`ALTER TABLE bang_keo_in_orders ADD COLUMN IF NOT EXISTS is_quote BOOLEAN DEFAULT FALSE`);
  await dbPool.query(`ALTER TABLE bang_keo_orders ADD COLUMN IF NOT EXISTS is_quote BOOLEAN DEFAULT FALSE`);
  await dbPool.query(`ALTER TABLE truc_in_orders ADD COLUMN IF NOT EXISTS is_quote BOOLEAN DEFAULT FALSE`);
  await dbPool.query(`ALTER TABLE bang_keo_in_orders ADD COLUMN IF NOT EXISTS vat NUMERIC DEFAULT 0`);
  await dbPool.query(`ALTER TABLE bang_keo_orders ADD COLUMN IF NOT EXISTS vat NUMERIC DEFAULT 0`);
  await dbPool.query(`ALTER TABLE truc_in_orders ADD COLUMN IF NOT EXISTS vat NUMERIC DEFAULT 0`);
  await dbPool.query(`
    ALTER TABLE bang_keo_in_orders
      ADD COLUMN IF NOT EXISTS loai_truc VARCHAR(10) DEFAULT 'cu',
      ADD COLUMN IF NOT EXISTS ten_truc TEXT,
      ADD COLUMN IF NOT EXISTS truc_chu_vi NUMERIC,
      ADD COLUMN IF NOT EXISTS truc_so_luong NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS truc_gia_goc NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS truc_gia_ban NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS truc_thanh_tien_goc NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS truc_thanh_tien_ban NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS truc_ctv TEXT,
      ADD COLUMN IF NOT EXISTS truc_hoa_hong NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS truc_loi_nhuan NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS truc_loi_nhuan_rong NUMERIC DEFAULT 0
  `);
  await dbPool.query(`SET lock_timeout = 0`);
  writeLogToFile('info', 'Đã kiểm tra/thêm cột is_quote vào các bảng order.');
}

async function verifyDatabaseConnection() {
  const res = await dbPool.query('SELECT NOW() AS now');
  return res.rows[0].now;
}

// 2. KHỞI TẠO KẾT NỐI SUPABASE POSTGRESQL (có thử lại khi timeout)
async function initDatabase() {
  const maxRetries = config.DB_CONNECT_RETRIES || 4;
  const retryDelay = config.DB_CONNECT_RETRY_DELAY_MS || 2500;

  writeLogToFile('info', 'Đang khởi tạo Pool kết nối tới PostgreSQL Supabase...');
  notifyDbStatus('connecting', 'Đang kết nối...');

  createDbPool();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startedAt = Date.now();
      const serverTime = await verifyDatabaseConnection();
      writeLogToFile(
        'info',
        `Kết nối thành công tới database Supabase! (lần ${attempt}/${maxRetries}, ${Date.now() - startedAt}ms) Thời gian: ${serverTime}`
      );

      try {
        await runDatabaseMigrations();
      } catch (dbErr) {
        writeLogToFile('error', 'Lỗi khởi tạo bảng/migration: ' + dbErr.message);
        try {
          await dbPool.query(`SET lock_timeout = 0`);
        } catch (e) {}
      }

      notifyDbStatus('connected', 'Mây: Kết nối');
      if (dbReconnectTimer) {
        clearTimeout(dbReconnectTimer);
        dbReconnectTimer = null;
      }
      return true;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      writeLogToFile(
        'error',
        `Lỗi kiểm tra kết nối database (lần ${attempt}/${maxRetries}): ${err.message}`
      );

      if (!isLastAttempt) {
        notifyDbStatus('connecting', `Thử lại kết nối (${attempt}/${maxRetries})...`);
        await sleep(retryDelay * attempt);
        createDbPool();
      } else {
        notifyDbStatus('disconnected', 'Mây: Mất kết nối');
        scheduleDbReconnect();
        return false;
      }
    }
  }

  return false;
}

function scheduleDbReconnect() {
  if (dbReconnectTimer) return;

  dbReconnectTimer = setTimeout(async () => {
    dbReconnectTimer = null;
    if (dbConnectionState === 'connected') return;

    writeLogToFile('info', 'Đang thử kết nối lại database...');
    await initDatabase();
  }, 30000);
}

function ensureDbReady() {
  if (!dbPool) {
    return { ok: false, error: 'Database chưa được khởi tạo' };
  }
  if (dbConnectionState !== 'connected') {
    return { ok: false, error: 'Không có kết nối database. Vui lòng kiểm tra mạng và thử lại.' };
  }
  return { ok: true };
}

// 3. TẠO CỬA SỔ CHÍNH
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    center: true,
    title: config.APP_NAME,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    show: false,
    backgroundColor: '#0b0f19'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Thiết lập menu trống cho phím tắt
  const template = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Hoàn tác' },
        { role: 'redo', label: 'Làm lại' },
        { type: 'separator' },
        { role: 'cut', label: 'Cắt' },
        { role: 'copy', label: 'Sao chép' },
        { role: 'paste', label: 'Dán' },
        { role: 'selectAll', label: 'Chọn tất cả' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  mainWindow.setMenuBarVisibility(false); // Ẩn thanh menu mặc định

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    writeLogToFile('info', 'Cửa sổ ứng dụng chính đã hiển thị.');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 4. ĐĂNG KÝ CÁC TRÌNH XỬ LÝ IPC
function setupIpcHandlers() {
  // Lấy phiên bản
  ipcMain.handle('get-version', () => config.APP_VERSION);

  ipcMain.handle('get-db-status', () => ({
    status: dbConnectionState,
    connected: dbConnectionState === 'connected',
    message: dbConnectionState === 'connected'
      ? 'Mây: Kết nối'
      : dbConnectionState === 'connecting'
        ? 'Mây: Đang kết nối...'
        : 'Mây: Mất kết nối'
  }));

  ipcMain.handle('retry-db-connection', async () => {
    if (dbConnectionState === 'connected') {
      return { ok: true, status: dbConnectionState };
    }
    const ok = await initDatabase();
    return { ok, status: dbConnectionState };
  });

  // Mở URL ngoài trình duyệt
  ipcMain.handle('open-external', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { ok: true };
    } catch (err) {
      writeLogToFile('error', 'Lỗi mở URL ngoài: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  // Ghi log
  ipcMain.handle('write-log', (event, level, message) => {
    writeLogToFile(level, message);
    return { ok: true };
  });

  // In ấn màn hình active
  ipcMain.handle('print-window', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return { ok: false, error: 'Không tìm thấy cửa sổ' };
      
      win.webContents.print({
        silent: false,
        printBackground: true,
        color: true,
        margins: { marginType: 'none' }
      }, (success, failureReason) => {
        if (!success) {
          writeLogToFile('warning', 'Hủy in hoặc in lỗi: ' + failureReason);
        } else {
          writeLogToFile('info', 'Tiến trình in ấn hoàn tất thành công!');
        }
      });
      return { ok: true };
    } catch (err) {
      writeLogToFile('error', 'Lỗi tiến trình in: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  // --- TRUY VẤN CƠ SỞ DỮ LIỆU POSTGRESQL ---
  ipcMain.handle('db-query', async (event, sql, params) => {
    const ready = ensureDbReady();
    if (!ready.ok) return ready;

    try {
      const res = await dbPool.query(sql, params);
      return { ok: true, rows: res.rows };
    } catch (err) {
      writeLogToFile('error', `Lỗi DB Query: ${sql} | Lỗi: ${err.message}`);
      if (/timeout|terminated|ECONNRESET|ENOTFOUND|ECONNREFUSED/i.test(err.message)) {
        dbConnectionState = 'disconnected';
        notifyDbStatus('disconnected', 'Mây: Mất kết nối');
        scheduleDbReconnect();
      }
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('db-run', async (event, sql, params) => {
    const ready = ensureDbReady();
    if (!ready.ok) return ready;

    try {
      const res = await dbPool.query(sql, params);
      return { 
        ok: true, 
        rowCount: res.rowCount, 
        rows: res.rows,
        oid: res.oid
      };
    } catch (err) {
      writeLogToFile('error', `Lỗi DB Run: ${sql} | Lỗi: ${err.message}`);
      if (/timeout|terminated|ECONNRESET|ENOTFOUND|ECONNREFUSED/i.test(err.message)) {
        dbConnectionState = 'disconnected';
        notifyDbStatus('disconnected', 'Mây: Mất kết nối');
        scheduleDbReconnect();
      }
      return { ok: false, error: err.message };
    }
  });

  // --- GỬI EMAIL QUA SMTP GMAIL ---
  ipcMain.handle('send-email', async (event, toAddress, subject, body, htmlBody, attachments, dbAttachmentIds) => {
    try {
      writeLogToFile('info', `Đang chuẩn bị gửi email tới: ${toAddress} | Tiêu đề: ${subject}`);
      
      const transporter = nodemailer.createTransport({
        host: config.EMAIL_CONFIG.server,
        port: config.EMAIL_CONFIG.port,
        secure: config.EMAIL_CONFIG.port === 465, // true nếu là 465
        auth: {
          user: config.EMAIL_CONFIG.username,
          pass: config.EMAIL_CONFIG.password
        }
      });

      // Xử lý chuyển đổi attachments từ Base64 sang Buffer nhị phân
      const processedAttachments = (attachments || []).map(att => {
        return {
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          contentType: att.contentType
        };
      });

      // Lấy thêm attachments từ database nếu có
      if (dbAttachmentIds && dbAttachmentIds.length > 0) {
        writeLogToFile('info', `Đang nạp ${dbAttachmentIds.length} tệp đính kèm từ database...`);
        for (const attId of dbAttachmentIds) {
          const dbRes = await dbPool.query(
            'SELECT file_name, data, content_type FROM order_attachments WHERE id = $1',
            [attId]
          );
          if (dbRes.rows.length > 0) {
            const row = dbRes.rows[0];
            processedAttachments.push({
              filename: row.file_name,
              content: row.data, // row.data is a Node Buffer since pg returns bytea as Buffer
              contentType: row.content_type || 'application/octet-stream'
            });
            writeLogToFile('info', `Đã đính kèm tệp DB: ${row.file_name}`);
          }
        }
      }

      const mailOptions = {
        from: config.EMAIL_CONFIG.sender,
        to: toAddress,
        subject: subject,
        text: body,
        html: htmlBody,
        attachments: processedAttachments
      };

      const info = await transporter.sendMail(mailOptions);
      writeLogToFile('info', `Email đã gửi thành công! MessageId: ${info.messageId}`);
      return { ok: true };
    } catch (err) {
      writeLogToFile('error', 'Lỗi gửi email: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  // --- ĐỌC FILE RA BASE64 ĐỂ ĐÍNH KÈM FRONTEND ---
  ipcMain.handle('read-file-base64', async (event, filePath) => {
    try {
      const data = await fs.promises.readFile(filePath);
      return {
        ok: true,
        data: data.toString('base64'),
        name: path.basename(filePath)
      };
    } catch (err) {
      writeLogToFile('error', 'Lỗi đọc file ra base64: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  // --- IN ẤN PDF BÁO GIÁ ---
  ipcMain.handle('write-file-base64', async (event, filePath, base64Data) => {
    try {
      await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'));
      return { ok: true };
    } catch (err) {
      writeLogToFile('error', 'Loi ghi file base64: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('print-to-pdf', async (event, htmlContent, savePath) => {
    try {
      writeLogToFile('info', 'Đang tạo cửa sổ in PDF báo giá...');
      let pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      
      // Load HTML content into window
      pdfWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
      
      return new Promise((resolve) => {
        pdfWindow.webContents.on('did-finish-load', async () => {
          try {
            const pdfData = await pdfWindow.webContents.printToPDF({
              margins: {
                marginType: 'default'
              },
              printBackground: true,
              pageSize: 'A4',
              landscape: false
            });
            fs.writeFileSync(savePath, pdfData);
            pdfWindow.close();
            writeLogToFile('info', 'Đã lưu file PDF báo giá thành công!');
            resolve({ ok: true });
          } catch (err) {
            pdfWindow.close();
            writeLogToFile('error', 'Lỗi lưu PDF: ' + err.message);
            resolve({ ok: false, error: err.message });
          }
        });
      });
    } catch (err) {
      writeLogToFile('error', 'Lỗi tạo pdf: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  // --- FILE SYSTEM DIALOGS ---
  ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  });

  ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });
}

// 5. VÒNG ĐỜI HỆ THỐNG
app.whenReady().then(async () => {
  writeLogToFile('info', 'Ứng dụng đã khởi động.');
  setupIpcHandlers();
  createWindow();
  await initDatabase();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (dbPool) {
      dbPool.end().then(() => {
        writeLogToFile('info', 'Database Pool đã được giải phóng đóng ứng dụng.');
        app.quit();
      });
    } else {
      app.quit();
    }
  }
});
