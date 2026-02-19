<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import ChatFloatingButton from '@/components/chat/ChatFloatingButton.vue'
import ClientChatWidget from '@/components/chat/ClientChatWidget.vue'

const route = useRoute()
const authStore = useAuthStore()
const chatStore = useChatStore()

const isChatOpen = ref(false)

// Mostrar el widget solo para clientes autenticados
const showChatWidget = computed(() => {
  return authStore.isAuthenticated && authStore.role === 'client'
})

function toggleChat() {
  isChatOpen.value = !isChatOpen.value
}

onMounted(() => {
  // Restore session if exists
  if (authStore.restoreSession()) {
    chatStore.connectSocket()
  }
})
</script>

<template>
  <RouterView />
  
  <!-- Chat Widget Flotante (solo para clientes) -->
  <template v-if="showChatWidget">
    <ClientChatWidget :is-open="isChatOpen" @close="isChatOpen = false" />
    <ChatFloatingButton :is-open="isChatOpen" @toggle="toggleChat" />
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
  --color-primary: #1a237e;
  --color-primary-2: #283593;
  --color-accent: #64b5f6;
  --color-bg: #f5f7fb;
  --color-surface: #ffffff;
  --color-surface-soft: #fafbff;
  --color-surface-muted: #f5f5f5;
  --color-surface-muted-2: #f8f9fa;
  --color-surface-muted-3: #f0f0f0;
  --color-border: #e0e0e0;
  --color-border-strong: #d6d9e0;
  --color-border-soft: #dddddd;
  --color-border-soft-2: #eeeeee;
  --color-text: #1f2933;
  --color-text-strong: #111827;
  --color-text-soft: #4b5563;
  --color-text-muted: #6b7280;
  --color-text-muted-2: #7c8794;
  --color-text-subtle: #9aa3af;
  --color-text-on-dark: #e6e9f2;
  --color-primary-soft: #eef1ff;
  --color-primary-border: #c2c8ff;
  --color-primary-tint: #e8eaf6;
  --color-info: #2196f3;
  --color-info-dark: #1976d2;
  --color-info-light: #90caf9;
  --color-info-soft: #e3f2fd;
  --color-info-soft-2: #e7f2ff;
  --color-info-border: #c7def8;
  --color-info-strong: #0b4b8a;
  --color-success: #4caf50;
  --color-success-dark: #2e7d32;
  --color-warning: #ff9800;
  --color-warning-dark: #f57c00;
  --color-warning-soft: #fff3e0;
  --color-danger: #f44336;
  --color-danger-dark: #c62828;
  --color-danger-soft: #ffebee;
  --color-danger-border: #ef9a9a;
  --gradient-primary: linear-gradient(135deg, #1a237e 0%, #3f51b5 100%);
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


