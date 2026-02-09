<template>
  <div class="user-notifications">
    <TransitionGroup name="notif">
      <div
        v-for="notif in visibleNotifications"
        :key="notif.id"
        class="notif-toast"
      >
        <div class="notif-icon-area">
          <div class="notif-icon-circle">
            <UiIcon name="Bell" class="notif-icon" />
          </div>
          <span class="unread-dot"></span>
        </div>

        <div class="notif-content">
          <div class="notif-top">
            <span class="notif-title">{{ notif.name }}</span>
            <span class="notif-time">{{ formatTime(notif.TimeSending) }}</span>
          </div>
          <p class="notif-body">{{ notif.Description }}</p>
        </div>

        <button class="notif-close" @click="dismissNotification(notif.id)">
          <UiIcon name="X" class="close-icon" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { loadNotificationUser } from '@/shared/api/notifications/notificationApi'
import UiIcon from '@/shared/ui/UiIcon.vue'

const visibleNotifications = ref([])
const dismissedIds = ref(new Set())
let pollInterval = null

const formatTime = (dateStr) => {
  if (!dateStr || dateStr.startsWith('0000')) return ''
  try {
    const date = new Date(dateStr)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  } catch {
    return ''
  }
}

const fetchNotifications = async () => {
  try {
    const records = await loadNotificationUser()

    // Показываем только те, у которых нет TimeReading (непрочитанные) и которые не были закрыты
    const newNotifications = records.filter(r => {
      const notRead = !r.TimeReading || r.TimeReading === '0000-01-01T00:00:00'
      return notRead && !dismissedIds.value.has(r.id)
    })

    visibleNotifications.value = newNotifications
  } catch (error) {
    console.error('Ошибка загрузки уведомлений:', error)
  }
}

const dismissNotification = (id) => {
  dismissedIds.value.add(id)
  visibleNotifications.value = visibleNotifications.value.filter(n => n.id !== id)
}

onMounted(() => {
  fetchNotifications()
  pollInterval = setInterval(fetchNotifications, 300000)
})

onBeforeUnmount(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>

<style scoped>
.user-notifications {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2000;
  display: flex;
  flex-direction: column-reverse;
  gap: 16px;
  max-width: 400px;
  max-height: 80vh;
  overflow: visible;
  pointer-events: none;
}

.notif-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  min-width: 320px;
  position: relative;
}

.notif-icon-area {
  flex-shrink: 0;
  position: relative;
}

.unread-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  border: 2px solid #fff;
}

.notif-icon-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-icon {
  width: 18px;
  height: 18px;
  color: #3b82f6;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  gap: 8px;
}

.notif-title {
  font-weight: 600;
  font-size: 13px;
  color: #1a202c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-time {
  font-size: 12px;
  color: #a0aec0;
  white-space: nowrap;
  flex-shrink: 0;
}

.notif-body {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  white-space: pre-line;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.notif-close:hover {
  background: #f1f5f9;
}

.close-icon {
  width: 14px;
  height: 14px;
  color: #94a3b8;
}

.notif-close:hover .close-icon {
  color: #475569;
}

/* Анимации */
.notif-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.notif-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.notif-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}
.notif-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}

@media (max-width: 480px) {
  .user-notifications {
    right: 12px;
    bottom: 12px;
    left: 12px;
    max-width: none;
  }
  .notif-toast {
    min-width: auto;
  }
}
</style>
