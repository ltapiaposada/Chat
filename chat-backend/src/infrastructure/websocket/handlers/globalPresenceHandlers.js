const userRepository = require('../../repositories/UserRepository');
const globalMessageRepository = require('../../repositories/GlobalMessageRepository');
const unreadRepository = require('../../repositories/UnreadRepository');
const supportAccessPolicy = require('../../../domain/policies/supportAccessPolicy');

function globalRoom(companyId) {
  return `global-chat:${companyId}`;
}

function isStaffSocket(socket) {
  return supportAccessPolicy.STAFF_ROLES.has(socket.role) && socket.userId && socket.companyId;
}

function registerGlobalPresenceHandlers({
  socket,
  io,
  users,
  agents,
  clients,
  broadcastGlobalUsers,
  broadcastAgentPresence
}) {
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

  socket.on('global:mark-read', async () => {
    try {
      if (!isStaffSocket(socket)) return;
      await unreadRepository.markGlobalRead({ userId: socket.userId });
    } catch (error) {
      console.error('Error marking global read:', error);
    }
  });

  socket.on('global:leave', () => {
    socket.leave(globalRoom(socket.companyId));
    const userInfo = users.get(socket.id);
    console.log(`🌐 User ${userInfo?.name || socket.userId} left global chat`);
    broadcastGlobalUsers();
  });

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

  socket.on('global:typing', ({ isTyping }) => {
    if (!isStaffSocket(socket)) return;
    socket.to(globalRoom(socket.companyId)).emit('global:typing', { userName: socket.userName, isTyping });
  });

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
