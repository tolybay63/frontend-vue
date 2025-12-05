<template>
  <transition name="fade-slide">
    <div class="notification-container top-center" v-if="visible">
      <div class="notification" :class="type">
        
        <div class="content-wrapper">
          <UiIcon :name="iconName" :color="messageColor" class="message-icon" />
          <p class="main-message" :style="{ color: messageColor }">{{ message }}</p>
        </div>
        
        <button @click="visible = false" class="close-button" :style="{ color: messageColor }">✕</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotificationStore } from '@/app/stores/notificationStore'
import UiIcon from '@/shared/ui/UiIcon.vue'

const store = useNotificationStore()
const { message, type, visible, duration } = storeToRefs(store) 

const colorMap = {
  success: { text: '#38A169', icon: 'CheckCircle' }, 
  error: { text: '#C53030', icon: 'XCircle' },       
  warning: { text: '#C05621', icon: 'AlertTriangle' }, 
  info: { text: '#3182CE', icon: 'Info' }             
}

const messageColor = computed(() => colorMap[type.value]?.text || '#2d3748') 
const iconName = computed(() => colorMap[type.value]?.icon || 'AlertCircle')
</script>

<style scoped>

.notification-container.top-center {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  
  width: 90%; 
  max-width: 500px;
  z-index: 9999;
}

.notification {
  position: relative;
  display: flex;
  justify-content: space-between;
  padding: 0;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid;
}

.content-wrapper {
  padding: 12px 15px 12px 15px; 
  flex-grow: 1;
  display: flex; 
  align-items: center; 
}

.message-icon {
    width: 18px !important; 
    height: 18px !important; 
    margin-right: 8px !important; 
    flex-shrink: 0;
}

.main-message {
  font-size: 1em; 
  font-weight: 400; 
  margin: 0;
  line-height: 1.4;
}

.close-button {
  background: transparent;
  border: none;
  font-size: 16px; 
  cursor: pointer;
  padding: 12px 15px 12px 10px;
  align-self: center; 
  line-height: 1;
  opacity: 0.8; 
  flex-shrink: 0;
}

.close-button:hover {
  opacity: 1;
}

.notification.success {
  background-color: #F0FFF4;
  border-color: #C6F6D5;
}

.notification.error {
  background-color: #FFF5F5;
  border-color: #FED7D7;
}

.notification.warning {
  background-color: #FFFAF0;
  border-color: #FEEBC8;
}

.notification.info {
  background-color: #EBF8FF;
  border-color: #BEE3F8;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px) translateX(-50%);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) translateX(-50%);
}
.fade-slide-enter-to,
.fade-slide-leave-from {
    transform: translateY(0) translateX(-50%);
}
</style>