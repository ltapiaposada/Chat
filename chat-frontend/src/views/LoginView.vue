<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Chat de Soporte</h1>
      
      <!-- Login Form -->
      <div v-if="!showRegister" class="login-form">
        <p class="subtitle">Inicia sesión para continuar</p>
        
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="tu@email.com"
            @keypress.enter="handleLogin"
          />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            @keypress.enter="handleLogin"
          />
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button 
          class="login-btn"
          :disabled="!canLogin || isLoading"
          @click="handleLogin"
        >
          {{ isLoading ? 'Ingresando...' : 'Ingresar' }}
        </button>

        <p class="switch-form">
          ¿No tienes cuenta? 
          <a href="#" @click.prevent="showRegister = true">Regístrate como cliente</a>
        </p>
      </div>

      <!-- Register Form -->
      <div v-else class="login-form">
        <p class="subtitle">Crear cuenta de cliente</p>
        
        <div class="form-group">
          <label for="regName">Nombre</label>
          <input
            id="regName"
            v-model="regName"
            type="text"
            placeholder="Tu nombre"
          />
        </div>

        <div class="form-group">
          <label for="regEmail">Email</label>
          <input
            id="regEmail"
            v-model="regEmail"
            type="email"
            placeholder="tu@email.com"
          />
        </div>

        <div class="form-group">
          <label for="regPassword">Contraseña</label>
          <input
            id="regPassword"
            v-model="regPassword"
            type="password"
            placeholder="Mínimo 4 caracteres"
            @keypress.enter="handleRegister"
          />
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

        <button 
          class="login-btn"
          :disabled="!canRegister || isLoading"
          @click="handleRegister"
        >
          {{ isLoading ? 'Registrando...' : 'Crear cuenta' }}
        </button>

        <p class="switch-form">
          ¿Ya tienes cuenta? 
          <a href="#" @click.prevent="showRegister = false; errorMessage = ''">Inicia sesión</a>
        </p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

// Login state
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showRegister = ref(false)

// Register state
const regName = ref('')
const regEmail = ref('')
const regPassword = ref('')

const canLogin = computed(() => {
  return email.value.trim() && password.value.trim()
})

const canRegister = computed(() => {
  return regName.value.trim() && regEmail.value.trim() && regPassword.value.length >= 4
})

async function handleLogin() {
  if (!canLogin.value) return
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const response = await axios.post(`${API_URL}/api/login`, {
      email: email.value,
      password: password.value
    })
    
    const { user } = response.data
    
    // Login in store
    authStore.login(user.id, user.name, user.role)
    chatStore.connectSocket()
    
    // Redirect based on role
    if (user.role === 'agent') {
      router.push('/agent/pending')
    } else {
      router.push('/client')
    }
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'Error al iniciar sesión'
  } finally {
    isLoading.value = false
  }
}

async function handleRegister() {
  if (!canRegister.value) return
  
  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    const response = await axios.post(`${API_URL}/api/register-client`, {
      name: regName.value,
      email: regEmail.value,
      password: regPassword.value
    })
    
    const { user } = response.data
    
    // Auto login after register
    authStore.login(user.id, user.name, user.role)
    chatStore.connectSocket()
    router.push('/client')
    
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'Error al registrarse'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-primary);
  padding: 1rem;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.login-card h1 {
  margin: 0 0 1.5rem;
  color: var(--color-text);
  font-size: 2rem;
}

.subtitle {
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
}

.login-form {
  text-align: left;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-text);
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border-soft);
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.error-message {
  color: var(--color-danger);
  font-size: 0.875rem;
  margin: 0.5rem 0;
  text-align: center;
}

.success-message {
  color: var(--color-success);
  font-size: 0.875rem;
  margin: 0.5rem 0;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  background: var(--gradient-primary);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: 0.5rem;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-form {
  text-align: center;
  margin-top: 1.5rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.switch-form a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.switch-form a:hover {
  text-decoration: underline;
}

.demo-info {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.75rem;
  color: var(--color-text-subtle);
}

.demo-info p {
  margin: 0.25rem 0;
}

.demo-info code {
  background: var(--color-surface-muted);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  color: var(--color-primary);
}
</style>




