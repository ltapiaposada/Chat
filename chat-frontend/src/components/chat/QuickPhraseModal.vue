<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Nueva frase</h3>
        <button class="modal-close" type="button" @click="$emit('close')">X</button>
      </div>
      <div class="modal-body">
        <label class="field">
          <span>Etiqueta</span>
          <input v-model="localLabel" type="text" placeholder="/hola" />
        </label>
        <label class="field">
          <span>Frase</span>
          <textarea v-model="localText" rows="3" placeholder="Escribe la frase..."></textarea>
        </label>
      </div>
      <div class="modal-footer">
        <button class="ghost-btn" type="button" @click="$emit('close')">Cancelar</button>
        <button class="primary-btn" type="button" @click="save">Guardar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
  label?: string
  text?: string
}>()

const emit = defineEmits<{
  (e: 'save', data: { label: string; text: string }): void
  (e: 'close'): void
}>()

const localLabel = ref('')
const localText = ref('')

watch(
  () => props.show,
  (open) => {
    if (open) {
      localLabel.value = props.label || ''
      localText.value = props.text || ''
    }
  }
)

function save() {
  emit('save', { label: localLabel.value, text: localText.value })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 80;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1rem;
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--color-text-muted);
}

.modal-body {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--color-text-strong);
  font-weight: 700;
}

.field input,
.field textarea {
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
}

.field input:hover,
.field textarea:hover {
  border-color: var(--color-border-strong);
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--color-border-strong);
  box-shadow: 0 0 0 2px rgba(159, 166, 178, 0.25);
}

.modal-footer {
  padding: 0.9rem 1.25rem 1.1rem;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  border-top: 1px solid var(--color-border);
}

.ghost-btn,
.primary-btn {
  border-radius: 8px;
  padding: 0.55rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s, color 0.2s, border-color 0.2s;
}

.ghost-btn {
  border: 1px solid var(--color-border-strong);
  background: white;
  color: var(--color-text);
}

.ghost-btn:hover {
  background: var(--color-surface-muted);
}

.primary-btn {
  border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-2) 100%);
  color: white;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(26, 35, 126, 0.25);
}
</style>


