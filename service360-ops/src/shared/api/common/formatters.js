/**
 * Форматирует дату в формат DD.MM.YYYY для отображения
 * @param {string|Date} date - Дата для форматирования
 * @returns {string|null} Отформатированная дата или null
 */
export function formatDate(date) {
  if (!date) return null;

  const parsedDate = new Date(date);
  if (isNaN(parsedDate)) return null;

  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const year = parsedDate.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * Форматирует дату в формат YYYY-MM-DD для отправки на бэкенд
 * @param {string|number|Date} date - Дата для форматирования
 * @returns {string|null} Отформатированная дата в формате YYYY-MM-DD или null
 */
export function formatDateForBackend(date) {
  if (!date) return null;

  let d;
  if (typeof date === 'string' && date.length >= 10) {
    d = new Date(date);
  } else if (typeof date === 'number' || date instanceof Date) {
    d = new Date(date);
  } else {
    return null;
  }

  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
