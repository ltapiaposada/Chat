import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export type UserRole = 'client' | 'agent'

interface AuthState {
  userId: number | null
  name: string
  role: UserRole | null
  token: string
}

export const useAuthStore = defineStore('auth', () => {
  const userId = ref<number | null>(null)
  const name = ref<string>('')
  const role = ref<UserRole | null>(null)
  const token = ref<string>('')

  const isAuthenticated = computed(() => userId.value !== null && role.value !== null && !!token.value)
  const isAgent = computed(() => role.value === 'agent')
  const isClient = computed(() => role.value === 'client')

  function login(id: number, userName: string, userRole: UserRole, authToken: string) {
    userId.value = id
    name.value = userName
    role.value = userRole
    token.value = authToken
    
    // Persist to localStorage
    localStorage.setItem('auth', JSON.stringify({ userId: id, name: userName, role: userRole, token: authToken }))
  }

  function logout() {
    userId.value = null
    name.value = ''
    role.value = null
    token.value = ''
    localStorage.removeItem('auth')
  }

  function restoreSession() {
    const stored = localStorage.getItem('auth')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        userId.value = data.userId
        name.value = data.name
        role.value = data.role
        token.value = typeof data.token === 'string' ? data.token : ''
        if (!token.value) {
          localStorage.removeItem('auth')
          return false
        }
        return true
      } catch {
        localStorage.removeItem('auth')
      }
    }
    return false
  }

  return {
    userId,
    name,
    role,
    token,
    isAuthenticated,
    isAgent,
    isClient,
    login,
    logout,
    restoreSession
  }
})
