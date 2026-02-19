<template>
  <button 
    class="chat-floating-btn"
    :class="{ 'has-unread': (unreadCount ?? 0) > 0 }"
    @click="$emit('toggle')"
    :title="isOpen ? 'Cerrar chat' : 'Abrir chat'"
  >
    <span v-if="!isOpen" class="btn-icon"><HeroIcon name="chat-bubble-left-right" /></span>
    <span v-else class="btn-icon close-icon"><HeroIcon name="x-circle" /></span>
    <span v-if="(unreadCount ?? 0) > 0 && !isOpen" class="unread-badge">
      {{ (unreadCount ?? 0) > 99 ? '99+' : unreadCount }}
    </span>
  </button>
</template>

<script setup lang="ts">
import HeroIcon from '@/components/ui/HeroIcon.vue'
defineProps<{
  isOpen: boolean
  unreadCount?: number
}>()

defineEmits<{
  toggle: []
}>()
</script>

<style scoped>
.chat-floating-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: var(--gradient-primary);
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-floating-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
}

.chat-floating-btn:active {
  transform: scale(0.95);
}

.btn-icon {
  font-size: 1.75rem;
  line-height: 1;
}

.close-icon {
  font-size: 1.5rem;
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: var(--color-danger);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.has-unread {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}
</style>



