<template>
  <div
    class="dashboard-container"
    @paste="handlePaste"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @dragover.prevent
    @drop="handleDrop"
  >
    <div v-if="isDragging" class="drop-overlay">
      Suelta para adjuntar
    </div>
    <div class="dashboard-content">
      <!-- Chats sidebar -->
      <aside class="chats-sidebar">
        <div class="sidebar-header">
          <h3>Mis Conversaciones</h3>
          <div class="sidebar-actions">
            <UiTooltip :text="chatStore.soundEnabled ? 'Silenciar sonido' : 'Activar sonido'">
              <button
                class="sound-toggle"
                type="button"
                @click="chatStore.toggleSoundEnabled()"
              >
                <HeroIcon :name="chatStore.soundEnabled ? 'speaker-wave' : 'speaker-x-mark'" />
              </button>
            </UiTooltip>
            <span v-if="totalUnread > 0" class="unread-total">{{ totalUnread }}</span>
          </div>
        </div>

        <div v-if="chatStore.activeChats.length === 0" class="no-chats">
          <p>No tienes chats activos</p>
          <router-link to="/agent/pending" class="go-pending-btn">
            Ver pendientes
          </router-link>
        </div>

        <div v-else class="chats-list">
          <div
            v-for="chat in chatStore.activeChats"
            :key="chat.id"
            class="chat-item"
            :class="{ active: chat.id === chatStore.currentChatId, 'on-hold': chat.status === 'on_hold' }"
            @click="selectChat(chat.id)"
          >
            <div class="chat-item-header">
              <span
                class="client-name-text"
                :title="chat.clientName || `Cliente #${chat.clientId}`"
              >
                {{ chat.clientName || `Cliente #${chat.clientId}` }}
              </span>
              <span class="chat-meta-right">
                <span class="chat-badges">
                  <span v-if="chat.channel === 'whatsapp'" class="channel-badge">WhatsApp</span>
                  <span v-if="chat.unreadCount > 0 && chat.id !== chatStore.currentChatId" class="unread-badge">
                    {{ chat.unreadCount }}
                  </span>
                </span>
                <span class="chat-status" :class="chat.status">
                  {{ getStatusLabel(chat.status) }}
                </span>
              </span>
            </div>
            <p class="last-message">{{ chat.lastMessage || chat.subject || 'Sin mensajes' }}</p>
          </div>
        </div>
      </aside>

      <!-- Chat area -->
      <section class="chat-area">
        <div v-if="!chatStore.currentChatId" class="no-chat-selected">
          <span class="no-chat-icon"><HeroIcon name="chat-bubble-left-right" /></span>
          <h3>Selecciona una conversación</h3>
          <p>Elige un chat de la lista para comenzar</p>
        </div>

        <template v-else>
          <div class="chat-header">
            <div class="chat-info">
              <h2>{{ chatStore.currentChat?.clientName || `Cliente #${chatStore.currentChat?.clientId}` }}</h2>
              <span class="chat-subject">{{ chatStore.currentChat?.subject }}</span>
              <span v-if="chatStore.currentChat?.channel === 'whatsapp'" class="channel-badge header-badge">WhatsApp</span>
            </div>
            <div class="chat-controls">
              <button 
                class="transfer-btn"
                @click="openTransferModal"
              >
                <HeroIcon name="arrow-right-left" />
                Transferir
              </button>
              <button 
                v-if="chatStore.currentChat?.status === 'active'"
                class="hold-btn"
                @click="putOnHold"
              >
                <HeroIcon name="pause-circle" />
                En espera
              </button>
              <button 
                v-if="chatStore.currentChat?.status === 'on_hold'"
                class="resume-btn"
                @click="resumeChat"
              >
                <HeroIcon name="play-circle" />
                Reanudar
              </button>
              <button class="close-btn" @click="closeCurrentChat">
                <HeroIcon name="x-circle" />
                Cerrar
              </button>
            </div>
          </div>

          <div class="mensajes-container" ref="mensajesContainer" @paste="handlePaste">
            <div
              v-for="message in chatStore.currentMessages"
              :key="message.id"
              class="message"
              :class="{ own: message.senderRole === 'agent' }"
            >
              <!-- Avatar -->
              <div class="message-avatar" :class="message.senderRole" :title="message.senderRole === 'agent' ? (message.senderName || 'Agente') : (chatStore.currentChat?.clientName || 'Cliente')">
                {{ message.senderRole === 'agent' ? getInitials(message.senderName || authStore.name) : getInitials(chatStore.currentChat?.clientName) }}
              </div>
              <div class="message-content">
                <!-- Nombre del remitente -->
                <span class="sender-name" :class="message.senderRole">
                  {{ message.senderRole === 'agent' ? (message.senderName || 'Tú') : (chatStore.currentChat?.clientName || 'Cliente') }}
                </span>
                <div class="message-bubble">
                  <!-- Reply preview -->
                  <div v-if="message.replyToContent" class="reply-preview">
                    <span class="reply-label">{{ message.replyToSenderRole === 'agent' ? 'Agente' : 'Cliente' }}</span>
                    <p>{{ message.replyToContent }}</p>
                  </div>
                <p v-if="message.content && message.content.trim()">{{ message.content }}</p>
                  <MessageAttachments
                    :entity-id="message.id"
                    :entity-type="'chat'"
                    :optimistic-items="optimisticByMessageId[message.id]"
                  />
                  <div class="message-footer">
                    <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                    <button class="reply-btn" @click="replyToMessage(message)" title="Responder">
                      <svg class="reply-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 7L5 11L9 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M5 11H14C17.314 11 20 13.686 20 17V19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    <span v-if="message.senderRole === 'agent'" class="message-status" :class="message.status">
                      <span v-if="message.status === 'sent'">?</span>
                      <span v-else-if="message.status === 'delivered'">??</span>
                      <span v-else-if="message.status === 'read'" class="read">??</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="chatStore.typingUsers.size > 0" class="typing-indicator">
              El cliente está escribiendo...
            </div>
          </div>

          <!-- Reply indicator -->
          <div v-if="chatStore.replyingToMessage" class="replying-to-bar">
            <div class="replying-to-content">
              <span class="replying-to-label">Respondiendo a {{ chatStore.replyingToMessage.senderRole === 'agent' ? 'ti mismo' : 'cliente' }}:</span>
              <p>{{ chatStore.replyingToMessage.content }}</p>
            </div>
            <button class="cancel-reply-btn" @click="chatStore.clearReplyingTo()">
              <HeroIcon name="x-circle" />
            </button>
          </div>

          <div v-if="chatStore.currentChat?.status !== 'closed'" class="attachments-area">
            <ChatAttachments
              ref="attachmentsRef"
              :entity-id="attachmentTargetId"
              :defer-uploads="true"
              :show-existing="false"
              :audio-profile="chatStore.currentChat?.channel === 'whatsapp' ? 'whatsapp' : 'default'"
              @queueChanged="queuedCount = $event"
            />
          </div>

          <div class="input-area" ref="inputAreaRef" v-if="chatStore.currentChat?.status !== 'closed'">
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
                placeholder="Escribe tu respuesta..."
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
                :disabled="!messageInput.trim() && queuedCount === 0"
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
              <div class="emoji-picker-wrapper">
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
        </template>
      </section>
    </div>

    <!-- Transfer Modal -->
    <div v-if="showTransferModal" class="modal-overlay" @click.self="closeTransferModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3><HeroIcon name="arrow-right-left" /> Transferir Chat</h3>
          <button class="modal-close-btn" @click="closeTransferModal">
            <HeroIcon name="x-circle" />
          </button>
        </div>
        <div class="modal-body">
          <p>Selecciona el agente al que deseas transferir este chat:</p>
          <div v-if="chatStore.availableAgents.length === 0" class="no-agents">
            <p>No hay otros agentes disponibles</p>
          </div>
          <div v-else class="agents-list">
            <div
              v-for="agent in chatStore.availableAgents"
              :key="agent.id"
              class="agent-item"
              :class="{ selected: selectedAgentId === agent.id, online: agent.isOnline }"
              @click="selectedAgentId = agent.id"
            >
              <span class="agent-status">
                <HeroIcon :name="agent.isOnline ? 'check-circle' : 'x-circle'" />
              </span>
              <span class="agent-name">{{ agent.name }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeTransferModal">Cancelar</button>
          <button 
            class="confirm-btn" 
            @click="confirmTransfer"
            :disabled="!selectedAgentId"
          >
            Transferir
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore, type ChatStatus, type Message } from '@/stores/chat'
import ChatAttachments from '@/components/chat/ChatAttachments.vue'
import MessageAttachments from '@/components/chat/MessageAttachments.vue'
import EmojiMartPicker from '@/components/chat/EmojiMartPicker.vue'
import QuickPhrasePanel from '@/components/chat/QuickPhrasePanel.vue'
import QuickPhraseModal from '@/components/chat/QuickPhraseModal.vue'
import AiAssistMenu from '@/components/chat/AiAssistMenu.vue'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import UiTooltip from '@/components/ui/UiTooltip.vue'
import { useQuickPhrases, type QuickPhrase } from '@/composables/useQuickPhrases'
import { assistText } from '@/services/aiAssist'

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

const messageInput = ref('')
const mensajesContainer = ref<HTMLElement | null>(null)
const showEmojiPicker = ref(false)
const inputElement = ref<HTMLTextAreaElement | null>(null)
const showTransferModal = ref(false)
const selectedAgentId = ref<number | null>(null)
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
let typingTimeout: number | null = null
const showQuickPanel = ref(false)
const quickPhraseQuery = ref('')
const showQuickModal = ref(false)
const quickModalLabel = ref('')
const quickModalText = ref('')
const activePhraseIndex = ref(0)
const inputAreaRef = ref<HTMLElement | null>(null)
const { getFiltered, addPhrase } = useQuickPhrases()
const aiBusy = ref(false)

const filteredPhrases = computed(() => getFiltered(quickPhraseQuery.value))

const totalUnread = computed(() => {
  return chatStore.activeChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)
})

function getAttachmentPlaceholder(items: OptimisticAttachment[]) {
  if (!items || items.length === 0) return ''
  const hasAudio = items.some(i => (i.mime_type || '').startsWith('audio/'))
  return hasAudio ? '' : 'Adjunto'
}

function selectChat(chatId: number) {
  chatStore.selectChat(chatId)
}

function sendMessage() {
  const content = messageInput.value.trim()
  if (!content && queuedCount.value === 0) return
  let placeholder = ''
  const replyId = chatStore.replyingToMessage?.id
  if (queuedCount.value > 0) {
    awaitingAttachmentMessage.value = true
    pendingOptimistic.value = attachmentsRef.value?.getQueuedPreviews?.() || []
    placeholder = getAttachmentPlaceholder(pendingOptimistic.value)
  }
  chatStore.agentSendMessage(content || placeholder, replyId, queuedCount.value > 0)
  messageInput.value = ''
  showQuickPanel.value = false
  chatStore.stopTyping()
}


function handleTyping() {
  chatStore.startTyping()
  
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }
  
  typingTimeout = window.setTimeout(() => {
    chatStore.stopTyping()
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
  if (slashIndex > 0 && !/\s/.test(before[slashIndex - 1])) return null
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
      applyQuickPhrase(list[activePhraseIndex.value])
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

function putOnHold() {
  if (chatStore.currentChatId) {
    chatStore.putChatOnHold(chatStore.currentChatId)
  }
}

function resumeChat() {
  if (chatStore.currentChatId) {
    chatStore.resumeChat(chatStore.currentChatId)
  }
}

function closeCurrentChat() {
  if (chatStore.currentChatId && confirm('¿Estás seguro de que deseas cerrar este chat?')) {
    chatStore.closeChat(chatStore.currentChatId)
  }
}

function openTransferModal() {
  chatStore.getAvailableAgents()
  selectedAgentId.value = null
  showTransferModal.value = true
}

function closeTransferModal() {
  showTransferModal.value = false
  selectedAgentId.value = null
}

function confirmTransfer() {
  if (chatStore.currentChatId && selectedAgentId.value) {
    chatStore.transferChat(chatStore.currentChatId, selectedAgentId.value)
    closeTransferModal()
  }
}

function replyToMessage(message: Message) {
  chatStore.setReplyingTo(message)
  inputElement.value?.focus()
}

function getStatusLabel(status: ChatStatus): string {
  const labels: Record<ChatStatus, string> = {
    pending: 'Pendiente',
    active: 'Activo',
    on_hold: 'En espera',
    closed: 'Cerrado'
  }
  return labels[status]
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const attachmentTargetId = computed(() => {
  if (awaitingAttachmentMessage.value) return null
  if (pendingEntityId.value) return pendingEntityId.value
  if (messageInput.value.trim()) return null
  if (chatStore.replyingToMessage?.id) return chatStore.replyingToMessage.id
  const mensajes = chatStore.currentMessages
  for (let i = mensajes.length - 1; i >= 0; i -= 1) {
    if (mensajes[i].senderRole === 'agent') return mensajes[i].id
  }
  return null
})

// Obtener iniciales del nombre para el avatar
function getInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase()
  }
  return (name.substring(0, 2) || 'U').toUpperCase()
}

function insertEmoji(emoji: string) {
  const input = inputElement.value
  if (input) {
    const cursorPos = input.selectionStart || messageInput.value.length
    const textBefore = messageInput.value.substring(0, cursorPos)
    const textAfter = messageInput.value.substring(cursorPos)
    messageInput.value = textBefore + emoji + textAfter
    
    // Move cursor after emoji
    nextTick(() => {
      input.focus()
      const newPos = cursorPos + emoji.length
      input.setSelectionRange(newPos, newPos)
    })
  } else {
    messageInput.value += emoji
  }
  showEmojiPicker.value = false
}

onMounted(() => {
  window.addEventListener('attachments:updated', handleAttachmentsUpdated as EventListener)
  document.addEventListener('mousedown', handleDocumentClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('attachments:updated', handleAttachmentsUpdated as EventListener)
  document.removeEventListener('mousedown', handleDocumentClick)
})

// Auto-scroll to bottom
watch(() => chatStore.currentMessages.length, async () => {
  await nextTick()
  if (mensajesContainer.value) {
    mensajesContainer.value.scrollTop = mensajesContainer.value.scrollHeight
  }
})

watch(
  () => chatStore.currentMessages[chatStore.currentMessages.length - 1],
  (message) => {
    if (!message) return
    if (awaitingAttachmentMessage.value && message.senderRole === 'agent') {
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
  if (detail.entityType && detail.entityType !== 'chat') return
  if (!optimisticByMessageId.value[detail.entityId]) return
  const { [detail.entityId]: _removed, ...rest } = optimisticByMessageId.value
  optimisticByMessageId.value = rest
}

function handleDocumentClick(event: MouseEvent) {
  if (!showQuickPanel.value) return
  const target = event.target as Node
  if (inputAreaRef.value && !inputAreaRef.value.contains(target)) {
    showQuickPanel.value = false
    quickPhraseQuery.value = ''
  }
}
</script>

<style scoped>
.dashboard-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
  position: relative;
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

.dashboard-content {
  flex: 1;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 0.75rem;
  overflow: hidden;
  padding: 0.75rem 0.75rem 0.75rem 0.75rem;
}

.channel-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 0.4rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.2px;
  background: var(--color-info-soft-2);
  color: var(--color-info-strong);
  border: 1px solid var(--color-info-border);
}

.header-badge {
  margin-left: 0;
  margin-top: 0.35rem;
}

.chats-sidebar {
  background: white;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1rem;
}

.sidebar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sound-toggle {
  border: 1px solid var(--color-border-strong);
  background: white;
  color: var(--color-primary);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 0.85rem;
  cursor: pointer;
}

.sound-toggle:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary-border);
}

.unread-total {
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

.no-chats {
  padding: 2rem 1rem;
  text-align: center;
}

.no-chats p {
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

.go-pending-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
}

.chats-list {
  flex: 1;
  overflow-y: auto;
}

.chat-item {
  padding: 1rem;
  border-bottom: 1px solid var(--color-surface-muted-3);
  cursor: pointer;
  transition: background 0.2s;
}

.chat-item:hover {
  background: var(--color-surface-muted);
}

.chat-item.active {
  background: var(--color-primary-tint);
  border-left: 3px solid var(--color-primary);
}

.chat-item.on-hold {
  opacity: 0.7;
}

.chat-item-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.client-name-text {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-badges {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.chat-meta-right {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
  white-space: nowrap;
}

.unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--color-danger);
  color: white;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  margin-left: 0.4rem;
}

.chat-status {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.chat-status.active {
  background: #e8f5e9;
  color: var(--color-success-dark);
}

.chat-status.on_hold {
  background: var(--color-warning-soft);
  color: var(--color-warning-dark);
}

.last-message {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.no-chat-selected {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.no-chat-icon {
  font-size: 4rem;
  opacity: 0.5;
}

.no-chat-selected h3 {
  margin: 1rem 0 0.5rem;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid var(--color-border);
}

.chat-info h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text);
}

.chat-subject {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.chat-controls {
  display: flex;
  gap: 0.5rem;
}

.hold-btn, .resume-btn, .close-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-soft);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.8rem;
}

.hold-btn:hover {
  background: var(--color-warning-soft);
  border-color: var(--color-warning);
}

.resume-btn:hover {
  background: #e8f5e9;
  border-color: var(--color-success);
}

.close-btn:hover {
  background: var(--color-danger-soft);
  border-color: var(--color-danger);
}

.mensajes-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.message.own {
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

.message-avatar.client {
  background: var(--gradient-primary);
}

.message-avatar.agent {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-2) 100%);
}

.message-content {
  display: flex;
  flex-direction: column;
  max-width: calc(100% - 52px);
}

.message.own .message-content {
  align-items: flex-end;
}

.sender-name {
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  margin-left: 0.5rem;
}

.sender-name.client {
  color: var(--color-primary);
}

.sender-name.agent {
  color: var(--color-primary);
}

.message.own .sender-name {
  margin-left: 0;
  margin-right: 0.5rem;
}

.message-bubble {
  max-width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message.own .message-bubble {
  background: var(--color-primary);
  color: white;
}

.message-bubble p {
  margin: 0;
  word-wrap: break-word;
}

.message-time {
  display: inline-flex;
  align-items: center;
  font-size: 0.65rem;
  opacity: 0.45;
  margin-top: 0.25rem;
  text-align: right;
  line-height: 1;
}
.message.own .message-time {
  color: var(--color-text-on-dark);
  opacity: 0.75;
}

.typing-indicator {
  padding: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border-top: 1px solid var(--color-border);
  position: relative;
  overflow: visible;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-row.primary {
  width: 100%;
}

.input-row.actions {
  width: 100%;
}

.attachments-area {
  padding: 0.5rem 1rem;
  background: white;
}

.emoji-picker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.attach-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  background: white;
  color: var(--color-primary);
  font-size: 0.8rem;
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

.attach-label {
  font-weight: 600;
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
}

.emoji-picker :deep(em-emoji-picker) {
  width: 316px;
  max-width: 90vw;
}

.input-area .message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border-soft);
  border-radius: 8px;
  font-size: 1rem;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 35, 126, 0.3);
}

/* Transfer button */
.transfer-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-info);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--color-info);
}

@media (max-width: 768px) {
  .input-row.primary {
    width: 100%;
  }

  .input-row.actions {
    width: 100%;
  }
}

.transfer-btn:hover {
  background: var(--color-info-soft);
}

/* Reply styles */
.reply-preview {
  background: rgba(0, 0, 0, 0.05);
  border-left: 3px solid var(--color-primary);
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.message.own .reply-preview {
  background: rgba(255, 255, 255, 0.15);
  border-left-color: rgba(255, 255, 255, 0.5);
}

.reply-preview .reply-label {
  font-weight: 600;
  font-size: 0.7rem;
  display: block;
  margin-bottom: 0.25rem;
}

.reply-preview p {
  margin: 0;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.message-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 0.25rem;
  gap: 0.25rem;
}

.reply-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  opacity: 0.5;
  padding: 0.25rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.reply-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

.message.own .reply-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}
.message.own .reply-btn {
  color: #ffffff;
  opacity: 0.8;
}

.reply-icon {
  width: 16px;
  height: 16px;
}

/* Replying to bar */
.replying-to-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-info-soft);
  border-left: 3px solid var(--color-primary);
}

.replying-to-content {
  flex: 1;
  overflow: hidden;
}

.replying-to-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
}

.replying-to-content p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cancel-reply-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 0.25rem 0.5rem;
}

.cancel-reply-btn:hover {
  color: var(--color-text);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--color-text-muted);
}

.modal-body {
  padding: 1.5rem;
}

.modal-body > p {
  margin: 0 0 1rem;
  color: var(--color-text-muted);
}

.no-agents {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-subtle);
}

.agents-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.agent-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.agent-item:hover {
  background: var(--color-surface-muted);
}

.agent-item.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}

.agent-status {
  font-size: 0.75rem;
}

.agent-name {
  font-weight: 500;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
}

.cancel-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border-soft);
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.confirm-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Message Status Icons */
.message-status {
  font-size: 0.65rem;
  margin-left: 0.25rem;
  color: rgba(255, 255, 255, 0.4);
  display: inline-flex;
  align-items: center;
  line-height: 1;
}
.message.own .message-status {
  color: var(--color-text-on-dark);
  opacity: 0.75;
}

.message-status .read {
  color: var(--color-accent);
}

.message:not(.own) .message-status {
  color: rgba(0, 0, 0, 0.3);
}

.message:not(.own) .message-status .read {
  color: var(--color-info-dark);
}
</style>









