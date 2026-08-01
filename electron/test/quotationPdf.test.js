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

test('quote PDF renders every stored size and keeps legacy quote fallback', () => {
  assert.match(quotationSource, /normalizeStoredQuoteItems\(data, type\)/);
  assert.match(quotationSource, /quoteItems\.map\(\(item, index\)/);
  assert.match(quotationSource, /data\?\.thanh_tien_ban/);
});

test('quotation UI data supports tabs, tree rows and multiple axes', () => {
  assert.match(quotationSource, /function addQuoteDraft\(type\)/);
  assert.match(quotationSource, /function renderQuoteAxisTree\(\)/);
  assert.match(quotationSource, /quote-tree-item/);
  assert.match(quotationSource, /quote-tree-axis/);
  assert.match(quotationSource, /allAxes\.map\(\(axis, index\)/);
});

test('saved quotations can be loaded into tabs and updated in place', () => {
  assert.match(quotationSource, /function openQuoteEditor\(quoteId, type\)/);
  assert.match(quotationSource, /function loadQuoteIntoEditor\(quoteId, type, data\)/);
  assert.match(quotationSource, /async function saveEditedQuoteIfNeeded\(type, data\)/);
  assert.match(quotationSource, /UPDATE \$\{table\} SET \$\{assignments\}/);
  assert.match(quotationSource, /Cập nhật báo giá & Xuất PDF/);
  assert.match(quotationSource, /fields: \{ \.\.\.fields \}/);
});
