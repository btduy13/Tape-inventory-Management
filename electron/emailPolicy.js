const MAX_LOCAL_ATTACHMENTS = 10;
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;

// Chỉ chấp nhận addr-spec thuần (local@domain): không tên hiển thị, không dấu phẩy, không CR/LF
const LOCAL_PART_PATTERN = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

function isPlainEmailAddress(value) {
  const address = String(value ?? '');
  if (address.length === 0 || address.length > 254) return false;
  const at = address.indexOf('@');
  if (at <= 0 || at !== address.lastIndexOf('@')) return false;
  const localPart = address.slice(0, at);
  const domain = address.slice(at + 1);
  if (localPart.length > 64 || !LOCAL_PART_PATTERN.test(localPart)) return false;
  if (domain.length > 253) return false;
  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every(label => DOMAIN_LABEL_PATTERN.test(label))) return false;
  const tld = labels[labels.length - 1];
  return /^[A-Za-z]{2,63}$/.test(tld) || /^xn--[A-Za-z0-9-]+$/i.test(tld);
}

// Giải mã base64 nghiêm ngặt; ném lỗi nếu dữ liệu không hợp lệ hoặc vượt giới hạn
function decodeBase64Strict(value, maxBytes = MAX_TOTAL_ATTACHMENT_BYTES) {
  const text = String(value ?? '').replace(/\s+/g, '');
  if (text.length === 0) return Buffer.alloc(0);
  if (text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
    throw new Error('Dữ liệu tệp đính kèm không phải base64 hợp lệ');
  }
  if (Math.floor(text.length / 4) * 3 > maxBytes + 2) {
    throw new Error('Tổng tệp đính kèm vượt quá 25 MB');
  }
  const buffer = Buffer.from(text, 'base64');
  if (buffer.toString('base64') !== text) {
    throw new Error('Dữ liệu tệp đính kèm không phải base64 hợp lệ');
  }
  if (buffer.length > maxBytes) throw new Error('Tổng tệp đính kèm vượt quá 25 MB');
  return buffer;
}

const PRIVATE_IPV4_PATTERN = /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;

// Tùy chọn bảo mật SMTP: 465 dùng TLS ngay; cổng khác bắt buộc STARTTLS trừ relay cục bộ
function smtpSecurityOptions(server, port) {
  const host = String(server || '').replace(/^\[|\]$/g, '').toLowerCase();
  // Relay cục bộ hoặc trong mạng LAN (10/8, 172.16/12, 192.168/16) có thể không hỗ trợ STARTTLS
  // Chỉ địa chỉ IPv4 riêng đầy đủ 4 octet; tên miền như "10mail.example.com" vẫn bắt buộc TLS
  const isLocalRelay = host === 'localhost' || host === '127.0.0.1' || host === '::1'
    || PRIVATE_IPV4_PATTERN.test(host);
  const secure = Number(port) === 465;
  return {
    secure,
    requireTLS: !secure && !isLocalRelay
  };
}

function sanitizeAttachmentName(value) {
  const name = String(value || 'tep-dinh-kem').split(/[\\/]/).pop().replace(/[\r\n]/g, '').trim();
  return (name || 'tep-dinh-kem').slice(0, 180);
}

function validateEmailPayload(payload = {}) {
  const rawAddress = String(payload.toAddress || '');
  const toAddress = rawAddress.trim();
  if (/[\r\n]/.test(rawAddress) || !isPlainEmailAddress(toAddress)) {
    throw new Error('Địa chỉ email không hợp lệ');
  }

  const subject = String(payload.subject || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
  const body = String(payload.body || '');
  const htmlBody = String(payload.htmlBody || '');
  if (!subject) throw new Error('Tiêu đề email không được để trống');
  if (Buffer.byteLength(body, 'utf8') > 1024 * 1024 || Buffer.byteLength(htmlBody, 'utf8') > 2 * 1024 * 1024) {
    throw new Error('Nội dung email vượt quá giới hạn');
  }

  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  if (attachments.length > MAX_LOCAL_ATTACHMENTS) throw new Error('Chỉ được đính kèm tối đa 10 tệp cục bộ');
  let estimatedBytes = 0;
  const safeAttachments = attachments.map(attachment => {
    // content trả về là Buffer đã giải mã; kích thước tính theo dữ liệu thật
    const content = decodeBase64Strict(attachment?.content, MAX_TOTAL_ATTACHMENT_BYTES - estimatedBytes);
    estimatedBytes += content.length;
    return {
      filename: sanitizeAttachmentName(attachment?.filename),
      content,
      contentType: String(attachment?.contentType || 'application/octet-stream').replace(/[\r\n]/g, '').slice(0, 120)
    };
  });
  if (estimatedBytes > MAX_TOTAL_ATTACHMENT_BYTES) throw new Error('Tổng tệp đính kèm vượt quá 25 MB');

  const dbAttachmentIds = Array.isArray(payload.dbAttachmentIds) ? payload.dbAttachmentIds : [];
  if (dbAttachmentIds.length > 20 || dbAttachmentIds.some(id => !Number.isInteger(Number(id)) || Number(id) <= 0)) {
    throw new Error('Danh sách tệp đính kèm database không hợp lệ');
  }

  return {
    toAddress,
    subject,
    body,
    htmlBody,
    attachments: safeAttachments,
    dbAttachmentIds: dbAttachmentIds.map(Number),
    estimatedBytes
  };
}

module.exports = {
  MAX_TOTAL_ATTACHMENT_BYTES,
  decodeBase64Strict,
  isPlainEmailAddress,
  sanitizeAttachmentName,
  smtpSecurityOptions,
  validateEmailPayload
};
