exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      slug VARCHAR(120) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'disabled')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS channels (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(160) NOT NULL,
      slug VARCHAR(120) NOT NULL,
      type VARCHAR(30) NOT NULL DEFAULT 'web',
      public_key VARCHAR(80) NOT NULL UNIQUE
        DEFAULT ('ch_' || replace(gen_random_uuid()::text, '-', '')),
      allowed_origins TEXT[] NOT NULL DEFAULT '{}',
      authentication_mode VARCHAR(20) NOT NULL DEFAULT 'mixed'
        CHECK (authentication_mode IN ('anonymous', 'authenticated', 'mixed')),
      status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'disabled')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (company_id, name),
      UNIQUE (company_id, slug)
    );

    INSERT INTO companies (name, slug)
    VALUES ('Empresa inicial', 'default-company')
    ON CONFLICT (slug) DO NOTHING;

    INSERT INTO channels (company_id, name, slug, allowed_origins)
    SELECT id, 'Demostración local', 'demo', ARRAY['http://localhost:5173', 'http://localhost:5174']
    FROM companies WHERE slug = 'default-company'
    ON CONFLICT (company_id, slug) DO NOTHING;

    INSERT INTO channels (company_id, name, slug, allowed_origins, authentication_mode)
    SELECT id, 'Orka local', 'orka', ARRAY['http://localhost:5173'], 'authenticated'
    FROM companies WHERE slug = 'default-company'
    ON CONFLICT (company_id, slug) DO NOTHING;

    ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS channel_id INTEGER;

    UPDATE users
    SET company_id = (SELECT id FROM companies WHERE slug = 'default-company')
    WHERE company_id IS NULL;

    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'external_tenant_id'
      ) THEN
        EXECUTE $migration$
          UPDATE users u
          SET channel_id = c.id
          FROM channels c
          JOIN companies co ON co.id = c.company_id
          WHERE u.channel_id IS NULL
            AND u.identity_provider = 'widget'
            AND co.slug = 'default-company'
            AND c.slug = CASE WHEN u.external_tenant_id = 'orka-local' THEN 'orka' ELSE 'demo' END
        $migration$;
      END IF;
    END $$;

    ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;

    DO $$ BEGIN
      ALTER TABLE users
        ADD CONSTRAINT users_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE users
        ADD CONSTRAINT users_channel_id_fkey
        FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
    CREATE INDEX IF NOT EXISTS idx_users_channel_id ON users(channel_id);
    CREATE INDEX IF NOT EXISTS idx_channels_company_id ON channels(company_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_channel_external_identity
      ON users(identity_provider, channel_id, external_user_id)
      WHERE identity_provider IS NOT NULL AND channel_id IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_users_channel_external_identity;
    DROP INDEX IF EXISTS idx_users_channel_id;
    DROP INDEX IF EXISTS idx_users_company_id;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_channel_id_fkey;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_id_fkey;
    ALTER TABLE users DROP COLUMN IF EXISTS channel_id;
    ALTER TABLE users DROP COLUMN IF EXISTS company_id;
    DROP TABLE IF EXISTS channels;
    DROP TABLE IF EXISTS companies;
  `);
};
