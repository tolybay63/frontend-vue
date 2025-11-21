<template>
  <aside :class="['sidebar', { collapsed: isCollapsed, 'mobile-open': sidebar.mobileOpen }]">
    <div class="logo-section">
      <img v-if="!isCollapsed" src="@/assets/img/logo.png" alt="Service 360" class="logo-img" />
      <button class="panel-btn desktop-only" @click="sidebar.toggle">
        <UiIcon :name="isCollapsed ? 'PanelLeftOpen' : 'PanelLeft'" class="icon" />
      </button>
    </div>

    <nav class="nav-links">
      <SidebarItem
        v-for="item in filteredItems"
        :key="item.path || item.label"
        :icon="item.icon"
        :label="item.label"
        :to="item.path"
        :children="item.children"
        :is-collapsed="isCollapsed"
        @clicked="handleItemClick"
      />
    </nav>
  </aside>
</template>

<script setup>
import SidebarItem from '@/shared/ui/SidebarItem.vue'
import UiIcon from '@/shared/ui/UiIcon.vue'
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useSidebarStore } from '@/app/stores/sidebar'

const sidebar = useSidebarStore()

const isMobile = ref(window.innerWidth < 768);

const isCollapsed = computed(() => {
  return isMobile.value ? false : sidebar.collapsed;
});

const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
  sidebar.setCollapsed(isMobile.value);
}

const handleItemClick = () => {
  if (isMobile.value && sidebar.mobileOpen) {
    sidebar.toggleMobile();
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

const allItems = [
  {
    label: 'Главная',
    path: '/main',
    icon: 'Home'
  },
  {
    label: 'Планирование',
    icon: 'ClipboardList',
    children: [
      { label: 'План работ', path: '/work-plan', permission: 'plan' },
      { label: 'Планирование ресурсов', path: '/resource-planning', permission: 'plan' }
    ]
  },
  {
    label: 'Исполнение',
    icon: 'CheckSquare',
    children: [
      { label: 'Журнал работ', path: '/work-log', permission: '' },
      { label: 'Журнал осмотров и проверок', path: '/inspections', permission: 'ins' },
      { label: 'Журнал параметров', path: '/parameters', permission: 'par' },
      { label: 'Журнал неисправностей', path: '/defects', permission: 'def' },
      { label: 'Журнал событий и запросов на работы', path: '/incidents', permission: 'inc' }
    ]
  },
  {
    label: 'Отчеты',
    icon: 'FileText',
    children: [
      { label: 'Отчеты по объектам', path: '/reports/objects', permission: 'rep' },
      { label: 'Отчеты по работам', path: '/reports/work', permission: 'rep' }
    ]
  }
]

const getUserPermissions = () => {
  const curUserString = localStorage.getItem('curUser')
  if (!curUserString) return new Set()

  try {
    const curUser = JSON.parse(curUserString)
    const target = curUser?.result?.target || ''
    const permissions = target.split(',').map(p => p.split(':')[0])
    return new Set(permissions)
  } catch (e) {
    console.error('Ошибка парсинга данных пользователя:', e)
    return new Set()
  }
}

const userPermissions = getUserPermissions()

const filterItems = (items) => {
  return items.filter(item => {
    // Проверяем разрешение для самого пункта
    if (item.permission && !userPermissions.has(item.permission)) {
      return false
    }
    
    // Если есть дочерние элементы, фильтруем их
    if (item.children) {
      item.children = filterItems(item.children)
      // Показываем родительский элемент только если есть доступные дочерние
      return item.children.length > 0
    }
    
    return true
  })
}

const filteredItems = computed(() => filterItems(JSON.parse(JSON.stringify(allItems))))
</script>

<style scoped>
.sidebar {
  width: 250px;
  background-color: #F8FAFC;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e2e8f0;
  min-height: 100vh;
  transition: width 0.3s ease, padding 0.3s ease;
}

.desktop-only {
  display: flex;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -250px;
    top: 0;
    height: 100%;
    z-index: 1000;
    transition: left 0.3s ease;
    width: 250px;
  }

  .sidebar:not(.mobile-open) {
    display: none;
  }
}

.sidebar.collapsed {
  width: 60px;
  padding: 16px 4px;
}

@media (max-width: 768px) {
  .sidebar.mobile-open {
    left: 0;
  }
  .desktop-only {
    display: none;
  }
}

.logo-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
  margin-bottom: 24px;
  padding: 0 8px;
}

.logo-img {
  height: 50px;
  object-fit: contain;
}

.panel-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.panel-btn .icon {
  width: 20px;
  height: 20px;
  color: #4a5568;
  transition: color 0.2s;
}

.panel-btn:hover .icon {
  color: #2b6cb0;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>