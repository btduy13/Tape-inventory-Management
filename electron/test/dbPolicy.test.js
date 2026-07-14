const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRendererSql } = require('../dbPolicy');

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
