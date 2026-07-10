// MAIN.JS - TIẾN TRÌNH CHÍNH (BACKEND DESKTOP SHELL)
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu, ipcMain, shell, dialog, nativeImage } = require('electron');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const config = require('./config');
const { setupAutoUpdater, checkForUpdatesManual } = require('./updater');

// Tăng heap size để tối ưu hiệu năng
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow;
let dbPool;
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

// 2. KHỞI TẠO KẾT NỐI SUPABASE POSTGRESQL
function initDatabase() {
  try {
    writeLogToFile('info', 'Đang khởi tạo Pool kết nối tới PostgreSQL Supabase...');
    dbPool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Hỗ trợ kết nối SSL qua Supabase pooler
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
    
    // Test thử kết nối và khởi tạo bảng
    dbPool.query('SELECT NOW()', async (err, res) => {
      if (err) {
        writeLogToFile('error', 'Lỗi kiểm tra kết nối database: ' + err.message);
      } else {
        writeLogToFile('info', 'Kết nối thành công tới database Supabase! Thời gian: ' + res.rows[0].now);
        try {
          await dbPool.query(`
            CREATE TABLE IF NOT EXISTS email_history (
              id SERIAL PRIMARY KEY,
              email_address VARCHAR(255) NOT NULL,
              last_sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              sent_count INTEGER DEFAULT 1
            )
          `);
          writeLogToFile('info', 'Đã kiểm tra/khởi tạo bảng email_history thành công.');
          
          // Chạy migration thêm cột is_quote nếu chưa có
          // Đặt lock_timeout để tránh treo ứng dụng nếu có giao dịch khác đang khóa bảng
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
              ADD COLUMN IF NOT EXISTS truc_tien_hoa_hong NUMERIC DEFAULT 0,
              ADD COLUMN IF NOT EXISTS truc_loi_nhuan NUMERIC DEFAULT 0,
              ADD COLUMN IF NOT EXISTS truc_loi_nhuan_rong NUMERIC DEFAULT 0
          `);
          await dbPool.query(`
            UPDATE bang_keo_in_orders
            SET truc_tien_hoa_hong = GREATEST(COALESCE(truc_loi_nhuan, 0), 0) * LEAST(GREATEST(COALESCE(truc_hoa_hong, 0), 0), 100) / 100
            WHERE COALESCE(loai_truc, 'cu') = 'moi'
          `);
          await dbPool.query(`
            UPDATE bang_keo_in_orders
            SET cong_no_khach = CASE
              WHEN COALESCE(da_tat_toan, FALSE) THEN 0
              ELSE GREATEST(COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) ELSE 0 END - COALESCE(tien_coc, 0), 0)
            END
          `);
          await dbPool.query(`
            UPDATE bang_keo_orders
            SET cong_no_khach = CASE WHEN COALESCE(da_tat_toan, FALSE) THEN 0 ELSE GREATEST(COALESCE(thanh_tien_ban, 0), 0) END
          `);
          await dbPool.query(`
            UPDATE truc_in_orders
            SET cong_no_khach = CASE WHEN COALESCE(da_tat_toan, FALSE) THEN 0 ELSE GREATEST(COALESCE(thanh_tien_ban, 0), 0) END
          `);
          await dbPool.query(`SET lock_timeout = 0`); // Reset timeout về mặc định
          writeLogToFile('info', 'Đã đồng bộ schema và công nợ các bảng đơn hàng.');
        } catch (dbErr) {
          writeLogToFile('error', 'Lỗi khởi tạo bảng/migration: ' + dbErr.message);
          // Đảm bảo reset lock_timeout nếu có lỗi xảy ra
          try {
            await dbPool.query(`SET lock_timeout = 0`);
          } catch (e) {}
        }
      }
    });
  } catch (err) {
    writeLogToFile('critical', 'Lỗi khởi tạo Database Pool: ' + err.message);
  }
}

function getAppIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return null;
}

// 3. TẠO CỬA SỔ CHÍNH
function createWindow() {
  const appIcon = getAppIcon();
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    center: true,
    title: config.APP_NAME,
    icon: appIcon || undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    show: false,
    backgroundColor: '#f3f3f3'
  });

  mainWindow.webContents.on('console-message', (event, details) => {
    const level = details.level === 3 || details.level === 'error' ? 'error' : 'info';
    writeLogToFile(level, `Renderer: ${details.message || ''} (${details.sourceId || 'unknown'}:${details.lineNumber || 0})`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    writeLogToFile('critical', `Renderer đã dừng: ${details.reason} (${details.exitCode})`);
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
    setupAutoUpdater(mainWindow, writeLogToFile);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 4. ĐĂNG KÝ CÁC TRÌNH XỬ LÝ IPC
function setupIpcHandlers() {
  // Lấy phiên bản
  ipcMain.handle('get-version', () => config.APP_VERSION);

  ipcMain.handle('check-for-updates', async () => checkForUpdatesManual());

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
    try {
      const res = await dbPool.query(sql, params);
      return { ok: true, rows: res.rows };
    } catch (err) {
      writeLogToFile('error', `Lỗi DB Query: ${sql} | Lỗi: ${err.message}`);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('db-run', async (event, sql, params) => {
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
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('db-transaction', async (event, statements) => {
    if (!Array.isArray(statements) || statements.length === 0) {
      return { ok: false, error: 'Transaction không có câu lệnh' };
    }

    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL lock_timeout = 3000');
      const results = [];
      for (const statement of statements) {
        if (!statement || typeof statement.sql !== 'string') {
          throw new Error('Câu lệnh transaction không hợp lệ');
        }
        const result = await client.query(statement.sql, statement.params || []);
        results.push({ rowCount: result.rowCount, rows: result.rows });
      }
      await client.query('COMMIT');
      return { ok: true, results };
    } catch (err) {
      await client.query('ROLLBACK');
      writeLogToFile('error', `Lỗi DB Transaction: ${err.message}`);
      return { ok: false, error: err.message };
    } finally {
      client.release();
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
app.whenReady().then(() => {
  writeLogToFile('info', 'Ứng dụng đã khởi động.');
  initDatabase();
  setupIpcHandlers();
  createWindow();

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
