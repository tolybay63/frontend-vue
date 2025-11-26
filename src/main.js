import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './shared/config/router'
import App from './app/App.vue'
import { useAuthStore } from '@/shared/stores/auth'
import { usePageBuilderStore } from '@/shared/stores/pageBuilder'

// базовые стили/токены из NSI
import './shared/styles/tokens.css'
import './shared/styles/base.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const authStore = useAuthStore(pinia)
const pageStore = usePageBuilderStore(pinia)

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

  return true
})

app.use(router)
app.mount('#app')
