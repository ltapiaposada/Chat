exports.up = (pgm) => {
  pgm.sql(`
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
  `);
};

exports.down = () => {};
