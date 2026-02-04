import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './shared/config/router'
import App from './app/App.vue'
import { useAuthStore } from '@/shared/stores/auth'
import { usePageBuilderStore } from '@/shared/stores/pageBuilder'
import { useNavigationStore } from '@/shared/stores/navigation'
import { hasConstructorAccess } from '@/shared/lib/constructorAccess'

// базовые стили/токены из NSI
import './shared/styles/tokens.css'
import './shared/styles/base.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const authStore = useAuthStore(pinia)
const pageStore = usePageBuilderStore(pinia)
const navigationStore = useNavigationStore(pinia)

async function resolveDefaultDashboard() {
  await pageStore.fetchPages()
  const orderedPages = pageStore.orderedPages || pageStore.pages
  const firstPage = orderedPages[0]
  if (firstPage?.id) {
    return { path: `/dash/${firstPage.id}`, replace: true }
  }
  return null
}

router.beforeEach(async (to) => {
  await authStore.checkSession()
  pageStore.syncDashboardOrderUser(authStore.user?.id)

  if (to.meta?.public) {
    if (to.path === '/login' && authStore.isAuthenticated) {
      const redirectTarget =
        typeof to.query.redirect === 'string' && to.query.redirect ? to.query.redirect : '/'
      return redirectTarget
    }
    return true
  }

  if (!authStore.isAuthenticated) {
    const redirectFullPath =
      to.fullPath && to.fullPath !== '/' && to.path !== '/login' ? to.fullPath : null
    const loginRoute = { path: '/login', replace: true }
    if (redirectFullPath) {
      loginRoute.query = { redirect: redirectFullPath }
    }
    return loginRoute
  }

  const constructorAllowed = hasConstructorAccess(authStore.user)

  if (to.meta?.requiresConstructor && !constructorAllowed) {
    const redirect = await resolveDefaultDashboard()
    if (redirect) return redirect
    return { path: '/', replace: true }
  }

  if (to.path === '/') {
    const redirect = await resolveDefaultDashboard()
    if (redirect) return redirect
  }

  if (to.path === '/data') {
    if (!navigationStore.consumeDataAccess()) {
      if (constructorAllowed) {
        return { path: '/templates', replace: true }
      }
      const redirect = await resolveDefaultDashboard()
      if (redirect) return redirect
      return { path: '/', replace: true }
    }
  }

  return true
})

app.use(router)
app.mount('#app')
