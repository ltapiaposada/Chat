require('dotenv').config();

const db = require('../src/infrastructure/database/postgres');
const { runMigrations } = require('../src/infrastructure/database/migrate');

const direction = process.argv[2] === 'down' ? 'down' : 'up';
const count = direction === 'down' ? 1 : undefined;

runMigrations(db, { direction, count })
  .then((migrations) => {
    console.log(`${migrations.length} migration(s) applied (${direction})`);
  })
  .catch((error) => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
