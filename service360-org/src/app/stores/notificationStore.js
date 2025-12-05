import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  const message = ref('')
  const type = ref('success')
  const visible = ref(false)
  const duration = ref(3000)

  const showNotification = (msg, msgType = 'success', ms = 3000) => {
    message.value = msg
    type.value = msgType
    duration.value = ms
    visible.value = true

    setTimeout(() => {
      visible.value = false
    }, ms)
  }

  return { message, type, visible, duration, showNotification }
})
