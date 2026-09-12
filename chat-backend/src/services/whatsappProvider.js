const metaCloud = require('./whatsappService');

const providers = new Map([
  ['meta_cloud', metaCloud]
]);

function providerFor(connection) {
  const provider = providers.get(connection?.provider);
  if (!provider) throw new Error(`Unsupported WhatsApp provider: ${connection?.provider || 'missing'}`);
  return provider;
}

module.exports = { providerFor };
