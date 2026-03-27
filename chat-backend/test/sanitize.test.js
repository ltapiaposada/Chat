const test = require('node:test');
const assert = require('node:assert/strict');

const { sanitizeEmail, sanitizeText } = require('../src/utils/sanitize');

test('sanitizeText trims whitespace and removes null bytes', () => {
  assert.equal(sanitizeText('  hi\0there  '), 'hithere');
});

test('sanitizeEmail trims and lowercases email input', () => {
  assert.equal(sanitizeEmail('  USER@Example.COM  '), 'user@example.com');
});
