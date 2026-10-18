/**
 * @file Elimina la columna `external_tenant_id` de la tabla `users` y el
 * índice único `idx_users_external_identity`. La identificación de tenants
 * ahora se realiza mediante la relación directa `company_id`.
 */

exports.up = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_users_external_identity;
    ALTER TABLE users DROP COLUMN IF EXISTS external_tenant_id;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS external_tenant_id TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_external_identity
      ON users(identity_provider, external_tenant_id, external_user_id)
      WHERE identity_provider IS NOT NULL;
  `);
};
