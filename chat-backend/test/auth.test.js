const test = require('node:test');
const assert = require('node:assert/strict');

const { createAuthToken, verifyAuthToken } = require('../src/config/auth');
const { getTokenFromRequest } = require('../src/plugins/auth');

test('createAuthToken + verifyAuthToken roundtrip', () => {
  process.env.AUTH_SECRET = 'test-secret';

  const token = createAuthToken({
    id: 42,
    role: 'agent',
    name: 'Agent Smith',
    email: 'agent@example.com'
  });

  assert.equal(token.split('.').length, 3);

  const payload = verifyAuthToken(token);
  assert.deepEqual(payload, {
    userId: 42,
    role: 'agent',
    name: 'Agent Smith',
    email: 'agent@example.com'
  });
});

test('verifyAuthToken rejects tampered token', () => {
  process.env.AUTH_SECRET = 'test-secret';

  const token = createAuthToken({
    id: 7,
    role: 'client',
    name: 'Client',
    email: 'client@example.com'
  });

  const [header, payload, signature] = token.split('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({
      sub: 999,
      role: 'agent',
      name: 'Mallory',
      exp: Math.floor(Date.now() / 1000) + 60
    })
  ).toString('base64url');

  assert.throws(() => verifyAuthToken(`${header}.${tamperedPayload}.${signature}`), /Invalid token signature/);
  assert.doesNotThrow(() => verifyAuthToken(`${header}.${payload}.${signature}`));
});

test('verifyAuthToken rejects expired token', () => {
  process.env.AUTH_SECRET = 'test-secret';
  process.env.AUTH_TOKEN_TTL_MS = '-1';

  const token = createAuthToken({
    id: 1,
    role: 'client',
    name: 'Expired User',
    email: null
  });

  assert.throws(() => verifyAuthToken(token), /Token expired/);

  delete process.env.AUTH_TOKEN_TTL_MS;
});

test('createAuthToken requires AUTH_SECRET', () => {
  delete process.env.AUTH_SECRET;

  assert.throws(
    () => createAuthToken({ id: 1, role: 'agent', name: 'Missing Secret', email: null }),
    /AUTH_SECRET is required/
  );
});

test('getTokenFromRequest reads bearer token and query token fallback', () => {
  assert.equal(
    getTokenFromRequest({
      headers: { authorization: 'Bearer abc.def.ghi' },
      query: {}
    }),
    'abc.def.ghi'
  );

  assert.equal(
    getTokenFromRequest({
      headers: {},
      query: { token: 'query-token' }
    }),
    'query-token'
  );
});
