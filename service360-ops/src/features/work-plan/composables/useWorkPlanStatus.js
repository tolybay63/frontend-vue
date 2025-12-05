import { parseLocalDate, getTodayStart, getDaysDifference } from '@/shared/utils/dateHelpers';

/**
 * Composable для работы со статусами плана работ
 * Содержит логику определения статусов работ, проверки просрочки и форматирования текста
 */
export function useWorkPlanStatus() {
  /**
   * Проверяет, является ли работа просроченной
   * @param {Object} event - Событие/работа
   * @param {string} event.FactDateEnd - Фактическая дата завершения
   * @param {string} event.PlanDateEnd - Плановая дата завершения
   * @returns {boolean} - true если работа просрочена
   */
  const getIsOverdue = (event) => {
    if (event.FactDateEnd && event.FactDateEnd !== '0000-01-01') return false;
    if (!event.PlanDateEnd) return false;

    const endDate = parseLocalDate(event.PlanDateEnd);
    const today = getTodayStart();

    return endDate.getTime() < today.getTime();
  };

  /**
   * Получает текст статуса для отображения
   * @param {Object} event - Событие/работа
   * @returns {string} - Текст статуса ("Завершено", "Сегодня", "Осталось N дн." и т.д.)
   */
  const getStatusText = (event) => {
    if (event.FactDateEnd && event.FactDateEnd !== '0000-01-01') {
      return 'Завершено';
    }

    if (!event.PlanDateEnd) return 'Срок не указан';

    const endDate = parseLocalDate(event.PlanDateEnd);
    const today = getTodayStart();

    const diffDays = getDaysDifference(endDate, today);

    if (diffDays < 0) {
      return `Просрочено на ${Math.abs(diffDays)} дн.`;
    } else if (diffDays === 0) {
      return 'Сегодня';
    } else {
      if (diffDays === 1) {
        return `Остался 1 день`;
      }
      return `Осталось ${diffDays} дн.`;
    }
  };

  /**
   * Получает CSS класс для статуса
   * @param {Object} event - Событие/работа
   * @returns {string} - CSS класс ("completed", "overdue", "open", "draft")
   */
  const getStatusClass = (event) => {
    if (event.FactDateEnd && event.FactDateEnd !== '0000-01-01') {
      return 'completed';
    }

    if (!event.PlanDateEnd) return 'draft';

    if (getIsOverdue(event)) {
      return 'overdue';
    }

    return 'open';
  };

  return {
    getIsOverdue,
    getStatusText,
    getStatusClass,
  };
}
