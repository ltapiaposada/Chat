exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE whatsapp_connections (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      channel_id INTEGER NOT NULL UNIQUE,
      provider VARCHAR(40) NOT NULL DEFAULT 'meta_cloud',
      phone_number_id VARCHAR(120) NOT NULL UNIQUE,
      business_account_id VARCHAR(120),
      display_phone_number VARCHAR(40),
      access_token_encrypted TEXT NOT NULL,
      verify_token_encrypted TEXT NOT NULL,
      app_secret_encrypted TEXT,
      webhook_key VARCHAR(80) NOT NULL UNIQUE
        DEFAULT ('wa_' || replace(gen_random_uuid()::text, '-', '')),
      graph_version VARCHAR(20) NOT NULL DEFAULT 'v19.0',
      status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'disabled', 'error')),
      last_webhook_at TIMESTAMPTZ,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT whatsapp_connections_channel_company_fkey
        FOREIGN KEY (channel_id, company_id) REFERENCES channels(id, company_id) ON DELETE CASCADE
    );

    ALTER TABLE messages ADD COLUMN whatsapp_connection_id INTEGER
      REFERENCES whatsapp_connections(id) ON DELETE SET NULL;

    CREATE UNIQUE INDEX idx_messages_whatsapp_external_unique
      ON messages(whatsapp_connection_id, external_message_id)
      WHERE whatsapp_connection_id IS NOT NULL AND external_message_id IS NOT NULL;
    CREATE INDEX idx_whatsapp_connections_company
      ON whatsapp_connections(company_id, status);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_messages_whatsapp_external_unique;
    ALTER TABLE messages DROP COLUMN IF EXISTS whatsapp_connection_id;
    DROP TABLE IF EXISTS whatsapp_connections;
  `);
};
