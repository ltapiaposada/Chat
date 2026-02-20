<template>
  <div
    class="client-container"
    @paste="handlePaste"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @dragover.prevent
    @drop="handleDrop"
  >
    <div v-if="isDragging" class="drop-overlay">
      Suelta para adjuntar
    </div>
    <header class="client-header">
      <div class="header-info">
        <h1><HeroIcon name="chat-bubble-left-right" /> Soporte</h1>
        <span class="status-badge" :class="connectionStatus">
          {{ connectionText }}
        </span>
      </div>
      <div class="header-actions">
        <UiTooltip :text="chatStore.soundEnabled ? 'Silenciar sonido' : 'Activar sonido'">
          <button
            class="sound-toggle"
            type="button"
            @click="chatStore.toggleSoundEnabled()"
          >
            <HeroIcon :name="chatStore.soundEnabled ? 'speaker-wave' : 'speaker-x-mark'" />
          </button>
        </UiTooltip>
        <button class="logout-btn" @click="handleLogout">
          Salir
        </button>
      </div>
    </header>

    <main class="chat-area">
      <!-- No active chat - show options -->
      <div v-if="!chatStore.clientChat && !viewingHistory" class="start-chat-prompt">
        <div class="prompt-content">
          <span class="prompt-icon"><HeroIcon name="clipboard-document-list" /></span>
          <h2>¡Hola {{ authStore.name }}!</h2>
          <p>¿En qué podemos ayudarte hoy?</p>
          
          <div class="subject-input">
            <input
              v-model="subject"
              type="text"
              placeholder="Describe brevemente tu consulta..."
              @keypress.enter="startNewChat"
            />
          </div>
          
          <button class="start-btn" @click="startNewChat" :disabled="!subject.trim()">
            Iniciar conversación
          </button>

          <!-- Chat History Section -->
          <div v-if="chatStore.clientChatHistory.length > 0" class="history-section">
            <h3><HeroIcon name="document-text" /> Conversaciones anteriores</h3>
            <div class="history-list">
              <div 
                v-for="chat in chatStore.clientChatHistory" 
                :key="chat.id" 
                class="history-item"
                @click="viewHistoryChat(chat.id)"
              >
                <div class="history-item-header">
                  <span class="history-subject">{{ chat.subject || 'Soporte' }}</span>
                  <span class="history-date">{{ formatDate(chat.createdAt) }}</span>
                </div>
                <p class="history-preview">{{ chat.lastMessage || 'Sin mensajes' }}</p>
                <span class="history-agent" v-if="chat.agentName">
                  Atendido por: {{ chat.agentName }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Viewing history chat -->
      <div v-else-if="viewingHistory" class="chat-content history-view">
        <div class="chat-status-bar history-bar">
          <button class="back-btn" @click="closeHistoryView">Volver</button>
          <span><HeroIcon name="document-text" /> Conversación del {{ formatDate(historyChat?.createdAt) }}</span>
        </div>

        <div class="messages-container" ref="messagesContainer" @paste="handlePaste">
          <div
            v-for="message in chatStore.currentMessages"
            :key="message.id"
            class="message"
            :class="{ own: message.senderRole === 'client' }"
          >
            <!-- Avatar -->
            <div class="message-avatar" :class="message.senderRole" :title="message.senderRole === 'agent' ? (message.senderName || 'Agente') : authStore.name">
              {{ message.senderRole === 'agent' ? getInitials(message.senderName) : getInitials(authStore.name) }}
            </div>
            <div class="message-content">
              <!-- Nombre -->
              <span class="sender-name" :class="message.senderRole">
                {{ message.senderRole === 'agent' ? (message.senderName || 'Agente') : 'Tú' }}
              </span>
              <div class="message-bubble">
                <p v-if="message.content && message.content.trim()">{{ message.content }}</p>
                <MessageAttachments
                  :entity-id="message.id"
                  :entity-type="'chat'"
                  :optimistic-items="optimisticByMessageId[message.id]"
                />
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="history-footer">
          <p>Esta conversación ha finalizado</p>
          <button class="new-chat-btn" @click="closeHistoryView">
            Iniciar nueva conversación
          </button>
        </div>
      </div>

      <!-- Active chat -->
      <div v-else class="chat-content">
        <div class="chat-status-bar">
          <div class="status-line">
            <span v-if="chatStore.clientChat?.status === 'pending'" class="pending-status">
              <HeroIcon name="clock" /> Esperando a un agente...
            </span>
            <span v-else-if="chatStore.clientChat?.status === 'active'" class="active-status">
              <HeroIcon name="check-circle" /> Conectado con {{ chatStore.clientChat?.agentName || 'un agente' }}
            </span>
            <span v-else-if="chatStore.clientChat?.status === 'on_hold'" class="hold-status">
              <HeroIcon name="pause-circle" /> Chat en espera
            </span>
            <span v-else-if="chatStore.clientChat?.status === 'closed'" class="closed-status">
              <HeroIcon name="x-circle" /> Chat finalizado
            </span>
          </div>
          <div v-if="chatStore.clientChat?.subject" class="chat-subject-display">
            <HeroIcon name="document-text" /> {{ chatStore.clientChat.subject }}
          </div>
        </div>

        <div class="messages-container" ref="messagesContainer" @paste="handlePaste">
          <div
            v-for="message in chatStore.currentMessages"
            :key="message.id"
            class="message"
            :class="{ own: message.senderRole === 'client' }"
          >
            <!-- Avatar -->
            <div class="message-avatar" :class="message.senderRole" :title="message.senderRole === 'agent' ? (message.senderName || 'Agente') : authStore.name">
              {{ message.senderRole === 'agent' ? getInitials(message.senderName) : getInitials(authStore.name) }}
            </div>
            <div class="message-content">
              <!-- Nombre -->
              <span class="sender-name" :class="message.senderRole">
                {{ message.senderRole === 'agent' ? (message.senderName || 'Agente') : 'Tú' }}
              </span>
              <div class="message-bubble">
                <!-- Reply preview -->
                <div v-if="message.replyToContent" class="reply-preview">
                  <span class="reply-label">{{ message.replyToSenderRole === 'client' ? 'Tú' : 'Agente' }}</span>
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
                  <button 
                    v-if="chatStore.clientChat?.status === 'active'"
                    class="reply-btn" 
                    @click="replyToMessage(message)"
                    title="Responder"
                  >
                    <svg class="reply-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 7L5 11L9 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M5 11H14C17.314 11 20 13.686 20 17V19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <span v-if="message.senderRole === 'client'" class="message-status" :class="message.status">
                    <span v-if="message.status === 'sent'">✓</span>
                    <span v-else-if="message.status === 'delivered'">✓✓</span>
                    <span v-else-if="message.status === 'read'" class="read">✓✓</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="chatStore.typingUsers.size > 0" class="typing-indicator">
            <span class="typing-dots"></span>
            El agente está escribiendo...
          </div>
        </div>

        <!-- Reply indicator -->
        <div v-if="chatStore.replyingToMessage" class="replying-to-bar">
          <div class="replying-to-content">
            <span class="replying-to-label">Respondiendo a {{ chatStore.replyingToMessage.senderRole === 'client' ? 'ti mismo' : 'agente' }}:</span>
            <p>{{ chatStore.replyingToMessage.content }}</p>
          </div>
          <button class="cancel-reply-btn" @click="chatStore.clearReplyingTo()">
            <HeroIcon name="x-circle" />
          </button>
        </div>

        <div v-if="chatStore.clientChat?.status !== 'closed'" class="attachments-area">
          <ChatAttachments
            ref="attachmentsRef"
            :entity-id="attachmentTargetId"
            :defer-uploads="true"
            :show-existing="false"
            @queueChanged="queuedCount = $event"
          />
        </div>

        <div class="input-area" v-if="chatStore.clientChat?.status !== 'closed'">
          <div class="input-row primary">
            <textarea
              ref="inputElement"
              v-model="messageInput"
              class="message-input"
              rows="2"
              placeholder="Escribe tu mensaje..."
              @keydown="handleInputKeydown"
              @input="handleTyping"
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
              v-if="!attachmentsRef?.isRecording"
              class="send-btn" 
              @click="sendMessage"
              :disabled="!messageInput.trim() && queuedCount === 0"
            >
              Enviar
            </button>
          </div>
          <div class="input-row actions">
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
              <HeroIcon name="paper-clip" class="attach-icon" />
            </button>
            <span v-if="attachmentsRef?.recordError" class="record-error">
              {{ attachmentsRef?.recordError }}
            </span>
          </div>
        </div>

        <div class="chat-actions" v-if="chatStore.clientChat?.status !== 'closed'">
          <button class="end-chat-btn" @click="endChat">
            Finalizar conversación
          </button>
        </div>

        <div v-else class="chat-ended-actions">
          <p>Esta conversación ha finalizado</p>
          <div class="ended-actions-buttons">
            <button class="back-to-home-btn" @click="clearClosedChat">
              Volver al inicio
            </button>
            <button class="new-chat-btn" @click="startNewChatAfterClosed">
              Iniciar nueva conversación
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Satisfaction Survey -->
    <SatisfactionSurvey
      :show="chatStore.showSurvey"
      :chat-id="chatStore.surveyChatId ?? 0"
      @close="chatStore.closeSurvey()"
      @submit="handleSurveySubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore, type Message } from '@/stores/chat'
import ChatAttachments from '@/components/chat/ChatAttachments.vue'
import MessageAttachments from '@/components/chat/MessageAttachments.vue'
import SatisfactionSurvey from '@/components/SatisfactionSurvey.vue'
import EmojiMartPicker from '@/components/chat/EmojiMartPicker.vue'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import UiTooltip from '@/components/ui/UiTooltip.vue'

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

const subject = ref('')
const messageInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const viewingHistory = ref(false)
const historyChat = ref<any>(null)
const showEmojiPicker = ref(false)
const emojiPickerWrapperRef = ref<HTMLElement | null>(null)
const inputElement = ref<HTMLTextAreaElement | null>(null)
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

function getAttachmentPlaceholder(items: OptimisticAttachment[]) {
  if (!items || items.length === 0) return ''
  const hasAudio = items.some(i => (i.mime_type || '').startsWith('audio/'))
  return hasAudio ? '' : 'Adjunto'
}

const connectionStatus = computed(() => {
  if (!chatStore.isConnected) return 'disconnected'
  if (chatStore.clientChat?.status === 'active') return 'connected'
  return 'waiting'
})

const connectionText = computed(() => {
  if (!chatStore.isConnected) return 'Desconectado'
  if (chatStore.clientChat?.status === 'active') return 'Conectado'
  return 'En espera'
})


onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/')
    return
  }
  
  // Load chat history
  chatStore.getClientHistory()
  
  // If there's an existing active chat (not closed), select it
  if (chatStore.clientChat && chatStore.clientChat.status !== 'closed') {
    chatStore.selectChat(chatStore.clientChat.id)
  }
  window.addEventListener('attachments:updated', handleAttachmentsUpdated as EventListener)
  document.addEventListener('mousedown', handleDocumentClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('attachments:updated', handleAttachmentsUpdated as EventListener)
  document.removeEventListener('mousedown', handleDocumentClick)
})

function startNewChat() {
  if (!subject.value.trim()) return
  chatStore.startChat(subject.value)
  subject.value = ''
}

function startNewChatAfterClosed() {
  // Clear only the active chat, keep history
  chatStore.clearActiveClientChat()
  chatStore.getClientHistory()
  subject.value = ''
}

function clearClosedChat() {
  // Just clear the current view without starting a new chat
  chatStore.clearActiveClientChat()
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
}

function viewHistoryChat(chatId: number) {
  const chat = chatStore.clientChatHistory.find(c => c.id === chatId)
  if (chat) {
    historyChat.value = chat
    viewingHistory.value = true
    chatStore.viewChat(chatId)
  }
}

function closeHistoryView() {
  viewingHistory.value = false
  historyChat.value = null
  chatStore.currentChatId = null
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
  chatStore.clientSendMessage(content || placeholder, replyId, queuedCount.value > 0)
  messageInput.value = ''
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

function handleInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
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

function endChat() {
  if (confirm('¿Estás seguro de que deseas finalizar la conversación?')) {
    chatStore.clientEndChat()
    // La limpieza se maneja en el listener de 'chat:ended' en el store
  }
}

function replyToMessage(message: Message) {
  chatStore.setReplyingTo(message)
  inputElement.value?.focus()
}

function handleSurveySubmit(rating: number, feedback: string) {
  if (chatStore.surveyChatId) {
    chatStore.submitSurvey(chatStore.surveyChatId, rating, feedback)
    chatStore.closeSurvey()
  }
}

function handleLogout() {
  if (confirm('¿Estás seguro de que deseas salir?')) {
    chatStore.disconnectSocket()
    chatStore.reset()
    authStore.logout()
    router.push('/')
  }
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDate(date: Date): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const attachmentTargetId = computed(() => {
  if (awaitingAttachmentMessage.value) return null
  if (pendingEntityId.value) return pendingEntityId.value
  if (messageInput.value.trim()) return null
  if (chatStore.replyingToMessage?.id) return chatStore.replyingToMessage.id
  const messages = chatStore.currentMessages
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message && message.senderRole === 'client') return message.id
  }
  return null
})

// Obtener iniciales del nombre para el avatar
function getInitials(name?: string): string {
  if (!name) return 'A'
  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase()
  }
  return (name.substring(0, 2) || 'A').toUpperCase()
}

// Auto-scroll to bottom
watch(() => chatStore.currentMessages.length, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
})

watch(
  () => chatStore.currentMessages[chatStore.currentMessages.length - 1],
  (message) => {
    if (!message) return
    if (awaitingAttachmentMessage.value && message.senderRole === 'client') {
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
  const target = event.target as Node
  if (
    showEmojiPicker.value &&
    emojiPickerWrapperRef.value &&
    !emojiPickerWrapperRef.value.contains(target)
  ) {
    showEmojiPicker.value = false
  }
}

</script>

<style scoped>
.client-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
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

.client-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--gradient-primary);
  color: white;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-info h1 {
  margin: 0;
  font-size: 1.25rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.2);
}

.status-badge.connected {
  background: rgba(76, 175, 80, 0.3);
}

.status-badge.disconnected {
  background: rgba(244, 67, 54, 0.3);
}

.logout-btn {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  background: transparent;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sound-toggle {
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: transparent;
  color: white;
  border-radius: 50%;
  width: 34px;
  height: 34px;
  padding: 0;
  cursor: pointer;
}

.sound-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

.start-chat-prompt {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.prompt-content {
  text-align: center;
  background: white;
  padding: 3rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.prompt-icon {
  font-size: 4rem;
}

.prompt-content h2 {
  margin: 1rem 0 0.5rem;
  color: var(--color-text);
}

.prompt-content p {
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
}

.subject-input input {
  width: 100%;
  max-width: 350px;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.subject-input input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.start-btn {
  padding: 0.875rem 2rem;
  border: none;
  border-radius: 8px;
  background: var(--gradient-primary);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.start-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.start-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.chat-status-bar {
  padding: 0.75rem 1rem;
  background: var(--color-surface-muted-2);
  border-bottom: 1px solid var(--color-border);
  text-align: center;
  font-size: 0.875rem;
}


.status-line {
  margin-bottom: 0.25rem;
}

.chat-subject-display {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 500;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e8e8e8;
}

.pending-status { color: var(--color-warning); }
.active-status { color: var(--color-success); }
.hold-status { color: #9e9e9e; }
.closed-status { color: var(--color-danger); }

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
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

.message-avatar.agent {
  background: var(--gradient-primary);
}

.message-avatar.client {
  background: linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%);
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

.sender-name.agent {
  color: var(--color-primary);
}

.sender-name.client {
  color: var(--color-success);
}

.message.own .sender-name {
  margin-left: 0;
  margin-right: 0.5rem;
}

.message-bubble {
  max-width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  background: var(--color-surface-muted-3);
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
  font-size: 0.7rem;
  opacity: 0.5;
  margin-top: 0.25rem;
  text-align: right;
  line-height: 1;
}
.message.own .message-time {
  color: var(--color-text-on-dark);
  opacity: 0.75;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--color-border);
  position: relative;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-row.primary {
  width: 100%;
  min-width: 0;
}

.input-row.actions {
  width: 100%;
}

.attachments-area {
  padding: 0.5rem 1rem;
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

.emoji-btn:hover:not(:disabled) {
  background: var(--color-surface-muted-3);
}

.emoji-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  min-width: 0;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 24px;
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
  flex-shrink: 0;
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
  flex-shrink: 0;
  white-space: nowrap;
}

.record-timer.limit {
  color: var(--color-danger-dark);
}


.record-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  padding: 0.75rem 1.5rem;
  flex-shrink: 0;
  border: none;
  border-radius: 24px;
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .input-row.primary {
    width: 100%;
  }

  .input-row.actions {
    width: 100%;
  }
}

.chat-actions {
  padding: 0.75rem 1rem;
  text-align: center;
  border-top: 1px solid var(--color-border);
}

.end-chat-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-danger);
  border-radius: 6px;
  background: transparent;
  color: var(--color-danger);
  font-size: 0.875rem;
  cursor: pointer;
}

.end-chat-btn:hover {
  background: var(--color-danger-soft);
}

.chat-ended-actions {
  padding: 1.5rem;
  text-align: center;
  background: var(--color-surface-muted-2);
}

.chat-ended-actions p {
  margin: 0 0 1rem;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.ended-actions-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.back-to-home-btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  background: white;
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.back-to-home-btn:hover {
  background: var(--color-primary);
  color: white;
}

.new-chat-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: transform 0.2s;
}

.new-chat-btn:hover {
  transform: translateY(-2px);
}

/* History Section Styles */
.history-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
  width: 100%;
  max-width: 400px;
}

.history-section h3 {
  margin: 0 0 1rem;
  color: var(--color-text-muted);
  font-size: 1rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  padding: 1rem;
  background: var(--color-surface-muted-2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.history-item:hover {
  background: var(--color-primary-tint);
  transform: translateX(4px);
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.history-subject {
  font-weight: 600;
  color: var(--color-text);
}

.history-date {
  font-size: 0.75rem;
  color: var(--color-text-subtle);
}

.history-preview {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-agent {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-primary);
}

/* History View Styles */
.history-view {
  background: var(--color-surface-muted);
}

.history-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--color-primary-tint) !important;
}

.back-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
}

.back-btn:hover {
  background: #5568d6;
}

.history-footer {
  padding: 1.5rem;
  text-align: center;
  background: var(--color-surface-muted-3);
  border-top: 1px solid var(--color-border);
}

.history-footer p {
  margin: 0 0 1rem;
  color: var(--color-text-muted);
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
  background: var(--color-primary-tint);
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

/* Message Status Icons */
.message-status {
  font-size: 0.7rem;
  margin-left: 0.25rem;
  color: rgba(255, 255, 255, 0.4);
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.message-status.read {
  color: var(--color-accent);
}

.message.own .message-status {
  color: var(--color-text-on-dark);
  opacity: 0.75;
}

.message.own .message-status .read {
  color: var(--color-info-light);
}
</style>










