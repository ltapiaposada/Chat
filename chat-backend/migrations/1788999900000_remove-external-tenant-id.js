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
