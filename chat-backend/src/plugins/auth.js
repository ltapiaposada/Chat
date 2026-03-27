const messageRepository = require('../infrastructure/repositories/MessageRepository');
const chatRepository = require('../infrastructure/repositories/ChatRepository');
const { verifyAuthToken } = require('../config/auth');

function getTokenFromRequest(request) {
  const header = request.headers.authorization || request.headers.Authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }

  const queryToken = request.query?.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  return null;
}

function sendAuthError(reply, statusCode, message) {
  return reply.status(statusCode).send({ error: message });
}

async function authenticateRequest(request, reply) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return sendAuthError(reply, 401, 'Authentication required');
  }

  try {
    request.auth = verifyAuthToken(token);
    return request.auth;
  } catch (error) {
    request.log.warn({ err: error }, 'authentication failed');
    return sendAuthError(reply, 401, 'Invalid authentication token');
  }
}

function requireRole(allowedRoles) {
  const normalized = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async function ensureRole(request, reply) {
    const auth = request.auth || (await authenticateRequest(request, reply));
    if (!auth || reply.sent) return null;

    if (!normalized.includes(auth.role)) {
      return sendAuthError(reply, 403, 'Forbidden');
    }

    return auth;
  };
}

async function authorizeChatMessageAccess(request, reply, messageId) {
  const auth = request.auth || (await authenticateRequest(request, reply));
  if (!auth || reply.sent) return null;

  const message = await messageRepository.findById(Number(messageId));
  if (!message) {
    return sendAuthError(reply, 404, 'Resource not found');
  }

  const chat = await chatRepository.findById(message.chatId);
  if (!chat) {
    return sendAuthError(reply, 404, 'Resource not found');
  }

  const isClientOwner = auth.role === 'client' && chat.clientId === auth.userId;
  const isAssignedAgent = auth.role === 'agent' && chat.agentId === auth.userId;

  if (!isClientOwner && !isAssignedAgent) {
    return sendAuthError(reply, 403, 'Forbidden');
  }

  request.chat = chat;
  request.chatMessage = message;
  return { auth, chat, message };
}

module.exports = {
  authenticateRequest,
  authorizeChatMessageAccess,
  getTokenFromRequest,
  requireRole
};
