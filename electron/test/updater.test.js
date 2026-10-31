const test = require('node:test');
const assert = require('node:assert/strict');
const { createUpdateStateMachine, UPDATE_STATES } = require('../updater');
const { nextUpdateMilestone } = require('../js/modules/updateManager');

test('state machine: check -> available -> download -> downloaded', () => {
  const sm = createUpdateStateMachine();
  assert.equal(sm.state, UPDATE_STATES.IDLE);
  assert.equal(sm.checking(), true);
  assert.equal(sm.state, UPDATE_STATES.CHECKING);
  assert.equal(sm.available('1.6.0'), true);
  assert.equal(sm.version, '1.6.0');
  assert.equal(sm.beginDownload(), true);
  assert.equal(sm.state, UPDATE_STATES.DOWNLOADING);
  sm.downloaded('1.6.0');
  assert.equal(sm.state, UPDATE_STATES.DOWNLOADED);
});

test('state machine: download cannot start twice or without an available update', () => {
  const sm = createUpdateStateMachine();
  assert.equal(sm.beginDownload(), false);
  sm.checking();
  assert.equal(sm.beginDownload(), false);
  sm.available('1.6.0');
  assert.equal(sm.beginDownload(), true);
  assert.equal(sm.beginDownload(), false);
  sm.downloaded();
  assert.equal(sm.beginDownload(), false);
  assert.equal(sm.version, '1.6.0');
});

test('state machine: checks and prompts are skipped while downloading or downloaded', () => {
  const sm = createUpdateStateMachine();
  sm.available('1.6.0');
  sm.beginDownload();
  assert.equal(sm.canCheck(), false);
  assert.equal(sm.checking(), false);
  assert.equal(sm.available('1.6.1'), false);
  assert.equal(sm.notAvailable(), false);
  assert.equal(sm.state, UPDATE_STATES.DOWNLOADING);
  sm.downloaded();
  assert.equal(sm.canCheck(), false);
  assert.equal(sm.checking(), false);
  assert.equal(sm.state, UPDATE_STATES.DOWNLOADED);
});

test('state machine: errors distinguish download failures from check failures', () => {
  const sm = createUpdateStateMachine();
  sm.checking();
  assert.deepEqual(sm.error(), { wasDownloading: false });
  assert.equal(sm.state, UPDATE_STATES.IDLE);

  sm.available('1.6.0');
  sm.beginDownload();
  assert.deepEqual(sm.error(), { wasDownloading: true });
  // Cho phép thử tải lại sau lỗi tải
  assert.equal(sm.state, UPDATE_STATES.AVAILABLE);
  assert.deepEqual(sm.error(), { wasDownloading: false });
  assert.equal(sm.beginDownload(), true);
});

test('state machine: not-available resets to idle', () => {
  const sm = createUpdateStateMachine();
  sm.available('1.6.0');
  assert.equal(sm.notAvailable(), true);
  assert.equal(sm.state, UPDATE_STATES.IDLE);
  assert.equal(sm.version, null);
});

test('progress milestones: no duplicates and no skipped jumps', () => {
  assert.equal(nextUpdateMilestone(0, 0), null);
  assert.equal(nextUpdateMilestone(0, 10), null);
  assert.equal(nextUpdateMilestone(0, 26), 25);
  assert.equal(nextUpdateMilestone(25, 25), null);
  assert.equal(nextUpdateMilestone(25, 49), null);
  assert.equal(nextUpdateMilestone(25, 80), 75);
  assert.equal(nextUpdateMilestone(75, 100), 100);
  assert.equal(nextUpdateMilestone(100, 100), null);
  assert.equal(nextUpdateMilestone(0, 140), 100);
  assert.equal(nextUpdateMilestone(0, 'abc'), null);
});
