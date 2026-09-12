require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const targetDirectory = path.resolve(__dirname, '../backups');
fs.mkdirSync(targetDirectory, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const target = path.join(targetDirectory, `chat-${stamp}.dump`);
const args = ['--format=custom', '--no-owner', '--file', target];
if (process.env.DATABASE_URL) args.push(process.env.DATABASE_URL);
else args.push('--host', process.env.DB_HOST || 'localhost', '--port', process.env.DB_PORT || '5432',
  '--username', process.env.DB_USER || 'postgres', process.env.DB_NAME || 'chat_db');

const child = spawn('pg_dump', args, {
  stdio: ['ignore', 'inherit', 'inherit'],
  env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' }
});
child.on('exit', (code) => {
  if (code !== 0) { fs.rmSync(target, { force: true }); process.exitCode = code || 1; return; }
  fs.chmodSync(target, 0o600);
  console.log(target);
});
