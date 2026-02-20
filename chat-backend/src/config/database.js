require('dotenv').config();

const max = Number(process.env.DB_MAX_POOL || 20);
const idleTimeoutMillis = Number(process.env.DB_IDLE_TIMEOUT_MS || 30000);
const connectionTimeoutMillis = Number(process.env.DB_CONNECTION_TIMEOUT_MS || 2000);
const shouldUseSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() !== 'false';

if (process.env.DATABASE_URL) {
  module.exports = {
    connectionString: process.env.DATABASE_URL,
    ...(shouldUseSsl ? { ssl: { rejectUnauthorized } } : {}),
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis
  };
} else {
  module.exports = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'chat_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ...(shouldUseSsl ? { ssl: { rejectUnauthorized } } : {}),
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis
  };
}
