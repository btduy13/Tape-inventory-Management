const MAX_LOCAL_ATTACHMENTS = 10;
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;

function sanitizeAttachmentName(value) {
  const name = String(value || 'tep-dinh-kem').split(/[\\/]/).pop().replace(/[\r\n]/g, '').trim();
  return (name || 'tep-dinh-kem').slice(0, 180);
}

function validateEmailPayload(payload = {}) {
  const toAddress = String(payload.toAddress || '').trim();
  if (toAddress.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toAddress)) {
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
    const content = String(attachment?.content || '');
    estimatedBytes += Math.floor(content.length * 3 / 4);
    return {
      filename: sanitizeAttachmentName(attachment?.filename),
      content,
      contentType: String(attachment?.contentType || 'application/octet-stream').slice(0, 120)
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
  sanitizeAttachmentName,
  validateEmailPayload
};
