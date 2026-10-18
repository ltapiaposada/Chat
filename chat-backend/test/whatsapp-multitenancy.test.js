/**
 * @file whatsapp-multitenancy.test.js
 * @description Pruebas de aislamiento multitenant de WhatsApp.
 * Los tests están escritos en español. Verifican el cifrado de credenciales, la
 * validación de firmas de Meta, la derivación del tenant desde la conexión, el
 * descubrimiento de conexiones por canal y la unicidad de usuarios por tenant.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.AUTH_SECRET ||= 'test-auth-secret-with-enough-entropy';

const { encryptCredential, decryptCredential } = require('../src/config/credentialCrypto');
const { validSignature } = require('../src/routes/whatsapp');

test('WhatsApp credentials are encrypted with authenticated encryption', () => {
  const first = encryptCredential('secret-value');
  const second = encryptCredential('secret-value');
  assert.notEqual(first, 'secret-value');
  assert.notEqual(first, second);
  assert.equal(decryptCredential(first), 'secret-value');
  assert.throws(() => decryptCredential(`${first.slice(0, -1)}x`));
});

test('Meta webhook signature validates the exact raw payload', () => {
  const body = Buffer.from('{"entry":[]}');
  const secret = 'meta-app-secret';
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  assert.equal(validSignature(body, signature, secret), true);
  assert.equal(validSignature(Buffer.from('{"entry":[1]}'), signature, secret), false);
  assert.equal(validSignature(body, signature, 'other-company-secret'), false);
});

test('WhatsApp webhook derives tenant from its connection and has no global endpoint', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/routes/whatsapp.js'), 'utf8');
  assert.match(source, /webhook\/:webhookKey/);
  assert.match(source, /connection\.companyId/);
  assert.match(source, /connection\.channelId/);
  assert.doesNotMatch(source, /WHATSAPP_(ACCESS_TOKEN|PHONE_NUMBER_ID|VERIFY_TOKEN)/);
  assert.doesNotMatch(source, /['"]\/api\/whatsapp\/webhook['"]/);
});

test('outgoing WhatsApp calls resolve connection from the chat channel', () => {
  const handler = fs.readFileSync(
    path.join(__dirname, '../src/infrastructure/websocket/handlers/supportChatHandlers.js'),
    'utf8'
  );
  assert.match(handler, /findByChannelId\([\s\S]*chat\.channelId[\s\S]*chat\.companyId/);
  assert.match(handler, /providerFor\(whatsappConnection\)\.sendText\(whatsappConnection,/);
  assert.match(handler, /updateExternalMessageId\(message\.id, externalId, whatsappConnection\.id\)/);
});

test('incoming WhatsApp users are created atomically within their tenant', () => {
  const route = fs.readFileSync(path.join(__dirname, '../src/routes/whatsapp.js'), 'utf8');
  const repository = fs.readFileSync(
    path.join(__dirname, '../src/infrastructure/repositories/UserRepository.js'),
    'utf8'
  );
  const migration = fs.readFileSync(
    path.join(__dirname, '../migrations/1789165800000_scope-whatsapp-users.js'),
    'utf8'
  );
  assert.match(route, /findOrCreateWhatsApp/);
  assert.match(repository, /ON CONFLICT \(company_id, channel_id, whatsapp_id\)/);
  assert.match(migration, /idx_users_whatsapp_tenant/);
  assert.match(migration, /DROP CONSTRAINT IF EXISTS users_whatsapp_id_key/);
});

test('pending WhatsApp updates include the latest message preview', () => {
  const route = fs.readFileSync(path.join(__dirname, '../src/routes/whatsapp.js'), 'utf8');
  const repository = fs.readFileSync(
    path.join(__dirname, '../src/infrastructure/repositories/ChatRepository.js'),
    'utf8'
  );
  assert.match(route, /const pendingChat = await chatRepository\.findById/);
  assert.match(route, /emit\('chat:new-pending', pendingChat\)/);
  assert.match(repository, /AS last_message/);
});

test('WhatsApp delivery states cannot overwrite a read message', () => {
  const repository = fs.readFileSync(
    path.join(__dirname, '../src/infrastructure/repositories/MessageRepository.js'),
    'utf8'
  );
  const route = fs.readFileSync(path.join(__dirname, '../src/routes/whatsapp.js'), 'utf8');

  assert.match(repository, /WHEN 'delivered' THEN status IN \('sent', 'delivered'\)/);
  assert.match(repository, /WHEN 'read' THEN status IN \('sent', 'delivered', 'read'\)/);
  assert.match(route, /if \(updated && io && existing\.chatId\)/);
  assert.match(route, /status: updated\.status/);
});
