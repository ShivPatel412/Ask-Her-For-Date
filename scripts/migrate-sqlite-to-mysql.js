require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('=== Ask Her For Date: SQLite to MySQL Migration ===');

  const host = process.env.DATABASE_HOST;
  const port = parseInt(process.env.DATABASE_PORT || '3306', 10);
  const database = process.env.DATABASE_NAME;
  const user = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD || '';

  if (!host || !database || !user) {
    console.error('ERROR: MySQL configuration missing in environment variables.');
    console.error('Please specify DATABASE_HOST, DATABASE_NAME, and DATABASE_USER.');
    process.exit(1);
  }

  const sqlitePath = process.env.DATABASE_PATH || path.join(process.cwd(), 'heartlink.sqlite');
  const fallbackPath = path.join(process.cwd(), 'data', 'app.db');
  const finalPath = fs.existsSync(sqlitePath) ? sqlitePath : (fs.existsSync(fallbackPath) ? fallbackPath : null);

  if (!finalPath) {
    console.error(`ERROR: SQLite database file not found at ${sqlitePath} or ${fallbackPath}`);
    process.exit(1);
  }

  console.log(`Reading SQLite database: ${finalPath}`);
  const sqliteDb = new Database(finalPath, { readonly: true });

  console.log(`Connecting to MySQL database: ${user}@${host}:${port}/${database}`);
  const mysqlConn = await mysql.createConnection({
    host, port, database, user, password,
    multipleStatements: true,
    timezone: 'Z',
    dateStrings: true,
  });

  console.log('Applying MySQL DDL Schema...');
  const schemaSqlPath = path.join(__dirname, '..', 'schema', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
  await mysqlConn.query(schemaSql);
  console.log('MySQL Schema initialized successfully.');

  const tables = ['users', 'invitations', 'visitor_sessions', 'events', 'user_logs', 'email_notifications'];

  for (const table of tables) {
    const rows = sqliteDb.prepare(`SELECT * FROM ${table}`).all();
    console.log(`Migrating table '${table}': ${rows.length} rows found in SQLite...`);
    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    const colList = columns.map(c => `\`${c}\``).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const updateAssignments = columns.filter(c => c !== 'id').map(c => `\`${c}\`=VALUES(\`${c}\`)`).join(', ');

    const sql = `INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateAssignments || '`id`=`id`'}`;

    let inserted = 0;
    for (const row of rows) {
      const values = columns.map(col => row[col]);
      await mysqlConn.execute(sql, values);
      inserted++;
    }
    console.log(`✓ Table '${table}': ${inserted} rows migrated to MySQL.`);
  }

  console.log('\n--- Data Integrity Verification ---');
  for (const table of tables) {
    const sqliteCount = sqliteDb.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c;
    const [mysqlRows] = await mysqlConn.query(`SELECT COUNT(*) c FROM \`${table}\``);
    const mysqlCount = mysqlRows[0].c;
    console.log(`Table '${table}': SQLite (${sqliteCount}) vs MySQL (${mysqlCount}) -> ${sqliteCount === mysqlCount ? 'PASSED ✓' : 'MISMATCH ⚠️'}`);
  }

  await mysqlConn.end();
  sqliteDb.close();
  console.log('\n=== Migration Completed Successfully ===');
}

migrate().catch(err => {
  console.error('\n❌ Migration Failed:', err);
  process.exit(1);
});
