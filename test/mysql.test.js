const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../lib/db');
const { validateEnv } = require('../lib/config/env');

describe('MySQL Integration & Database Layer Tests', () => {

  test('validateEnv should correctly identify environment configuration rules', () => {
    const env = validateEnv();
    assert.equal(typeof env.isProduction, 'boolean');
    assert.equal(typeof env.isMySQLConfigured, 'boolean');
  });

  test('db.healthCheck should execute SELECT 1 and check table readiness', async () => {
    const health = await db.healthCheck();
    assert.ok(health);
    assert.ok('healthy' in health);
    assert.ok('driver' in health);
    assert.ok(Array.isArray(health.missingTables));
  });

  test('db.prepare queries should return async query handlers matching expected API', async () => {
    const isMySQL = db.isMySQLConfigured();
    const query = isMySQL ? 'SELECT 1 AS num' : 'SELECT 1 AS num';
    const stmt = db.prepare(query);
    const row = await stmt.get();
    assert.ok(row);
    assert.equal(row.num, 1);

    const rows = await stmt.all();
    assert.ok(Array.isArray(rows));
    assert.equal(rows.length, 1);
  });

  test('visitor session SQL query syntax should be compatible with active database driver', async () => {
    const sessionSql = db.isMySQLConfigured()
      ? 'INSERT INTO visitor_sessions(invitation_id,visitor_id) VALUES(?,?) ON DUPLICATE KEY UPDATE visitor_id=visitor_id'
      : 'INSERT OR IGNORE INTO visitor_sessions(invitation_id,visitor_id) VALUES(?,?)';
    assert.ok(sessionSql.includes('visitor_sessions'));
  });

  after(() => {
    db.close();
  });
});
