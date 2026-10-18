const userRepository = require('../../repositories/UserRepository');
const globalMessageRepository = require('../../repositories/GlobalMessageRepository');
const unreadRepository = require('../../repositories/UnreadRepository');
const supportAccessPolicy = require('../../../domain/policies/supportAccessPolicy');

/**
 * Genera el nombre de la sala de chat global para una empresa específica.
 *
 * @param {number} companyId - Identificador de la empresa.
 * @returns {string} Nombre de la sala en formato `global-chat:{companyId}`.
 */
function globalRoom(companyId) {
  return `global-chat:${companyId}`;
}

/**
 * Verifica si un socket pertenece a un miembro del personal (staff) válido.
 * Un socket es válido si tiene un rol de personal, un ID de usuario y un ID de empresa.
 *
 * @param {import('socket.io').Socket} socket - Socket a evaluar.
 * @returns {boolean} `true` si el socket corresponde a un miembro del personal.
 */
function isStaffSocket(socket) {
  return supportAccessPolicy.STAFF_ROLES.has(socket.role) && socket.userId && socket.companyId;
}

/**
 * Registra los manejadores de eventos WebSocket para el chat global y la
 * presencia en línea de los usuarios. Gestiona la entrada/salida de la sala global,
 * envío de mensajes, indicadores de escritura y limpieza al desconectar.
 *
 * @param {object} params - Parámetros de configuración de los handlers.
 * @param {import('socket.io').Socket} params.socket - Socket del cliente conectado.
 * @param {import('socket.io').Server} params.io - Servidor Socket.IO para emisiones globales.
 * @param {Map<string, object>} params.users - Mapa de sockets a información de usuario (`socketId -> userInfo`).
 * @param {Map<number, string>} params.agents - Mapa de agentes en línea (`userId -> socketId`).
 * @param {Map<number, string>} params.clients - Mapa de clientes conectados (`userId -> socketId`).
 * @param {Function} params.broadcastGlobalUsers - Función para difundir la lista de usuarios globales actualizada.
 * @param {Function} params.broadcastAgentPresence - Función para difundir el estado de presencia de agentes.
 * @returns {void}
 */
function registerGlobalPresenceHandlers({
  socket,
  io,
  users,
  agents,
  clients,
  broadcastGlobalUsers,
  broadcastAgentPresence
}) {
  // Unirse a la sala de chat global de la empresa. Carga el historial reciente
  // y notifica la presencia actualizada a todos los usuarios.
  socket.on('global:join', async () => {
    if (!isStaffSocket(socket)) return;
    const room = globalRoom(socket.companyId);
    socket.join(room);

    const roomSockets = io.sockets.adapter.rooms.get(room);
    const roomSize = roomSockets ? roomSockets.size : 0;
    console.log(`🌐 ${socket.userName} (${socket.role}) joined global chat (company ${socket.companyId}). Room now has ${roomSize} users`);

    try {
      const history = await globalMessageRepository.getRecent(100, socket.companyId);
      socket.emit('global:history', history);
      console.log(`🌐 Sent ${history.length} history messages to ${socket.userName}`);
    } catch (error) {
      console.error('Error loading global chat history:', error);
    }

    broadcastGlobalUsers();
  });

  // Marcar los mensajes del chat global como leídos para el usuario actual.
  // Actualiza el contador de no leídos en la base de datos.
  socket.on('global:mark-read', async () => {
    try {
      if (!isStaffSocket(socket)) return;
      await unreadRepository.markGlobalRead({ userId: socket.userId });
    } catch (error) {
      console.error('Error marking global read:', error);
    }
  });

  // Salir de la sala de chat global. Elimina el socket de la sala
  // y difunde la lista actualizada de usuarios en línea.
  socket.on('global:leave', () => {
    socket.leave(globalRoom(socket.companyId));
    const userInfo = users.get(socket.id);
    console.log(`🌐 User ${userInfo?.name || socket.userId} left global chat`);
    broadcastGlobalUsers();
  });

  // Enviar un mensaje al chat global de la empresa. Persiste el mensaje en la base
  // de datos y lo emite a todos los miembros del personal en la sala.
  socket.on('global:message', async ({ content }) => {
    if (!isStaffSocket(socket)) return;

    const room = globalRoom(socket.companyId);
    const roomSockets = io.sockets.adapter.rooms.get(room);
    const roomSize = roomSockets ? roomSockets.size : 0;
    console.log(`🌐 Sending message to ${roomSize} users in ${room}`);

    try {
      const message = await globalMessageRepository.create({
        userId: socket.userId,
        content
      });

      io.to(room).emit('global:message', message);
      console.log(`🌐 Global message from ${socket.userName} sent to ${roomSize} users: ${content.substring(0, 30)}...`);
    } catch (error) {
      console.error('Error saving global message:', error);
      const tempMessage = {
        id: `temp-${Date.now()}`,
        senderId: socket.userId,
        senderName: socket.userName,
        senderRole: socket.role,
        content,
        timestamp: new Date()
      };
      io.to(room).emit('global:message', tempMessage);
    }
  });

  // Notificar el estado de escritura en el chat global a los demás miembros
  // de la sala (excluyendo al remitente).
  socket.on('global:typing', ({ isTyping }) => {
    if (!isStaffSocket(socket)) return;
    socket.to(globalRoom(socket.companyId)).emit('global:typing', { userName: socket.userName, isTyping });
  });

  // Manejar la desconexión del socket. Limpia los mapas de agentes y clientes,
  // actualiza el estado de conexión en la base de datos y difunde los cambios de presencia.
  socket.on('disconnect', async () => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const { userId, role, name } = userInfo;

    if (supportAccessPolicy.STAFF_ROLES.has(role)) {
      agents.delete(userId);
      await userRepository.updateOnlineStatus(userId, false);
      broadcastGlobalUsers();
      broadcastAgentPresence();
    } else if (role === 'client') {
      clients.delete(userId);
    }

    users.delete(socket.id);
    console.log(`🔌 ${role.toUpperCase()} ${name || userId} disconnected`);
  });
}

module.exports = {
  registerGlobalPresenceHandlers
};
