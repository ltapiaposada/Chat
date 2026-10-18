/**
 * @file Asigna el canal por defecto (`demo`) a todos los usuarios con rol
 * `client` que no tengan un `channel_id` asignado. Si algún cliente queda
 * sin canal después de la actualización, lanza una excepción para detener
 * la migración.
 */

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE users u
    SET channel_id = c.id
    FROM channels c
    WHERE u.role = 'client'
      AND u.channel_id IS NULL
      AND c.company_id = u.company_id
      AND c.slug = 'demo';

    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM users WHERE role = 'client' AND channel_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot leave client users without a channel';
      END IF;
    END $$;
  `);
};

exports.down = () => {};
