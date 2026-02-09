<template>
  <div class="notif-wrapper" ref="wrapperRef">
    <button class="notif-btn" @click="togglePanel">
      <UiIcon name="Bell" class="icon" />
      <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <Transition name="panel">
      <div v-if="panelOpen" class="notif-panel">
        <div class="notif-panel-arrow"></div>

        <div class="notif-panel-header">
          <div class="notif-panel-header-left">
            <span class="notif-panel-title">Уведомления</span>
            <span v-if="unreadCount > 0" class="notif-panel-badge">{{ unreadCount }}</span>
          </div>
        </div>

        <div class="notif-panel-list">
          <div v-if="notifications.length === 0" class="notif-panel-empty">
            <UiIcon name="BellOff" class="notif-panel-empty-icon" />
            <span>Нет уведомлений</span>
          </div>

          <div
            v-for="notif in notifications"
            :key="notif.id"
            class="notif-panel-item"
            :class="{ 'notif-unread': isUnread(notif) }"
          >
            <div class="notif-panel-item-indicator">
              <span v-if="isUnread(notif)" class="notif-panel-item-dot"></span>
            </div>
            <div class="notif-panel-item-content">
              <div class="notif-panel-item-top">
                <span class="notif-panel-item-name">{{ notif.name }}</span>
                <span class="notif-panel-item-time">{{ formatDateTime(notif.TimeSending) }}</span>
              </div>
              <p
                class="notif-panel-item-desc"
                :class="{ 'notif-desc-collapsed': !expandedIds.has(notif.id) }"
                @click="toggleExpand(notif.id)"
              >{{ notif.Description }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import UiIcon from '@/shared/ui/UiIcon.vue'
import { loadNotificationUser, markNotificationRead } from '@/shared/api/notifications/notificationApi'

const panelOpen = ref(false)
const wrapperRef = ref(null)
const notifications = ref([])
const expandedIds = ref(new Set())
let pollInterval = null

const toggleExpand = async (id) => {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)

    // Отмечаем как прочитанное при первом раскрытии
    const notif = notifications.value.find(n => n.id === id)
    if (notif && isUnread(notif)) {
      try {
        await markNotificationRead(id)
        notif.TimeReading = new Date().toISOString()
      } catch (error) {
        console.error('Ошибка при отметке уведомления:', error)
      }
    }
  }
  expandedIds.value = new Set(expandedIds.value)
}

const isUnread = (notif) => {
  return !notif.TimeReading || notif.TimeReading === '0000-01-01T00:00:00'
}

const unreadCount = computed(() => {
  return notifications.value.filter(n => isUnread(n)).length
})

const formatDateTime = (dateStr) => {
  if (!dateStr || dateStr.startsWith('0000')) return ''
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const time = `${hours}:${minutes}`

    const isToday = date.toDateString() === now.toDateString()
    if (isToday) return `Сегодня, ${time}`

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return `Вчера, ${time}`

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${day}.${month}, ${time}`
  } catch {
    return ''
  }
}

const fetchNotifications = async () => {
  try {
    const records = await loadNotificationUser()
    notifications.value = records
  } catch (error) {
    console.error('Ошибка загрузки уведомлений:', error)
  }
}

const togglePanel = () => {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) {
    fetchNotifications()
  }
}

const handleClickOutside = (e) => {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target)) {
    panelOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  fetchNotifications()
  pollInterval = setInterval(fetchNotifications, 300000)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>

<style scoped>
.notif-wrapper {
  position: relative;
}

.notif-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  transition: background 0.15s;
}

.notif-btn:hover {
  background: #f1f5f9;
}

.notif-btn .icon {
  width: 20px;
  height: 20px;
  color: #4a5568;
  transition: color 0.2s;
}

.notif-btn:hover .icon {
  color: #2b6cb0;
}

.notif-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  line-height: 1;
}

/* Панель уведомлений */
.notif-panel {
  position: absolute;
  top: calc(100% + 14px);
  right: -8px;
  width: 380px;
  max-height: 480px;
  background: #fff;
  border: 1px solid #e8ecf1;
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  z-index: 200;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.notif-panel-arrow {
  position: absolute;
  top: -6px;
  right: 16px;
  width: 12px;
  height: 12px;
  background: #fff;
  border-left: 1px solid #e8ecf1;
  border-top: 1px solid #e8ecf1;
  transform: rotate(45deg);
  z-index: 1;
}

.notif-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.notif-panel-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notif-panel-title {
  font-weight: 600;
  font-size: 15px;
  color: #1a202c;
}

.notif-panel-badge {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: #3b82f6;
  border-radius: 10px;
  padding: 1px 7px;
  line-height: 1.4;
}

.notif-panel-list {
  overflow-y: auto;
  flex: 1;
}

.notif-panel-list::-webkit-scrollbar {
  width: 4px;
}

.notif-panel-list::-webkit-scrollbar-track {
  background: transparent;
}

.notif-panel-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.notif-panel-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.notif-panel-empty {
  padding: 40px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #a0aec0;
  font-size: 13px;
}

.notif-panel-empty-icon {
  width: 32px;
  height: 32px;
  color: #cbd5e1;
}

.notif-panel-item {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 12px 18px;
  border-bottom: 1px solid #f7fafc;
  transition: background 0.15s;
  cursor: default;
}

.notif-panel-item:last-child {
  border-bottom: none;
}

.notif-panel-item:hover {
  background: #f8fafc;
}

.notif-unread {
  background: #f0f7ff;
}

.notif-unread:hover {
  background: #e8f2ff;
}

.notif-panel-item-indicator {
  width: 18px;
  min-width: 18px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-top: 5px;
}

.notif-panel-item-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3b82f6;
}

.notif-panel-item-content {
  flex: 1;
  min-width: 0;
}

.notif-panel-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}

.notif-panel-item-name {
  font-weight: 600;
  font-size: 13px;
  color: #1a202c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-panel-item-time {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  flex-shrink: 0;
}

.notif-panel-item-desc {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.45;
  white-space: pre-line;
  cursor: pointer;
}

.notif-desc-collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Анимация панели */
.panel-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
