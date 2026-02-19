<template>
  <span
    ref="root"
    class="ui-tooltip"
    @mouseenter="handleEnter"
    @mouseleave="handleLeave"
  >
    <slot />
  </span>
  <Teleport to="body">
    <span
      v-if="show"
      class="ui-tooltip-bubble"
      :class="`placement-${props.placement}`"
      role="tooltip"
      :style="bubbleStyle"
    >
      {{ text }}
    </span>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}>(), {
  placement: 'top'
})

const root = ref<HTMLElement | null>(null)
const show = ref(false)
const pos = ref({ top: 0, left: 0 })

const bubbleStyle = computed(() => ({
  top: `${pos.value.top}px`,
  left: `${pos.value.left}px`
}))

function updatePosition() {
  const el = root.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const offset = 4
  let top = Math.max(8, rect.top - offset)
  let left = rect.left + rect.width / 2
  if (props.placement === 'bottom') {
    top = rect.bottom + offset
  }
  if (props.placement === 'left') {
    top = rect.top + rect.height / 2
    left = rect.left - offset
  }
  if (props.placement === 'right') {
    top = rect.top + rect.height / 2
    left = rect.right + offset
  }
  pos.value = {
    top,
    left
  }
}

function handleEnter() {
  show.value = true
  nextTick(() => updatePosition())
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
}

function handleLeave() {
  show.value = false
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
}

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
})
</script>

<style scoped>
.ui-tooltip-bubble {
  position: fixed;
  transform: translate(-50%, -110%);
  background: var(--color-primary);
  color: white;
  font-size: 0.72rem;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 2000;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
}

.ui-tooltip-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--color-primary);
}

.ui-tooltip-bubble.placement-bottom::after {
  top: auto;
  bottom: 100%;
  border-top: none;
  border-bottom: 6px solid var(--color-primary);
}

.ui-tooltip-bubble.placement-bottom {
  transform: translate(-50%, 10%);
}

.ui-tooltip-bubble.placement-left {
  transform: translate(-110%, -50%);
}

.ui-tooltip-bubble.placement-right {
  transform: translate(10%, -50%);
}

.ui-tooltip-bubble.placement-left::after {
  top: 50%;
  left: 100%;
  transform: translateY(-50%);
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 6px solid var(--color-primary);
  border-right: none;
}

.ui-tooltip-bubble.placement-right::after {
  top: 50%;
  right: 100%;
  left: auto;
  transform: translateY(-50%);
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-right: 6px solid var(--color-primary);
  border-left: none;
}
</style>
