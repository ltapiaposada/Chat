/**
 * @file Agrega los valores `supervisor` y `admin` al tipo enumerado
 * `user_role` de PostgreSQL, habilitando los roles de gestión en el
 * sistema de usuarios.
 */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
  `);
};

exports.down = () => {};
