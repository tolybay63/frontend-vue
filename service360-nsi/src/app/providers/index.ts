/** Файл: src/app/providers/index.ts
 *  Назначение: единая точка подключения провайдеров приложения (pinia, vue-query и т.д.).
 *  Использование: импортируйте setupAppProviders(app) в main.ts и регистрируйте здесь общие плагины.
 */
import type { App } from 'vue'

export function setupAppProviders(app: App): void {
  void app
  // Заглушка: добавьте регистрацию провайдеров (pinia, vue-query, i18n) по мере необходимости.
}
