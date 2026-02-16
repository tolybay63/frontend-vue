<template>
  <transition name="fade">
    <div v-if="!isOnline" class="offline-badge">
      <UiIcon name="WifiOff" :size="14" />
      <span>Офлайн</span>
    </div>
  </transition>
</template>

<script setup>
import UiIcon from '@/shared/ui/UiIcon.vue';
import { useNetworkStatus } from '@/shared/offline/useNetworkStatus';

const { isOnline } = useNetworkStatus();
</script>

<style scoped>
.offline-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 6px;
  color: #DC2626;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
