const STAFF_ROLES = new Set(['agent', 'supervisor', 'admin']);
const COMPANY_WIDE_ROLES = new Set(['supervisor', 'admin']);

/**
 * Comprueba que un actor y una conversación pertenecen a la misma empresa.
 * @param {Object} actor - Identidad autenticada.
 * @param {Object} chat - Conversación consultada.
 * @returns {boolean} Resultado de la comparación empresarial.
 */
function sameCompany(actor, chat) {
  return Boolean(actor?.companyId) && Number(actor.companyId) === Number(chat?.companyId);
}

/**
 * Comprueba que un actor tenga asignado un canal.
 * @param {Object} actor - Identidad autenticada.
 * @param {number} channelId - Canal requerido.
 * @returns {boolean} Resultado de la asignación.
 */
function hasAssignedChannel(actor, channelId) {
  return Array.isArray(actor?.channelIds) && actor.channelIds.some((id) => Number(id) === Number(channelId));
}

/**
 * Comprueba que un actor tenga asignado un departamento.
 * @param {Object} actor - Identidad autenticada.
 * @param {number|null} departmentId - Departamento requerido.
 * @returns {boolean} Resultado de la asignación.
 */
function hasAssignedDepartment(actor, departmentId) {
  if (!departmentId) return true;
  return Array.isArray(actor?.departmentIds) && actor.departmentIds.some(
    (id) => Number(id) === Number(departmentId)
  );
}

/**
 * Determina si un miembro del equipo puede acceder a un canal.
 * @param {Object} actor - Identidad autenticada.
 * @param {number} channelId - Canal solicitado.
 * @returns {boolean} Decisión de acceso.
 */
function canAccessChannel(actor, channelId) {
  if (!STAFF_ROLES.has(actor?.role)) return false;
  if (COMPANY_WIDE_ROLES.has(actor.role)) return true;
  return hasAssignedChannel(actor, channelId);
}

/**
 * Determina si un actor puede consultar una conversación.
 * @param {Object} actor - Identidad autenticada.
 * @param {Object} chat - Conversación solicitada.
 * @returns {boolean} Decisión de acceso.
 */
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

/**
 * Determina si un miembro del equipo puede tomar una conversación pendiente.
 * @param {Object} actor - Identidad autenticada.
 * @param {Object} chat - Conversación pendiente.
 * @returns {boolean} Decisión de asignación.
 */
function canClaimChat(actor, chat) {
  return sameCompany(actor, chat) && STAFF_ROLES.has(actor?.role) &&
    canAccessChannel(actor, chat.channelId) &&
    (COMPANY_WIDE_ROLES.has(actor.role) || hasAssignedDepartment(actor, chat.departmentId)) &&
    chat.status === 'pending' && !chat.agentId;
}

/**
 * Determina si un miembro del equipo puede administrar una conversación.
 * @param {Object} actor - Identidad autenticada.
 * @param {Object} chat - Conversación solicitada.
 * @returns {boolean} Decisión de administración.
 */
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
