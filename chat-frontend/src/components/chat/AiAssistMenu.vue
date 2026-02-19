<template>
  <div
    class="ai-menu"
    :class="{ disabled: disabled && !busy }"
    ref="root"
    @mouseover="handleMouseEnter"
    @mouseout="handleMouseLeave"
  >
    <button
      class="ai-btn"
      type="button"
      :disabled="disabled || busy"
      @click="toggleMenu"
    >
      {{ busy ? 'IA...' : 'IA' }}
    </button>
    <Teleport to="body">
      <div
        v-if="showTooltip"
        ref="tooltipRef"
        class="ai-tooltip"
        role="tooltip"
        :style="tooltipStyle"
      >
        Escribe un mensaje para usar IA
      </div>
    </Teleport>
    <Teleport to="body">
      <div v-if="isOpen" ref="dropdownRef" class="ai-dropdown" :style="dropdownStyle">
        <button
          v-for="option in options"
          :key="option.id"
          class="ai-option"
          type="button"
          @click="selectOption(option.id)"
        >
          <span class="ai-icon" aria-hidden="true">
            <HeroIcon :name="option.icon" />
          </span>
          <span class="ai-label">{{ option.label }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import HeroIcon from '@/components/ui/HeroIcon.vue'

type Option = { id: string; label: string; icon: string }

const props = withDefaults(defineProps<{
  disabled?: boolean
  busy?: boolean
  options?: Option[]
}>(), {
  disabled: false,
  busy: false,
  options: () => ([
    { id: 'friendlier', label: 'Mas amable', icon: 'face-smile' },
    { id: 'more_formal', label: 'Mas formal', icon: 'briefcase' },
    { id: 'shorter', label: 'Mas breve', icon: 'scissors' },
    { id: 'more_detailed', label: 'Mas detallado', icon: 'document-text' },
    { id: 'fix_grammar', label: 'Corregir ortografia', icon: 'check-badge' },
    { id: 'simplify', label: 'Simplificar', icon: 'adjustments-horizontal' },
    { id: 'summarize', label: 'Resumir', icon: 'document-text' },
    { id: 'translate_en', label: 'Traducir a ingles', icon: 'language' },
    { id: 'translate_es', label: 'Traducir a espanol', icon: 'language' },
    { id: 'steps', label: 'Convertir en pasos', icon: 'list-bullet' },
    { id: 'add_empathy', label: 'Agregar empatia', icon: 'heart' },
    { id: 'professional', label: 'Mensaje profesional', icon: 'briefcase' }
  ])
})

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const isOpen = ref(false)
const root = ref<HTMLElement | null>(null)
const dropdownPos = ref({ top: 0, left: 0, minWidth: 200 })
const dropdownRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const showTooltip = ref(false)
const tooltipPos = ref({ top: 0, left: 0 })

const dropdownStyle = computed(() => ({
  top: `${dropdownPos.value.top}px`,
  left: `${dropdownPos.value.left}px`,
  minWidth: `${dropdownPos.value.minWidth}px`
}))

const tooltipStyle = computed(() => ({
  top: `${tooltipPos.value.top}px`,
  left: `${tooltipPos.value.left}px`
}))


function toggleMenu() {
  if (props.disabled || props.busy) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      updatePosition()
    })
    attachWindowListeners()
  } else {
    detachWindowListeners()
  }
}

function selectOption(id: string) {
  isOpen.value = false
  detachWindowListeners()
  emit('select', id)
}

function handleClick(event: MouseEvent) {
  const target = event.target as Node
  if (!root.value) return
  if (!root.value.contains(target)) {
    isOpen.value = false
    detachWindowListeners()
  }
}

function updatePosition() {
  const el = root.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const dropdownHeight = dropdownRef.value?.offsetHeight || 0
  const minWidth = Math.max(160, rect.width)
  dropdownPos.value = {
    top: Math.max(8, rect.top - 8 - dropdownHeight),
    left: rect.left,
    minWidth
  }
}

function updateTooltipPosition() {
  const el = root.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const top = Math.max(8, rect.top - 10)
  const left = rect.left + rect.width / 2
  tooltipPos.value = { top, left }
}

function handleMouseEnter() {
  if (props.disabled && !props.busy) {
    showTooltip.value = true
    nextTick(() => updateTooltipPosition())
  }
}

function handleMouseLeave() {
  showTooltip.value = false
}


function handleWindowUpdate() {
  if (isOpen.value) updatePosition()
  if (showTooltip.value) updateTooltipPosition()
}

function attachWindowListeners() {
  window.addEventListener('scroll', handleWindowUpdate, true)
  window.addEventListener('resize', handleWindowUpdate)
}

function detachWindowListeners() {
  window.removeEventListener('scroll', handleWindowUpdate, true)
  window.removeEventListener('resize', handleWindowUpdate)
}

onMounted(() => {
  document.addEventListener('click', handleClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClick)
  detachWindowListeners()
})
</script>

<style scoped>
.ai-menu {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.ai-tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  background: var(--color-primary);
  color: white;
  font-size: 0.72rem;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
}

.ai-tooltip::after {
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

.ai-btn {
  position: relative;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  background: white;
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  overflow: visible;
}

.ai-btn:hover:not(:disabled) {
  background: var(--color-primary-soft);
  border-color: var(--color-primary-border);
}

.ai-btn::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 999px;
  border: 3px solid rgba(26, 35, 126, 0.95);
  opacity: 0;
  transform: scale(0.85);
  pointer-events: none;
  animation: ai-pulse 2.2s ease-out infinite;
}

.ai-btn:active::after,
.ai-btn:focus-visible::after {
  animation: ai-pulse-strong 0.7s ease-out;
}

.ai-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-dropdown {
  position: fixed;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  min-width: 160px;
  max-width: 240px;
  text-align: left;
  z-index: 30;
  padding: 0.35rem;
  max-height: 280px;
  overflow-y: auto;
}

.ai-option {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.5rem 0.5rem;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--color-text-strong);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ai-option:hover {
  background: var(--color-surface-muted);
}

.ai-icon {
  width: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ai-label {
  flex: 1;
}

@keyframes ai-pulse {
  0% {
    opacity: 0.85;
    transform: scale(0.85);
  }
  100% {
    opacity: 0;
    transform: scale(1.2);
  }
}

@keyframes ai-pulse-strong {
  0% {
    opacity: 0.85;
    transform: scale(0.85);
  }
  100% {
    opacity: 0;
    transform: scale(1.4);
  }
}
</style>



