import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import TemplatesPage from '@/pages/TemplatesPage.vue'
import AboutPage from '@/pages/AboutPage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import PageManager from '@/pages/PageManager.vue'
import PageLayoutEditor from '@/pages/PageLayoutEditor.vue'
import PageRenderer from '@/pages/PageRenderer.vue'

const routes = [
  {
    path: '/login',
    component: LoginPage,
    meta: { public: true, layout: 'blank' },
  },
  { path: '/', component: HomePage },
  { path: '/data', component: HomePage },
  { path: '/pages', component: PageManager },
  { path: '/pages/new', component: PageLayoutEditor },
  { path: '/pages/:pageId/edit', component: PageLayoutEditor, props: true },
  { path: '/dash/:pageId', component: PageRenderer, props: true },
  { path: '/templates', component: TemplatesPage },
  { path: '/about', component: AboutPage },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
