const session = require('express-session');
const env = require('./env');

/**
 * Build the session configuration object.
 * Supports two store modes controlled by env.SESSION_STORE:
 *   - 'database' : uses express-mysql-session backed by the mysql2 pool
 *   - 'memory'   : uses the default in-memory store (default)
 */
function buildSessionConfig() {
  const config = {
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'atlas.sid',
    cookie: {
      httpOnly: true,
      secure: false, // TODO: enable when proxy sends X-Forwarded-Proto
      sameSite: 'lax',
      maxAge: env.SESSION_MAX_AGE,
    },
  };

  if (env.SESSION_STORE === 'database') {
    try {
      const MySQLStore = require('express-mysql-session')(session);
      const storeOptions = {
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        clearExpired: true,
        checkExpirationInterval: 900000, // 15 minutes
        expiration: env.SESSION_MAX_AGE,
        createDatabaseTable: true,
        schema: {
          tableName: 'sessions',
          columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data',
          },
        },
      };
      config.store = new MySQLStore(storeOptions);
      console.log('Session store: MySQL database');
    } catch (err) {
      console.warn(
        'express-mysql-session not installed. Falling back to memory store.',
        'Run: npm install express-mysql-session'
      );
    }
  } else {
    console.log('Session store: in-memory (not suitable for production)');
  }

  return config;
}

module.exports = { buildSessionConfig };
