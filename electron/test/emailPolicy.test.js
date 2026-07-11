const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeAttachmentName, validateEmailPayload } = require('../emailPolicy');

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

test('removes path components and new lines from attachment names', () => {
  assert.equal(sanitizeAttachmentName('C:\\temp\\bao-gia\r\n.pdf'), 'bao-gia.pdf');
});
