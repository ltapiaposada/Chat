export type ChatStatus = 'pending' | 'active' | 'on_hold' | 'closed'
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface SupportDepartment {
  id: number
  name: string
  slug: string
}

export interface Chat {
  id: number
  clientId: number
  clientName?: string
  agentId: number | null
  agentName?: string
  status: ChatStatus
  channel?: 'web' | 'whatsapp'
  channelName?: string | null
  departmentId?: number | null
  departmentName?: string | null
  intention?: string | null
  subject?: string
  createdAt: Date
  assignedAt?: Date
  closedAt?: Date
  firstResponseAt?: Date
  lastCustomerMessageAt?: Date | null
  unreadCount: number
  lastMessage?: string
  rating?: number | null
  feedback?: string | null
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
