const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/publicUrlService');

test('extracts only the HTTPS quick-tunnel URL from cloudflared output', () => {
  assert.equal(
    service.extractTunnelUrl('INF Your quick Tunnel has been created! https://chat-demo.trycloudflare.com'),
    'https://chat-demo.trycloudflare.com'
  );
  assert.equal(service.extractTunnelUrl('http://localhost:3000'), null);
});

test('configured public URL must use HTTPS', () => {
  assert.equal(service.normalizePublicUrl('https://api.example.com/path'), 'https://api.example.com');
  assert.equal(service.normalizePublicUrl('http://localhost:3000'), null);
});

test('local public proxy exposes only WhatsApp webhook requests', () => {
  assert.equal(service.isAllowedWebhookRequest('GET', '/api/whatsapp/webhook/key_123?hub.mode=subscribe'), true);
  assert.equal(service.isAllowedWebhookRequest('POST', '/api/whatsapp/webhook/key-123'), true);
  assert.equal(service.isAllowedWebhookRequest('GET', '/api/login'), false);
  assert.equal(service.isAllowedWebhookRequest('POST', '/api/admin/channels'), false);
  assert.equal(service.isAllowedWebhookRequest('DELETE', '/api/whatsapp/webhook/key-123'), false);
});
