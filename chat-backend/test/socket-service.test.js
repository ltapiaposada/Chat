const test = require('node:test');
const assert = require('node:assert/strict');

const socketService = require('../src/infrastructure/websocket/socket');

test('ensureSupportChatAccess allows matching client chat ownership', () => {
  const emitted = [];
  const socket = {
    userId: 10,
    role: 'client',
    companyId: 1,
    channelId: 2,
    emit(event, payload) {
      emitted.push({ event, payload });
    }
  };
  const chat = { clientId: 10, agentId: 77, companyId: 1, channelId: 2 };

  assert.equal(socketService.ensureSupportChatAccess(socket, chat, 'client'), true);
  assert.deepEqual(emitted, []);
});

test('ensureSupportChatAccess allows matching agent assignment', () => {
  const emitted = [];
  const socket = {
    userId: 77,
    companyId: 1,
    role: 'agent',
    channelIds: [2],
    emit(event, payload) {
      emitted.push({ event, payload });
    }
  };
  const chat = { clientId: 10, agentId: 77, companyId: 1, channelId: 2 };

  assert.equal(socketService.ensureSupportChatAccess(socket, chat, 'agent'), true);
  assert.deepEqual(emitted, []);
});

test('ensureSupportChatAccess rejects non-owner and emits forbidden', () => {
  const emitted = [];
  const socket = {
    userId: 99,
    companyId: 1,
    role: 'agent',
    channelIds: [2],
    emit(event, payload) {
      emitted.push({ event, payload });
    }
  };
  const chat = { clientId: 10, agentId: 77, companyId: 1, channelId: 2 };

  assert.equal(socketService.ensureSupportChatAccess(socket, chat, 'agent'), false);
  assert.deepEqual(emitted, [
    { event: 'error', payload: { message: 'Forbidden' } }
  ]);
});

test('ensureSupportChatAccess rejects a client chat from another channel', () => {
  const emitted = [];
  const socket = {
    userId: 10,
    companyId: 1,
    channelId: 9,
    emit(event, payload) { emitted.push({ event, payload }); }
  };
  const chat = { clientId: 10, agentId: 77, companyId: 1, channelId: 2 };

  assert.equal(socketService.ensureSupportChatAccess(socket, chat, 'client'), false);
  assert.deepEqual(emitted, [{ event: 'error', payload: { message: 'Forbidden' } }]);
});

test('broadcastGlobalUsers emits only online agents per company', () => {
  const calls = [];
  socketService.io = {
    to(room) {
      return {
        emit(event, payload) {
          calls.push({ room, event, payload });
        }
      };
    }
  };
  socketService.users = new Map([
    ['a', { userId: 1, role: 'agent', name: 'Ana', companyId: 1 }],
    ['b', { userId: 2, role: 'client', name: 'Bob' }],
    ['c', { userId: 3, role: 'agent', name: 'Cam', companyId: 2 }],
    ['d', { userId: 4, role: 'agent', name: 'Dan', companyId: 1 }]
  ]);

  socketService.broadcastGlobalUsers();

  assert.deepEqual(calls, [
    {
      room: 'global-chat:1',
      event: 'global:users',
      payload: [
        { id: 1, name: 'Ana', role: 'agent' },
        { id: 4, name: 'Dan', role: 'agent' }
      ]
    },
    {
      room: 'global-chat:2',
      event: 'global:users',
      payload: [
        { id: 3, name: 'Cam', role: 'agent' }
      ]
    }
  ]);
});

test('broadcastAgentPresence emits only agent ids', () => {
  const calls = [];
  socketService.io = {
    to(room) {
      return {
        emit(event, payload) {
          calls.push({ room, event, payload });
        }
      };
    }
  };
  socketService.users = new Map([
    ['a', { userId: 5, role: 'agent', name: 'A', companyId: 1 }],
    ['b', { userId: 6, role: 'client', name: 'B' }],
    ['c', { userId: 7, role: 'agent', name: 'C', companyId: 2 }]
  ]);

  socketService.broadcastAgentPresence();

  assert.deepEqual(calls, [
    { room: 'agents:1', event: 'agent:online-users', payload: { userIds: [5] } },
    { room: 'agents:2', event: 'agent:online-users', payload: { userIds: [7] } }
  ]);
});
