/** Файл: src/app/router/index.ts
 *  Назначение: прокинуть единый экземпляр роутера приложения и хелпер установки в Vue.
 *  Использование: импортируйте installAppRouter(app) и router, чтобы подключить маршрутизацию в main.ts.
 */
import type { App } from 'vue'
import router from '@/router'

export { router }

export function installAppRouter(app: App): void {
  app.use(router)
}
