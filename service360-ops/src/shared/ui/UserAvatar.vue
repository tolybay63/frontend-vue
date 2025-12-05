<!-- components/ui/UserAvatar.vue -->
<template>
  <div class="avatar-wrapper" ref="avatarRef">
    <div class="avatar" @click="toggleMenu">
      {{ initials }}
    </div>
    <div v-if="menuOpen" class="dropdown">
      <div class="dropdown-item" @click="logout">Выйти</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { logout as authLogout } from '@/shared/api/auth/auth'

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

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
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
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  min-width: 100px;
  z-index: 20;
}

.dropdown-item {
  padding: 8px 12px;
  font-size: 14px;
  color: #4a5568;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #edf2f7;
  color: #2b6cb0;
}
</style>
