<template>
  <div class="client-home">
    <div class="welcome-content">
      <div class="welcome-header">
        <span class="welcome-icon"><HeroIcon name="clipboard-document-list" /></span>
        <h1>¡Hola, {{ authStore.name }}!</h1>
        <p class="welcome-subtitle">¿En qué podemos ayudarte hoy?</p>
      </div>

      <div class="features">
        <div class="feature">
          <span class="feature-icon"><HeroIcon name="chat-bubble-left-right" /></span>
          <div class="feature-text">
            <h3>Chat en vivo</h3>
            <p>Usa el botón en la esquina inferior derecha para iniciar una conversación</p>
          </div>
        </div>
        <div class="feature">
          <span class="feature-icon"><HeroIcon name="sparkles" /></span>
          <div class="feature-text">
            <h3>Respuesta rápida</h3>
            <p>Nuestros agentes están listos para ayudarte</p>
          </div>
        </div>
        <div class="feature">
          <span class="feature-icon"><HeroIcon name="clipboard-document-list" /></span>
          <div class="feature-text">
            <h3>Historial</h3>
            <p>Revisa tus conversaciones anteriores en "Mis Conversaciones"</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import HeroIcon from '@/components/ui/HeroIcon.vue'

const authStore = useAuthStore()
</script>

<style scoped>
.client-home {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
}

.welcome-content {
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.welcome-header {
  margin-bottom: 2.5rem;
}

.welcome-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.welcome-header h1 {
  margin: 0 0 0.5rem;
  font-size: 2rem;
  color: var(--color-text);
}

.welcome-subtitle {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 1.1rem;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: left;
}

.feature {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.feature-text h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  color: var(--color-text);
}

.feature-text p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

/* Responsive */
@media (max-width: 600px) {
  .client-home {
    padding: 1rem;
  }

  .welcome-icon {
    font-size: 3rem;
  }

  .welcome-header h1 {
    font-size: 1.5rem;
  }

  .feature {
    padding: 1rem;
  }
}
</style>



