<template>
  <div class="group-chat-container" @paste="handlePaste" @dragenter.prevent="handleDragEnter" @dragleave.prevent="handleDragLeave" @dragover.prevent @drop="handleDrop">
    <div v-if="isDragging" class="drop-overlay">
      Suelta para adjuntar
    </div>

    <!-- Groups sidebar -->
    <aside class="groups-sidebar">
      <div class="sidebar-header">
        <h3>Grupos</h3>
        <button class="primary-btn" type="button" @click="toggleCreate">
          Nuevo
        </button>
      </div>

      <div v-if="showCreate" class="modal-overlay" @click.self="toggleCreate">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Nuevo grupo</h3>
            <button class="modal-close" type="button" @click="toggleCreate">
              <HeroIcon name="x-circle" />
            </button>
          </div>
          <div class="modal-body">
            <input
              v-model="newGroupName"
              class="text-input"
              placeholder="Nombre del grupo"
              type="text"
            />
            <div class="panel-title">Selecciona agentes</div>
            <div class="panel-list">
              <label
                v-for="agent in availableAgents"
                :key="agent.id"
                class="check-item"
              >
                <input type="checkbox" :value="agent.id" v-model="selectedAgentIds" />
                <span>{{ agent.name }}</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="ghost-btn" type="button" @click="toggleCreate">Cancelar</button>
            <button class="primary-btn" type="button" @click="createGroup">Crear</button>
          </div>
        </div>
      </div>

      <div class="groups-list">
        <button
          v-for="group in groupChats"
          :key="group.id"
          class="group-item"
          :class="{ active: group.id === selectedGroupId }"
          type="button"
          @click="selectGroup(group.id)"
        >
          <div class="group-name">{{ group.name }}</div>
          <div class="group-meta">{{ (group.members?.length || 0) }} miembros</div>
        </button>
      </div>
    </aside>

    <!-- Chat area -->
    <section class="chat-area">
      <div class="chat-header">
        <div class="chat-title">
          <h2>{{ currentGroup?.name || 'Selecciona un grupo' }}</h2>
          <span v-if="currentGroup" class="subtle">{{ (currentMembers?.length || 0) }} miembros</span>
        </div>
        <div class="chat-actions">
          <UiTooltip
            placement="left"
            :text="chatStore.soundEnabled ? 'Silenciar sonido' : 'Activar sonido'"
          >
            <button
              class="sound-toggle"
              type="button"
              @click="chatStore.toggleSoundEnabled()"
            >
              <HeroIcon :name="chatStore.soundEnabled ? 'speaker-wave' : 'speaker-x-mark'" />
            </button>
          </UiTooltip>
          <div class="menu-wrapper" v-if="currentGroup">
            <button class="menu-btn" type="button" @click.stop="toggleMenu" title="Opciones"><HeroIcon name="ellipsis-vertical" /></button>
            <div v-if="showMenu" class="menu-dropdown">
              <button class="menu-item" type="button" @click.stop="toggleMembersSidebar">
                <span class="menu-icon"><HeroIcon name="user-group" /></span>
                {{ showMembersSidebar ? 'Ocultar miembros' : 'Ver miembros' }}
              </button>
              <button class="menu-item" type="button" @click.stop="toggleAddMembers">
                <span class="menu-icon"><HeroIcon name="plus" /></span>
                {{ showAddMembers ? 'Cerrar agregar' : 'Agregar miembros' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showAddMembers" class="modal-overlay" @click.self="toggleAddMembers">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Agregar agentes</h3>
            <button class="modal-close" type="button" @click="toggleAddMembers">
              <HeroIcon name="x-circle" />
            </button>
          </div>
          <div class="modal-body">
            <div class="panel-list">
              <label
                v-for="agent in addableAgents"
                :key="agent.id"
                class="check-item"
              >
                <input type="checkbox" :value="agent.id" v-model="selectedAddIds" />
                <span>{{ agent.name }}</span>
              </label>
              <div v-if="addableAgents.length === 0" class="empty-hint">
                No hay agentes disponibles para agregar.
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="ghost-btn" type="button" @click="toggleAddMembers">Cerrar</button>
            <button class="primary-btn" type="button" @click="addMembers">Agregar</button>
          </div>
        </div>
      </div>

      <div class="mensajes-container" ref="mensajesContainer">
        <div v-if="!currentGroup" class="empty-chat">
          <h3>Grupos de chat</h3>
          <p>Selecciona un grupo o crea uno nuevo.</p>
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
                {{ message.senderName }}
                <span v-if="message.senderId === authStore.userId" class="me-tag">(Tu)</span>
              </span>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-bubble">
              <p v-if="message.content && message.content.trim()">{{ message.content }}</p>
              <MessageAttachments
                :entity-id="message.id"
                :entity-type="'group'"
                :optimistic-items="optimisticByMessageId[message.id]"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="attachments-area" v-if="currentGroup">
        <ChatAttachments
          ref="attachmentsRef"
          :entity-id="attachmentTargetId"
          :entity-type="'group'"
          :defer-uploads="true"
          :show-existing="false"
          @queueChanged="queuedCount = $event"
        />
      </div>

      <div class="input-area" ref="inputAreaRef" v-if="currentGroup">
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
            placeholder="Escribe un mensaje..."
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
          <button class="send-btn" @click="sendMessage" :disabled="(!messageInput.trim() && queuedCount === 0)">
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
            <button class="emoji-btn" type="button" @click="showEmojiPicker = !showEmojiPicker">
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

    <!-- Members sidebar -->
    <aside class="members-sidebar" v-if="currentGroup && showMembersSidebar">
      <div class="sidebar-header">
        <h3><span class="sidebar-icon"><HeroIcon name="user-group" /></span> Miembros</h3>
      </div>
      <div class="members-list">
        <div v-for="member in currentMembers" :key="member.id" class="member-item">
          <div class="user-avatar agent">
            {{ getInitials(member.name) }}
          </div>
          <div class="user-info">
            <span class="user-name">{{ member.name }}</span>
          </div>
          <button
            v-if="canManageMembers && member.id !== currentGroup?.createdBy"
            class="remove-btn"
            type="button"
            @click="removeMember(member.id)"
          >
            Quitar
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
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
import UiTooltip from '@/components/ui/UiTooltip.vue'

const authStore = useAuthStore()
const chatStore = useChatStore()

const showCreate = ref(false)
const newGroupName = ref('')
const selectedAgentIds = ref<number[]>([])
const selectedGroupId = ref<number | null>(null)
const showAddMembers = ref(false)
const selectedAddIds = ref<number[]>([])
const showMembersSidebar = ref(false)
const showMenu = ref(false)

const messageInput = ref('')
const mensajesContainer = ref<HTMLElement | null>(null)
const inputElement = ref<HTMLTextAreaElement | null>(null)
const attachmentsRef = ref<any>(null)
const showEmojiPicker = ref(false)
const queuedCount = ref(0)
const awaitingAttachmentMessage = ref(false)
const pendingEntityId = ref<number | null>(null)
const pendingOptimistic = ref<OptimisticAttachment[]>([])
const optimisticByMessageId = ref<Record<number, OptimisticAttachment[]>>({})
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
const dragCounter = ref(0)
const isDragging = ref(false)

type OptimisticAttachment = {
  id: string
  url: string
  filename: string
  resource_type: string
  mime_type?: string
}

const groupChats = computed(() => chatStore.groupChats)
const availableAgents = computed(() => chatStore.availableAgents)
const currentGroup = computed(() => groupChats.value.find(g => g.id === selectedGroupId.value) || null)
const currentMembers = computed(() => {
  if (!selectedGroupId.value) return []
  return chatStore.groupMembers.get(selectedGroupId.value) || currentGroup.value?.members || []
})
const currentMessages = computed(() => {
  if (!selectedGroupId.value) return []
  return chatStore.groupMessages.get(selectedGroupId.value) || []
})

const filteredPhrases = computed(() => getFiltered(quickPhraseQuery.value))
const canManageMembers = computed(() => {
  return !!currentGroup.value && currentGroup.value.createdBy === authStore.userId
})

const addableAgents = computed(() => {
  const memberIds = new Set((currentMembers.value || []).map(m => m.id))
  return availableAgents.value.filter(a => !memberIds.has(a.id))
})

onMounted(() => {
  chatStore.getGroupChats()
  chatStore.getAllAgents()
  window.addEventListener('attachments:updated', handleAttachmentsUpdated as EventListener)
  window.addEventListener('click', handleWindowClick)
})

onUnmounted(() => {
  if (selectedGroupId.value) {
    chatStore.leaveGroup(selectedGroupId.value)
  }
  window.removeEventListener('attachments:updated', handleAttachmentsUpdated as EventListener)
  window.removeEventListener('click', handleWindowClick)
})

function toggleCreate() {
  showCreate.value = !showCreate.value
  if (!showCreate.value) {
    newGroupName.value = ''
    selectedAgentIds.value = []
  }
}

function createGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  chatStore.createGroup(name, selectedAgentIds.value)
  toggleCreate()
}

function toggleAddMembers() {
  showAddMembers.value = !showAddMembers.value
  if (!showAddMembers.value) {
    selectedAddIds.value = []
  }
  showMenu.value = false
}

function toggleMembersSidebar() {
  showMembersSidebar.value = !showMembersSidebar.value
  showMenu.value = false
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function handleWindowClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (
    showEmojiPicker.value &&
    emojiPickerWrapperRef.value &&
    target &&
    !emojiPickerWrapperRef.value.contains(target)
  ) {
    showEmojiPicker.value = false
  }
  if (showMenu.value) {
    if (target?.closest('.menu-wrapper')) return
    showMenu.value = false
  }
  if (showMembersSidebar.value) {
    if (target?.closest('.members-sidebar')) return
    if (target?.closest('.menu-wrapper')) return
    showMembersSidebar.value = false
  }
  if (showQuickPanel.value) {
    if (inputAreaRef.value && inputAreaRef.value.contains(target as Node)) return
    showQuickPanel.value = false
    quickPhraseQuery.value = ''
  }
}

function addMembers() {
  if (!selectedGroupId.value) return
  if (selectedAddIds.value.length === 0) return
  chatStore.addGroupMembers(selectedGroupId.value, selectedAddIds.value)
  toggleAddMembers()
}

function removeMember(memberId: number) {
  if (!selectedGroupId.value) return
  if (!confirm('¿Seguro que deseas quitar este miembro?')) return
  chatStore.removeGroupMember(selectedGroupId.value, memberId)
}

function selectGroup(groupId: number) {
  if (selectedGroupId.value && selectedGroupId.value !== groupId) {
    chatStore.leaveGroup(selectedGroupId.value)
  }
  selectedGroupId.value = groupId
  chatStore.joinGroup(groupId)
}

function sendMessage() {
  if (!selectedGroupId.value) return
  const content = messageInput.value.trim()
  if (!content && queuedCount.value === 0) return
  if (queuedCount.value > 0) {
    awaitingAttachmentMessage.value = true
    pendingOptimistic.value = attachmentsRef.value?.getQueuedPreviews?.() || []
  }
  chatStore.sendGroupMessage(selectedGroupId.value, content)
  messageInput.value = ''
  showQuickPanel.value = false
}

function handleInputChange() {
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

function getInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase()
  }
  return (name.substring(0, 2) || 'U').toUpperCase()
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function insertEmoji(emoji: string) {
  messageInput.value += emoji
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
  () => groupChats.value.length,
  (len) => {
    if (!selectedGroupId.value && len > 0) {
      const firstGroup = groupChats.value[0]
      if (firstGroup) {
        selectGroup(firstGroup.id)
      }
    }
  }
)

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
  if (detail.entityType && detail.entityType !== 'group') return
  if (!optimisticByMessageId.value[detail.entityId]) return
  const { [detail.entityId]: _removed, ...rest } = optimisticByMessageId.value
  optimisticByMessageId.value = rest
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
</script>

<style scoped>
.group-chat-container {
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

.groups-sidebar {
  width: 240px;
  min-width: 240px;
  background: white;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  margin: 0.75rem 0 0.75rem 0.75rem;
}

.members-sidebar {
  width: 280px;
  min-width: 280px;
  background: white;
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  height: auto;
  box-shadow: -12px 0 30px rgba(0, 0, 0, 0.12);
  z-index: 40;
  animation: slideInRight 0.2s ease-out;
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text);
}

.sidebar-icon {
  margin-right: 0.35rem;
}

.groups-list,
.members-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.group-item {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.group-item:hover {
  background: var(--color-surface-muted);
}

.group-item.active {
  background: var(--color-info-soft);
}

.group-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.1rem;
}

.group-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted-2);
  margin-top: 0.1rem;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0.75rem 0.75rem 0.75rem 0;
  background: transparent;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: white;
  border-bottom: 1px solid var(--color-border);
  border-radius: 12px;
  margin: 0 1rem 0.5rem 0;
}

.chat-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.menu-wrapper {
  position: relative;
}

.menu-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--color-border-strong);
  background: white;
  color: var(--color-primary);
  font-size: 1.2rem;
  cursor: pointer;
}

.menu-btn:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary-border);
}

.menu-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  min-width: 180px;
  z-index: 50;
  padding: 0.35rem;
}

.menu-item {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-start;
}

.menu-item:hover {
  background: var(--color-surface-muted);
}

.menu-icon {
  width: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sound-toggle {
  border: 1px solid var(--color-border-strong);
  background: white;
  color: var(--color-primary);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  font-size: 0.85rem;
  cursor: pointer;
}

.sound-toggle:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary-border);
}

.chat-title h2 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--color-text);
  margin-bottom: 0.15rem;
}

.subtle {
  font-size: 0.8rem;
  color: var(--color-text-muted-2);
  display: block;
  margin-top: 0.1rem;
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

.message {
  display: flex;
  gap: 0.75rem;
  max-width: 70%;
}

.message.own {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar,
.user-avatar {
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
}

.attach-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.panel {
  border-bottom: 1px solid var(--color-border);
  padding: 0.75rem 1rem;
  background: var(--color-surface-soft);
}

.panel-title {
  font-size: 0.8rem;
  color: var(--color-text-soft);
  margin: 0.5rem 0;
}

.panel-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 180px;
  overflow-y: auto;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1rem;
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--color-text-muted);
}

.modal-body {
  padding: 1rem 1.25rem;
}

.modal-footer {
  padding: 0.9rem 1.25rem 1.1rem;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  border-top: 1px solid var(--color-border);
}

.text-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
}

.primary-btn,
.ghost-btn {
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid var(--color-border-strong);
  background: white;
}

.primary-btn {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.ghost-btn {
  color: var(--color-primary);
}

.member-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem;
  border-radius: 8px;
}

.member-item .remove-btn {
  margin-left: auto;
  border: none;
  background: var(--color-danger-soft);
  color: var(--color-danger-dark);
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
}

.member-item:hover {
  background: var(--color-surface-muted);
}

.user-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
}

.empty-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted-2);
  padding: 0.5rem 0;
}

@media (max-width: 900px) {
  .members-sidebar {
    display: none;
  }
}

@media (max-width: 768px) {
  .groups-sidebar {
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

  .input-row.primary {
    width: 100%;
  }

  .input-row.actions {
    width: 100%;
  }
}
</style>










