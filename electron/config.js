// CẤU HÌNH HỆ THỐNG PHẦN MỀM BĂNG KEO
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');

function loadLocalConfig() {
  const localPath = path.join(__dirname, 'config.local.json');
  if (!fs.existsSync(localPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(localPath, 'utf8'));
  } catch (error) {
    throw new Error(`config.local.json không hợp lệ: ${error.message}`);
  }
}

const local = loadLocalConfig();
const localEmail = local.EMAIL_CONFIG || {};
const smtpUsername = process.env.SMTP_USERNAME || localEmail.username || '';

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL || local.DATABASE_URL || '',
  EMAIL_CONFIG: {
    server: process.env.SMTP_SERVER || localEmail.server || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || localEmail.port || 587),
    username: smtpUsername,
    password: process.env.SMTP_PASSWORD || localEmail.password || '',
    sender: process.env.SMTP_SENDER || localEmail.sender || (smtpUsername ? `Phần Mềm Quản Lý Đơn Hàng <${smtpUsername}>` : '')
  },
  APP_NAME: 'Quản lý Đơn hàng Băng Keo',
  APP_VERSION: pkg.version
};
