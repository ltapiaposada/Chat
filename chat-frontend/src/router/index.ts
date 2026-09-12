import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import LandingView from '../views/LandingView.vue'
import AgentLayout from '../layouts/AgentLayout.vue'
import ClientLayout from '../layouts/ClientLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: LandingView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register-company',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/embed',
      name: 'embedded-client-chat',
      component: () => import('../views/EmbedChatView.vue'),
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/PasswordRecoveryView.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/PasswordRecoveryView.vue'),
    },
    {
      path: '/client',
      component: ClientLayout,
      meta: { requiresAuth: true, role: 'client' },
      children: [
        {
          path: '',
          name: 'client-home',
          component: () => import('../views/ClientHomeView.vue'),
        },
        {
          path: 'history',
          name: 'client-history',
          component: () => import('../views/ClientHistoryView.vue'),
        },
      ]
    },
    {
      path: '/agent',
      component: AgentLayout,
      meta: { requiresAuth: true, roles: ['agent', 'supervisor', 'admin'] },
      children: [
        {
          path: '',
          redirect: '/agent/pending'
        },
        {
          path: 'pending',
          name: 'agent-pending',
          component: () => import('../views/AgentPendingView.vue'),
        },
        {
          path: 'dashboard',
          name: 'agent-dashboard',
          component: () => import('../views/AgentDashboardView.vue'),
        },
        {
          path: 'history',
          name: 'agent-history',
          component: () => import('../views/AgentHistoryView.vue'),
        },
        {
          path: 'global-chat',
          name: 'agent-global-chat',
          component: () => import('../views/GlobalChatView.vue'),
        },
        {
          path: 'groups',
          name: 'agent-groups',
          component: () => import('../views/GroupChatView.vue'),
        },
        {
          path: 'settings/channels',
          name: 'admin-channels',
          component: () => import('../views/AdminChannelsView.vue'),
          meta: { requiresAuth: true, roles: ['admin'] },
        },
        {
          path: 'settings/agents',
          name: 'admin-agents',
          component: () => import('../views/AdminAgentsView.vue'),
          meta: { requiresAuth: true, roles: ['admin'] },
        },
        {
          path: 'settings/departments',
          name: 'admin-departments',
          component: () => import('../views/AdminDepartmentsView.vue'),
          meta: { requiresAuth: true, roles: ['admin'] },
        },
        {
          path: 'settings/metrics',
          name: 'admin-metrics',
          component: () => import('../views/AdminMetricsView.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'supervisor'] },
        },
      ]
    },
  ],
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const authData = localStorage.getItem('auth')
  let auth: { role?: string; token?: string } | null = null

  if (authData) {
    try {
      auth = JSON.parse(authData)
    } catch {
      localStorage.removeItem('auth')
    }
  }
  const isAuthenticated = !!auth?.token
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresAuth && (!auth?.token ||
    (to.meta.role && auth.role !== to.meta.role) ||
    (Array.isArray(to.meta.roles) && !to.meta.roles.includes(auth.role)))) {
    localStorage.removeItem('auth')
    next('/login')
  } else if (to.meta.guestOnly && isAuthenticated) {
    if (auth?.role === 'admin') {
      next('/agent/settings/channels')
    } else if (auth?.role === 'agent' || auth?.role === 'supervisor') {
      next('/agent/pending')
    } else {
      next('/client')
    }
  } else {
    next()
  }
})

export default router
