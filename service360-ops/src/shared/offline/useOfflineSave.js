import { useNotificationStore } from '@/app/stores/notificationStore';

export function useOfflineSave() {
  const notifications = useNotificationStore();

  function handleSaveResult(result, successMessage = 'Данные успешно сохранены') {
    if (result?.data?.result?.__offline) {
      notifications.showNotification(
        'Данные сохранены офлайн и будут отправлены при восстановлении связи',
        'warning',
        4000
      );
      return { offline: true, queueId: result.data.result.queueId };
    }

    notifications.showNotification(successMessage, 'success', 3000);
    return { offline: false };
  }

  return { handleSaveResult };
}
