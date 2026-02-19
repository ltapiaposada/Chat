async function ensureSchema(db) {
  // WhatsApp user mapping
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_id TEXT`);
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_whatsapp_id ON users(whatsapp_id)`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);

  // Chat channel
  await db.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'web'`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_chats_channel ON chats(channel)`);

  // Chat metrics
  await db.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP`);
  await db.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS rating INTEGER`);
  await db.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS feedback TEXT`);

  // Message metadata
  await db.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent'`);
  await db.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'web'`);
  await db.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id TEXT`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_message_id)`);

  // Group chat tables
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

  // Agent direct messages (1:1)
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

  // Unread tracking for agent chats (DM, group, global)
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

  // Quick phrases (global)
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quick_phrases' AND column_name = 'user_id'
      ) THEN
        CREATE TABLE IF NOT EXISTS quick_phrases_new (
          id SERIAL PRIMARY KEY,
          label VARCHAR(100) NOT NULL,
          text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (label)
        );

        INSERT INTO quick_phrases_new (label, text, created_at, updated_at)
        SELECT qp.label, qp.text, qp.created_at, qp.updated_at
        FROM quick_phrases qp
        JOIN users u ON u.id = qp.user_id
        WHERE u.email = 'agent1@support.com'
        ON CONFLICT (label) DO UPDATE SET
          text = EXCLUDED.text,
          updated_at = CURRENT_TIMESTAMP;

        DROP TABLE quick_phrases;
        ALTER TABLE quick_phrases_new RENAME TO quick_phrases;
      ELSE
        CREATE TABLE IF NOT EXISTS quick_phrases (
          id SERIAL PRIMARY KEY,
          label VARCHAR(100) NOT NULL,
          text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (label)
        );
      END IF;
    END $$;
  `);
}

module.exports = { ensureSchema };
