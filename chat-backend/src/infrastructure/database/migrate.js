const path = require('path');
const { runner } = require('node-pg-migrate');

const migrationsDirectory = path.resolve(__dirname, '../../../migrations');

async function runMigrations(db, { direction = 'up', count } = {}) {
  const client = await db.getClient();
  try {
    return await runner({
      dbClient: client,
      dir: migrationsDirectory,
      direction,
      count,
      migrationsTable: 'schema_migrations',
      checkOrder: true,
      singleTransaction: true,
      log: () => {}
    });
  } finally {
    client.release();
  }
}

module.exports = { runMigrations, migrationsDirectory };
