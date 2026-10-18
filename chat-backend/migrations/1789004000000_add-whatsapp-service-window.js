/**
 * @file Agrega la columna `last_customer_message_at` de tipo `timestamptz`
 * a la tabla `chats`. Se utiliza para calcular la ventana de servicio
 * de WhatsApp y gestionar los límites de respuesta del proveedor.
 */

exports.up = (pgm) => {
  pgm.addColumn('chats', {
    last_customer_message_at: { type: 'timestamptz' }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('chats', 'last_customer_message_at');
};
