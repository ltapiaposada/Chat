/**
 * @file Promueve al usuario `agent1@support.com` de la empresa con `id = 1`
 * al rol de `admin` para fines de desarrollo. La operación inversa restaura
 * el rol a `agent`.
 */

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE users
    SET role = 'admin'
    WHERE email = 'agent1@support.com' AND company_id = 1;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE users
    SET role = 'agent'
    WHERE email = 'agent1@support.com' AND company_id = 1 AND role::text = 'admin';
  `);
};
