<!-- Файл: src/layouts/S360Layout.vue
     Назначение: основной макет интерфейса Service 360 (хедер, навигация, слот контента).
     Использование: импортируйте через @layouts/S360Layout и оборачивайте страницы. -->
<template>
  <div class="s360-layout">
    <header class="s360-top-bar">
      <div class="s360-top-left">
        <button
          v-if="showNavigation"
          type="button"
          class="s360-toggle"
          :aria-label="toggleAriaLabel"
          @click="toggleAside"
        >
          <NIcon :component="toggleIcon" />
        </button>

        <router-link to="/" class="s360-logo">
          <img :src="logoMark" alt="Service 360" class="logo-mark" />
        </router-link>
      </div>

      <div class="s360-top-right">
        <NDropdown trigger="click" :options="languageOptions" @select="handleLanguageSelect">
          <span class="s360-lang-switcher">
            {{ currentLanguage.code }}
            <NIcon class="lang-arrow" :component="ChevronDown" />
          </span>
        </NDropdown>

        <button v-if="isAuthenticated" type="button" class="s360-icon-btn" aria-label="Уведомления">
          <NIcon :component="NotificationsOutline" />
        </button>

        <button v-if="isAuthenticated" type="button" class="s360-icon-btn" aria-label="Настройки">
          <NIcon :component="SettingsOutline" />
        </button>

        <NDropdown trigger="click" :options="profileOptions" @select="handleProfileSelect">
          <span class="s360-profile" :aria-label="profileAriaLabel" :title="profileName">
            <NAvatar :size="36" class="s360-profile-avatar">{{ profileInitials }}</NAvatar>
          </span>
        </NDropdown>
      </div>
    </header>

    <div class="s360-body">
      <aside
        v-if="showDesktopNavigation"
        class="s360-aside sider"
        :class="{ 'is-collapsed': isSidebarCollapsed }"
        :style="asideInlineStyle"
      >
        <div class="s360-aside-inner">
          <nav class="s360-nav">
            <NMenu
              :options="menuOptionsWithResources"
              :value="menuValue"
              :collapsed="isSidebarCollapsed"
              :collapsed-width="COLLAPSED_WIDTH"
              :collapsed-icon-size="22"
              @update:value="handleMenuSelect"
            />
          </nav>
        </div>
      </aside>

      <div
        v-if="showDesktopNavigation && !isSidebarCollapsed"
        class="sider-resizer"
        @mousedown="startResize"
        @touchstart="startResize"
      ></div>

      <main class="s360-main">
        <slot />
      </main>
    </div>

    <nav v-if="showMobileNavigation" class="s360-bottom-nav" aria-label="Основная навигация">
      <button
        v-for="item in bottomNavItems"
        :key="item.key"
        type="button"
        class="bottom-nav-item"
        :class="{ active: item.isActive }"
        :aria-label="item.label"
        @click="handleBottomNavAction(item)"
      >
        <NIcon :component="item.icon" />
        <span class="bottom-nav-label">{{ item.mobileLabel }}</span>
      </button>
    </nav>

    <transition name="mobile-drawer">
      <div
        v-if="showMobileNavigation && mobileDrawerOpen"
        class="s360-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Навигация"
      >
        <button
          type="button"
          class="drawer-backdrop"
          aria-label="Закрыть меню"
          @click="closeMobileDrawer"
        />
        <div class="drawer-panel">
          <header class="drawer-header">
            <span class="drawer-title">Навигация</span>
            <button
              type="button"
              class="drawer-close"
              aria-label="Закрыть меню"
              @click="closeMobileDrawer"
            >
              <NIcon :component="CloseOutline" />
            </button>
          </header>
          <div class="drawer-content">
            <button
              v-for="item in mobileDrawerItems"
              :key="item.key"
              type="button"
              class="drawer-link"
              :class="{ active: menuValue === item.key }"
              @click="handleMobileDrawerSelect(item.key)"
            >
              <NIcon :component="item.icon" />
              <span>{{ item.menuLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Component as VueComponent,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DropdownDividerOption, DropdownOption, MenuOption } from 'naive-ui'
import { NAvatar, NDropdown, NIcon, NMenu, NTooltip } from 'naive-ui'
import {
  ChevronDown,
  CloseOutline,
  MenuOutline,
  NotificationsOutline,
  SettingsOutline,
  HomeOutline,
  AlbumsOutline,
  BugOutline,
  OptionsOutline,
  ConstructOutline,
  ClipboardOutline,
  CheckmarkDoneOutline,
  FolderOutline,
  BookOutline,
  EllipsisHorizontal,
} from '@vicons/ionicons5'

import logoMark from '@/assets/logo.png'
import { useAuth } from '@features/auth'
import { useUiSidebar } from '@features/ui'
import { Report } from '@vicons/tabler'

interface LanguageOption {
  label: string
  code: string
}

const languages: LanguageOption[] = [
  { label: 'Русский', code: 'ru' },
  { label: 'English', code: 'en' },
]

const currentLanguage = ref<LanguageOption>(languages[0])
const languageOptions = computed<DropdownOption[]>(() =>
  languages.map((item) => ({ label: item.label, key: item.code })),
)

const auth = useAuth()
const router = useRouter()
const route = useRoute()

const ui = useUiSidebar()
ui.hydrateSidebarCollapsed()
const { isSidebarCollapsed } = ui

const COLLAPSED_WIDTH = 72

const renderIcon = (icon: VueComponent) => () => h(NIcon, null, { default: () => h(icon) })

const withTooltip = (text: string, tooltip?: string) => () =>
  h(
    NTooltip,
    { placement: 'right' },
    {
      trigger: () => h('span', { class: 'menu-title', title: tooltip ?? text }, text),
      default: () => tooltip ?? text,
    },
  )

const menuRouteByKey: Record<string, string> = {
  dashboard: '/',

  'object-types': '/nsi/object-types',
  'object-defects': '/nsi/object-defects',
  'object-parameters': '/nsi/object-parameters',
  works: '/nsi/works',
  tasks: '/nsi/tasks',
  sources: '/nsi/sources',
  components: '/nsi/components',
  reports: '/nsi/reports',
}

// расширение маршрутов для ресурcов (единая таблица с типом через query)
Object.assign(menuRouteByKey, {
  resources: '/nsi/resources',
  'resources:materials': '/nsi/resources?type=materials',
  'resources:equipment': '/nsi/resources?type=equipment',
  'resources:tools': '/nsi/resources?type=tools',
  'resources:professions': '/nsi/resources?type=professions',
  'resources:third-party': '/nsi/resources?type=third-party',
})

interface MenuItem {
  key: string
  icon: VueComponent
  menuLabel: string
  mobileLabel: string
  tooltip: string
}

const MENU_ITEMS = [
  {
    key: 'dashboard',
    icon: HomeOutline,
    menuLabel: 'Главная',
    mobileLabel: 'Главная',
    tooltip: 'Главная панель',
  },
  {
    key: 'object-types',
    icon: AlbumsOutline,
    menuLabel: 'Типы',
    mobileLabel: 'Типы',
    tooltip: 'Справочник типов обслуживаемых объектов',
  },
  {
    key: 'components',
    icon: ConstructOutline,
    menuLabel: 'Компоненты',
    mobileLabel: 'Компоненты',
    tooltip: 'Справочник компонентов обслуживаемых объектов',
  },
  {
    key: 'object-defects',
    icon: BugOutline,
    menuLabel: 'Дефекты',
    mobileLabel: 'Дефекты',
    tooltip: 'Справочник дефектов обслуживаемых объектов',
  },
  {
    key: 'object-parameters',
    icon: OptionsOutline,
    menuLabel: 'Параметры',
    mobileLabel: 'Параметры',
    tooltip: 'Справочник параметров обслуживаемых объектов',
  },
  {
    key: 'works',
    icon: ClipboardOutline,
    menuLabel: 'Работы',
    mobileLabel: 'Работы',
    tooltip: 'Справочник технологических работ',
  },
  {
    key: 'tasks',
    icon: CheckmarkDoneOutline,
    menuLabel: 'Задачи',
    mobileLabel: 'Задачи',
    tooltip: 'Справочник задач',
  },
  {
    key: 'sources',
    icon: BookOutline,
    menuLabel: 'Источники',
    mobileLabel: 'Источники',
    tooltip: 'Справочник нормативных документов',
  },
  {
    key: 'reports',
    icon: Report,
    menuLabel: 'Отчёты',
    mobileLabel: 'Отчёты',
    tooltip: 'Справочник отчётов',
  },
] satisfies MenuItem[]

interface BottomNavItem {
  key: string
  label: string
  mobileLabel: string
  icon: VueComponent
  isActive: boolean
  type: 'route' | 'more'
}

const menuOptions: MenuOption[] = MENU_ITEMS.map((item) => ({
  label: withTooltip(item.menuLabel, item.tooltip),
  key: item.key,
  icon: renderIcon(item.icon),
}))

const RESOURCES_CHILDREN = [
  { key: 'resources:materials', menuLabel: 'Материалы', tooltip: 'Материалы' },
  { key: 'resources:equipment', menuLabel: 'Техника', tooltip: 'Техника' },
  { key: 'resources:tools', menuLabel: 'Инструменты', tooltip: 'Инструменты' },
  { key: 'resources:professions', menuLabel: 'Профессии', tooltip: 'Профессии' },
  {
    key: 'resources:third-party',
    menuLabel: 'Услуги сторонних',
    tooltip: 'Услуги сторонних',
  },
] satisfies Array<{ key: string; menuLabel: string; tooltip: string }>

// Вставляем группу «Ресурсы» сразу после «Задачи» (если найдена), иначе в конец
const resourcesMenuOption: MenuOption = {
  key: 'resources',
  icon: renderIcon(FolderOutline),
  label: withTooltip('Ресурсы', 'Справочники ресурсов'),
  children: RESOURCES_CHILDREN.map((child) => ({
    key: child.key,
    label: withTooltip(child.menuLabel, child.tooltip),
  })),
}

const RESOURCES_MOBILE_ITEMS: MenuItem[] = [
  {
    key: 'resources',
    icon: FolderOutline,
    menuLabel: 'Ресурсы',
    mobileLabel: 'Ресурсы',
    tooltip: 'Справочники ресурсов',
  },
  ...RESOURCES_CHILDREN.map((child) => ({
    key: child.key,
    icon: FolderOutline,
    menuLabel: child.menuLabel,
    mobileLabel: child.menuLabel,
    tooltip: child.tooltip,
  })),
]

const menuOptionsWithResources = computed<MenuOption[]>(() => {
  const base: MenuOption[] = [...menuOptions]
  const idx = base.findIndex((o) => String((o as MenuOption).key ?? '') === 'tasks')
  if (idx >= 0) base.splice(idx + 1, 0, resourcesMenuOption)
  else base.push(resourcesMenuOption)
  return base
})

const MIN_W = 200
const MAX_W = 360
const KEY = 's360.sidebar.width'
const startX = ref(0)
const startW = ref(0)
function clamp(n: number) {
  return Math.min(MAX_W, Math.max(MIN_W, n))
}

const initialSiderWidth = clamp(
  typeof window !== 'undefined' ? Number(localStorage.getItem(KEY)) || 240 : 240,
)
const siderWidth = ref<number>(initialSiderWidth)

const asideInlineStyle = computed(() => {
  const width = isSidebarCollapsed.value ? COLLAPSED_WIDTH : siderWidth.value
  return {
    width: `${width}px`,
    flexBasis: `${width}px`,
  }
})

const handleMouseMove = (event: MouseEvent) => onPointerMove(event)
const handleTouchMove = (event: TouchEvent) => onPointerMove(event)
const handleMouseUp = () => stopResizeTracking()
const handleTouchEnd = () => stopResizeTracking()

function onPointerMove(e: MouseEvent | TouchEvent) {
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  if ('touches' in e && e.cancelable) {
    e.preventDefault()
  }
  siderWidth.value = clamp(startW.value + (clientX - startX.value))
}

function stopResizeTracking() {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, String(siderWidth.value))
  }
}

function startResize(e: MouseEvent | TouchEvent) {
  startX.value = 'touches' in e ? e.touches[0].clientX : e.clientX
  startW.value = siderWidth.value
  if (e.cancelable) {
    e.preventDefault()
  }
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd)
}

const menuValue = ref<string | null>(null)
const mobileDrawerOpen = ref(false)

const handleMenuSelect = (key: string | number | null) => {
  if (key == null) return
  const normalized = String(key)
  const target = menuRouteByKey[normalized]
  if (!target) return
  void router.push(target)
  mobileDrawerOpen.value = false
}

const syncMenuValue = () => {
  const currentPath = route.path
  if (currentPath === '/nsi/resources') {
    const t = String(route.query?.type || '')
    if (t && ['materials', 'equipment', 'tools', 'professions', 'third-party'].includes(t)) {
      menuValue.value = `resources:${t}`
      return
    }
    menuValue.value = 'resources'
    return
  }
  const match = Object.entries(menuRouteByKey).find(([, path]) => path === currentPath)
  menuValue.value = match ? match[0] : null
}

watch(
  () => route.path,
  () => {
    syncMenuValue()
    mobileDrawerOpen.value = false
  },
  { immediate: true },
)

const isAuthenticated = auth.isAuthenticated
const user = auth.user

const showNavigation = computed(() => isAuthenticated.value)

const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const updateViewportWidth = () => {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth
}

const isMobile = computed(() => viewportWidth.value <= 768)
const showDesktopNavigation = computed(() => showNavigation.value && !isMobile.value)
const showMobileNavigation = computed(() => showNavigation.value && isMobile.value)

watch(
  isMobile,
  (value) => {
    if (!value) {
      mobileDrawerOpen.value = false
    }
  },
  { immediate: true },
)

const MOBILE_PRIMARY_KEYS = [
  'dashboard',
  'nsi-dashboard',
  'works',
  'tasks',
  'object-parameters',
  'components',
] as const
const primaryKeySet = new Set<string>(MOBILE_PRIMARY_KEYS)

const bottomNavItems = computed<BottomNavItem[]>(() => {
  const activeKey = menuValue.value
  const primaryItems = MENU_ITEMS.filter((item) => primaryKeySet.has(item.key)).map((item) => ({
    key: item.key,
    label: item.tooltip,
    mobileLabel: item.mobileLabel,
    icon: item.icon,
    isActive: activeKey === item.key,
    type: 'route' as const,
  }))

  const isActivePrimary = activeKey ? primaryKeySet.has(activeKey) : false

  return [
    ...primaryItems,
    {
      key: 'more',
      label: 'Дополнительные разделы',
      mobileLabel: 'Ещё',
      icon: EllipsisHorizontal,
      isActive: Boolean(activeKey) && !isActivePrimary,
      type: 'more' as const,
    },
  ]
})

const mobileDrawerItems = computed<MenuItem[]>(() => {
  type ChildMenu = { key: string; menuLabel: string; tooltip: string }
  const flat: MenuItem[] = []
  let resourcesInserted = false

  for (const item of MENU_ITEMS) {
    if (!resourcesInserted && item.key === 'tasks') {
      flat.push(...RESOURCES_MOBILE_ITEMS)
      resourcesInserted = true
    }

    flat.push(item)

    const children: ChildMenu[] = (item as unknown as { children?: ChildMenu[] }).children ?? []
    for (const child of children) {
      flat.push({
        key: child.key,
        icon: item.icon,
        menuLabel: child.menuLabel,
        mobileLabel: child.menuLabel,
        tooltip: child.tooltip || child.menuLabel,
      })
    }
  }

  if (!resourcesInserted) {
    flat.push(...RESOURCES_MOBILE_ITEMS)
  }

  return flat
})

const toggleIcon = computed(() => {
  if (isMobile.value) {
    return mobileDrawerOpen.value ? CloseOutline : MenuOutline
  }
  return isSidebarCollapsed.value ? MenuOutline : CloseOutline
})

const toggleAriaLabel = computed(() => {
  if (isMobile.value) {
    return mobileDrawerOpen.value ? 'Закрыть меню' : 'Открыть меню'
  }
  return isSidebarCollapsed.value ? 'Развернуть навигацию' : 'Свернуть навигацию'
})

const toggleAside = () => {
  if (isMobile.value) {
    mobileDrawerOpen.value = !mobileDrawerOpen.value
    return
  }
  ui.toggleSidebar()
}

const closeMobileDrawer = () => {
  mobileDrawerOpen.value = false
}

const handleMobileDrawerSelect = (key: string) => {
  handleMenuSelect(key)
}

const handleBottomNavAction = (item: BottomNavItem) => {
  if (item.type === 'more') {
    mobileDrawerOpen.value = true
    return
  }
  handleMenuSelect(item.key)
}

const handleLanguageSelect = (key: string | number | null) => {
  if (key == null) return
  const normalized = String(key)
  const nextLanguage = languages.find((item) => item.code === normalized)
  if (nextLanguage) {
    currentLanguage.value = nextLanguage
  }
}

const buildInitials = (source: string): string => {
  const words = source
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

  const letters: string[] = []
  for (const word of words) {
    const firstLetter = word[0]
    if (firstLetter) {
      letters.push(firstLetter)
    }
  }

  if (letters.length === 1) {
    const [firstWord] = words
    if (firstWord) {
      const chars = Array.from(firstWord)
      if (chars.length > 1) {
        letters.push(chars[1])
      }
    }
  }

  const result = letters.slice(0, 2).join('')
  return result ? result.toLocaleUpperCase('ru-RU') : ''
}

const profileName = computed(() => {
  const current = user.value
  if (!current) return 'Гость'

  const fullName = typeof current.fullName === 'string' ? current.fullName.trim() : ''
  const fromParts = [current.lastName, current.firstName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ')
  const shortName = typeof current.name === 'string' ? current.name.trim() : ''
  const email = typeof current.email === 'string' ? current.email.trim() : ''

  return fullName || fromParts || shortName || email || 'Сотрудник'
})

const profileAriaLabel = computed(() => {
  if (!isAuthenticated.value) return 'Меню профиля'
  const name = profileName.value
  return name && name !== 'Сотрудник' ? `Меню профиля: ${name}` : 'Меню профиля'
})

const profileInitials = computed(() => {
  const current = user.value
  if (current) {
    const candidates = [profileName.value, current.email ?? '']
    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const initials = buildInitials(candidate)
        if (initials) return initials
      }
    }
  }

  const fallback = buildInitials('Service 360')
  return fallback || 'S3'
})

const PROFILE_NAME_KEY = 'profile-name'
const PROFILE_DIVIDER_KEY = 'profile-divider'

const profileOptions = computed<Array<DropdownOption | DropdownDividerOption>>(() => {
  if (!isAuthenticated.value) {
    return [{ label: 'Войти', key: 'login' }]
  }

  const divider = { type: 'divider', key: PROFILE_DIVIDER_KEY } as DropdownDividerOption
  return [
    {
      label: profileName.value,
      key: PROFILE_NAME_KEY,
      disabled: true,
      props: { class: 's360-profile-name' },
    },
    divider,
    { label: 'Выйти', key: 'logout' },
  ]
})

const handleProfileSelect = async (key: string | number | null) => {
  if (key == null) return
  const normalized = String(key)
  switch (normalized) {
    case PROFILE_NAME_KEY:
    case PROFILE_DIVIDER_KEY:
      return
    case 'logout':
      await auth.logout()
      ui.setSidebarCollapsed(true, { persist: false })
      await router.push({ name: 'login' })
      break
    case 'login':
      await router.push({ name: 'login' })
      break
    default:
      break
  }
}

watch(
  isAuthenticated,
  (value) => {
    if (!value) {
      ui.setSidebarCollapsed(true, { persist: false })
      mobileDrawerOpen.value = false
      return
    }
    ui.hydrateSidebarCollapsed()
  },
  { immediate: true },
)

onMounted(() => {
  updateViewportWidth()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewportWidth)
  }
})

onBeforeUnmount(() => {
  stopResizeTracking()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth)
  }
})
</script>

<style scoped>
.s360-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8fafc;
}

.s360-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  min-height: 64px;
  background: #ffffff;
  border-bottom: 1px solid var(--s360-color-border-subtle);
  box-sizing: border-box;
  gap: 16px;
}

.s360-top-left,
.s360-top-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.s360-top-right {
  gap: 12px;
}

.s360-toggle,
.s360-icon-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: #f5f7f8;
  color: #0f3e44;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
  outline: none;
}

.s360-toggle {
  border: 1px solid #d2dada;
  background: #ffffff;
}

.s360-toggle:hover,
.s360-toggle:focus-visible {
  background: var(--s360-color-primary-soft);
  border-color: #c0d4d4;
  color: var(--s360-color-primary);
}

.s360-icon-btn:hover,
.s360-icon-btn:focus-visible {
  background: var(--s360-color-primary-soft);
  color: var(--s360-color-primary);
}

.s360-toggle:focus-visible,
.s360-icon-btn:focus-visible,
.s360-lang-switcher:focus-visible,
.s360-profile:focus-visible {
  outline: 2px solid var(--s360-color-primary);
  outline-offset: 2px;
}

.s360-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--s360-text-primary);
  text-decoration: none;
  font-weight: 700;
  font-size: 18px;
}

.s360-logo:hover {
  color: var(--s360-color-primary);
}

.logo-mark {
  height: 50px;
  width: auto;
  max-width: 160px;
  display: block;
}

.logo-text {
  white-space: nowrap;
}

.s360-lang-switcher {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #f5f7f8;
  color: var(--s360-text-primary);
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.s360-lang-switcher:hover {
  background: var(--s360-color-primary-soft);
  color: var(--s360-color-primary);
}

.lang-arrow {
  font-size: 14px;
}

.s360-profile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.s360-profile-avatar {
  font-weight: 600;
  text-transform: uppercase;
  color: #0f3e44;
  background: #e7f1ff;
}

:deep(.s360-profile-name) {
  font-weight: 600;
  color: #0f3e44;
  opacity: 1;
  cursor: default;
  pointer-events: none;
}

.s360-body {
  flex: 1 1 auto;
  display: flex;
  min-height: 0;
  background: #f8fafc;
}

.s360-aside {
  flex: 0 0 auto;
  width: 240px;
  min-height: 100%;
  box-sizing: border-box;
  background: #f8fafc;
  border-right: 1px solid #dee2e6;
  transition: width 0.2s ease;
}

.s360-aside.is-collapsed {
  border-right: 1px solid #dee2e6;
}

.s360-aside.is-collapsed .s360-aside-inner {
  padding: 16px 12px;
}

.sider {
  position: relative;
}

.sider-resizer {
  flex: 0 0 6px;
  width: 6px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s ease;
  align-self: stretch;
}

.sider-resizer:hover {
  background: rgba(0, 0, 0, 0.06);
}

.s360-aside-inner {
  padding: 20px 16px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.s360-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.s360-nav :deep(.n-menu) {
  border: none;
  background: transparent;
}

.s360-nav :deep(.n-menu-item-content) {
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--s360-text-primary);
  overflow: hidden;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.s360-aside.is-collapsed :deep(.n-menu-item-content) {
  justify-content: center;
  padding: 10px 0;
}

.s360-aside.is-collapsed :deep(.n-menu-item-content__icon) {
  margin-right: 0;
}

.s360-nav :deep(.n-menu-item-content .n-menu-item-content__title) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.s360-nav :deep(.n-menu-item-content:hover) {
  background: var(--s360-color-primary-soft);
  color: var(--s360-color-primary);
}
.s360-nav :deep(.n-menu-item-content--selected) {
  position: relative;
  background: var(--s360-color-primary-soft);
  color: var(--s360-color-primary);
  font-weight: 600;
  box-shadow: inset 4px 0 0 var(--s360-color-primary);
}

.s360-main {
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  max-width: none;
  padding: 24px 28px;
  background: var(--s360-color-surface);
  overflow: auto;
}

.s360-main table {
  width: 100%;
}

.menu-title {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.s360-bottom-nav {
  display: none;
}

.bottom-nav-item {
  appearance: none;
}

.bottom-nav-label {
  font-size: 12px;
}

.mobile-drawer-enter-active,
.mobile-drawer-leave-active {
  transition: opacity 0.2s ease;
}

.mobile-drawer-enter-from,
.mobile-drawer-leave-to {
  opacity: 0;
}

.s360-mobile-drawer {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  z-index: 1200;
}

.drawer-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(43, 108, 176, 0.22);
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
}

.drawer-panel {
  position: relative;
  width: min(320px, 86vw);
  height: 100%;
  background: #ffffff;
  box-shadow: -12px 0 32px rgba(43, 108, 176, 0.1);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 12px;
  border-bottom: 1px solid var(--s360-color-border-subtle);
}

.drawer-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--s360-text-primary);
}

.drawer-close {
  appearance: none;
  border: none;
  background: #f8fafc;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--s360-text-primary);
  cursor: pointer;
}

.drawer-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 16px 12px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 15px;
  color: #0f3e44;
  cursor: pointer;
}

.drawer-link.active {
  background: var(--s360-color-primary-soft);
  color: var(--s360-color-primary);
  font-weight: 600;
}

.drawer-link :deep(.n-icon) {
  font-size: 20px;
}

@media (max-width: 900px) {
  .sider-resizer {
    display: none;
  }
}

@media (max-width: 768px) {
  .s360-top-bar {
    min-height: 56px;
    padding: 0 16px;
  }

  .s360-top-left {
    gap: 12px;
  }

  .s360-top-right {
    gap: 8px;
  }

  .s360-lang-switcher,
  .s360-icon-btn {
    display: none;
  }

  .logo-text {
    display: none;
  }

  .s360-body {
    flex-direction: column;
  }

  .s360-main {
    padding: 16px;
    padding-bottom: calc(16px + 72px + env(safe-area-inset-bottom));
  }

  .s360-bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 8px;
    padding: 8px 12px calc(env(safe-area-inset-bottom) + 12px);
    background: #ffffff;
    border-top: 1px solid var(--s360-color-border-subtle);
    box-shadow: 0 -4px 16px rgba(43, 108, 176, 0.1);
    z-index: 1100;
  }

  .bottom-nav-item {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px 4px;
    border-radius: 12px;
    color: #5f7f84;
    background: transparent;
    border: none;
    font-size: 11px;
    font-weight: 600;
    transition:
      color 0.2s ease,
      background-color 0.2s ease;
  }

  .bottom-nav-item.active {
    color: var(--s360-color-primary);
    background: rgba(43, 108, 176, 0.14);
  }

  .bottom-nav-item:focus-visible {
    outline: 2px solid var(--s360-color-primary);
    outline-offset: 2px;
  }

  .bottom-nav-label {
    font-size: 11px;
    line-height: 1;
  }
}
@media (max-width: 480px) {
  .logo-mark {
    height: 40px;
    width: auto;
    max-width: 120px;
  }
}
</style>
