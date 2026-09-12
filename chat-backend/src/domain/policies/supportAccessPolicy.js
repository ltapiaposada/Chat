const STAFF_ROLES = new Set(['agent', 'supervisor', 'admin']);
const COMPANY_WIDE_ROLES = new Set(['supervisor', 'admin']);

function sameCompany(actor, chat) {
  return Boolean(actor?.companyId) && Number(actor.companyId) === Number(chat?.companyId);
}

function hasAssignedChannel(actor, channelId) {
  return Array.isArray(actor?.channelIds) && actor.channelIds.some((id) => Number(id) === Number(channelId));
}

function hasAssignedDepartment(actor, departmentId) {
  if (!departmentId) return true;
  return Array.isArray(actor?.departmentIds) && actor.departmentIds.some(
    (id) => Number(id) === Number(departmentId)
  );
}

function canAccessChannel(actor, channelId) {
  if (!STAFF_ROLES.has(actor?.role)) return false;
  if (COMPANY_WIDE_ROLES.has(actor.role)) return true;
  return hasAssignedChannel(actor, channelId);
}

function canViewChat(actor, chat) {
  if (!sameCompany(actor, chat)) return false;
  if (actor.role === 'client') {
    return Number(actor.userId) === Number(chat.clientId) &&
      (!actor.channelId || Number(actor.channelId) === Number(chat.channelId));
  }
  if (!canAccessChannel(actor, chat.channelId)) return false;
  if (COMPANY_WIDE_ROLES.has(actor.role)) return true;
  return Number(actor.userId) === Number(chat.agentId);
}

function canClaimChat(actor, chat) {
  return sameCompany(actor, chat) && STAFF_ROLES.has(actor?.role) &&
    canAccessChannel(actor, chat.channelId) &&
    (COMPANY_WIDE_ROLES.has(actor.role) || hasAssignedDepartment(actor, chat.departmentId)) &&
    chat.status === 'pending' && !chat.agentId;
}

function canManageChat(actor, chat) {
  if (!sameCompany(actor, chat) || !canAccessChannel(actor, chat.channelId)) return false;
  if (COMPANY_WIDE_ROLES.has(actor.role)) return true;
  return actor.role === 'agent' && Number(actor.userId) === Number(chat.agentId);
}

module.exports = {
  COMPANY_WIDE_ROLES,
  STAFF_ROLES,
  canAccessChannel,
  canClaimChat,
  canManageChat,
  canViewChat,
  hasAssignedChannel,
  hasAssignedDepartment,
  sameCompany
};
