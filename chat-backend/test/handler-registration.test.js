const test = require('node:test');
const assert = require('node:assert/strict');

const { registerSupportChatHandlers } = require('../src/infrastructure/websocket/handlers/supportChatHandlers');
const { registerCollaborationHandlers } = require('../src/infrastructure/websocket/handlers/collaborationHandlers');
const { registerGlobalPresenceHandlers } = require('../src/infrastructure/websocket/handlers/globalPresenceHandlers');

function createFakeSocket() {
  const handlers = new Map();
  return {
    handlers,
    on(event, handler) {
      handlers.set(event, handler);
    },
    emit() {},
    join() {},
    leave() {},
    to() {
      return { emit() {} };
    }
  };
}

test('support handlers register expected core events', () => {
  const socket = createFakeSocket();

  registerSupportChatHandlers({
    socket,
    io: { to() { return { emit() {} }; } },
    agents: new Map(),
    clients: new Map(),
    ensureSupportChatAccess() { return true; }
  });

  assert.deepEqual(
    Array.from(socket.handlers.keys()).sort(),
    [
      'agent:assign-chat',
      'agent:close-chat',
      'agent:get-available-agents',
      'agent:get-history',
      'agent:get-my-chats',
      'agent:get-pending-chats',
      'agent:put-on-hold',
      'agent:resume-chat',
      'agent:send-message',
      'agent:transfer-chat',
      'chat:submit-survey',
      'client:end-chat',
      'client:get-departments',
      'client:get-history',
      'client:send-message',
      'client:start-chat',
      'messages:get',
      'messages:mark-read',
      'typing:start',
      'typing:stop'
    ]
  );
});

test('collaboration handlers register DM and group events', () => {
  const socket = createFakeSocket();

  registerCollaborationHandlers({
    socket,
    io: { to() { return { emit() {} }; } }
  });

  assert.deepEqual(
    Array.from(socket.handlers.keys()).sort(),
    [
      'agent:dm:join',
      'agent:dm:message',
      'agent:dm:typing',
      'group:add-members',
      'group:create',
      'group:join',
      'group:leave',
      'group:list',
      'group:message',
      'group:remove-member'
    ]
  );
});

test('global presence handlers register global and disconnect events', () => {
  const socket = createFakeSocket();

  registerGlobalPresenceHandlers({
    socket,
    io: {
      sockets: { adapter: { rooms: new Map() } },
      to() { return { emit() {} }; }
    },
    users: new Map(),
    agents: new Map(),
    clients: new Map(),
    broadcastGlobalUsers() {},
    broadcastAgentPresence() {}
  });

  assert.deepEqual(
    Array.from(socket.handlers.keys()).sort(),
    [
      'disconnect',
      'global:join',
      'global:leave',
      'global:mark-read',
      'global:message',
      'global:typing'
    ]
  );
});
