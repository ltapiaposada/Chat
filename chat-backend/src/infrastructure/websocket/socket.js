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

/**
 * Servicio singleton que gestiona las conexiones WebSocket mediante Socket.IO.
 * Administra autenticación de usuarios, salas de chat, presencia en línea
 * y retransmisión de eventos entre clientes y agentes.
 */
class SocketService {
  constructor() {
    this.io = null;
    // Mantener solo mapas en memoria para conexiones socket (no se persisten)
    this.users = new Map(); // Mapa de socketId -> { oduserId, role, name }
    this.agents = new Map(); // Mapa de agentId -> socketId
    this.clients = new Map(); // Mapa de clientId -> socketId
  }

  /**
   * Verifica si el socket tiene permiso para acceder al chat según el rol esperado.
   * @param {Object} socket - Instancia del socket de conexión.
   * @param {Object} chat - Objeto del chat a verificar.
   * @param {string} expectedRole - Rol esperado ('client' o rol de agente).
   * @returns {boolean} true si el acceso está permitido.
   */
  ensureSupportChatAccess(socket, chat, expectedRole) {
    const allowed = expectedRole === 'client'
      ? supportAccessPolicy.canViewChat(socket, chat)
      : supportAccessPolicy.canManageChat(socket, chat);
    if (!allowed) socket.emit('error', { message: 'Forbidden' });
    return allowed;
  }

  /**
   * Inicializa el servidor Socket.IO con la configuración CORS y transportes.
   * @param {Object} server - Instancia del servidor HTTP de Fastify.
   */
  async initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: createCorsOriginValidator(),
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Asegurar que la tabla de mensajes globales exista
    await globalMessageRepository.ensureTable();

    this.setupEventHandlers();
    console.log('✅ Socket.IO initialized');
  }

  /**
   * Configura los manejadores de eventos principales de Socket.IO,
   * incluyendo conexión, autenticación y registro de handlers de dominio.
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 New client connected: ${socket.id}`);

      /** Manejar autenticación del usuario con rol */
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
          // Actualizar estado is_online en la base de datos
          await userRepository.updateOnlineStatus(userId, true);
          // Notificar al chat global sobre el nuevo agente en línea
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

  /**
   * Emite la lista de usuarios en línea al chat global de cada empresa.
   */
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

  /**
   * Emite la presencia de agentes en línea a la sala de agentes de cada empresa.
   */
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

  /**
   * Emite un evento a una sala específica.
   * @param {string} roomId - Identificador de la sala.
   * @param {string} event - Nombre del evento a emitir.
   * @param {Object} data - Datos del evento.
   */
  emitToRoom(roomId, event, data) {
    this.io.to(`room:${roomId}`).emit(event, data);
  }

  /**
   * Emite un evento a un usuario específico por su ID.
   * @param {string} userId - Identificador del usuario.
   * @param {string} event - Nombre del evento a emitir.
   * @param {Object} data - Datos del evento.
   */
  emitToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Retorna la lista de todos los usuarios conectados actualmente.
   * @returns {Array} Arreglo con la información de cada usuario conectado.
   */
  getConnectedUsers() {
    return Array.from(this.users.values());
  }

  /**
   * Retorna la instancia del servidor Socket.IO.
   * @returns {Object} Instancia de Server de Socket.IO.
   */
  getIO() {
    return this.io;
  }
}

// Exportar instancia singleton
module.exports = new SocketService();
