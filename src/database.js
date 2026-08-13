const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const dbCache = new Map();

function openDatabase(filename) {
  const resolved = path.resolve(filename);
  if (dbCache.has(resolved)) {
    return dbCache.get(resolved);
  }
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL,
      whatsapp_number TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','superadmin')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS web_sessions (
      sid TEXT PRIMARY KEY, data_json TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions(expires_at);
    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY, owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      template_key TEXT NOT NULL DEFAULT 'best-friend-date', public_token TEXT NOT NULL UNIQUE,
      inviter_name TEXT NOT NULL, recipient_name TEXT NOT NULL, title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','disabled')),
      theme_config_json TEXT NOT NULL, content_config_json TEXT NOT NULL, feature_config_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      published_at TEXT
    );
    CREATE TABLE IF NOT EXISTS visitor_sessions (
      id INTEGER PRIMARY KEY, invitation_id INTEGER NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
      visitor_id TEXT NOT NULL, selected_nickname TEXT, started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_activity_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, completed INTEGER NOT NULL DEFAULT 0,
      final_result TEXT, selected_mood TEXT, selected_availability TEXT, selected_date TEXT,
      main_question_visits INTEGER NOT NULL DEFAULT 0,
      UNIQUE(invitation_id, visitor_id)
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY, invitation_id INTEGER NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
      session_id INTEGER NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
      event_name TEXT NOT NULL, screen TEXT, previous_screen TEXT, option_value TEXT,
      sequence_number INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_logs (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      email TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('REGISTER', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN')),
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_invitations_owner ON invitations(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_invitation ON visitor_sessions(invitation_id);
    CREATE INDEX IF NOT EXISTS idx_events_session_sequence ON events(session_id, sequence_number);
    CREATE INDEX IF NOT EXISTS idx_events_invitation_created ON events(invitation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_user_logs_user ON user_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_logs_created ON user_logs(created_at);
  `);
  if (!db.prepare('PRAGMA table_info(users)').all().some(column => column.name === 'whatsapp_number'))
    db.exec('ALTER TABLE users ADD COLUMN whatsapp_number TEXT');
  dbCache.set(resolved, db);
  return db;
}

module.exports = { openDatabase };
