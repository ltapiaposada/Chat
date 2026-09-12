const userRepository = require('../../repositories/UserRepository');
const chatRepository = require('../../repositories/ChatRepository');
const messageRepository = require('../../repositories/MessageRepository');
const whatsappConnectionRepository = require('../../repositories/WhatsAppConnectionRepository');
const { providerFor } = require('../../../services/whatsappProvider');
const agentChannelRepository = require('../../repositories/AgentChannelRepository');
const departmentRepository = require('../../repositories/DepartmentRepository');
const supportAccessPolicy = require('../../../domain/policies/supportAccessPolicy');

function isStaff(socket) {
  return supportAccessPolicy.STAFF_ROLES.has(socket.role) && socket.userId && socket.companyId;
}

function registerSupportChatHandlers({ socket, io, agents, clients, ensureSupportChatAccess }) {
  socket.on('client:get-history', async () => {
    try {
      if (socket.role !== 'client' || !socket.userId) return;
      const clientChats = await chatRepository.findByClientId(socket.userId, socket.companyId);

      console.log(`📜 Sending ${clientChats.length} chats history to client ${socket.userId}`);
      socket.emit('client:chat-history', clientChats);
    } catch (error) {
      console.error('Error getting client history:', error);
      socket.emit('client:chat-history', []);
    }
  });

  socket.on('client:get-departments', async () => {
    if (socket.role !== 'client' || !socket.companyId || !socket.channelId) return;
    const departments = await departmentRepository.listForChannel(socket.companyId, socket.channelId);
    socket.emit('client:departments', departments);
  });

  socket.on('client:start-chat', async ({ subject, departmentId, intention }) => {
    try {
      if (socket.role !== 'client' || !socket.userId) return;
      let clientId = socket.userId;
      const userName = socket.userName || `Cliente ${clientId}`;
      console.log(`📞 Client ${userName} (${clientId}) starting chat: ${subject}`);

      let user = await userRepository.findById(clientId);
      if (!user) {
        user = await userRepository.create({
          name: userName,
          role: 'client',
          companyId: socket.companyId,
          channelId: socket.channelId
        });
        socket.userId = user.id;
        clientId = user.id;
      }

      const department = departmentId
        ? await departmentRepository.findAvailable(departmentId, socket.companyId, socket.channelId)
        : null;
      if (departmentId && !department) {
        socket.emit('error', { message: 'Departamento no disponible para este canal' });
        return;
      }
      const selectedAgent = department
        ? await departmentRepository.selectAgent(department, socket.channelId)
        : null;
      const keepDepartmentQueue = department && (
        department.routing_strategy === 'broadcast' ||
        selectedAgent ||
        department.fallback_strategy === 'department_queue'
      );
      const chat = await chatRepository.create({
        clientId,
        companyId: socket.companyId,
        channelId: socket.channelId,
        subject,
        departmentId: keepDepartmentQueue ? department.id : null,
        intention: String(intention || subject || '').trim().slice(0, 200) || null,
        agentId: selectedAgent?.id || null
      });
      socket.join(`chat:${chat.id}`);
      socket.emit('chat:created', chat);
      if (selectedAgent) {
        io.to(`user:${selectedAgent.id}`).emit('chat:transferred-to-me', chat);
        socket.emit('chat:agent-joined', { chatId: chat.id, agentId: selectedAgent.id, agentName: selectedAgent.name });
      } else if (chat.departmentId) {
        io.to(`agents:${socket.companyId}:department:${chat.departmentId}`).emit('chat:new-pending', chat);
        io.to(`agents:${socket.companyId}:company-wide`).emit('chat:new-pending', chat);
      } else {
        io.to(`agents:${socket.companyId}:channel:${chat.channelId}`).emit('chat:new-pending', chat);
        io.to(`agents:${socket.companyId}:company-wide`).emit('chat:new-pending', chat);
      }

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
      const chat = await chatRepository.findById(chatId, socket.companyId);

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
      const chat = await chatRepository.findById(chatId, socket.companyId);

      if (!chat) {
        console.log(`❌ Chat ${chatId} not found for ending`);
        socket.emit('error', { message: 'Chat not found' });
        return;
      }
      if (!ensureSupportChatAccess(socket, chat, 'client')) return;

      await chatRepository.updateStatus(chatId, 'closed', socket.companyId);

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
            const connection = await whatsappConnectionRepository.findByChannelId(
              chat.channelId, chat.companyId, true
            );
            if (!connection || connection.status !== 'active') throw new Error('WhatsApp connection is not active');
            await providerFor(connection).sendTemplate(connection, {
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
      if (!isStaff(socket)) return;
      const pendingChats = await chatRepository.findPending(
        socket.companyId,
        socket.channelIds,
        socket.departmentIds,
        supportAccessPolicy.COMPANY_WIDE_ROLES.has(socket.role)
      );

      console.log(`📋 Sending ${pendingChats.length} pending chats to agent`);
      socket.emit('agent:pending-chats', pendingChats);
    } catch (error) {
      console.error('Error getting pending chats:', error);
      socket.emit('agent:pending-chats', []);
    }
  });

  socket.on('agent:get-my-chats', async () => {
    try {
      if (!isStaff(socket)) return;
      const myChats = await chatRepository.findActiveByAgentId(socket.userId, socket.companyId);

      console.log(`📂 Sending ${myChats.length} assigned chats to agent ${socket.userId}`);
      socket.emit('agent:my-chats', myChats);
    } catch (error) {
      console.error('Error getting agent chats:', error);
      socket.emit('agent:my-chats', []);
    }
  });

  socket.on('agent:get-available-agents', async ({ excludeAgentId }) => {
    try {
      if (!isStaff(socket)) return;
      const agentsList = await agentChannelRepository.findAgentsForChannels(socket.channelIds, socket.companyId);
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
      if (!isStaff(socket)) return;
      const chat = await chatRepository.findById(chatId, socket.companyId);

      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }
      if (!supportAccessPolicy.canManageChat(socket, chat)) {
        socket.emit('error', { message: 'Forbidden' });
        return;
      }

      const toAgent = await userRepository.findById(toAgentId);
      const targetHasChannel = toAgent && await agentChannelRepository.hasChannel(
        toAgentId,
        chat.channelId,
        socket.companyId
      );
      if (!toAgent || Number(toAgent.company_id) !== Number(socket.companyId) || !targetHasChannel) {
        socket.emit('error', { message: 'Target agent not found' });
        return;
      }

      await chatRepository.transferToAgent(chatId, toAgentId, socket.companyId);
      const updatedChat = await chatRepository.findById(chatId, socket.companyId);

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
      if (!isStaff(socket)) return;
      const agentId = socket.userId;
      const agentName = socket.userName || `Agente ${agentId}`;

      let chat = await chatRepository.findById(chatId, socket.companyId);
      if (!chat) {
        console.log(`❌ Chat ${chatId} not found for assignment`);
        return;
      }

      if (!supportAccessPolicy.canClaimChat(socket, chat)) {
        socket.emit('error', { message: 'Forbidden' });
        return;
      }

      chat = await chatRepository.assignToAgent(chatId, agentId, socket.companyId, socket.channelIds);
      if (!chat) {
        socket.emit('error', { message: 'Chat is no longer available' });
        return;
      }
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

      io.to(`agents:${socket.companyId}:channel:${chat.channelId}`).emit('chat:removed-from-pending', { chatId });

      console.log(`👨‍💼 Agent ${agentName} (${agentId}) assigned to chat ${chatId}`);
    } catch (error) {
      console.error('Error assigning chat:', error);
      socket.emit('error', { message: 'Error assigning chat' });
    }
  });

  socket.on('agent:send-message', async (data) => {
    try {
      if (!isStaff(socket)) return;
      const { chatId, content, replyToId, hasAttachments } = data;
      const chat = await chatRepository.findById(chatId, socket.companyId);

      if (!chat) {
        console.log(`❌ Chat ${chatId} not found`);
        return;
      }
      if (!ensureSupportChatAccess(socket, chat, 'agent')) return;

      let whatsappConnection = null;
      if (chat.channel === 'whatsapp') {
        const lastCustomerMessage = chat.lastCustomerMessageAt
          ? new Date(chat.lastCustomerMessageAt).getTime()
          : 0;
        if (!lastCustomerMessage || Date.now() - lastCustomerMessage > 24 * 60 * 60 * 1000) {
          socket.emit('error', {
            message: 'La ventana de atención de WhatsApp terminó. Debes usar una plantilla aprobada.'
          });
          return;
        }
        whatsappConnection = await whatsappConnectionRepository.findByChannelId(
          chat.channelId, chat.companyId, true
        );
        if (!whatsappConnection || whatsappConnection.status !== 'active') {
          socket.emit('error', { message: 'El canal de WhatsApp no está activo' });
          return;
        }
      }

      await chatRepository.setFirstResponseTime(chatId, socket.companyId);

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
            const externalId = await providerFor(whatsappConnection).sendText(whatsappConnection, {
              to: client.whatsapp_id,
              text: textContent,
              replyToMessageId: replyExternalId || null
            });
            if (externalId) {
              await messageRepository.updateExternalMessageId(message.id, externalId, whatsappConnection.id);
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
      if (!isStaff(socket)) return;
      const chat = await chatRepository.findById(chatId, socket.companyId);

      if (chat) {
        if (!ensureSupportChatAccess(socket, chat, 'agent')) return;
        await chatRepository.updateStatus(chatId, 'on_hold', socket.companyId);

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
      if (!isStaff(socket)) return;
      const chat = await chatRepository.findById(chatId, socket.companyId);

      if (chat) {
        if (!ensureSupportChatAccess(socket, chat, 'agent')) return;
        await chatRepository.updateStatus(chatId, 'active', socket.companyId);

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
      if (!isStaff(socket)) return;
      const chat = await chatRepository.findById(chatId, socket.companyId);

      if (chat) {
        if (!ensureSupportChatAccess(socket, chat, 'agent')) return;
        await chatRepository.updateStatus(chatId, 'closed', socket.companyId);

        socket.emit('chat:status-changed', { chatId, status: 'closed' });
        io.to(`user:${chat.clientId}`).emit('chat:ended', { chatId });

        if (chat.channel === 'whatsapp') {
          try {
            const client = await userRepository.findById(chat.clientId);
            if (client?.whatsapp_id) {
              const connection = await whatsappConnectionRepository.findByChannelId(
                chat.channelId, chat.companyId, true
              );
              if (!connection || connection.status !== 'active') throw new Error('WhatsApp connection is not active');
              await providerFor(connection).sendTemplate(connection, {
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
      const chat = await chatRepository.findById(chatId, socket.companyId);
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
      const targetUserId = isStaff(socket) ? chat.clientId : chat.agentId;
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
      const chat = await chatRepository.findById(chatId, socket.companyId);
      if (chat) {
        if (!ensureSupportChatAccess(socket, chat, socket.role)) return;
        if (socket.role === 'client' && chat.agentId) {
          io.to(`user:${chat.agentId}`).emit('typing:started', { chatId, userId: socket.userId });
        } else if (isStaff(socket)) {
          io.to(`user:${chat.clientId}`).emit('typing:started', { chatId, userId: socket.userId });
        }
      }
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  });

  socket.on('typing:stop', async ({ chatId }) => {
    try {
      const chat = await chatRepository.findById(chatId, socket.companyId);
      if (chat) {
        if (!ensureSupportChatAccess(socket, chat, socket.role)) return;
        if (socket.role === 'client' && chat.agentId) {
          io.to(`user:${chat.agentId}`).emit('typing:stopped', { chatId, userId: socket.userId });
        } else if (isStaff(socket)) {
          io.to(`user:${chat.clientId}`).emit('typing:stopped', { chatId, userId: socket.userId });
        }
      }
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  });

  socket.on('chat:submit-survey', async ({ chatId, rating, feedback }) => {
    try {
      if (socket.role !== 'client' || !socket.userId || !socket.companyId) return;
      const existingChat = await chatRepository.findById(chatId, socket.companyId);
      if (!existingChat || !ensureSupportChatAccess(socket, existingChat, 'client')) return;
      const chat = await chatRepository.submitSurvey(chatId, rating, feedback, socket.companyId);

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
      if (!isStaff(socket)) return;
      const closedChats = await chatRepository.findClosedByAgentId(socket.userId, socket.companyId, socket.role === 'admin');
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
      const chat = await chatRepository.findById(chatId, socket.companyId);
      if (!chat) return;
      if (!ensureSupportChatAccess(socket, chat, socket.role)) return;

      const readMessages = await messageRepository.markAsReadWithStatus(chatId, socket.userId);
      const readMessageIds = readMessages.map((message) => message.id);

      if (readMessageIds.length > 0) {
        const targetUserId = isStaff(socket) ? chat.clientId : chat.agentId;
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
