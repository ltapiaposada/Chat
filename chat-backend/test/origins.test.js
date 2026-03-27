const test = require('node:test');
const assert = require('node:assert/strict');

const { getAllowedOrigins, isAllowedOrigin } = require('../src/config/origins');

test('getAllowedOrigins merges CLIENT_URL and CORS_ORIGINS', () => {
  process.env.CLIENT_URL = 'https://app.example.com';
  process.env.CORS_ORIGINS = 'https://a.example.com, https://b.example.com ';

  assert.deepEqual(getAllowedOrigins(), [
    'https://app.example.com',
    'https://a.example.com',
    'https://b.example.com'
  ]);
});

test('isAllowedOrigin accepts configured origins and blocks unknown ones', () => {
  process.env.CLIENT_URL = 'https://app.example.com';
  process.env.CORS_ORIGINS = '';
  process.env.ALLOW_VERCEL_PREVIEWS = 'false';

  assert.equal(isAllowedOrigin('https://app.example.com'), true);
  assert.equal(isAllowedOrigin('https://unknown.example.com'), false);
});

test('isAllowedOrigin accepts vercel previews only when enabled', () => {
  process.env.CLIENT_URL = 'https://app.example.com';
  process.env.CORS_ORIGINS = '';
  process.env.ALLOW_VERCEL_PREVIEWS = 'true';

  assert.equal(isAllowedOrigin('https://preview-123.vercel.app'), true);
  assert.equal(isAllowedOrigin('https://preview-123.example.com'), false);
});
