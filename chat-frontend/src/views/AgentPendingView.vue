<template>
  <div class="pending-container">
    <div class="pending-content">
      <div class="section-head">
        <div>
          <p>{{ chatStore.pendingChats.length }} {{ chatStore.pendingChats.length === 1 ? 'conversación esperando asignación' : 'conversaciones esperando asignación' }}</p>
        </div>
        <div class="head-actions">
          <UiTooltip :text="chatStore.soundByType.pending ? 'Silenciar sonido' : 'Activar sonido'">
            <button class="icon-btn" :class="{ active: chatStore.soundByType.pending }" type="button" :aria-label="chatStore.soundByType.pending ? 'Silenciar sonido' : 'Activar sonido'" :aria-pressed="chatStore.soundByType.pending" @click="chatStore.toggleSoundType('pending')">
              <HeroIcon :name="chatStore.soundByType.pending ? 'speaker-wave' : 'speaker-x-mark'" />
            </button>
          </UiTooltip>
          <button class="refresh-btn" type="button" @click="refreshPendingChats"><HeroIcon name="arrow-path" />Actualizar</button>
        </div>
      </div>

      <div class="queue">
        <div v-if="!chatStore.pendingChats.length" class="empty-state">
          <HeroIcon name="inbox" />
          <h3>No hay chats pendientes</h3>
          <p>Todos los clientes han sido atendidos</p>
        </div>
        <div v-for="chat in chatStore.pendingChats" :key="chat.id" class="queue-row">
          <div class="avatar">{{ initials(chat.clientName) }}</div>
          <div class="row-body">
            <div class="top-line">
              <span class="client-name">{{ chat.clientName || `Cliente #${chat.clientId}` }}</span>
              <span v-if="chat.departmentName" class="department" :class="departmentClass(chat.departmentName)"><span class="dot" />{{ chat.departmentName }}</span>
              <span v-if="chat.channel === 'whatsapp'" class="whatsapp">WhatsApp</span>
            </div>
            <p class="message-preview" :title="chat.lastMessage || chat.subject">{{ chat.lastMessage || (chat.channel !== 'whatsapp' ? chat.subject : '') || 'Sin mensajes' }}</p>
          </div>
          <div class="row-meta">
            <span class="wait" :class="waitClass(chat.createdAt)"><HeroIcon name="clock" />{{ formatWaitTime(chat.createdAt) }}</span>
            <button class="take-btn" type="button" @click="assignChat(chat.id)">Tomar chat</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import UiTooltip from '@/components/ui/UiTooltip.vue'

const router = useRouter()
const chatStore = useChatStore()
const now = ref(Date.now())
let refreshInterval: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  chatStore.getPendingChats()
  refreshInterval = setInterval(() => { now.value = Date.now(); chatStore.getPendingChats() }, 10000)
})
onUnmounted(() => clearInterval(refreshInterval))
function refreshPendingChats() { now.value = Date.now(); chatStore.getPendingChats() }
function assignChat(chatId: number) { chatStore.assignChat(chatId); router.push('/agent/dashboard') }
function initials(name?: string) { return (name || 'Cliente').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() }
function waitMinutes(createdAt: Date) { const time = new Date(createdAt).getTime(); return Number.isFinite(time) ? Math.max(0, Math.floor((now.value - time) / 60000)) : 0 }
function waitClass(createdAt: Date) { const minutes = waitMinutes(createdAt); return minutes >= 10 ? 'urgent' : minutes >= 5 ? 'warn' : 'normal' }
function formatWaitTime(createdAt: Date) { const minutes = waitMinutes(createdAt); return minutes < 1 ? 'Ahora' : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}` }
function departmentClass(name: string) { const text = name.toLocaleLowerCase('es'); return text.includes('venta') ? 'sales' : text.includes('factura') ? 'billing' : 'support' }
</script>

<style scoped>
.pending-container{height:100%;overflow-y:auto;background:#f4f5fa;color:#14141f}
.pending-content{max-width:908px;width:100%;margin:0 auto;padding:48px 24px}
.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px}
.section-head p{margin:0;font-size:13.5px;color:#5b5f73}
.head-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}
.icon-btn{width:36px;height:36px;padding:0;border-radius:10px;border:1px solid #e7e8f0;background:#fff;display:flex;align-items:center;justify-content:center;color:#5b5f73;cursor:pointer}
.icon-btn.active{color:#4338ca;border-color:#eef0ff;background:#eef0ff}
.icon-btn svg{width:16px;height:16px}
.refresh-btn{height:36px;padding:0 14px 0 12px;border-radius:10px;border:1px solid #e7e8f0;background:#fff;display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600;color:#14141f;cursor:pointer}
.refresh-btn svg{width:14px;height:14px}
.icon-btn:hover,.refresh-btn:hover{background:#f5f5fb}
.queue{background:#fff;border:1px solid #e7e8f0;border-radius:16px;overflow:hidden}
.queue-row{display:flex;align-items:stretch;padding:18px 22px;border-bottom:1px solid #e7e8f0;transition:background .15s ease}
.queue-row:last-child{border-bottom:0}
.queue-row:hover{background:#f0effb}
.queue-row:hover .avatar{background:#e4e0fc}
.avatar{transition:background .15s ease}
.queue-row:focus-within{background:#f0effb}
.avatar{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;margin-right:16px;background:#eef0ff;color:#4338ca}
.row-body{flex:1;min-width:0}
.top-line{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:5px}
.client-name{font-weight:600;font-size:15px;color:#14141f;overflow-wrap:anywhere}
.department{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#5b5f73}
.dot{width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0}
.sales .dot{background:#7c3aed}.billing .dot{background:#0d9488}
.whatsapp{padding:2px 6px;border-radius:5px;background:#eaf8f1;color:#117a56;font-size:11px;font-weight:600}
.message-preview{margin:0;font-size:14px;color:#5b5f73;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row-meta{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;margin-left:20px;flex-shrink:0;gap:12px}
.wait{font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px;white-space:nowrap}
.wait.normal{color:#2f9e6e}.wait.warn{color:#b45309}.wait.urgent{color:#c0362c}.wait svg{width:13px;height:13px}
.take-btn{height:36px;padding:0 16px;border-radius:9px;border:0;background:#4338ca;color:#fff;font-size:13.5px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .15s ease}
.take-btn:hover{background:#372fb0}
button:focus-visible{outline:2px solid #4338ca;outline-offset:3px}
.empty-state{text-align:center;padding:56px 24px}.empty-state>svg{width:42px;height:42px;color:#9497aa}.empty-state h3{margin:14px 0 6px;font-size:16px}.empty-state p{font-size:13.5px;color:#5b5f73}
@media(max-width:600px){.pending-content{padding:24px 16px}.section-head{align-items:flex-start;flex-wrap:wrap;gap:14px}.queue-row{padding:16px 14px;flex-wrap:wrap}.avatar{margin-right:12px}.row-meta{width:100%;margin:12px 0 0 54px;flex-direction:row;align-items:center}.top-line{gap:6px 10px}}
</style>
