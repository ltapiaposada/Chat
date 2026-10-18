/**
 * @file Implementa el borrado lógico (soft delete) en las tablas `channels`
 * y `departments` mediante la columna `deleted_at` de tipo `timestamptz`.
 * Crea índices parciales filtrados por `deleted_at IS NULL` para optimizar
 * las consultas que solo deben retornar registros visibles.
 */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE channels ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE departments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_channels_company_visible
      ON channels(company_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_departments_company_visible
      ON departments(company_id) WHERE deleted_at IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_departments_company_visible;
    DROP INDEX IF EXISTS idx_channels_company_visible;
    ALTER TABLE departments DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE channels DROP COLUMN IF EXISTS deleted_at;
  `);
};
