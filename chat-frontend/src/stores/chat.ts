import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import socketService from '@/services/socket'
import { useAuthStore } from './auth'

export type ChatStatus = 'pending' | 'active' | 'on_hold' | 'closed'
export type MessageStatus = 'sent' | 'delivered' | 'read'

export interface Chat {
  id: number
  clientId: number
  clientName?: string
  agentId: number | null
  agentName?: string
  status: ChatStatus
  channel?: 'web' | 'whatsapp'
  subject?: string
  createdAt: Date
  assignedAt?: Date
  closedAt?: Date
  firstResponseAt?: Date
  unreadCount: number
  lastMessage?: string
  rating?: number | null
  feedback?: string | null
  // Metrics for agent history
  firstResponseSeconds?: number | null
  durationSeconds?: number | null
}

export interface Message {
  id: number
  chatId: number
  userId: number
  content: string
  senderRole: 'client' | 'agent'
  senderName?: string
  isRead: boolean
  status: MessageStatus
  timestamp: Date
  replyToId?: number | null
  replyToContent?: string | null
  replyToSenderRole?: 'client' | 'agent' | null
}


export interface Agent {
  id: number
  name: string
  isOnline: boolean
}

export interface GroupMember {
  id: number
  name: string
}

export interface GroupChat {
  id: number
  name: string
  createdBy: number
  createdAt: Date
  members?: GroupMember[]
}

export interface GroupMessage {
  id: number
  groupId: number
  senderId: number
  senderName: string
  senderRole: 'agent'
  content: string
  timestamp: Date
}

export interface DirectMessage {
  id: number
  threadId: string
  senderId: number
  senderName: string
  content: string
  timestamp: Date
}

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()
  
  // State
  const isConnected = ref(false)
  const currentChatId = ref<number | null>(null)
  const chats = ref<Chat[]>([])
  const pendingChats = ref<Chat[]>([])
  const messages = ref<Map<number, Message[]>>(new Map())
  const typingUsers = ref<Set<number>>(new Set())
  const availableAgents = ref<Agent[]>([])
  const replyingToMessage = ref<Message | null>(null)
  const agentChatHistory = ref<Chat[]>([])
  const showSurvey = ref(false)
  const surveySubmitted = ref(false)
  const surveyChatId = ref<number | null>(null)
  
  // Global Chat State
  const globalMessages = ref<any[]>([])
  const globalOnlineUsers = ref<any[]>([])
  const globalTypingUsers = ref<string[]>([])
  const isInGlobalChat = ref(false)
  const isViewingGlobalChat = ref(false)

  // Direct messages (agent-to-agent)
  const directMessages = ref<Map<string, DirectMessage[]>>(new Map())
  const directTypingUsers = ref<Map<string, string[]>>(new Map())
  const onlineAgentIds = ref<Set<number>>(new Set())
  const directUnreadCounts = ref<Map<string, number>>(new Map())
  const currentDmThreadId = ref<string | null>(null)
  const globalUnreadCount = ref(0)
  const soundEnabled = ref<boolean>(true)
  const soundByType = ref({
    support: true,
    global: true,
    group: true,
    dm: true,
    pending: true
  })
  const unseenTotal = ref(0)
  let baseTitle: string | null = null
  let titleListenerAttached = false
  let audioContext: AudioContext | null = null
  const audioUnlocked = ref(false)

  // Group Chat State
  const groupChats = ref<GroupChat[]>([])
  const groupMessages = ref<Map<number, GroupMessage[]>>(new Map())
  const groupMembers = ref<Map<number, GroupMember[]>>(new Map())
  const currentGroupId = ref<number | null>(null)
  const groupUnreadCounts = ref<Map<number, number>>(new Map())
  const joinedGroupIds = new Set<number>()

  // Computed
  const currentChat = computed(() => 
    chats.value.find(c => c.id === currentChatId.value) || null
  )

  const currentMessages = computed(() => 
    currentChatId.value ? messages.value.get(currentChatId.value) || [] : []
  )

  const activeChats = computed(() => 
    chats.value.filter(c => 
      (c.status === 'active' || c.status === 'on_hold') && 
      c.agentId === authStore.userId
    )
  )

  const clientChat = computed(() => 
    chats.value.find(c => c.clientId === authStore.userId && c.status !== 'closed') || null
  )

  const clientChatHistory = computed(() => 
    chats.value.filter(c => c.clientId === authStore.userId && c.status === 'closed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  )

  // Socket connection
  function connectSocket() {
    ensureTitleListener()
    loadSoundPreference()
    const socket = socketService.connect()
    
    socket.on('connect', () => {
      isConnected.value = true
      // Authenticate after connection
      if (authStore.userId && authStore.role) {
        socketService.emit('authenticate', {
          userId: authStore.userId,
          role: authStore.role,
          name: authStore.name
        })
      }
    })

    socket.on('disconnect', () => {
      isConnected.value = false
    })

    socket.on('authenticated', (data: any) => {
      console.log('Autenticado:', data)
      
      // Cargar datos según el rol del usuario despu�s de autenticación
      if (authStore.role === 'agent') {
        // Cargar chats asignados al agente
        socketService.emit('agent:get-my-chats', { agentId: authStore.userId })
        // Cargar chats pendientes
        socketService.emit('agent:get-pending-chats')
        // Cargar grupos del agente
        socketService.emit('group:list')
        // Unirse al chat global para recibir messages desde cualquier vista
        if (!isInGlobalChat.value) {
          joinGlobalRoom()
        }
      } else if (authStore.role === 'client') {
        // Cargar historial del cliente
        socketService.emit('client:get-history', { clientId: authStore.userId })
      }
    })

    // Chat events
    socket.on('chat:created', (chat: Chat) => {
      addOrUpdateChat(chat)
      currentChatId.value = chat.id
    })

    socket.on('chat:assigned', (data: { chatId: number; agentId: number; status: ChatStatus }) => {
      updateChatStatus(data.chatId, data.status, data.agentId)
    })

    socket.on('chat:status-changed', (data: { chatId: number; status: ChatStatus }) => {
      updateChatStatus(data.chatId, data.status)
    })

    socket.on('chat:ended', (data: { chatId: number }) => {
      console.log('chat:ended recibido:', data)
      updateChatStatus(data.chatId, 'closed')
      
      // Si es cliente, mostrar encuesta de satisfacci�n
      if (authStore.role === 'client') {
        console.log('Abriendo encuesta para chat:', data.chatId)
        surveyChatId.value = data.chatId
        showSurvey.value = true
        surveySubmitted.value = false
        console.log('mostrarEncuesta:', showSurvey.value, 'chatIdEncuesta:', surveyChatId.value)
      }
      
      // NO limpiar currentChatId inmediatamente para que la encuesta pueda mostrarse
      // Solo limpiar despu�s de un peque�o delay
      setTimeout(() => {
        if (currentChatId.value === data.chatId) {
          currentChatId.value = null
        }
      }, 500)
      
      // Refrescar el historial del cliente
      if (authStore.role === 'client' && authStore.userId) {
        setTimeout(() => {
          socketService.emit('client:get-history', { clientId: authStore.userId })
        }, 600)
      }
    })

    socket.on('chat:agent-joined', (data: { chatId: number; agentId: number; agentName?: string }) => {
      const chat = chats.value.find(c => c.id === data.chatId)
      if (chat) {
        chat.agentId = data.agentId
        chat.agentName = data.agentName
        chat.status = 'active'
      }
    })


    // Agent-specific events
    socket.on('agent:pending-chats', (chatList: Chat[]) => {
      pendingChats.value = chatList
    })

    socket.on('chat:new-pending', (chat: Chat) => {
      if (!pendingChats.value.find(c => c.id === chat.id)) {
        pendingChats.value.push(chat)
        if (authStore.role === 'agent') {
          playNotificationSound('pending')
          incrementUnseen()
        }
      }
    })

    socket.on('chat:removed-from-pending', (data: { chatId: number }) => {
      pendingChats.value = pendingChats.value.filter(c => c.id !== data.chatId)
    })

    // Client chat history
    socket.on('client:chat-history', (chatList: Chat[]) => {
      // Reemplazar los chats del cliente con los datos frescos del servidor
      // Esto evita estados inconsistentes entre el frontend y backend
      const otherChats = chats.value.filter(c => c.clientId !== authStore.userId)
      chats.value = [...otherChats, ...chatList]
      
      // Auto-seleccionar el chat activo del cliente si existe y no hay chat seleccionado
      if (authStore.role === 'client' && !currentChatId.value) {
        const activeChat = chatList.find(c => c.status !== 'closed')
        if (activeChat) {
          currentChatId.value = activeChat.id
          // Cargar messages del chat
          socketService.emit('messages:get', { chatId: activeChat.id })
        }
      }
    })

    // Message events
    socket.on('message:new', (message: Message) => {
      addMessage(message)
      if (message.chatId === currentChatId.value && message.userId !== authStore.userId) {
        markMessagesAsRead(message.chatId)
      }
      if (message.userId !== authStore.userId) {
        playNotificationSound('support')
        incrementUnseen()
      }
    })

    socket.on('messages:history', (data: { chatId: number; messages: Message[] }) => {
      const sorted = [...data.messages].sort((a, b) => {
        const at = new Date(a.timestamp).getTime()
        const bt = new Date(b.timestamp).getTime()
        if (at !== bt) return at - bt
        return a.id - b.id
      })
      messages.value.set(data.chatId, sorted)
    })

    // Typing events
    socket.on('typing:started', (data: { chatId: number; userId: number }) => {
      if (data.chatId === currentChatId.value) {
        typingUsers.value.add(data.userId)
      }
    })

    socket.on('typing:stopped', (data: { chatId: number; userId: number }) => {
      typingUsers.value.delete(data.userId)
    })

    // Unread count updates
    socket.on('chat:unread-updated', (data: { chatId: number; unreadCount: number }) => {
      const chat = chats.value.find(c => c.id === data.chatId)
      if (chat) {
        chat.unreadCount = data.unreadCount
      }
    })

    // Agent: My chats (for persistence)
    socket.on('agent:my-chats', (chatList: Chat[]) => {
      chatList.forEach(chat => addOrUpdateChat(chat))
    })

    // Agent: Available agents for transfer
    socket.on('agent:available-agents', (agents: Agent[]) => {
      console.log('agent:available-agents recibido:', agents)
      availableAgents.value = agents
    })

    socket.on('agent:unread-counts', (payload: { dm?: any[]; groups?: any[]; global?: number }) => {
      try {
        const dmMap = new Map<string, number>()
        const groupMap = new Map<number, number>()
        ;(payload?.dm || []).forEach((item: any) => {
          const a = Number(item.agentA)
          const b = Number(item.agentB)
          if (!Number.isFinite(a) || !Number.isFinite(b)) return
          const min = Math.min(a, b)
          const max = Math.max(a, b)
          const threadId = `dm:${min}-${max}`
          dmMap.set(threadId, Number(item.unread || 0))
        })
        ;(payload?.groups || []).forEach((item: any) => {
          const gid = Number(item.groupId)
          if (!Number.isFinite(gid)) return
          groupMap.set(gid, Number(item.unread || 0))
        })
        directUnreadCounts.value = dmMap
        groupUnreadCounts.value = groupMap
        globalUnreadCount.value = Number(payload?.global || 0)
      } catch (err) {
        console.error('agent:unread-counts error', err)
      }
    })

    // Agent: Chat transferred away from me
    socket.on('chat:transferred-away', (data: { chatId: number }) => {
      chats.value = chats.value.filter(c => c.id !== data.chatId)
      messages.value.delete(data.chatId)
      if (currentChatId.value === data.chatId) {
        currentChatId.value = null
      }
    })

    // Agent: Chat transferred to me
    socket.on('chat:transferred-to-me', (chat: Chat) => {
      addOrUpdateChat(chat)
    })

    // Client: Agent changed (transfer notification)
    socket.on('chat:agent-changed', (data: { chatId: number; agentId: number; agentName: string }) => {
      const chat = chats.value.find(c => c.id === data.chatId)
      if (chat) {
        chat.agentId = data.agentId
        chat.agentName = data.agentName
      }
    })

    // Message status updates
    socket.on('message:status-updated', (data: { chatId: number; messageIds: number[]; status: MessageStatus }) => {
      const chatMessages = messages.value.get(data.chatId)
      if (chatMessages) {
        chatMessages.forEach(msg => {
          if (data.messageIds.includes(msg.id)) {
            msg.status = data.status
          }
        })
      }
    })

    // Survey events
    socket.on('chat:survey-submitted', (data: { chatId: number; rating: number; feedback: string }) => {
      surveySubmitted.value = true
      const chat = chats.value.find(c => c.id === data.chatId)
      if (chat) {
        chat.rating = data.rating
        chat.feedback = data.feedback
      }
    })

    socket.on('chat:survey-received', (data: { chatId: number; rating: number; feedback: string }) => {
      const chat = chats.value.find(c => c.id === data.chatId)
      if (chat) {
        chat.rating = data.rating
        chat.feedback = data.feedback
      }
    })

    socket.on('attachments:updated', (detail: { entityId?: number; entityType?: string }) => {
      if (!detail?.entityId) return
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('attachments:updated', { detail }))
      }
    })

    // Agent: Chat history
    socket.on('agent:chat-history', (chatList: Chat[]) => {
      agentChatHistory.value = chatList
    })

    // ============================================
    // GLOBAL CHAT LISTENERS
    // ============================================
    
    // Load history when joining global chat
    socket.on('global:history', (messages: any[]) => {
      console.log('Historial global recibido:', messages.length, 'mensajes')
      globalMessages.value = messages
    })
    
    socket.on('global:message', (message: any) => {
      console.log('Mensaje global recibido:', message)
      // Evitar duplicados
      if (!globalMessages.value.find(m => m.id === message.id)) {
        globalMessages.value.push(message)
      }
      if (message.senderId && message.senderId !== authStore.userId) {
        playNotificationSound('global')
        incrementUnseen()
        if (!isViewingGlobalChat.value) {
          globalUnreadCount.value += 1
        }
      }
    })

    socket.on('global:users', (users: any[]) => {
      console.log('👥 Actualizaci�n de usuarios global:', users)
      globalOnlineUsers.value = users
    })

    socket.on('global:typing', (data: { userName: string; isTyping: boolean }) => {
      if (data.isTyping && !globalTypingUsers.value.includes(data.userName)) {
        globalTypingUsers.value.push(data.userName)
      } else if (!data.isTyping) {
        globalTypingUsers.value = globalTypingUsers.value.filter(u => u !== data.userName)
      }
    })

    socket.on('agent:online-users', (data: { userIds: number[] }) => {
      onlineAgentIds.value = new Set(data.userIds || [])
    })

    // ============================================
    // DIRECT MESSAGES (AGENT 1:1)
    // ============================================
    socket.on('agent:dm:history', (data: { threadId: string; messages: DirectMessage[] }) => {
      const sorted = [...(data.messages || [])].sort((a, b) => {
        const at = new Date(a.timestamp).getTime()
        const bt = new Date(b.timestamp).getTime()
        if (at !== bt) return at - bt
        return a.id - b.id
      })
      directMessages.value.set(data.threadId, sorted)
    })

    socket.on('agent:dm:message', (message: DirectMessage) => {
      if (!message?.threadId) return
      const existing = directMessages.value.get(message.threadId) || []
      if (!existing.find(m => m.id === message.id)) {
        existing.push(message)
        existing.sort((a, b) => {
          const at = new Date(a.timestamp).getTime()
          const bt = new Date(b.timestamp).getTime()
          if (at !== bt) return at - bt
          return a.id - b.id
        })
        directMessages.value.set(message.threadId, existing)
      }
      if (message.senderId !== authStore.userId) {
        if (currentDmThreadId.value !== message.threadId) {
          incrementDmUnread(message.threadId)
        }
        playNotificationSound('dm')
        incrementUnseen()
      }
    })

    socket.on('agent:dm:typing', (data: { threadId: string; userName: string; isTyping: boolean }) => {
      if (!data?.threadId) return
      const current = directTypingUsers.value.get(data.threadId) || []
      if (data.isTyping) {
        if (!current.includes(data.userName)) {
          directTypingUsers.value.set(data.threadId, [...current, data.userName])
        }
      } else {
        directTypingUsers.value.set(
          data.threadId,
          current.filter(name => name !== data.userName)
        )
      }
    })

    // ============================================
    // GROUP CHAT LISTENERS
    // ============================================
    socket.on('group:list', (groups: GroupChat[]) => {
      groupChats.value = groups || []
      if (groups) {
        groups.forEach((group) => {
          if (group.members) {
            groupMembers.value.set(group.id, group.members)
          }
          if (group?.id && !joinedGroupIds.has(group.id)) {
            joinedGroupIds.add(group.id)
            socketService.emit('group:join', { groupId: group.id })
          }
        })
      }
    })

    socket.on('group:created', (group: GroupChat) => {
      addGroupChat(group)
    })

    socket.on('group:added', (group: GroupChat) => {
      addGroupChat(group)
    })

    socket.on('group:removed', (data: { groupId: number }) => {
      const gid = data?.groupId
      if (!gid) return
      groupChats.value = groupChats.value.filter(g => g.id !== gid)
      groupMessages.value.delete(gid)
      groupMembers.value.delete(gid)
      joinedGroupIds.delete(gid)
      clearGroupUnread(gid)
      if (currentGroupId.value === gid) {
        currentGroupId.value = null
      }
    })

    socket.on('group:members', (data: { groupId: number; members: GroupMember[] }) => {
      if (!data?.groupId) return
      groupMembers.value.set(data.groupId, data.members || [])
    })

    socket.on('group:history', (data: { groupId: number; messages: GroupMessage[] }) => {
      if (!data?.groupId) return
      const sorted = [...(data.messages || [])].sort((a, b) => {
        const at = new Date(a.timestamp).getTime()
        const bt = new Date(b.timestamp).getTime()
        if (at !== bt) return at - bt
        return a.id - b.id
      })
      groupMessages.value.set(data.groupId, sorted)
    })

    socket.on('group:message', (message: GroupMessage) => {
      if (!message?.groupId) return
      const existing = groupMessages.value.get(message.groupId) || []
      if (!existing.find(m => m.id === message.id)) {
        existing.push(message)
        existing.sort((a, b) => {
          const at = new Date(a.timestamp).getTime()
          const bt = new Date(b.timestamp).getTime()
          if (at !== bt) return at - bt
          return a.id - b.id
        })
        groupMessages.value.set(message.groupId, existing)
      }
      if (message.senderId !== authStore.userId) {
        playNotificationSound('group')
        incrementUnseen()
        if (currentGroupId.value !== message.groupId) {
          incrementGroupUnread(message.groupId)
        } else {
          clearGroupUnread(message.groupId)
        }
      }
    })
  }

  function disconnectSocket() {
    socketService.disconnect()
    isConnected.value = false
  }

  // Chat management
  function addOrUpdateChat(chat: Chat) {
    const index = chats.value.findIndex(c => c.id === chat.id)
    if (index >= 0) {
      chats.value[index] = { ...chats.value[index], ...chat }
    } else {
      chats.value.push(chat)
    }
  }

  function updateChatStatus(chatId: number, status: ChatStatus, agentId?: number) {
    const chat = chats.value.find(c => c.id === chatId)
    if (chat) {
      chat.status = status
      if (agentId !== undefined) {
        chat.agentId = agentId
      }
      if (status === 'closed') {
        chat.closedAt = new Date()
      }
    }
  }

  function selectChat(chatId: number) {
    currentChatId.value = chatId
    clearUnseen()
    
    // Actualizar unreadCount inmediatamente en el frontend
    const chat = chats.value.find(c => c.id === chatId)
    if (chat && chat.unreadCount > 0) {
      chat.unreadCount = 0
    }
    
    // Siempre cargar messages y marcar como le�dos en el backend
    socketService.emit('messages:get', { chatId })
  }

  // Client actions
  function getClientHistory() {
    if (!authStore.userId) return
    socketService.emit('client:get-history', { clientId: authStore.userId })
  }

  function startChat(subject?: string) {
    socketService.emit('client:start-chat', {
      clientId: authStore.userId,
      subject: subject || 'Soporte'
    })
  }

  function viewChat(chatId: number) {
    currentChatId.value = chatId
    const chat = chats.value.find(c => c.id === chatId)
    if (chat) {
      addOrUpdateChat(chat)
    }
    // Load messages
    socketService.emit('messages:get', { chatId })
  }

  function clientSendMessage(content: string, replyToId?: number, hasAttachments = false) {
    if (!currentChatId.value || !authStore.userId) return
    
    socketService.emit('client:send-message', {
      chatId: currentChatId.value,
      clientId: authStore.userId,
      content,
      replyToId: replyToId || replyingToMessage.value?.id || null,
      hasAttachments
    })
    
    // Clear reply state after sending
    replyingToMessage.value = null
  }

  function clientEndChat() {
    // Usar el chat activo del cliente si currentChatId no est� establecido
    const chatId = currentChatId.value || clientChat.value?.id
    if (!chatId || !authStore.userId) return
    
    console.log('Cerrando chat:', chatId)
    socketService.emit('client:end-chat', {
      chatId,
      clientId: authStore.userId
    })
    
    // Mostrar encuesta inmediatamente cuando el cliente cierra el chat
    // (no esperar al evento del servidor)
    surveyChatId.value = chatId
    showSurvey.value = true
    surveySubmitted.value = false
  }

  // Agent actions
  function getPendingChats() {
    socketService.emit('agent:get-pending-chats')
  }

  function assignChat(chatId: number) {
    if (!authStore.userId) return
    
    socketService.emit('agent:assign-chat', {
      chatId,
      agentId: authStore.userId
    })
    
    // Move from pending to active
    const chat = pendingChats.value.find(c => c.id === chatId)
    if (chat) {
      chat.agentId = authStore.userId
      chat.status = 'active'
      addOrUpdateChat(chat)
      pendingChats.value = pendingChats.value.filter(c => c.id !== chatId)
    }
    
    selectChat(chatId)
  }

  function agentSendMessage(content: string, replyToId?: number, hasAttachments = false) {
    if (!currentChatId.value || !authStore.userId) return
    
    socketService.emit('agent:send-message', {
      chatId: currentChatId.value,
      agentId: authStore.userId,
      content,
      replyToId: replyToId || replyingToMessage.value?.id || null,
      hasAttachments
    })
    
    // Clear reply state after sending
    replyingToMessage.value = null
  }

  function putChatOnHold(chatId: number) {
    socketService.emit('agent:put-on-hold', {
      chatId,
      agentId: authStore.userId
    })
  }

  function closeChat(chatId: number) {
    socketService.emit('agent:close-chat', {
      chatId,
      agentId: authStore.userId
    })
  }

  function resumeChat(chatId: number) {
    socketService.emit('agent:resume-chat', {
      chatId,
      agentId: authStore.userId
    })
  }

  // Agent: Get my assigned chats (for persistence)
  function getAgentChats() {
    if (!authStore.userId) return
    socketService.emit('agent:get-my-chats', { agentId: authStore.userId })
  }

  // Agent: Get available agents for transfer
  function getAvailableAgents() {
    if (!authStore.userId) return
    socketService.emit('agent:get-available-agents', { excludeAgentId: authStore.userId })
  }

  // Agent: Get all agents (including current user)
  function getAllAgents() {
    socketService.emit('agent:get-available-agents', { excludeAgentId: null })
  }

  // Agent: Transfer chat to another agent
  function transferChat(chatId: number, toAgentId: number) {
    if (!authStore.userId) return
    socketService.emit('agent:transfer-chat', {
      chatId,
      fromAgentId: authStore.userId,
      toAgentId
    })
  }

  // Agent: Get closed chats history
  function getAgentHistory() {
    if (!authStore.userId) return
    socketService.emit('agent:get-history', { agentId: authStore.userId })
  }

  // Client: Submit satisfaction survey
  function submitSurvey(chatId: number, rating: number, feedback?: string) {
    socketService.emit('chat:submit-survey', {
      chatId,
      rating,
      feedback: feedback || null
    })
  }

  // Mark messages as read
  function markMessagesAsRead(chatId: number) {
    socketService.emit('messages:mark-read', { chatId })
  }

  // Show/hide survey modal
  function openSurvey() {
    showSurvey.value = true
  }

  function closeSurvey() {
    showSurvey.value = false
    surveyChatId.value = null
  }

  // Reply to message
  function setReplyingTo(message: Message | null) {
    replyingToMessage.value = message
  }

  function clearReplyingTo() {
    replyingToMessage.value = null
  }

  // Message management
  function addMessage(message: Message) {
    const chatMessages = messages.value.get(message.chatId) || []
    // Avoid duplicates
    if (!chatMessages.find(m => m.id === message.id)) {
      chatMessages.push(message)
      chatMessages.sort((a, b) => {
        const at = new Date(a.timestamp).getTime()
        const bt = new Date(b.timestamp).getTime()
        if (at !== bt) return at - bt
        return a.id - b.id
      })
      messages.value.set(message.chatId, chatMessages)
    }
    
    // Update last message in chat
    const chat = chats.value.find(c => c.id === message.chatId)
    if (chat) {
      chat.lastMessage = message.content
    }
  }

  function loadSoundPreference() {
    if (typeof window === 'undefined') return
    const rawEnabled = window.localStorage.getItem('chat:soundEnabled')
    if (rawEnabled !== null) {
      soundEnabled.value = rawEnabled === 'true'
    }
    const rawTypes = window.localStorage.getItem('chat:soundByType')
    if (rawTypes) {
      try {
        const parsed = JSON.parse(rawTypes)
        soundByType.value = {
          ...soundByType.value,
          ...parsed
        }
      } catch {
        // ignore bad JSON
      }
    }
  }

  function setSoundEnabled(next: boolean) {
    soundEnabled.value = next
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('chat:soundEnabled', String(next))
    }
  }

  function toggleSoundEnabled() {
    setSoundEnabled(!soundEnabled.value)
  }

  function setSoundTypeEnabled(type: 'support' | 'global' | 'group' | 'dm' | 'pending', next: boolean) {
    soundByType.value = { ...soundByType.value, [type]: next }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('chat:soundByType', JSON.stringify(soundByType.value))
    }
  }

  function toggleSoundType(type: 'support' | 'global' | 'group' | 'dm' | 'pending') {
    const current = !!soundByType.value[type]
    setSoundTypeEnabled(type, !current)
  }

  function ensureTitleListener() {
    if (titleListenerAttached || typeof document === 'undefined') return
    baseTitle = document.title
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        clearUnseen()
      }
    })
    titleListenerAttached = true
  }

  function incrementUnseen() {
    unseenTotal.value += 1
    updateTitle()
  }

  function clearUnseen() {
    unseenTotal.value = 0
    updateTitle()
  }

  function updateTitle() {
    if (typeof document === 'undefined') return
    const title = baseTitle || document.title || 'Chat'
    if (unseenTotal.value > 0) {
      document.title = `(${unseenTotal.value}) ${title}`
    } else {
      document.title = title
    }
  }

  function incrementDmUnread(threadId: string) {
    const current = directUnreadCounts.value.get(threadId) || 0
    const next = new Map(directUnreadCounts.value)
    next.set(threadId, current + 1)
    directUnreadCounts.value = next
  }

  function clearDmUnread(threadId: string) {
    if (!directUnreadCounts.value.has(threadId)) return
    const next = new Map(directUnreadCounts.value)
    next.delete(threadId)
    directUnreadCounts.value = next
  }

  function incrementGroupUnread(groupId: number) {
    const current = groupUnreadCounts.value.get(groupId) || 0
    const next = new Map(groupUnreadCounts.value)
    next.set(groupId, current + 1)
    groupUnreadCounts.value = next
  }

  function clearGroupUnread(groupId: number) {
    if (!groupUnreadCounts.value.has(groupId)) return
    const next = new Map(groupUnreadCounts.value)
    next.delete(groupId)
    groupUnreadCounts.value = next
  }

  function clearGlobalUnread() {
    globalUnreadCount.value = 0
  }

  function setViewingGlobalChat(next: boolean) {
    isViewingGlobalChat.value = next
    if (next) {
      clearGlobalUnread()
      if (authStore.userId) {
        socketService.emit('global:mark-read', { userId: authStore.userId })
      }
    }
  }

  function playNotificationSound(type: 'support' | 'global' | 'group' | 'dm' | 'pending') {
    if (!soundEnabled.value) return
    if (!soundByType.value[type]) return
    if (!audioUnlocked.value) return
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      if (!audioContext) {
        audioContext = new AudioContextClass()
      }
      const ctx = audioContext
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
      const playBeep = (startAt: number, freq: number) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        o.frequency.setValueAtTime(freq, startAt)
        g.gain.setValueAtTime(0.0001, startAt)
        g.gain.exponentialRampToValueAtTime(0.05, startAt + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.2)
        o.connect(g)
        g.connect(ctx.destination)
        o.start(startAt)
        o.stop(startAt + 0.22)
      }
      const now = ctx.currentTime
      if (type === 'pending') {
        playBeep(now, 520)
        playBeep(now + 0.35, 620)
        playBeep(now + 0.7, 520)
      } else {
        playBeep(now, 740)
        playBeep(now + 0.8, 880)
      }
    } catch {
      // ignore audio errors
    }
  }

  function unlockAudio() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      if (!audioContext) {
        audioContext = new AudioContextClass()
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {})
      }
      audioUnlocked.value = true
    } catch {
      // ignore
    }
  }

  // Typing indicators
  function startTyping() {
    if (!currentChatId.value) return
    socketService.emit('typing:start', { chatId: currentChatId.value })
  }

  function stopTyping() {
    if (!currentChatId.value) return
    socketService.emit('typing:stop', { chatId: currentChatId.value })
  }

  // Global Chat functions
  function joinGlobalRoom() {
    console.log(' Uni�ndose a la sala global...')
    isInGlobalChat.value = true
    socketService.emit('global:join', {
      userId: authStore.userId,
      name: authStore.name,
      role: authStore.role
    })
  }

  function leaveGlobalRoom() {
    console.log(' Saliendo de la sala global...')
    isInGlobalChat.value = false
    socketService.emit('global:leave', { userId: authStore.userId })
  }

  function sendGlobalMessage(content: string) {
    console.log(' Enviando mensaje global:', content.substring(0, 30))
    socketService.emit('global:message', {
      senderId: authStore.userId,
      senderName: authStore.name,
      senderRole: authStore.role,
      content
    })
  }

  function clearGlobalMessages() {
    globalMessages.value = []
  }

  function startGlobalTyping() {
    socketService.emit('global:typing', {
      userId: authStore.userId,
      userName: authStore.name,
      isTyping: true
    })
  }

  function stopGlobalTyping() {
    socketService.emit('global:typing', {
      userId: authStore.userId,
      userName: authStore.name,
      isTyping: false
    })
  }

  // Agent direct messages
  function joinDirectThread(otherAgentId: number) {
    if (!authStore.userId) return
    const min = Math.min(otherAgentId, authStore.userId)
    const max = Math.max(otherAgentId, authStore.userId)
    const threadId = `dm:${min}-${max}`
    currentDmThreadId.value = threadId
    clearDmUnread(threadId)
    clearUnseen()
    socketService.emit('agent:dm:join', { otherAgentId })
  }

  function setActiveDirectThread(threadId: string | null) {
    currentDmThreadId.value = threadId
  }

  function sendDirectMessage(toAgentId: number, content: string) {
    socketService.emit('agent:dm:message', { toAgentId, content })
  }

  function startDirectTyping(toAgentId: number) {
    socketService.emit('agent:dm:typing', { toAgentId, isTyping: true })
  }

  function stopDirectTyping(toAgentId: number) {
    socketService.emit('agent:dm:typing', { toAgentId, isTyping: false })
  }

  // Group Chat functions
  function getGroupChats() {
    socketService.emit('group:list')
  }

  function createGroup(name: string, memberIds: number[]) {
    socketService.emit('group:create', { name, memberIds })
  }

  function addGroupMembers(groupId: number, memberIds: number[]) {
    socketService.emit('group:add-members', { groupId, memberIds })
  }

  function removeGroupMember(groupId: number, memberId: number) {
    socketService.emit('group:remove-member', { groupId, memberId })
  }

  function joinGroup(groupId: number) {
    currentGroupId.value = groupId
    clearGroupUnread(groupId)
    socketService.emit('group:join', { groupId })
  }

  function setActiveGroup(groupId: number | null) {
    currentGroupId.value = groupId
  }

  function leaveGroup(groupId: number) {
    if (currentGroupId.value === groupId) {
      currentGroupId.value = null
    }
    socketService.emit('group:leave', { groupId })
  }

  function sendGroupMessage(groupId: number, content: string) {
    socketService.emit('group:message', { groupId, content })
  }

  function addGroupChat(group: GroupChat) {
    if (!group) return
    const existing = groupChats.value.find(g => g.id === group.id)
    if (!existing) {
      groupChats.value.unshift(group)
    } else {
      Object.assign(existing, group)
    }
    if (group.members) {
      groupMembers.value.set(group.id, group.members)
    }
  }

  // Clear active client chat only
  function clearActiveClientChat() {
    if (currentChatId.value) {
      // Remove the chat from the chats array
      chats.value = chats.value.filter(c => c.id !== currentChatId.value)
      // Clear messages for this chat
      messages.value.delete(currentChatId.value)
    }
    currentChatId.value = null
    typingUsers.value = new Set()
  }

  // Force remove a specific chat (for immediate cleanup)
  function forceRemoveChat(chatId: number) {
    chats.value = chats.value.filter(c => c.id !== chatId)
    messages.value.delete(chatId)
    if (currentChatId.value === chatId) {
      currentChatId.value = null
    }
    typingUsers.value = new Set()
  }

  // Reset state
  function reset() {
    currentChatId.value = null
    chats.value = []
    pendingChats.value = []
    messages.value = new Map()
    typingUsers.value = new Set()
    availableAgents.value = []
    replyingToMessage.value = null
    agentChatHistory.value = []
    showSurvey.value = false
    surveySubmitted.value = false
    surveyChatId.value = null
    // Global Chat state
    globalMessages.value = []
    globalOnlineUsers.value = []
    globalTypingUsers.value = []
    isInGlobalChat.value = false
    isViewingGlobalChat.value = false
    // Direct messages
    directMessages.value = new Map()
    directTypingUsers.value = new Map()
    onlineAgentIds.value = new Set()
    directUnreadCounts.value = new Map()
    currentDmThreadId.value = null
    unseenTotal.value = 0
    updateTitle()
    // Group Chat state
    groupChats.value = []
    groupMessages.value = new Map()
    groupMembers.value = new Map()
    currentGroupId.value = null
    groupUnreadCounts.value = new Map()
    globalUnreadCount.value = 0
    joinedGroupIds.clear()
  }

  return {
    // State
    isConnected,
    currentChatId,
    chats,
    pendingChats,
    messages,
    typingUsers,
    availableAgents,
    replyingToMessage,
    agentChatHistory,
    showSurvey,
    surveySubmitted,
    surveyChatId,
    
    // Global Chat State
    globalMessages,
    globalOnlineUsers,
    globalTypingUsers,
    isInGlobalChat,
    isViewingGlobalChat,
    globalUnreadCount,
    directMessages,
    directTypingUsers,
    onlineAgentIds,
    directUnreadCounts,
    groupUnreadCounts,
    soundEnabled,
    soundByType,
    
    // Computed
    currentChat,
    currentMessages,
    activeChats,
    clientChat,
    clientChatHistory,
    
    // Connection
    connectSocket,
    disconnectSocket,
    
    // Chat management
    selectChat,
    
    // Client actions
    getClientHistory,
    startChat,
    viewChat,
    clientSendMessage,
    clientEndChat,
    submitSurvey,
    openSurvey,
    closeSurvey,
    
    // Agent actions
    getPendingChats,
    assignChat,
    agentSendMessage,
    putChatOnHold,
    resumeChat,
    closeChat,
    getAgentChats,
    getAvailableAgents,
    getAllAgents,
    transferChat,
    getAgentHistory,
    
    // Messages
    markMessagesAsRead,
    
    // Reply
    setReplyingTo,
    clearReplyingTo,
    
    // Typing
    startTyping,
    stopTyping,
    
    // Global Chat
    joinGlobalRoom,
    leaveGlobalRoom,
    sendGlobalMessage,
    clearGlobalMessages,
    startGlobalTyping,
    stopGlobalTyping,
    joinDirectThread,
    setActiveDirectThread,
    sendDirectMessage,
    startDirectTyping,
    stopDirectTyping,
    setSoundEnabled,
    toggleSoundEnabled,
    setSoundTypeEnabled,
    toggleSoundType,
    clearGlobalUnread,
    setViewingGlobalChat,
    unlockAudio,

    // Group Chat
    groupChats,
    groupMessages,
    groupMembers,
    currentGroupId,
    getGroupChats,
    createGroup,
    addGroupMembers,
    removeGroupMember,
    joinGroup,
    leaveGroup,
    sendGroupMessage,
    clearGroupUnread,
    setActiveGroup,
    
    // Reset
    reset,
    clearActiveClientChat,
    forceRemoveChat
  }
})




