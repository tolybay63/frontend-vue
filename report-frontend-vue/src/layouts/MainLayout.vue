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
            <RouterLink
              v-for="page in navPages"
              :key="page.id"
              :to="`/dash/${page.id}`"
              class="sider__link"
              active-class="is-active"
            >
              <span class="sider__icon icon-chart" />
              <span class="sider__label">{{
                page.menuTitle || page.pageTitle
              }}</span>
            </RouterLink>
          </div>
          <div class="sider__section">
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
                <RouterLink
                  v-for="item in navLinks"
                  :key="item.to"
                  :to="item.to"
                  replace
                  class="sider__link sider__link--nested"
                  active-class="is-active"
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
import { computed, ref, onBeforeUnmount } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import logoUrl from '@/shared/assets/logo.png'
import { useAuthStore } from '@/shared/stores/auth'
import { usePageBuilderStore } from '@/shared/stores/pageBuilder'

const router = useRouter()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const pageStore = usePageBuilderStore()
const navPages = computed(() => pageStore.pages)
const asideCollapsed = ref(false)
const constructorOpen = ref(true)
const siderWidth = ref(248)
const siderStyle = computed(() => {
  if (asideCollapsed.value) return { width: '84px' }
  return { width: `${siderWidth.value}px` }
})
const minSiderWidth = 180
const maxSiderWidth = 360
let cleanupResize = null

const navLinks = [
  { to: '/templates', label: 'Представления', icon: 'layers' },
  { to: '/pages', label: 'Страницы', icon: 'layout' },
]

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
.sider__label {
  flex: 1;
}
.sider__link--nested {
  padding-left: 18px;
}
.sider.collapsed .sider__label,
.sider.collapsed .sider__section-title {
  display: none;
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
.icon-info {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 16v-4'/%3E%3Cpath d='M12 8h.01'/%3E%3C/svg%3E");
}
.icon-chart {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2318283a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'%3E%3Cpath d='M4 19V5'/%3E%3Cpath d='M4 19h16'/%3E%3Cpath d='M8 19v-6'/%3E%3Cpath d='M12 19v-10'/%3E%3Cpath d='M16 19v-4'/%3E%3Cpath d='M20 19v-12'/%3E%3C/svg%3E");
}
</style>
