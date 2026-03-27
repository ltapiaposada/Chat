import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AgentLayout from '../layouts/AgentLayout.vue'
import ClientLayout from '../layouts/ClientLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
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
      meta: { requiresAuth: true, role: 'agent' },
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
    next('/')
  } else if (to.meta.requiresAuth && (!auth?.token || (to.meta.role && auth.role !== to.meta.role))) {
    localStorage.removeItem('auth')
    next('/')
  } else if (to.path === '/' && isAuthenticated) {
    if (auth?.role === 'agent') {
      next('/agent/pending')
    } else {
      next('/client')
    }
  } else {
    next()
  }
})

export default router
