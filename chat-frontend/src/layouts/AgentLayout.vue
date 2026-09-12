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
          <span class="nav-text">Mis chats</span>
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

        <router-link v-if="authStore.isAdmin" to="/agent/settings/channels" class="nav-item" active-class="active">
          <span class="nav-icon"><HeroIcon name="adjustments-horizontal" /></span>
          <span class="nav-text">Configuración</span>
        </router-link>
        <router-link v-if="authStore.isAdmin" to="/agent/settings/departments" class="nav-item" active-class="active">
          <span class="nav-icon"><HeroIcon name="briefcase" /></span>
          <span class="nav-text">Departamentos</span>
        </router-link>
        <router-link v-if="authStore.isAdmin" to="/agent/settings/agents" class="nav-item" active-class="active">
          <span class="nav-icon"><HeroIcon name="users" /></span>
          <span class="nav-text">Agentes</span>
        </router-link>
        <router-link v-if="authStore.role === 'admin' || authStore.role === 'supervisor'" to="/agent/settings/metrics" class="nav-item" active-class="active">
          <span class="nav-icon"><HeroIcon name="chart-bar" /></span>
          <span class="nav-text">Métricas</span>
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
          <button
            v-if="route.name === 'agent-dashboard'"
            class="sidebar-logout-btn"
            type="button"
            title="Salir"
            aria-label="Cerrar sesión"
            @click="handleLogout"
          >
            <HeroIcon name="arrow-right-on-rectangle" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content area -->
    <div class="main-wrapper">
      <!-- Navbar -->
      <header v-if="route.name !== 'agent-dashboard'" class="navbar">
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
import { useAppDialog } from '@/composables/useAppDialog'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()
const appDialog = useAppDialog()
let pendingSyncInterval: number | null = null

function syncPendingChats() {
  if (authStore.isAuthenticated && authStore.isStaff && chatStore.isConnected) {
    chatStore.getPendingChats()
  }
}

function handleVisibilitySync() {
  if (document.visibilityState === 'visible') syncPendingChats()
}

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    'agent-dashboard': 'Mis conversaciones',
    'agent-pending': 'Chats pendientes',
    'agent-history': 'Historial',
    'agent-global-chat': 'Equipo de agentes',
    'agent-groups': 'Grupos',
    'admin-channels': 'Configuración de canales',
    'admin-agents': 'Administración de agentes',
    'admin-departments': 'Configuración de departamentos',
    'admin-metrics': 'Métricas de atención'
  }
  return titles[route.name as string] || 'Panel de agente'
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
  if (!authStore.isAuthenticated || !authStore.isStaff) {
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
  window.addEventListener('focus', syncPendingChats)
  document.addEventListener('visibilitychange', handleVisibilitySync)
  pendingSyncInterval = window.setInterval(syncPendingChats, 15000)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', syncPendingChats)
  document.removeEventListener('visibilitychange', handleVisibilitySync)
  if (pendingSyncInterval) window.clearInterval(pendingSyncInterval)
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

async function handleLogout() {
  if (await appDialog.confirm('¿Estás seguro de que deseas salir?', { title: 'Cerrar sesión', confirmLabel: 'Salir' })) {
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
  height: 100dvh;
  background: var(--color-bg);
  min-width: 0;
}

/* Consola visual: navegación sobria y superficies planas */
.sidebar {
  width: 232px;
  min-width: 232px;
  background: #15172e;
}

.sidebar-header {
  min-height: 72px;
  padding: 0 22px;
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.sidebar-header .logo {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #ffffff;
  background: #5849e0;
  font-size: 1.1rem;
}

.sidebar-header h2 { font-size: 1rem; font-weight: 700; }
.sidebar-nav { padding: 18px 12px; gap: 4px; }
.nav-item {
  min-height: 42px;
  margin: 0;
  padding: 0 12px;
  border-radius: 8px;
  color: #a9abc2;
  transition: background-color .16s ease, color .16s ease;
}
.nav-item:hover { background: #22254a; color: #ffffff; }
.nav-item.active {
  background: #31356a;
  color: #ffffff;
  box-shadow: inset 3px 0 0 #7c6ff0;
}
.nav-icon { width: 22px; height: 22px; font-size: 1rem; }
.nav-text { font-size: .84rem; font-weight: 600; }
.nav-badge { min-width: 20px; height: 20px; padding: 0 6px; background: #5849e0; }
.nav-badge.alert { background: #d8464c; animation: none; }
.sidebar-footer { padding: 16px; border-top-color: rgba(255,255,255,.08); }
.agent-avatar { width: 36px; height: 36px; background: #31356a; }
.agent-name { color: #fff; font-weight: 600; }
.agent-status { position: relative; padding-left: 12px; color: #a9abc2; }
.agent-status::before { content: ''; position: absolute; left: 0; top: 50%; width: 7px; height: 7px; border-radius: 50%; background: #6c6f8d; transform: translateY(-50%); }
.agent-status.online { color: #a9abc2; }
.agent-status.online::before { background: #27c58a; }
.navbar { min-height: 64px; padding: 0 24px; background: #fff; }
.page-title { font-family: Manrope, Inter, sans-serif; font-size: 1.05rem; font-weight: 700; }
.logout-icon-btn { border-radius: 8px; color: #50536f; box-shadow: none; }
.logout-icon-btn:hover { transform: none; color: #d8464c; background: #fff0f1; border-color: #f3c3c6; }

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
@media (min-width: 641px) and (max-width: 1024px) {
  .sidebar {
    width: 220px;
    min-width: 220px;
  }

  .sidebar-footer {
    padding: 0.75rem 1rem;
  }

  .sidebar-nav {
    padding: 0.75rem 0;
    gap: 0.35rem;
  }

  .nav-item {
    justify-content: flex-start;
    margin: 0 0.55rem;
    padding: 0.6rem 0.8rem;
  }

  .navbar {
    padding: 0.65rem 1rem;
  }

  .page-title {
    font-size: 1.05rem;
    max-width: 52vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .page-actions .online-count {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
  }
}

@media (max-width: 640px) {
  .agent-layout {
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
    z-index: 50;
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
    padding: 0.45rem 0.2rem;
    min-height: 46px;
    border-radius: 10px;
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
    background: rgba(159, 207, 255, 0.28);
    color: #ffffff;
  }

  .nav-text {
    display: none;
  }

  .nav-icon {
    width: 24px;
    height: 24px;
    font-size: 1.05rem;
  }

  .nav-badge {
    position: absolute;
    top: 3px;
    right: 4px;
    min-width: 18px;
    height: 18px;
    font-size: 0.65rem;
    padding: 0 4px;
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
    max-width: 62vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>

<style scoped>
.agent-layout > .sidebar { width: 232px; min-width: 232px; background: #15172e; }
.agent-layout .sidebar-header { min-height: 72px; padding: 0 22px; border-bottom-color: rgba(255,255,255,.08); }
.agent-layout .sidebar-header .logo { width: 34px; height: 34px; display:grid; place-items:center; border-radius:10px; background:#5849e0; font-size:1.1rem; }
.agent-layout .sidebar-header h2 { font-size:1rem; font-weight:700; }
.agent-layout .sidebar-nav { padding:18px 12px; gap:4px; }
.agent-layout .nav-item { min-height:42px; margin:0; padding:0 12px; border-radius:8px; color:#a9abc2; }
.agent-layout .nav-item:hover { background:#22254a; color:#fff; }
.agent-layout .nav-item.active { background:#31356a; color:#fff; box-shadow:inset 3px 0 0 #7c6ff0; }
.agent-layout .nav-icon { width:22px; height:22px; font-size:1rem; }
.agent-layout .nav-text { font-size:.84rem; font-weight:600; }
.agent-layout .nav-badge { min-width:20px; height:20px; background:#5849e0; }
.agent-layout .nav-badge.alert { background:#d8464c; animation:none; }
.agent-layout .sidebar-footer { padding:16px; border-top-color:rgba(255,255,255,.08); }
.agent-layout .agent-avatar { width:36px; height:36px; background:#31356a; }
.agent-layout .agent-name { color:#fff; font-weight:600; }
.agent-layout .agent-details { min-width:0; }
.agent-layout .agent-name { max-width:105px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sidebar-logout-btn { width:34px; height:34px; margin-left:auto; flex:0 0 34px; padding:0; border:1px solid rgba(255,255,255,.12); border-radius:8px; background:transparent; color:#a9abc2; cursor:pointer; }
.sidebar-logout-btn :deep(svg) { width:17px; height:17px; }
.sidebar-logout-btn:hover { background:#31356a; border-color:rgba(255,255,255,.22); color:#fff; }
.agent-layout .agent-status { position:relative; padding-left:12px; color:#a9abc2; }
.agent-layout .agent-status::before { content:''; position:absolute; left:0; top:50%; width:7px; height:7px; border-radius:50%; background:#6c6f8d; transform:translateY(-50%); }
.agent-layout .agent-status.online { color:#a9abc2; }
.agent-layout .agent-status.online::before { background:#27c58a; }
.agent-layout .navbar { min-height:64px; padding:0 24px; background:#fff; }
.agent-layout .page-title { font-family:Manrope,Inter,sans-serif; font-size:1.05rem; font-weight:700; }
@media (max-width: 640px) { .agent-layout > .sidebar { width:100%; min-width:0; } }
</style>
