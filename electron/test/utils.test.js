const test = require('node:test');
const assert = require('node:assert/strict');
const utils = require('../js/utils');

function localParts(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test('toDateInputValue uses local calendar date, not UTC', () => {
  // 00:30 giờ local: toISOString() ở UTC+7 sẽ trả về ngày hôm trước
  const earlyMorning = new Date(2026, 8, 9, 0, 30);
  assert.equal(utils.toDateInputValue(earlyMorning), '2026-09-09');
  const lateNight = new Date(2026, 11, 31, 23, 59);
  assert.equal(utils.toDateInputValue(lateNight), '2026-12-31');
  assert.equal(utils.toDateInputValue(earlyMorning.getTime()), '2026-09-09');
});

test('toDateInputValue keeps plain YYYY-MM-DD strings and rejects empty/invalid values', () => {
  assert.equal(utils.toDateInputValue('2026-09-09'), '2026-09-09');
  assert.equal(utils.toDateInputValue(' 2026-02-28 '), '2026-02-28');
  for (const value of [null, undefined, '', '   ', 'không phải ngày', new Date('invalid'), NaN]) {
    assert.equal(utils.toDateInputValue(value), '', String(value));
  }
  const fromTimestampString = new Date(2026, 0, 5, 8, 0);
  assert.equal(utils.toDateInputValue(fromTimestampString.toString()), '2026-01-05');
});

test('tomorrowDateInputValue returns the local next day', () => {
  const expected = new Date();
  expected.setDate(expected.getDate() + 1);
  const before = localParts(expected);
  const actual = utils.tomorrowDateInputValue();
  const after = new Date();
  after.setDate(after.getDate() + 1);
  assert.ok(actual === before || actual === localParts(after));
  assert.match(actual, /^\d{4}-\d{2}-\d{2}$/);
});

test('parseCurrency: last separator + 1–2 digits is the decimal point, otherwise thousands', () => {
  const cases = {
    '1,234.56': 1234.56,
    '1.234,5': 1234.5,
    '1.234.567': 1234567,
    '1,234,567': 1234567,
    '12.500': 12500,
    '12,500': 12500,
    '12.5': 12.5,
    '12,5': 12.5,
    '0.125': 0.125,
    '1234.567': 1234.567,
    '1,500,000': 1500000,
    '1500000': 1500000,
    '-1,500': -1500,
    ' 2.000.000 đ ': 2000000,
    'abc': 0,
    '-': 0,
    '': 0
  };
  for (const [input, expected] of Object.entries(cases)) {
    assert.equal(utils.parseCurrency(input), expected, input);
  }
  assert.equal(utils.parseCurrency(null), 0);
  assert.equal(utils.parseCurrency(undefined), 0);
  assert.equal(utils.parseCurrency(42), 42);
  assert.equal(utils.parseCurrency(NaN), 0);
});

test('parseCurrency round-trips formatCurrency output', () => {
  for (const value of [0, 7, 999, 1000, 12500, 1234567, 987654321, -1500]) {
    assert.equal(utils.parseCurrency(utils.formatCurrency(value)), value, String(value));
  }
});

test('formatCurrency rounds half away from zero and never prints exponents', () => {
  assert.equal(utils.formatCurrency(1.5), '2');
  assert.equal(utils.formatCurrency(-1.5), '-2');
  assert.equal(utils.formatCurrency(-2.5), '-3');
  assert.equal(utils.formatCurrency(-0.4), '0');
  assert.equal(utils.formatCurrency(-1234567.5), '-1,234,568');
  assert.equal(utils.formatCurrency(1e21), '1,000,000,000,000,000,000,000');
  assert.doesNotMatch(utils.formatCurrency(1.5e25), /e/i);
  for (const value of [null, undefined, NaN, Infinity, 'x', '']) {
    assert.equal(utils.formatCurrency(value), '0', String(value));
  }
  assert.equal(utils.formatCurrency('1500'), '1,500');
});

test('filterCurrencyText keeps digits/separators and a leading minus only when allowed', () => {
  assert.equal(utils.filterCurrencyText(' 1.234.567 đ '), '1.234.567');
  assert.equal(utils.filterCurrencyText('-1,500abc'), '1,500');
  assert.equal(utils.filterCurrencyText('-1,500abc', true), '-1,500');
  assert.equal(utils.filterCurrencyText('1-2-3', true), '123');
  const input = attrs => ({ hasAttribute: name => name in attrs, getAttribute: name => attrs[name] ?? null });
  assert.equal(utils.allowsNegativeCurrency(input({})), false);
  assert.equal(utils.allowsNegativeCurrency(input({ 'data-allow-negative': '' })), true);
  assert.equal(utils.allowsNegativeCurrency(input({ 'data-allow-negative': 'false' })), false);
});

function withFakeDocument(fakeDocument, fn) {
  const previous = globalThis.document;
  globalThis.document = fakeDocument;
  const restore = () => {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  };
  return Promise.resolve().then(fn).finally(restore);
}

test('confirmAction queues overlapping confirms and restores focus to the first opener', async () => {
  const classes = new Set();
  const focused = [];
  const makeEl = name => ({ name, textContent: '', isConnected: true, classList: { toggle() {} }, focus() { focused.push(name); } });
  const elements = {
    'modal-confirm-action': {
      classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
      setAttribute() {}
    },
    'confirm-action-title': makeEl('title'),
    'confirm-action-message': makeEl('message'),
    'confirm-action-accept': makeEl('accept')
  };
  const fakeDocument = { getElementById: id => elements[id] || null, activeElement: makeEl('opener') };
  utils._confirmResolver = null;
  utils._confirmQueue = [];
  await withFakeDocument(fakeDocument, async () => {
    const first = utils.confirmAction('Câu hỏi 1');
    fakeDocument.activeElement = elements['confirm-action-accept'];
    const second = utils.confirmAction('Câu hỏi 2');
    assert.equal(elements['confirm-action-message'].textContent, 'Câu hỏi 1');
    utils.resolveConfirmAction(true);
    assert.equal(await first, true, 'first confirm keeps its own answer');
    assert.ok(classes.has('active'), 'modal stays open for the queued confirm');
    assert.equal(elements['confirm-action-message'].textContent, 'Câu hỏi 2');
    utils.resolveConfirmAction(false);
    assert.equal(await second, false);
    assert.equal(classes.has('active'), false);
    assert.equal(focused.at(-1), 'opener');
  });
});

test('autocomplete: Enter never auto-picks the first item and does not submit while pending', async () => {
  const listeners = {};
  const children = [];
  const attrs = {};
  const input = {
    value: '',
    offsetWidth: 100,
    addEventListener: (type, fn) => { listeners[type] = fn; },
    setAttribute: (k, v) => { attrs[k] = v; },
    removeAttribute: k => { delete attrs[k]; }
  };
  const list = {
    id: 'sugg',
    style: {},
    setAttribute() {},
    set innerHTML(v) { if (v === '') children.length = 0; },
    appendChild: child => children.push(child),
    getElementsByClassName: () => children
  };
  const fakeDocument = {
    addEventListener() {},
    activeElement: input,
    createElement: () => {
      const el = { attrs: {}, listeners: {}, classList: { add() {}, remove() {} } };
      el.setAttribute = (k, v) => { el.attrs[k] = v; };
      el.addEventListener = (type, fn) => { el.listeners[type] = fn; };
      el.click = () => el.listeners.click?.();
      el.scrollIntoView = () => {};
      return el;
    }
  };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const keyEvent = key => ({ key, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });

  await withFakeDocument(fakeDocument, async () => {
    const picked = [];
    utils.setupAutocomplete(input, list, async () => ['Khách A', 'Khách B'], item => picked.push(item));

    input.value = 'Kh';
    listeners.input.call(input);
    const pendingEnter = keyEvent('Enter');
    listeners.keydown(pendingEnter);
    assert.equal(pendingEnter.defaultPrevented, true, 'Enter while the debounce is pending must not submit');

    listeners.input.call(input);
    await wait(200);
    assert.equal(children.length, 2);
    assert.equal(children[0].attrs.role, 'option');
    const enter = keyEvent('Enter');
    listeners.keydown(enter);
    assert.equal(enter.defaultPrevented, true);
    assert.deepEqual(picked, [], 'nothing highlighted: keep the typed text');
    assert.equal(input.value, 'Kh');
    assert.equal(children.length, 0, 'list closes');

    const free = keyEvent('Enter');
    listeners.keydown(free);
    assert.equal(free.defaultPrevented, false, 'no list: Enter submits the form normally');

    listeners.input.call(input);
    await wait(200);
    listeners.keydown(keyEvent('ArrowDown'));
    assert.equal(attrs['aria-activedescendant'], 'sugg-option-0');
    listeners.keydown(keyEvent('Enter'));
    await wait(0);
    assert.deepEqual(picked, ['Khách A']);
  });
});
