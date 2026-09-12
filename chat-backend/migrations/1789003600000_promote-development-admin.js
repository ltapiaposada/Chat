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
