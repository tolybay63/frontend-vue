import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import TemplatesPage from '@/pages/TemplatesPage.vue'
import AboutPage from '@/pages/AboutPage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import PageManager from '@/pages/PageManager.vue'
import PageLayoutEditor from '@/pages/PageLayoutEditor.vue'
import PageRenderer from '@/pages/PageRenderer.vue'
import DataSourcesPage from '@/pages/DataSourcesPage.vue'
import DataConfigurationsPage from '@/pages/DataConfigurationsPage.vue'

const routes = [
  {
    path: '/login',
    component: LoginPage,
    meta: { public: true, layout: 'blank' },
  },
  { path: '/', component: HomePage },
  { path: '/data', component: HomePage, meta: { requiresConstructor: true } },
  { path: '/pages', component: PageManager, meta: { requiresConstructor: true } },
  { path: '/pages/new', component: PageLayoutEditor, meta: { requiresConstructor: true } },
  {
    path: '/pages/:pageId/edit',
    component: PageLayoutEditor,
    props: true,
    meta: { requiresConstructor: true },
  },
  { path: '/dash/:pageId', component: PageRenderer, props: true },
  { path: '/templates', component: TemplatesPage, meta: { requiresConstructor: true } },
  { path: '/data-sources', component: DataSourcesPage, meta: { requiresConstructor: true } },
  {
    path: '/data-configurations',
    component: DataConfigurationsPage,
    meta: { requiresConstructor: true },
  },
  { path: '/about', component: AboutPage },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
