/**
 * @file admin-channels.test.js
 * @description Pruebas de la API de gestión de canales del administrador.
 * Los tests están escritos en español. Verifican la autorización por rol, el
 * ámbito por empresa de las consultas, la creación/actualización de canales y
 * la baja lógica que preserva las conversaciones.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');

const adminChannelRoutes = require('../src/routes/adminChannels');
const { createAuthToken } = require('../src/config/auth');

process.env.AUTH_SECRET = 'admin-route-test-secret';

/**
 * Crea un token de autenticación con el rol y la empresa indicados.
 * @param {string} role - Rol del usuario ('admin' o 'agent').
 * @param {number} [companyId=101] - Identificador de la empresa.
 * @returns {string} Token JWT firmado.
 */
function token(role, companyId = 101) {
  return createAuthToken({ id: role === 'admin' ? 1 : 2, role, name: role, company_id: companyId });
}

/**
 * Registra las rutas de administración de canales en una instancia de Fastify.
 * @param {{ query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }> }} db - Stub de la base de datos.
 * @returns {Promise<import('fastify').FastifyInstance>} Aplicación lista para recibir peticiones.
 */
async function appWith(db) {
  const app = Fastify();
  await app.register(adminChannelRoutes, { db });
  await app.ready();
  return app;
}

test('channel administration rejects non-admin users', async () => {
  const app = await appWith({ query: async () => { throw new Error('must not query'); } });
  const response = await app.inject({
    method: 'GET', url: '/api/admin/channels',
    headers: { authorization: `Bearer ${token('agent')}` }
  });
  assert.equal(response.statusCode, 403);
  await app.close();
});

test('channel listing is scoped to the administrator company and hides secrets', async () => {
  const calls = [];
  const app = await appWith({
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [{
        id: 5, name: 'Web', slug: 'web', type: 'web', public_key: 'ch_public',
        allowed_origins: ['https://example.com'], authentication_mode: 'mixed',
        status: 'active', assertion_issuer: 'external', credential_version: 2,
        assigned_agents: 1, last_activity_at: null
      }] };
    }
  });
  const response = await app.inject({
    method: 'GET', url: '/api/admin/channels',
    headers: { authorization: `Bearer ${token('admin')}` }
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls[0].params, [101]);
  assert.equal(response.json()[0].publicKey, 'ch_public');
  assert.equal('signingSecret' in response.json()[0], false);
  await app.close();
});

test('administrator cannot update a channel from another company', async () => {
  const calls = [];
  const app = await appWith({
    query: async (sql, params) => { calls.push({ sql, params }); return { rows: [] }; }
  });
  const response = await app.inject({
    method: 'PATCH', url: '/api/admin/channels/88',
    headers: { authorization: `Bearer ${token('admin')}` },
    payload: { name: 'No access' }
  });
  assert.equal(response.statusCode, 404);
  assert.deepEqual(calls[0].params.slice(-2), [88, 101]);
  await app.close();
});

test('channel creation rejects non-origin URLs before writing', async () => {
  let queried = false;
  const app = await appWith({ query: async () => { queried = true; return { rows: [] }; } });
  const response = await app.inject({
    method: 'POST', url: '/api/admin/channels',
    headers: { authorization: `Bearer ${token('admin')}` },
    payload: { name: 'Bad', slug: 'bad', allowedOrigins: ['https://example.com/path'] }
  });
  assert.equal(response.statusCode, 400);
  assert.equal(queried, false);
  await app.close();
});

test('WhatsApp creation ignores widget-only authentication and origin fields', async () => {
  const calls = [];
  const app = await appWith({
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (String(sql).includes('INSERT INTO channels')) {
        return { rows: [{ id: 9, name: 'WhatsApp', slug: 'whatsapp', type: 'whatsapp' }] };
      }
      return { rows: [] };
    }
  });
  const response = await app.inject({
    method: 'POST', url: '/api/admin/channels',
    headers: { authorization: `Bearer ${token('admin')}` },
    payload: {
      name: 'WhatsApp', slug: 'whatsapp', type: 'whatsapp',
      authenticationMode: 'authenticated',
      allowedOrigins: ['not-a-url'], assertionIssuer: 'irrelevant'
    }
  });
  assert.equal(response.statusCode, 201);
  const insert = calls.find((call) => String(call.sql).includes('INSERT INTO channels'));
  assert.deepEqual(insert.params[6], []);
  assert.equal(insert.params[7], 'anonymous');
  assert.equal(insert.params[8], 'not-applicable');
  await app.close();
});

test('channel deletion is tenant scoped and preserves data through soft deletion', async () => {
  const calls = [];
  const app = await appWith({
    query: async (sql, params) => {
      calls.push({ sql: String(sql), params });
      if (String(sql).includes('UPDATE channels')) return { rows: [{ id: 9, name: 'Web' }] };
      return { rows: [] };
    }
  });
  const response = await app.inject({
    method: 'DELETE', url: '/api/admin/channels/9',
    headers: { authorization: `Bearer ${token('admin')}` }
  });
  assert.equal(response.statusCode, 204);
  assert.deepEqual(calls[0].params, [9, 101]);
  assert.match(calls[0].sql, /deleted_at = CURRENT_TIMESTAMP/);
  assert.doesNotMatch(calls[0].sql, /DELETE FROM chats/);
  await app.close();
});
