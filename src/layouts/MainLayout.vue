<template>
  <div class="min-h-screen flex flex-col">
    <header class="app-header">
      <div class="brand">
        <img :src="logoUrl" alt="logo" class="logo" />
        <span class="title">{{ title }}</span>
      </div>
      <nav class="nav">
        <router-link to="/">Конструктор</router-link>
        <router-link to="/templates">Шаблоны</router-link>
        <router-link to="/about">О проекте</router-link>
      </nav>
      <div v-if="user" class="user-block">
        <div class="user-info">
          <span class="user-name">{{ user.fullname || user.name || user.login }}</span>
          <span class="user-role">{{ user.email }}</span>
        </div>
        <button class="logout" type="button" @click="handleLogout">Выйти</button>
      </div>
    </header>
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import logoUrl from '@/shared/assets/logo.png'
import { useAuthStore } from '@/shared/stores/auth'

const title = import.meta.env.VITE_APP_NAME || 'Report Constructor'
const router = useRouter()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

async function handleLogout() {
  await authStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  gap: 16px;
  flex-wrap: wrap;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  height: 28px;
}
.title {
  font-weight: 600;
}
.nav a {
  margin-left: 16px;
}
.user-block {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-info {
  display: flex;
  flex-direction: column;
  text-align: right;
  line-height: 1.2;
}
.user-name {
  font-weight: 600;
}
.user-role {
  font-size: 12px;
  color: #6b7280;
}
.logout {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 14px;
}
.logout:hover {
  background: #f3f4f6;
}
</style>
