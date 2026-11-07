// CHÍNH SÁCH KIỂM TRA SQL TỪ RENDERER
// Renderer gửi SQL thô qua IPC, nên mọi câu lệnh phải qua bộ phân tích token này
// trước khi chạm tới cơ sở dữ liệu.

const ALLOWED_TABLES = new Set([
  'bang_keo_in_orders',
  'bang_keo_orders',
  'truc_in_orders',
  'order_attachments',
  'email_history',
  'thank_you_orders', // 0027
  // Hàm trả về bảng (0028): electron_app chỉ có EXECUTE, không có quyền trên bảng customers
  'electron_customer_search'
]);

// Định danh/hàm nguy hiểm (so khớp chữ thường, ngoài chuỗi ký tự)
const FORBIDDEN_IDENTIFIERS = new Set([
  'set_config',
  'current_setting',
  'copy',
  'query_to_xml',
  'query_to_xmlschema',
  'query_to_xml_and_xmlschema',
  'table_to_xml',
  'table_to_xmlschema',
  'cursor_to_xml',
  'schema_to_xml',
  'database_to_xml',
  'pg_catalog',
  'information_schema',
  'setval',
  'lateral'
]);
const FORBIDDEN_PREFIXES = ['pg_', 'dblink', 'lo_'];
// Chỉ cấm khi được gọi như hàm: version()
const FORBIDDEN_FUNCTIONS = new Set(['version']);

// Các hàm SQL chuẩn có cú pháp "x FROM y" bên trong dấu ngoặc
const FROM_SYNTAX_FUNCTIONS = new Set(['extract', 'substring', 'trim', 'overlay', 'position']);

// Từ khóa kết thúc danh sách bảng sau FROM
const CLAUSE_KEYWORDS = new Set([
  'where', 'group', 'order', 'limit', 'offset', 'having', 'union', 'except', 'intersect',
  'returning', 'set', 'values', 'on', 'using', 'window', 'for', 'fetch', 'select'
]);
const JOIN_MODIFIERS = new Set(['left', 'right', 'inner', 'outer', 'full', 'cross', 'natural', 'join']);

function sqlError(message) {
  const error = new Error(message);
  error.isSqlPolicyError = true;
  return error;
}

function tokenizeSql(sql) {
  const tokens = [];
  let i = 0;
  const length = sql.length;

  while (i < length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if ((ch === '-' && next === '-') || (ch === '/' && next === '*')) {
      throw sqlError('Không cho phép nhiều câu lệnh hoặc chú thích SQL');
    }

    if (ch === ';') {
      throw sqlError('Không cho phép nhiều câu lệnh hoặc chú thích SQL');
    }

    if (ch === "'") {
      // Chuỗi chuẩn: '' là dấu nháy được thoát (standard_conforming_strings = on)
      const prev = tokens[tokens.length - 1];
      if (prev && prev.type === 'ident' && prev.end === i && /^(e|u&|b|x|n)$/i.test(prev.value)) {
        throw sqlError('Không cho phép chuỗi SQL có tiền tố đặc biệt');
      }
      let j = i + 1;
      let value = '';
      for (;;) {
        if (j >= length) throw sqlError('Chuỗi SQL chưa đóng');
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            value += "'";
            j += 2;
            continue;
          }
          break;
        }
        value += sql[j];
        j++;
      }
      tokens.push({ type: 'string', value, start: i, end: j + 1 });
      i = j + 1;
      continue;
    }

    if (ch === '"') {
      throw sqlError('Không cho phép định danh SQL trong dấu ngoặc kép');
    }

    if (ch === '$') {
      if (/[0-9]/.test(next || '')) {
        let j = i + 1;
        while (j < length && /[0-9]/.test(sql[j])) j++;
        tokens.push({ type: 'param', value: sql.slice(i, j), start: i, end: j });
        i = j;
        continue;
      }
      throw sqlError('Không cho phép chuỗi dollar-quoted trong SQL');
    }

    if (/[A-Za-z_À-￿]/.test(ch)) {
      let j = i + 1;
      while (j < length && /[A-Za-z0-9_$À-￿]/.test(sql[j])) j++;
      // U&'...' (chuỗi unicode)
      if (sql[j] === '&' && /^u$/i.test(sql.slice(i, j)) && sql[j + 1] === "'") {
        throw sqlError('Không cho phép chuỗi SQL có tiền tố đặc biệt');
      }
      tokens.push({ type: 'ident', value: sql.slice(i, j).toLowerCase(), start: i, end: j });
      i = j;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(next || ''))) {
      let j = i + 1;
      while (j < length && /[0-9.eE]/.test(sql[j])) j++;
      tokens.push({ type: 'number', value: sql.slice(i, j), start: i, end: j });
      i = j;
      continue;
    }

    if ('(),.'.includes(ch)) {
      tokens.push({ type: 'punct', value: ch, start: i, end: i + 1 });
      i++;
      continue;
    }

    if ('+-*/%<>=!|:~^&@#[]'.includes(ch)) {
      let j = i + 1;
      while (j < length && '+-*/%<>=!|:~^&@#'.includes(sql[j])) {
        if ((sql[j] === '-' && sql[j + 1] === '-') || (sql[j] === '/' && sql[j + 1] === '*')) break;
        j++;
      }
      const op = sql.slice(i, j);
      if (op.includes('--') || op.includes('/*')) {
        throw sqlError('Không cho phép nhiều câu lệnh hoặc chú thích SQL');
      }
      tokens.push({ type: 'op', value: op, start: i, end: j });
      i = j;
      continue;
    }

    if (ch === '\\') {
      throw sqlError('Không cho phép lệnh meta trong SQL');
    }

    throw sqlError(`Ký tự SQL không hợp lệ: ${ch}`);
  }

  return tokens;
}

function isForbiddenIdentifier(name) {
  if (FORBIDDEN_IDENTIFIERS.has(name)) return true;
  return FORBIDDEN_PREFIXES.some(prefix => name.startsWith(prefix));
}

function assertAllowedTable(tokens, index, keyword) {
  const token = tokens[index];
  if (!token) throw sqlError(`Thiếu tên bảng sau ${keyword.toUpperCase()}`);
  if (token.type === 'punct' && token.value === '(' && keyword !== 'update' && keyword !== 'into') {
    return; // subquery
  }
  if (token.type !== 'ident' || !ALLOWED_TABLES.has(token.value)) {
    throw sqlError(`Không cho phép truy cập bảng ${token.value || ''}`.trim());
  }
  const after = tokens[index + 1];
  if (after && after.type === 'punct' && after.value === '.') {
    throw sqlError('Không cho phép tham chiếu schema trong SQL');
  }
}

function validateRendererSql(sql, allowedCommands) {
  if (typeof sql !== 'string' || sql.length === 0 || sql.length > 50000) {
    throw sqlError('Câu lệnh SQL không hợp lệ');
  }
  const normalized = sql.trim().replace(/;\s*$/, '').trim();
  if (!normalized) throw sqlError('Câu lệnh SQL không hợp lệ');

  const tokens = tokenizeSql(normalized);
  const first = tokens[0];
  const command = first && first.type === 'ident' ? first.value.toUpperCase() : '';
  if (!command || !allowedCommands.includes(command)) {
    throw sqlError(`Không cho phép thao tác SQL ${command || 'không xác định'}`);
  }

  // Ngăn xếp ngoặc: mỗi mức ghi nhớ hàm mở ngoặc và trạng thái danh sách FROM
  const stack = [{ fn: null, inFromList: false }];
  let topLevelWhere = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const frame = stack[stack.length - 1];
    const nextToken = tokens[i + 1];

    if (token.type === 'punct') {
      if (token.value === '(') {
        const prev = tokens[i - 1];
        stack.push({ fn: prev && prev.type === 'ident' ? prev.value : null, inFromList: false });
      } else if (token.value === ')') {
        if (stack.length === 1) throw sqlError('Dấu ngoặc SQL không cân bằng');
        stack.pop();
      } else if (token.value === ',' && frame.inFromList) {
        assertAllowedTable(tokens, i + 1, 'from');
      }
      continue;
    }

    if (token.type !== 'ident') continue;
    const word = token.value;

    if (isForbiddenIdentifier(word)) {
      throw sqlError(`Không cho phép sử dụng ${word} trong SQL`);
    }
    if (FORBIDDEN_FUNCTIONS.has(word) && nextToken && nextToken.type === 'punct' && nextToken.value === '(') {
      throw sqlError(`Không cho phép sử dụng ${word}() trong SQL`);
    }

    // Bỏ qua tên cột sau dấu chấm (vd: q.from không tồn tại, nhưng q.id thì có)
    const prevToken = tokens[i - 1];
    if (prevToken && prevToken.type === 'punct' && prevToken.value === '.') continue;

    if (word === 'into') {
      if (command !== 'INSERT' || i !== 1) {
        throw sqlError('Không cho phép SELECT ... INTO hoặc INTO ngoài INSERT');
      }
      assertAllowedTable(tokens, i + 1, 'into');
      continue;
    }

    if (word === 'update') {
      if (command !== 'UPDATE' || i !== 0) {
        throw sqlError('Không cho phép UPDATE lồng trong câu lệnh SQL');
      }
      assertAllowedTable(tokens, i + 1, 'update');
      continue;
    }

    if (word === 'delete' && i !== 0) {
      throw sqlError('Không cho phép DELETE lồng trong câu lệnh SQL');
    }
    if (word === 'insert' && i !== 0) {
      throw sqlError('Không cho phép INSERT lồng trong câu lệnh SQL');
    }

    if (word === 'from') {
      if (frame.fn && FROM_SYNTAX_FUNCTIONS.has(frame.fn)) continue;
      assertAllowedTable(tokens, i + 1, 'from');
      frame.inFromList = true;
      continue;
    }

    if (word === 'join') {
      assertAllowedTable(tokens, i + 1, 'join');
      frame.inFromList = true;
      continue;
    }

    if (CLAUSE_KEYWORDS.has(word) || (JOIN_MODIFIERS.has(word) && word !== 'join')) {
      frame.inFromList = false;
    }

    if (word === 'where' && stack.length === 1) {
      topLevelWhere = true;
    }
  }

  if (stack.length !== 1) throw sqlError('Dấu ngoặc SQL không cân bằng');

  if ((command === 'UPDATE' || command === 'DELETE') && !topLevelWhere) {
    throw sqlError(`Không cho phép ${command} không có điều kiện WHERE`);
  }

  return normalized;
}

// Tóm tắt SQL cho log: chỉ lệnh + bảng đầu tiên, không ghi toàn văn câu lệnh
function summarizeSqlForLog(sql) {
  if (typeof sql !== 'string') return '(SQL không hợp lệ)';
  const command = (sql.trim().match(/^([A-Za-z]+)/)?.[1] || '?').toUpperCase();
  const table = sql.match(/\b(?:FROM|INTO|UPDATE|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)/i)?.[1];
  return table ? `${command} ${table.toLowerCase().slice(0, 64)}` : command;
}

const PUBLIC_PG_ERRORS = {
  '23505': 'Dữ liệu bị trùng',
  '23503': 'Dữ liệu đang được tham chiếu hoặc tham chiếu không tồn tại',
  '23502': 'Thiếu dữ liệu bắt buộc',
  '23514': 'Dữ liệu không thỏa điều kiện kiểm tra',
  '22P02': 'Giá trị nhập không đúng định dạng',
  '22001': 'Giá trị quá dài',
  '22003': 'Giá trị số vượt giới hạn',
  '22007': 'Ngày giờ không hợp lệ',
  '22008': 'Ngày giờ không hợp lệ',
  '40001': 'Xung đột giao dịch, vui lòng thử lại',
  '40P01': 'Xung đột giao dịch, vui lòng thử lại',
  '55P03': 'Dữ liệu đang bị khóa bởi thao tác khác, vui lòng thử lại',
  '57014': 'Truy vấn bị hủy do quá thời gian',
  '42501': 'Không đủ quyền thao tác dữ liệu',
  '28P01': 'Sai thông tin đăng nhập cơ sở dữ liệu',
  '28000': 'Sai thông tin đăng nhập cơ sở dữ liệu',
  '3D000': 'Không tìm thấy cơ sở dữ liệu',
  '53300': 'Cơ sở dữ liệu đang quá tải kết nối, vui lòng thử lại'
};

// Chuyển lỗi DB thành thông báo ngắn cho renderer; không trả nguyên văn lỗi PostgreSQL
function toPublicDbError(error) {
  if (error && (error.isSqlPolicyError || error.isAppError)) {
    return { error: String(error.message || 'Lỗi cơ sở dữ liệu').slice(0, 300) };
  }
  const code = typeof error?.code === 'string' ? error.code : '';
  if (/^[0-9A-Z]{5}$/.test(code) && !/^E[A-Z]+$/.test(code)) {
    const message = PUBLIC_PG_ERRORS[code] || 'Lỗi cơ sở dữ liệu';
    return { error: `${message} (mã ${code})`, code };
  }
  if (/CERT|SSL|TLS/i.test(code)) {
    return { error: 'Lỗi chứng chỉ SSL khi kết nối cơ sở dữ liệu', code };
  }
  if (/^E[A-Z]+$/.test(code) || /timeout|terminated|connect/i.test(String(error?.message || ''))) {
    return { error: 'Mất kết nối cơ sở dữ liệu, vui lòng thử lại', code: code || 'CONNECTION' };
  }
  return { error: 'Lỗi cơ sở dữ liệu' };
}

module.exports = {
  validateRendererSql,
  tokenizeSql,
  summarizeSqlForLog,
  toPublicDbError,
  ALLOWED_TABLES
};
