<template>
  <transition name="fade">
    <div v-if="show" class="splash-screen">
      <img src="@/assets/img/s360.PNG" alt="Service360" class="splash-logo" />
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const show = ref(true)

onMounted(() => {
  // Скрываем splash screen через 2 секунды
  setTimeout(() => {
    show.value = false
  }, 2000)
})
</script>

<style scoped>
.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.splash-logo {
  width: 200px;
  height: auto;
  animation: zoomIn 0.8s ease-out;
}

@keyframes zoomIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Показывать только на мобильных устройствах */
@media (min-width: 769px) {
  .splash-screen {
    display: none;
  }
}
</style>
