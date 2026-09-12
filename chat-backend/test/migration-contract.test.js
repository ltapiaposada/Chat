const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serverSource = fs.readFileSync(path.resolve(__dirname, '../src/server.js'), 'utf8');
const widgetSource = fs.readFileSync(path.resolve(__dirname, '../../chat-frontend/public/chat-widget.js'), 'utf8');
const departmentMigration = fs.readFileSync(
  path.resolve(__dirname, '../migrations/1789004100000_create-departments.js'), 'utf8'
);

test('widget session requires a registered channel key and has no widgetId fallback', () => {
  assert.match(serverSource, /required: \['channelKey'\]/);
  assert.match(serverSource, /FROM channels/);
  assert.match(serverSource, /public_key = \$1/);
  assert.doesNotMatch(serverSource, /request\.body\.widgetId/);
});

test('widget sessions enforce configured origins and support explicit client-session identity', () => {
  assert.match(serverSource, /channel\.allowed_origins\.includes\(requestOrigin\)/);
  assert.match(serverSource, /widgetIdentityService\.verifyAssertion/);
  assert.match(serverSource, /widgetIdentityService\.anonymousIdentity/);
  assert.match(serverSource, /widgetIdentityService\.clientReportedIdentity/);
});

test('widget loader requires data-channel-key and does not emit widgetId', () => {
  assert.match(widgetSource, /script\.dataset\.channelKey/);
  assert.match(widgetSource, /requires data-channel-key/);
  assert.doesNotMatch(widgetSource, /dataset\.widgetId/);
  assert.doesNotMatch(widgetSource, /widgetId:/);
});

test('widget loader hides authenticated channels until host authentication is available', () => {
  assert.match(widgetSource, /response\.status === 401 && !assertion/);
  assert.match(widgetSource, /setFrameVisible\(false\)/);
  assert.match(widgetSource, /hiddenForAuthentication/);
  assert.match(widgetSource, /dataset\.authStorageKey/);
});

test('departments and their assignments carry mandatory company context', () => {
  assert.match(departmentMigration, /CREATE TABLE departments/);
  assert.match(departmentMigration, /CREATE TABLE department_channels/);
  assert.match(departmentMigration, /CREATE TABLE agent_departments/);
  assert.match(departmentMigration, /FOREIGN KEY \(department_id, company_id\)/);
  assert.match(departmentMigration, /FOREIGN KEY \(agent_id, company_id\)/);
  assert.match(departmentMigration, /chats_department_company_fkey/);
});
