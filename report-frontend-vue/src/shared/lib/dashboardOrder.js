const STORAGE_KEY = 'report-dashboard-order'
const DEFAULT_USER_KEY = 'default'

function parseJsonValue(raw) {
  if (raw == null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export function resolveDashboardUserKey(userId) {
  if (userId != null && userId !== '') return String(userId)
  if (typeof window === 'undefined') return DEFAULT_USER_KEY
  const raw = window.localStorage.getItem('userId')
  const parsed = parseJsonValue(raw)
  const normalized = String(parsed ?? raw ?? '').trim()
  return normalized || DEFAULT_USER_KEY
}

export function loadDashboardOrderByUser() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed
    }
  } catch (err) {
    console.warn('Failed to load dashboard order', err)
  }
  return {}
}

export function persistDashboardOrderByUser(orderByUser) {
  if (typeof window === 'undefined') return
  if (!orderByUser || typeof orderByUser !== 'object' || Array.isArray(orderByUser)) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orderByUser))
}

export function getDashboardOrderForUser(orderByUser, userKey) {
  if (!orderByUser || typeof orderByUser !== 'object') return {}
  const entry = orderByUser[userKey]
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return {}
  return entry
}

export function normalizeDashboardOrderValue(value) {
  if (value == null || value === '') return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  const normalized = Math.trunc(numeric)
  return normalized > 0 ? normalized : null
}

export function updateDashboardOrderByUser(orderByUser, userKey, pageId, orderValue) {
  const next = { ...(orderByUser || {}) }
  const key = String(pageId || '').trim()
  if (!key) return next
  const safeUserKey = userKey || DEFAULT_USER_KEY
  const current = getDashboardOrderForUser(next, safeUserKey)
  const updated = { ...current }
  if (orderValue == null) {
    delete updated[key]
  } else {
    updated[key] = orderValue
  }
  if (Object.keys(updated).length) {
    next[safeUserKey] = updated
  } else {
    delete next[safeUserKey]
  }
  return next
}

export function sortPagesByOrder(pages, orderMap) {
  if (!Array.isArray(pages)) return []
  const normalizedMap = orderMap || {}
  return pages
    .map((page, index) => {
      const key = String(page?.id ?? '').trim()
      const order = normalizeDashboardOrderValue(normalizedMap[key])
      return {
        page,
        index,
        order,
        hasOrder: order !== null,
      }
    })
    .sort((left, right) => {
      if (left.hasOrder && right.hasOrder) {
        if (left.order !== right.order) {
          return left.order - right.order
        }
        return left.index - right.index
      }
      if (left.hasOrder !== right.hasOrder) {
        return left.hasOrder ? -1 : 1
      }
      return left.index - right.index
    })
    .map((entry) => entry.page)
}
