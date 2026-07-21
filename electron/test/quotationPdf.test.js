const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const quotationSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'modules', 'quotations.js'),
  'utf8'
);

test('quote PDF header keeps the company name separate from the title', () => {
  assert.match(quotationSource, /font-family: "Segoe UI", Arial, sans-serif/);
  assert.match(
    quotationSource,
    /grid-template-columns: minmax\(0, 1fr\) 190px; column-gap: 24px/
  );
  assert.match(quotationSource, /white-space: nowrap/);
});

test('quote PDF omits redundant collaborator and VAT copy', () => {
  assert.doesNotMatch(quotationSource, /Liên hệ CTV/);
  assert.doesNotMatch(
    quotationSource,
    /VAT chỉ được thể hiện khi khách hàng yêu cầu/
  );
  assert.match(
    quotationSource,
    /Báo giá có hiệu lực theo thỏa thuận tại thời điểm xác nhận đơn hàng\./
  );
});

test('v1.5.9 confirmation flow is preserved', () => {
  assert.match(quotationSource, /await utils\.confirmAction/);
});
