exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE agent_channels (
      agent_id INTEGER NOT NULL,
      channel_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (agent_id, channel_id),
      CONSTRAINT agent_channels_agent_company_fkey
        FOREIGN KEY (agent_id, company_id) REFERENCES users(id, company_id) ON DELETE CASCADE,
      CONSTRAINT agent_channels_channel_company_fkey
        FOREIGN KEY (channel_id, company_id) REFERENCES channels(id, company_id) ON DELETE CASCADE
    );

    CREATE INDEX idx_agent_channels_company_channel
      ON agent_channels(company_id, channel_id, agent_id);

    INSERT INTO agent_channels (agent_id, channel_id, company_id)
    SELECT u.id, c.id, u.company_id
    FROM users u
    JOIN channels c ON c.company_id = u.company_id AND c.status = 'active'
    WHERE u.role::text IN ('agent', 'supervisor', 'admin')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS agent_channels;');
};
