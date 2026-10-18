/**
 * @file admin-departments.test.js
 * @description Pruebas de la API de gestión de departamentos del administrador.
 * Los tests están escritos en español. Verifican la autorización por rol, el
 * ámbito por empresa en listado, actualización y baja lógica de departamentos.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const routes = require('../src/routes/adminDepartments');
const { createAuthToken } = require('../src/config/auth');

process.env.AUTH_SECRET = 'admin-department-test-secret';
const token = (role, companyId = 101) => createAuthToken({
  id: role === 'admin' ? 1 : 2, role, name: role, company_id: companyId
});
/**
 * Registra las rutas de administración de departamentos en una instancia de Fastify.
 * @param {{ query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }> }} db - Stub de la base de datos.
 * @returns {Promise<import('fastify').FastifyInstance>} Aplicación lista para recibir peticiones.
 */
async function appWith(db) { const app = Fastify(); await app.register(routes, { db }); await app.ready(); return app; }

test('department administration rejects non-admin users', async () => {
  const app = await appWith({ query: async () => { throw new Error('must not query'); } });
  const response = await app.inject({ method: 'GET', url: '/api/admin/departments', headers: { authorization: `Bearer ${token('agent')}` } });
  assert.equal(response.statusCode, 403);
  await app.close();
});

test('department listing is scoped to the authenticated company', async () => {
  const calls = [];
  const app = await appWith({ query: async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [{ id: 7, name: 'Ventas', slug: 'ventas', status: 'active', routing_strategy: 'broadcast', fallback_strategy: 'department_queue', default_agent_id: null, channel_ids: [3], agent_ids: [1] }] };
  } });
  const response = await app.inject({ method: 'GET', url: '/api/admin/departments', headers: { authorization: `Bearer ${token('admin', 202)}` } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls[0].params, [202]);
  assert.deepEqual(response.json()[0].channelIds, [3]);
  await app.close();
});

test('department update cannot cross companies', async () => {
  const calls = [];
  const app = await appWith({ query: async (sql, params) => { calls.push(params); return { rows: [] }; } });
  const response = await app.inject({ method: 'PATCH', url: '/api/admin/departments/77', headers: { authorization: `Bearer ${token('admin')}` }, payload: { name: 'Otro' } });
  assert.equal(response.statusCode, 404);
  assert.equal(calls[0][5], 77);
  assert.equal(calls[0][6], 101);
  await app.close();
});

test('department deletion is tenant scoped and keeps conversation history', async () => {
  const calls = [];
  const app = await appWith({ query: async (sql, params) => {
    calls.push({ sql: String(sql), params });
    if (String(sql).includes('UPDATE departments')) return { rows: [{ id: 7, name: 'Ventas' }] };
    return { rows: [] };
  } });
  const response = await app.inject({
    method: 'DELETE', url: '/api/admin/departments/7',
    headers: { authorization: `Bearer ${token('admin')}` }
  });
  assert.equal(response.statusCode, 204);
  assert.deepEqual(calls[0].params, [7, 101]);
  assert.match(calls[0].sql, /deleted_at = CURRENT_TIMESTAMP/);
  assert.doesNotMatch(calls[0].sql, /DELETE FROM chats/);
  await app.close();
});
