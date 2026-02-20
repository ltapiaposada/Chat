<template>
  <div
    class="global-chat-container"
    @paste="handlePaste"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @dragover.prevent
    @drop="handleDrop"
  >
    <div v-if="isDragging" class="drop-overlay">
      Suelta para adjuntar
    </div>
    <!-- Agents sidebar -->
    <aside class="users-sidebar">
      <div class="sidebar-search">
        <input
          v-model="searchText"
          type="text"
          placeholder="Buscar agente..."
        />
      </div>
      <div v-if="unreadAgents.length > 0" class="unread-section">
        <div class="unread-title">No leídos</div>
        <div
          v-for="agent in unreadAgents"
          :key="agent.id"
          class="unread-item"
          @click="selectAgent(agent)"
        >
          <span class="unread-name">{{ agent.name }}</span>
          <span class="unread-badge">{{ getUnreadCount(agent.id) }}</span>
        </div>
      </div>

      <div class="users-list">
        <div
          v-for="agent in filteredAgents"
          :key="agent.id"
          class="user-item"
          :class="{
            'is-me': agent.id === authStore.userId,
            'is-offline': !agent.isOnline,
            selected: agent.id === selectedAgentId
          }"
          @click="selectAgent(agent)"
        >
          <div class="user-avatar agent" :class="{ offline: !agent.isOnline }">
            {{ getInitials(agent.name) }}
          </div>
          <div class="user-info">
            <span class="user-name">
              {{ agent.name }}
              <span v-if="agent.id === authStore.userId" class="me-tag">(Tú)</span>
            </span>
            <span class="user-status" :class="{ online: agent.isOnline }">
              {{ agent.isOnline ? 'En línea' : 'Desconectado' }}
            </span>
          </div>
          <span v-if="getUnreadCount(agent.id) > 0" class="unread-badge">
            {{ getUnreadCount(agent.id) }}
          </span>
          <span class="status-indicator" :class="{ online: agent.isOnline }"></span>
        </div>
      </div>
    </aside>

    <!-- Chat area -->
    <section class="chat-area">
      <div class="mensajes-container" ref="mensajesContainer" @paste="handlePaste">
        <div v-if="!selectedAgent" class="empty-chat">
          <span class="empty-icon"><HeroIcon name="chat-bubble-left-right" /></span>
          <h3>Conversaciones entre agentes</h3>
          <p>Selecciona un agente para iniciar una conversación privada</p>
        </div>

        <template v-else>
          <div class="chat-header">
            <div class="chat-title">
              <div class="user-avatar agent" :class="{ offline: !selectedAgent.isOnline }">
                {{ getInitials(selectedAgent.name) }}
              </div>
              <div>
                <h3>{{ selectedAgent.name }}</h3>
                <span class="header-status" :class="{ online: selectedAgent.isOnline }">
                  {{ selectedAgent.isOnline ? 'En línea' : 'Desconectado' }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-for="message in currentMessages"
            :key="message.id"
            class="message"
            :class="{ own: message.senderId === authStore.userId }"
          >
            <div class="message-avatar agent">
              {{ getInitials(message.senderName) }}
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="sender-name agent">
                  {{ message.senderId === authStore.userId ? 'Tú' : message.senderName }}
                </span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
              <div class="message-bubble">
                <p v-if="message.content && message.content.trim()">{{ message.content }}</p>
                <MessageAttachments
                  :entity-id="message.id"
                  :entity-type="'agent_dm'"
                  :optimistic-items="optimisticByMessageId[message.id]"
                />
              </div>
            </div>
          </div>

          <div v-if="currentTypingUsers.length > 0" class="typing-indicator">
            <span class="typing-dots">
              <span></span><span></span><span></span>
            </span>
            {{ formatTypingUsers() }}
          </div>
        </template>
      </div>

      <div v-if="selectedAgent" class="attachments-area">
        <ChatAttachments
          ref="attachmentsRef"
          :entity-id="attachmentTargetId"
          :entity-type="'agent_dm'"
          :defer-uploads="true"
          :show-existing="false"
          @queueChanged="queuedCount = $event"
        />
      </div>

      <!-- Input area -->
      <div v-if="selectedAgent" class="input-area" ref="inputAreaRef">
        <QuickPhrasePanel
          :visible="showQuickPanel"
          :phrases="filteredPhrases"
          :active-index="activePhraseIndex"
          @select="applyQuickPhrase"
          @add="openQuickPhraseModal"
        />
          <QuickPhraseModal
            :show="showQuickModal"
            :label="quickModalLabel"
            :text="quickModalText"
            @save="saveQuickPhrase"
            @close="closeQuickPhraseModal"
          />
          <div class="input-row primary">
            <textarea
              ref="inputElement"
              v-model="messageInput"
              class="message-input"
              rows="2"
              placeholder="Escribe un mensaje al agente..."
              @keydown="handleInputKeydown"
              @input="handleInputChange"
              @paste="handlePaste"
            ></textarea>
          <button
            class="mic-btn"
            type="button"
            :class="{ recording: attachmentsRef?.isRecording }"
            @click="attachmentsRef?.toggleRecording?.()"
          >
            <svg class="mic-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20h2v-2.08A7 7 0 0 0 19 11h-2Z"/>
            </svg>
          </button>
          <span
            v-if="attachmentsRef?.isRecording"
            class="record-timer"
            :class="{ limit: (attachmentsRef?.recordSeconds ?? 0) >= 60 }"
          >
            {{ attachmentsRef?.formattedRecordTime }}
          </span>
          <span v-if="attachmentsRef?.isRecording" class="record-label">
            {{ attachmentsRef?.recordLabel }}
          </span>
          <button
            class="send-btn"
            @click="sendMessage"
            :disabled="(!messageInput.trim() && queuedCount === 0)"
          >
            <span class="send-icon"><HeroIcon name="paper-airplane" /></span>
            Enviar
          </button>
        </div>
        <div class="input-row actions">
          <AiAssistMenu
            :disabled="!messageInput.trim()"
            :busy="aiBusy"
            @select="applyAi"
          />
          <div class="emoji-picker-wrapper" ref="emojiPickerWrapperRef">
              <button 
                class="emoji-btn" 
                @click="showEmojiPicker = !showEmojiPicker"
                type="button"
              >
                <HeroIcon name="face-smile" />
              </button>
            <div v-if="showEmojiPicker" class="emoji-picker">
              <EmojiMartPicker class="emoji-mart-panel" @select="insertEmoji" />
            </div>
          </div>
          <button class="attach-btn" type="button" @click="attachmentsRef?.openFilePicker?.()">
            <svg class="attach-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 12L13.5 19.5C11.015 21.985 6.985 21.985 4.5 19.5C2.015 17.015 2.015 12.985 4.5 10.5L12 3C13.657 1.343 16.343 1.343 18 3C19.657 4.657 19.657 7.343 18 9L10.5 16.5C9.672 17.328 8.328 17.328 7.5 16.5C6.672 15.672 6.672 14.328 7.5 13.5L14 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span v-if="attachmentsRef?.recordError" class="record-error">
            {{ attachmentsRef?.recordError }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import ChatAttachments from '@/components/chat/ChatAttachments.vue'
import MessageAttachments from '@/components/chat/MessageAttachments.vue'
import EmojiMartPicker from '@/components/chat/EmojiMartPicker.vue'
import QuickPhrasePanel from '@/components/chat/QuickPhrasePanel.vue'
import QuickPhraseModal from '@/components/chat/QuickPhraseModal.vue'
import AiAssistMenu from '@/components/chat/AiAssistMenu.vue'
import { useQuickPhrases, type QuickPhrase } from '@/composables/useQuickPhrases'
import { assistText } from '@/services/aiAssist'
import HeroIcon from '@/components/ui/HeroIcon.vue'

const authStore = useAuthStore()
const chatStore = useChatStore()

interface Agent {
  id: number
  name: string
  isOnline: boolean
}

const messageInput = ref('')
const mensajesContainer = ref<HTMLElement | null>(null)
const inputElement = ref<HTMLTextAreaElement | null>(null)
const showEmojiPicker = ref(false)
const showQuickPanel = ref(false)
const quickPhraseQuery = ref('')
const showQuickModal = ref(false)
const quickModalLabel = ref('')
const quickModalText = ref('')
const activePhraseIndex = ref(0)
const inputAreaRef = ref<HTMLElement | null>(null)
const emojiPickerWrapperRef = ref<HTMLElement | null>(null)
const { getFiltered, addPhrase } = useQuickPhrases()
const aiBusy = ref(false)
const allAgents = ref<Agent[]>([])
const selectedAgentId = ref<number | null>(null)
const searchText = ref('')
const attachmentsRef = ref<any>(null)
const queuedCount = ref(0)
const awaitingAttachmentMessage = ref(false)
const pendingEntityId = ref<number | null>(null)
const dragCounter = ref(0)
const isDragging = ref(false)
type OptimisticAttachment = {
  id: string
  url: string
  filename: string
  resource_type: string
  mime_type?: string
}
const pendingOptimistic = ref<OptimisticAttachment[]>([])
const optimisticByMessageId = ref<Record<number, OptimisticAttachment[]>>({})

const selectedAgent = computed(() => {
  return allAgents.value.find(a => a.id === selectedAgentId.value) || null
})

const sortedAgents = computed(() => {
  return [...allAgents.value].sort((a, b) => {
    if (a.id === authStore.userId) return -1
    if (b.id === authStore.userId) return 1
    if (a.isOnline && !b.isOnline) return -1
    if (!a.isOnline && b.isOnline) return 1
    return a.name.localeCompare(b.name)
  })
})

const filteredAgents = computed(() => {
  const query = searchText.value.trim().toLowerCase()
  if (!query) return sortedAgents.value
  return sortedAgents.value.filter(agent => agent.name.toLowerCase().includes(query))
})

const unreadAgents = computed(() => {
  return allAgents.value.filter(agent => getUnreadCount(agent.id) > 0)
})

const onlineCount = computed(() => {
  return allAgents.value.filter(a => a.isOnline).length
})

const filteredPhrases = computed(() => getFiltered(quickPhraseQuery.value))

const currentThreadId = computed(() => {
  if (!selectedAgentId.value || !authStore.userId) return null
  const min = Math.min(selectedAgentId.value, authStore.userId)
  const max = Math.max(selectedAgentId.value, authStore.userId)
  return `dm:${min}-${max}`
})

const currentMessages = computed(() => {
  if (!currentThreadId.value) return []
  return chatStore.directMessages.get(currentThreadId.value) || []
})

const currentTypingUsers = computed(() => {
  if (!currentThreadId.value) return []
  return chatStore.directTypingUsers.get(currentThreadId.value) || []
})

onMounted(() => {
  chatStore.getAllAgents()
  window.addEventListener('attachments:updated', handleAttachmentsUpdated as EventListener)
  document.addEventListener('mousedown', handleDocumentClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('attachments:updated', handleAttachmentsUpdated as EventListener)
  document.removeEventListener('mousedown', handleDocumentClick)
  if (selectedAgentId.value) {
    chatStore.stopDirectTyping(selectedAgentId.value)
  }
})

watch(() => chatStore.availableAgents, (agents) => {
  const agentMap = new Map<number, Agent>()
  if (authStore.userId && authStore.name) {
    agentMap.set(authStore.userId, {
      id: authStore.userId,
      name: authStore.name,
      isOnline: true
    })
  }
  if (agents && agents.length > 0) {
    agents.forEach(a => {
      agentMap.set(a.id, {
        id: a.id,
        name: a.name,
        isOnline: a.id === authStore.userId ? true : a.isOnline
      })
    })
  }
  allAgents.value = Array.from(agentMap.values())
}, { immediate: true, deep: true })

watch(
  () => chatStore.onlineAgentIds,
  (onlineIds) => {
    allAgents.value.forEach(agent => {
      if (agent.id === authStore.userId) {
        agent.isOnline = true
      } else {
        agent.isOnline = onlineIds.has(agent.id)
      }
    })
  },
  { deep: true }
)


function selectAgent(agent: Agent) {
  if (agent.id === authStore.userId) return
  selectedAgentId.value = agent.id
  chatStore.joinDirectThread(agent.id)
}

function getUnreadCount(agentId: number) {
  if (!authStore.userId || agentId === authStore.userId) return 0
  const min = Math.min(agentId, authStore.userId)
  const max = Math.max(agentId, authStore.userId)
  const threadId = `dm:${min}-${max}`
  return chatStore.directUnreadCounts.get(threadId) || 0
}

function sendMessage() {
  if (!selectedAgentId.value) return
  const content = messageInput.value.trim()
  if (!content && queuedCount.value === 0) return
  let placeholder = ''
  if (queuedCount.value > 0) {
    awaitingAttachmentMessage.value = true
    pendingOptimistic.value = attachmentsRef.value?.getQueuedPreviews?.() || []
    placeholder = pendingOptimistic.value.length > 0 ? 'Adjunto' : ''
  }
  chatStore.sendDirectMessage(selectedAgentId.value, content || placeholder)
  messageInput.value = ''
  showQuickPanel.value = false
  chatStore.stopDirectTyping(selectedAgentId.value)
}

let typingTimeout: number | null = null

function handleTyping() {
  if (!selectedAgentId.value) return
  chatStore.startDirectTyping(selectedAgentId.value)
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }
  typingTimeout = window.setTimeout(() => {
    if (selectedAgentId.value) chatStore.stopDirectTyping(selectedAgentId.value)
  }, 2000)
}

function handleInputChange() {
  handleTyping()
  updateQuickPhraseState()
}

async function applyAi(actionId: string) {
  const raw = messageInput.value
  const text = raw.trim()
  if (!text || aiBusy.value) return
  aiBusy.value = true
  try {
    const updated = await assistText(actionId, text)
    if (updated) {
      messageInput.value = updated
      await nextTick()
      inputElement.value?.focus()
      const end = messageInput.value.length
      inputElement.value?.setSelectionRange(end, end)
    }
  } catch (error) {
    console.error('Error del asistente IA:', error)
  } finally {
    aiBusy.value = false
  }
}

function getSlashQuery(value: string, cursorPos: number) {
  const before = value.slice(0, cursorPos)
  const slashIndex = before.lastIndexOf('/')
  if (slashIndex === -1) return null
  if (slashIndex > 0 && !/\s/.test(before.charAt(slashIndex - 1))) return null
  const query = before.slice(slashIndex + 1)
  if (query.includes(' ')) return null
  return query
}

function updateQuickPhraseState() {
  const input = inputElement.value
  const cursorPos = input?.selectionStart ?? messageInput.value.length
  const query = getSlashQuery(messageInput.value, cursorPos)
  if (query === null) {
    showQuickPanel.value = false
    quickPhraseQuery.value = ''
    return
  }
  quickPhraseQuery.value = query
  showQuickPanel.value = true
  if (filteredPhrases.value.length > 0) {
    activePhraseIndex.value = Math.min(activePhraseIndex.value, filteredPhrases.value.length - 1)
  } else {
    activePhraseIndex.value = 0
  }
}

function applyQuickPhrase(phrase: QuickPhrase) {
  const input = inputElement.value
  const cursorPos = input?.selectionStart ?? messageInput.value.length
  const before = messageInput.value.slice(0, cursorPos)
  const after = messageInput.value.slice(cursorPos)
  const slashIndex = before.lastIndexOf('/')
  if (slashIndex === -1) {
    messageInput.value = messageInput.value + phrase.text
  } else {
    messageInput.value = before.slice(0, slashIndex) + phrase.text + after
  }
  showQuickPanel.value = false
  nextTick(() => {
    if (!input) return
    const basePos = slashIndex === -1 ? before.length : slashIndex
    const newPos = basePos + phrase.text.length
    input.focus()
    input.setSelectionRange(newPos, newPos)
  })
}

function handleInputKeydown(event: KeyboardEvent) {
  if (showQuickPanel.value) {
    const list = filteredPhrases.value
    if (!list.length) {
      if (event.key === 'Escape') {
        showQuickPanel.value = false
        quickPhraseQuery.value = ''
        event.preventDefault()
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      activePhraseIndex.value = (activePhraseIndex.value + 1) % list.length
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      activePhraseIndex.value = (activePhraseIndex.value - 1 + list.length) % list.length
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const selected = list[activePhraseIndex.value]
      if (selected) applyQuickPhrase(selected)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      showQuickPanel.value = false
      quickPhraseQuery.value = ''
    }
    return
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

function openQuickPhraseModal() {
  quickModalLabel.value = quickPhraseQuery.value ? `/${quickPhraseQuery.value}` : ''
  quickModalText.value = messageInput.value
  showQuickPanel.value = false
  showQuickModal.value = true
}

function closeQuickPhraseModal() {
  showQuickModal.value = false
}

function saveQuickPhrase(data: { label: string; text: string }) {
  addPhrase(data.label, data.text)
  showQuickModal.value = false
  updateQuickPhraseState()
}

function handlePaste(event: ClipboardEvent) {
  attachmentsRef.value?.handlePaste?.(event)
}

function handleDrop(event: DragEvent) {
  attachmentsRef.value?.handleDrop?.(event)
  dragCounter.value = 0
  isDragging.value = false
}

function handleDragEnter() {
  dragCounter.value += 1
  isDragging.value = true
}

function handleDragLeave() {
  dragCounter.value = Math.max(0, dragCounter.value - 1)
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

function getInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase()
  }
  return (name.substring(0, 2) || 'U').toUpperCase()
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTypingUsers(): string {
  if (currentTypingUsers.value.length === 1) {
    return `${currentTypingUsers.value[0]} está escribiendo...`
  }
  if (currentTypingUsers.value.length > 1) {
    return `${currentTypingUsers.value.length} agentes están escribiendo...`
  }
  return ''
}

function insertEmoji(emoji: string) {
  const input = inputElement.value
  if (input) {
    const cursorPos = input.selectionStart || messageInput.value.length
    const textBefore = messageInput.value.substring(0, cursorPos)
    const textAfter = messageInput.value.substring(cursorPos)
    messageInput.value = textBefore + emoji + textAfter

    nextTick(() => {
      input.focus()
      const newPos = cursorPos + emoji.length
      input.setSelectionRange(newPos, newPos)
    })
  } else {
    messageInput.value += emoji
  }
}

const attachmentTargetId = computed(() => {
  if (pendingEntityId.value) return pendingEntityId.value
  if (messageInput.value.trim()) return null
  const mensajes = currentMessages.value
  for (let i = mensajes.length - 1; i >= 0; i -= 1) {
    const mensaje = mensajes[i]
    if (mensaje && mensaje.senderId === authStore.userId) return mensaje.id
  }
  return null
})

async function scrollToBottom() {
  await nextTick()
  if (mensajesContainer.value) {
    mensajesContainer.value.scrollTop = mensajesContainer.value.scrollHeight
  }
}

watch(() => currentMessages.value.length, scrollToBottom)

watch(
  () => currentMessages.value[currentMessages.value.length - 1],
  (message) => {
    if (!message) return
    if (awaitingAttachmentMessage.value && message.senderId === authStore.userId) {
      pendingEntityId.value = message.id
      if (pendingOptimistic.value.length > 0) {
        optimisticByMessageId.value = {
          ...optimisticByMessageId.value,
          [message.id]: pendingOptimistic.value
        }
        pendingOptimistic.value = []
      }
      awaitingAttachmentMessage.value = false
    }
  }
)

watch(queuedCount, (count) => {
  if (count === 0) {
    pendingEntityId.value = null
    pendingOptimistic.value = []
  }
})

function handleAttachmentsUpdated(event: Event) {
  const detail = (event as CustomEvent).detail as { entityId?: number; entityType?: string }
  if (!detail?.entityId) return
  if (detail.entityType && detail.entityType !== 'agent_dm') return
  if (!optimisticByMessageId.value[detail.entityId]) return
  const { [detail.entityId]: _removed, ...rest } = optimisticByMessageId.value
  optimisticByMessageId.value = rest
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  if (
    showEmojiPicker.value &&
    emojiPickerWrapperRef.value &&
    !emojiPickerWrapperRef.value.contains(target)
  ) {
    showEmojiPicker.value = false
  }
  if (!showQuickPanel.value) return
  if (inputAreaRef.value && !inputAreaRef.value.contains(target)) {
    showQuickPanel.value = false
    quickPhraseQuery.value = ''
  }
}
</script>

<style scoped>
.global-chat-container {
  display: flex;
  height: 100%;
  background: var(--color-bg);
  position: relative;
  gap: 0.75rem;
}

.drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(26, 35, 126, 0.12);
  border: 2px dashed var(--color-primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-primary);
  z-index: 20;
  pointer-events: none;
}

.users-sidebar {
  width: 260px;
  min-width: 260px;
  background: white;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  margin: 0.75rem 0 0.75rem 0.75rem;
}

.online-count {
  background: var(--color-success);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.sidebar-search {
  padding: 0.5rem 1rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-search input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.85rem;
}

.sidebar-search input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.sidebar-actions {
  padding: 0.5rem 1rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.sound-toggle {
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--color-border-strong);
  background: white;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-primary);
}

.sound-toggle:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary-border);
}

.unread-section {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.unread-title {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.unread-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
}

.unread-item:hover {
  background: var(--color-surface-muted);
}

.unread-name {
  font-size: 0.85rem;
  color: var(--color-text);
}

.users-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  margin-left: 0.75rem;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  transition: background 0.2s, border-color 0.2s;
  cursor: pointer;
  border: 1px solid transparent;
}

.user-item:hover {
  background: var(--color-surface-muted);
}

.user-item.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.user-item.is-me {
  background: var(--color-info-soft);
  cursor: default;
}

.user-avatar {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
}

.user-avatar.agent {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-2) 100%);
}

.user-avatar.agent.offline {
  background: #9e9e9e;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-item.is-offline .user-name {
  color: var(--color-text-subtle);
}

.me-tag {
  color: var(--color-info-dark);
  font-size: 0.75rem;
}

.user-status {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-subtle);
}

.user-status.online {
  color: var(--color-success);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #bdbdbd;
  flex-shrink: 0;
}

.unread-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--color-danger);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.status-indicator.online {
  background: var(--color-success);
}

.user-item.is-offline {
  opacity: 0.7;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0.75rem 0.75rem 0.75rem 0;
  background: transparent;
}

.mensajes-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.5rem 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-right: 0.75rem;
  margin-top: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(26, 35, 126, 0.5) transparent;
}

.mensajes-container::-webkit-scrollbar {
  width: 8px;
}

.mensajes-container::-webkit-scrollbar-track {
  background: transparent;
}

.mensajes-container::-webkit-scrollbar-thumb {
  background: rgba(26, 35, 126, 0.45);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-subtle);
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.5;
  margin-bottom: 1rem;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chat-title h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text);
}

.header-status {
  font-size: 0.75rem;
  color: var(--color-text-subtle);
}

.header-status.online {
  color: var(--color-success);
}

.message {
  display: flex;
  gap: 0.75rem;
  max-width: 70%;
}

.message.own {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
}

.message-avatar.agent {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-2) 100%);
}

.message-content {
  display: flex;
  flex-direction: column;
}

.message.own .message-content {
  align-items: flex-end;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  padding: 0 0.5rem;
}

.message.own .message-header {
  flex-direction: row-reverse;
}

.sender-name {
  font-size: 0.8rem;
  font-weight: 600;
}

.sender-name.agent {
  color: var(--color-primary);
}

.message-time {
  font-size: 0.7rem;
  color: var(--color-text-subtle);
}

.message-bubble {
  padding: 0.75rem 1rem;
  border-radius: 16px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message.own .message-bubble {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-2) 100%);
  color: white;
}

.message-bubble p {
  margin: 0;
  word-wrap: break-word;
  line-height: 1.4;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.typing-dots {
  display: flex;
  gap: 3px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: var(--color-text-subtle);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.attachments-area {
  padding: 0.5rem 1.5rem;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0 1rem 0.25rem 0;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  position: relative;
  overflow: visible;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.input-row.primary {
  width: 100%;
}

.input-row.actions {
  width: 100%;
}

.emoji-picker-wrapper {
  position: relative;
  overflow: visible;
  display: flex;
  align-items: center;
}

.attach-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border-strong);
  border-radius: 50%;
  background: white;
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.attach-btn:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary-border);
}

.attach-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.emoji-btn {
  padding: 0.75rem;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s;
  line-height: 1;
}

.emoji-btn:hover {
  background: var(--color-surface-muted-3);
}

.emoji-picker {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 0.5rem;
  z-index: 10;
  overflow: visible;
}

.emoji-picker :deep(em-emoji-picker) {
  width: 316px;
  max-width: 90vw;
}

.input-area .message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 24px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  line-height: 1.4;
  min-height: 44px;
  max-height: 140px;
  overflow-y: auto;
  resize: none;
}

.mic-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border-strong);
  border-radius: 50%;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.mic-btn.recording {
  background: var(--color-danger-soft);
  border-color: var(--color-danger-border);
}

.mic-icon {
  width: 20px;
  height: 20px;
  fill: var(--color-primary);
}

.mic-btn.recording .mic-icon {
  fill: var(--color-danger-dark);
}

.record-timer {
  font-size: 0.8rem;
  color: var(--color-text-soft);
  min-width: 44px;
}

.record-timer.limit {
  color: var(--color-danger-dark);
}

.record-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.record-error {
  font-size: 0.75rem;
  color: var(--color-danger-dark);
}

.input-area .message-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.send-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-2) 100%);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 35, 126, 0.3);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  font-size: 1rem;
}

@media (max-width: 768px) {
  .users-sidebar {
    display: none;
  }

  .message {
    max-width: 85%;
  }

  .input-area {
    padding: 0.75rem 1rem;
  }

  .send-btn {
    padding: 0.75rem 1rem;
  }

  .send-btn span:last-child {
    display: none;
  }
}
</style>








