<template>
  <div class="profile-page">
    <!-- Header -->
    <div class="profile-header">
      <div class="avatar-large">
        {{ initials }}
      </div>
      <div class="header-info">
        <h1 class="profile-name">{{ info.fullName || fullName }}</h1>
        <span class="profile-position">{{ info.namePosition || '—' }}</span>
        <span class="profile-location">{{ info.nameLocation || '—' }}</span>
      </div>
      <div class="header-actions">
        <button class="btn-change-password" @click="showPasswordModal = true">
          <UiIcon name="Key" />
          Изменить пароль
        </button>
        <button class="btn-logout" @click="handleLogout">
          <UiIcon name="LogOut" />
          Выйти
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="profile-content">
      <!-- Личные данные -->
      <div class="section">
        <h3 class="section-title">
          <UiIcon name="User" />
          Личные данные
        </h3>
        <div class="fields-grid">
          <div class="field">
            <span class="field-label">Фамилия</span>
            <span class="field-value">{{ info.UserSecondName || '—' }}</span>
          </div>
          <div class="field">
            <span class="field-label">Имя</span>
            <span class="field-value">{{ info.UserFirstName || '—' }}</span>
          </div>
          <div class="field">
            <span class="field-label">Отчество</span>
            <span class="field-value">{{ info.UserMiddleName || '—' }}</span>
          </div>
          <div class="field">
            <span class="field-label">Пол</span>
            <span class="field-value">{{ info.nameUserSex || '—' }}</span>
          </div>
          <div class="field">
            <span class="field-label">Дата рождения</span>
            <span class="field-value">{{ formatDate(info.UserDateBirth) }}</span>
          </div>
          <div class="field">
            <span class="field-label">Логин</span>
            <span class="field-value">{{ info.login || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Контакты -->
      <div class="section">
        <h3 class="section-title">
          <UiIcon name="Phone" />
          Контакты
        </h3>
        <div class="fields-grid">
          <div class="field">
            <span class="field-label">Телефон</span>
            <span class="field-value">{{ info.UserPhone || '—' }}</span>
          </div>
          <div class="field">
            <span class="field-label">Email</span>
            <span class="field-value">{{ info.UserEmail || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Рабочая информация -->
      <div class="section">
        <h3 class="section-title">
          <UiIcon name="Briefcase" />
          Рабочая информация
        </h3>
        <div class="fields-grid">
          <div class="field">
            <span class="field-label">Должность</span>
            <span class="field-value">{{ info.namePosition || '—' }}</span>
          </div>
          <div class="field">
            <span class="field-label">Подразделение</span>
            <span class="field-value">{{ info.nameLocation || '—' }}</span>
          </div>
          <div class="field">
            <span class="field-label">Табельный номер</span>
            <span class="field-value">{{ info.TabNumber || '—' }}</span>
          </div>
          <div class="field">
            <span class="field-label">Дата приёма</span>
            <span class="field-value">{{ formatDate(info.DateEmployment) }}</span>
          </div>
          <div class="field">
            <span class="field-label">Дата увольнения</span>
            <span class="field-value">{{ formatDate(info.DateDismissal) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Модалка смены пароля -->
    <ModalChangePassword v-model="showPasswordModal" :userId="curUserId" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { logout as authLogout } from '@/shared/api/auth/auth'
import UiIcon from '@/shared/ui/UiIcon.vue'
import ModalChangePassword from '@/features/profile/components/ModalChangePassword.vue'

const router = useRouter()

const info = ref({})
try {
  info.value = JSON.parse(localStorage.getItem('personnalInfo')) || {}
} catch (e) {
  info.value = {}
}

let curUserId = null
try {
  const curUser = JSON.parse(localStorage.getItem('curUser'))
  curUserId = curUser?.result?.id || null
} catch (e) {
  curUserId = null
}

const initials = computed(() => {
  const first = info.value.UserFirstName?.charAt(0) || ''
  const second = info.value.UserSecondName?.charAt(0) || ''
  return (second + first).toUpperCase()
})

const fullName = computed(() => {
  const parts = [
    info.value.UserSecondName,
    info.value.UserFirstName,
    info.value.UserMiddleName
  ].filter(Boolean)
  return parts.join(' ') || 'Пользователь'
})

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === '0000-01-01') return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

const handleLogout = () => {
  authLogout()
  router.push('/login')
}

const showPasswordModal = ref(false)
</script>

<style scoped>
.profile-page {
  height: 100%;
  overflow-y: auto;
  background: #f7fafc;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 32px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.avatar-large {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #2b6cb0;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.profile-position {
  font-size: 14px;
  color: #2b6cb0;
  font-weight: 500;
}

.profile-location {
  font-size: 13px;
  color: #64748b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.btn-change-password {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #1e293b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-change-password:hover {
  background: #f1f5f9;
  border-color: #2b6cb0;
  color: #2b6cb0;
}

.btn-change-password :deep(.icon) {
  width: 18px;
  height: 18px;
  color: #2b6cb0;
}

.btn-logout {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff;
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.btn-logout:hover {
  background: #fef2f2;
  border-color: #f87171;
}

.btn-logout :deep(.icon) {
  width: 18px;
  height: 18px;
  color: #dc2626;
}

.profile-content {
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  padding: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.section-title :deep(.icon) {
  width: 20px;
  height: 20px;
  color: #2b6cb0;
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.field-value {
  font-size: 15px;
  color: #1e293b;
  font-weight: 500;
}

@media (max-width: 1024px) {
  .fields-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
    padding: 20px 16px;
  }

  .header-info {
    align-items: center;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
  }

  .btn-change-password,
  .btn-logout {
    width: 100%;
    justify-content: center;
  }

  .profile-content {
    padding: 16px;
    gap: 16px;
  }

  .section {
    padding: 16px;
  }

  .fields-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
