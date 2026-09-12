const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');
const { registerSecurityHeaders } = require('../src/plugins/securityHeaders');
const { createRateLimit } = require('../src/plugins/rateLimit');
const { validateProductionConfig } = require('../src/config/productionSecurity');

test('API responses include defensive browser headers', async () => {
  const app = Fastify();
  registerSecurityHeaders(app);
  app.get('/test', async () => ({ ok: true }));
  const response = await app.inject('/test');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.equal(response.headers['cache-control'], 'no-store');
  await app.close();
});

test('rate limits expose remaining quota and reject excess traffic', async () => {
  const app = Fastify();
  const limiter = createRateLimit({ windowMs: 60_000, max: 1 });
  app.get('/limited', { preHandler: limiter }, async () => ({ ok: true }));
  const first = await app.inject('/limited');
  const second = await app.inject('/limited');
  assert.equal(first.headers['x-ratelimit-remaining'], '0');
  assert.equal(second.statusCode, 429);
  assert.ok(second.headers['retry-after']);
  await app.close();
});

test('production refuses weak secrets, HTTP origins and default database password', () => {
  assert.throws(() => validateProductionConfig({
    NODE_ENV: 'production', AUTH_SECRET: 'short', WHATSAPP_CREDENTIALS_KEY: 'short',
    CLIENT_URL: 'http://localhost:5173', DB_PASSWORD: 'postgres'
  }), /Unsafe production configuration/);
  assert.doesNotThrow(() => validateProductionConfig({
    NODE_ENV: 'production', AUTH_SECRET: 'a'.repeat(32), WHATSAPP_CREDENTIALS_KEY: 'b'.repeat(32),
    CLIENT_URL: 'https://chat.example.com', DATABASE_URL: 'postgres://configured'
  }));
});
