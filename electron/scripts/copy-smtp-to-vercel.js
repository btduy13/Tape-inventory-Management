// Chép cấu hình SMTP của app (config.local.json, mật khẩu giải mã bằng safeStorage) lên biến môi trường
// Production của Vercel (project web). Không in giá trị nào ra màn hình.
// Chạy trong thư mục electron:  node_modules\.bin\electron scripts\copy-smtp-to-vercel.js
// Cần: đã đăng nhập Vercel CLI và thư mục web đã link (web/.vercel). Sau đó phải redeploy web.
const path = require('path');
const { spawnSync } = require('child_process');
const { app, safeStorage } = require('electron');
// config.js không phụ thuộc electron: đọc trước để biết tệp cấu hình nằm ở đâu.
const config = require('../config');

// safeStorage dùng khóa (Local State) trong thư mục userData của app đã ghi tệp cấu hình,
// nên userData phải là đúng thư mục chứa tệp đó, đặt trước khi app sẵn sàng.
if (config.CONFIG_SOURCE) app.setPath('userData', path.dirname(config.CONFIG_SOURCE));

app.whenReady().then(() => {
  let code = 0;
  try {
    if (!config.CONFIG_SOURCE) throw new Error('Không tìm thấy config.local.json của app.');
    const { decryptValue } = require('../secretStore');
    config.applySecretResolver((v) => decryptValue(v, safeStorage));
    const e = config.EMAIL_CONFIG;
    if (!e.username || !e.password) throw new Error('App chưa có tài khoản hoặc mật khẩu SMTP.');

    const vars = {
      SMTP_SERVER: e.server, SMTP_PORT: String(e.port), SMTP_USERNAME: e.username,
      SMTP_PASSWORD: e.password, SMTP_SENDER: e.sender,
    };
    const webDir = path.join(__dirname, '..', '..', 'web');
    for (const [name, value] of Object.entries(vars)) {
      if (!value) continue;
      const r = spawnSync('vercel', ['env', 'add', name, 'production', '--force'], {
        cwd: webDir, input: value, shell: true, encoding: 'utf8',
      });
      if (r.status !== 0) throw new Error(`Không ghi được ${name} lên Vercel (mã ${r.status}).`);
      console.log(`OK ${name}`);
    }
    console.log('Xong. Redeploy web để dùng SMTP.');
  } catch (error) {
    console.error(error.message);
    code = 1;
  }
  app.exit(code);
});
