// src/…/pwa.ts
import { Workbox } from 'workbox-window'

export function registerPWA(): void {
  // в dev НЕ регистрируем sw, чтобы не ловить MIME 'text/html'
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  const wb = new Workbox('/sw.js')

  const reloadOnControlling = () => {
    // опционально: мягкая перезагрузка после обновления sw
    window.location.reload()
  }

  wb.addEventListener('waiting', () => {
    wb.addEventListener('controlling', reloadOnControlling)
    wb.messageSkipWaiting()
  })

  wb.register().catch(console.warn)
}
