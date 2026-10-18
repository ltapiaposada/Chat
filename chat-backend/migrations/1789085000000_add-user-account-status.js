/**
 * @file Agrega la columna `is_active` (booleano, por defecto `true`) a la
 * tabla `users` para controlar el estado de la cuenta de cada usuario.
 * Crea un índice compuesto sobre `(company_id, is_active)` para
 * optimizar consultas filtradas por estado dentro de cada empresa.
 */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_users_company_active ON users(company_id, is_active);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_users_company_active;
    ALTER TABLE users DROP COLUMN IF EXISTS is_active;
  `);
};
