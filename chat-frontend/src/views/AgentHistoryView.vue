<template>
  <div class="history-container">
    <div class="history-content">
      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        <p>Cargando historial...</p>
      </div>

      <div v-else-if="chatStore.agentChatHistory.length === 0" class="empty-state">
        <span class="empty-icon"><HeroIcon name="inbox" /></span>
        <h2>Sin historial</h2>
        <p>AÃºn no tienes conversaciones cerradas</p>
      </div>

      <div v-else class="history-table-wrapper">
        <table class="history-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Asunto</th>
              <th>Primera Respuesta</th>
              <th>DuraciÃ³n</th>
              <th>CalificaciÃ³n</th>
              <th>Comentario</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="chat in chatStore.agentChatHistory" :key="chat.id">
              <td class="client-cell">
                <div class="client-avatar">
                  {{ getInitials(chat.clientName) }}
                </div>
                <span>{{ chat.clientName || `Cliente #${chat.clientId}` }}</span>
              </td>
              <td class="subject-cell">{{ chat.subject || 'Sin asunto' }}</td>
              <td class="response-cell">
                <span v-if="chat.firstResponseSeconds != null" class="response-time" :class="getResponseClass(chat.firstResponseSeconds)">
                  {{ formatDuration(chat.firstResponseSeconds) }}
                </span>
                <span v-else class="no-response">â€”</span>
              </td>
              <td class="duration-cell">
                <span v-if="chat.durationSeconds != null">
                  {{ formatDuration(chat.durationSeconds) }}
                </span>
                <span v-else>â€”</span>
              </td>
              <td class="rating-cell">
                <div v-if="chat.rating" class="rating-stars">
                  <span v-for="star in 5" :key="star" class="star" :class="{ filled: star <= chat.rating }" aria-hidden="true">
                    {{ star <= chat.rating ? '\u2605' : '\u2606' }}
                  </span>
                </div>
                <span v-else class="no-rating">Sin calificar</span>
              </td>
              <td class="feedback-cell">
                <span v-if="chat.feedback" class="feedback-text" :title="chat.feedback">
                  {{ truncate(chat.feedback, 50) }}
                </span>
                <span v-else class="no-feedback">â€”</span>
              </td>
              <td class="date-cell">{{ formatDate(chat.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary Stats -->
      <div v-if="chatStore.agentChatHistory.length > 0" class="stats-summary">
        <div class="stat-card">
          <span class="stat-icon"><HeroIcon name="clipboard-document-list" /></span>
          <span class="stat-value">{{ chatStore.agentChatHistory.length }}</span>
          <span class="stat-label">Chats cerrados</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon"><HeroIcon name="star" /></span>
          <span class="stat-value">{{ averageRating }}</span>
          <span class="stat-label">CalificaciÃ³n promedio</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon"><HeroIcon name="clock" /></span>
          <span class="stat-value">{{ averageResponseTime }}</span>
          <span class="stat-label">Tiempo de respuesta promedio</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon"><HeroIcon name="chart-bar" /></span>
          <span class="stat-value">{{ averageDuration }}</span>
          <span class="stat-label">DuraciÃ³n promedio</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import HeroIcon from '@/components/ui/HeroIcon.vue'

const chatStore = useChatStore()

const loading = ref(true)

onMounted(async () => {
  await chatStore.getAgentHistory()
  loading.value = false
})

function getInitials(name?: string): string {
  if (!name) return 'C'
  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase()
  }
  return (name.substring(0, 2) || 'C').toUpperCase()
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function getResponseClass(seconds: number): string {
  if (seconds <= 60) return 'fast'
  if (seconds <= 300) return 'normal'
  return 'slow'
}

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

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const averageRating = computed(() => {
  const ratedChats = chatStore.agentChatHistory.filter(c => c.rating)
  if (ratedChats.length === 0) return 'â€”'
  const avg = ratedChats.reduce((sum, c) => sum + (c.rating || 0), 0) / ratedChats.length
  return avg.toFixed(1)
})

const averageResponseTime = computed(() => {
  const chatsWithResponse = chatStore.agentChatHistory.filter(c => c.firstResponseSeconds !== undefined)
  if (chatsWithResponse.length === 0) return 'â€”'
  const avg = chatsWithResponse.reduce((sum, c) => sum + (c.firstResponseSeconds || 0), 0) / chatsWithResponse.length
  return formatDuration(Math.round(avg))
})

const averageDuration = computed(() => {
  const chatsWithDuration = chatStore.agentChatHistory.filter(c => c.durationSeconds !== undefined)
  if (chatsWithDuration.length === 0) return 'â€”'
  const avg = chatsWithDuration.reduce((sum, c) => sum + (c.durationSeconds || 0), 0) / chatsWithDuration.length
  return formatDuration(Math.round(avg))
})
</script>

<style scoped>
.history-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg);
}

.history-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  margin: 0 0 0.5rem;
}

.history-table-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th {
  background: var(--color-surface-muted-2);
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.85rem;
  border-bottom: 2px solid var(--color-border);
}

.history-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--color-surface-muted-3);
  font-size: 0.9rem;
  color: var(--color-text-strong);
}

.history-table tr:last-child td {
  border-bottom: none;
}

.history-table tr:hover td {
  background: var(--color-surface-muted-2);
}

.client-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.client-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
}

.subject-cell {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.response-time {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.response-time.fast {
  background: #e8f5e9;
  color: var(--color-success-dark);
}

.response-time.normal {
  background: var(--color-warning-soft);
  color: var(--color-warning-dark);
}

.response-time.slow {
  background: var(--color-danger-soft);
  color: var(--color-danger-dark);
}

.no-response, .no-rating, .no-feedback {
  color: var(--color-text-subtle);
  font-style: italic;
}

.rating-stars {
  display: flex;
  gap: 0.1rem;
}

.star {
  font-size: 1rem;
  color: var(--color-border-soft);
  display: inline-flex;
  align-items: center;
}

.star.filled {
  color: #f5c542;
}

.star svg {
  width: 1rem;
  height: 1rem;
}

.feedback-text {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.date-cell {
  white-space: nowrap;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

/* Stats Summary */
.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 0.75rem;
  row-gap: 0.15rem;
  align-items: center;
}

.stat-icon {
  grid-row: 1 / span 2;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 20px;
  height: 20px;
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.15rem;
  text-align: left;
}

.stat-label {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  text-align: left;
}

/* Responsive */
@media (max-width: 1024px) {
  .history-table-wrapper {
    overflow-x: auto;
  }
  
  .history-table {
    min-width: 900px;
  }
}

@media (max-width: 600px) {
  .history-header {
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }
  
  .header-info {
    flex-direction: column;
  }
  
  .stats-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>





