const DEBUG_EVENTS =
  String(import.meta.env.VITE_DEBUG_ANALYTICS || '').toLowerCase() === 'true'

export function trackEvent(name, payload = {}) {
  // TODO: wire to real analytics provider when available.
  if (DEBUG_EVENTS) {
    console.info('[analytics]', name, payload)
  }
}
