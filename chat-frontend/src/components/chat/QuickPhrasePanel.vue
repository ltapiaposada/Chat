<template>
  <div v-if="visible" class="phrase-panel" @mousedown.prevent>
    <div class="phrase-header">
      <span>Frases rapidas</span>
      <button class="add-btn" type="button" @click="$emit('add')">+ Agregar</button>
    </div>
    <div class="phrase-list">
      <button
        v-for="(phrase, index) in phrases"
        :key="phrase.label"
        class="phrase-item"
        :class="{ active: activeIndex === index }"
        type="button"
        @click="$emit('select', phrase)"
      >
        <span class="phrase-label">{{ formatLabel(phrase.label) }}</span>
        <span class="phrase-text">{{ phrase.text }}</span>
      </button>
      <div v-if="phrases.length === 0" class="empty-state">Sin frases. Usa "Agregar".</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QuickPhrase } from '@/composables/useQuickPhrases'

defineProps<{
  visible: boolean
  phrases: QuickPhrase[]
  activeIndex?: number
}>()

defineEmits<{
  (e: 'select', phrase: QuickPhrase): void
  (e: 'add'): void
}>()

function formatLabel(label: string) {
  return label.startsWith('/') ? label.slice(1) : label
}
</script>

<style scoped>
.phrase-panel {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 0.5rem;
  width: min(360px, 90vw);
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
  z-index: 60;
  overflow: hidden;
}

.phrase-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
}

.add-btn {
  border: 1px solid var(--color-primary-border);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
}

.add-btn:hover {
  background: #e1e6ff;
  border-color: #9ea6ff;
  transform: translateY(-1px);
}

.phrase-list {
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.phrase-item {
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  cursor: pointer;
}

.phrase-item:hover {
  background: var(--color-surface-muted);
}

.phrase-item.active {
  background: var(--color-primary-tint);
}

.phrase-label {
  font-size: 0.75rem;
  color: var(--color-primary);
  font-weight: 600;
}

.phrase-text {
  font-size: 0.8rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  padding: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted-2);
}
</style>


