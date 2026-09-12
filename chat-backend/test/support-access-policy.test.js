const test = require('node:test');
const assert = require('node:assert/strict');

const policy = require('../src/domain/policies/supportAccessPolicy');

const chat = {
  id: 1,
  companyId: 10,
  channelId: 100,
  clientId: 7,
  agentId: 8,
  status: 'active'
};

test('agent cannot access a chat from an unassigned channel', () => {
  const agent = { userId: 8, role: 'agent', companyId: 10, channelIds: [101] };
  assert.equal(policy.canManageChat(agent, chat), false);
});

test('agent cannot access a chat from another company even with matching channel id', () => {
  const agent = { userId: 8, role: 'agent', companyId: 11, channelIds: [100] };
  assert.equal(policy.canManageChat(agent, chat), false);
});

test('assigned agent can manage its chat but another agent cannot', () => {
  const assigned = { userId: 8, role: 'agent', companyId: 10, channelIds: [100] };
  const other = { userId: 9, role: 'agent', companyId: 10, channelIds: [100] };
  assert.equal(policy.canManageChat(assigned, chat), true);
  assert.equal(policy.canManageChat(other, chat), false);
});

test('supervisor and admin have company-wide access but never cross-company access', () => {
  assert.equal(policy.canManageChat({ role: 'supervisor', companyId: 10 }, chat), true);
  assert.equal(policy.canManageChat({ role: 'admin', companyId: 10 }, chat), true);
  assert.equal(policy.canManageChat({ role: 'admin', companyId: 11 }, chat), false);
});

test('only staff assigned to a channel can claim a pending chat', () => {
  const pending = { ...chat, status: 'pending', agentId: null };
  assert.equal(policy.canClaimChat({ role: 'agent', companyId: 10, channelIds: [100] }, pending), true);
  assert.equal(policy.canClaimChat({ role: 'agent', companyId: 10, channelIds: [101] }, pending), false);
  assert.equal(policy.canClaimChat({ role: 'client', companyId: 10, channelIds: [100] }, pending), false);
});

test('department queues are visible only to assigned agents inside the same company', () => {
  const departmental = { ...chat, departmentId: 501, status: 'pending', agentId: null };
  assert.equal(policy.canClaimChat({
    role: 'agent', companyId: 10, channelIds: [100], departmentIds: [501]
  }, departmental), true);
  assert.equal(policy.canClaimChat({
    role: 'agent', companyId: 10, channelIds: [100], departmentIds: [502]
  }, departmental), false);
  assert.equal(policy.canClaimChat({
    role: 'admin', companyId: 10, channelIds: [], departmentIds: []
  }, departmental), true);
  assert.equal(policy.canClaimChat({
    role: 'admin', companyId: 11, channelIds: [], departmentIds: []
  }, departmental), false);
});
