import { createRouter, createWebHistory } from 'vue-router'
import ServicedObjects from '@/views/ServicedObjects.vue'
import OrgStructure from '@/views/OrgStructure.vue'
import Login from '@/views/Login.vue'
import Tools from '@/views/Tools.vue'
import Equipment from '@/views/Equipment.vue'
import Personnel from '@/views/Personnel.vue'
import { isAuthenticated } from '@/shared/api/auth/auth'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/objects',
    name: 'ServicedObjects',
    component: ServicedObjects,
    meta: { requiresAuth: true }
  },
  {
    path: '/resources/tools',
    name: 'Tools',
    component: Tools,
    meta: { requiresAuth: true }
  },
  {
    path: '/resources/equipment',
    name: 'Equipment',
    component: Equipment,
    meta: { requiresAuth: true }
  },
  {
    path: '/organization',
    name: 'OrgStructure',
    component: OrgStructure,
    meta: { requiresAuth: true }
  },
  {
    path: '/personnel',
    name: 'Personnel',
    component: Personnel,
    meta: { requiresAuth: true }
  },
];


const router = createRouter({
  history: createWebHistory('/dtj/org/'),
  routes
})

// Navigation Guard - защита роутов
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const authenticated = isAuthenticated()

  if (requiresAuth && !authenticated) {
    // Пытается зайти на защищенную страницу без авторизации
    next('/login')
  } else if (to.path === '/login' && authenticated) {
    // Уже авторизован, пытается зайти на логин - редирект на объекты
    next('/objects')
  } else {
    // Всё ок, пропускаем
    next()
  }
})

export default router
