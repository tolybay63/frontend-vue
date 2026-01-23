import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './shared/config/router'
import App from './app/App.vue'
import { useAuthStore } from '@/shared/stores/auth'
import { usePageBuilderStore } from '@/shared/stores/pageBuilder'
import { useNavigationStore } from '@/shared/stores/navigation'

// базовые стили/токены из NSI
import './shared/styles/tokens.css'
import './shared/styles/base.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const authStore = useAuthStore(pinia)
const pageStore = usePageBuilderStore(pinia)
const navigationStore = useNavigationStore(pinia)

router.beforeEach(async (to) => {
  await authStore.checkSession()

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

  if (to.path === '/' && pageStore.pages.length) {
    const firstPage = pageStore.pages[0]
    if (firstPage?.id) {
      return { path: `/dash/${firstPage.id}`, replace: true }
    }
  }

  if (to.path === '/data' || to.path === '/') {
    if (!navigationStore.consumeDataAccess()) {
      return { path: '/templates', replace: true }
    }
  }

  return true
})

app.use(router)
app.mount('#app')
