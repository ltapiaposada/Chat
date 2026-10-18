/**
 * @file Script de línea de comandos para ejecutar migraciones de la base de datos.
 * Soporta dirección ascendente (`up`) y descendente (`down`, un paso a la vez).
 *
 * Uso: node scripts/migrate.js [up|down]
 */

require('dotenv').config();

const db = require('../src/infrastructure/database/postgres');
const { runMigrations } = require('../src/infrastructure/database/migrate');

// Lee la dirección del primer argumento; por defecto aplica migraciones ascendentes.
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
