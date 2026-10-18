const userRepository = require('../../repositories/UserRepository');
const groupChatRepository = require('../../repositories/GroupChatRepository');
const groupMessageRepository = require('../../repositories/GroupMessageRepository');
const agentDmRepository = require('../../repositories/AgentDmRepository');
const unreadRepository = require('../../repositories/UnreadRepository');

/**
 * Registra los manejadores de eventos WebSocket para funcionalidades de
 * colaboración entre agentes: mensajes directos (DM) entre agentes y
 * operaciones de grupos de chat.
 *
 * @param {object} params - Parámetros de configuración de los handlers.
 * @param {import('socket.io').Socket} params.socket - Instancia del socket del cliente conectado.
 * @param {import('socket.io').Server} params.io - Instancia del servidor Socket.IO para emisiones globales.
 * @returns {void}
 */
function registerCollaborationHandlers({ socket, io }) {
  // Unirse a un hilo de mensajes directos entre agentes. Carga el historial reciente
  // y marca los mensajes como leídos para el socket actual.
  socket.on('agent:dm:join', async ({ otherAgentId }) => {
    try {
      if (socket.role !== 'agent') return;
      const otherId = Number(otherAgentId);
      if (!otherId || otherId === socket.userId) return;

      const threadId = agentDmRepository.getThreadId(socket.userId, otherId);
      socket.join(threadId);

      const agentA = Math.min(socket.userId, otherId);
      const agentB = Math.max(socket.userId, otherId);
      const history = await agentDmRepository.getRecent({ agentA, agentB });
      socket.emit('agent:dm:history', { threadId, messages: history });
      await unreadRepository.markDmRead({ userId: socket.userId, otherAgentId: otherId });
    } catch (error) {
      console.error('Error joining dm thread:', error);
    }
  });

  // Enviar un mensaje directo a otro agente. Persiste el mensaje en la base de datos
  // y lo emite tanto al remitente como al destinatario.
  socket.on('agent:dm:message', async ({ toAgentId, content }) => {
    try {
      if (socket.role !== 'agent') return;
      const toId = Number(toAgentId);
      const text = String(content || '').trim();
      if (!toId || !text) return;

      const target = await userRepository.findById(toId);
      if (!target || target.role !== 'agent') return;

      const agentA = Math.min(socket.userId, toId);
      const agentB = Math.max(socket.userId, toId);
      const message = await agentDmRepository.create({
        agentA,
        agentB,
        userId: socket.userId,
        content: text
      });

      io.to(`user:${toId}`).emit('agent:dm:message', message);
      socket.emit('agent:dm:message', message);
    } catch (error) {
      console.error('Error sending dm message:', error);
    }
  });

  // Notificar el estado de escritura en un DM. Emite el indicador de escritura
  // al destinatario para que pueda ver si el remitente está escribiendo.
  socket.on('agent:dm:typing', async ({ toAgentId, isTyping }) => {
    try {
      if (socket.role !== 'agent') return;
      const toId = Number(toAgentId);
      if (!toId || toId === socket.userId) return;
      const threadId = agentDmRepository.getThreadId(socket.userId, toId);
      io.to(`user:${toId}`).emit('agent:dm:typing', {
        threadId,
        userId: socket.userId,
        userName: socket.userName || 'Agente',
        isTyping: !!isTyping
      });
    } catch (error) {
      console.error('Error typing dm:', error);
    }
  });

  // Obtener la lista de grupos a los que pertenece el agente actual.
  // Emite la lista completa de grupos al socket solicitante.
  socket.on('group:list', async () => {
    try {
      if (socket.role !== 'agent') return;
      const groups = await groupChatRepository.listForUser(socket.userId);
      socket.emit('group:list', groups);
    } catch (error) {
      console.error('Error listing groups:', error);
      socket.emit('group:list', []);
    }
  });

  // Crear un nuevo grupo de chat. Persiste el grupo con sus miembros,
  // notifica al creador con 'group:created' y a los demás miembros con 'group:added'.
  socket.on('group:create', async ({ name, memberIds }) => {
    try {
      if (socket.role !== 'agent') return;
      const safeName = String(name || '').trim();
      if (!safeName) {
        socket.emit('error', { message: 'Nombre de grupo requerido' });
        return;
      }

      const ids = Array.isArray(memberIds)
        ? memberIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : [];

      const group = await groupChatRepository.create({
        name: safeName,
        createdBy: socket.userId,
        memberIds: ids
      });
      const members = await groupChatRepository.getMembers(group.id);
      const payload = { ...group, members };

      socket.emit('group:created', payload);

      members.forEach((member) => {
        if (member.id !== socket.userId) {
          io.to(`user:${member.id}`).emit('group:added', payload);
        }
      });
    } catch (error) {
      console.error('Error creating group:', error);
      socket.emit('error', { message: 'Error creando grupo' });
    }
  });

  // Agregar miembros a un grupo existente. Verifica que el solicitante sea miembro,
  // actualiza la lista de miembros y notifica a todos los integrantes del grupo.
  socket.on('group:add-members', async ({ groupId, memberIds }) => {
    try {
      if (socket.role !== 'agent') return;
      const gid = Number(groupId);
      if (!gid) return;

      const isMember = await groupChatRepository.isMember(gid, socket.userId);
      if (!isMember) return;

      const ids = Array.isArray(memberIds)
        ? memberIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : [];
      if (ids.length === 0) return;

      await groupChatRepository.addMembers({
        groupId: gid,
        memberIds: ids,
        addedBy: socket.userId
      });

      const members = await groupChatRepository.getMembers(gid);
      io.to(`group:${gid}`).emit('group:members', { groupId: gid, members });

      const group = await groupChatRepository.getById(gid);
      const payload = group ? { ...group, members } : { id: gid, members };

      ids.forEach((id) => {
        io.to(`user:${id}`).emit('group:added', payload);
      });
    } catch (error) {
      console.error('Error adding group members:', error);
      socket.emit('error', { message: 'Error agregando miembros' });
    }
  });

  // Eliminar un miembro de un grupo. Solo el creador del grupo puede realizar
  // esta acción. Actualiza la lista de miembros y notifica al grupo y al miembro eliminado.
  socket.on('group:remove-member', async ({ groupId, memberId }) => {
    try {
      if (socket.role !== 'agent') return;
      const gid = Number(groupId);
      const mid = Number(memberId);
      if (!gid || !mid) return;

      const group = await groupChatRepository.getById(gid);
      if (!group) return;
      if (group.createdBy !== socket.userId) return;
      if (group.createdBy === mid) return;

      await groupChatRepository.removeMember({ groupId: gid, memberId: mid });
      const members = await groupChatRepository.getMembers(gid);
      io.to(`group:${gid}`).emit('group:members', { groupId: gid, members });
      io.to(`user:${mid}`).emit('group:removed', { groupId: gid });
    } catch (error) {
      console.error('Error removing group member:', error);
      socket.emit('error', { message: 'Error eliminando miembro' });
    }
  });

  // Unirse a la sala de un grupo. Verifica membresía, carga el historial de mensajes
  // recientes y la lista de miembros, y marca los mensajes como leídos.
  socket.on('group:join', async ({ groupId }) => {
    try {
      if (socket.role !== 'agent') return;
      const gid = Number(groupId);
      if (!gid) return;
      const isMember = await groupChatRepository.isMember(gid, socket.userId);
      if (!isMember) return;

      socket.join(`group:${gid}`);
      const history = await groupMessageRepository.getRecent(gid, 100);
      socket.emit('group:history', { groupId: gid, messages: history });
      const members = await groupChatRepository.getMembers(gid);
      socket.emit('group:members', { groupId: gid, members });
      await unreadRepository.markGroupRead({ userId: socket.userId, groupId: gid });
    } catch (error) {
      console.error('Error joining group:', error);
    }
  });

  // Salir de la sala de un grupo. Elimina el socket de la sala correspondiente.
  socket.on('group:leave', ({ groupId }) => {
    const gid = Number(groupId);
    if (!gid) return;
    socket.leave(`group:${gid}`);
  });

  // Enviar un mensaje a un grupo. Verifica membresía, persiste el mensaje
  // y lo emite a todos los miembros conectados del grupo.
  socket.on('group:message', async ({ groupId, content }) => {
    try {
      if (socket.role !== 'agent') return;
      const gid = Number(groupId);
      const text = String(content || '').trim();
      if (!gid || !text) return;

      const isMember = await groupChatRepository.isMember(gid, socket.userId);
      if (!isMember) return;

      const message = await groupMessageRepository.create({
        groupId: gid,
        userId: socket.userId,
        content: text
      });
      io.to(`group:${gid}`).emit('group:message', message);
    } catch (error) {
      console.error('Error sending group message:', error);
    }
  });
}

module.exports = {
  registerCollaborationHandlers
};
