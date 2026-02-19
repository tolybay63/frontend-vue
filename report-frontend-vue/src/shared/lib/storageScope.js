function getBrowserOrigin() {
  if (typeof window === 'undefined') return ''
  return String(window.location?.origin || '').trim()
}

function sanitizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
}

function normalizeScope(rawValue) {
  const trimmed = String(rawValue || '').trim()
  if (!trimmed) return ''
  try {
    const withProtocol = /^[a-z]+:\/\//i.test(trimmed)
      ? trimmed
      : `http://${trimmed}`
    const url = new URL(withProtocol)
    return sanitizeToken(url.host || '')
  } catch {
    return sanitizeToken(trimmed)
  }
}

export function getStorageScope() {
  const envTarget = String(import.meta.env.VITE_PROXY_TARGET || '').trim()
  return normalizeScope(envTarget || getBrowserOrigin())
}

export function getScopedStorageKey(baseKey) {
  const key = String(baseKey || '').trim()
  if (!key) return ''
  const scope = getStorageScope()
  return scope ? `${key}:${scope}` : key
}
