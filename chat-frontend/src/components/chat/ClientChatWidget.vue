<template>
  <Transition name="chat-widget">
    <div
      v-if="isOpen"
      class="chat-widget"
      @paste="handlePaste"
      @dragenter.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
      @dragover.prevent
      @drop="handleDrop"
    >
      <div v-if="isDragging" class="drop-overlay">
        Suelta para adjuntar
      </div>
      <header class="widget-header">
        <div class="header-info">
          <h2><HeroIcon name="chat-bubble-left-right" /> Soporte</h2>
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
          <button class="close-btn" @click="$emit('close')">
            <HeroIcon name="x-circle" />
          </button>
        </div>
      </header>

      <main class="widget-body">
        <!-- No active chat - show options -->
        <div v-if="!chatStore.clientChat && !viewingHistory" class="start-chat-prompt">
          <div class="prompt-content">
            <span class="prompt-icon"><HeroIcon name="face-smile" /></span>
            <h3>¡Hola {{ authStore.name }}!</h3>
            <p>¿En qué podemos ayudarte?</p>
            
            <div class="subject-input">
              <input
                v-model="subject"
                type="text"
                placeholder="Describe tu consulta..."
                @keypress.enter="startNewChat"
              />
            </div>
            
            <button class="start-btn" @click="startNewChat" :disabled="!subject.trim()">
              Iniciar conversación
            </button>

            <!-- Chat History Section -->
            <div v-if="chatStore.clientChatHistory.length > 0" class="history-section">
              <h4><HeroIcon name="document-text" /> Anteriores</h4>
              <div class="history-list">
                <div 
                  v-for="chat in chatStore.clientChatHistory.slice(0, 3)" 
                  :key="chat.id" 
                  class="history-item"
                  @click="viewHistoryChat(chat.id)"
                >
                  <span class="history-subject">{{ chat.subject || 'Soporte' }}</span>
                  <span class="history-date">{{ formatDate(chat.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Viewing history chat -->
        <div v-else-if="viewingHistory" class="chat-content history-view">
          <div class="chat-status-bar history-bar">
            <button class="back-btn" @click="closeHistoryView">Volver</button>
            <span>{{ formatDate(historyChat?.createdAt) }}</span>
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
                  <p>{{ message.content }}</p>
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
            <button class="new-chat-btn" @click="closeHistoryView">
              Nueva conversación
            </button>
          </div>
        </div>

        <!-- Active chat -->
        <div v-else class="chat-content">
          <div class="chat-status-bar">
            <span v-if="chatStore.clientChat?.status === 'pending'" class="pending-status">
              <HeroIcon name="clock" /> Esperando agente...
            </span>
            <span v-else-if="chatStore.clientChat?.status === 'active'" class="active-status">
              <HeroIcon name="check-circle" /> {{ chatStore.clientChat?.agentName || 'Agente' }}
            </span>
            <span v-else-if="chatStore.clientChat?.status === 'on_hold'" class="hold-status">
              <HeroIcon name="pause-circle" /> En espera
            </span>
            <span v-else-if="chatStore.clientChat?.status === 'closed'" class="closed-status">
              Chat finalizado
            </span>
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
                  <p>{{ message.content }}</p>
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
                      <span v-if="message.status === 'sent'">?</span>
                      <span v-else-if="message.status === 'delivered'">??</span>
                      <span v-else-if="message.status === 'read'" class="read">??</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="chatStore.typingUsers.size > 0" class="typing-indicator">
              <span class="typing-dots"></span>
              Escribiendo...
            </div>
          </div>

          <!-- Reply indicator -->
          <div v-if="chatStore.replyingToMessage" class="replying-to-bar">
            <div class="replying-to-content">
              <span class="replying-to-label">Respondiendo:</span>
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
              <input
                ref="inputElement"
                v-model="messageInput"
                type="text"
                placeholder="Escribe tu mensaje..."
                @keypress.enter="sendMessage"
                @input="handleTyping"
                @paste="handlePaste"
              />
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
                aria-label="Enviar"
                title="Enviar"
              >
                <span class="send-icon"><HeroIcon name="paper-airplane" /></span>
              </button>
            </div>
            <div class="input-row actions">
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

          <div class="chat-actions" v-if="chatStore.clientChat?.status !== 'closed'">
            <button class="end-chat-btn" @click="endChat">
              Finalizar
            </button>
          </div>

          <div v-else class="chat-ended-actions">
            <button class="new-chat-btn" @click="startNewChatAfterClosed">
              Nueva conversación
            </button>
          </div>
        </div>
      </main>
    </div>
  </Transition>

  <!-- Satisfaction Survey Modal -->
  <SatisfactionSurvey
    :show="chatStore.showSurvey"
    :chat-id="chatStore.surveyChatId || 0"
    @close="handleSurveyClose"
    @submit="handleSurveySubmit"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore, type Message } from '@/stores/chat'
import ChatAttachments from '@/components/chat/ChatAttachments.vue'
import MessageAttachments from '@/components/chat/MessageAttachments.vue'
import SatisfactionSurvey from '@/components/SatisfactionSurvey.vue'
import EmojiMartPicker from '@/components/chat/EmojiMartPicker.vue'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import UiTooltip from '@/components/ui/UiTooltip.vue'

defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  close: []
}>()

const authStore = useAuthStore()
const chatStore = useChatStore()

const subject = ref('')
const messageInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const viewingHistory = ref(false)
const historyChat = ref<any>(null)
const inputElement = ref<HTMLInputElement | null>(null)
const attachmentsRef = ref<any>(null)
const queuedCount = ref(0)
const awaitingAttachmentMessage = ref(false)
const pendingEntityId = ref<number | null>(null)
const showEmojiPicker = ref(false)
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
  return 'En línea'
})

onMounted(() => {
  if (authStore.isAuthenticated && authStore.role === 'client') {
    chatStore.getClientHistory()
    
    if (chatStore.clientChat && chatStore.clientChat.status !== 'closed') {
      chatStore.selectChat(chatStore.clientChat.id)
    }
  }
  window.addEventListener('attachments:updated', handleAttachmentsUpdated as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener('attachments:updated', handleAttachmentsUpdated as EventListener)
})

function startNewChat() {
  if (!subject.value.trim()) return
  chatStore.startChat(subject.value)
  subject.value = ''
}

function startNewChatAfterClosed() {
  chatStore.clearActiveClientChat()
  chatStore.getClientHistory()
  subject.value = ''
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
  if (confirm('¿Finalizar la conversación?')) {
    chatStore.clientEndChat()
  }
}

function replyToMessage(message: Message) {
  chatStore.setReplyingTo(message)
  inputElement.value?.focus()
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
  showEmojiPicker.value = false
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
    month: 'short'
  })
}

const attachmentTargetId = computed(() => {
  if (awaitingAttachmentMessage.value) return null
  if (pendingEntityId.value) return pendingEntityId.value
  if (messageInput.value.trim()) return null
  if (chatStore.replyingToMessage?.id) return chatStore.replyingToMessage.id
  const messages = chatStore.currentMessages
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].senderRole === 'client') return messages[i].id
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

function handleSurveyClose() {
  chatStore.closeSurvey()
  // Limpiar el chat después de cerrar la encuesta
  startNewChatAfterClosed()
}

function handleSurveySubmit(rating: number, feedback: string) {
  if (chatStore.surveyChatId) {
    chatStore.submitSurvey(chatStore.surveyChatId, rating, feedback)
  }
  chatStore.closeSurvey()
  // Limpiar el chat después de enviar la encuesta
  startNewChatAfterClosed()
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

</script>

<style scoped>
.chat-widget {
  position: fixed;
  bottom: 100px;
  right: 24px;
  width: 380px;
  max-width: calc(100vw - 48px);
  height: 550px;
  max-height: calc(100vh - 140px);
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 999;
}

.drop-overlay {
  position: absolute;
  inset: 8px;
  background: rgba(26, 35, 126, 0.12);
  border: 2px dashed var(--color-primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-primary);
  z-index: 1000;
  pointer-events: none;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--gradient-primary);
  color: white;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
  width: 30px;
  height: 30px;
  padding: 0;
  cursor: pointer;
}

.sound-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.header-info h2 {
  margin: 0;
  font-size: 1.1rem;
}

.status-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.2);
}

.status-badge.connected { background: rgba(76, 175, 80, 0.3); }
.status-badge.disconnected { background: rgba(244, 67, 54, 0.3); }

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.widget-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.start-chat-prompt {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.prompt-content {
  text-align: center;
  width: 100%;
}

.prompt-icon {
  font-size: 2.5rem;
}

.prompt-content h3 {
  margin: 0.75rem 0 0.25rem;
  color: var(--color-text);
  font-size: 1.1rem;
}

.prompt-content p {
  color: var(--color-text-muted);
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.subject-input input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.subject-input input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.start-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--gradient-primary);
  color: white;
  font-size: 0.9rem;
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

.history-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.history-section h4 {
  margin: 0 0 0.75rem;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem;
  background: var(--color-surface-muted-2);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: var(--color-primary-tint);
}

.history-subject {
  font-size: 0.85rem;
  color: var(--color-text);
}

.history-date {
  font-size: 0.7rem;
  color: var(--color-text-subtle);
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-status-bar {
  padding: 0.5rem 0.75rem;
  background: var(--color-surface-muted-2);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.8rem;
  text-align: center;
}

.history-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-primary-tint);
}

.back-btn {
  padding: 0.3rem 0.6rem;
  border: none;
  border-radius: 4px;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
}

.pending-status { color: var(--color-warning); }
.active-status { color: var(--color-success); }
.hold-status { color: #9e9e9e; }
.closed-status { color: var(--color-danger); }

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.message.own {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
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
  max-width: calc(100% - 44px);
  flex: 1;
  min-width: 0;
}

.message.own .message-content {
  align-items: flex-end;
}

.sender-name {
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
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
  max-width: 80%;
  width: fit-content;
  padding: 0.6rem 0.8rem;
  border-radius: 12px;
  background: var(--color-surface-muted-3);
  font-size: 0.9rem;
}

.message.own .message-bubble {
  background: var(--color-primary);
  color: white;
}

.message-bubble p {
  margin: 0;
  word-wrap: break-word;
}

.message-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 0.2rem;
  gap: 0.25rem;
}

.message-time {
  display: inline-flex;
  align-items: center;
  font-size: 0.65rem;
  opacity: 0.5;
  line-height: 1;
}
.message.own .message-time {
  color: var(--color-text-on-dark);
  opacity: 0.75;
}

.reply-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  opacity: 0.5;
  padding: 0.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.reply-btn:hover {
  opacity: 1;
}
.message.own .reply-btn {
  color: #ffffff;
  opacity: 0.8;
}

.reply-icon {
  width: 14px;
  height: 14px;
}

.reply-preview {
  background: rgba(0, 0, 0, 0.05);
  border-left: 2px solid var(--color-primary);
  padding: 0.3rem 0.5rem;
  margin-bottom: 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.message.own .reply-preview {
  background: rgba(255, 255, 255, 0.15);
  border-left-color: rgba(255, 255, 255, 0.5);
}

.reply-preview .reply-label {
  font-weight: 600;
  font-size: 0.65rem;
  display: block;
}

.reply-preview p {
  margin: 0;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.typing-indicator {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-style: italic;
  padding: 0.3rem;
}

.replying-to-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-primary-tint);
  border-left: 3px solid var(--color-primary);
  font-size: 0.8rem;
}

.replying-to-content {
  flex: 1;
  overflow: hidden;
}

.replying-to-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-primary);
}

.replying-to-content p {
  margin: 0.15rem 0 0;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cancel-reply-btn {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 0.2rem;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
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
}

.input-row.actions {
  width: 100%;
}

.emoji-picker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.emoji-btn {
  padding: 0.5rem;
  border: none;
  background: transparent;
  font-size: 1.25rem;
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

.attachments-area {
  padding: 0.5rem 0.75rem;
}

.input-area input {
  flex: 1;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  font-size: 0.9rem;
}

.mic-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
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
  width: 18px;
  height: 18px;
  fill: var(--color-primary);
}

.mic-btn.recording .mic-icon {
  fill: var(--color-danger-dark);
}

.record-timer {
  font-size: 0.75rem;
  color: var(--color-text-soft);
  min-width: 40px;
}

.record-timer.limit {
  color: var(--color-danger-dark);
}


.record-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.record-error {
  font-size: 0.7rem;
  color: var(--color-danger-dark);
}

.input-area input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.send-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  font-size: 1.1rem;
  cursor: pointer;
}

.send-icon {
  display: inline-block;
  transform: translateX(1px);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-actions, .chat-ended-actions, .history-footer {
  padding: 0.5rem 0.75rem;
  text-align: center;
  border-top: 1px solid var(--color-border);
}

.end-chat-btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--color-danger);
  border-radius: 4px;
  background: transparent;
  color: var(--color-danger);
  font-size: 0.8rem;
  cursor: pointer;
}

.end-chat-btn:hover {
  background: var(--color-danger-soft);
}

.new-chat-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: var(--color-primary);
  color: white;
  font-size: 0.85rem;
  cursor: pointer;
}

/* Animations */
.chat-widget-enter-active,
.chat-widget-leave-active {
  transition: all 0.3s ease;
}

.chat-widget-enter-from,
.chat-widget-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* Mobile responsive */
@media (max-width: 480px) {
  .chat-widget {
    bottom: 0;
    right: 0;
    left: 0;
    width: 100%;
    max-width: 100%;
    height: calc(100vh - 80px);
    max-height: none;
    border-radius: 16px 16px 0 0;
  }

  .input-row.primary {
    flex: 1 1 100%;
  }

  .input-row.actions {
    width: 100%;
  }
}

@media (min-width: 481px) {
  .input-row.primary {
    width: 100%;
  }

  .input-row.actions {
    width: 100%;
  }
}

/* Message Status Icons */
.message-status {
  font-size: 0.6rem;
  margin-left: 0.2rem;
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
</style>










