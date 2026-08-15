/**
 * Central Environment Validation Module
 * Ensures mandatory production environment variables are configured.
 */

function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasMySQLConfig = !!(
    process.env.DATABASE_HOST &&
    process.env.DATABASE_USER &&
    process.env.DATABASE_NAME
  );

  const missingMySQL = [];
  if (!process.env.DATABASE_HOST) missingMySQL.push('DATABASE_HOST');
  if (!process.env.DATABASE_USER) missingMySQL.push('DATABASE_USER');
  if (!process.env.DATABASE_NAME) missingMySQL.push('DATABASE_NAME');

  if (isProduction) {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'development-only-change-this-secret-now') {
      throw new Error(
        '[FATAL CONFIG ERROR] SESSION_SECRET must be configured with a secure random key in production.'
      );
    }
    if (missingMySQL.length > 0 && process.env.USE_SQLITE !== 'true') {
      throw new Error(
        `[FATAL CONFIG ERROR] Production MySQL configuration is missing: ${missingMySQL.join(', ')}. ` +
        `Production cannot silently fall back to local SQLite.`
      );
    }
  }

  return {
    isProduction,
    isMySQLConfigured: hasMySQLConfig && process.env.USE_SQLITE !== 'true' && !process.env.DATABASE_PATH?.includes('test.db'),
  };
}

module.exports = { validateEnv };
