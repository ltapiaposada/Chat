const path = require('path');
const { runner } = require('node-pg-migrate');

const migrationsDirectory = path.resolve(__dirname, '../../../migrations');

/**
 * Ejecuta migraciones de node-pg-migrate usando la conexión del pool actual.
 * @param {Object} db - Adaptador de PostgreSQL.
 * @param {Object} [options] - Dirección y cantidad de migraciones.
 * @returns {Promise<Object[]>} Migraciones ejecutadas.
 */
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
