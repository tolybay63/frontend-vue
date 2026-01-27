const STORAGE_KEY = 'curUser'
const REPORT_TOKEN = 'report'

function parseStoredUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'result' in parsed) {
      return parsed.result || null
    }
    return parsed
  } catch {
    return null
  }
}

function normalizeTargetValue(target) {
  if (!target) return ''
  if (Array.isArray(target)) {
    return target.map((entry) => String(entry)).join(' ')
  }
  if (typeof target === 'object') {
    return Object.values(target).map((entry) => String(entry)).join(' ')
  }
  return String(target)
}

export function hasReportTarget(target) {
  const normalized = normalizeTargetValue(target).toLowerCase()
  return normalized.includes(REPORT_TOKEN)
}

export function hasConstructorAccess(user = null) {
  const directTarget = user?.target ?? user?.Target ?? user?.targets ?? user?.Targets
  const source = directTarget == null ? parseStoredUser() : user
  if (!source) return false
  const targetValue = source.target ?? source.Target ?? source.targets ?? source.Targets
  return hasReportTarget(targetValue)
}
