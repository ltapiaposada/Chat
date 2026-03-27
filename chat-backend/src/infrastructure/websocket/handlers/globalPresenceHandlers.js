const userRepository = require('../../repositories/UserRepository');
const globalMessageRepository = require('../../repositories/GlobalMessageRepository');
const unreadRepository = require('../../repositories/UnreadRepository');

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
    if (socket.role !== 'agent' || !socket.userId) return;
    socket.join('global-chat');

    const room = io.sockets.adapter.rooms.get('global-chat');
    const roomSize = room ? room.size : 0;
    console.log(`🌐 ${socket.userName} (${socket.role}) joined global chat. Room now has ${roomSize} users`);

    try {
      const history = await globalMessageRepository.getRecent(100);
      socket.emit('global:history', history);
      console.log(`🌐 Sent ${history.length} history messages to ${socket.userName}`);
    } catch (error) {
      console.error('Error loading global chat history:', error);
    }

    broadcastGlobalUsers();
  });

  socket.on('global:mark-read', async () => {
    try {
      if (socket.role !== 'agent' || !socket.userId) return;
      await unreadRepository.markGlobalRead({ userId: socket.userId });
    } catch (error) {
      console.error('Error marking global read:', error);
    }
  });

  socket.on('global:leave', () => {
    socket.leave('global-chat');
    const userInfo = users.get(socket.id);
    console.log(`🌐 User ${userInfo?.name || socket.userId} left global chat`);
    broadcastGlobalUsers();
  });

  socket.on('global:message', async ({ content }) => {
    if (socket.role !== 'agent' || !socket.userId) return;

    const room = io.sockets.adapter.rooms.get('global-chat');
    const roomSize = room ? room.size : 0;
    console.log(`🌐 Sending message to ${roomSize} users in global-chat`);

    try {
      const message = await globalMessageRepository.create({
        userId: socket.userId,
        content
      });

      io.to('global-chat').emit('global:message', message);
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
      io.to('global-chat').emit('global:message', tempMessage);
    }
  });

  socket.on('global:typing', ({ isTyping }) => {
    if (socket.role !== 'agent' || !socket.userId) return;
    socket.to('global-chat').emit('global:typing', { userName: socket.userName, isTyping });
  });

  socket.on('disconnect', async () => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const { userId, role, name } = userInfo;

    if (role === 'agent') {
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
