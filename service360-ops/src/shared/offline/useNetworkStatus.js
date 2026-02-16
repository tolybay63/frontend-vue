import { ref, onMounted, onUnmounted } from 'vue';

const isOnline = ref(navigator.onLine);
const wasOffline = ref(false);

export function useNetworkStatus() {
  const handleOnline = () => {
    if (!isOnline.value) {
      wasOffline.value = true;
    }
    isOnline.value = true;
  };

  const handleOffline = () => {
    isOnline.value = false;
  };

  onMounted(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  });

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });

  return { isOnline, wasOffline };
}
