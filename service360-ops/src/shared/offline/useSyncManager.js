import { watch } from 'vue';
import { useNetworkStatus } from './useNetworkStatus';
import { replayQueue, clearSyncedItems, pendingCount } from './syncQueue';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { prefetchAllReferenceData } from './prefetchReferenceData';

export function useSyncManager() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const notifications = useNotificationStore();

  watch(isOnline, async (online) => {
    if (online && wasOffline.value) {
      wasOffline.value = false;

      notifications.showNotification(
        'Соединение восстановлено. Синхронизация...',
        'info',
        3000
      );

      const results = await replayQueue();

      if (results.synced > 0) {
        notifications.showNotification(
          `Синхронизировано ${results.synced} запрос(ов)`,
          'success',
          4000
        );
      }

      if (results.failed > 0) {
        notifications.showNotification(
          `${results.failed} запрос(ов) не удалось синхронизировать`,
          'error',
          5000
        );
      }

      // Обновить кэш справочников
      prefetchAllReferenceData();

      // Очистить старые синхронизированные записи
      clearSyncedItems();
    }
  });

  return { isOnline, pendingCount };
}
