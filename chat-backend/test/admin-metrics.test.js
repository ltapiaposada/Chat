/**
 * @file admin-metrics.test.js
 * @description Pruebas de la API de métricas del administrador.
 * Los tests están escritos en español. Verifican que las consultas y respuestas
 * están acotadas a la empresa autenticada, los filtros de rango de fechas y que
 * solo los administradores pueden acceder a las métricas.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const routes = require('../src/routes/adminMetrics');
const { createAuthToken } = require('../src/config/auth');

process.env.AUTH_SECRET = 'admin-metrics-test-secret';
const auth = (companyId) => `Bearer ${createAuthToken({ id: 1, role: 'admin', name: 'Admin', company_id: companyId })}`;

test('metrics queries and response are scoped to authenticated company', async () => {
  const calls = [];
  const db = { query: async (sql, params) => {
    calls.push(params);
    assert.match(sql, /company_id=\$1/);
    assert.match(sql, /created_at >= \$2::timestamptz/);
    assert.match(sql, /created_at < \$3::timestamptz/);
    if (/FROM chats WHERE/.test(sql)) return { rows: [{ total_chats: 2 }] };
    if (/FROM users u/.test(sql)) return { rows: [{ id: 1, name: 'Agent', assigned_chats: 2, active_chats: 1, closed_chats: 1, channels: [], departments: [] }] };
    return { rows: [] };
  } };
  const app = Fastify(); await app.register(routes, { db }); await app.ready();
  const response = await app.inject({ method: 'GET', url: '/api/admin/metrics?from=2026-09-01T00:00:00Z&until=2026-10-01T00:00:00Z&companyId=999', headers: { authorization: auth(404) } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().companyId, 404);
  assert.deepEqual(calls, Array.from({ length: 4 }, () => [404, '2026-09-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z']));
  assert.equal(response.json().agents[0].closed_chats, 1);
  await app.close();
});

test('metrics defaults to the current month and rejects invalid ranges before querying', async () => {
  const calls = [];
  const app = Fastify();
  await app.register(routes, { db: { query: async (sql, params) => { calls.push(params); return { rows: [] }; } } });
  await app.ready();
  const now = new Date();
  const response = await app.inject({ method: 'GET', url: '/api/admin/metrics', headers: { authorization: auth(404) } });
  assert.equal(response.statusCode, 200);
  assert.equal(calls[0][1], new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
  assert.equal(calls[0][2], new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString());
  calls.length = 0;
  for (const query of ['from=invalid', 'from=2026-10-02&until=2026-10-01', 'from=2026-10-01&until=2026-10-01']) {
    const invalid = await app.inject({ method: 'GET', url: `/api/admin/metrics?${query}`, headers: { authorization: auth(404) } });
    assert.equal(invalid.statusCode, 400);
  }
  assert.equal(calls.length, 0);
  await app.close();
});

test('clients cannot access company metrics', async () => {
  const app = Fastify(); await app.register(routes, { db: { query: async () => { throw new Error('must not query'); } } }); await app.ready();
  const token = createAuthToken({ id: 9, role: 'client', name: 'Client', company_id: 1, channel_id: 1 });
  const response = await app.inject({ method: 'GET', url: '/api/admin/metrics', headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.statusCode, 403);
  await app.close();
});
