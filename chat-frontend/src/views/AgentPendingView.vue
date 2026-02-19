<template>
  <div class="pending-container">
    <div class="pending-content">
      <div class="section-header">
        <h2><HeroIcon name="clipboard-document-list" /> Chats Pendientes</h2>
        <div class="header-actions">
          <UiTooltip :text="chatStore.soundByType.pending ? 'Silenciar sonido' : 'Activar sonido'">
            <button
              class="sound-toggle"
              type="button"
              @click="chatStore.toggleSoundType('pending')"
            >
              <HeroIcon :name="chatStore.soundByType.pending ? 'speaker-wave' : 'speaker-x-mark'" />
            </button>
          </UiTooltip>
          <button class="refresh-btn" @click="refreshPendingChats">
            <HeroIcon name="arrow-path" />
            Actualizar
          </button>
        </div>
      </div>

      <div v-if="chatStore.pendingChats.length === 0" class="empty-state">
        <span class="empty-icon"><HeroIcon name="inbox" /></span>
        <h3>No hay chats pendientes</h3>
        <p>Todos los clientes han sido atendidos</p>
      </div>

      <div v-else class="pending-list">
        <div 
          v-for="chat in chatStore.pendingChats" 
          :key="chat.id"
          class="pending-card"
        >
          <div class="card-header">
            <span class="client-name"><HeroIcon name="user" /> {{ chat.clientName || `Cliente #${chat.clientId}` }}</span>
            <span v-if="chat.channel === 'whatsapp'" class="channel-badge">WhatsApp</span>
            <span class="wait-time">{{ formatWaitTime(chat.createdAt) }}</span>
          </div>
          
          <div class="card-body">
            <p class="subject">{{ chat.subject || 'Sin asunto' }}</p>
            <p v-if="chat.lastMessage" class="last-message">
              "{{ truncateMessage(chat.lastMessage) }}"
            </p>
          </div>

          <div class="card-actions">
            <button class="assign-btn" @click="assignChat(chat.id)">
              Tomar chat
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import UiTooltip from '@/components/ui/UiTooltip.vue'

const router = useRouter()
const chatStore = useChatStore()

let refreshInterval: number | null = null

onMounted(() => {
  chatStore.getPendingChats()
  
  // Auto-refresh every 10 seconds
  refreshInterval = window.setInterval(() => {
    chatStore.getPendingChats()
  }, 10000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

function refreshPendingChats() {
  chatStore.getPendingChats()
}

function assignChat(chatId: number) {
  chatStore.assignChat(chatId)
  router.push('/agent/dashboard')
}

function formatWaitTime(createdAt: Date): string {
  const now = new Date()
  const created = new Date(createdAt)
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins} min`
  
  const diffHours = Math.floor(diffMins / 60)
  return `Hace ${diffHours}h`
}

function truncateMessage(message: string): string {
  return message.length > 80 ? message.substring(0, 80) + '...' : message
}
</script>

<style scoped>
.pending-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
  overflow-y: auto;
}

.pending-content {
  flex: 1;
  padding: 1.5rem;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
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

.section-header h2 {
  margin: 0;
  color: var(--color-text);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border-soft);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
}

.refresh-btn:hover {
  background: var(--color-surface-muted);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.empty-icon {
  font-size: 4rem;
}

.empty-state h3 {
  margin: 1rem 0 0.5rem;
  color: var(--color-text);
}

.empty-state p {
  color: var(--color-text-muted);
}

.pending-list {
  display: grid;
  gap: 1rem;
}

.pending-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.pending-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.channel-badge {
  margin-left: 0.5rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  background: var(--color-info-soft-2);
  color: var(--color-info-strong);
  border: 1px solid var(--color-info-border);
}

.client-name {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  color: var(--color-text);
}

.wait-time {
  font-size: 0.75rem;
  color: var(--color-warning);
  background: var(--color-warning-soft);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.card-body {
  margin-bottom: 1rem;
}

.subject {
  margin: 0 0 0.5rem;
  color: var(--color-text);
  font-weight: 500;
}

.last-message {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-style: italic;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}

.assign-btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.assign-btn:hover {
  background: var(--color-primary-2);
}
</style>



