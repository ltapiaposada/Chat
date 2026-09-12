exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE chats ADD COLUMN IF NOT EXISTS company_id INTEGER;
    ALTER TABLE chats ADD COLUMN IF NOT EXISTS channel_id INTEGER;

    UPDATE chats c
    SET company_id = u.company_id
    FROM users u
    WHERE c.client_id = u.id AND c.company_id IS NULL;

    UPDATE chats c
    SET channel_id = COALESCE(
      u.channel_id,
      (SELECT ch.id FROM channels ch
       WHERE ch.company_id = c.company_id
         AND ch.slug = CASE WHEN c.channel = 'whatsapp' THEN 'whatsapp' ELSE 'demo' END
       LIMIT 1)
    )
    FROM users u
    WHERE c.client_id = u.id AND c.channel_id IS NULL;

    UPDATE users u
    SET channel_id = c.id
    FROM channels c
    WHERE u.role = 'client'
      AND u.channel_id IS NULL
      AND c.company_id = u.company_id
      AND c.slug = 'demo';

    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM chats WHERE company_id IS NULL OR channel_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot migrate chats without company and channel';
      END IF;
    END $$;

    ALTER TABLE chats ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE chats ALTER COLUMN channel_id SET NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_id_company ON users(id, company_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_id_company ON channels(id, company_id);

    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT users_channel_company_fkey
        FOREIGN KEY (channel_id, company_id) REFERENCES channels(id, company_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE chats ADD CONSTRAINT chats_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE chats ADD CONSTRAINT chats_channel_id_fkey
        FOREIGN KEY (channel_id) REFERENCES channels(id);
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

    CREATE INDEX IF NOT EXISTS idx_chats_company_id ON chats(company_id);
    CREATE INDEX IF NOT EXISTS idx_chats_channel_id ON chats(channel_id);
    CREATE INDEX IF NOT EXISTS idx_chats_company_status ON chats(company_id, status);
    CREATE INDEX IF NOT EXISTS idx_chats_company_client ON chats(company_id, client_id);
    CREATE INDEX IF NOT EXISTS idx_chats_company_agent ON chats(company_id, agent_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_chats_company_agent;
    DROP INDEX IF EXISTS idx_chats_company_client;
    DROP INDEX IF EXISTS idx_chats_company_status;
    DROP INDEX IF EXISTS idx_chats_channel_id;
    DROP INDEX IF EXISTS idx_chats_company_id;
    ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_channel_id_fkey;
    ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_company_id_fkey;
    ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_agent_company_fkey;
    ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_client_company_fkey;
    ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_channel_company_fkey;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_channel_company_fkey;
    DROP INDEX IF EXISTS idx_channels_id_company;
    DROP INDEX IF EXISTS idx_users_id_company;
    ALTER TABLE chats DROP COLUMN IF EXISTS channel_id;
    ALTER TABLE chats DROP COLUMN IF EXISTS company_id;
  `);
};
