// MAIN.JS - TIẾN TRÌNH CHÍNH (BACKEND DESKTOP SHELL)
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');
const { app, BrowserWindow, Menu, ipcMain, shell, dialog, nativeImage, session } = require('electron');

// Tệp cấu hình người dùng nằm trong userData (đường dẫn thực tế phụ thuộc productName khi đóng gói).
// Phải đặt TAPE_CONFIG_PATH TRƯỚC khi require('./config') để cấu hình đã nhập được đọc lại sau khi khởi động lại.
const USER_CONFIG_PATH = process.env.TAPE_CONFIG_PATH || path.join(app.getPath('userData'), 'config.local.json');
process.env.TAPE_CONFIG_PATH = USER_CONFIG_PATH;

const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const config = require('./config');
const { validateRendererSql, summarizeSqlForLog, toPublicDbError } = require('./dbPolicy');
const { MAX_TOTAL_ATTACHMENT_BYTES, sanitizeAttachmentName, smtpSecurityOptions, validateEmailPayload } = require('./emailPolicy');
const {
  isTrustedAppUrl,
  isTrustedIpcSender,
  normalizeLogEntry,
  sanitizeDialogOptions,
  validateExternalUrl
} = require('./ipcPolicy');
const { setupAutoUpdater, checkForUpdatesManual } = require('./updater');

// Tăng heap size để tối ưu hiệu năng
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow;
let dbPool;
let initDatabasePromise = null;
let insecureSslWarned = false;
let databaseStatus = { state: 'disconnected', error: '' };
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const APP_INDEX_PATH = path.join(__dirname, 'index.html');
const APP_INDEX_URL = pathToFileURL(APP_INDEX_PATH).toString();
const PDF_PARTITION = 'pdf-export';
const PDF_TIMEOUT_MS = 30000;
const APPROVED_PATH_TTL_MS = 10 * 60 * 1000;
// Đường dẫn được người dùng chọn qua hộp thoại: dùng một lần, hết hạn sau 10 phút
const approvedReadPaths = new Map();
const approvedWritePaths = new Map();

function approvedPathKey(filePath) {
  return path.resolve(String(filePath || '')).toLowerCase();
}

function pruneApprovedPaths(approvedPaths) {
  const now = Date.now();
  for (const [key, expiresAt] of approvedPaths) {
    if (expiresAt <= now) approvedPaths.delete(key);
  }
}

function approvePath(approvedPaths, filePath) {
  pruneApprovedPaths(approvedPaths);
  approvedPaths.set(approvedPathKey(filePath), Date.now() + APPROVED_PATH_TTL_MS);
}

function consumeApprovedPath(approvedPaths, filePath) {
  if (typeof filePath !== 'string' || !filePath) return false;
  pruneApprovedPaths(approvedPaths);
  const key = approvedPathKey(filePath);
  if (!key || !approvedPaths.has(key)) return false;
  approvedPaths.delete(key);
  return true;
}

function appError(message) {
  const error = new Error(message);
  error.isAppError = true;
  return error;
}

function validatePortableConfig(payload, { requireDatabaseUrl = true } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Tệp cấu hình phải là JSON hợp lệ');
  }

  const databaseUrl = String(payload.DATABASE_URL || '').trim();
  if ((requireDatabaseUrl || databaseUrl) && !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error('DATABASE_URL phải là địa chỉ PostgreSQL hợp lệ');
  }

  const email = payload.EMAIL_CONFIG && typeof payload.EMAIL_CONFIG === 'object'
    ? payload.EMAIL_CONFIG
    : {};
  const result = {};
  if (databaseUrl) result.DATABASE_URL = databaseUrl;
  if (typeof payload.DATABASE_SSL_CA === 'string' && payload.DATABASE_SSL_CA.trim()) {
    result.DATABASE_SSL_CA = payload.DATABASE_SSL_CA.trim();
  }
  result.EMAIL_CONFIG = {
    server: String(email.server || 'smtp.gmail.com').trim(),
    port: config.parseSmtpPort(email.port),
    username: String(email.username || '').trim(),
    password: String(email.password || ''),
    sender: String(email.sender || '').trim()
  };
  return result;
}

async function readPortableConfig(filePath) {
  return validatePortableConfig(JSON.parse(await fs.promises.readFile(filePath, 'utf8')));
}

function currentPortableConfig() {
  return validatePortableConfig({
    DATABASE_URL: config.DATABASE_URL,
    DATABASE_SSL_CA: config.FILE_VALUES.DATABASE_SSL_CA,
    EMAIL_CONFIG: config.EMAIL_CONFIG
  });
}

async function writeUserConfig(data) {
  await fs.promises.mkdir(path.dirname(USER_CONFIG_PATH), { recursive: true });
  // Ghi nguyên tử: ghi tệp tạm cùng thư mục rồi đổi tên, tránh để lại tệp cấu hình hỏng khi mất điện/treo máy.
  const tempPath = `${USER_CONFIG_PATH}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.promises.rename(tempPath, USER_CONFIG_PATH);
  } catch (error) {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function importDatabaseConfig(ownerWindow = null) {
  const result = await dialog.showOpenDialog(ownerWindow || undefined, {
    title: 'Chọn cấu hình dữ liệu Băng Keo',
    properties: ['openFile'],
    filters: [{ name: 'Cấu hình JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };

  try {
    const raw = JSON.parse(await fs.promises.readFile(result.filePaths[0], 'utf8'));
    const imported = validatePortableConfig(raw);
    // Tệp nhập không có EMAIL_CONFIG: giữ nguyên cấu hình SMTP đang có, không xoá tài khoản/mật khẩu.
    const hasEmailConfig = raw && typeof raw === 'object' && raw.EMAIL_CONFIG && typeof raw.EMAIL_CONFIG === 'object';
    if (!hasEmailConfig) {
      const existing = await readUserConfigFile();
      if (existing.EMAIL_CONFIG && typeof existing.EMAIL_CONFIG === 'object') {
        imported.EMAIL_CONFIG = validatePortableConfig({ EMAIL_CONFIG: existing.EMAIL_CONFIG }, { requireDatabaseUrl: false }).EMAIL_CONFIG;
      }
    }
    await writeUserConfig(imported);
    writeLogToFile('info', `Đã nhập cấu hình dữ liệu vào ${USER_CONFIG_PATH}`);
    return { ok: true };
  } catch (error) {
    await dialog.showMessageBox(ownerWindow || undefined, {
      type: 'error',
      title: 'Cấu hình không hợp lệ',
      message: 'Không thể nhập cấu hình dữ liệu',
      detail: error.message
    });
    return { ok: false, error: error.message, dialogShown: true };
  }
}

function relaunchApplication() {
  app.relaunch();
  app.exit(0);
}

async function ensureStartupConfiguration() {
  if (config.DATABASE_URL) return true;

  const detail = [
    config.CONFIG_ERROR ? `Tệp cấu hình hiện tại bị lỗi: ${config.CONFIG_ERROR}` : '',
    'Trên máy đang hoạt động, bấm badge “Mây” và chọn “Xuất cấu hình”. Sau đó chuyển tệp JSON sang máy này và chọn “Nhập cấu hình”.'
  ].filter(Boolean).join('\n\n');

  const choice = await dialog.showMessageBox({
    type: 'warning',
    title: 'Chưa có cấu hình dữ liệu',
    message: 'Phần mềm chưa được kết nối với cơ sở dữ liệu.',
    detail,
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
    const normalized = normalizeLogEntry(level, message);
    ensureLogDir();
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOG_DIR, `app_${today}.log`);
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${normalized.level.toUpperCase()}] ${normalized.message}\n`;
    fs.appendFileSync(logFile, logLine, 'utf8');
    console.log(logLine.trim());
  } catch (err) {
    console.error('Lỗi ghi file log:', err);
  }
}

// 2. KHỞI TẠO KẾT NỐI SUPABASE POSTGRESQL
// Tăng SCHEMA_VERSION mỗi khi thay đổi cột/trigger/backfill bên dưới để migration chạy lại một lần.
const SCHEMA_VERSION = 1;
const MIGRATION_LOCK_KEY = 482917301; // khóa advisory để nhiều máy không migrate cùng lúc

async function runDatabaseMigrations(pool) {
  const client = await pool.connect();
  try {
    // Tạo bảng phụ ngoài transaction migration: lỗi migration phía sau không làm mất bảng email_history.
    // Hai máy cùng tạo một lúc có thể gặp 42P07/23505 (trùng pg_type) — bảng đã có thì bỏ qua.
    const auxTables = [`
      CREATE TABLE IF NOT EXISTS email_history (
        id SERIAL PRIMARY KEY,
        email_address VARCHAR(255) NOT NULL,
        last_sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        sent_count INTEGER DEFAULT 1
      )
    `, `
      CREATE TABLE IF NOT EXISTS app_schema_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `];
    for (const sql of auxTables) {
      try {
        await client.query(sql);
      } catch (error) {
        if (error.code !== '42P07' && error.code !== '23505') throw error;
      }
    }
    writeLogToFile('info', 'Đã kiểm tra/khởi tạo bảng email_history thành công.');

    await client.query('BEGIN');
    // SET LOCAL chỉ có hiệu lực trong transaction này, không rò sang client khác của pool
    await client.query('SET LOCAL lock_timeout = 2000');

    const lock = await client.query('SELECT pg_try_advisory_xact_lock($1) AS locked', [MIGRATION_LOCK_KEY]);
    if (!lock.rows[0]?.locked) {
      await client.query('COMMIT');
      writeLogToFile('info', 'Máy khác đang đồng bộ schema, bỏ qua migration lần này.');
      return;
    }

    const versionRes = await client.query(`SELECT value FROM app_schema_meta WHERE key = 'schema_version'`);
    const currentVersion = Number(versionRes.rows[0]?.value || 0);
    if (currentVersion >= SCHEMA_VERSION) {
      await client.query('COMMIT');
      writeLogToFile('info', `Schema đã ở phiên bản ${currentVersion}, không cần migration.`);
      return;
    }

    for (const table of ['bang_keo_in_orders', 'bang_keo_orders', 'truc_in_orders']) {
      await client.query(`
        ALTER TABLE ${table}
          ADD COLUMN IF NOT EXISTS cong_no_ncc NUMERIC DEFAULT 0,
          ADD COLUMN IF NOT EXISTS is_quote BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS vat NUMERIC DEFAULT 0,
          ADD COLUMN IF NOT EXISTS vat_percent NUMERIC DEFAULT 0,
          ADD COLUMN IF NOT EXISTS quote_items JSONB DEFAULT '[]'::jsonb
      `);
    }
    await client.query(`
      ALTER TABLE bang_keo_in_orders
        ADD COLUMN IF NOT EXISTS truc_vat NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS truc_vat_percent NUMERIC DEFAULT 0,
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

    // Suy ra % VAT cho đơn cũ chưa có; làm tròn 2 chữ số để tránh 7.9999
    await client.query(`UPDATE bang_keo_in_orders SET vat_percent = ROUND((vat::numeric / thanh_tien_ban::numeric) * 100, 2) WHERE (vat_percent IS NULL OR vat_percent = 0) AND vat > 0 AND thanh_tien_ban > 0`);
    await client.query(`UPDATE bang_keo_in_orders SET truc_vat_percent = ROUND((truc_vat::numeric / truc_thanh_tien_ban::numeric) * 100, 2) WHERE (truc_vat_percent IS NULL OR truc_vat_percent = 0) AND truc_vat > 0 AND truc_thanh_tien_ban > 0`);
    await client.query(`UPDATE bang_keo_orders SET vat_percent = ROUND((vat::numeric / thanh_tien_ban::numeric) * 100, 2) WHERE (vat_percent IS NULL OR vat_percent = 0) AND vat > 0 AND thanh_tien_ban > 0`);
    await client.query(`UPDATE truc_in_orders SET vat_percent = ROUND((vat::numeric / thanh_tien_ban::numeric) * 100, 2) WHERE (vat_percent IS NULL OR vat_percent = 0) AND vat > 0 AND thanh_tien_ban > 0`);

    // Chỉ tính hoa hồng trục cho dòng chưa từng được tính (NULL); không ghi đè báo giá nhiều trục
    await client.query(`
      UPDATE bang_keo_in_orders
      SET truc_tien_hoa_hong = GREATEST(COALESCE(truc_loi_nhuan, 0), 0) * LEAST(GREATEST(COALESCE(truc_hoa_hong, 0), 0), 100) / 100
      WHERE COALESCE(loai_truc, 'cu') = 'moi' AND truc_tien_hoa_hong IS NULL
    `);

    // Backfill công nợ: chỉ cập nhật dòng lệch giá trị (chạy một lần cho mỗi SCHEMA_VERSION)
    const printedCustomerDebt = `CASE
        WHEN COALESCE(da_tat_toan, FALSE) THEN 0
        ELSE GREATEST(COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) + COALESCE(truc_vat, 0) ELSE 0 END + COALESCE(vat, 0) - COALESCE(tien_coc, 0), 0)
      END`;
    const standardCustomerDebt = `CASE WHEN COALESCE(da_tat_toan, FALSE) THEN 0 ELSE GREATEST(COALESCE(thanh_tien_ban, 0) + COALESCE(vat, 0), 0) END`;
    await client.query(`UPDATE bang_keo_in_orders SET cong_no_khach = ${printedCustomerDebt} WHERE cong_no_khach IS DISTINCT FROM ${printedCustomerDebt}`);
    await client.query(`UPDATE bang_keo_orders SET cong_no_khach = ${standardCustomerDebt} WHERE cong_no_khach IS DISTINCT FROM ${standardCustomerDebt}`);
    await client.query(`UPDATE truc_in_orders SET cong_no_khach = ${standardCustomerDebt} WHERE cong_no_khach IS DISTINCT FROM ${standardCustomerDebt}`);

    await client.query(`
      CREATE OR REPLACE FUNCTION sync_printed_tape_customer_debt() RETURNS TRIGGER AS $$
      BEGIN
        NEW.cong_no_khach := CASE WHEN COALESCE(NEW.da_tat_toan, FALSE) THEN 0
          ELSE GREATEST(COALESCE(NEW.thanh_tien_ban, 0) + CASE WHEN NEW.loai_truc = 'moi' THEN COALESCE(NEW.truc_thanh_tien_ban, 0) + COALESCE(NEW.truc_vat, 0) ELSE 0 END + COALESCE(NEW.vat, 0) - COALESCE(NEW.tien_coc, 0), 0) END;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trg_sync_customer_debt ON bang_keo_in_orders;
      CREATE TRIGGER trg_sync_customer_debt BEFORE INSERT OR UPDATE OF thanh_tien_ban, truc_thanh_tien_ban, truc_vat, loai_truc, vat, tien_coc, da_tat_toan
      ON bang_keo_in_orders FOR EACH ROW EXECUTE FUNCTION sync_printed_tape_customer_debt();
    `);
    await client.query(`
      CREATE OR REPLACE FUNCTION sync_standard_customer_debt() RETURNS TRIGGER AS $$
      BEGIN
        NEW.cong_no_khach := CASE WHEN COALESCE(NEW.da_tat_toan, FALSE) THEN 0
          ELSE GREATEST(COALESCE(NEW.thanh_tien_ban, 0) + COALESCE(NEW.vat, 0), 0) END;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trg_sync_customer_debt ON bang_keo_orders;
      CREATE TRIGGER trg_sync_customer_debt BEFORE INSERT OR UPDATE OF thanh_tien_ban, vat, da_tat_toan
      ON bang_keo_orders FOR EACH ROW EXECUTE FUNCTION sync_standard_customer_debt();
      DROP TRIGGER IF EXISTS trg_sync_customer_debt ON truc_in_orders;
      CREATE TRIGGER trg_sync_customer_debt BEFORE INSERT OR UPDATE OF thanh_tien_ban, vat, da_tat_toan
      ON truc_in_orders FOR EACH ROW EXECUTE FUNCTION sync_standard_customer_debt();
    `);

    const printedSupplierDebt = `CASE WHEN COALESCE(da_tat_toan, FALSE) THEN 0
        ELSE GREATEST(COALESCE(thanh_tien_goc, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_goc, 0) ELSE 0 END, 0) END`;
    const standardSupplierDebt = `CASE WHEN COALESCE(da_tat_toan, FALSE) THEN 0
        ELSE GREATEST(COALESCE(thanh_tien, 0), 0) END`;
    const axisSupplierDebt = `CASE WHEN COALESCE(da_tat_toan, FALSE) THEN 0
        ELSE GREATEST(COALESCE(thanh_tien_goc, 0), 0) END`;
    await client.query(`UPDATE bang_keo_in_orders SET cong_no_ncc = ${printedSupplierDebt} WHERE cong_no_ncc IS DISTINCT FROM ${printedSupplierDebt}`);
    await client.query(`UPDATE bang_keo_orders SET cong_no_ncc = ${standardSupplierDebt} WHERE cong_no_ncc IS DISTINCT FROM ${standardSupplierDebt}`);
    await client.query(`UPDATE truc_in_orders SET cong_no_ncc = ${axisSupplierDebt} WHERE cong_no_ncc IS DISTINCT FROM ${axisSupplierDebt}`);

    await client.query(`
      CREATE OR REPLACE FUNCTION sync_printed_tape_supplier_debt() RETURNS TRIGGER AS $$
      BEGIN
        NEW.cong_no_ncc := CASE WHEN COALESCE(NEW.da_tat_toan, FALSE) THEN 0
          ELSE GREATEST(COALESCE(NEW.thanh_tien_goc, 0) + CASE WHEN NEW.loai_truc = 'moi' THEN COALESCE(NEW.truc_thanh_tien_goc, 0) ELSE 0 END, 0) END;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trg_sync_supplier_debt ON bang_keo_in_orders;
      CREATE TRIGGER trg_sync_supplier_debt BEFORE INSERT OR UPDATE OF thanh_tien_goc, truc_thanh_tien_goc, loai_truc, da_tat_toan
      ON bang_keo_in_orders FOR EACH ROW EXECUTE FUNCTION sync_printed_tape_supplier_debt();
    `);
    await client.query(`
      CREATE OR REPLACE FUNCTION sync_standard_supplier_debt() RETURNS TRIGGER AS $$
      BEGIN
        NEW.cong_no_ncc := CASE WHEN COALESCE(NEW.da_tat_toan, FALSE) THEN 0
          ELSE GREATEST(COALESCE(NEW.thanh_tien, 0), 0) END;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trg_sync_supplier_debt ON bang_keo_orders;
      CREATE TRIGGER trg_sync_supplier_debt BEFORE INSERT OR UPDATE OF thanh_tien, da_tat_toan
      ON bang_keo_orders FOR EACH ROW EXECUTE FUNCTION sync_standard_supplier_debt();
      DROP TRIGGER IF EXISTS trg_sync_supplier_debt ON truc_in_orders;
      CREATE OR REPLACE FUNCTION sync_axis_supplier_debt() RETURNS TRIGGER AS $$
      BEGIN
        NEW.cong_no_ncc := CASE WHEN COALESCE(NEW.da_tat_toan, FALSE) THEN 0
          ELSE GREATEST(COALESCE(NEW.thanh_tien_goc, 0), 0) END;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER trg_sync_supplier_debt BEFORE INSERT OR UPDATE OF thanh_tien_goc, da_tat_toan
      ON truc_in_orders FOR EACH ROW EXECUTE FUNCTION sync_axis_supplier_debt();
    `);

    await client.query(`
      INSERT INTO app_schema_meta (key, value, updated_at) VALUES ('schema_version', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `, [String(SCHEMA_VERSION)]);
    await client.query('COMMIT');
    writeLogToFile('info', `Đã đồng bộ schema và công nợ các bảng đơn hàng (phiên bản ${SCHEMA_VERSION}).`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function buildPoolOptions() {
  const sslSettings = config.resolveDatabaseSsl(config.DATABASE_URL, config.DATABASE_SSL_CA);
  if (sslSettings.insecure && !insecureSslWarned) {
    insecureSslWarned = true;
    writeLogToFile('warning', 'Kết nối PostgreSQL dùng SSL nhưng KHÔNG xác thực chứng chỉ. Hãy cấu hình DATABASE_SSL_CA để bật xác thực.');
  }
  return {
    connectionString: sslSettings.connectionString,
    ssl: sslSettings.ssl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  };
}

async function initDatabaseOnce() {
  if (!config.DATABASE_URL) {
    databaseStatus = { state: 'disconnected', error: 'Thiếu cấu hình DATABASE_URL' };
    return false;
  }

  // Pool hiện tại vẫn hoạt động thì giữ nguyên, không đóng khi đang có truy vấn
  if (dbPool) {
    try {
      await dbPool.query('SELECT 1');
      databaseStatus = { state: 'connected', error: '' };
      return true;
    } catch (_) {
      // Pool cũ hỏng, tạo pool mới bên dưới
    }
  }

  databaseStatus = { state: 'connecting', error: '' };
  writeLogToFile('info', 'Đang khởi tạo Pool kết nối tới PostgreSQL Supabase...');
  const nextPool = new Pool(buildPoolOptions());
  // Lỗi của client rảnh trong pool (mất mạng, server ngắt) không được làm sập tiến trình chính
  nextPool.on('error', (error) => {
    writeLogToFile('error', `Lỗi kết nối PostgreSQL (client rảnh): ${error.code || ''} ${error.message}`);
  });

  try {
    const result = await nextPool.query('SELECT NOW()');
    const previousPool = dbPool;
    dbPool = nextPool;
    databaseStatus = { state: 'connected', error: '' };
    if (previousPool && previousPool !== nextPool) {
      previousPool.end().catch(() => {});
    }
    writeLogToFile('info', 'Kết nối thành công tới database Supabase! Thời gian: ' + result.rows[0].now);
    try {
      await runDatabaseMigrations(dbPool);
    } catch (migrationError) {
      writeLogToFile('error', 'Lỗi khởi tạo bảng/migration: ' + migrationError.message);
    }
    return true;
  } catch (error) {
    await nextPool.end().catch(() => {});
    if (dbPool) {
      const brokenPool = dbPool;
      dbPool = undefined;
      brokenPool.end().catch(() => {});
    }
    databaseStatus = { state: 'disconnected', error: toPublicDbError(error).error };
    writeLogToFile('critical', 'Lỗi khởi tạo Database Pool: ' + error.message);
    return false;
  }
}

// Dùng chung một promise khi nhiều nơi cùng yêu cầu kết nối lại
function initDatabase() {
  if (!initDatabasePromise) {
    initDatabasePromise = initDatabaseOnce().finally(() => {
      initDatabasePromise = null;
    });
  }
  return initDatabasePromise;
}

function requireDatabasePool() {
  if (!dbPool || databaseStatus.state !== 'connected') {
    throw appError(databaseStatus.error || 'Chưa kết nối cơ sở dữ liệu. Bấm badge Mây để nhập hoặc kiểm tra cấu hình.');
  }
  return dbPool;
}

function getAppIcon() {
  const iconPath = path.join(__dirname, 'assets', 'app-icon.png');
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

    await fs.promises.writeFile(destination.filePath, JSON.stringify(currentPortableConfig(), null, 2), {
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
  let retryFailed = false;
  // Lặp lại hộp thoại khi "Thử kết nối lại" thất bại, đến khi kết nối được hoặc người dùng chọn thao tác khác.
  while (mainWindow && !mainWindow.isDestroyed() && databaseStatus.state !== 'connected') {
    const reason = databaseStatus.error || 'Hãy kiểm tra Internet hoặc nhập lại cấu hình dữ liệu.';
    const choice = await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Không thể kết nối dữ liệu',
      message: retryFailed ? 'Thử kết nối lại không thành công.' : 'Phần mềm chưa thể tải đơn hàng và thống kê.',
      detail: retryFailed ? `Lỗi: ${reason}` : reason,
      buttons: ['Thử kết nối lại', 'Nhập cấu hình', 'Đóng'],
      defaultId: 0,
      cancelId: 2,
      noLink: true
    });

    if (choice.response === 0) {
      const connected = await initDatabase();
      if (connected) {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
        return;
      }
      retryFailed = true;
      continue;
    }
    if (choice.response === 1) {
      const imported = await importDatabaseConfig(mainWindow);
      if (imported.ok) relaunchApplication();
    }
    return;
  }
}

// Chặn mở cửa sổ mới và điều hướng ra ngoài; liên kết http/https mở bằng trình duyệt hệ thống
function hardenWebContents(contents, isAllowedNavigation) {
  contents.setWindowOpenHandler(({ url }) => {
    try {
      const safeUrl = validateExternalUrl(url);
      shell.openExternal(safeUrl).catch(err => writeLogToFile('error', 'Lỗi mở URL ngoài: ' + err.message));
    } catch (_) {
      writeLogToFile('warning', 'Đã chặn mở cửa sổ mới không hợp lệ');
    }
    return { action: 'deny' };
  });

  const guardNavigation = (event, legacyUrl) => {
    const targetUrl = typeof event?.url === 'string' ? event.url : legacyUrl;
    if (!isAllowedNavigation(targetUrl)) {
      event.preventDefault();
      writeLogToFile('warning', `Đã chặn điều hướng tới ${String(targetUrl || '').slice(0, 200)}`);
    }
  };
  contents.on('will-navigate', guardNavigation);
  contents.on('will-redirect', guardNavigation);
  contents.on('will-attach-webview', (event) => event.preventDefault());
}

// Kiểm tra mọi yêu cầu IPC chỉ đến từ trang index.html của cửa sổ chính
function assertTrustedSender(event) {
  const trusted = isTrustedIpcSender({
    senderWebContents: event?.sender,
    mainWebContents: mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : null,
    senderFrame: event?.senderFrame,
    appIndexUrl: APP_INDEX_URL
  });
  if (!trusted) {
    writeLogToFile('warning', `Đã từ chối IPC từ nguồn không tin cậy: ${String(event?.senderFrame?.url || 'unknown').slice(0, 200)}`);
    throw new Error('Yêu cầu IPC không hợp lệ');
  }
}

function handleTrusted(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedSender(event);
    return handler(event, ...args);
  });
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

  hardenWebContents(mainWindow.webContents, url => isTrustedAppUrl(url, APP_INDEX_URL));

  // Electron mới: (event có message/level/lineNumber/sourceId); Electron cũ: (event, level, message, line, sourceId)
  mainWindow.webContents.on('console-message', (event, legacyLevel, legacyMessage, legacyLine, legacySourceId) => {
    const details = event && typeof event.message === 'string'
      ? event
      : (legacyLevel && typeof legacyLevel === 'object' ? legacyLevel : {});
    const rawLevel = details.level ?? legacyLevel;
    const message = details.message ?? legacyMessage ?? '';
    const line = details.lineNumber ?? details.line ?? legacyLine ?? 0;
    const sourceId = details.sourceId ?? legacySourceId ?? 'unknown';
    let level = 'info';
    if (rawLevel === 3 || rawLevel === 'error') level = 'error';
    else if (rawLevel === 2 || rawLevel === 'warning') level = 'warning';
    writeLogToFile(level, `Renderer: ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    writeLogToFile('critical', `Renderer đã dừng: ${details.reason} (${details.exitCode})`);
  });

  mainWindow.loadFile(APP_INDEX_PATH);

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

// Phiên riêng cho cửa sổ in PDF: chỉ cho phép tải file:// trong thư mục ứng dụng/tệp tạm và data:
let pdfSessionReady = false;
const pdfAllowedTempRoots = new Set();
function getPdfSession() {
  const pdfSession = session.fromPartition(PDF_PARTITION);
  if (!pdfSessionReady) {
    pdfSessionReady = true;
    pdfSession.webRequest.onBeforeRequest((details, callback) => {
      const url = String(details.url || '');
      if (/^data:/i.test(url)) return callback({ cancel: false });
      if (/^file:/i.test(url)) {
        try {
          const filePath = decodeURIComponent(new URL(url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
          const resolved = path.resolve(filePath).toLowerCase();
          const roots = [path.resolve(__dirname).toLowerCase(), ...pdfAllowedTempRoots];
          const allowed = roots.some(root => resolved === root || resolved.startsWith(root + path.sep));
          return callback({ cancel: !allowed });
        } catch (_) {
          return callback({ cancel: true });
        }
      }
      return callback({ cancel: true });
    });
    pdfSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  }
  return pdfSession;
}

// Thêm <base> để đường dẫn tương đối (vd: assets/logo.png) trỏ về thư mục ứng dụng
function withAppBaseHref(htmlContent) {
  if (/<base\s/i.test(htmlContent)) return htmlContent;
  const baseTag = `<base href="${pathToFileURL(__dirname + path.sep).toString()}">`;
  if (/<head[^>]*>/i.test(htmlContent)) return htmlContent.replace(/<head[^>]*>/i, match => `${match}${baseTag}`);
  return baseTag + htmlContent;
}

async function renderHtmlToPdf(htmlContent, savePath) {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bangkeo-pdf-'));
  const htmlPath = path.join(tempDir, 'chung-tu.html');
  let pdfWindow = null;
  let timeoutHandle = null;

  try {
    await fs.promises.writeFile(htmlPath, withAppBaseHref(htmlContent), 'utf8');
    pdfAllowedTempRoots.add(path.resolve(tempDir).toLowerCase());
    const htmlUrl = pathToFileURL(htmlPath).toString();

    pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        javascript: false,
        webSecurity: true,
        session: getPdfSession() // phiên riêng từ partition PDF_PARTITION
      }
    });
    hardenWebContents(pdfWindow.webContents, url => isTrustedAppUrl(url, htmlUrl));

    const timeout = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Hết thời gian tạo PDF (30 giây)')), PDF_TIMEOUT_MS);
    });

    const work = (async () => {
      const contents = pdfWindow.webContents;
      const loaded = new Promise((resolve, reject) => {
        contents.once('did-finish-load', resolve);
        contents.on('did-fail-load', (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
          if (isMainFrame === false) return;
          reject(new Error(`Không tải được nội dung PDF: ${errorDescription} (${errorCode})`));
        });
      });
      pdfWindow.loadFile(htmlPath).catch(() => {}); // lỗi tải được xử lý qua did-fail-load
      await loaded;
      const pdfData = await contents.printToPDF({
        margins: {
          marginType: 'default'
        },
        printBackground: true,
        pageSize: 'A4',
        landscape: false
      });
      await fs.promises.writeFile(savePath, pdfData);
    })();
    work.catch(() => {});

    await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timeoutHandle);
    if (pdfWindow && !pdfWindow.isDestroyed()) pdfWindow.destroy();
    pdfAllowedTempRoots.delete(path.resolve(tempDir).toLowerCase());
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function createSmtpTransport(extraOptions = {}) {
  const security = smtpSecurityOptions(config.EMAIL_CONFIG.server, config.EMAIL_CONFIG.port);
  return nodemailer.createTransport({
    host: config.EMAIL_CONFIG.server,
    port: config.EMAIL_CONFIG.port,
    secure: security.secure, // true nếu là 465
    requireTLS: security.requireTLS, // bắt buộc STARTTLS khi không dùng 465 (trừ relay cục bộ)
    auth: {
      user: config.EMAIL_CONFIG.username,
      pass: config.EMAIL_CONFIG.password
    },
    ...extraOptions
  });
}

async function readUserConfigFile() {
  try {
    const parsed = JSON.parse(await fs.promises.readFile(USER_CONFIG_PATH, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

// 4. ĐĂNG KÝ CÁC TRÌNH XỬ LÝ IPC
function setupIpcHandlers() {
  // Lấy phiên bản
  handleTrusted('get-version', () => config.APP_VERSION);

  handleTrusted('get-database-status', () => ({
    connected: databaseStatus.state === 'connected',
    state: databaseStatus.state,
    error: databaseStatus.error
  }));

  handleTrusted('manage-database-config', () => showDatabaseConfigManager(mainWindow));

  handleTrusted('check-for-updates', async () => checkForUpdatesManual());

  // Mở URL ngoài trình duyệt
  handleTrusted('open-external', async (event, url) => {
    try {
      await shell.openExternal(validateExternalUrl(url));
      return { ok: true };
    } catch (err) {
      writeLogToFile('error', 'Lỗi mở URL ngoài: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  // Ghi log
  handleTrusted('write-log', (event, level, message) => {
    const normalized = normalizeLogEntry(level, message);
    writeLogToFile(normalized.level, normalized.message);
    return { ok: true };
  });

  // In ấn màn hình active
  handleTrusted('print-window', async (event) => {
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
  // Log chỉ ghi lệnh + bảng; renderer chỉ nhận thông báo ngắn và mã lỗi PostgreSQL (code)
  handleTrusted('db-query', async (event, sql, params) => {
    try {
      const validatedSql = validateRendererSql(sql, ['SELECT']);
      const res = await requireDatabasePool().query(validatedSql, Array.isArray(params) ? params : []);
      return { ok: true, rows: res.rows };
    } catch (err) {
      writeLogToFile('error', `Lỗi DB Query: ${summarizeSqlForLog(sql)} | Mã: ${err.code || '-'} | Lỗi: ${err.message}`);
      return { ok: false, ...toPublicDbError(err) };
    }
  });

  handleTrusted('db-run', async (event, sql, params) => {
    try {
      const validatedSql = validateRendererSql(sql, ['INSERT', 'UPDATE', 'DELETE']);
      const res = await requireDatabasePool().query(validatedSql, Array.isArray(params) ? params : []);
      return {
        ok: true,
        rowCount: res.rowCount,
        rows: res.rows,
        oid: res.oid
      };
    } catch (err) {
      writeLogToFile('error', `Lỗi DB Run: ${summarizeSqlForLog(sql)} | Mã: ${err.code || '-'} | Lỗi: ${err.message}`);
      return { ok: false, ...toPublicDbError(err) };
    }
  });

  handleTrusted('db-transaction', async (event, statements) => {
    if (!Array.isArray(statements) || statements.length === 0) {
      return { ok: false, error: 'Transaction không có câu lệnh' };
    }
    if (statements.length > 5000) {
      return { ok: false, error: 'Quá nhiều câu lệnh trong một lần (tối đa 5000 dòng), vui lòng chia nhỏ tệp' };
    }

    let client;
    let currentSql = '';
    try {
      // Kiểm tra toàn bộ câu lệnh trước khi mở kết nối
      const validated = statements.map(statement => {
        if (!statement || typeof statement.sql !== 'string') {
          throw appError('Câu lệnh transaction không hợp lệ');
        }
        currentSql = statement.sql;
        return {
          sql: validateRendererSql(statement.sql, ['INSERT', 'UPDATE', 'DELETE']),
          params: Array.isArray(statement.params) ? statement.params : []
        };
      });
      client = await requireDatabasePool().connect();
      await client.query('BEGIN');
      await client.query('SET LOCAL lock_timeout = 3000');
      const results = [];
      for (const statement of validated) {
        currentSql = statement.sql;
        const result = await client.query(statement.sql, statement.params);
        results.push({ rowCount: result.rowCount, rows: result.rows });
      }
      await client.query('COMMIT');
      return { ok: true, results };
    } catch (err) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      writeLogToFile('error', `Lỗi DB Transaction: ${summarizeSqlForLog(currentSql)} | Mã: ${err.code || '-'} | Lỗi: ${err.message}`);
      return { ok: false, ...toPublicDbError(err) };
    } finally {
      if (client) client.release();
    }
  });

  // --- GỬI EMAIL QUA SMTP GMAIL ---
  handleTrusted('send-email', async (event, toAddress, subject, body, htmlBody, attachments, dbAttachmentIds) => {
    try {
      // validateEmailPayload giải mã base64 và kiểm tra kích thước thật của từng tệp
      const email = validateEmailPayload({ toAddress, subject, body, htmlBody, attachments, dbAttachmentIds });
      if (!config.EMAIL_CONFIG.username || !config.EMAIL_CONFIG.password || !config.EMAIL_CONFIG.sender) {
        throw new Error('Thiếu cấu hình SMTP trong biến môi trường hoặc config.local.json');
      }
      writeLogToFile('info', `Đang chuẩn bị gửi email tới: ${email.toAddress}`);

      let totalAttachmentBytes = email.estimatedBytes;
      const processedAttachments = email.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
      }));

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
              contentType: String(row.content_type || 'application/octet-stream').replace(/[\r\n]/g, '')
            });
            writeLogToFile('info', `Đã đính kèm tệp DB: ${row.file_name}`);
          }
        }
      }

      // Xác nhận ở tiến trình chính trước khi gửi (renderer không thể tự gửi thầm lặng)
      const attachmentNames = processedAttachments.map(att => att.filename);
      const ownerWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
      const confirmation = await dialog.showMessageBox(ownerWindow || undefined, {
        type: 'question',
        title: 'Xác nhận gửi email',
        message: 'Bạn có chắc muốn gửi email này?',
        detail: [
          `Người nhận: ${email.toAddress}`,
          `Tiêu đề: ${email.subject}`,
          `Tệp đính kèm (${attachmentNames.length}): ${attachmentNames.length ? attachmentNames.join(', ').slice(0, 1500) : 'không có'}`
        ].join('\n'),
        buttons: ['Gửi', 'Hủy'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      });
      if (confirmation.response !== 0) {
        writeLogToFile('info', 'Người dùng đã hủy gửi email.');
        return { ok: false, canceled: true, error: 'Đã hủy gửi email' };
      }

      const transporter = createSmtpTransport({
        disableFileAccess: true,
        disableUrlAccess: true
      });

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

  handleTrusted('get-email-config', async () => ({
    ok: true,
    config: {
      server: config.EMAIL_CONFIG.server,
      port: config.EMAIL_CONFIG.port,
      username: config.EMAIL_CONFIG.username,
      sender: config.EMAIL_CONFIG.sender,
      hasPassword: Boolean(config.EMAIL_CONFIG.password)
    }
  }));

  handleTrusted('save-email-config', async (_event, payload = {}) => {
    try {
      const source = payload && typeof payload === 'object' ? payload : {};
      const server = String(source.server || '').trim();
      if (source.port === undefined || source.port === null || String(source.port).trim() === '') {
        throw new Error('Vui lòng nhập đủ máy chủ, cổng, tài khoản và mật khẩu SMTP');
      }
      const port = config.parseSmtpPort(source.port);
      const username = String(source.username || '').trim();
      const typedPassword = String(source.password || '');
      const runtimePassword = typedPassword || config.EMAIL_CONFIG.password;
      const sender = String(source.sender || '').trim() || `Phần Mềm Quản Lý Đơn Hàng <${username}>`;
      if (!server || !username || !runtimePassword) {
        throw new Error('Vui lòng nhập đủ máy chủ, cổng, tài khoản và mật khẩu SMTP');
      }

      // Chỉ ghi các khóa vốn có trong tệp hoặc do người dùng nhập; không ghi giá trị lấy từ biến môi trường
      const existing = await readUserConfigFile();
      const fileDatabaseUrl = existing.DATABASE_URL || config.FILE_VALUES.DATABASE_URL || '';
      const fileSslCa = existing.DATABASE_SSL_CA || config.FILE_VALUES.DATABASE_SSL_CA || '';
      const existingEmail = existing.EMAIL_CONFIG && typeof existing.EMAIL_CONFIG === 'object' ? existing.EMAIL_CONFIG : {};
      const filePassword = String(existingEmail.password || config.FILE_VALUES.EMAIL_CONFIG.password || '');
      const saved = validatePortableConfig({
        ...existing,
        DATABASE_URL: fileDatabaseUrl,
        DATABASE_SSL_CA: fileSslCa,
        EMAIL_CONFIG: { server, port, username, password: typedPassword || filePassword, sender }
      }, { requireDatabaseUrl: false });
      await writeUserConfig({ ...existing, ...saved });
      Object.assign(config.EMAIL_CONFIG, saved.EMAIL_CONFIG, { password: runtimePassword });
      writeLogToFile('info', `Đã lưu cấu hình SMTP cho ${username}`);
      return { ok: true };
    } catch (err) {
      writeLogToFile('error', 'Lỗi lưu SMTP: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  handleTrusted('test-email-config', async () => {
    try {
      if (!config.EMAIL_CONFIG.username || !config.EMAIL_CONFIG.password) {
        throw new Error('Chưa có tài khoản hoặc mật khẩu SMTP');
      }
      const transporter = createSmtpTransport({
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
      await transporter.verify();
      return { ok: true };
    } catch (err) {
      writeLogToFile('error', 'Kiểm tra SMTP thất bại: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  // --- ĐỌC FILE RA BASE64 ĐỂ ĐÍNH KÈM FRONTEND ---
  handleTrusted('read-file-base64', async (event, filePath, purpose = 'attachment') => {
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
  handleTrusted('write-file-base64', async (event, filePath, base64Data) => {
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

  handleTrusted('print-to-pdf', async (event, htmlContent, savePath) => {
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
      await renderHtmlToPdf(htmlContent, savePath);
      writeLogToFile('info', 'Đã lưu file PDF báo giá thành công!');
      return { ok: true };
    } catch (err) {
      writeLogToFile('error', 'Lỗi lưu PDF: ' + err.message);
      return { ok: false, error: err.message };
    }
  });

  // --- FILE SYSTEM DIALOGS ---
  handleTrusted('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, sanitizeDialogOptions(options, 'save'));
    if (!result.canceled && result.filePath) {
      approvePath(approvedWritePaths, result.filePath);
    }
    return { canceled: result.canceled, filePath: result.filePath };
  });

  handleTrusted('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, sanitizeDialogOptions(options, 'open'));
    if (!result.canceled && Array.isArray(result.filePaths)) {
      result.filePaths.forEach(filePath => approvePath(approvedReadPaths, filePath));
    }
    return { canceled: result.canceled, filePaths: result.filePaths };
  });
}

// 5. VÒNG ĐỜI HỆ THỐNG
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => event.preventDefault());
});

app.whenReady().then(async () => {
  writeLogToFile('info', 'Ứng dụng đã khởi động.');
  for (const warning of config.CONFIG_WARNINGS || []) {
    writeLogToFile('warning', `Cấu hình: ${warning}`);
  }
  if (config.CONFIG_ERROR) writeLogToFile('error', `Cấu hình: ${config.CONFIG_ERROR}`);
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
    app.quit();
  }
});

// Đóng pool trước khi thoát; không bao giờ treo nếu pool.end() lỗi hoặc quá lâu
let poolClosing = false;
app.on('before-quit', (event) => {
  if (!dbPool || poolClosing) return;
  event.preventDefault();
  poolClosing = true;
  const pool = dbPool;
  dbPool = undefined;
  const timeout = new Promise(resolve => setTimeout(resolve, 3000));
  Promise.race([pool.end(), timeout])
    .catch(() => {})
    .finally(() => {
      writeLogToFile('info', 'Database Pool đã được giải phóng đóng ứng dụng.');
      app.quit();
    });
});
