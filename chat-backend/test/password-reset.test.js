const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Fastify = require('fastify');
const routes = require('../src/routes/passwordReset');
async function setup(db, mailer = { isConfigured: () => true, sendReset: async () => {} }) {
  const app = Fastify(); await app.register(routes, { db, mailer }); await app.ready(); return app;
}
const forgot = email => ({ method: 'POST', url: '/api/password/forgot', payload: { email } });
const reset = token => ({ method: 'POST', url: '/api/password/reset', payload: { token, password: 'new-password-123' } });

test('recovery does not reveal registered accounts and stores only a token hash', async () => {
  const calls = []; let sentToken;
  const app = await setup({ query: async (sql, params) => { calls.push({ sql, params }); return { rows: sql.startsWith('SELECT') && params[0] === 'known@example.com' ? [{ id: 5, company_id: 12 }] : [] }; } },
    { isConfigured: () => true, sendReset: async (email, token) => { sentToken = token; } });
  try {
    const known = await app.inject(forgot('known@example.com'));
    const unknown = await app.inject(forgot('unknown@example.com'));
    assert.equal(known.statusCode, 200); assert.deepEqual(known.json(), unknown.json());
    assert.match(sentToken, /^[a-f0-9]{64}$/);
    assert.equal(calls[1].params[2], crypto.createHash('sha256').update(sentToken).digest('hex'));
    assert.notEqual(calls[1].params[2], sentToken);
    assert.match(calls[1].sql, /INTERVAL '30 minutes'/);
    assert.match(calls[1].sql, /ON CONFLICT\(user_id\)/);
    assert.doesNotMatch(known.body, new RegExp(sentToken));
  } finally { await app.close(); }
});

test('recovery reports unavailable SMTP before looking up accounts', async () => {
  const app = await setup({ query: async () => { throw new Error('must not query'); } }, { isConfigured: () => false });
  try { assert.equal((await app.inject(forgot('known@example.com'))).statusCode, 503); } finally { await app.close(); }
});

test('failed email delivery removes the unusable token without leaking account existence', async () => {
  const calls = [];
  const app = await setup({ query: async (sql, params) => { calls.push({sql,params}); return { rows: sql.startsWith('SELECT') ? [{ id: 5, company_id: 12 }] : [] }; } },
    { isConfigured: () => true, sendReset: async () => { throw new Error('SMTP failure'); } });
  try { assert.equal((await app.inject(forgot('known@example.com'))).statusCode, 200); assert.match(calls[2].sql, /DELETE.*token_hash=\$2/); } finally { await app.close(); }
});

test('reset atomically consumes a live token and hashes the new password within its company', async () => {
  const token = 'a'.repeat(64); let received;
  const app = await setup({ query: async (sql, params) => { received = {sql,params}; return { rows: [{id:5}] }; } });
  try {
    assert.equal((await app.inject(reset(token))).statusCode, 200);
    assert.equal(received.params[0], crypto.createHash('sha256').update(token).digest('hex'));
    assert.equal(await bcrypt.compare('new-password-123',received.params[1]), true);
    assert.match(received.sql, /r.used_at IS NULL/); assert.match(received.sql, /r.expires_at>CURRENT_TIMESTAMP/);
    assert.match(received.sql, /u.company_id=r.company_id/); assert.match(received.sql, /u.is_active=true/);
  } finally { await app.close(); }
});

test('expired or consumed reset links are rejected', async () => {
  const app = await setup({ query: async () => ({rows:[]}) });
  try { assert.equal((await app.inject(reset('a'.repeat(64)))).statusCode,400); } finally { await app.close(); }
});

test('malformed tokens and passwords exceeding bcrypt byte limits are rejected before writing', async () => {
  const app = await setup({ query: async () => { throw new Error('must not query'); } });
  try {
    assert.equal((await app.inject(reset('bad'))).statusCode,400);
    const payload = reset('a'.repeat(64)); payload.payload.password = 'é'.repeat(40);
    assert.equal((await app.inject(payload)).statusCode,400);
  } finally { await app.close(); }
});

test('recovery requests are rate limited per account', async () => {
  const app = await setup({ query: async () => ({rows:[]}) });
  try { for(let i=0;i<3;i++) assert.equal((await app.inject(forgot('known@example.com'))).statusCode,200); assert.equal((await app.inject(forgot('known@example.com'))).statusCode,429); } finally { await app.close(); }
});
