const messageRepository = require('../infrastructure/repositories/MessageRepository');
const chatRepository = require('../infrastructure/repositories/ChatRepository');
const agentChannelRepository = require('../infrastructure/repositories/AgentChannelRepository');
const supportAccessPolicy = require('../domain/policies/supportAccessPolicy');
const { verifyAuthToken } = require('../config/auth');

function getTokenFromRequest(request) {
  const header = request.headers.authorization || request.headers.Authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
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

  const chat = await chatRepository.findById(message.chatId, auth.companyId);
  if (!chat) {
    return sendAuthError(reply, 404, 'Resource not found');
  }

  const sameCompany = Number(chat.companyId) === Number(auth.companyId);
  const sameClientChannel = !auth.channelId || Number(chat.channelId) === Number(auth.channelId);
  const isClientOwner = sameCompany && sameClientChannel && auth.role === 'client' && chat.clientId === auth.userId;
  const isCompanyManager = sameCompany && supportAccessPolicy.COMPANY_WIDE_ROLES.has(auth.role);
  const agentHasChannel = sameCompany && auth.role === 'agent'
    ? await agentChannelRepository.hasChannel(auth.userId, chat.channelId, auth.companyId)
    : false;
  const isAssignedAgent = agentHasChannel && chat.agentId === auth.userId;

  if (!isClientOwner && !isAssignedAgent && !isCompanyManager) {
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
