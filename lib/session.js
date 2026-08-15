const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { isMySQLConfigured, getMySQLPool } = require('./db');

function createSessionStore(SQLiteSessionStoreClass) {
  if (isMySQLConfigured()) {
    const pool = getMySQLPool();
    const store = new MySQLStore({
      clearExpired: true,
      checkExpirationInterval: 900000, // Clean expired sessions every 15 minutes
      expiration: 7 * 24 * 60 * 60 * 1000, // 7 days default expiration
      createDatabaseTable: true,
      schema: {
        tableName: 'web_sessions',
        columnNames: {
          session_id: 'sid',
          expires: 'expires_at',
          data: 'data_json'
        }
      }
    }, pool);
    store.on('error', (err) => {
      console.error('[SESSION STORE ERROR] MySQL Session Store error:', err?.message || err);
    });
    return store;
  }
  return new SQLiteSessionStoreClass();
}

module.exports = { createSessionStore };
