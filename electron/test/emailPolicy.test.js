const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_TOTAL_ATTACHMENT_BYTES,
  decodeBase64Strict,
  isPlainEmailAddress,
  sanitizeAttachmentName,
  smtpSecurityOptions,
  validateEmailPayload
} = require('../emailPolicy');

test('normalizes a valid email payload', () => {
  const result = validateEmailPayload({
    toAddress: ' user@example.com ',
    subject: 'Đơn hàng\r\nBăng keo',
    body: 'Nội dung',
    htmlBody: '<p>Nội dung</p>',
    attachments: [{ filename: '../mau.xlsx', content: 'YQ==', contentType: 'application/octet-stream' }],
    dbAttachmentIds: [1, '2']
  });

  assert.equal(result.toAddress, 'user@example.com');
  assert.equal(result.subject, 'Đơn hàng Băng keo');
  assert.equal(result.attachments[0].filename, 'mau.xlsx');
  assert.ok(Buffer.isBuffer(result.attachments[0].content));
  assert.equal(result.attachments[0].content.toString('utf8'), 'a');
  assert.equal(result.estimatedBytes, 1);
  assert.deepEqual(result.dbAttachmentIds, [1, 2]);
});

test('rejects invalid recipients and attachment ids', () => {
  assert.throws(() => validateEmailPayload({ toAddress: 'bad-address', subject: 'Test' }));
  assert.throws(() => validateEmailPayload({
    toAddress: 'user@example.com',
    subject: 'Test',
    dbAttachmentIds: ['1 OR 1=1']
  }));
});

test('accepts plain addr-spec addresses only', () => {
  for (const ok of ['user@example.com', 'first.last+tag@sub.example.com.vn', 'a_b-c@xn--p1ai.xn--p1ai']) {
    assert.equal(isPlainEmailAddress(ok), true, ok);
  }
  const bad = [
    'Tên <user@example.com>',
    '"Name" <user@example.com>',
    '<user@example.com>',
    'user@example.com, other@example.com',
    'user@example.com,other@example.com',
    'user@example.com\r\nBcc: x@example.com',
    'user@example.com\nBcc: x@example.com',
    'user@@example.com',
    'user@exa mple.com',
    '.user@example.com',
    'user.@example.com',
    'user..name@example.com',
    'user@example',
    'user@-example.com',
    'user@example.c',
    'user@example.com;other@example.com',
    ''
  ];
  for (const value of bad) {
    assert.equal(isPlainEmailAddress(value), false, JSON.stringify(value));
    assert.throws(() => validateEmailPayload({ toAddress: value, subject: 'Test' }), undefined, JSON.stringify(value));
  }
});

test('rejects CR/LF even when surrounding whitespace would be trimmed', () => {
  assert.throws(() => validateEmailPayload({ toAddress: 'user@example.com\r\n', subject: 'Test' }));
});

test('decodes base64 attachments strictly and checks decoded size', () => {
  assert.equal(decodeBase64Strict('aGVsbG8=').toString(), 'hello');
  assert.equal(decodeBase64Strict('').length, 0);
  assert.throws(() => decodeBase64Strict('not base64!'));
  assert.throws(() => decodeBase64Strict('aGVsbG8'));
  assert.throws(() => decodeBase64Strict('aGVsbG9='));
  assert.throws(() => decodeBase64Strict('aGVsbG8=', 4));
  const big = Buffer.alloc(MAX_TOTAL_ATTACHMENT_BYTES + 1).toString('base64');
  assert.throws(() => validateEmailPayload({
    toAddress: 'user@example.com',
    subject: 'Test',
    attachments: [{ filename: 'a.bin', content: big }]
  }));
  const half = Buffer.alloc(Math.ceil(MAX_TOTAL_ATTACHMENT_BYTES / 2) + 1).toString('base64');
  assert.throws(() => validateEmailPayload({
    toAddress: 'user@example.com',
    subject: 'Test',
    attachments: [{ filename: 'a.bin', content: half }, { filename: 'b.bin', content: half }]
  }));
});

test('removes path components and new lines from attachment names', () => {
  assert.equal(sanitizeAttachmentName('C:\\temp\\bao-gia\r\n.pdf'), 'bao-gia.pdf');
});

test('SMTP requires STARTTLS except for port 465 and local relays', () => {
  assert.deepEqual(smtpSecurityOptions('smtp.gmail.com', 587), { secure: false, requireTLS: true });
  assert.deepEqual(smtpSecurityOptions('smtp.gmail.com', 465), { secure: true, requireTLS: false });
  assert.deepEqual(smtpSecurityOptions('smtp.example.com', 25), { secure: false, requireTLS: true });
  assert.deepEqual(smtpSecurityOptions('127.0.0.1', 2525), { secure: false, requireTLS: false });
  assert.deepEqual(smtpSecurityOptions('localhost', 587), { secure: false, requireTLS: false });
  assert.deepEqual(smtpSecurityOptions('::1', 25), { secure: false, requireTLS: false });
  // Relay LAN chỉ khi là IPv4 riêng thật; tên miền giống tiền tố IP vẫn phải dùng TLS
  assert.deepEqual(smtpSecurityOptions('192.168.1.10', 25), { secure: false, requireTLS: false });
  assert.deepEqual(smtpSecurityOptions('10.0.0.5', 25), { secure: false, requireTLS: false });
  assert.deepEqual(smtpSecurityOptions('172.20.1.1', 25), { secure: false, requireTLS: false });
  for (const host of ['100.mail.example.com', '10x.example.com', '192x168.example.com', '172.15.0.1', '172.32.0.1', 'smtp.172.16.example.com']) {
    assert.deepEqual(smtpSecurityOptions(host, 587), { secure: false, requireTLS: true }, host);
  }
});

// --- emailDialog.js (renderer) ---
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { toStatement } = require('./helpers/ipcDb');

function loadEmailDialog({ dbRun, elements = {}, electronAPI = {} } = {}) {
  const toasts = [];
  const logs = [];
  const runs = [];
  const document = {
    addEventListener: () => {},
    getElementById: id => elements[id] || null
  };
  const context = vm.createContext({
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document,
    utils: {
      showToast: (message, type) => toasts.push({ message, type }),
      getOrderTableName: type => ({ bang_keo_in: 'bang_keo_in_orders', bang_keo: 'bang_keo_orders', truc_in: 'truc_in_orders' })[type]
    },
    window: { electronAPI: {
      // Renderer gửi tên thao tác; tiến trình chính dựng SQL (mô phỏng qua registry)
      dbRun: async (action, params) => {
        const { sql, params: values } = toStatement(action, params, 'write');
        runs.push({ action, sql, params: values });
        return dbRun ? dbRun(sql, values) : { ok: true, rowCount: 1 };
      },
      writeLog: (level, message) => logs.push({ level, message }),
      ...electronAPI
    } }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/modules/emailDialog.js'), 'utf8'), context);
  return { context, toasts, logs, runs };
}

test('email recipients are split on comma/semicolon, trimmed, lowercased and de-duplicated', () => {
  const { context } = loadEmailDialog();
  assert.deepEqual(Array.from(context.splitEmailRecipients(' A@x.com, b@Y.com ;a@X.com;; ')), ['a@x.com', 'b@y.com']);
  assert.deepEqual(Array.from(context.splitEmailRecipients('')), []);
});

test('Băng Keo email spec keeps free-text quy cách and only appends KG to pure numbers', () => {
  const { context } = loadEmailDialog();
  assert.equal(context.formatBangKeoEmailSpec('48mm x 100y'), '48mm x 100y');
  assert.equal(context.formatBangKeoEmailSpec('25'), '25 KG');
  assert.equal(context.formatBangKeoEmailSpec('2,5'), '2,5 KG');
  assert.equal(context.formatBangKeoEmailSpec(''), 'Mặc định');
});

test('email history counts each recipient atomically and inserts only unknown addresses', async () => {
  const { context, runs } = loadEmailDialog({
    dbRun: (sql, params) => (sql.startsWith('UPDATE email_history') && params[0] === 'new@x.com' ? { ok: true, rowCount: 0 } : { ok: true, rowCount: 1 })
  });
  const warnings = await context.recordEmailSent('bang_keo', 'B-1', 'Old@x.com; new@x.com');
  assert.deepEqual(Array.from(warnings), []);
  assert.match(runs[0].sql, /UPDATE bang_keo_orders SET da_gui_email = TRUE WHERE id = \$1/);
  const history = runs.slice(1);
  assert.deepEqual(history.map(r => [r.sql.split(' ')[0], r.params[0]]), [['UPDATE', 'old@x.com'], ['UPDATE', 'new@x.com'], ['INSERT', 'new@x.com']]);
  assert.match(history[0].sql, /sent_count = COALESCE\(sent_count, 0\) \+ 1/);
  assert.ok(!runs.some(r => /SELECT/i.test(r.sql)));
});

test('email tracking failures are reported as warnings instead of ignored', async () => {
  const { context } = loadEmailDialog({ dbRun: () => ({ ok: false, error: 'mất kết nối' }) });
  const warnings = await context.recordEmailSent('truc_in', 'TI-1', 'a@x.com');
  assert.equal(warnings.length, 2);
  assert.ok(warnings.every(w => w.includes('mất kết nối')));
});

test('SMTP save validates port and sends blank password as keep-existing', async () => {
  const field = value => ({ value, placeholder: '' });
  const elements = {
    'smtp-server': field('smtp.gmail.com'), 'smtp-port': field('70000'), 'smtp-username': field('u@x.com'),
    'smtp-password': field(''), 'smtp-sender': field('')
  };
  const saved = [];
  const { context, toasts } = loadEmailDialog({ elements, electronAPI: { saveEmailConfig: async config => { saved.push(config); return { ok: true }; } } });
  assert.equal(await context.saveEmailSmtpSettings(), false);
  assert.ok(toasts.at(-1).message.includes('65535'));
  elements['smtp-port'].value = '587';
  assert.equal(await context.saveEmailSmtpSettings(), true);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].port, 587);
  assert.equal(saved[0].password, '');
  assert.equal(toasts.at(-1).type, 'success');
});

test('SMTP toggle is a no-op when the settings markup is missing', () => {
  const { context } = loadEmailDialog();
  assert.doesNotThrow(() => context.toggleEmailSmtpSettings());
  const container = { hidden: true, style: { display: 'none' } };
  const { context: withMarkup } = loadEmailDialog({ elements: { 'email-smtp-settings': container } });
  withMarkup.toggleEmailSmtpSettings();
  assert.equal(container.hidden, false);
  withMarkup.toggleEmailSmtpSettings();
  assert.equal(container.style.display, 'none');
});
