/**
 * @file company-onboarding.test.js
 * @description Pruebas de la API de registro de empresas.
 * Los tests están escritos en español. Verifican que el alta de una empresa
 * crea de forma atómica la empresa, el canal, el administrador y su asignación,
 * y que rechaza orígenes con ruta antes de abrir la transacción.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const routes = require('../src/routes/companyOnboarding');

test('company onboarding creates company, channel, administrator and assignment atomically', async () => {
  const previousSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = 'test-secret-for-company-onboarding';
  const statements = [];
  const client = {
    async query(sql) {
      statements.push(String(sql));
      if (String(sql).includes('SELECT id FROM users')) return { rows: [] };
      if (String(sql).includes('INSERT INTO companies')) return { rows: [{ id: 20, name: 'Acme', slug: 'acme-a1b2c3', status: 'active' }] };
      if (String(sql).includes('INSERT INTO channels')) return { rows: [{ id: 30, name: 'Sitio principal', public_key: 'ch_test', allowed_origins: ['https://acme.test'] }] };
      if (String(sql).includes('INSERT INTO users')) return { rows: [{ id: 40, name: 'Ana', email: 'ana@acme.test', role: 'admin', company_id: 20 }] };
      return { rows: [] };
    },
    release() {}
  };
  const app = Fastify();
  await app.register(routes, { db: { getClient: async () => client } });
  const response = await app.inject({ method: 'POST', url: '/api/companies/register', payload: {
    companyName: 'Acme', adminName: 'Ana', email: 'ana@acme.test', password: 'segura123', origin: 'https://acme.test'
  }});
  assert.equal(response.statusCode, 201);
  assert.equal(response.json().user.role, 'admin');
  assert.equal(response.json().company.id, 20);
  assert.ok(response.json().token);
  assert.ok(statements.some(sql => sql.includes('BEGIN')));
  assert.ok(statements.some(sql => sql.includes('agent_channels')));
  assert.ok(statements.some(sql => sql.includes('COMMIT')));
  await app.close();
  process.env.AUTH_SECRET = previousSecret;
});

test('company onboarding rejects a URL with a path before opening a transaction', async () => {
  const app = Fastify();
  await app.register(routes, { db: { getClient: async () => { throw new Error('must not connect'); } } });
  const response = await app.inject({ method: 'POST', url: '/api/companies/register', payload: {
    companyName: 'Acme', adminName: 'Ana', email: 'ana2@acme.test', password: 'segura123', origin: 'https://acme.test/path'
  }});
  assert.equal(response.statusCode, 400);
  await app.close();
});
