<template>
  <NaiveProvider>
    <div v-if="!isLoginPage" class="app-layout">
      <div v-if="sidebar.mobileOpen" class="sidebar-overlay" @click="sidebar.toggleMobile"></div>
      <Sidebar />
      <div class="main-content">
        <Navbar />
        <router-view />
        <AppNotification />
      </div>
    </div>

    <div v-else class="login-layout">
      <router-view />
    </div>
  </NaiveProvider>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './app/layouts/Sidebar.vue'
import Navbar from './app/layouts/Navbar.vue'
import NaiveProvider from './naive.config.js'
import AppNotification from './app/layouts/AppNotification.vue'
import { useSidebarStore } from './app/stores/sidebar'

const route = useRoute()
const isLoginPage = computed(() => route.path === '/login')
const sidebar = useSidebarStore()

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
