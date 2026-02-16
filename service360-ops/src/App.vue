<template>
  <NaiveProvider>
    <SplashScreen />

    <div v-if="!isLoginPage" class="app-layout">
      <div v-if="sidebar.mobileOpen" class="sidebar-overlay" @click="sidebar.toggleMobile"></div>
      <Sidebar />
      <div class="main-content">
        <Navbar />
        <router-view v-slot="{ Component }">
          <keep-alive :include="keepAliveInclude">
            <component :is="Component" />
          </keep-alive>
        </router-view>
        <AppNotification />
        <UserNotifications />
      </div>
    </div>

    <div v-else class="login-layout">
      <router-view />
    </div>
  </NaiveProvider>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './app/layouts/Sidebar.vue'
import Navbar from './app/layouts/Navbar.vue'
import NaiveProvider from './naive.config.js'
import AppNotification from './app/layouts/AppNotification.vue'
import UserNotifications from './app/layouts/UserNotifications.vue'
import SplashScreen from './components/SplashScreen.vue'
import { useSidebarStore } from './app/stores/sidebar'
import { prefetchAllReferenceData } from './shared/offline/prefetchReferenceData'
import { useSyncManager } from './shared/offline/useSyncManager'

const route = useRoute()
const isLoginPage = computed(() => route.path === '/login')
const sidebar = useSidebarStore()

// Офлайн-синхронизация
useSyncManager()

// Предзагрузка справочников для офлайн-работы
onMounted(() => {
  if (localStorage.getItem('personnalInfo')) {
    prefetchAllReferenceData();
  }
})

// Динамическое кэширование WorkLog
const keepAliveInclude = ref([])

watch(
  () => route.path,
  (newPath, oldPath) => {
    const workLogPath = '/work-log'
    const workLogFormPathPrefix = '/work-log/record/'

    // При заходе на WorkLog - добавляем в кэш
    if (newPath === workLogPath) {
      // Если пришли с WorkLogForm - оставляем в кэше (уже закэширован)
      // Если пришли откуда-то ещё - это свежий заход, но всё равно кэшируем
      // чтобы при переходе на WorkLogForm состояние сохранилось
      if (!keepAliveInclude.value.includes('WorkLog')) {
        keepAliveInclude.value = ['WorkLog']
      }
    }
    // При переходе на WorkLogForm - сохраняем WorkLog в кэше
    else if (newPath.startsWith(workLogFormPathPrefix)) {
      if (!keepAliveInclude.value.includes('WorkLog')) {
        keepAliveInclude.value = ['WorkLog']
      }
    }
    // При уходе на любую другую страницу - очищаем кэш
    else {
      keepAliveInclude.value = []
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden; 
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; 
}

.login-layout {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;
  overflow: hidden;
}

.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .sidebar-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 999;
    opacity: 1;
    transition: opacity 0.3s ease;
  }
}

</style>
