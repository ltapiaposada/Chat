const test = require('node:test');
const assert = require('node:assert/strict');

const chatRepository = require('../src/infrastructure/repositories/ChatRepository');
const socketService = require('../src/infrastructure/websocket/socket');
const fixtures = require('../test-fixtures/multitenancy');

// These are characterization tests for Phase 0. They intentionally prove the
// current lack of tenant context and must be replaced by denial tests as the
// corresponding security controls are implemented in Phases 1-3.

test('fixture models two isolated companies and channels', () => {
  assert.notEqual(fixtures.companyA.id, fixtures.companyB.id);
  assert.notEqual(fixtures.channelA.id, fixtures.channelB.id);
  assert.equal(fixtures.channelA.companyId, fixtures.companyA.id);
  assert.equal(fixtures.channelB.companyId, fixtures.companyB.id);
  assert.deepEqual(fixtures.agentA.channelIds, [fixtures.channelA.id]);
  assert.deepEqual(fixtures.agentB.channelIds, [fixtures.channelB.id]);
});

test('chat repository requires tenant context', async () => {
  assert.equal(chatRepository.findById.length, 2);
  assert.equal(chatRepository.findPending.length, 2);
  assert.equal(chatRepository.findByClientId.length, 2);
  await assert.rejects(chatRepository.findById(fixtures.chatA.id), /companyId is required/);
});

test('resource policy rejects a chat from another company', () => {
  const emitted = [];
  const socket = {
    userId: fixtures.clientA.id,
    companyId: fixtures.companyA.id,
    emit(event, payload) { emitted.push({ event, payload }); }
  };
  const inconsistentCrossTenantChat = {
    ...fixtures.chatB,
    clientId: fixtures.clientA.id
  };

  assert.notEqual(socket.companyId, inconsistentCrossTenantChat.companyId);
  assert.equal(socketService.ensureSupportChatAccess(socket, inconsistentCrossTenantChat, 'client'), false);
  assert.deepEqual(emitted, [{ event: 'error', payload: { message: 'Forbidden' } }]);
});

test('resource policy rejects an agent without assignment to the chat channel', () => {
  const socket = {
    userId: fixtures.agentA.id,
    companyId: fixtures.companyA.id,
    channelIds: fixtures.agentA.channelIds,
    emit() {}
  };
  const inconsistentCrossChannelChat = {
    ...fixtures.chatB,
    companyId: fixtures.companyA.id,
    agentId: fixtures.agentA.id
  };

  assert.equal(socket.channelIds.includes(inconsistentCrossChannelChat.channelId), false);
  assert.equal(socketService.ensureSupportChatAccess(socket, inconsistentCrossChannelChat, 'agent'), false);
});
