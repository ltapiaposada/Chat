/**
 * @file Modifica la restricción de unicidad de `whatsapp_id` en la tabla
 * `users`. Elimina la restricción global y el índice existente, y crea un
 * nuevo índice único compuesto `(company_id, channel_id, whatsapp_id)` para
 * permitir que el mismo número de WhatsApp se use en diferentes empresas
 * y canales.
 */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_whatsapp_id_key;
    DROP INDEX IF EXISTS idx_users_whatsapp_id;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_whatsapp_tenant
      ON users(company_id, channel_id, whatsapp_id)
      WHERE whatsapp_id IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_users_whatsapp_tenant;
    CREATE INDEX IF NOT EXISTS idx_users_whatsapp_id ON users(whatsapp_id);
  `);
};
