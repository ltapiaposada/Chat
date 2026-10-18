/**
 * @file Crea la tabla `password_reset_tokens` para gestionar tokens de
 * restablecimiento de contraseña. Almacena el hash del token, la fecha
 * de expiración y un registro de uso. Cada token está vinculado a un
 * usuario y empresa específicos, y se elimina en cascada cuando se
 * borra el usuario.
 */

exports.up = pgm => pgm.sql(`
  CREATE TABLE password_reset_tokens (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
exports.down = pgm => pgm.sql('DROP TABLE password_reset_tokens');
