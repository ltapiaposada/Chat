exports.up = (pgm) => {
  pgm.addColumn('chats', {
    last_customer_message_at: { type: 'timestamptz' }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('chats', 'last_customer_message_at');
};
