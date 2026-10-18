/**
 * @file multitenancy-baseline.test.js
 * @description Pruebas base de aislamiento multitenant.
 * Los tests están escritos en español. Documentan el comportamiento actual de
 * repositorios y políticas de acceso frente a datos de otra empresa ("baseline"),
 * que servirá de referencia para las pruebas de negación de los Phases 1-3.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const chatRepository = require('../src/infrastructure/repositories/ChatRepository');
const socketService = require('../src/infrastructure/websocket/socket');
const fixtures = require('../test-fixtures/multitenancy');

// Estas son pruebas de caracterización de la Fase 0. Verifican a propósito la
// falta actual de contexto de tenant y deben reemplazarse por pruebas de
// negación conforme se implementen los controles de seguridad en las Fases 1-3.

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
