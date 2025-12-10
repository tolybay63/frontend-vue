/** Файл: src/router/index.ts
 *  Назначение: конфигурация маршрутизатора приложения и guard-аутентификации.
 *  Использование: импортируйте router или installAppRouter из @app/router.
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@features/auth'

const NsiDashboardPage = () => import('@pages/nsi/NsiDashboardPage.vue')
const ObjectTypesPage = () => import('@pages/nsi/ObjectTypesPage.vue')
const ObjectDefectsPage = () => import('@pages/nsi/ObjectDefectsPage.vue')
const ObjectParametersPage = () => import('@pages/nsi/ObjectParametersPage.vue')
const WorksPage = () => import('@pages/nsi/WorksPage.vue')
const TasksPage = () => import('@pages/nsi/TasksPage.vue')
const SourcesPage = () => import('@pages/nsi/SourcesPage.vue')
const ComponentsPage = () => import('@pages/nsi/ComponentsPage.vue')
const ResourcesPage = () => import('@pages/nsi/ResourcesPage.vue')
const ReportsPage = () => import('@pages/nsi/ReportsPage.vue')
const LoginPage = () => import('@pages/auth/LoginPage.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginPage },
    // root now opens NSI Dashboard; keep any guards/meta from old '/'
    // { path: '/', name: 'home', component: Home, meta: { requiresAuth: true } },
    { path: '/', name: 'home', component: NsiDashboardPage },
    {
      path: '/nsi',
      name: 'nsi-dashboard',
      component: NsiDashboardPage,
      // meta: { requiresAuth: true },
    },
    {
      path: '/nsi/object-types',
      name: 'object-types',
      component: ObjectTypesPage,
      // meta: { requiresAuth: true },
    },
    {
      path: '/nsi/object-defects',
      name: 'object-defects',
      component: ObjectDefectsPage,
      // meta: { requiresAuth: true },
    },
    {
      path: '/nsi/object-parameters',
      name: 'object-parameters',
      component: ObjectParametersPage,
      // meta: { requiresAuth: true },
    },
    {
      path: '/nsi/works',
      name: 'works',
      component: WorksPage,
      // meta: { requiresAuth: true },
    },
    {
      path: '/nsi/tasks',
      name: 'tasks',
      component: TasksPage,
      // meta: { requiresAuth: true },
    },
    {
      path: '/nsi/sources',
      name: 'sources',
      component: SourcesPage,
      // meta: { requiresAuth: true },
    },
    {
      path: '/nsi/resources',
      name: 'resources',
      component: ResourcesPage,
      // meta: { requiresAuth: true },
    },
    {
      path: '/nsi/components',
      name: 'components',
      component: ComponentsPage,
      // meta: { requiresAuth: true },
    },
    {
      path: '/nsi/reports',
      name: 'reports',
      component: ReportsPage,
      // meta: { requiresAuth: true },
    },
  ],
})

function normalizeRedirect(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value === '/login') return null
  return value
}

router.beforeEach((to) => {
  const auth = useAuth()

  if (to.name === 'login') {
    const fromQuery = normalizeRedirect(to.query?.redirect)
    if (fromQuery) {
      auth.setRedirectPath(fromQuery)
    }

    if (auth.isAuthenticated.value) {
      const target = auth.consumeRedirectPath() ?? '/'
      return { path: target }
    }

    return true
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated.value) {
    // const target = normalizeRedirect(to.fullPath) ?? '/'
    // auth.setRedirectPath(target)

    // const query = target && target !== '/' ? { redirect: target } : undefined

    // return { name: 'login', query }
    return true
  }

  return true
})

export default router
