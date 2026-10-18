/**
 * @file origins.test.js
 * @description Pruebas de validación de orígenes CORS.
 * Los tests están escritos en español. Verifican la fusión de CLIENT_URL y
 * CORS_ORIGINS, el bloqueo de orígenes desconocidos, el comportamiento local en
 * desarrollo y los previews de Vercel.
 */
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

test('development accepts local host variants on configured ports only', () => {
  process.env.NODE_ENV = 'development';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.CORS_ORIGINS = '';
  assert.equal(isAllowedOrigin('http://127.0.0.1:5173'), true);
  assert.equal(isAllowedOrigin('http://192.168.1.20:5173'), true);
  assert.equal(isAllowedOrigin('http://192.168.1.20:9999'), false);
  assert.equal(isAllowedOrigin('https://attacker.example:5173'), false);
});

test('isAllowedOrigin accepts vercel previews only when enabled', () => {
  process.env.CLIENT_URL = 'https://app.example.com';
  process.env.CORS_ORIGINS = '';
  process.env.ALLOW_VERCEL_PREVIEWS = 'true';

  assert.equal(isAllowedOrigin('https://preview-123.vercel.app'), true);
  assert.equal(isAllowedOrigin('https://preview-123.example.com'), false);
});
