require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const source = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!source || !fs.existsSync(source) || !process.argv.includes('--confirm')) {
  console.error('Uso: npm run db:restore -- /ruta/backup.dump --confirm');
  process.exit(2);
}
const args = ['--clean', '--if-exists', '--no-owner', '--exit-on-error'];
if (process.env.DATABASE_URL) args.push('--dbname', process.env.DATABASE_URL, source);
else args.push('--host', process.env.DB_HOST || 'localhost', '--port', process.env.DB_PORT || '5432',
  '--username', process.env.DB_USER || 'postgres', '--dbname', process.env.DB_NAME || 'chat_db', source);
const child = spawn('pg_restore', args, {
  stdio: 'inherit', env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' }
});
child.on('exit', (code) => { process.exitCode = code || 0; });
