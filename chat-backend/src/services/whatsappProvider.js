const metaCloud = require('./whatsappService');

const providers = new Map([
  ['meta_cloud', metaCloud]
]);

/**
 * Resuelve el adaptador de WhatsApp configurado para una conexión.
 * @param {Object} connection - Conexión empresarial.
 * @returns {Object} Adaptador del proveedor.
 * @throws {Error} Si el proveedor no está soportado.
 */
function providerFor(connection) {
  const provider = providers.get(connection?.provider);
  if (!provider) throw new Error(`Unsupported WhatsApp provider: ${connection?.provider || 'missing'}`);
  return provider;
}

module.exports = { providerFor };
