<template>
  <div class="history-container">
    <div v-if="chatStore.clientChatHistory.length === 0" class="empty-state">
      <span class="empty-icon"><HeroIcon name="inbox" /></span>
      <h2>Sin conversaciones anteriores</h2>
      <p>Cuando finalices una conversación con soporte, aparecerá aquí</p>
    </div>

    <div v-else class="history-list">
      <div 
        v-for="chat in chatStore.clientChatHistory" 
        :key="chat.id"
        class="history-card"
      >
        <div class="card-header">
          <div class="chat-info">
            <span class="chat-subject">{{ chat.subject || 'Conversación de soporte' }}</span>
            <span class="chat-date">{{ formatDate(chat.createdAt) }}</span>
          </div>
          <div class="chat-rating" v-if="chat.rating">
            <span v-for="star in 5" :key="star" class="star" :class="{ filled: star <= chat.rating }">
              {{ star <= chat.rating ? '★' : '☆' }}
            </span>
          </div>
          <span v-else class="no-rating">Sin calificar</span>
        </div>

        <div class="card-body">
          <div class="chat-meta">
            <span class="meta-item">
              <span class="meta-icon"><HeroIcon name="user" /></span>
              Atendido por: {{ chat.agentName || 'Agente' }}
            </span>
            <span class="meta-item" v-if="chat.durationSeconds">
              <span class="meta-icon"><HeroIcon name="clock" /></span>
              Duración: {{ formatDuration(chat.durationSeconds) }}
            </span>
          </div>
          <p v-if="chat.feedback" class="feedback">
            <span class="feedback-label">Tu comentario:</span>
            "{{ chat.feedback }}"
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import HeroIcon from '@/components/ui/HeroIcon.vue'

const chatStore = useChatStore()

onMounted(() => {
  chatStore.getClientHistory()
})

function formatDate(date: Date): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}
</script>

<style scoped>
.history-container {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--color-text-muted);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h2 {
  margin: 0 0 0.5rem;
  color: var(--color-text);
}

.empty-state p {
  margin: 0;
  max-width: 300px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.history-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s;
}

.history-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-surface-muted-3);
}

.chat-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chat-subject {
  font-weight: 600;
  color: var(--color-text);
  font-size: 1rem;
}

.chat-date {
  font-size: 0.8rem;
  color: var(--color-text-subtle);
}

.chat-rating {
  display: flex;
  gap: 0.1rem;
}

.star {
  font-size: 1.1rem;
  color: var(--color-border-soft);
}

.star.filled {
  color: #ffc107;
}

.no-rating {
  font-size: 0.8rem;
  color: var(--color-text-subtle);
  font-style: italic;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chat-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.meta-icon {
  font-size: 1rem;
}

.feedback {
  margin: 0;
  padding: 0.75rem 1rem;
  background: var(--color-surface-muted-2);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--color-text-soft);
  font-style: italic;
}

.feedback-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-subtle);
  margin-bottom: 0.25rem;
  font-style: normal;
}

/* Responsive */
@media (max-width: 600px) {
  .history-container {
    padding: 1rem;
  }

  .card-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .chat-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>



