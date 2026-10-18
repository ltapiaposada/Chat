/**
 * @file auth.test.js
 * @description Pruebas de autenticación JWT (createAuthToken/verifyAuthToken)
 * y de los plugins de autorización HTTP.
 * Los tests están escritos en español. Cubren el roundtrip del token, el
 * contexto de empresa/canal, el rechazo de tokens manipulados, vencidos o sin
 * contexto de tenant, y la extracción del token de la petición.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { createAuthToken, verifyAuthToken } = require('../src/config/auth');
const { authorizeChatMessageAccess, getTokenFromRequest } = require('../src/plugins/auth');
const chatRepository = require('../src/infrastructure/repositories/ChatRepository');
const messageRepository = require('../src/infrastructure/repositories/MessageRepository');

test('createAuthToken + verifyAuthToken roundtrip', () => {
  process.env.AUTH_SECRET = 'test-secret';

  const token = createAuthToken({
    id: 42,
    role: 'agent',
    name: 'Agent Smith',
    email: 'agent@example.com',
    company_id: 1
  });

  assert.equal(token.split('.').length, 3);

  const payload = verifyAuthToken(token);
  assert.deepEqual(payload, {
    userId: 42,
    role: 'agent',
    name: 'Agent Smith',
    email: 'agent@example.com',
    companyId: 1,
    channelId: null
  });
});

test('auth token preserves company and channel context', () => {
  process.env.AUTH_SECRET = 'test-secret';
  const token = createAuthToken({
    id: 9,
    role: 'client',
    name: 'Tenant client',
    company_id: 101,
    channel_id: 1001
  });

  const payload = verifyAuthToken(token);
  assert.equal(payload.companyId, 101);
  assert.equal(payload.channelId, 1001);
});

test('verifyAuthToken rejects tampered token', () => {
  process.env.AUTH_SECRET = 'test-secret';

  const token = createAuthToken({
    id: 7,
    role: 'client',
    name: 'Client',
    email: 'client@example.com',
    company_id: 1
  });

  const [header, payload, signature] = token.split('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({
      sub: 999,
      role: 'agent',
      name: 'Mallory',
      companyId: 1,
      exp: Math.floor(Date.now() / 1000) + 60
    })
  ).toString('base64url');

  assert.throws(() => verifyAuthToken(`${header}.${tamperedPayload}.${signature}`), /Invalid token signature/);
  assert.doesNotThrow(() => verifyAuthToken(`${header}.${payload}.${signature}`));
});

test('verifyAuthToken rejects a token without tenant context', () => {
  process.env.AUTH_SECRET = 'test-secret';
  const token = createAuthToken({ id: 7, role: 'agent', name: 'No tenant' });
  assert.throws(() => verifyAuthToken(token), /Invalid tenant context/);
});

test('verifyAuthToken rejects expired token', () => {
  process.env.AUTH_SECRET = 'test-secret';
  process.env.AUTH_TOKEN_TTL_MS = '-1';

  const token = createAuthToken({
    id: 1,
    role: 'client',
    name: 'Expired User',
    email: null,
    company_id: 1
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

test('getTokenFromRequest accepts bearer tokens and rejects URL query tokens', () => {
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
    null
  );
});

test('HTTP message authorization hides resources from another company', async () => {
  const originalFindMessage = messageRepository.findById;
  const originalFindChat = chatRepository.findById;
  const calls = [];
  const reply = {
    sent: false,
    statusCode: null,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.sent = true; this.payload = payload; return this; }
  };

  messageRepository.findById = async () => ({ id: 77, chatId: 202 });
  chatRepository.findById = async (...args) => {
    calls.push(args);
    return null;
  };

  try {
    const result = await authorizeChatMessageAccess({
      auth: { userId: 11, role: 'client', companyId: 101, channelId: 1001 }
    }, reply, 77);

    assert.equal(result, reply);
    assert.deepEqual(calls, [[202, 101]]);
    assert.equal(reply.statusCode, 404);
    assert.deepEqual(reply.payload, { error: 'Resource not found' });
  } finally {
    messageRepository.findById = originalFindMessage;
    chatRepository.findById = originalFindChat;
  }
});
