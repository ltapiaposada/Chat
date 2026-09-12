const { Server } = require('socket.io');
const userRepository = require('../repositories/UserRepository');
const globalMessageRepository = require('../repositories/GlobalMessageRepository');
const unreadRepository = require('../repositories/UnreadRepository');
const agentChannelRepository = require('../repositories/AgentChannelRepository');
const departmentRepository = require('../repositories/DepartmentRepository');
const supportAccessPolicy = require('../../domain/policies/supportAccessPolicy');
const { verifyAuthToken } = require('../../config/auth');
const { createCorsOriginValidator } = require('../../config/origins');
const { registerSupportChatHandlers } = require('./handlers/supportChatHandlers');
const { registerGlobalPresenceHandlers } = require('./handlers/globalPresenceHandlers');
const { registerCollaborationHandlers } = require('./handlers/collaborationHandlers');

class SocketService {
  constructor() {
    this.io = null;
    // Only keep in-memory maps for socket connections (not persisted data)
    this.users = new Map(); // Map of socketId -> { oduserId, role, name }
    this.agents = new Map(); // Map of agentId -> socketId
    this.clients = new Map(); // Map of clientId -> socketId
  }

  ensureSupportChatAccess(socket, chat, expectedRole) {
    const allowed = expectedRole === 'client'
      ? supportAccessPolicy.canViewChat(socket, chat)
      : supportAccessPolicy.canManageChat(socket, chat);
    if (!allowed) socket.emit('error', { message: 'Forbidden' });
    return allowed;
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
      socket.on('authenticate', async ({ token }) => {
        let auth;
        try {
          auth = verifyAuthToken(token);
        } catch (error) {
          socket.emit('error', { message: 'Authentication failed' });
          socket.disconnect();
          return;
        }

        const { userId, role, name, companyId, channelId } = auth;
        let channelIds = channelId ? [channelId] : [];
        let departmentIds = [];
        if (role === 'agent') {
          channelIds = await agentChannelRepository.findChannelIds(userId, companyId);
          departmentIds = await departmentRepository.findAgentDepartmentIds(userId, companyId);
        } else if (supportAccessPolicy.COMPANY_WIDE_ROLES.has(role)) {
          channelIds = await agentChannelRepository.findCompanyChannelIds(companyId);
        }
        this.users.set(socket.id, { userId, role, name, companyId, channelId, channelIds, departmentIds });
        socket.userId = userId;
        socket.role = role;
        socket.userName = name;
        socket.companyId = companyId;
        socket.channelId = channelId;
        socket.channelIds = channelIds;
        socket.departmentIds = departmentIds;
        
        if (supportAccessPolicy.STAFF_ROLES.has(role)) {
          this.agents.set(userId, socket.id);
          socket.join(`agents:${companyId}`);
          if (supportAccessPolicy.COMPANY_WIDE_ROLES.has(role)) {
            socket.join(`agents:${companyId}:company-wide`);
          }
          for (const assignedChannelId of channelIds) {
            socket.join(`agents:${companyId}:channel:${assignedChannelId}`);
          }
          for (const assignedDepartmentId of departmentIds) {
            socket.join(`agents:${companyId}:department:${assignedDepartmentId}`);
          }
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
        
        socket.emit('authenticated', { userId, role, name, companyId, channelId, channelIds, departmentIds });

        if (supportAccessPolicy.STAFF_ROLES.has(role)) {
          try {
            const dmCounts = await unreadRepository.getDmUnreadCounts(userId);
            const groupCounts = await unreadRepository.getGroupUnreadCounts(userId);
            const globalCount = await unreadRepository.getGlobalUnreadCount(userId, companyId);
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
      registerSupportChatHandlers({
        socket,
        io: this.io,
        agents: this.agents,
        clients: this.clients,
        ensureSupportChatAccess: this.ensureSupportChatAccess.bind(this)
      });
      registerCollaborationHandlers({
        socket,
        io: this.io
      });

      registerGlobalPresenceHandlers({
        socket,
        io: this.io,
        users: this.users,
        agents: this.agents,
        clients: this.clients,
        broadcastGlobalUsers: this.broadcastGlobalUsers.bind(this),
        broadcastAgentPresence: this.broadcastAgentPresence.bind(this)
      });
    });
  }

  // Broadcast online users to global chat (per company)
  broadcastGlobalUsers() {
    const onlineUsersByCompany = new Map();
    for (const [socketId, userInfo] of this.users.entries()) {
      if (supportAccessPolicy.STAFF_ROLES.has(userInfo.role) && userInfo.companyId) {
        const companyOnlineUsers = onlineUsersByCompany.get(userInfo.companyId) || [];
        companyOnlineUsers.push({
          id: userInfo.userId,
          name: userInfo.name,
          role: userInfo.role
        });
        onlineUsersByCompany.set(userInfo.companyId, companyOnlineUsers);
      }
    }
    for (const [companyId, onlineUsers] of onlineUsersByCompany.entries()) {
      this.io.to(`global-chat:${companyId}`).emit('global:users', onlineUsers);
      console.log(`🌐 Broadcasting ${onlineUsers.length} online users to global chat (company ${companyId})`);
    }
  }

  broadcastAgentPresence() {
    const agentsByCompany = new Map();
    for (const [socketId, userInfo] of this.users.entries()) {
      if (!supportAccessPolicy.STAFF_ROLES.has(userInfo.role) || !userInfo.companyId) continue;
      const ids = agentsByCompany.get(userInfo.companyId) || [];
      ids.push(userInfo.userId);
      agentsByCompany.set(userInfo.companyId, ids);
    }
    for (const [companyId, userIds] of agentsByCompany.entries()) {
      this.io.to(`agents:${companyId}`).emit('agent:online-users', { userIds });
    }
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
