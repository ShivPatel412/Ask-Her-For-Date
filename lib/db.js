const mysql = require('mysql2/promise');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { validateEnv } = require('./config/env');

let mysqlPool = null;
let sqliteDb = null;

function isMySQLConfigured() {
  const { isMySQLConfigured } = validateEnv();
  return isMySQLConfigured;
}

function getMySQLPool() {
  if (mysqlPool) return mysqlPool;
  mysqlPool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10', 10),
    queueLimit: 0,
    connectTimeout: 10000,
    timezone: 'Z',
    dateStrings: true,
  });
  return mysqlPool;
}

function getSQLiteDb(dbPathOverride) {
  const isTest = !!(process.env.DATABASE_PATH?.includes('test') || process.env.NODE_ENV === 'test');
  if (process.env.NODE_ENV === 'production' && process.env.USE_SQLITE !== 'true' && !isTest) {
    throw new Error('[FATAL CONFIG ERROR] SQLite fallback is disabled in production. A valid MySQL database configuration is required.');
  }
  if (sqliteDb) return sqliteDb;
  const { openDatabase } = require('../src/database');
  const root = process.cwd();
  const isVercel = !!(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NOW_REGION);
  const defaultDataPath = isVercel ? path.join(os.tmpdir(), 'ask-her-out', 'app.db') : 'data/app.db';
  const rawPath = dbPathOverride || process.env.DATABASE_PATH || defaultDataPath;
  const dataPath = (isVercel && !rawPath.startsWith(os.tmpdir())) ? path.join(os.tmpdir(), 'ask-her-out', 'app.db') : path.resolve(root, rawPath);
  sqliteDb = openDatabase(dataPath);
  return sqliteDb;
}

function resetSQLiteCache() {
  sqliteDb = null;
}

async function healthCheck() {
  try {
    const isMySQL = isMySQLConfigured();
    if (isMySQL) {
      const pool = getMySQLPool();
      await pool.execute('SELECT 1');
      const [rows] = await pool.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
      );
      const tableNames = new Set(rows.map(r => (r.TABLE_NAME || r.table_name || '').toLowerCase()));
      const requiredTables = ['users', 'web_sessions', 'invitations', 'visitor_sessions', 'events', 'user_logs', 'email_notifications'];
      const missingTables = requiredTables.filter(t => !tableNames.has(t));
      return {
        healthy: missingTables.length === 0,
        driver: 'MySQL',
        missingTables,
      };
    } else {
      const db = getSQLiteDb();
      db.prepare('SELECT 1').get();
      return {
        healthy: true,
        driver: 'SQLite',
        missingTables: [],
      };
    }
  } catch (error) {
    return {
      healthy: false,
      driver: isMySQLConfigured() ? 'MySQL' : 'SQLite',
      error: error.message,
    };
  }
}

function prepare(sql) {
  if (isMySQLConfigured()) {
    const pool = getMySQLPool();
    return {
      async get(...params) {
        const [rows] = await pool.execute(sql, params);
        return rows[0] || undefined;
      },
      async all(...params) {
        const [rows] = await pool.execute(sql, params);
        return rows;
      },
      async run(...params) {
        const [result] = await pool.execute(sql, params);
        return {
          lastInsertRowid: result.insertId,
          changes: result.affectedRows,
        };
      }
    };
  } else {
    const db = getSQLiteDb();
    const stmt = db.prepare(sql);
    return {
      async get(...params) {
        return stmt.get(...params);
      },
      async all(...params) {
        return stmt.all(...params);
      },
      async run(...params) {
        return stmt.run(...params);
      }
    };
  }
}

function prepareSync(sql) {
  const db = getSQLiteDb();
  return db.prepare(sql);
}

function close() {
  if (sqliteDb) {
    try { sqliteDb.close(); } catch {}
    sqliteDb = null;
  }
  if (mysqlPool) {
    try { mysqlPool.end(); } catch {}
    mysqlPool = null;
  }
}

module.exports = {
  prepare,
  prepareSync,
  isMySQLConfigured,
  getMySQLPool,
  getSQLiteDb,
  resetSQLiteCache,
  close,
  healthCheck,
};
