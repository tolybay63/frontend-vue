import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  let notificationIdCounter = 0

  const showNotification = (msg, msgType = 'success', ms = 3000) => {
    const id = notificationIdCounter++
    const notification = {
      id,
      message: msg,
      type: msgType,
      duration: ms
    }

    notifications.value.push(notification)

    setTimeout(() => {
      removeNotification(id)
    }, ms)
  }

  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  return { notifications, showNotification, removeNotification }
})
