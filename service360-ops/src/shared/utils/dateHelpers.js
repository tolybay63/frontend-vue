/**
 * Утилиты для работы с датами
 * Все функции используют локальное время для избежания проблем с UTC смещением
 */

/**
 * Парсит строку даты в локальное время (избегая UTC смещения)
 * @param {string} dateString - Строка даты в формате "YYYY-MM-DD" или "YYYY-MM-DDTHH:mm:ss"
 * @returns {Date} - Объект Date в локальном времени
 * @example
 * parseLocalDate("2025-11-13") // => Date объект для 13 ноября 2025 в локальном времени
 */
export function parseLocalDate(dateString) {
  if (!dateString) return null;

  const [year, month, day] = dateString.split('T')[0].split('-');
  return new Date(year, month - 1, day);
}

/**
 * Получает сегодняшнюю дату с обнулённым временем (00:00:00)
 * @returns {Date} - Сегодняшняя дата с временем 00:00:00
 * @example
 * getTodayStart() // => Date объект для сегодня 00:00:00
 */
export function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Возвращает разницу в днях между двумя датами
 * @param {Date} date1 - Первая дата
 * @param {Date} date2 - Вторая дата
 * @returns {number} - Разница в днях (положительное число если date1 > date2)
 * @example
 * getDaysDifference(new Date(2025, 10, 15), new Date(2025, 10, 13)) // => 2
 */
export function getDaysDifference(date1, date2) {
  const diffTime = date1.getTime() - date2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Проверяет, является ли дата просроченной (прошла ли она)
 * @param {string} dateString - Строка даты для проверки
 * @param {Date} [compareDate=getTodayStart()] - Дата для сравнения (по умолчанию сегодня)
 * @returns {boolean} - true если дата просрочена
 * @example
 * isOverdue("2025-11-10") // => true если сегодня позже 10 ноября
 */
export function isOverdue(dateString, compareDate = null) {
  if (!dateString) return false;

  const date = parseLocalDate(dateString);
  const today = compareDate || getTodayStart();

  return date.getTime() < today.getTime();
}

/**
 * Форматирует дату в строку формата "YYYY-MM-DD"
 * @param {Date} date - Дата для форматирования
 * @returns {string} - Отформатированная строка даты
 * @example
 * formatDate(new Date(2025, 10, 13)) // => "2025-11-13"
 */
export function formatDate(date) {
  if (!date || !(date instanceof Date)) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Форматирует дату в человекочитаемый формат "ДД.ММ.ГГГГ"
 * @param {string|Date} date - Дата для форматирования
 * @returns {string} - Отформатированная строка даты
 * @example
 * formatDateHuman("2025-11-13") // => "13.11.2025"
 */
export function formatDateHuman(date) {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
  if (!dateObj) return '';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * Проверяет, является ли дата сегодняшней
 * @param {string|Date} date - Дата для проверки
 * @returns {boolean} - true если дата сегодняшняя
 * @example
 * isToday("2025-11-14") // => true если сегодня 14 ноября 2025
 */
export function isToday(date) {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
  const today = getTodayStart();

  return dateObj.getTime() === today.getTime();
}

/**
 * Добавляет количество дней к дате
 * @param {Date} date - Исходная дата
 * @param {number} days - Количество дней для добавления (может быть отрицательным)
 * @returns {Date} - Новая дата
 * @example
 * addDays(new Date(2025, 10, 13), 5) // => Date для 18 ноября 2025
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Проверяет валидность строки даты
 * @param {string} dateString - Строка даты для проверки
 * @returns {boolean} - true если дата валидна
 * @example
 * isValidDate("2025-11-13") // => true
 * isValidDate("invalid") // => false
 */
export function isValidDate(dateString) {
  if (!dateString) return false;

  const date = parseLocalDate(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
