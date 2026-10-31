const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateRendererSql } = require('../dbPolicy');

const READ = ['SELECT'];
const WRITE = ['INSERT', 'UPDATE', 'DELETE'];
const TABLES = ['bang_keo_in_orders', 'bang_keo_orders', 'truc_in_orders'];

test('allows one read or write statement with the expected command', () => {
  assert.equal(
    validateRendererSql(' SELECT * FROM bang_keo_orders WHERE id = $1; ', ['SELECT']),
    'SELECT * FROM bang_keo_orders WHERE id = $1'
  );
  assert.equal(
    validateRendererSql('UPDATE bang_keo_orders SET da_giao = $1 WHERE id = $2', ['UPDATE']),
    'UPDATE bang_keo_orders SET da_giao = $1 WHERE id = $2'
  );
});

test('rejects destructive, stacked and commented SQL', () => {
  assert.throws(() => validateRendererSql('DROP TABLE bang_keo_orders', ['SELECT']));
  assert.throws(() => validateRendererSql('SELECT 1; DELETE FROM bang_keo_orders', ['SELECT']));
  assert.throws(() => validateRendererSql('SELECT 1 -- bypass', ['SELECT']));
  assert.throws(() => validateRendererSql('SELECT /* bypass */ 1', ['SELECT']));
});

test('allows ; -- /* inside single-quoted literals', () => {
  assert.doesNotThrow(() => validateRendererSql(
    "SELECT * FROM bang_keo_orders WHERE ten_hang = 'a;b -- c /* d */ it''s'", READ
  ));
  assert.throws(() => validateRendererSql("SELECT * FROM bang_keo_orders WHERE ten_hang = 'a' -- '", READ));
  assert.throws(() => validateRendererSql("SELECT * FROM bang_keo_orders WHERE ten_hang = 'unterminated", READ));
});

// Các câu lệnh đại diện, sao chép từ js/ (thay ${tableName} bằng từng bảng hợp lệ)
const realReadQueries = [
  ...TABLES.map(t => `SELECT * FROM ${t} WHERE id = $1`),
  ...TABLES.map(t => `SELECT * FROM ${t} WHERE id = $1 AND is_quote = TRUE`),
  ...TABLES.map(t => `
    SELECT id FROM ${t}
    WHERE id LIKE $1
    ORDER BY id DESC
    LIMIT 1
  `),
  ...TABLES.map(t => `
    SELECT * FROM ${t}
    WHERE (is_quote = FALSE OR is_quote IS NULL)
    ORDER BY
      split_part(id, '-', 3) DESC,
      split_part(id, '-', 2) DESC,
      split_part(id, '-', 4) DESC
  `),
  ...TABLES.map(t => `
    SELECT ten_hang
    FROM ${t}
    WHERE ten_hang ILIKE $1 AND (is_quote = FALSE OR is_quote IS NULL)
    GROUP BY ten_hang
    ORDER BY MAX(thoi_gian) DESC
    LIMIT 8
  `),
  `
    SELECT
      COUNT(id) AS total_orders,
      COALESCE(SUM(thanh_tien_ban), 0) AS total_revenue
    FROM (
      SELECT id, thoi_gian, COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) ELSE 0 END AS thanh_tien_ban FROM bang_keo_in_orders WHERE thoi_gian >= DATE_TRUNC('month', NOW()) AND (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT id, thoi_gian, thanh_tien_ban FROM truc_in_orders WHERE thoi_gian >= DATE_TRUNC('month', NOW()) AND (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT id, thoi_gian, thanh_tien_ban FROM bang_keo_orders WHERE thoi_gian >= DATE_TRUNC('month', NOW()) AND (is_quote = FALSE OR is_quote IS NULL)
    ) AS combined;
  `,
  `
    SELECT
      SUM(CASE WHEN NOT COALESCE(is_quote, FALSE) AND NOT COALESCE(da_giao, FALSE) AND ngay_du_kien >= CURRENT_DATE AND ngay_du_kien <= CURRENT_DATE + INTERVAL '3 days' THEN 1 ELSE 0 END) AS due_soon,
      SUM(CASE WHEN COALESCE(is_quote, FALSE) THEN 1 ELSE 0 END) AS pending_quotes
    FROM (
      SELECT ngay_du_kien, da_giao, da_tat_toan, cong_no_khach, cong_no_ncc, is_quote FROM bang_keo_in_orders
      UNION ALL
      SELECT ngay_du_kien, da_giao, da_tat_toan, cong_no_khach, cong_no_ncc, is_quote FROM truc_in_orders
      UNION ALL
      SELECT ngay_du_kien, da_giao, da_tat_toan, cong_no_khach, cong_no_ncc, is_quote FROM bang_keo_orders
    ) AS combined;
  `,
  `
    SELECT
      DATE_TRUNC($1, thoi_gian) AS period,
      SUM(so_luong) AS quantity,
      SUM(thanh_tien_ban) AS amount
    FROM (
      SELECT thoi_gian, so_luong, thanh_tien_ban FROM truc_in_orders WHERE thoi_gian >= $2 AND (is_quote = FALSE OR is_quote IS NULL)
    ) AS combined
    GROUP BY period
    ORDER BY period;
  `,
  `
    SELECT to_jsonb(q) AS order_data, thoi_gian, 'bang_keo_in' AS type
    FROM bang_keo_in_orders q WHERE is_quote = TRUE
    UNION ALL
    SELECT to_jsonb(q) AS order_data, thoi_gian, 'bang_keo' AS type
    FROM bang_keo_orders q WHERE is_quote = TRUE
    UNION ALL
    SELECT to_jsonb(q) AS order_data, thoi_gian, 'truc_in' AS type
    FROM truc_in_orders q WHERE is_quote = TRUE
    ORDER BY thoi_gian DESC
  `,
  `
    SELECT id, thoi_gian, ten_hang, ten_khach_hang, so_luong, don_gia_ban, 'bang_keo_in' as type FROM bang_keo_in_orders WHERE (is_quote = FALSE OR is_quote IS NULL)
    UNION ALL
    SELECT id, thoi_gian, ten_hang, ten_khach_hang, so_luong, don_gia_ban, 'truc_in' as type FROM truc_in_orders WHERE (is_quote = FALSE OR is_quote IS NULL)
  `,
  'SELECT id, file_name, file_size FROM order_attachments WHERE order_id = $1 AND order_type = $2',
  `
    SELECT id, file_name, file_size
    FROM order_attachments
    WHERE order_id = $1 AND order_type = $2
    ORDER BY created_at DESC
  `,
  "SELECT content_type, encode(data, 'base64') AS base64_data FROM order_attachments WHERE id = $1",
  'SELECT email_address, SUM(sent_count) as total_count FROM email_history GROUP BY email_address ORDER BY MAX(last_sent_at) DESC, total_count DESC LIMIT 50',
  'SELECT id, sent_count FROM email_history WHERE LOWER(email_address) = LOWER($1)',
  "SELECT EXTRACT(YEAR FROM thoi_gian) AS y FROM bang_keo_orders WHERE id = $1"
];

const printedDebt = `GREATEST(COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) + COALESCE(truc_vat, 0) ELSE 0 END + COALESCE(vat, 0) - COALESCE(tien_coc, 0), 0)`;

const realWriteQueries = [
  ...TABLES.map(t => `UPDATE ${t} SET ten_hang=$1, ten_khach_hang=$2, ngay_du_kien=$3 WHERE id=$4`),
  ...TABLES.map(t => `UPDATE ${t} SET da_giao = $1 WHERE id = $2`),
  ...TABLES.map(t => `UPDATE ${t} SET da_gui_email = TRUE WHERE id = $1`),
  ...TABLES.map(t => `DELETE FROM ${t} WHERE id = $1`),
  ...TABLES.map(t => `UPDATE ${t} SET thoi_gian = $1, quote_items = $2 WHERE id = $3 AND is_quote = TRUE`),
  `UPDATE bang_keo_in_orders
    SET da_giao = $1,
        da_tat_toan = $2,
        cong_no_khach = CASE WHEN $2 THEN 0 ELSE ${printedDebt} END,
        cong_no_ncc = CASE WHEN $2 THEN 0 ELSE GREATEST(COALESCE(thanh_tien_goc, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_goc, 0) ELSE 0 END, 0) END
    WHERE id = $3`,
  `
    UPDATE order_attachments
    SET order_id = $1, order_type = $2
    WHERE order_id = $3 AND order_type = $4
  `,
  `
    UPDATE bang_keo_in_orders
    SET id = $1,
        is_quote = FALSE,
        thoi_gian = NOW(),
        ngay_du_kien = CURRENT_DATE + INTERVAL '1 day',
        da_giao = FALSE,
        da_tat_toan = FALSE,
        cong_no_khach = ${printedDebt}
    WHERE id = $2
  `,
  `
    INSERT INTO order_attachments (order_type, order_id, file_name, content_type, file_size, data)
    VALUES ($1, $2, $3, $4, $5, decode($6, 'base64'))
  `,
  'DELETE FROM order_attachments WHERE id = $1',
  'DELETE FROM order_attachments WHERE order_id = $1 AND order_type = $2',
  'UPDATE email_history SET last_sent_at = NOW(), sent_count = $1 WHERE id = $2',
  'INSERT INTO email_history (email_address, last_sent_at, sent_count) VALUES ($1, NOW(), 1)',
  `
    INSERT INTO bang_keo_orders (
      id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien,
      quy_cach, so_luong, mau_sac, don_gia_goc, thanh_tien,
      da_giao, da_tat_toan, da_gui_email, is_quote, vat, vat_percent, quote_items
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    )
  `
];

test('all representative real renderer queries pass', () => {
  for (const sql of realReadQueries) {
    assert.doesNotThrow(() => validateRendererSql(sql, READ), sql);
  }
  for (const sql of realWriteQueries) {
    assert.doesNotThrow(() => validateRendererSql(sql, WRITE), sql);
  }
});

test('renderer modules never build SQL and only call registered actions of the right kind', () => {
  // Renderer chỉ gửi tên thao tác; mọi lời gọi dbQuery/dbRun phải dùng chuỗi tên đã đăng ký
  const { listActions } = require('../db/registry');
  const kinds = new Map(listActions().map(({ name, kind }) => [name, kind]));
  const jsDir = path.join(__dirname, '..', 'js');
  const files = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'graphify-out') walk(full); }
      else if (entry.name.endsWith('.js')) files.push(full);
    }
  };
  walk(jsDir);
  let checked = 0;
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const name = path.basename(file);
    assert.doesNotMatch(source, /\b(SELECT\s[\s\S]{0,200}?\sFROM|INSERT\s+INTO|DELETE\s+FROM)\s+[a-z_]/i, `${name} must not contain SQL`);
    assert.doesNotMatch(source, /\bUPDATE\s+[a-z_${}]+\s+SET\b/i, `${name} must not contain SQL`);
    for (const match of source.matchAll(/electronAPI\.(dbQuery|dbRun)\(\s*([^,)]*)/g)) {
      const [, method, firstArg] = match;
      const literal = /^'([a-zA-Z.]+)'$/.exec(firstArg.trim());
      if (!literal) {
        // Chỉ chấp nhận biến khi là bước đã dựng sẵn { action, params } (vd. nhập Excel)
        assert.match(firstArg.trim(), /^(action|statement\.action)$/, `${name}: ${method}(${firstArg})`);
        continue;
      }
      const expected = method === 'dbQuery' ? 'read' : 'write';
      assert.equal(kinds.get(literal[1]), expected, `${name}: ${method}('${literal[1]}') must be a registered ${expected} action`);
      checked++;
    }
    for (const match of source.matchAll(/action:\s*'([a-zA-Z.]+)'/g)) {
      assert.equal(kinds.get(match[1]), 'write', `${name}: transaction step ${match[1]} must be a write action`);
    }
  }
  assert.ok(checked >= 30, `expected many action calls, found ${checked}`);
});

test('blocks known attack payloads', () => {
  const attacks = [
    ["SELECT set_config('session_replication_role','replica',false)", READ],
    ["SELECT pg_read_file('x')", READ],
    ['DELETE FROM bang_keo_orders', WRITE],
    ['UPDATE bang_keo_orders SET da_giao = TRUE', WRITE],
    ['SELECT * INTO t FROM bang_keo_orders', READ],
    ['SELECT * FROM pg_user', READ],
    ['SELECT * FROM users', READ],
    ['SELECT * FROM bang_keo_orders, users', READ],
    ['SELECT * FROM (SELECT 1) x, users', READ],
    ['SELECT * FROM bang_keo_orders b JOIN users u ON u.id = b.id', READ],
    ['SELECT * FROM public.bang_keo_orders', READ],
    ['SELECT * FROM information_schema.tables', READ],
    ['SELECT * FROM pg_catalog.pg_tables', READ],
    ["SELECT current_setting('data_directory')", READ],
    ["SELECT dblink_exec('x', 'y')", READ],
    ['SELECT lo_import($1)', READ],
    ["SELECT query_to_xml('select 1', true, true, '')", READ],
    ['SELECT version()', READ],
    ['SELECT $$abc$$', READ],
    ['SELECT $tag$abc$tag$', READ],
    ['SELECT * FROM "pg_user"', READ],
    ["SELECT E'\\'' FROM bang_keo_orders", READ],
    ['INSERT INTO users (a) VALUES (1)', WRITE],
    ['INSERT INTO bang_keo_orders SELECT * FROM users', WRITE],
    ['UPDATE users SET a = 1 WHERE id = 1', WRITE],
    ['DELETE FROM bang_keo_orders WHERE id IN (SELECT id FROM pg_stat_activity)', WRITE],
    ['COPY bang_keo_orders TO PROGRAM $1', WRITE],
    ['SELECT * FROM bang_keo_orders FOR UPDATE', READ],
    ['SELECT (1', READ]
  ];
  for (const [sql, commands] of attacks) {
    assert.throws(() => validateRendererSql(sql, commands), undefined, sql);
  }
});

test('summarizes SQL for logs without leaking full text', () => {
  const { summarizeSqlForLog } = require('../dbPolicy');
  assert.equal(summarizeSqlForLog("SELECT * FROM bang_keo_orders WHERE ten_khach_hang = 'Bí mật'"), 'SELECT bang_keo_orders');
  assert.equal(summarizeSqlForLog('\n  INSERT INTO order_attachments (a) VALUES ($1)'), 'INSERT order_attachments');
  assert.equal(summarizeSqlForLog('UPDATE truc_in_orders SET a = 1 WHERE id = $1'), 'UPDATE truc_in_orders');
  assert.equal(summarizeSqlForLog(null), '(SQL không hợp lệ)');
});

test('public DB errors keep the pg code but not raw server text', () => {
  const { toPublicDbError } = require('../dbPolicy');
  const pgError = Object.assign(new Error('duplicate key value violates unique constraint "x" Key (id)=(secret)'), { code: '23505' });
  const result = toPublicDbError(pgError);
  assert.equal(result.code, '23505');
  assert.ok(!result.error.includes('secret'));
  assert.match(result.error, /23505/);
  assert.equal(toPublicDbError(Object.assign(new Error('connect ECONNREFUSED 1.2.3.4'), { code: 'ECONNREFUSED' })).code, 'ECONNREFUSED');
  assert.equal(toPublicDbError(Object.assign(new Error('x'), { code: 'EPIPE' })).code, 'EPIPE');
  let policyError;
  try { validateRendererSql('SELECT * FROM pg_user', READ); } catch (error) { policyError = error; }
  assert.equal(toPublicDbError(policyError).error, policyError.message);
  assert.equal(toPublicDbError(new Error('relation "secret_table" does not exist')).error, 'Lỗi cơ sở dữ liệu');
});
