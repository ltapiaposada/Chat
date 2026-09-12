<script setup lang="ts">
import HeroIcon from '@/components/ui/HeroIcon.vue'
import { computed } from 'vue'
import { useAppNotification } from '@/composables/useAppNotification'
const service = useAppNotification()
const notifications = computed(() => service.notifications.value)
const dismiss = service.dismiss
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="notification" tag="div" class="notifications" aria-live="polite" aria-relevant="additions">
      <div v-for="item in notifications" :key="item.id" class="notification" :class="item.tone" role="status">
        <span class="notification-icon"><HeroIcon :name="item.tone === 'success' ? 'check-circle' : 'information-circle'" /></span>
        <p>{{ item.message }}</p>
        <button type="button" aria-label="Cerrar notificación" @click="dismiss(item.id)">×</button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.notifications{position:fixed;top:24px;right:24px;z-index:10000;display:flex;flex-direction:column;gap:12px;width:min(420px,calc(100vw - 32px));pointer-events:none}
.notification{display:flex;align-items:center;gap:12px;padding:16px 18px;background:#fff;border:1px solid #dfe3ee;border-radius:14px;box-shadow:0 12px 36px rgba(21,23,46,.2);pointer-events:auto;color:#15172e}
.notification-icon{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;border-radius:50%;background:#e4f7ef;color:#117a56}
.notification-icon svg{width:23px;height:23px}
.notification p{margin:0;flex:1;font-size:.9rem;font-weight:650;line-height:1.5}
.notification button{display:grid;place-items:center;flex:0 0 28px;width:28px;height:28px;padding:0;border:0;border-radius:7px;background:transparent;color:#6c6f8d;font-size:23px;cursor:pointer}
.notification button:hover{background:#f0f1f7;color:#15172e}
.notification button:focus-visible{outline:2px solid #5849e0;outline-offset:2px}
.notification.error .notification-icon{background:#ffebee;color:#c62828}
.notification.info .notification-icon{background:#eeebfd;color:#5849e0}
.notification-enter-active,.notification-leave-active,.notification-move{transition:opacity .2s ease,transform .2s ease}
.notification-enter-from,.notification-leave-to{opacity:0;transform:translateY(-12px)}
@media(max-width:600px){.notifications{top:16px;right:16px}}
@media(prefers-reduced-motion:reduce){.notification-enter-active,.notification-leave-active,.notification-move{transition:none}}
</style>
