import type { ComputedRef, Ref } from 'vue'
import socketService from '@/services/socket'
import type { Agent, Chat, ChatStatus, Message, MessageStatus } from './chatTypes'

type AuthLike = {
  userId: number | null
  role: string | null
}

export function registerSupportListeners(params: {
  socket: any
  authStore: AuthLike
  chats: Ref<Chat[]>
  pendingChats: Ref<Chat[]>
  messages: Ref<Map<number, Message[]>>
  typingUsers: Ref<Set<number>>
  availableAgents: Ref<Agent[]>
  agentChatHistory: Ref<Chat[]>
  showSurvey: Ref<boolean>
  surveySubmitted: Ref<boolean>
  surveyChatId: Ref<number | null>
  currentChatId: Ref<number | null>
  directUnreadCounts: Ref<Map<string, number>>
  groupUnreadCounts: Ref<Map<number, number>>
  globalUnreadCount: Ref<number>
  playNotificationSound: (type: 'support' | 'pending') => void
  incrementUnseen: () => void
  addOrUpdateChat: (chat: Chat) => void
  updateChatStatus: (chatId: number, status: ChatStatus, agentId?: number) => void
  addMessage: (message: Message) => void
  markMessagesAsRead: (chatId: number) => void
}) {
  const {
    socket,
    authStore,
    chats,
    pendingChats,
    messages,
    typingUsers,
    availableAgents,
    agentChatHistory,
    showSurvey,
    surveySubmitted,
    surveyChatId,
    currentChatId,
    directUnreadCounts,
    groupUnreadCounts,
    globalUnreadCount,
    playNotificationSound,
    incrementUnseen,
    addOrUpdateChat,
    updateChatStatus,
    addMessage,
    markMessagesAsRead
  } = params

  const lastUnreadCountByChatId = new Map<number, number>()
  const lastSupportSoundAtByChatId = new Map<number, number>()

  function maybePlayAgentSupportSound(chatId: number) {
    if (authStore.role !== 'agent') return
    const now = Date.now()
    const lastPlayedAt = lastSupportSoundAtByChatId.get(chatId) || 0
    if (now - lastPlayedAt < 450) return
    lastSupportSoundAtByChatId.set(chatId, now)
    playNotificationSound('support')
    incrementUnseen()
  }

  function maybePlaySupportSound(chatId: number) {
    if (authStore.role === 'agent') {
      maybePlayAgentSupportSound(chatId)
      return
    }
    playNotificationSound('support')
    incrementUnseen()
  }

  function clearVisibleConversation(chatId: number) {
    if (currentChatId.value !== chatId) return
    currentChatId.value = null
    typingUsers.value = new Set()
  }

  socket.on('chat:created', (chat: Chat) => {
    addOrUpdateChat(chat)
    currentChatId.value = chat.id
  })

  socket.on('chat:assigned', (data: { chatId: number; agentId: number; status: ChatStatus }) => {
    updateChatStatus(data.chatId, data.status, data.agentId)
  })

  socket.on('chat:status-changed', (data: { chatId: number; status: ChatStatus }) => {
    updateChatStatus(data.chatId, data.status)
    if (data.status === 'closed') {
      clearVisibleConversation(data.chatId)
    }
  })

  socket.on('chat:ended', (data: { chatId: number }) => {
    console.log('chat:ended recibido:', data)
    updateChatStatus(data.chatId, 'closed')

    if (authStore.role === 'client') {
      console.log('Abriendo encuesta para chat:', data.chatId)
      surveyChatId.value = data.chatId
      showSurvey.value = true
      surveySubmitted.value = false
      console.log('mostrarEncuesta:', showSurvey.value, 'chatIdEncuesta:', surveyChatId.value)
    }

    setTimeout(() => {
      clearVisibleConversation(data.chatId)
    }, 500)

    if (authStore.role === 'client' && authStore.userId) {
      setTimeout(() => {
        socketService.emit('client:get-history')
      }, 600)
    }
  })

  socket.on('chat:agent-joined', (data: { chatId: number; agentId: number; agentName?: string }) => {
    const chat = chats.value.find((item) => item.id === data.chatId)
    if (!chat) return
    chat.agentId = data.agentId
    chat.agentName = data.agentName
    chat.status = 'active'
  })

  socket.on('agent:pending-chats', (chatList: Chat[]) => {
    pendingChats.value = chatList
  })

  socket.on('chat:new-pending', (chat: Chat) => {
    if (pendingChats.value.find((item) => item.id === chat.id)) return
    pendingChats.value.push(chat)
    if (authStore.role === 'agent') {
      playNotificationSound('pending')
      incrementUnseen()
    }
  })

  socket.on('chat:removed-from-pending', (data: { chatId: number }) => {
    pendingChats.value = pendingChats.value.filter((chat) => chat.id !== data.chatId)
  })

  socket.on('client:chat-history', (chatList: Chat[]) => {
    const otherChats = chats.value.filter((chat) => chat.clientId !== authStore.userId)
    chats.value = [...otherChats, ...chatList]

    if (authStore.role === 'client' && !currentChatId.value) {
      const activeChat = chatList.find((chat) => chat.status !== 'closed')
      if (activeChat) {
        currentChatId.value = activeChat.id
        socketService.emit('messages:get', { chatId: activeChat.id })
      }
    }
  })

  socket.on('message:new', (message: Message) => {
    addMessage(message)
    if (message.chatId === currentChatId.value && message.userId !== authStore.userId) {
      markMessagesAsRead(message.chatId)
    }
    if (message.userId !== authStore.userId) {
      maybePlaySupportSound(message.chatId)
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

  socket.on('typing:started', (data: { chatId: number; userId: number }) => {
    if (data.chatId === currentChatId.value) {
      typingUsers.value = new Set([...typingUsers.value, data.userId])
    }
  })

  socket.on('typing:stopped', (data: { chatId: number; userId: number }) => {
    const nextTypingUsers = new Set(typingUsers.value)
    nextTypingUsers.delete(data.userId)
    typingUsers.value = nextTypingUsers
  })

  socket.on('chat:unread-updated', (data: { chatId: number; unreadCount: number }) => {
    const chat = chats.value.find((item) => item.id === data.chatId)
    const previousUnread = lastUnreadCountByChatId.get(data.chatId) ?? chat?.unreadCount ?? 0
    if (chat) {
      chat.unreadCount = data.unreadCount
    }
    lastUnreadCountByChatId.set(data.chatId, data.unreadCount)
    if (data.unreadCount > previousUnread) {
      maybePlayAgentSupportSound(data.chatId)
    }
  })

  socket.on('agent:my-chats', (chatList: Chat[]) => {
    chatList.forEach((chat) => addOrUpdateChat(chat))
  })

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
        dmMap.set(`dm:${min}-${max}`, Number(item.unread || 0))
      })
      ;(payload?.groups || []).forEach((item: any) => {
        const groupId = Number(item.groupId)
        if (!Number.isFinite(groupId)) return
        groupMap.set(groupId, Number(item.unread || 0))
      })
      directUnreadCounts.value = dmMap
      groupUnreadCounts.value = groupMap
      globalUnreadCount.value = Number(payload?.global || 0)
    } catch (error) {
      console.error('agent:unread-counts error', error)
    }
  })

  socket.on('chat:transferred-away', (data: { chatId: number }) => {
    chats.value = chats.value.filter((chat) => chat.id !== data.chatId)
    messages.value.delete(data.chatId)
    clearVisibleConversation(data.chatId)
  })

  socket.on('chat:transferred-to-me', (chat: Chat) => {
    addOrUpdateChat(chat)
  })

  socket.on('chat:agent-changed', (data: { chatId: number; agentId: number; agentName: string }) => {
    const chat = chats.value.find((item) => item.id === data.chatId)
    if (chat) {
      chat.agentId = data.agentId
      chat.agentName = data.agentName
    }
  })

  socket.on('message:status-updated', (data: { chatId: number; messageIds: number[]; status: MessageStatus }) => {
    const chatMessages = messages.value.get(data.chatId)
    if (!chatMessages) return
    chatMessages.forEach((message) => {
      if (data.messageIds.includes(message.id)) {
        message.status = data.status
      }
    })
  })

  socket.on('chat:survey-submitted', (data: { chatId: number; rating: number; feedback: string }) => {
    surveySubmitted.value = true
    const chat = chats.value.find((item) => item.id === data.chatId)
    if (chat) {
      chat.rating = data.rating
      chat.feedback = data.feedback
    }
  })

  socket.on('chat:survey-received', (data: { chatId: number; rating: number; feedback: string }) => {
    const chat = chats.value.find((item) => item.id === data.chatId)
    if (chat) {
      chat.rating = data.rating
      chat.feedback = data.feedback
    }
  })

  socket.on('attachments:updated', (detail: { entityId?: number; entityType?: string }) => {
    if (!detail?.entityId || typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('attachments:updated', { detail }))
  })

  socket.on('agent:chat-history', (chatList: Chat[]) => {
    agentChatHistory.value = chatList
  })
}

export function createSupportActions(params: {
  authStore: AuthLike
  chats: Ref<Chat[]>
  pendingChats: Ref<Chat[]>
  messages: Ref<Map<number, Message[]>>
  typingUsers: Ref<Set<number>>
  availableAgents: Ref<Agent[]>
  replyingToMessage: Ref<Message | null>
  showSurvey: Ref<boolean>
  surveySubmitted: Ref<boolean>
  surveyChatId: Ref<number | null>
  currentChatId: Ref<number | null>
  clientChat: ComputedRef<Chat | null>
  clearUnseen: () => void
}) {
  const {
    authStore,
    chats,
    pendingChats,
    messages,
    typingUsers,
    replyingToMessage,
    showSurvey,
    surveySubmitted,
    surveyChatId,
    currentChatId,
    clientChat,
    clearUnseen
  } = params

  function addOrUpdateChat(chat: Chat) {
    const index = chats.value.findIndex((item) => item.id === chat.id)
    if (index >= 0) {
      chats.value[index] = { ...chats.value[index], ...chat }
    } else {
      chats.value.push(chat)
    }
  }

  function updateChatStatus(chatId: number, status: ChatStatus, agentId?: number) {
    const chat = chats.value.find((item) => item.id === chatId)
    if (!chat) return
    chat.status = status
    if (agentId !== undefined) {
      chat.agentId = agentId
    }
    if (status === 'closed') {
      chat.closedAt = new Date()
    }
  }

  function clearVisibleConversation(chatId: number) {
    if (currentChatId.value !== chatId) return
    currentChatId.value = null
    typingUsers.value = new Set()
  }

  function selectChat(chatId: number) {
    currentChatId.value = chatId
    typingUsers.value = new Set()
    clearUnseen()
    const chat = chats.value.find((item) => item.id === chatId)
    if (chat && chat.unreadCount > 0) {
      chat.unreadCount = 0
    }
    socketService.emit('messages:get', { chatId })
  }

  function getClientHistory() {
    if (!authStore.userId) return
    socketService.emit('client:get-history')
  }

  function startChat(subject?: string) {
    socketService.emit('client:start-chat', {
      subject: subject || 'Soporte'
    })
  }

  function viewChat(chatId: number) {
    currentChatId.value = chatId
    const chat = chats.value.find((item) => item.id === chatId)
    if (chat) {
      addOrUpdateChat(chat)
    }
    socketService.emit('messages:get', { chatId })
  }

  function clientSendMessage(content: string, replyToId?: number, hasAttachments = false) {
    if (!currentChatId.value || !authStore.userId) return
    socketService.emit('client:send-message', {
      chatId: currentChatId.value,
      content,
      replyToId: replyToId || replyingToMessage.value?.id || null,
      hasAttachments
    })
    replyingToMessage.value = null
  }

  function clientEndChat() {
    const chatId = currentChatId.value || clientChat.value?.id
    if (!chatId || !authStore.userId) return
    console.log('Cerrando chat:', chatId)
    socketService.emit('client:end-chat', { chatId })
    surveyChatId.value = chatId
    showSurvey.value = true
    surveySubmitted.value = false
  }

  function getPendingChats() {
    socketService.emit('agent:get-pending-chats')
  }

  function assignChat(chatId: number) {
    if (!authStore.userId) return
    socketService.emit('agent:assign-chat', { chatId })
    const chat = pendingChats.value.find((item) => item.id === chatId)
    if (chat) {
      chat.agentId = authStore.userId
      chat.status = 'active'
      addOrUpdateChat(chat)
      pendingChats.value = pendingChats.value.filter((item) => item.id !== chatId)
    }
    selectChat(chatId)
  }

  function agentSendMessage(content: string, replyToId?: number, hasAttachments = false) {
    if (!currentChatId.value || !authStore.userId) return
    socketService.emit('agent:send-message', {
      chatId: currentChatId.value,
      content,
      replyToId: replyToId || replyingToMessage.value?.id || null,
      hasAttachments
    })
    replyingToMessage.value = null
  }

  function putChatOnHold(chatId: number) {
    socketService.emit('agent:put-on-hold', { chatId })
  }

  function closeChat(chatId: number) {
    clearVisibleConversation(chatId)
    socketService.emit('agent:close-chat', { chatId })
  }

  function resumeChat(chatId: number) {
    socketService.emit('agent:resume-chat', { chatId })
  }

  function getAgentChats() {
    if (!authStore.userId) return
    socketService.emit('agent:get-my-chats')
  }

  function getAvailableAgents() {
    if (!authStore.userId) return
    socketService.emit('agent:get-available-agents', { excludeAgentId: authStore.userId })
  }

  function getAllAgents() {
    socketService.emit('agent:get-available-agents', { excludeAgentId: null })
  }

  function transferChat(chatId: number, toAgentId: number) {
    if (!authStore.userId) return
    clearVisibleConversation(chatId)
    socketService.emit('agent:transfer-chat', { chatId, toAgentId })
  }

  function getAgentHistory() {
    if (!authStore.userId) return
    socketService.emit('agent:get-history')
  }

  function submitSurvey(chatId: number, rating: number, feedback?: string) {
    socketService.emit('chat:submit-survey', {
      chatId,
      rating,
      feedback: feedback || null
    })
  }

  function markMessagesAsRead(chatId: number) {
    socketService.emit('messages:mark-read', { chatId })
  }

  function openSurvey() {
    showSurvey.value = true
  }

  function closeSurvey() {
    showSurvey.value = false
    surveyChatId.value = null
  }

  function setReplyingTo(message: Message | null) {
    replyingToMessage.value = message
  }

  function clearReplyingTo() {
    replyingToMessage.value = null
  }

  function addMessage(message: Message) {
    const chatMessages = messages.value.get(message.chatId) || []
    if (!chatMessages.find((item) => item.id === message.id)) {
      chatMessages.push(message)
      chatMessages.sort((a, b) => {
        const at = new Date(a.timestamp).getTime()
        const bt = new Date(b.timestamp).getTime()
        if (at !== bt) return at - bt
        return a.id - b.id
      })
      messages.value.set(message.chatId, chatMessages)
    }

    const chat = chats.value.find((item) => item.id === message.chatId)
    if (chat) {
      chat.lastMessage = message.content
    }
  }

  function startTyping() {
    if (!currentChatId.value) return
    socketService.emit('typing:start', { chatId: currentChatId.value })
  }

  function stopTyping() {
    if (!currentChatId.value) return
    socketService.emit('typing:stop', { chatId: currentChatId.value })
  }

  function clearActiveClientChat() {
    if (currentChatId.value) {
      chats.value = chats.value.filter((chat) => chat.id !== currentChatId.value)
      messages.value.delete(currentChatId.value)
    }
    currentChatId.value = null
    typingUsers.value = new Set()
  }

  function forceRemoveChat(chatId: number) {
    chats.value = chats.value.filter((chat) => chat.id !== chatId)
    messages.value.delete(chatId)
    if (currentChatId.value === chatId) {
      currentChatId.value = null
    }
    typingUsers.value = new Set()
  }

  return {
    addOrUpdateChat,
    updateChatStatus,
    selectChat,
    getClientHistory,
    startChat,
    viewChat,
    clientSendMessage,
    clientEndChat,
    getPendingChats,
    assignChat,
    agentSendMessage,
    putChatOnHold,
    closeChat,
    resumeChat,
    getAgentChats,
    getAvailableAgents,
    getAllAgents,
    transferChat,
    getAgentHistory,
    submitSurvey,
    markMessagesAsRead,
    openSurvey,
    closeSurvey,
    setReplyingTo,
    clearReplyingTo,
    addMessage,
    startTyping,
    stopTyping,
    clearActiveClientChat,
    forceRemoveChat
  }
}
