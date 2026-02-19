<template>
  <div class="agent-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="logo">
          <HeroIcon name="chat-bubble-left-right" />
        </span>
        <h2>Soporte</h2>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/agent/dashboard" class="nav-item" active-class="active">
          <span class="nav-icon"><HeroIcon name="chat-bubble-left-right" /></span>
          <span class="nav-text">Mis Chats</span>
          <span v-if="chatStore.activeChats.length > 0" class="nav-badge">
            {{ chatStore.activeChats.length }}
          </span>
        </router-link>

        <router-link to="/agent/pending" class="nav-item" active-class="active">
          <span class="nav-icon"><HeroIcon name="clipboard-document-list" /></span>
          <span class="nav-text">Pendientes</span>
          <span v-if="chatStore.pendingChats.length > 0" class="nav-badge alert">
            {{ chatStore.pendingChats.length }}
          </span>
        </router-link>

        <router-link to="/agent/global-chat" class="nav-item" active-class="active">
          <span class="nav-icon icon-white"><HeroIcon name="user-group" /></span>
          <span class="nav-text">Equipo</span>
          <span v-if="teamUnreadCount > 0" class="nav-badge alert">
            {{ teamUnreadCount }}
          </span>
        </router-link>

        <router-link to="/agent/groups" class="nav-item" active-class="active">
          <span class="nav-icon"><HeroIcon name="users" /></span>
          <span class="nav-text">Grupos</span>
          <span v-if="groupsUnreadCount > 0" class="nav-badge alert">
            {{ groupsUnreadCount }}
          </span>
        </router-link>

        <router-link to="/agent/history" class="nav-item" active-class="active">
          <span class="nav-icon"><HeroIcon name="chart-bar" /></span>
          <span class="nav-text">Historial</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="agent-info">
          <div class="agent-avatar">
            {{ getInitials(authStore.name) }}
          </div>
          <div class="agent-details">
            <span class="agent-name">{{ authStore.name }}</span>
            <span class="agent-status" :class="{ online: chatStore.isConnected }">
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
          <div class="page-title-wrap">
            <h1 class="page-title">{{ pageTitle }}</h1>
            <div v-if="route.name === 'agent-global-chat'" class="page-actions">
              <UiTooltip
                placement="bottom"
                :text="chatStore.soundEnabled ? 'Silenciar sonido' : 'Activar sonido'"
              >
                <button
                  class="sound-toggle"
                  type="button"
                  @click="chatStore.toggleSoundEnabled()"
                >
                  <HeroIcon :name="chatStore.soundEnabled ? 'speaker-wave' : 'speaker-x-mark'" />
                </button>
              </UiTooltip>
              <span class="online-count">{{ agentOnlineCount }} / {{ agentTotalCount }}</span>
            </div>
          </div>
        </div>

        <div class="navbar-right">
          <button class="logout-icon-btn" type="button" @click="handleLogout" title="Salir">
            <HeroIcon name="arrow-right-on-rectangle" />
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
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import HeroIcon from '@/components/ui/HeroIcon.vue'
import UiTooltip from '@/components/ui/UiTooltip.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    'agent-dashboard': 'Mis Conversaciones',
    'agent-pending': 'Chats Pendientes',
    'agent-history': 'Historial',
    'agent-global-chat': 'Equipo de Agentes',
    'agent-groups': 'Grupos'
  }
  return titles[route.name as string] || 'Panel de Agente'
})

const agentTotalCount = computed(() => {
  const base = chatStore.availableAgents.length
  return base > 0 ? base : 1
})

const agentOnlineCount = computed(() => {
  const base = chatStore.onlineAgentIds?.size || 0
  return base > 0 ? base : 1
})

const teamUnreadCount = computed(() => {
  const dmMap = chatStore.directUnreadCounts
  const groupMap = chatStore.groupUnreadCounts
  let total = 0
  if (dmMap) {
    for (const count of dmMap.values()) {
      total += Number(count || 0)
    }
  }
  total += Number(chatStore.globalUnreadCount || 0)
  return total
})

const groupsUnreadCount = computed(() => {
  const groupMap = chatStore.groupUnreadCounts
  let total = 0
  if (groupMap) {
    for (const count of groupMap.values()) {
      total += Number(count || 0)
    }
  }
  return total
})

onMounted(() => {
  if (!authStore.isAuthenticated || !authStore.isAgent) {
    router.push('/')
    return
  }
  
  // Load initial data
  chatStore.getPendingChats()
  chatStore.getAgentChats()
  chatStore.joinGlobalRoom()
  chatStore.setViewingGlobalChat(route.name === 'agent-global-chat')

  const unlock = () => chatStore.unlockAudio()
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
  window.addEventListener('touchstart', unlock, { once: true })
})

onBeforeUnmount(() => {
  chatStore.leaveGlobalRoom()
  chatStore.setViewingGlobalChat(false)
})

watch(
  () => route.name,
  (name) => {
    chatStore.setViewingGlobalChat(name === 'agent-global-chat')
    if (name !== 'agent-global-chat') {
      chatStore.setActiveDirectThread(null)
    }
    if (name !== 'agent-groups') {
      chatStore.setActiveGroup(null)
    }
  }
)

function getInitials(name?: string): string {
  if (!name) return 'A'
  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase()
  }
  return (name.substring(0, 2) || 'A').toUpperCase()
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
.agent-layout {
  display: flex;
  height: 100vh;
  background: var(--color-bg);
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
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  cursor: pointer;
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
  box-shadow: inset 3px 0 0 var(--color-accent);
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

.icon-white {
  color: #ffffff;
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

.nav-badge.alert {
  background: var(--color-danger);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.sidebar-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logout-icon-btn {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: #ffffff;
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
}

.logout-icon-btn:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary-border);
  transform: translateY(-1px);
}

.logout-icon-btn svg {
  width: 18px;
  height: 18px;
}

.agent-avatar {
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

.agent-details {
  display: flex;
  flex-direction: column;
}

.agent-name {
  font-size: 0.9rem;
  font-weight: 500;
}

.agent-status {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.agent-status.online {
  color: var(--color-success);
}

/* Main wrapper */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.page-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-actions .sound-toggle {
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-primary);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 0.85rem;
  cursor: pointer;
}

.page-actions .sound-toggle:hover {
  background: var(--color-primary-soft);
  border-color: var(--color-primary-border);
}

.page-actions .online-count {
  background: var(--color-success);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}


.header-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background: var(--color-danger);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* Main content */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    width: 70px;
    min-width: 70px;
  }

  .sidebar-header h2,
  .nav-text,
  .agent-details {
    display: none;
  }

  .sidebar-header {
    justify-content: center;
    padding: 1rem;
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
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border-radius: 12px;
  min-height: 44px;
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

  .agent-info {
    justify-content: center;
  }

  .navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  min-height: 60px;
}

  .btn-text {
    display: none;
  }

  .page-title {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text);
  font-weight: 600;
}
}
</style>






