const userRepository = require('../../repositories/UserRepository');
const chatRepository = require('../../repositories/ChatRepository');
const messageRepository = require('../../repositories/MessageRepository');
const whatsappService = require('../../../services/whatsappService');

function registerSupportChatHandlers({ socket, io, agents, clients, ensureSupportChatAccess }) {
  socket.on('client:get-history', async () => {
    try {
      if (socket.role !== 'client' || !socket.userId) return;
      const clientChats = await chatRepository.findByClientId(socket.userId);

      console.log(`📜 Sending ${clientChats.length} chats history to client ${socket.userId}`);
      socket.emit('client:chat-history', clientChats);
    } catch (error) {
      console.error('Error getting client history:', error);
      socket.emit('client:chat-history', []);
    }
  });

  socket.on('client:start-chat', async ({ subject }) => {
    try {
      if (socket.role !== 'client' || !socket.userId) return;
      let clientId = socket.userId;
      const userName = socket.userName || `Cliente ${clientId}`;
      console.log(`📞 Client ${userName} (${clientId}) starting chat: ${subject}`);

      let user = await userRepository.findById(clientId);
      if (!user) {
        user = await userRepository.create({ name: userName, role: 'client' });
        socket.userId = user.id;
        clientId = user.id;
      }

      const chat = await chatRepository.create({ clientId, subject });
      socket.join(`chat:${chat.id}`);
      socket.emit('chat:created', chat);
      io.to('agents').emit('chat:new-pending', chat);

      console.log(`✅ Chat ${chat.id} created and notified to agents`);
    } catch (error) {
      console.error('Error creating chat:', error);
      socket.emit('error', { message: 'Error creating chat' });
    }
  });

  socket.on('client:send-message', async (data) => {
    try {
      if (socket.role !== 'client' || !socket.userId) return;
      const { chatId, content, replyToId, hasAttachments } = data;
      const chat = await chatRepository.findById(chatId);

      if (!chat) {
        console.log(`❌ Chat ${chatId} not found`);
        return;
      }
      if (!ensureSupportChatAccess(socket, chat, 'client')) return;

      const message = await messageRepository.create({
        chatId,
        userId: socket.userId,
        content,
        senderRole: 'client',
        replyToId: replyToId || null,
        channel: chat.channel || 'web'
      });

      if (chat.agentId) {
        const agentSocketId = agents.get(chat.agentId);
        if (agentSocketId) {
          message.status = 'delivered';
          await messageRepository.updateStatus(message.id, 'delivered');
        }
      }

      socket.emit('message:new', message);

      if (chat.agentId) {
        io.to(`user:${chat.agentId}`).emit('message:new', message);
        const unreadCount = await messageRepository.getUnreadCount(chatId, chat.agentId);
        io.to(`user:${chat.agentId}`).emit('chat:unread-updated', { chatId, unreadCount });
      }

      console.log(`💬 Client ${socket.userId} sent message in chat ${chatId} (status: ${message.status})`);
    } catch (error) {
      console.error('Error sending client message:', error);
      socket.emit('error', { message: 'Error sending message' });
    }
  });

  socket.on('client:end-chat', async ({ chatId }) => {
    try {
      if (socket.role !== 'client' || !socket.userId) return;
      const chat = await chatRepository.findById(chatId);

      if (!chat) {
        console.log(`❌ Chat ${chatId} not found for ending`);
        socket.emit('error', { message: 'Chat not found' });
        return;
      }
      if (!ensureSupportChatAccess(socket, chat, 'client')) return;

      await chatRepository.updateStatus(chatId, 'closed');

      if (chat.agentId) {
        io.to(`user:${chat.agentId}`).emit('chat:status-changed', {
          chatId,
          status: 'closed'
        });
      }

      if (chat.channel === 'whatsapp') {
        try {
          const client = await userRepository.findById(chat.clientId);
          if (client?.whatsapp_id) {
            await whatsappService.sendTemplate({
              to: client.whatsapp_id,
              name: 'satisfaction_survey',
              languageCode: 'es_CO',
              components: [
                {
                  type: 'body',
                  parameters: [{ type: 'text', text: client.name || 'Cliente' }]
                }
              ]
            });
          }
        } catch (waError) {
          console.error('Error sending WhatsApp satisfaction template:', waError);
        }
      }

      socket.emit('chat:ended', { chatId });
      console.log(`🔚 Client ${socket.userId} ended chat ${chatId} - Survey should show`);
    } catch (error) {
      console.error('Error ending chat:', error);
      socket.emit('error', { message: 'Error ending chat' });
    }
  });

  socket.on('agent:get-pending-chats', async () => {
    try {
      const pendingChats = await chatRepository.findPending();

      console.log(`📋 Sending ${pendingChats.length} pending chats to agent`);
      socket.emit('agent:pending-chats', pendingChats);
    } catch (error) {
      console.error('Error getting pending chats:', error);
      socket.emit('agent:pending-chats', []);
    }
  });

  socket.on('agent:get-my-chats', async () => {
    try {
      if (socket.role !== 'agent' || !socket.userId) return;
      const myChats = await chatRepository.findActiveByAgentId(socket.userId);

      console.log(`📂 Sending ${myChats.length} assigned chats to agent ${socket.userId}`);
      socket.emit('agent:my-chats', myChats);
    } catch (error) {
      console.error('Error getting agent chats:', error);
      socket.emit('agent:my-chats', []);
    }
  });

  socket.on('agent:get-available-agents', async ({ excludeAgentId }) => {
    try {
      const agentsList = await userRepository.findByRole('agent');
      const availableAgents = agentsList
        .filter((agent) => excludeAgentId === null || agent.id !== excludeAgentId)
        .map((agent) => ({
          id: agent.id,
          name: agent.name,
          isOnline: agents.has(agent.id)
        }));

      console.log(`📋 Returning ${availableAgents.length} agents (excludeId: ${excludeAgentId})`);
      socket.emit('agent:available-agents', availableAgents);
    } catch (error) {
      console.error('Error getting available agents:', error);
      socket.emit('agent:available-agents', []);
    }
  });

  socket.on('agent:transfer-chat', async ({ chatId, toAgentId }) => {
    try {
      if (socket.role !== 'agent' || !socket.userId) return;
      const chat = await chatRepository.findById(chatId);

      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }
      if (!ensureSupportChatAccess(socket, chat, 'agent')) return;

      const toAgent = await userRepository.findById(toAgentId);
      if (!toAgent) {
        socket.emit('error', { message: 'Target agent not found' });
        return;
      }

      await chatRepository.transferToAgent(chatId, toAgentId);
      const updatedChat = await chatRepository.findById(chatId);

      socket.emit('chat:transferred-away', { chatId });
      io.to(`user:${toAgentId}`).emit('chat:transferred-to-me', updatedChat);
      io.to(`user:${chat.clientId}`).emit('chat:agent-changed', {
        chatId,
        agentId: toAgentId,
        agentName: toAgent.name
      });

      console.log(`🔄 Chat ${chatId} transferred from agent ${socket.userId} to agent ${toAgentId}`);
    } catch (error) {
      console.error('Error transferring chat:', error);
      socket.emit('error', { message: 'Error transferring chat' });
    }
  });

  socket.on('agent:assign-chat', async ({ chatId }) => {
    try {
      if (socket.role !== 'agent' || !socket.userId) return;
      const agentId = socket.userId;
      const agentName = socket.userName || `Agente ${agentId}`;

      let chat = await chatRepository.findById(chatId);
      if (!chat) {
        console.log(`❌ Chat ${chatId} not found for assignment`);
        return;
      }

      chat = await chatRepository.assignToAgent(chatId, agentId);
      socket.join(`chat:${chatId}`);

      const chatMessages = await messageRepository.findByChatId(chatId);
      socket.emit('chat:assigned', {
        chatId,
        agentId,
        status: 'active',
        chat
      });
      socket.emit('messages:history', { chatId, messages: chatMessages });

      io.to(`user:${chat.clientId}`).emit('chat:agent-joined', {
        chatId,
        agentId,
        agentName
      });

      io.to('agents').emit('chat:removed-from-pending', { chatId });

      console.log(`👨‍💼 Agent ${agentName} (${agentId}) assigned to chat ${chatId}`);
    } catch (error) {
      console.error('Error assigning chat:', error);
      socket.emit('error', { message: 'Error assigning chat' });
    }
  });

  socket.on('agent:send-message', async (data) => {
    try {
      if (socket.role !== 'agent' || !socket.userId) return;
      const { chatId, content, replyToId, hasAttachments } = data;
      const chat = await chatRepository.findById(chatId);

      if (!chat) {
        console.log(`❌ Chat ${chatId} not found`);
        return;
      }
      if (!ensureSupportChatAccess(socket, chat, 'agent')) return;

      await chatRepository.setFirstResponseTime(chatId);

      const message = await messageRepository.create({
        chatId,
        userId: socket.userId,
        content,
        senderRole: 'agent',
        replyToId: replyToId || null,
        channel: chat.channel || 'web'
      });

      const textContent = String(content || '').trim();
      const isAttachmentPlaceholder =
        textContent === 'Adjunto' ||
        textContent === 'Nota de audio' ||
        textContent === 'Nota de voz';
      if (chat.channel === 'whatsapp' && textContent.length > 0 && !isAttachmentPlaceholder && !hasAttachments) {
        try {
          const client = await userRepository.findById(chat.clientId);
          const replyExternalId = replyToId
            ? (await messageRepository.findById(replyToId))?.externalMessageId
            : null;
          if (client?.whatsapp_id) {
            console.log('📨 WhatsApp sendText', {
              chatId,
              messageId: message.id,
              replyToId: replyToId || null,
              replyExternalId: replyExternalId || null,
              textPreview: textContent.slice(0, 50)
            });
            const externalId = await whatsappService.sendText({
              to: client.whatsapp_id,
              text: textContent,
              replyToMessageId: replyExternalId || null
            });
            if (externalId) {
              await messageRepository.updateExternalMessageId(message.id, externalId);
              message.externalMessageId = externalId;
            }
          } else {
            console.warn(`WhatsApp send skipped: client ${chat.clientId} has no whatsapp_id`);
          }
        } catch (waError) {
          console.error('Error sending WhatsApp message:', waError);
        }
      }

      const clientSocketId = clients.get(chat.clientId);
      if (clientSocketId) {
        message.status = 'delivered';
        await messageRepository.updateStatus(message.id, 'delivered');
        socket.emit('message:status-updated', {
          chatId,
          messageIds: [message.id],
          status: 'delivered'
        });
      }

      socket.emit('message:new', message);
      io.to(`user:${chat.clientId}`).emit('message:new', message);

      console.log(`💬 Agent ${socket.userId} sent message in chat ${chatId}`);
    } catch (error) {
      console.error('Error sending agent message:', error);
      socket.emit('error', { message: 'Error sending message' });
    }
  });

  socket.on('agent:put-on-hold', async ({ chatId }) => {
    try {
      if (socket.role !== 'agent' || !socket.userId) return;
      const chat = await chatRepository.findById(chatId);

      if (chat) {
        if (!ensureSupportChatAccess(socket, chat, 'agent')) return;
        await chatRepository.updateStatus(chatId, 'on_hold');

        socket.emit('chat:status-changed', { chatId, status: 'on_hold' });
        io.to(`user:${chat.clientId}`).emit('chat:status-changed', {
          chatId,
          status: 'on_hold'
        });
      }

      console.log(`⏸️ Agent ${socket.userId} put chat ${chatId} on hold`);
    } catch (error) {
      console.error('Error putting chat on hold:', error);
    }
  });

  socket.on('agent:resume-chat', async ({ chatId }) => {
    try {
      if (socket.role !== 'agent' || !socket.userId) return;
      const chat = await chatRepository.findById(chatId);

      if (chat) {
        if (!ensureSupportChatAccess(socket, chat, 'agent')) return;
        await chatRepository.updateStatus(chatId, 'active');

        socket.emit('chat:status-changed', { chatId, status: 'active' });
        io.to(`user:${chat.clientId}`).emit('chat:status-changed', {
          chatId,
          status: 'active'
        });
      }

      console.log(`▶️ Agent ${socket.userId} resumed chat ${chatId}`);
    } catch (error) {
      console.error('Error resuming chat:', error);
    }
  });

  socket.on('agent:close-chat', async ({ chatId }) => {
    try {
      if (socket.role !== 'agent' || !socket.userId) return;
      const chat = await chatRepository.findById(chatId);

      if (chat) {
        if (!ensureSupportChatAccess(socket, chat, 'agent')) return;
        await chatRepository.updateStatus(chatId, 'closed');

        socket.emit('chat:status-changed', { chatId, status: 'closed' });
        io.to(`user:${chat.clientId}`).emit('chat:ended', { chatId });

        if (chat.channel === 'whatsapp') {
          try {
            const client = await userRepository.findById(chat.clientId);
            if (client?.whatsapp_id) {
              await whatsappService.sendTemplate({
                to: client.whatsapp_id,
                name: 'satisfaction_survey',
                languageCode: 'es_CO',
                components: [
                  {
                    type: 'body',
                    parameters: [{ type: 'text', text: client.name || 'Cliente' }]
                  }
                ]
              });
            }
          } catch (waError) {
            console.error('Error sending WhatsApp satisfaction template:', waError);
          }
        }
      }

      console.log(`🔚 Agent ${socket.userId} closed chat ${chatId}`);
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  });

  socket.on('messages:get', async ({ chatId }) => {
    try {
      if (!socket.userId || !socket.role) return;
      const chat = await chatRepository.findById(chatId);
      if (!chat) {
        socket.emit('messages:history', { chatId, messages: [] });
        return;
      }
      if (!ensureSupportChatAccess(socket, chat, socket.role)) return;

      const chatMessages = await messageRepository.findByChatId(chatId);
      socket.emit('messages:history', { chatId, messages: chatMessages });

      const readMessages = await messageRepository.markAsReadWithStatus(chatId, socket.userId);
      const readMessageIds = readMessages.map((message) => message.id);

      if (readMessageIds.length > 0) {
        const targetUserId = socket.role === 'agent' ? chat.clientId : chat.agentId;
        if (targetUserId) {
          io.to(`user:${targetUserId}`).emit('message:status-updated', {
            chatId,
            messageIds: readMessageIds,
            status: 'read'
          });
          console.log(`👀 Marked ${readMessageIds.length} messages as read in chat ${chatId}`);
        }
      }

      if (socket.role === 'agent') {
        socket.emit('chat:unread-updated', { chatId, unreadCount: 0 });
      }
    } catch (error) {
      console.error('Error getting messages:', error);
      socket.emit('messages:history', { chatId, messages: [] });
    }
  });

  socket.on('typing:start', async ({ chatId }) => {
    try {
      const chat = await chatRepository.findById(chatId);
      if (chat) {
        if (socket.role === 'client' && chat.agentId) {
          io.to(`user:${chat.agentId}`).emit('typing:started', { chatId, userId: socket.userId });
        } else if (socket.role === 'agent') {
          io.to(`user:${chat.clientId}`).emit('typing:started', { chatId, userId: socket.userId });
        }
      }
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  });

  socket.on('typing:stop', async ({ chatId }) => {
    try {
      const chat = await chatRepository.findById(chatId);
      if (chat) {
        if (socket.role === 'client' && chat.agentId) {
          io.to(`user:${chat.agentId}`).emit('typing:stopped', { chatId, userId: socket.userId });
        } else if (socket.role === 'agent') {
          io.to(`user:${chat.clientId}`).emit('typing:stopped', { chatId, userId: socket.userId });
        }
      }
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  });

  socket.on('chat:submit-survey', async ({ chatId, rating, feedback }) => {
    try {
      const chat = await chatRepository.submitSurvey(chatId, rating, feedback);

      socket.emit('chat:survey-submitted', { chatId, rating, feedback });

      if (chat && chat.agentId) {
        io.to(`user:${chat.agentId}`).emit('chat:survey-received', {
          chatId,
          rating,
          feedback
        });
      }

      console.log(`⭐ Survey submitted for chat ${chatId}: ${rating} stars`);
    } catch (error) {
      console.error('Error submitting survey:', error);
      socket.emit('error', { message: 'Error submitting survey' });
    }
  });

  socket.on('agent:get-history', async () => {
    try {
      if (socket.role !== 'agent' || !socket.userId) return;
      const closedChats = await chatRepository.findClosedByAgentId(socket.userId);
      socket.emit('agent:chat-history', closedChats);
      console.log(`📊 Sending ${closedChats.length} closed chats to agent ${socket.userId}`);
    } catch (error) {
      console.error('Error getting agent history:', error);
      socket.emit('agent:chat-history', []);
    }
  });

  socket.on('messages:mark-read', async ({ chatId }) => {
    try {
      if (!socket.userId || !socket.role) return;
      const chat = await chatRepository.findById(chatId);
      if (!chat) return;
      if (!ensureSupportChatAccess(socket, chat, socket.role)) return;

      const readMessages = await messageRepository.markAsReadWithStatus(chatId, socket.userId);
      const readMessageIds = readMessages.map((message) => message.id);

      if (readMessageIds.length > 0) {
        const targetUserId = socket.role === 'agent' ? chat.clientId : chat.agentId;
        if (targetUserId) {
          io.to(`user:${targetUserId}`).emit('message:status-updated', {
            chatId,
            messageIds: readMessageIds,
            status: 'read'
          });
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });
}

module.exports = {
  registerSupportChatHandlers
};
