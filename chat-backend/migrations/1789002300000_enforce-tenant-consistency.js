/**
 * @file Refuerza la consistencia de datos entre tenants creando índices
 * únicos compuestos en `users(id, company_id)` y `channels(id, company_id)`,
 * y agregando claves foráneas compuestas que aseguran que la columna
 * `channel_id`, los clientes (`client_id`) y los agentes (`agent_id`) en la
 * tabla `chats` pertenezcan a la misma empresa.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_id_company ON users(id, company_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_id_company ON channels(id, company_id);

    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT users_channel_company_fkey
        FOREIGN KEY (channel_id, company_id) REFERENCES channels(id, company_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE chats ADD CONSTRAINT chats_channel_company_fkey
        FOREIGN KEY (channel_id, company_id) REFERENCES channels(id, company_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE chats ADD CONSTRAINT chats_client_company_fkey
        FOREIGN KEY (client_id, company_id) REFERENCES users(id, company_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE chats ADD CONSTRAINT chats_agent_company_fkey
        FOREIGN KEY (agent_id, company_id) REFERENCES users(id, company_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_agent_company_fkey;
    ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_client_company_fkey;
    ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_channel_company_fkey;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_channel_company_fkey;
    DROP INDEX IF EXISTS idx_channels_id_company;
    DROP INDEX IF EXISTS idx_users_id_company;
  `);
};
