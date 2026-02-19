import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export type UserRole = 'client' | 'agent'

interface AuthState {
  userId: number | null
  name: string
  role: UserRole | null
}

export const useAuthStore = defineStore('auth', () => {
  const userId = ref<number | null>(null)
  const name = ref<string>('')
  const role = ref<UserRole | null>(null)

  const isAuthenticated = computed(() => userId.value !== null && role.value !== null)
  const isAgent = computed(() => role.value === 'agent')
  const isClient = computed(() => role.value === 'client')

  function login(id: number, userName: string, userRole: UserRole) {
    userId.value = id
    name.value = userName
    role.value = userRole
    
    // Persist to localStorage
    localStorage.setItem('auth', JSON.stringify({ userId: id, name: userName, role: userRole }))
  }

  function logout() {
    userId.value = null
    name.value = ''
    role.value = null
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
    isAuthenticated,
    isAgent,
    isClient,
    login,
    logout,
    restoreSession
  }
})
