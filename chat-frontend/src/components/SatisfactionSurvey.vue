<template>
  <Transition name="modal">
    <div v-if="show" class="survey-overlay" @click.self="$emit('close')">
      <div class="survey-modal">
        <div class="survey-header">
          <h2>¿Cómo fue tu experiencia?</h2>
          <button class="close-btn" @click="$emit('close')">
            <HeroIcon name="x-circle" />
          </button>
        </div>

        <div class="survey-body">
          <p class="survey-subtitle">Tu opinión nos ayuda a mejorar</p>

          <!-- Star Rating -->
          <div class="rating-section">
            <div class="stars">
              <button
                v-for="star in 5"
                :key="star"
                class="star-btn"
                :class="{ active: star <= rating, hover: star <= hoverRating }"
                @click="rating = star"
                @mouseenter="hoverRating = star"
                @mouseleave="hoverRating = 0"
              >
                <span class="star" aria-hidden="true">
                  <HeroIcon name="star" />
                </span>
              </button>
            </div>
            <span class="rating-label">{{ ratingLabel }}</span>
          </div>

          <!-- Feedback -->
          <div class="feedback-section">
            <label for="feedback">Comentarios (opcional)</label>
            <textarea
              id="feedback"
              v-model="feedback"
              placeholder="Cuéntanos más sobre tu experiencia..."
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="survey-footer">
          <button class="skip-btn" @click="$emit('close')">
            Omitir
          </button>
          <button 
            class="submit-btn" 
            @click="submitSurvey"
            :disabled="rating === 0"
          >
            Enviar valoración
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import HeroIcon from '@/components/ui/HeroIcon.vue'

const props = defineProps<{
  show: boolean
  chatId: number
}>()

const emit = defineEmits<{
  close: []
  submit: [rating: number, feedback: string]
}>()

const rating = ref(0)
const hoverRating = ref(0)
const feedback = ref('')

const ratingLabel = computed(() => {
  const labels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente']
  return labels[hoverRating.value || rating.value] || 'Selecciona una calificación'
})

function submitSurvey() {
  if (rating.value === 0) return
  emit('submit', rating.value, feedback.value)
}
</script>

<style scoped>
.survey-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.survey-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.survey-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: var(--gradient-primary);
  color: white;
}

.survey-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.survey-body {
  padding: 1.5rem;
}

.survey-subtitle {
  text-align: center;
  color: var(--color-text-muted);
  margin: 0 0 1.5rem;
  font-size: 0.95rem;
}

.rating-section {
  text-align: center;
  margin-bottom: 1.5rem;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  transition: transform 0.15s;
}

.star-btn:hover {
  transform: scale(1.2);
}

.star {
  font-size: 2.5rem;
  color: var(--color-border-soft);
  transition: color 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.star-btn.active .star,
.star-btn.hover .star {
  color: #f5c542;
}

.star svg {
  width: 2.4rem;
  height: 2.4rem;
}

.rating-label {
  display: block;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  min-height: 1.5rem;
}

.feedback-section {
  margin-top: 1rem;
}

.feedback-section label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
}

.feedback-section textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border-soft);
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
}

.feedback-section textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.survey-footer {
  display: flex;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border-soft-2);
  background: #f9f9f9;
}

.skip-btn {
  padding: 0.75rem 1.25rem;
  border: 1px solid var(--color-border-soft);
  border-radius: 8px;
  background: white;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.skip-btn:hover {
  background: var(--color-surface-muted);
}

.submit-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--gradient-primary);
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animation */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .survey-modal,
.modal-leave-to .survey-modal {
  transform: scale(0.9) translateY(20px);
}
</style>



