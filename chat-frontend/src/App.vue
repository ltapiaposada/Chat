<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import ChatFloatingButton from '@/components/chat/ChatFloatingButton.vue'
import ClientChatWidget from '@/components/chat/ClientChatWidget.vue'
import ClientHistoryModal from '@/components/chat/ClientHistoryModal.vue'
import AppDialogHost from '@/components/ui/AppDialogHost.vue'
import AppNotificationHost from '@/components/ui/AppNotificationHost.vue'

const route = useRoute()
const authStore = useAuthStore()
const chatStore = useChatStore()

const isChatOpen = ref(false)
const isHistoryOpen = ref(false)

// Mostrar el widget solo para clientes autenticados
const showChatWidget = computed(() => {
  return route.name !== 'embedded-client-chat' && authStore.isAuthenticated && authStore.role === 'client'
})

function toggleChat() {
  isChatOpen.value = !isChatOpen.value
}

onMounted(() => {
  if (route.name === 'embedded-client-chat') return
  // Restore session if exists
  if (authStore.restoreSession()) {
    // The embedded view owns its connection lifecycle so it can also accept
    // authentication sent by the host page after the iframe has loaded.
    chatStore.connectSocket()
  }
})
</script>

<template>
  <RouterView />
  <AppDialogHost />
  <AppNotificationHost />
  
  <!-- Chat Widget Flotante (solo para clientes) -->
  <template v-if="showChatWidget">
    <ClientChatWidget :is-open="isChatOpen" @close="isChatOpen = false" @open-history="isHistoryOpen = true" />
    <ChatFloatingButton :is-open="isChatOpen" @toggle="toggleChat" />
    <ClientHistoryModal :show="isHistoryOpen" @close="isHistoryOpen = false" />
  </template>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

:root {
  --color-primary: #5849e0;
  --color-primary-2: #4238be;
  --color-accent: #7c6ff0;
  --color-bg: #f4f5f9;
  --color-surface: #ffffff;
  --color-surface-soft: #fafbff;
  --color-surface-muted: #f5f5f5;
  --color-surface-muted-2: #f8f9fa;
  --color-surface-muted-3: #f0f0f0;
  --color-border: #e6e7f0;
  --color-border-strong: #d7d9e7;
  --color-border-soft: #eff0f6;
  --color-border-soft-2: #eeeeee;
  --color-text: #15172e;
  --color-text-strong: #15172e;
  --color-text-soft: #50536f;
  --color-text-muted: #6c6f8d;
  --color-text-muted-2: #7c8794;
  --color-text-subtle: #9aa3af;
  --color-text-on-dark: #e6e9f2;
  --color-primary-soft: #eeebfd;
  --color-primary-border: #cfc9f8;
  --color-primary-tint: #f3f1fe;
  --color-info: #2196f3;
  --color-info-dark: #1976d2;
  --color-info-light: #90caf9;
  --color-info-soft: #e3f2fd;
  --color-info-soft-2: #e7f2ff;
  --color-info-border: #c7def8;
  --color-info-strong: #0b4b8a;
  --color-success: #189c6e;
  --color-success-dark: #117a56;
  --color-warning: #ff9800;
  --color-warning-dark: #f57c00;
  --color-warning-soft: #fff3e0;
  --color-danger: #f44336;
  --color-danger-dark: #c62828;
  --color-danger-soft: #ffebee;
  --color-danger-border: #ef9a9a;
  --gradient-primary: #15172e;
  --shadow-sm: 0 2px 6px rgba(15, 23, 42, 0.08);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.12);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
}

body {
  font-family: 'Segoe UI', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Inter', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--color-text);
  background: var(--color-bg);
}
</style>
