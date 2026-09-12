<template>
  <div class="embed-root">
    <div v-if="authenticating" class="embed-status">Conectando…</div>

    <div v-else-if="authError" class="embed-auth-card">
      <strong>No se pudo abrir el chat</strong>
      <span>{{ authError }}</span>
    </div>

    <template v-else-if="authStore.isClient">
      <div v-show="!historyOpen">
        <ClientChatWidget
          :is-open="isOpen"
          @close="setOpen(false)"
          @open-history="openHistory"
        />
        <ChatFloatingButton
          :is-open="isOpen"
          :unread-count="unreadCount"
          @toggle="setOpen(!isOpen)"
        />
      </div>
    </template>

    <div v-else class="embed-auth-card">El sitio anfitrión todavía no ha identificado al usuario.</div>

    <ClientHistoryModal :show="historyOpen" @close="closeHistory" @select="selectHistory" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import ChatFloatingButton from '@/components/chat/ChatFloatingButton.vue'
import ClientChatWidget from '@/components/chat/ClientChatWidget.vue'
import ClientHistoryModal from '@/components/chat/ClientHistoryModal.vue'

const authStore = useAuthStore()
const chatStore = useChatStore()
const isOpen = ref(false)
const authenticating = ref(false)
const authError = ref('')
const historyOpen = ref(false)
let authenticationVersion = 0

const unreadCount = computed(() =>
  chatStore.clientChatHistory.reduce((total, chat) => total + Number(chat.unreadCount || 0), 0)
)

function notifyParent(type: string, extra: Record<string, unknown> = {}) {
  if (window.parent === window) return
  window.parent.postMessage({ type, ...extra }, '*')
}

function setOpen(value: boolean) {
  isOpen.value = value
  notifyParent('SUPPORT_CHAT_RESIZE', { open: value })
}

function openHistory() {
  historyOpen.value = true
  notifyParent('SUPPORT_CHAT_RESIZE', { open: true, history: true })
}

function closeHistory() {
  historyOpen.value = false
  notifyParent('SUPPORT_CHAT_RESIZE', { open: isOpen.value })
}

function selectHistory(chatId: number) {
  historyOpen.value = false
  isOpen.value = true
  chatStore.viewChat(chatId)
  notifyParent('SUPPORT_CHAT_RESIZE', { open: true })
}

async function configureWidget(payload: any) {
  const version = ++authenticationVersion
  chatStore.disconnectSocket()
  chatStore.reset()
  authenticating.value = true
  authError.value = ''
  try {
    if (payload.sessionError) throw new Error(payload.sessionError)
    if (!payload.sessionToken || !payload.user) throw new Error('La sesión segura del widget no está disponible')
    if (version !== authenticationVersion) return
    const user = payload.user
    const token = payload.sessionToken
    authStore.login(user.id, user.name, 'client', token)
    chatStore.disconnectSocket()
    chatStore.connectSocket()
  } catch (error: any) {
    if (version !== authenticationVersion) return
    authStore.logout()
    authError.value = error.message || 'No se pudo conectar con el servicio de chat.'
  } finally {
    if (version === authenticationVersion) authenticating.value = false
  }
}

function receiveHostMessage(event: MessageEvent) {
  if (event.source !== window.parent) return
  if (event.data?.type === 'SUPPORT_CHAT_CONFIG') configureWidget(event.data)
  if (event.data?.type === 'SUPPORT_CHAT_COMMAND') {
    if (event.data.command === 'open') setOpen(true)
    if (event.data.command === 'close') setOpen(false)
    if (event.data.command === 'history') openHistory()
  }
}

onMounted(() => {
  document.documentElement.classList.add('chat-embedded-page')
  window.addEventListener('message', receiveHostMessage)
  notifyParent('SUPPORT_CHAT_READY')
})

onBeforeUnmount(() => {
  authenticationVersion += 1
  chatStore.disconnectSocket()
  chatStore.reset()
  document.documentElement.classList.remove('chat-embedded-page')
  window.removeEventListener('message', receiveHostMessage)
})
</script>

<style scoped>
.embed-root { position: fixed; inset: 0; background: transparent; overflow: hidden; }
.embed-root :deep(.chat-floating-btn) { right: 20px; bottom: 20px; width: 60px; height: 60px; }
.embed-root :deep(.chat-widget) { inset: 12px; width: auto; max-width: none; height: auto; max-height: none; border-radius: 16px; }
.embed-status, .embed-auth-card { position: fixed; right: 16px; bottom: 16px; padding: 12px 16px; border-radius: 12px; background: white; box-shadow: var(--shadow-md); }
.embed-auth-card { display: flex; flex-direction: column; max-width: 320px; color: var(--color-danger-dark); }
</style>

<style>
html.chat-embedded-page,
html.chat-embedded-page body { background: transparent; }
</style>
