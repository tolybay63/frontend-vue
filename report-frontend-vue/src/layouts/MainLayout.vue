<template>
  <div class="shell">
    <header class="topbar">
      <div class="topbar__left">
        <button class="topbar__toggle" type="button" @click="toggleAside">
          ☰
        </button>
        <RouterLink to="/" class="brand">
          <img :src="logoUrl" alt="Service360" class="brand__logo" />
          <div>
            <div class="brand__name">Data</div>
            <div class="brand__sub">Service 360</div>
          </div>
        </RouterLink>
      </div>
      <div v-if="user" class="topbar__right">
        <button class="pill" type="button">ru</button>
        <button class="icon-pill" type="button" aria-label="Настройки">
          <span class="icon icon-gear" />
        </button>
        <div class="profile">
          <div class="profile__info">
            <div class="profile__name">
              {{ user.fullname || user.name || user.login }}
            </div>
            <div class="profile__email">{{ user.email }}</div>
          </div>
          <button class="pill" type="button" @click="handleLogout">
            Выйти
          </button>
        </div>
      </div>
    </header>

    <div class="body">
      <aside
        class="sider"
        :class="{ collapsed: asideCollapsed }"
        :style="siderStyle"
      >
        <nav class="sider__nav">
            <div v-if="navPages.length" class="sider__section">
              <div class="sider__section-title">Дашборды</div>
              <div v-for="page in navPages" :key="page.id">
                <div class="sider__link-row">
                  <RouterLink
                    :to="`/dash/${page.id}`"
                    class="sider__link"
                    active-class="is-active"
                    :title="asideCollapsed ? (page.menuTitle || page.pageTitle) : ''"
                    :aria-label="page.menuTitle || page.pageTitle"
                  >
                    <span
                      class="sider__badge"
                      :style="pageBadgeStyle(page)"
                    >
                      {{ pageBadgeText(page) }}
                    </span>
                    <span class="sider__label">{{
                      page.menuTitle || page.pageTitle
                    }}</span>
                  </RouterLink>
                  <button
                    v-if="pageTabOptions(page).length > 1 && !asideCollapsed"
                    class="sider__chevron"
                    type="button"
                    :aria-expanded="isPageMenuOpen(page)"
                    @click.stop.prevent="togglePageMenu(page)"
                  >
                    <span
                      class="chevron"
                      :class="{ 'is-open': isPageMenuOpen(page) }"
                    />
                  </button>
                </div>
                <div
                  v-if="
                    pageTabOptions(page).length > 1 &&
                    !asideCollapsed &&
                    isPageMenuOpen(page)
                  "
                  class="sider__submenu"
                >
                  <RouterLink
                    v-for="tab in pageTabOptions(page)"
                    :key="`${page.id}-tab-${tab.value}`"
                    :to="{ path: `/dash/${page.id}`, query: { tab: tab.value } }"
                    class="sider__link sider__link--nested"
                    active-class="is-active"
                  >
                    <span class="sider__label">{{ tab.label }}</span>
                  </RouterLink>
                </div>
              </div>
            </div>
          <div v-if="canUseConstructor" class="sider__section">
            <button
              class="sider__section-toggle"
              type="button"
              @click="constructorOpen = !constructorOpen"
            >
              <span>Конструктор</span>
              <span class="chevron" :class="{ 'is-open': constructorOpen }" />
            </button>
            <transition name="fade">
              <div v-show="constructorOpen" class="sider__submenu">
                <div class="sider__mode-toggle">
                  <label class="mode-toggle">
                    <input v-model="advancedMode" type="checkbox" />
                    <span>
                      Показывать расширенные настройки
                      (источники/конфигурации)
                    </span>
                  </label>
                </div>
                <RouterLink
                  v-for="item in constructorLinks"
                  :key="item.to"
                  :to="item.to"
                  replace
                  class="sider__link sider__link--nested"
                  active-class="is-active"
                  :title="asideCollapsed ? item.label : ''"
                  :aria-label="item.label"
                >
                  <span :class="['sider__icon', `icon-${item.icon}`]" />
                  <span class="sider__label">{{ item.label }}</span>
                </RouterLink>
              </div>
            </transition>
          </div>
        </nav>
      </aside>
      <div
        class="sider-resizer"
        :class="{ 'is-disabled': asideCollapsed }"
        @mousedown="startResize"
      />

      <main class="workspace">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onBeforeUnmount, reactive } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import logoUrl from '@/shared/assets/logo.png'
import { useAuthStore } from '@/shared/stores/auth'
import { usePageBuilderStore } from '@/shared/stores/pageBuilder'
import { useNavigationStore } from '@/shared/stores/navigation'
import { hasConstructorAccess } from '@/shared/lib/constructorAccess'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const pageStore = usePageBuilderStore()
const navigationStore = useNavigationStore()
const navPages = computed(() => pageStore.orderedPages || pageStore.pages)
const asideCollapsed = ref(false)
const constructorOpen = ref(true)
const siderWidth = ref(248)
const canUseConstructor = computed(() => hasConstructorAccess(user.value))
const advancedMode = computed({
  get: () => navigationStore.isAdvancedMode,
  set: (value) => navigationStore.setAdvancedMode(value),
})
const siderStyle = computed(() => {
  if (asideCollapsed.value) return { width: '84px' }
  return { width: `${siderWidth.value}px` }
})
const minSiderWidth = 180
const maxSiderWidth = 360
let cleanupResize = null
const dashboardMenus = reactive({})

const constructorLinks = computed(() => {
  const links = []
  if (navigationStore.isAdvancedMode) {
    links.push(
      { to: '/data-sources', label: 'Источники данных', icon: 'database' },
      {
        to: '/data-configurations',
        label: 'Конфигурации данных',
        icon: 'sliders',
      },
    )
  }
  links.push(
    { to: '/templates', label: 'Представления', icon: 'layers' },
    { to: '/pages', label: 'Страницы', icon: 'layout' },
  )
  return links
})

function pageTabOptions(page) {
  const settings = page?.layout?.settings || {}
  const tabs = Math.max(1, Math.min(12, Number(settings.tabs) || 1))
  const names = Array.isArray(settings.tabNames) ? settings.tabNames : []
  return Array.from({ length: tabs }, (_, index) => ({
    value: index + 1,
    label: names[index] || `Вкладка ${index + 1}`,
  }))
}

function normalizePageLabel(page) {
  return String(page?.menuTitle || page?.pageTitle || '').trim()
}

function pageBadgeText(page) {
  const label = normalizePageLabel(page)
  if (!label) return '#'
  const first = label.trim().charAt(0)
  return first ? first.toUpperCase() : '#'
}

const badgePalette = [
  '#1d4ed8',
  '#0f766e',
  '#7c3aed',
  '#b45309',
  '#be123c',
  '#0ea5e9',
  '#10b981',
  '#f97316',
]

function hashLabel(value = '') {
  const text = String(value || '')
  let acc = 0
  for (let i = 0; i < text.length; i += 1) {
    acc = (acc * 31 + text.charCodeAt(i)) % 100000
  }
  return acc
}

function pageBadgeStyle(page) {
  const label = normalizePageLabel(page)
  const hash = hashLabel(label)
  const color = badgePalette[hash % badgePalette.length]
  return { background: color }
}

const activePageId = computed(() => {
  if (route.path && route.path.startsWith('/dash/')) {
    const parts = route.path.split('/')
    return parts[2] || ''
  }
  return ''
})

function isPageMenuOpen(page) {
  const key = String(page?.id || '')
  if (!key) return false
  if (Object.prototype.hasOwnProperty.call(dashboardMenus, key)) {
    return Boolean(dashboardMenus[key])
  }
  return key === activePageId.value
}

function togglePageMenu(page) {
  const key = String(page?.id || '')
  if (!key) return
  dashboardMenus[key] = !isPageMenuOpen(page)
}

function toggleAside() {
  asideCollapsed.value = !asideCollapsed.value
}

function startResize(event) {
  if (asideCollapsed.value) return
  const startX = event.clientX
  const startWidth = siderWidth.value
  const onMove = (e) => {
    const delta = e.clientX - startX
    const next = Math.max(
      minSiderWidth,
      Math.min(maxSiderWidth, startWidth + delta),
    )
    siderWidth.value = next
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    cleanupResize = null
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  cleanupResize = onUp
}

onBeforeUnmount(() => {
  if (cleanupResize) cleanupResize()
})

async function handleLogout() {
  await authStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
:global(body) {
  background: #f5f6f8;
  font-family:
    'Montserrat',
    system-ui,
    -apple-system,
    sans-serif;
}
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f6f8;
}
.topbar {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
  padding: 12px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.topbar__left {
  display: flex;
  align-items: center;
  gap: 18px;
}
.topbar__toggle {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 6px 10px;
  cursor: pointer;
  color: #1f2937;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #111827;
}
.brand__logo {
  height: 42px;
}
.brand__name {
  font-weight: 600;
  font-size: 18px;
}
.brand__sub {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #94a3b8;
}
.breadcrumbs__link {
  color: #2b6cb0;
  text-decoration: none;
}
.breadcrumbs__current {
  color: #111827;
  font-weight: 600;
}
.topbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pill,
.icon-pill {
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  background: #eef2ff;
  color: #1d4ed8;
  cursor: pointer;
  font-weight: 600;
}
.icon-pill {
  width: 34px;
  height: 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon-pill .icon {
  width: 18px;
  height: 18px;
}
.profile {
  display: flex;
  align-items: center;
  gap: 12px;
}
.profile__info {
  display: flex;
  flex-direction: column;
  text-align: right;
  line-height: 1.2;
}
.profile__name {
  font-weight: 600;
}
.profile__email {
  font-size: 12px;
  color: #6b7280;
}
.body {
  display: flex;
  flex: 1;
  min-height: calc(100vh - 70px);
}
.sider {
  background: #fff;
  border-right: 1px solid #e5e7eb;
  padding: 16px 12px;
  transition: width 0.2s ease;
  box-sizing: border-box;
}
.sider.collapsed {
  width: 84px !important;
}
.sider__nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sider__section {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sider__section-title {
  font-size: 11px;
  text-transform: uppercase;
  color: #9ca3af;
  letter-spacing: 0.06em;
  padding: 0 8px;
}
.sider__section-toggle {
  border: none;
  background: none;
  padding: 4px 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  text-transform: uppercase;
  color: #9ca3af;
  letter-spacing: 0.06em;
  cursor: pointer;
}
.sider__submenu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 8px;
}
.sider__mode-toggle {
  padding: 4px 8px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  margin-bottom: 6px;
}
.mode-toggle {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #4b5563;
  line-height: 1.3;
}
.mode-toggle input {
  accent-color: #2563eb;
}
.chevron {
  width: 14px;
  height: 14px;
  display: inline-block;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  mask-size: contain;
  background: currentColor;
  transform: rotate(-90deg);
  transition: transform 0.2s ease;
}
.chevron.is-open {
  transform: rotate(0deg);
}
.sider__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  color: #1f2937;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s;
}
.sider__link-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sider__link:hover {
  background: #f5f7fb;
}
.sider__link.is-active {
  background: rgba(43, 108, 176, 0.12);
  color: #1d4ed8;
}
.sider__icon {
  width: 24px;
  height: 24px;
  mask-size: contain;
  mask-repeat: no-repeat;
  background: currentColor;
}
.sider__badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  color: #fff;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.sider__label {
  flex: 1;
}
.sider__chevron {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 8px;
  color: #475569;
  cursor: pointer;
}
.sider__chevron:hover {
  background: #f1f5f9;
}
.sider__link--nested {
  padding-left: 18px;
}
.sider.collapsed .sider__label,
.sider.collapsed .sider__section-title {
  display: none;
}
.sider.collapsed .sider__mode-toggle {
  display: none;
}
.sider.collapsed .sider__section-toggle span:not(.chevron) {
  display: none;
}
.sider.collapsed .sider__section-toggle {
  justify-content: center;
}
.sider.collapsed .sider__link {
  justify-content: center;
}
.sider-resizer {
  width: 6px;
  cursor: col-resize;
  background: transparent;
  position: relative;
}
.sider-resizer:hover,
.sider-resizer.is-disabled {
  background: rgba(15, 23, 42, 0.08);
}
.sider-resizer.is-disabled {
  cursor: not-allowed;
}
.workspace {
  flex: 1;
  padding: 32px;
  background: #f5f6f8;
}
.workspace > :first-child {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
.logout {
  border: 1px solid #d1d5db;
  border-radius: 999px;
  padding: 6px 12px;
  background: #fff;
  color: #111827;
  cursor: pointer;
}
.logout:hover {
  background: #eef2ff;
}
.icon-home {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='M3 10.5 12 3l9 7.5'/%3E%3Cpath d='M5 9.5V21h5v-5h4v5h5V9.5'/%3E%3C/svg%3E");
}
.icon-layers {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='m12 3 8.5 4.5L12 12 3.5 7.5 12 3z'/%3E%3Cpath d='m3.5 12 8.5 4.5 8.5-4.5'/%3E%3Cpath d='m3.5 16.5 8.5 4.5 8.5-4.5'/%3E%3C/svg%3E");
}
.icon-layout {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M9 3v18M3 9h18'/%3E%3C/svg%3E");
}
.icon-database {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cellipse cx='12' cy='5' rx='9' ry='3'/%3E%3Cpath d='M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5'/%3E%3Cpath d='M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6'/%3E%3C/svg%3E");
}
.icon-sliders {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cline x1='4' y1='6' x2='20' y2='6'/%3E%3Cline x1='4' y1='12' x2='20' y2='12'/%3E%3Cline x1='4' y1='18' x2='20' y2='18'/%3E%3Ccircle cx='9' cy='6' r='2'/%3E%3Ccircle cx='15' cy='12' r='2'/%3E%3Ccircle cx='7' cy='18' r='2'/%3E%3C/svg%3E");
}
.icon-info {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 16v-4'/%3E%3Cpath d='M12 8h.01'/%3E%3C/svg%3E");
}
.icon-chart {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='M4 19V5'/%3E%3Cpath d='M4 19h16'/%3E%3Cpath d='M8 19v-6'/%3E%3Cpath d='M12 19v-10'/%3E%3Cpath d='M16 19v-4'/%3E%3Cpath d='M20 19v-12'/%3E%3C/svg%3E");
}
</style>
