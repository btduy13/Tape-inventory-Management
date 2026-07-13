// MAIN.JS - TIẾN TRÌNH CHÍNH (BACKEND DESKTOP SHELL)
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu, ipcMain, shell, dialog, nativeImage } = require('electron');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const config = require('./config');
const { validateRendererSql } = require('./dbPolicy');
const { MAX_TOTAL_ATTACHMENT_BYTES, sanitizeAttachmentName, validateEmailPayload } = require('./emailPolicy');
const { setupAutoUpdater, checkForUpdatesManual } = require('./updater');

// Tăng heap size để tối ưu hiệu năng
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow;
let dbPool;
let databaseStatus = { state: 'disconnected', error: '' };
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const USER_CONFIG_PATH = path.join(app.getPath('userData'), 'config.local.json');
const approvedReadPaths = new Set();
const approvedWritePaths = new Set();

function approvedPathKey(filePath) {
  return path.resolve(String(filePath || '')).toLowerCase();
}

function consumeApprovedPath(approvedPaths, filePath) {
  const key = approvedPathKey(filePath);
  if (!key || !approvedPaths.has(key)) return false;
  approvedPaths.delete(key);
  return true;
}

function validatePortableConfig(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Tệp cấu hình phải là JSON hợp lệ');
  }

  const databaseUrl = String(payload.DATABASE_URL || '').trim();
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error('DATABASE_URL phải là địa chỉ PostgreSQL hợp lệ');
  }

  const email = payload.EMAIL_CONFIG && typeof payload.EMAIL_CONFIG === 'object'
    ? payload.EMAIL_CONFIG
    : {};
  return {
    DATABASE_URL: databaseUrl,
    EMAIL_CONFIG: {
      server: String(email.server || 'smtp.gmail.com').trim(),
      port: Number(email.port || 587),
      username: String(email.username || '').trim(),
      password: String(email.password || ''),
      sender: String(email.sender || '').trim()
    }
  };
}

function readPortableConfig(filePath) {
  return validatePortableConfig(JSON.parse(fs.readFileSync(filePath, 'utf8')));
}

function currentPortableConfig() {
  return validatePortableConfig({
    DATABASE_URL: config.DATABASE_URL,
    EMAIL_CONFIG: config.EMAIL_CONFIG
  });
}

async function importDatabaseConfig(ownerWindow = null) {
  const result = await dialog.showOpenDialog(ownerWindow || undefined, {
    title: 'Chọn cấu hình dữ liệu Băng Keo',
    properties: ['openFile'],
    filters: [{ name: 'Cấu hình JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };

  try {
    const imported = readPortableConfig(result.filePaths[0]);
    fs.mkdirSync(path.dirname(USER_CONFIG_PATH), { recursive: true });
    fs.writeFileSync(USER_CONFIG_PATH, JSON.stringify(imported, null, 2), { encoding: 'utf8', mode: 0o600 });
    return { ok: true };
  } catch (error) {
    await dialog.showMessageBox(ownerWindow || undefined, {
      type: 'error',
      title: 'Cấu hình không hợp lệ',
      message: 'Không thể nhập cấu hình dữ liệu',
      detail: error.message
    });
    return { ok: false, error: error.message };
  }
}

function relaunchApplication() {
  app.relaunch();
  app.exit(0);
}

async function ensureStartupConfiguration() {
  if (config.DATABASE_URL) return true;

  const choice = await dialog.showMessageBox({
    type: 'warning',
    title: 'Chưa có cấu hình dữ liệu',
    message: 'Phần mềm chưa được kết nối với cơ sở dữ liệu.',
    detail: 'Trên máy đang hoạt động, bấm badge “Mây” và chọn “Xuất cấu hình”. Sau đó chuyển tệp JSON sang máy này và chọn “Nhập cấu hình”.',
    buttons: ['Nhập cấu hình', 'Thoát'],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  });
  if (choice.response !== 0) return false;

  const imported = await importDatabaseConfig();
  if (imported.ok) relaunchApplication();
  return false;
}

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
async function runDatabaseMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_history (
      id SERIAL PRIMARY KEY,
      email_address VARCHAR(255) NOT NULL,
      last_sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_count INTEGER DEFAULT 1
    )
  `);
  writeLogToFile('info', 'Đã kiểm tra/khởi tạo bảng email_history thành công.');

  await pool.query('SET lock_timeout = 2000');
  try {
    await pool.query(`ALTER TABLE bang_keo_in_orders ADD COLUMN IF NOT EXISTS is_quote BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE bang_keo_orders ADD COLUMN IF NOT EXISTS is_quote BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE truc_in_orders ADD COLUMN IF NOT EXISTS is_quote BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE bang_keo_in_orders ADD COLUMN IF NOT EXISTS vat NUMERIC DEFAULT 0`);
    await pool.query(`ALTER TABLE bang_keo_orders ADD COLUMN IF NOT EXISTS vat NUMERIC DEFAULT 0`);
    await pool.query(`ALTER TABLE truc_in_orders ADD COLUMN IF NOT EXISTS vat NUMERIC DEFAULT 0`);
    await pool.query(`
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
    await pool.query(`
      UPDATE bang_keo_in_orders
      SET truc_tien_hoa_hong = GREATEST(COALESCE(truc_loi_nhuan, 0), 0) * LEAST(GREATEST(COALESCE(truc_hoa_hong, 0), 0), 100) / 100
      WHERE COALESCE(loai_truc, 'cu') = 'moi'
    `);
    await pool.query(`
      UPDATE bang_keo_in_orders
      SET cong_no_khach = CASE
        WHEN COALESCE(da_tat_toan, FALSE) THEN 0
        ELSE GREATEST(COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) ELSE 0 END - COALESCE(tien_coc, 0), 0)
      END
    `);
    await pool.query(`
      UPDATE bang_keo_orders
      SET cong_no_khach = CASE WHEN COALESCE(da_tat_toan, FALSE) THEN 0 ELSE GREATEST(COALESCE(thanh_tien_ban, 0), 0) END
    `);
    await pool.query(`
      UPDATE truc_in_orders
      SET cong_no_khach = CASE WHEN COALESCE(da_tat_toan, FALSE) THEN 0 ELSE GREATEST(COALESCE(thanh_tien_ban, 0), 0) END
    `);
    writeLogToFile('info', 'Đã đồng bộ schema và công nợ các bảng đơn hàng.');
  } finally {
    await pool.query('SET lock_timeout = 0').catch(() => {});
  }
}

async function initDatabase() {
  if (!config.DATABASE_URL) {
    databaseStatus = { state: 'disconnected', error: 'Thiếu cấu hình DATABASE_URL' };
    return false;
  }

  databaseStatus = { state: 'connecting', error: '' };
  writeLogToFile('info', 'Đang khởi tạo Pool kết nối tới PostgreSQL Supabase...');
  if (dbPool) {
    await dbPool.end().catch(() => {});
    dbPool = undefined;
  }
  const nextPool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

  try {
    const result = await nextPool.query('SELECT NOW()');
    dbPool = nextPool;
    databaseStatus = { state: 'connected', error: '' };
    writeLogToFile('info', 'Kết nối thành công tới database Supabase! Thời gian: ' + result.rows[0].now);
    try {
      await runDatabaseMigrations(dbPool);
    } catch (migrationError) {
      writeLogToFile('error', 'Lỗi khởi tạo bảng/migration: ' + migrationError.message);
    }
    return true;
  } catch (error) {
    await nextPool.end().catch(() => {});
    dbPool = undefined;
    databaseStatus = { state: 'disconnected', error: error.message };
    writeLogToFile('critical', 'Lỗi khởi tạo Database Pool: ' + error.message);
    return false;
  }
}

function requireDatabasePool() {
  if (!dbPool || databaseStatus.state !== 'connected') {
    throw new Error(databaseStatus.error || 'Chưa kết nối cơ sở dữ liệu. Bấm badge Mây để nhập hoặc kiểm tra cấu hình.');
  }
  return dbPool;
}

function getAppIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return null;
}

async function exportDatabaseConfig(ownerWindow = mainWindow) {
  try {
    const warning = await dialog.showMessageBox(ownerWindow || undefined, {
      type: 'warning',
      title: 'Xuất cấu hình dữ liệu',
      message: 'Tệp cấu hình chứa thông tin kết nối riêng.',
      detail: 'Chỉ chuyển trực tiếp sang máy tin cậy. Không gửi lên GitHub, email công khai hoặc nhóm chat.',
      buttons: ['Tiếp tục xuất', 'Hủy'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });
    if (warning.response !== 0) return { ok: false, canceled: true };

    const destination = await dialog.showSaveDialog(ownerWindow || undefined, {
      title: 'Lưu cấu hình để chuyển sang máy mới',
      defaultPath: 'Cau_hinh_Bang_Keo.json',
      filters: [{ name: 'Cấu hình JSON', extensions: ['json'] }]
    });
    if (destination.canceled || !destination.filePath) return { ok: false, canceled: true };

    fs.writeFileSync(destination.filePath, JSON.stringify(currentPortableConfig(), null, 2), {
      encoding: 'utf8',
      mode: 0o600
    });
    return { ok: true, exported: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function showDatabaseConfigManager(ownerWindow = mainWindow) {
  const choice = await dialog.showMessageBox(ownerWindow || undefined, {
    type: databaseStatus.state === 'connected' ? 'info' : 'warning',
    title: 'Kết nối dữ liệu',
    message: databaseStatus.state === 'connected' ? 'Cơ sở dữ liệu đang kết nối.' : 'Cơ sở dữ liệu chưa kết nối.',
    detail: databaseStatus.error || 'Bạn có thể kiểm tra, xuất cấu hình cho máy mới hoặc nhập cấu hình đã có.',
    buttons: ['Kiểm tra kết nối', 'Xuất cấu hình', 'Nhập cấu hình', 'Đóng'],
    defaultId: 0,
    cancelId: 3,
    noLink: true
  });

  if (choice.response === 0) {
    let connected = false;
    try {
      await requireDatabasePool().query('SELECT 1');
      connected = true;
    } catch (_) {
      connected = await initDatabase();
    }
    return { ok: connected, connected, error: databaseStatus.error };
  }
  if (choice.response === 1) return exportDatabaseConfig(ownerWindow);
  if (choice.response === 2) {
    const imported = await importDatabaseConfig(ownerWindow);
    if (imported.ok) {
      await dialog.showMessageBox(ownerWindow || undefined, {
        type: 'info',
        title: 'Đã nhập cấu hình',
        message: 'Phần mềm sẽ khởi động lại để kết nối dữ liệu.'
      });
      relaunchApplication();
    }
    return imported;
  }
  return { ok: true, canceled: true, connected: databaseStatus.state === 'connected' };
}

async function showDatabaseRecoveryDialog() {
  if (!mainWindow || mainWindow.isDestroyed() || databaseStatus.state === 'connected') return;
  const choice = await dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: 'Không thể kết nối dữ liệu',
    message: 'Phần mềm chưa thể tải đơn hàng và thống kê.',
    detail: databaseStatus.error || 'Hãy kiểm tra Internet hoặc nhập lại cấu hình dữ liệu.',
    buttons: ['Thử kết nối lại', 'Nhập cấu hình', 'Đóng'],
    defaultId: 0,
    cancelId: 2,
    noLink: true
  });

  if (choice.response === 0) {
    const connected = await initDatabase();
    if (connected && mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
  } else if (choice.response === 1) {
    const imported = await importDatabaseConfig(mainWindow);
    if (imported.ok) relaunchApplication();
  }
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
    mainWindow.webContents.send('database-status', databaseStatus);
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

  ipcMain.handle('get-database-status', () => ({
    connected: databaseStatus.state === 'connected',
    state: databaseStatus.state,
    error: databaseStatus.error
  }));

  ipcMain.handle('manage-database-config', () => showDatabaseConfigManager(mainWindow));

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
      const validatedSql = validateRendererSql(sql, ['SELECT']);
      const res = await requireDatabasePool().query(validatedSql, params);
      return { ok: true, rows: res.rows };
    } catch (err) {
      writeLogToFile('error', `Lỗi DB Query: ${sql} | Lỗi: ${err.message}`);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('db-run', async (event, sql, params) => {
    try {
      const validatedSql = validateRendererSql(sql, ['INSERT', 'UPDATE', 'DELETE']);
      const res = await requireDatabasePool().query(validatedSql, params);
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

    let client;
    try {
      client = await requireDatabasePool().connect();
      await client.query('BEGIN');
      await client.query('SET LOCAL lock_timeout = 3000');
      const results = [];
      for (const statement of statements) {
        if (!statement || typeof statement.sql !== 'string') {
          throw new Error('Câu lệnh transaction không hợp lệ');
        }
        const validatedSql = validateRendererSql(statement.sql, ['INSERT', 'UPDATE', 'DELETE']);
        const result = await client.query(validatedSql, statement.params || []);
        results.push({ rowCount: result.rowCount, rows: result.rows });
      }
      await client.query('COMMIT');
      return { ok: true, results };
    } catch (err) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      writeLogToFile('error', `Lỗi DB Transaction: ${err.message}`);
      return { ok: false, error: err.message };
    } finally {
      if (client) client.release();
    }
  });

  // --- GỬI EMAIL QUA SMTP GMAIL ---
  ipcMain.handle('send-email', async (event, toAddress, subject, body, htmlBody, attachments, dbAttachmentIds) => {
    try {
      const email = validateEmailPayload({ toAddress, subject, body, htmlBody, attachments, dbAttachmentIds });
      if (!config.EMAIL_CONFIG.username || !config.EMAIL_CONFIG.password || !config.EMAIL_CONFIG.sender) {
        throw new Error('Thiếu cấu hình SMTP trong biến môi trường hoặc config.local.json');
      }
      writeLogToFile('info', `Đang chuẩn bị gửi email tới: ${email.toAddress}`);
      
      const transporter = nodemailer.createTransport({
        host: config.EMAIL_CONFIG.server,
        port: config.EMAIL_CONFIG.port,
        secure: config.EMAIL_CONFIG.port === 465, // true nếu là 465
        auth: {
          user: config.EMAIL_CONFIG.username,
          pass: config.EMAIL_CONFIG.password
        },
        disableFileAccess: true,
        disableUrlAccess: true
      });

      // Xử lý chuyển đổi attachments từ Base64 sang Buffer nhị phân
      let totalAttachmentBytes = email.estimatedBytes;
      const processedAttachments = email.attachments.map(att => {
        return {
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          contentType: att.contentType
        };
      });

      // Lấy thêm attachments từ database nếu có
      if (email.dbAttachmentIds.length > 0) {
        writeLogToFile('info', `Đang nạp ${email.dbAttachmentIds.length} tệp đính kèm từ database...`);
        for (const attId of email.dbAttachmentIds) {
          const dbRes = await requireDatabasePool().query(
            'SELECT file_name, data, content_type FROM order_attachments WHERE id = $1',
            [attId]
          );
          if (dbRes.rows.length > 0) {
            const row = dbRes.rows[0];
            totalAttachmentBytes += row.data?.length || 0;
            if (totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
              throw new Error('Tổng tệp đính kèm vượt quá 25 MB');
            }
            processedAttachments.push({
              filename: sanitizeAttachmentName(row.file_name),
              content: row.data, // row.data is a Node Buffer since pg returns bytea as Buffer
              contentType: row.content_type || 'application/octet-stream'
            });
            writeLogToFile('info', `Đã đính kèm tệp DB: ${row.file_name}`);
          }
        }
      }

      const mailOptions = {
        from: config.EMAIL_CONFIG.sender,
        to: email.toAddress,
        subject: email.subject,
        text: email.body,
        html: email.htmlBody,
        attachments: processedAttachments,
        disableFileAccess: true,
        disableUrlAccess: true
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
  ipcMain.handle('read-file-base64', async (event, filePath, purpose = 'attachment') => {
    try {
      if (!consumeApprovedPath(approvedReadPaths, filePath)) {
        throw new Error('Tệp chưa được người dùng cấp quyền đọc');
      }

      const stats = await fs.promises.stat(filePath);
      const isExcel = purpose === 'excel';
      const maxBytes = isExcel ? 15 * 1024 * 1024 : 25 * 1024 * 1024;
      const extension = path.extname(filePath).toLowerCase();
      if (isExcel && !['.xlsx', '.xls'].includes(extension)) {
        throw new Error('Chỉ hỗ trợ tệp Excel .xlsx hoặc .xls');
      }
      if (!stats.isFile() || stats.size > maxBytes) {
        throw new Error(`Tệp vượt quá giới hạn ${Math.round(maxBytes / 1024 / 1024)} MB`);
      }

      const data = await fs.promises.readFile(filePath);
      return {
        ok: true,
        data: data.toString('base64'),
        name: path.basename(filePath),
        size: stats.size
      };
    } catch (err) {
      writeLogToFile('error', 'Lỗi đọc file ra base64: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  // --- IN ẤN PDF BÁO GIÁ ---
  ipcMain.handle('write-file-base64', async (event, filePath, base64Data) => {
    try {
      if (!consumeApprovedPath(approvedWritePaths, filePath)) {
        throw new Error('Đường dẫn chưa được người dùng cấp quyền ghi');
      }
      if (path.extname(filePath).toLowerCase() !== '.xlsx') {
        throw new Error('Chỉ hỗ trợ xuất tệp Excel .xlsx');
      }
      const output = Buffer.from(String(base64Data || ''), 'base64');
      if (output.length === 0 || output.length > 50 * 1024 * 1024) {
        throw new Error('Dữ liệu Excel không hợp lệ hoặc vượt quá 50 MB');
      }
      await fs.promises.writeFile(filePath, output);
      return { ok: true };
    } catch (err) {
      writeLogToFile('error', 'Loi ghi file base64: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('print-to-pdf', async (event, htmlContent, savePath) => {
    try {
      if (!consumeApprovedPath(approvedWritePaths, savePath)) {
        throw new Error('Đường dẫn chưa được người dùng cấp quyền ghi PDF');
      }
      if (path.extname(savePath).toLowerCase() !== '.pdf') {
        throw new Error('Chỉ hỗ trợ xuất tệp PDF .pdf');
      }
      if (typeof htmlContent !== 'string' || htmlContent.length > 5 * 1024 * 1024) {
        throw new Error('Nội dung PDF không hợp lệ hoặc quá lớn');
      }
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
    if (!result.canceled && result.filePath) {
      approvedWritePaths.add(approvedPathKey(result.filePath));
    }
    return result;
  });

  ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    if (!result.canceled && Array.isArray(result.filePaths)) {
      result.filePaths.forEach(filePath => approvedReadPaths.add(approvedPathKey(filePath)));
    }
    return result;
  });
}

// 5. VÒNG ĐỜI HỆ THỐNG
app.whenReady().then(async () => {
  writeLogToFile('info', 'Ứng dụng đã khởi động.');
  const configured = await ensureStartupConfiguration();
  if (!configured) {
    if (!app.isQuitting) app.quit();
    return;
  }
  const connected = await initDatabase();
  setupIpcHandlers();
  createWindow();
  if (!connected) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(showDatabaseRecoveryDialog, 300);
    });
  }

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
