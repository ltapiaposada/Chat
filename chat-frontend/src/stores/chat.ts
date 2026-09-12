import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import socketService from '@/services/socket'
import { useAuthStore } from './auth'
import { createCollaborationActions, registerCollaborationListeners } from './chatCollaboration'
import { createChatNotifications } from './chatNotifications'
import { createSupportActions, registerSupportListeners } from './chatSupport'
import type { Agent, Chat, DirectMessage, GroupChat, GroupMember, GroupMessage, Message, SupportDepartment } from './chatTypes'
export type {
  Agent,
  Chat,
  ChatStatus,
  DirectMessage,
  GroupChat,
  GroupMember,
  GroupMessage,
  Message,
  MessageStatus,
  SupportDepartment
} from './chatTypes'

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
  const departments = ref<SupportDepartment[]>([])
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

  // Group Chat State
  const groupChats = ref<GroupChat[]>([])
  const groupMessages = ref<Map<number, GroupMessage[]>>(new Map())
  const groupMembers = ref<Map<number, GroupMember[]>>(new Map())
  const currentGroupId = ref<number | null>(null)
  const groupUnreadCounts = ref<Map<number, number>>(new Map())
  const joinedGroupIds = new Set<number>()

  const {
    soundEnabled,
    soundByType,
    loadSoundPreference,
    setSoundEnabled,
    toggleSoundEnabled,
    setSoundTypeEnabled,
    toggleSoundType,
    ensureTitleListener,
    incrementUnseen,
    clearUnseen,
    updateTitle,
    incrementDmUnread,
    clearDmUnread,
    incrementGroupUnread,
    clearGroupUnread,
    playNotificationSound,
    unlockAudio,
    resetNotificationState
  } = createChatNotifications({
    directUnreadCounts,
    groupUnreadCounts,
    globalUnreadCount
  })

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

  const {
    addOrUpdateChat,
    updateChatStatus,
    selectChat,
    getClientHistory,
    getDepartments,
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
  } = createSupportActions({
    authStore,
    chats,
    pendingChats,
    messages,
    typingUsers,
    availableAgents,
    replyingToMessage,
    showSurvey,
    surveySubmitted,
    surveyChatId,
    currentChatId,
    clientChat,
    clearUnseen
  })

  // Socket connection
  function connectSocket() {
    ensureTitleListener()
    loadSoundPreference()
    const socket = socketService.connect()
    
    socket.on('connect', () => {
      isConnected.value = true
      // Authenticate after connection
      if (authStore.userId && authStore.role && authStore.token) {
        socketService.emit('authenticate', {
          token: authStore.token
        })
      }
    })

    socket.on('disconnect', () => {
      isConnected.value = false
    })

    socket.on('authenticated', (data: any) => {
      console.log('Autenticado:', data)
      
      // Cargar datos según el rol del usuario despu�s de autenticación
      if (authStore.isStaff) {
        // Cargar chats asignados al agente
        socketService.emit('agent:get-my-chats')
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
        socketService.emit('client:get-history')
        socketService.emit('client:get-departments')
      }
    })

    registerSupportListeners({
      socket,
      authStore,
      chats,
      pendingChats,
      messages,
      typingUsers,
      availableAgents,
      departments,
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
    })

    registerCollaborationListeners({
      socket,
      authStore,
      globalMessages,
      globalOnlineUsers,
      globalTypingUsers,
      isViewingGlobalChat,
      globalUnreadCount,
      directMessages,
      directTypingUsers,
      onlineAgentIds,
      currentDmThreadId,
      groupChats,
      groupMessages,
      groupMembers,
      currentGroupId,
      joinedGroupIds,
      playNotificationSound,
      incrementUnseen,
      incrementDmUnread,
      incrementGroupUnread,
      clearGroupUnread,
      addGroupChat
    })
  }

  function disconnectSocket() {
    socketService.disconnect()
    isConnected.value = false
  }

  const {
    clearGlobalUnread,
    setViewingGlobalChat,
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
    getGroupChats,
    createGroup,
    addGroupMembers,
    removeGroupMember,
    joinGroup,
    setActiveGroup,
    leaveGroup,
    sendGroupMessage
  } = createCollaborationActions({
    authStore,
    globalMessages,
    isInGlobalChat,
    isViewingGlobalChat,
    currentDmThreadId,
    currentGroupId,
    globalUnreadCount,
    clearDmUnread,
    clearGroupUnread,
    clearUnseen
  })

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

  // Reset state
  function reset() {
    currentChatId.value = null
    chats.value = []
    pendingChats.value = []
    messages.value = new Map()
    typingUsers.value = new Set()
    availableAgents.value = []
    departments.value = []
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
    currentDmThreadId.value = null
    // Group Chat state
    groupChats.value = []
    groupMessages.value = new Map()
    groupMembers.value = new Map()
    currentGroupId.value = null
    joinedGroupIds.clear()
    resetNotificationState()
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
    departments,
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
    getDepartments,
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
