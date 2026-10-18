/**
 * @file Elimina la columna `legacy_widget_id` de la tabla `channels` tras
 * migrar sus valores al nuevo campo `slug`. Asigna slugs basados en los
 * identificadores heredados, actualiza el modo de autenticación del canal
 * `orka-local`, sincroniza `external_tenant_id` de los usuarios con la
 * clave pública del canal, y crea un índice único sobre `(company_id, slug)`.
 */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE channels ADD COLUMN IF NOT EXISTS slug VARCHAR(120);

    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'channels'
          AND column_name = 'legacy_widget_id'
      ) THEN
        UPDATE channels
        SET slug = CASE legacy_widget_id
          WHEN 'default' THEN 'main'
          WHEN 'demo' THEN 'demo'
          WHEN 'orka-local' THEN 'orka'
          ELSE 'channel-' || id::text
        END
        WHERE slug IS NULL;

        DELETE FROM channels c
        WHERE c.legacy_widget_id = 'default'
          AND NOT EXISTS (SELECT 1 FROM users u WHERE u.channel_id = c.id);

        UPDATE channels
        SET authentication_mode = 'authenticated'
        WHERE legacy_widget_id = 'orka-local';

        UPDATE users u
        SET external_tenant_id = c.public_key
        FROM channels c
        WHERE u.channel_id = c.id
          AND u.identity_provider = 'widget';

        ALTER TABLE channels DROP COLUMN legacy_widget_id;
      END IF;
    END $$;

    UPDATE channels SET slug = 'channel-' || id::text WHERE slug IS NULL;
    ALTER TABLE channels ALTER COLUMN slug SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_company_slug
      ON channels(company_id, slug);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_channels_company_slug;
    ALTER TABLE channels ADD COLUMN IF NOT EXISTS legacy_widget_id VARCHAR(120);
  `);
};
