/**
 * @file Crea la tabla `admin_audit_logs` para registrar acciones de
 * administración realizadas por usuarios dentro de cada empresa. Almacena
 * el identificador del actor, el canal afectado, la acción realizada y
 * metadatos adicionales en formato JSONB. Incluye claves foráneas
 * compuestas y un índice ordenado por fecha de creación descendente.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE admin_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      actor_id INTEGER NOT NULL,
      channel_id INTEGER,
      action VARCHAR(80) NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT admin_audit_actor_company_fkey
        FOREIGN KEY (actor_id, company_id) REFERENCES users(id, company_id),
      CONSTRAINT admin_audit_channel_company_fkey
        FOREIGN KEY (channel_id, company_id) REFERENCES channels(id, company_id) ON DELETE SET NULL
    );

    CREATE INDEX idx_admin_audit_company_created
      ON admin_audit_logs(company_id, created_at DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS admin_audit_logs;
  `);
};
