<template>
  <Teleport to="body">
    <Transition name="history-modal">
      <div v-if="show" class="history-modal-backdrop" @click.self="$emit('close')">
        <section class="history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
          <header>
            <div>
              <h2 id="history-title">Mis chats</h2>
              <p>Consulta tus conversaciones anteriores</p>
            </div>
            <button type="button" aria-label="Cerrar historial" @click="$emit('close')">×</button>
          </header>

          <main>
            <div v-if="chatStore.clientChatHistory.length === 0" class="empty-state">
              <HeroIcon name="inbox" />
              <strong>Sin conversaciones anteriores</strong>
              <span>Cuando finalices una conversación aparecerá aquí.</span>
            </div>
            <button
              v-for="chat in chatStore.clientChatHistory"
              v-else
              :key="chat.id"
              class="history-card"
              type="button"
              @click="$emit('select', chat.id)"
            >
              <div class="card-heading">
                <div>
                  <strong>{{ chat.subject || 'Conversación de soporte' }}</strong>
                  <small>{{ formatDate(chat.createdAt) }}</small>
                </div>
                <div v-if="chat.rating" class="rating" :aria-label="`${chat.rating} de 5 estrellas`">
                  <span v-for="star in 5" :key="star" :class="{ filled: star <= chat.rating }">★</span>
                </div>
                <small v-else>Sin calificar</small>
              </div>
              <div class="meta">
                <span><HeroIcon name="user" /> {{ chat.agentName || 'Agente' }}</span>
                <span v-if="chat.durationSeconds"><HeroIcon name="clock" /> {{ formatDuration(chat.durationSeconds) }}</span>
              </div>
              <p v-if="chat.feedback" class="feedback">“{{ chat.feedback }}”</p>
            </button>
          </main>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import HeroIcon from '@/components/ui/HeroIcon.vue'

const props = defineProps<{ show: boolean }>()
defineEmits<{ close: []; select: [chatId: number] }>()
const chatStore = useChatStore()

watch(() => props.show, show => { if (show) chatStore.getClientHistory() }, { immediate: true })

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) return `${seconds}s`
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
</script>

<style scoped>
.history-modal-backdrop { position: fixed; inset: 0; z-index: 2147483646; display: grid; place-items: center; padding: 24px; background: rgba(15,23,42,.62); }
.history-modal { width: min(680px, 100%); max-height: min(720px, calc(100dvh - 48px)); display: flex; flex-direction: column; overflow: hidden; border-radius: 18px; background: var(--color-bg); box-shadow: 0 24px 70px rgba(15,23,42,.36); }
.history-modal > header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; color: white; background: var(--gradient-primary); }
.history-modal h2 { margin: 0; font-size: 1.3rem; }
.history-modal header p { margin: 3px 0 0; opacity: .78; font-size: .85rem; }
.history-modal header button { width: 36px; height: 36px; border: 0; border-radius: 50%; background: rgba(255,255,255,.12); color: white; cursor: pointer; font-size: 1.7rem; }
.history-modal main { display: grid; gap: 12px; padding: 20px; overflow-y: auto; }
.history-card { display: grid; gap: 12px; width: 100%; padding: 18px; border: 1px solid var(--color-border); border-radius: 12px; background: white; color: var(--color-text); cursor: pointer; text-align: left; box-shadow: var(--shadow-sm); }
.history-card:hover { border-color: var(--color-primary-border); box-shadow: var(--shadow-md); }
.card-heading { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--color-surface-muted-3); }
.card-heading > div:first-child { display: grid; gap: 4px; }
small { color: var(--color-text-subtle); }
.rating { display: flex; color: var(--color-border-soft); }
.rating .filled { color: #ffc107; }
.meta { display: flex; flex-wrap: wrap; gap: 18px; color: var(--color-text-muted); font-size: .86rem; }
.meta span { display: inline-flex; align-items: center; gap: 6px; }
.feedback { margin: 0; padding: 10px 12px; border-radius: 8px; background: var(--color-surface-muted-2); color: var(--color-text-soft); font-style: italic; }
.empty-state { min-height: 280px; display: grid; place-content: center; justify-items: center; gap: 8px; color: var(--color-text-muted); text-align: center; }
.empty-state > :first-child { font-size: 3rem; }
.history-modal-enter-active,.history-modal-leave-active { transition: opacity .2s ease; }
.history-modal-enter-from,.history-modal-leave-to { opacity: 0; }
@media (max-width: 600px) { .history-modal-backdrop { padding: 0; } .history-modal { width: 100%; height: 100dvh; max-height: none; border-radius: 0; } .card-heading { flex-direction: column; } }
</style>
