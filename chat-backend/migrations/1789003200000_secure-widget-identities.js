exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE channels ADD COLUMN signing_secret TEXT;
    ALTER TABLE channels ADD COLUMN assertion_issuer VARCHAR(200) NOT NULL DEFAULT 'external-site';
    ALTER TABLE channels ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 1;

    UPDATE channels
    SET signing_secret = md5(random()::text || clock_timestamp()::text || id::text)
      || md5(gen_random_uuid()::text || random()::text)
    WHERE signing_secret IS NULL;

    ALTER TABLE channels ALTER COLUMN signing_secret SET NOT NULL;

    CREATE TABLE widget_assertion_nonces (
      channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      nonce_hash CHAR(64) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (channel_id, nonce_hash)
    );

    CREATE INDEX idx_widget_assertion_nonces_expiry
      ON widget_assertion_nonces(expires_at);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS widget_assertion_nonces;
    ALTER TABLE channels DROP COLUMN IF EXISTS credential_version;
    ALTER TABLE channels DROP COLUMN IF EXISTS assertion_issuer;
    ALTER TABLE channels DROP COLUMN IF EXISTS signing_secret;
  `);
};
