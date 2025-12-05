export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value == null) return []
  if (value instanceof Set) return Array.from(value) as T[]
  if (value instanceof Map) return Array.from(value.values()) as T[]
  return []
}

export function normalizeString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return String(value)
  }
  return null
}

export function hasArrayValue(record: unknown, possibleKeys: string[]): boolean {
  if (!record || typeof record !== 'object') return false
  for (const key of possibleKeys) {
    const value = readProperty(record, key)
    if (Array.isArray(value) && value.length > 0) return true
    if (value instanceof Set && value.size > 0) return true
    if (value instanceof Map && value.size > 0) return true
    if (typeof value === 'object' && value !== null) {
      const length = readProperty(value, 'length')
      if (typeof length === 'number' && length > 0) return true
      const size = readProperty(value, 'size')
      if (typeof size === 'number' && size > 0) return true
    }
  }
  return false
}

export function hasTruthy(record: unknown, possibleKeys: string[]): boolean {
  if (!record || typeof record !== 'object') return false
  for (const key of possibleKeys) {
    const value = readProperty(record, key)
    if (typeof value === 'boolean') {
      if (value) return true
      continue
    }
    const normalized = normalizeString(value)
    if (normalized) return true
  }
  return false
}

export function readProperty(source: unknown, key: string): unknown {
  if (!source || typeof source !== 'object') return undefined
  if (!key.includes('.')) {
    return (source as Record<string, unknown>)[key]
  }

  const segments = key.split('.')
  let current: unknown = source
  for (const segment of segments) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function toIsoString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}

export function coerceId(value: unknown): string | null {
  const normalized = normalizeString(value)
  if (normalized) return normalized
  return null
}

export function uniqueBy<T>(items: T[], getKey: (item: T) => string | null): T[] {
  const map = new Map<string, T>()
  for (const item of items) {
    const key = getKey(item)
    if (!key) continue
    if (!map.has(key)) map.set(key, item)
  }
  return Array.from(map.values())
}
