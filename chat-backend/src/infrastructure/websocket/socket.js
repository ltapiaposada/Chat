const { Server } = require('socket.io');
const userRepository = require('../repositories/UserRepository');
const chatRepository = require('../repositories/ChatRepository');
const messageRepository = require('../repositories/MessageRepository');
const globalMessageRepository = require('../repositories/GlobalMessageRepository');
const groupChatRepository = require('../repositories/GroupChatRepository');
const groupMessageRepository = require('../repositories/GroupMessageRepository');
const agentDmRepository = require('../repositories/AgentDmRepository');
const unreadRepository = require('../repositories/UnreadRepository');
const whatsappService = require('../../services/whatsappService');
const { createCorsOriginValidator } = require('../../config/origins');

class SocketService {
  constructor() {
    this.io = null;
    // Only keep in-memory maps for socket connections (not persisted data)
    this.users = new Map(); // Map of socketId -> { oduserId, role, name }
    this.agents = new Map(); // Map of agentId -> socketId
    this.clients = new Map(); // Map of clientId -> socketId
  }

  async initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: createCorsOriginValidator(),
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Ensure global messages table exists
    await globalMessageRepository.ensureTable();

    this.setupEventHandlers();
    console.log('✅ Socket.IO initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 New client connected: ${socket.id}`);

      // Handle user authentication with role
      socket.on('authenticate', async ({ userId, role, name }) => {
        this.users.set(socket.id, { userId, role, name });
        socket.userId = userId;
        socket.role = role;
        socket.userName = name;
        
        if (role === 'agent') {
          this.agents.set(userId, socket.id);
          socket.join('agents');
          // Update is_online in database
          await userRepository.updateOnlineStatus(userId, true);
          // Notify global chat about new online agent
          this.broadcastGlobalUsers();
          this.broadcastAgentPresence();
        } else if (role === 'client') {
          this.clients.set(userId, socket.id);
        }
        
        socket.join(`user:${userId}`);
        
        console.log(`👤 ${role.toUpperCase()} ${name} (${userId}) authenticated`);
        
        socket.emit('authenticated', { userId, role, name });

        if (role === 'agent') {
          try {
            const dmCounts = await unreadRepository.getDmUnreadCounts(userId);
            const groupCounts = await unreadRepository.getGroupUnreadCounts(userId);
            const globalCount = await unreadRepository.getGlobalUnreadCount(userId);
            socket.emit('agent:unread-counts', {
              dm: dmCounts,
              groups: groupCounts,
              global: globalCount
            });
          } catch (err) {
            console.error('Error loading unread counts:', err);
          }
        }
      });

      // CLIENT: Get chat history
      socket.on('client:get-history', async ({ clientId }) => {
        try {
          const clientChats = await chatRepository.findByClientId(clientId);
          
          console.log(`📜 Sending ${clientChats.length} chats history to client ${clientId}`);
          socket.emit('client:chat-history', clientChats);
        } catch (error) {
          console.error('Error getting client history:', error);
          socket.emit('client:chat-history', []);
        }
      });

      // CLIENT: Start or continue a chat
      socket.on('client:start-chat', async ({ clientId, subject }) => {
        try {
          const userName = socket.userName || `Cliente ${clientId}`;
          console.log(`📞 Client ${userName} (${clientId}) starting chat: ${subject}`);
          
          // Ensure client user exists in database
          let user = await userRepository.findById(clientId);
          if (!user) {
            user = await userRepository.create({ name: userName, role: 'client' });
            // Update socket with real userId from DB
            socket.userId = user.id;
            clientId = user.id;
          }
          
          // Create chat in database
          const chat = await chatRepository.create({ clientId, subject });
          
          // Join chat room
          socket.join(`chat:${chat.id}`);
          
          // Notify client
          socket.emit('chat:created', chat);
          
          // Notify all agents about new pending chat
          this.io.to('agents').emit('chat:new-pending', chat);
          
          console.log(`✅ Chat ${chat.id} created and notified to agents`);
        } catch (error) {
          console.error('Error creating chat:', error);
          socket.emit('error', { message: 'Error creating chat' });
        }
      });

      // CLIENT: Send message
      socket.on('client:send-message', async (data) => {
        try {
          const { chatId, content, clientId, replyToId, hasAttachments } = data;
          const chat = await chatRepository.findById(chatId);
          
          if (!chat) {
            console.log(`❌ Chat ${chatId} not found`);
            return;
          }
          
          // Save message to database
          const message = await messageRepository.create({
            chatId,
            userId: clientId,
            content,
            senderRole: 'client',
            replyToId: replyToId || null,
            channel: chat.channel || 'web'
          });

          // If chat has an assigned agent and agent is online, mark as delivered
          if (chat.agentId) {
            const agentSocketId = this.agents.get(chat.agentId);
            if (agentSocketId) {
              message.status = 'delivered';
              await messageRepository.updateStatus(message.id, 'delivered');
            }
          }

          // Send to client
          socket.emit('message:new', message);
          
          // If chat has an assigned agent, send to that agent
          if (chat.agentId) {
            this.io.to(`user:${chat.agentId}`).emit('message:new', message);
            
            // Get updated unread count for this chat
            const unreadCount = await messageRepository.getUnreadCount(chatId, chat.agentId);
            this.io.to(`user:${chat.agentId}`).emit('chat:unread-updated', { chatId, unreadCount });
          }
          
          console.log(`💬 Client ${clientId} sent message in chat ${chatId} (status: ${message.status})`);
        } catch (error) {
          console.error('Error sending client message:', error);
          socket.emit('error', { message: 'Error sending message' });
        }
      });

      // CLIENT: End chat
      socket.on('client:end-chat', async ({ chatId, clientId }) => {
        try {
          const chat = await chatRepository.findById(chatId);
          
          if (!chat) {
            console.log(`❌ Chat ${chatId} not found for ending`);
            socket.emit('error', { message: 'Chat not found' });
            return;
          }
          
          await chatRepository.updateStatus(chatId, 'closed');

          // Notify agent if assigned
          if (chat.agentId) {
            this.io.to(`user:${chat.agentId}`).emit('chat:status-changed', { 
              chatId, 
              status: 'closed' 
            });
          }

          // If WhatsApp chat, send satisfaction template
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
                      parameters: [
                        { type: 'text', text: client.name || 'Cliente' }
                      ]
                    }
                  ]
                });
              }
            } catch (waError) {
              console.error('Error sending WhatsApp satisfaction template:', waError);
            }
          }
          
          // Confirmar al cliente que el chat se cerró (esto disparará la encuesta)
          socket.emit('chat:ended', { chatId });
          console.log(`🔚 Client ${clientId} ended chat ${chatId} - Survey should show`);
        } catch (error) {
          console.error('Error ending chat:', error);
          socket.emit('error', { message: 'Error ending chat' });
        }
      });

      // AGENT: Get pending chats
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

      // AGENT: Get my assigned chats (for persistence)
      socket.on('agent:get-my-chats', async ({ agentId }) => {
        try {
          const myChats = await chatRepository.findActiveByAgentId(agentId);
          
          console.log(`📂 Sending ${myChats.length} assigned chats to agent ${agentId}`);
          socket.emit('agent:my-chats', myChats);
        } catch (error) {
          console.error('Error getting agent chats:', error);
          socket.emit('agent:my-chats', []);
        }
      });

      // AGENT: Get available agents for transfer
      socket.on('agent:get-available-agents', async ({ excludeAgentId }) => {
        try {
          const agents = await userRepository.findByRole('agent');
          // Filter out the current agent only if excludeAgentId is provided
          const availableAgents = agents
            .filter(a => excludeAgentId === null || a.id !== excludeAgentId)
            .map(a => ({
              id: a.id,
              name: a.name,
              isOnline: this.agents.has(a.id) // Check real-time connection status
            }));
          
          console.log(`📋 Returning ${availableAgents.length} agents (excludeId: ${excludeAgentId})`);
          socket.emit('agent:available-agents', availableAgents);
        } catch (error) {
          console.error('Error getting available agents:', error);
          socket.emit('agent:available-agents', []);
        }
      });

      // AGENT: Transfer chat to another agent
      socket.on('agent:transfer-chat', async ({ chatId, fromAgentId, toAgentId }) => {
        try {
          const chat = await chatRepository.findById(chatId);
          
          if (!chat) {
            socket.emit('error', { message: 'Chat not found' });
            return;
          }
          
          // Get target agent info
          const toAgent = await userRepository.findById(toAgentId);
          if (!toAgent) {
            socket.emit('error', { message: 'Target agent not found' });
            return;
          }
          
          // Update chat in database
          await chatRepository.transferToAgent(chatId, toAgentId);
          
          // Get updated chat
          const updatedChat = await chatRepository.findById(chatId);
          
          // Notify original agent - remove chat from their list
          socket.emit('chat:transferred-away', { chatId });
          
          // Notify new agent - add chat to their list
          this.io.to(`user:${toAgentId}`).emit('chat:transferred-to-me', updatedChat);
          
          // Notify client about the transfer
          this.io.to(`user:${chat.clientId}`).emit('chat:agent-changed', {
            chatId,
            agentId: toAgentId,
            agentName: toAgent.name
          });
          
          console.log(`🔄 Chat ${chatId} transferred from agent ${fromAgentId} to agent ${toAgentId}`);
        } catch (error) {
          console.error('Error transferring chat:', error);
          socket.emit('error', { message: 'Error transferring chat' });
        }
      });

      // AGENT: Assign chat to self
      socket.on('agent:assign-chat', async ({ chatId, agentId }) => {
        try {
          const agentName = socket.userName || `Agente ${agentId}`;
          
          let chat = await chatRepository.findById(chatId);
          
          if (!chat) {
            console.log(`❌ Chat ${chatId} not found for assignment`);
            return;
          }
          
          // Update chat in database
          chat = await chatRepository.assignToAgent(chatId, agentId);
          
          // Agent joins chat room
          socket.join(`chat:${chatId}`);
          
          // Get chat messages from database
          const chatMessages = await messageRepository.findByChatId(chatId);
          
          // Notify agent with full chat info and messages
          socket.emit('chat:assigned', { 
            chatId, 
            agentId, 
            status: 'active',
            chat 
          });
          socket.emit('messages:history', { chatId, messages: chatMessages });
          
          // Notify client that agent joined
          this.io.to(`user:${chat.clientId}`).emit('chat:agent-joined', { 
            chatId, 
            agentId,
            agentName 
          });
          
          // Remove from pending list for all agents
          this.io.to('agents').emit('chat:removed-from-pending', { chatId });
          
          console.log(`👨‍💼 Agent ${agentName} (${agentId}) assigned to chat ${chatId}`);
        } catch (error) {
          console.error('Error assigning chat:', error);
          socket.emit('error', { message: 'Error assigning chat' });
        }
      });

      // AGENT: Send message
      socket.on('agent:send-message', async (data) => {
        try {
          const { chatId, content, agentId, replyToId, hasAttachments } = data;
          const chat = await chatRepository.findById(chatId);
          
          if (!chat) {
            console.log(`❌ Chat ${chatId} not found`);
            return;
          }
          
          // Set first response time if this is the first agent message
          await chatRepository.setFirstResponseTime(chatId);
          
          // Save message to database
          const message = await messageRepository.create({
            chatId,
            userId: agentId,
            content,
            senderRole: 'agent',
            replyToId: replyToId || null,
            channel: chat.channel || 'web'
          });

          // If WhatsApp chat, send to WhatsApp API (only when content is not empty and no attachments)
          if (chat.channel === 'whatsapp' && content && String(content).trim().length > 0 && !hasAttachments) {
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
                  textPreview: String(content).slice(0, 50)
                });
                const externalId = await whatsappService.sendText({
                  to: client.whatsapp_id,
                  text: content,
                  replyToMessageId: replyExternalId || null
                });
                if (externalId) {
                  await messageRepository.updateExternalMessageId(message.id, externalId);
                  message.externalMessageId = externalId;
                }
              }
            } catch (waError) {
              console.error('Error sending WhatsApp message:', waError);
            }
          }
          
          // Send to client - if client is online, mark as delivered
          const clientSocketId = this.clients.get(chat.clientId);
          if (clientSocketId) {
            message.status = 'delivered';
            await messageRepository.updateStatus(message.id, 'delivered');
            socket.emit('message:status-updated', {
              chatId,
              messageIds: [message.id],
              status: 'delivered'
            });
          }
          // Send to agent after delivery status is known
          socket.emit('message:new', message);
          this.io.to(`user:${chat.clientId}`).emit('message:new', message);
          
          console.log(`💬 Agent ${agentId} sent message in chat ${chatId}`);
        } catch (error) {
          console.error('Error sending agent message:', error);
          socket.emit('error', { message: 'Error sending message' });
        }
      });

      // AGENT: Put chat on hold
      socket.on('agent:put-on-hold', async ({ chatId, agentId }) => {
        try {
          const chat = await chatRepository.findById(chatId);
          
          if (chat) {
            await chatRepository.updateStatus(chatId, 'on_hold');
            
            socket.emit('chat:status-changed', { chatId, status: 'on_hold' });
            
            // Notify client
            this.io.to(`user:${chat.clientId}`).emit('chat:status-changed', { 
              chatId, 
              status: 'on_hold' 
            });
          }
          
          console.log(`⏸️ Agent ${agentId} put chat ${chatId} on hold`);
        } catch (error) {
          console.error('Error putting chat on hold:', error);
        }
      });

      // AGENT: Resume chat (from on_hold to active)
      socket.on('agent:resume-chat', async ({ chatId, agentId }) => {
        try {
          const chat = await chatRepository.findById(chatId);
          
          if (chat) {
            await chatRepository.updateStatus(chatId, 'active');
            
            socket.emit('chat:status-changed', { chatId, status: 'active' });
            
            // Notify client
            this.io.to(`user:${chat.clientId}`).emit('chat:status-changed', { 
              chatId, 
              status: 'active' 
            });
          }
          
          console.log(`▶️ Agent ${agentId} resumed chat ${chatId}`);
        } catch (error) {
          console.error('Error resuming chat:', error);
        }
      });

      // AGENT: Close chat
      socket.on('agent:close-chat', async ({ chatId, agentId }) => {
        try {
          const chat = await chatRepository.findById(chatId);
          
          if (chat) {
            await chatRepository.updateStatus(chatId, 'closed');
            
            socket.emit('chat:status-changed', { chatId, status: 'closed' });
            
            // Notify client with chat:ended to trigger survey
            this.io.to(`user:${chat.clientId}`).emit('chat:ended', { chatId });

            // If WhatsApp chat, send satisfaction template
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
                        parameters: [
                          { type: 'text', text: client.name || 'Cliente' }
                        ]
                      }
                    ]
                  });
                }
              } catch (waError) {
                console.error('Error sending WhatsApp satisfaction template:', waError);
              }
            }
          }
          
          console.log(`🔚 Agent ${agentId} closed chat ${chatId}`);
        } catch (error) {
          console.error('Error closing chat:', error);
        }
      });

      // Get messages for a chat
      socket.on('messages:get', async ({ chatId }) => {
        try {
          const chatMessages = await messageRepository.findByChatId(chatId);
          socket.emit('messages:history', { chatId, messages: chatMessages });
          
          // Mark messages as read and update status
          if (socket.userId) {
            const readMessages = await messageRepository.markAsReadWithStatus(chatId, socket.userId);
            const readMessageIds = readMessages.map(m => m.id);
            
            // Notify sender about read status
            const chat = await chatRepository.findById(chatId);
            if (chat && readMessageIds.length > 0) {
              const targetUserId = socket.role === 'agent' ? chat.clientId : chat.agentId;
              if (targetUserId) {
                this.io.to(`user:${targetUserId}`).emit('message:status-updated', {
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
          }
        } catch (error) {
          console.error('Error getting messages:', error);
          socket.emit('messages:history', { chatId, messages: [] });
        }
      });

      // Handle typing indicator
      socket.on('typing:start', async ({ chatId }) => {
        try {
          const chat = await chatRepository.findById(chatId);
          if (chat) {
            // Send to the other party
            if (socket.role === 'client' && chat.agentId) {
              this.io.to(`user:${chat.agentId}`).emit('typing:started', { chatId, userId: socket.userId });
            } else if (socket.role === 'agent') {
              this.io.to(`user:${chat.clientId}`).emit('typing:started', { chatId, userId: socket.userId });
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
              this.io.to(`user:${chat.agentId}`).emit('typing:stopped', { chatId, userId: socket.userId });
            } else if (socket.role === 'agent') {
              this.io.to(`user:${chat.clientId}`).emit('typing:stopped', { chatId, userId: socket.userId });
            }
          }
        } catch (error) {
          console.error('Error handling typing stop:', error);
        }
      });

      // CLIENT: Submit satisfaction survey
      socket.on('chat:submit-survey', async ({ chatId, rating, feedback }) => {
        try {
          const chat = await chatRepository.submitSurvey(chatId, rating, feedback);
          
          socket.emit('chat:survey-submitted', { chatId, rating, feedback });
          
          // Notify agent about the survey
          if (chat && chat.agentId) {
            this.io.to(`user:${chat.agentId}`).emit('chat:survey-received', {
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

      // AGENT: Get closed chats history with metrics
      socket.on('agent:get-history', async ({ agentId }) => {
        try {
          const closedChats = await chatRepository.findClosedByAgentId(agentId);
          socket.emit('agent:chat-history', closedChats);
          console.log(`📊 Sending ${closedChats.length} closed chats to agent ${agentId}`);
        } catch (error) {
          console.error('Error getting agent history:', error);
          socket.emit('agent:chat-history', []);
        }
      });

      // Mark messages as read (explicit action)
      socket.on('messages:mark-read', async ({ chatId }) => {
        try {
          if (!socket.userId) return;
          
          const readMessages = await messageRepository.markAsReadWithStatus(chatId, socket.userId);
          const readMessageIds = readMessages.map(m => m.id);
          
          if (readMessageIds.length > 0) {
            const chat = await chatRepository.findById(chatId);
            if (chat) {
              const targetUserId = socket.role === 'agent' ? chat.clientId : chat.agentId;
              if (targetUserId) {
                this.io.to(`user:${targetUserId}`).emit('message:status-updated', {
                  chatId,
                  messageIds: readMessageIds,
                  status: 'read'
                });
              }
            }
          }
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      });

      // ============================================
      // AGENT DIRECT MESSAGES (1:1)
      // ============================================
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

          this.io.to(`user:${toId}`).emit('agent:dm:message', message);
          socket.emit('agent:dm:message', message);
        } catch (error) {
          console.error('Error sending dm message:', error);
        }
      });

      socket.on('agent:dm:typing', async ({ toAgentId, isTyping }) => {
        try {
          if (socket.role !== 'agent') return;
          const toId = Number(toAgentId);
          if (!toId || toId === socket.userId) return;
          const threadId = agentDmRepository.getThreadId(socket.userId, toId);
          this.io.to(`user:${toId}`).emit('agent:dm:typing', {
            threadId,
            userId: socket.userId,
            userName: socket.userName || 'Agente',
            isTyping: !!isTyping
          });
        } catch (error) {
          console.error('Error typing dm:', error);
        }
      });

      // ============================================
      // GROUP CHAT (Grupos de Agentes)
      // ============================================

      // List groups for current user
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

      // Create a group
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
              this.io.to(`user:${member.id}`).emit('group:added', payload);
            }
          });
        } catch (error) {
          console.error('Error creating group:', error);
          socket.emit('error', { message: 'Error creando grupo' });
        }
      });

      // Add members to an existing group
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
          this.io.to(`group:${gid}`).emit('group:members', { groupId: gid, members });

          const group = await groupChatRepository.getById(gid);
          const payload = group ? { ...group, members } : { id: gid, members };

          ids.forEach((id) => {
            this.io.to(`user:${id}`).emit('group:added', payload);
          });
        } catch (error) {
          console.error('Error adding group members:', error);
          socket.emit('error', { message: 'Error agregando miembros' });
        }
      });

      // Remove member (only creator)
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
          this.io.to(`group:${gid}`).emit('group:members', { groupId: gid, members });

          this.io.to(`user:${mid}`).emit('group:removed', { groupId: gid });
        } catch (error) {
          console.error('Error removing group member:', error);
          socket.emit('error', { message: 'Error eliminando miembro' });
        }
      });

      // Join group room
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

      socket.on('group:leave', ({ groupId }) => {
        const gid = Number(groupId);
        if (!gid) return;
        socket.leave(`group:${gid}`);
      });

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
          this.io.to(`group:${gid}`).emit('group:message', message);
        } catch (error) {
          console.error('Error sending group message:', error);
        }
      });

      // ============================================
      // GLOBAL CHAT (Chat de Equipo entre Agentes)
      // ============================================
      
      // Global Chat: Join room
      socket.on('global:join', async ({ userId, name, role }) => {
        socket.join('global-chat');
        
        // Log how many users are in the room
        const room = this.io.sockets.adapter.rooms.get('global-chat');
        const roomSize = room ? room.size : 0;
        console.log(`🌐 ${name} (${role}) joined global chat. Room now has ${roomSize} users`);
        
        try {
          // Load message history and send to the joining user
          const history = await globalMessageRepository.getRecent(100);
          socket.emit('global:history', history);
          console.log(`🌐 Sent ${history.length} history messages to ${name}`);
        } catch (error) {
          console.error('Error loading global chat history:', error);
        }
        
        // Notify all in global chat about new user
        this.broadcastGlobalUsers();
      });

      socket.on('global:mark-read', async ({ userId }) => {
        try {
          if (!userId) return;
          await unreadRepository.markGlobalRead({ userId });
        } catch (error) {
          console.error('Error marking global read:', error);
        }
      });

      // Global Chat: Leave room
      socket.on('global:leave', ({ userId }) => {
        socket.leave('global-chat');
        const userInfo = this.users.get(socket.id);
        console.log(`🌐 User ${userInfo?.name || userId} left global chat`);
        
        // Update online users list
        this.broadcastGlobalUsers();
      });

      // Global Chat: Send message
      socket.on('global:message', async ({ senderId, senderName, senderRole, content }) => {
        // Log room size before sending
        const room = this.io.sockets.adapter.rooms.get('global-chat');
        const roomSize = room ? room.size : 0;
        console.log(`🌐 Sending message to ${roomSize} users in global-chat`);
        
        try {
          // Save message to database
          const message = await globalMessageRepository.create({
            userId: senderId,
            content
          });
          
          // Broadcast to ALL users in global chat (including sender)
          this.io.to('global-chat').emit('global:message', message);
          console.log(`🌐 Global message from ${senderName} sent to ${roomSize} users: ${content.substring(0, 30)}...`);
        } catch (error) {
          console.error('Error saving global message:', error);
          // Still try to send even if save failed
          const tempMessage = {
            id: `temp-${Date.now()}`,
            senderId,
            senderName,
            senderRole,
            content,
            timestamp: new Date()
          };
          this.io.to('global-chat').emit('global:message', tempMessage);
        }
      });

      // Global Chat: Typing indicator
      socket.on('global:typing', ({ userId, userName, isTyping }) => {
        // Broadcast to others in global chat (not to sender)
        socket.to('global-chat').emit('global:typing', { userName, isTyping });
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        const userInfo = this.users.get(socket.id);
        if (userInfo) {
          const { userId, role, name } = userInfo;
          
          if (role === 'agent') {
            this.agents.delete(userId);
            // Update is_online in database
            await userRepository.updateOnlineStatus(userId, false);
            // Update global chat users list
            this.broadcastGlobalUsers();
            this.broadcastAgentPresence();
          } else if (role === 'client') {
            this.clients.delete(userId);
          }
          
          this.users.delete(socket.id);
          console.log(`🔌 ${role.toUpperCase()} ${name || userId} disconnected`);
        }
      });
    });
  }

  // Broadcast online users to global chat
  broadcastGlobalUsers() {
    const onlineUsers = [];
    for (const [socketId, userInfo] of this.users.entries()) {
      if (userInfo.role === 'agent') {
        onlineUsers.push({
          id: userInfo.userId,
          name: userInfo.name,
          role: userInfo.role
        });
      }
    }
    this.io.to('global-chat').emit('global:users', onlineUsers);
    console.log(`🌐 Broadcasting ${onlineUsers.length} online users to global chat`);
  }

  broadcastAgentPresence() {
    const onlineAgentIds = [];
    for (const [socketId, userInfo] of this.users.entries()) {
      if (userInfo.role === 'agent') {
        onlineAgentIds.push(userInfo.userId);
      }
    }
    this.io.to('agents').emit('agent:online-users', { userIds: onlineAgentIds });
  }

  // Method to emit to a specific room
  emitToRoom(roomId, event, data) {
    this.io.to(`room:${roomId}`).emit(event, data);
  }

  // Method to emit to a specific user
  emitToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Get all connected users
  getConnectedUsers() {
    return Array.from(this.users.values());
  }

  // Get socket instance
  getIO() {
    return this.io;
  }
}

// Export singleton instance
module.exports = new SocketService();
