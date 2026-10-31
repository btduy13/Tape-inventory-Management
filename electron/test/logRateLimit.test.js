// write-log IPC: giới hạn kích thước và tốc độ ghi log từ renderer
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { MAX_LOG_MESSAGE_CHARS, createLogRateLimiter, normalizeLogEntry } = require('../ipcPolicy');

test('normalizeLogEntry caps the message size and strips newlines', () => {
  const huge = 'A'.repeat(5 * 1024 * 1024);
  const entry = normalizeLogEntry('error', huge);
  assert.equal(entry.message.length, MAX_LOG_MESSAGE_CHARS);
  assert.equal(normalizeLogEntry('info', 'a\r\nfake-line\nb').message, 'a fake-line b');
  assert.equal(normalizeLogEntry('nope', 'x').level, 'info');
  assert.equal(normalizeLogEntry('info', { toString: () => 'obj' }).message, 'obj');
});

test('rate limiter allows a burst up to maxEntries per window, then drops', () => {
  let clock = 1000;
  const limiter = createLogRateLimiter({ maxEntries: 3, maxChars: 1000, windowMs: 60000, now: () => clock });
  assert.equal(limiter.check(10).allowed, true);
  assert.equal(limiter.check(10).allowed, true);
  assert.equal(limiter.check(10).allowed, true);
  assert.equal(limiter.check(10).allowed, false);
  assert.equal(limiter.check(10).allowed, false);
  clock += 60000;
  const next = limiter.check(10);
  assert.equal(next.allowed, true);
  assert.equal(next.droppedBefore, 2, 'reports how many lines were dropped in the previous window');
  assert.equal(limiter.check(10).droppedBefore, 0);
});

test('rate limiter also caps total characters per window', () => {
  let clock = 0;
  const limiter = createLogRateLimiter({ maxEntries: 100, maxChars: 100, windowMs: 1000, now: () => clock });
  assert.equal(limiter.check(60).allowed, true);
  assert.equal(limiter.check(60).allowed, false);
  assert.equal(limiter.check(40).allowed, true);
  assert.equal(limiter.check(1).allowed, false);
  clock = 1000;
  assert.equal(limiter.check(100).allowed, true);
});

test('a clock that goes backwards starts a new window instead of blocking forever', () => {
  let clock = 5000;
  const limiter = createLogRateLimiter({ maxEntries: 1, maxChars: 100, windowMs: 1000, now: () => clock });
  assert.equal(limiter.check(1).allowed, true);
  assert.equal(limiter.check(1).allowed, false);
  clock = 10;
  assert.equal(limiter.check(1).allowed, true);
});

test('main.js write-log handler uses the limiter before writing', () => {
  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const start = mainSource.indexOf("handleTrusted('write-log'");
  assert.ok(start >= 0);
  const block = mainSource.slice(start, mainSource.indexOf('});', start));
  assert.match(block, /normalizeLogEntry\(level, message\)/);
  assert.match(block, /rendererLogLimiter\.check\(/);
  assert.ok(block.indexOf('if (!allowed)') < block.lastIndexOf('writeLogToFile(normalized.level'));
  assert.match(mainSource, /const rendererLogLimiter = createLogRateLimiter\(\)/);
});
