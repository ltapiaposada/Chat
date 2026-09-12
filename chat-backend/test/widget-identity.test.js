const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/infrastructure/database/postgres');
const service = require('../src/services/widgetIdentityService');

const channel = {
  id: 10,
  public_key: 'ch_channel_a_12345678901234567890',
  signing_secret: 'a'.repeat(64),
  assertion_issuer: 'orka-backend'
};

function claims(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: 'orka-backend',
    aud: service.ASSERTION_AUDIENCE,
    channel: channel.public_key,
    sub: 'external-user-42',
    name: 'Luis',
    email: 'LUIS@example.com',
    nonce: `nonce-${Math.random()}`,
    iat: now,
    exp: now + 120,
    ...overrides
  };
}

test('anonymous identities are hashed and scoped to the channel', () => {
  process.env.VISITOR_ID_PEPPER = 'test-pepper';
  const first = service.anonymousIdentity(channel, 'visitor-secret-value');
  const second = service.anonymousIdentity({ ...channel, id: 11 }, 'visitor-secret-value');
  assert.equal(first.externalUserId.length, 64);
  assert.notEqual(first.externalUserId, 'visitor-secret-value');
  assert.notEqual(first.externalUserId, second.externalUserId);
  assert.equal(first.email, null);
});

test('client session identities preserve display data but hash the external subject', () => {
  const identity = service.clientReportedIdentity(channel, {
    id: 'external-user-42',
    name: 'Luis Tapia',
    email: 'LUIS@example.com'
  });
  assert.equal(identity.provider, 'widget-client-session');
  assert.notEqual(identity.externalUserId, 'external-user-42');
  assert.equal(identity.name, 'Luis Tapia');
  assert.equal(identity.email, 'luis@example.com');
});

test('valid assertion maps the external subject without storing it raw', async () => {
  const originalQuery = db.query;
  db.query = async () => ({ rowCount: 1, rows: [] });
  try {
    const input = claims();
    const assertion = service.createAssertionForTesting(channel, input);
    const identity = await service.verifyAssertion(channel, assertion);
    assert.equal(identity.provider, 'widget-assertion:orka-backend');
    assert.notEqual(identity.externalUserId, input.sub);
    assert.equal(identity.name, 'Luis');
    assert.equal(identity.email, 'luis@example.com');
  } finally {
    db.query = originalQuery;
  }
});

test('assertions reject expiration, invalid signature and channel switching', async () => {
  const expired = service.createAssertionForTesting(channel, claims({ iat: 1, exp: 2 }));
  await assert.rejects(service.verifyAssertion(channel, expired), /expired/);

  const valid = service.createAssertionForTesting(channel, claims());
  await assert.rejects(service.verifyAssertion(channel, `${valid.slice(0, -1)}x`), /signature/);
  await assert.rejects(
    service.verifyAssertion({ ...channel, public_key: 'ch_other_1234567890123456789012' }, valid),
    /channel/
  );
});

test('assertion nonce cannot be replayed', async () => {
  const originalQuery = db.query;
  let insertCount = 0;
  db.query = async (sql) => {
    if (String(sql).includes('INSERT INTO widget_assertion_nonces')) insertCount += 1;
    if (insertCount > 1) {
      const error = new Error('duplicate');
      error.code = '23505';
      throw error;
    }
    return { rowCount: 1, rows: [] };
  };
  try {
    const assertion = service.createAssertionForTesting(channel, claims({ nonce: 'one-use-only' }));
    await service.verifyAssertion(channel, assertion);
    await assert.rejects(service.verifyAssertion(channel, assertion), /replay/);
  } finally {
    db.query = originalQuery;
  }
});
