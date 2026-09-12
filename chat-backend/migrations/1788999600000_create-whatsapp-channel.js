exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO channels (company_id, name, slug, type, authentication_mode, allowed_origins)
    SELECT id, 'WhatsApp principal', 'whatsapp', 'whatsapp', 'authenticated', '{}'
    FROM companies
    WHERE slug = 'default-company'
    ON CONFLICT (company_id, slug) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM channels c
    USING companies co
    WHERE c.company_id = co.id
      AND co.slug = 'default-company'
      AND c.slug = 'whatsapp'
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.channel_id = c.id);
  `);
};
