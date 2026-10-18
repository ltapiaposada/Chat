/**
 * @file tenant-handler-access.test.js
 * @description Pruebas del control de acceso por tenant en los handlers de WebSocket.
 * Los tests están escritos en español. Verifican que los handlers de soporte
 * acotan las consultas y mutaciones a la empresa/canales autenticados y que no
 * filtran datos entre tenants.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const chatRepository = require('../src/infrastructure/repositories/ChatRepository');
const userRepository = require('../src/infrastructure/repositories/UserRepository');
const { registerSupportChatHandlers } = require('../src/infrastructure/websocket/handlers/supportChatHandlers');

/**
 * Configura un socket falso y registra los handlers de soporte en él.
 * @param {object} [overrides={}] - Propiedades opcionales que reemplazan las del socket.
 * @returns {{ socket: object, handlers: Map<string, Function>, emitted: Array<object> }} Socket simulado con sus handlers y emisiones capturadas.
 */
function setupSocket(overrides = {}) {
  const handlers = new Map();
  const emitted = [];
  const socket = {
    userId: 11,
    role: 'agent',
    companyId: 101,
    channelId: null,
    channelIds: [1001],
    on(event, handler) { handlers.set(event, handler); },
    emit(event, payload) { emitted.push({ event, payload }); },
    join() {},
    ...overrides
  };
  registerSupportChatHandlers({
    socket,
    io: { to() { return { emit() {} }; } },
    agents: new Map(),
    clients: new Map(),
    ensureSupportChatAccess() { return true; }
  });
  return { socket, handlers, emitted };
}

test('only administrators receive company-wide history from their authenticated company', async () => {
  const original = chatRepository.findClosedByAgentId;
  const calls = [];
  chatRepository.findClosedByAgentId = async (...args) => { calls.push(args); return []; };
  try {
    for (const role of ['admin', 'agent', 'supervisor', 'client']) {
      const { handlers } = setupSocket({ role });
      await handlers.get('agent:get-history')({ companyId: 999, companyWide: true });
    }
    assert.deepEqual(calls, [[11, 101, true], [11, 101, false], [11, 101, false]]);
  } finally {
    chatRepository.findClosedByAgentId = original;
  }
});

test('company-wide closed history always keeps the company boundary and has no 100-chat cap', async () => {
  const db = require('../src/infrastructure/database/postgres');
  const original = db.query;
  let received;
  db.query = async (sql, params) => { received = { sql, params }; return { rows: [] }; };
  try {
    await chatRepository.findClosedByAgentId(11, 101, true);
    assert.deepEqual(received.params, [11, 101, true]);
    assert.match(received.sql, /c\.company_id = \$2/);
    assert.match(received.sql, /c\.status = 'closed'/);
    assert.doesNotMatch(received.sql, /LIMIT 100/);
    await assert.rejects(chatRepository.findClosedByAgentId(11, null, true));
  } finally { db.query = original; }
});

test('pending chat query receives the authenticated company and assigned channels', async () => {
  const original = chatRepository.findPending;
  let receivedCompanyId;
  let receivedChannelIds;
  chatRepository.findPending = async (companyId, channelIds) => {
    receivedCompanyId = companyId;
    receivedChannelIds = channelIds;
    return [];
  };
  try {
    const { handlers } = setupSocket();
    await handlers.get('agent:get-pending-chats')();
    assert.equal(receivedCompanyId, 101);
    assert.deepEqual(receivedChannelIds, [1001]);
  } finally {
    chatRepository.findPending = original;
  }
});

test('typing lookup is scoped to the authenticated company', async () => {
  const original = chatRepository.findById;
  const calls = [];
  chatRepository.findById = async (...args) => { calls.push(args); return null; };
  try {
    const { handlers } = setupSocket({ role: 'client', userId: 31, channelId: 1001 });
    await handlers.get('typing:start')({ chatId: 602 });
    assert.deepEqual(calls, [[602, 101]]);
  } finally {
    chatRepository.findById = original;
  }
});

test('survey lookup is scoped to the client company before mutation', async () => {
  const originalFind = chatRepository.findById;
  const originalSubmit = chatRepository.submitSurvey;
  const calls = [];
  let mutated = false;
  chatRepository.findById = async (...args) => { calls.push(args); return null; };
  chatRepository.submitSurvey = async () => { mutated = true; };
  try {
    const { handlers } = setupSocket({ role: 'client', userId: 31, channelId: 1001 });
    await handlers.get('chat:submit-survey')({ chatId: 602, rating: 5, feedback: 'x' });
    assert.deepEqual(calls, [[602, 101]]);
    assert.equal(mutated, false);
  } finally {
    chatRepository.findById = originalFind;
    chatRepository.submitSurvey = originalSubmit;
  }
});

test('new pending chat is emitted to its scoped channel and company-wide staff room', async () => {
  const originalFindUser = userRepository.findById;
  const originalCreateChat = chatRepository.create;
  const roomEmits = [];
  userRepository.findById = async () => ({ id: 31 });
  chatRepository.create = async () => ({ id: 602, companyId: 101, channelId: 1001 });
  try {
    const handlers = new Map();
    const socket = {
      userId: 31,
      userName: 'Client',
      role: 'client',
      companyId: 101,
      channelId: 1001,
      on(event, handler) { handlers.set(event, handler); },
      emit() {},
      join() {}
    };
    registerSupportChatHandlers({
      socket,
      io: { to(room) { return { emit(event) { roomEmits.push({ room, event }); } }; } },
      agents: new Map(),
      clients: new Map(),
      ensureSupportChatAccess() { return true; }
    });

    await handlers.get('client:start-chat')({ subject: 'Tenant test' });
    assert.deepEqual(roomEmits, [
      {
        room: 'agents:101:channel:1001',
        event: 'chat:new-pending'
      },
      {
        room: 'agents:101:company-wide',
        event: 'chat:new-pending'
      }
    ]);
  } finally {
    userRepository.findById = originalFindUser;
    chatRepository.create = originalCreateChat;
  }
});

test('agent cannot claim a pending chat from an unassigned channel', async () => {
  const originalFind = chatRepository.findById;
  const originalAssign = chatRepository.assignToAgent;
  let assigned = false;
  chatRepository.findById = async () => ({
    id: 602,
    companyId: 101,
    channelId: 1002,
    status: 'pending',
    agentId: null
  });
  chatRepository.assignToAgent = async () => { assigned = true; };
  try {
    const { handlers, emitted } = setupSocket({ channelIds: [1001] });
    await handlers.get('agent:assign-chat')({ chatId: 602 });
    assert.equal(assigned, false);
    assert.deepEqual(emitted, [{ event: 'error', payload: { message: 'Forbidden' } }]);
  } finally {
    chatRepository.findById = originalFind;
    chatRepository.assignToAgent = originalAssign;
  }
});
