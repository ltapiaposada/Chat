<template>
  <div class="client-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="logo"><HeroIcon name="chat-bubble-left-right" /></span>
        <h2>Soporte</h2>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/client" class="nav-item" exact-active-class="active">
          <span class="nav-icon"><HeroIcon name="home" /></span>
          <span class="nav-text">Inicio</span>
        </router-link>

        <router-link to="/client/history" class="nav-item" exact-active-class="active">
          <span class="nav-icon"><HeroIcon name="clipboard-document-list" /></span>
          <span class="nav-text">Mis Chats</span>
          <span v-if="closedChatsCount > 0" class="nav-badge">
            {{ closedChatsCount }}
          </span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">
            {{ getInitials(authStore.name) }}
          </div>
          <div class="user-details">
            <span class="user-name">{{ authStore.name }}</span>
            <span class="user-status" :class="{ online: chatStore.isConnected }">
              {{ chatStore.isConnected ? 'En línea' : 'Desconectado' }}
            </span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main content area -->
    <div class="main-wrapper">
      <!-- Navbar -->
      <header class="navbar">
        <div class="navbar-left">
          <h1 class="page-title">{{ pageTitle }}</h1>
        </div>

        <div class="navbar-right">
          <button class="navbar-btn logout-btn" @click="handleLogout" title="Salir">
            <span class="btn-icon"><HeroIcon name="arrow-right-on-rectangle" /></span>
            <span class="btn-text">Salir</span>
          </button>
        </div>
      </header>

      <!-- Content -->
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import HeroIcon from '@/components/ui/HeroIcon.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    'client-home': 'Bienvenido',
    'client-history': 'Mis Chats'
  }
  return titles[route.name as string] || 'Soporte'
})

const closedChatsCount = computed(() => {
  return chatStore.clientChatHistory.length
})

onMounted(() => {
  if (!authStore.isAuthenticated || authStore.role !== 'client') {
    router.push('/')
    return
  }
  
  // Load client history
  chatStore.getClientHistory()
})

function getInitials(name?: string): string {
  if (!name) return 'C'
  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase()
  }
  return (name.substring(0, 2) || 'C').toUpperCase()
}

function handleLogout() {
  if (confirm('¿Estás seguro de que deseas salir?')) {
    chatStore.disconnectSocket()
    chatStore.reset()
    authStore.logout()
    router.push('/')
  }
}
</script>

<style scoped>
.client-layout {
  display: flex;
  height: 100vh;
  height: 100dvh;
  background: var(--color-bg);
  min-width: 0;
}

/* Sidebar */
.sidebar {
  width: 260px;
  min-width: 260px;
  background: var(--gradient-primary);
  display: flex;
  flex-direction: column;
  color: white;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header .logo {
  font-size: 1.75rem;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  margin: 0 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: all 0.2s;
  position: relative;
  border-radius: 12px;
  min-height: 44px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.9);
}

.nav-icon {
  font-size: 1.2rem;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.nav-text {
  font-size: 0.95rem;
  font-weight: 500;
}

.nav-badge {
  margin-left: auto;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 500;
}

.user-status {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.user-status.online {
  color: var(--color-success);
}

/* Main wrapper */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  min-height: 60px;
}

.navbar-left {
  display: flex;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text);
  font-weight: 600;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.navbar-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text-soft);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.navbar-btn:hover {
  background: var(--color-surface-muted);
  border-color: var(--color-border-strong);
}

.logout-btn:hover {
  background: var(--color-danger-soft);
  border-color: var(--color-danger-border);
  color: var(--color-danger-dark);
}

.btn-icon {
  font-size: 1rem;
}

.btn-text {
  font-weight: 500;
}

/* Main content */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Responsive */
@media (min-width: 641px) and (max-width: 1024px) {
  .sidebar {
    width: 210px;
    min-width: 210px;
  }

  .sidebar-footer {
    padding: 0.75rem 1rem;
  }

  .sidebar-header {
    padding: 1rem;
  }

  .sidebar-nav {
    padding: 0.75rem 0;
    gap: 0.4rem;
  }

  .nav-item {
    justify-content: flex-start;
    margin: 0 0.6rem;
    padding: 0.65rem 0.8rem;
  }

  .navbar {
    padding: 0.65rem 1rem;
  }

  .page-title {
    font-size: 1.05rem;
  }
}

@media (max-width: 640px) {
  .client-layout {
    flex-direction: column;
    height: 100dvh;
  }

  .sidebar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    min-width: 0;
    height: calc(62px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 40;
    flex-direction: row;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
  }

  .sidebar-header,
  .sidebar-footer {
    display: none;
  }

  .sidebar-nav {
    flex-direction: row;
    align-items: center;
    width: 100%;
    padding: 0.35rem;
    gap: 0.35rem;
  }

  .nav-item {
    flex: 1;
    margin: 0;
    justify-content: center;
    padding: 0.55rem 0.35rem;
    min-height: 46px;
  }

  .nav-item.active {
    box-shadow: none;
    background: transparent;
    border: none;
  }

  .nav-item .nav-icon {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    transition: background 0.2s, color 0.2s;
  }

  .nav-item:hover {
    background: transparent;
  }

  .nav-item:hover .nav-icon {
    background: rgba(255, 255, 255, 0.14);
  }

  .nav-item.active .nav-icon {
    background: rgba(255, 255, 255, 0.24);
    color: #ffffff;
  }

  .nav-text {
    display: none;
  }

  .nav-badge {
    position: absolute;
    top: 6px;
    left: calc(50% + 8px);
    right: auto;
    min-width: 18px;
    height: 18px;
    font-size: 0.65rem;
    background: #ffb300;
    color: #1f2933;
  }

  .main-wrapper {
    padding-bottom: calc(62px + env(safe-area-inset-bottom));
  }

  .navbar {
    padding: 0.55rem 0.75rem;
    min-height: 52px;
  }

  .page-title {
    font-size: 1rem;
    max-width: 65vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>






