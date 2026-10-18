/**
 * Garantiza de forma idempotente las tablas y columnas auxiliares requeridas.
 * @param {Object} db - Adaptador de PostgreSQL.
 * @returns {Promise<void>}
 * @throws {Error} Si alguna actualización del esquema falla.
 */
async function ensureSchema(db) {
  await db.query(`ALTER TABLE channels ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await db.query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);

  // Aísla identidades de WhatsApp por empresa y canal.
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_id TEXT`);
  await db.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_whatsapp_id_key`);
  await db.query(`DROP INDEX IF EXISTS idx_users_whatsapp_id`);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_whatsapp_tenant
    ON users(company_id, channel_id, whatsapp_id)
    WHERE whatsapp_id IS NOT NULL
  `);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_provider TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS external_user_id TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS external_email TEXT`);
  await db.query(`
    UPDATE users
    SET password_hash = '$2a$10$EO7JDAOrvbzDzDOJyRGhOOoWTstokCH9jFH/YR3MPn1V0Dx1AVQuG'
    WHERE email IN ('agent1@support.com', 'agent2@support.com', 'agent3@support.com') AND password_hash IS NULL
  `);

  // Añade la procedencia y el canal concreto de cada conversación.
  await db.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'web'`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_chats_channel ON chats(channel)`);

  // Mantiene marcas necesarias para métricas operativas.
  await db.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP`);
  await db.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS rating INTEGER`);
  await db.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS feedback TEXT`);

  // Conserva metadatos externos y estados de entrega.
  await db.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent'`);
  await db.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'web'`);
  await db.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id TEXT`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_message_id)`);

  // Crea la colaboración grupal entre agentes.
  await db.query(`
    CREATE TABLE IF NOT EXISTS group_chats (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id INTEGER NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      added_by INTEGER REFERENCES users(id),
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, user_id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS group_messages (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC)`);

  // Crea la mensajería directa entre agentes.
  await db.query(`
    CREATE TABLE IF NOT EXISTS agent_dm_messages (
      id SERIAL PRIMARY KEY,
      agent_a INTEGER NOT NULL REFERENCES users(id),
      agent_b INTEGER NOT NULL REFERENCES users(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_agent_dm_pair_created ON agent_dm_messages(agent_a, agent_b, created_at DESC)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_agent_dm_user_id ON agent_dm_messages(user_id)`);

  // Registra la última lectura de chats directos, grupales y globales.
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_dm_reads (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, agent_a, agent_b)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_group_reads (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
      last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, group_id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_global_reads (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Crea frases rápidas globales sin ejecutar migraciones destructivas.
  await db.query(`
    CREATE TABLE IF NOT EXISTS quick_phrases (
      id SERIAL PRIMARY KEY,
      label VARCHAR(100) NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (label)
    )
  `);
}

module.exports = { ensureSchema };
