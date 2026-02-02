<!-- components/ui/UserAvatar.vue -->
<template>
  <div class="avatar-wrapper" ref="avatarRef">
    <div class="avatar" @click="toggleMenu">
      {{ initials }}
    </div>
    <div v-if="menuOpen" class="dropdown">
      <div class="dropdown-header">
        <span class="user-name">{{ fullName }}</span>
      </div>
      <div class="dropdown-divider"></div>
      <div class="dropdown-item" @click="goToProfile">
        <UiIcon name="User" />
        Профиль
      </div>
      <div class="dropdown-item logout" @click="logout">
        <UiIcon name="LogOut" />
        Выйти
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { logout as authLogout } from '@/shared/api/auth/auth'
import UiIcon from '@/shared/ui/UiIcon.vue'

const menuOpen = ref(false)
const avatarRef = ref(null)
const router = useRouter()

const personnalInfo = ref({})
try {
  personnalInfo.value = JSON.parse(localStorage.getItem('personnalInfo')) || {}
} catch (e) {
  personnalInfo.value = {}
}

const initials = computed(() => {
  const first = personnalInfo.value.UserFirstName?.charAt(0) || ''
  const second = personnalInfo.value.UserSecondName?.charAt(0) || ''
  return (second + first).toUpperCase()
})

const fullName = computed(() => {
  const first = personnalInfo.value.UserFirstName || ''
  const second = personnalInfo.value.UserSecondName || ''
  return `${second} ${first}`.trim() || 'Пользователь'
})

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const goToProfile = () => {
  menuOpen.value = false
  router.push('/profile')
}

const logout = () => {
  menuOpen.value = false
  authLogout()
  router.push('/login')
}

const handleClickOutside = (e) => {
  if (!avatarRef.value.contains(e.target)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e6f0fb;
  color: #2b6cb0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.dropdown {
  position: absolute;
  right: 0;
  top: 110%;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  z-index: 20;
  overflow: hidden;
}

.dropdown-header {
  padding: 12px 14px;
  background: #f8fafc;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
}

.dropdown-item {
  padding: 10px 14px;
  font-size: 14px;
  color: #4a5568;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background-color 0.15s;
}

.dropdown-item:hover {
  background-color: #f1f5f9;
  color: #2b6cb0;
}

.dropdown-item.logout:hover {
  background-color: #fef2f2;
  color: #dc2626;
}

.dropdown-item :deep(.icon) {
  width: 18px;
  height: 18px;
}
</style>
