import type { Ref } from 'vue'
import socketService from '@/services/socket'
import type { DirectMessage, GroupChat, GroupMember, GroupMessage } from './chatTypes'

type AuthLike = {
  userId: number | null
  name: string
}

export function registerCollaborationListeners(params: {
  socket: any
  authStore: AuthLike
  globalMessages: Ref<any[]>
  globalOnlineUsers: Ref<any[]>
  globalTypingUsers: Ref<string[]>
  isViewingGlobalChat: Ref<boolean>
  globalUnreadCount: Ref<number>
  directMessages: Ref<Map<string, DirectMessage[]>>
  directTypingUsers: Ref<Map<string, string[]>>
  onlineAgentIds: Ref<Set<number>>
  currentDmThreadId: Ref<string | null>
  groupChats: Ref<GroupChat[]>
  groupMessages: Ref<Map<number, GroupMessage[]>>
  groupMembers: Ref<Map<number, GroupMember[]>>
  currentGroupId: Ref<number | null>
  joinedGroupIds: Set<number>
  playNotificationSound: (type: 'global' | 'group' | 'dm') => void
  incrementUnseen: () => void
  incrementDmUnread: (threadId: string) => void
  incrementGroupUnread: (groupId: number) => void
  clearGroupUnread: (groupId: number) => void
  addGroupChat: (group: GroupChat) => void
}) {
  const {
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
  } = params

  socket.on('global:history', (messages: any[]) => {
    console.log('Historial global recibido:', messages.length, 'mensajes')
    globalMessages.value = messages
  })

  socket.on('global:message', (message: any) => {
    console.log('Mensaje global recibido:', message)
    if (!globalMessages.value.find((m) => m.id === message.id)) {
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
    console.log('👥 Actualización de usuarios global:', users)
    globalOnlineUsers.value = users
  })

  socket.on('global:typing', (data: { userName: string; isTyping: boolean }) => {
    if (data.isTyping && !globalTypingUsers.value.includes(data.userName)) {
      globalTypingUsers.value.push(data.userName)
    } else if (!data.isTyping) {
      globalTypingUsers.value = globalTypingUsers.value.filter((u) => u !== data.userName)
    }
  })

  socket.on('agent:online-users', (data: { userIds: number[] }) => {
    onlineAgentIds.value = new Set(data.userIds || [])
  })

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
    if (!existing.find((m) => m.id === message.id)) {
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
        current.filter((name) => name !== data.userName)
      )
    }
  })

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
    groupChats.value = groupChats.value.filter((g) => g.id !== gid)
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
    if (!existing.find((m) => m.id === message.id)) {
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

export function createCollaborationActions(params: {
  authStore: AuthLike
  globalMessages: Ref<any[]>
  isInGlobalChat: Ref<boolean>
  isViewingGlobalChat: Ref<boolean>
  currentDmThreadId: Ref<string | null>
  currentGroupId: Ref<number | null>
  globalUnreadCount: Ref<number>
  clearDmUnread: (threadId: string) => void
  clearGroupUnread: (groupId: number) => void
  clearUnseen: () => void
}) {
  const {
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
  } = params

  function clearGlobalUnread() {
    globalUnreadCount.value = 0
  }

  function setViewingGlobalChat(next: boolean) {
    isViewingGlobalChat.value = next
    if (next) {
      clearGlobalUnread()
      if (authStore.userId) {
        socketService.emit('global:mark-read')
      }
    }
  }

  function joinGlobalRoom() {
    console.log(' Uniéndose a la sala global...')
    isInGlobalChat.value = true
    socketService.emit('global:join')
  }

  function leaveGlobalRoom() {
    console.log(' Saliendo de la sala global...')
    isInGlobalChat.value = false
    socketService.emit('global:leave')
  }

  function sendGlobalMessage(content: string) {
    console.log(' Enviando mensaje global:', content.substring(0, 30))
    socketService.emit('global:message', { content })
  }

  function clearGlobalMessages() {
    globalMessages.value = []
  }

  function startGlobalTyping() {
    socketService.emit('global:typing', { isTyping: true })
  }

  function stopGlobalTyping() {
    socketService.emit('global:typing', { isTyping: false })
  }

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

  return {
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
  }
}
