import { sendDataSourceRequest } from '@/shared/api/dataSource'

const JOIN_TYPES = ['left', 'inner']

export const SOURCE_JOIN_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    required: ['id', 'targetSourceId', 'primaryKey', 'foreignKey'],
    properties: {
      id: { type: 'string' },
      targetSourceId: { type: 'string' },
      primaryKey: { type: 'string' },
      foreignKey: { type: 'string' },
      joinType: { type: 'string', enum: JOIN_TYPES },
      resultPrefix: { type: 'string' },
      fields: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    additionalProperties: false,
  },
}

const joinRequestCache = new Map()

export function createJoinTemplate(overrides = {}) {
  return normalizeJoinEntry({
    id: overrides.id || createJoinId(),
    targetSourceId: overrides.targetSourceId || '',
    primaryKey: overrides.primaryKey || '',
    foreignKey: overrides.foreignKey || '',
    joinType: overrides.joinType || 'left',
    resultPrefix: overrides.resultPrefix || '',
    fields: Array.isArray(overrides.fields) ? overrides.fields : [],
  })
}

export function normalizeJoinList(list = []) {
  if (!Array.isArray(list)) return []
  return list
    .map((entry) => normalizeJoinEntry(entry))
    .filter((entry) => Boolean(entry.targetSourceId))
}

export function parseJoinConfig(raw) {
  if (!raw) return []
  try {
    if (typeof raw === 'string') {
      return normalizeJoinList(JSON.parse(raw))
    }
    if (Array.isArray(raw)) {
      return normalizeJoinList(raw)
    }
    if (typeof raw === 'object') {
      return normalizeJoinList(raw.joins || raw.data || [])
    }
  } catch {
    return []
  }
  return []
}

export function serializeJoinConfig(list = []) {
  const normalized = normalizeJoinList(list)
  return JSON.stringify(normalized)
}

export function buildJoinCacheKey(payload) {
  const normalized = normalizeForCache(payload)
  try {
    return JSON.stringify(normalized)
  } catch {
    return ''
  }
}

export function clearJoinRequestCache() {
  joinRequestCache.clear()
}

export async function fetchJoinPayload(payload, { cache = true } = {}) {
  if (!payload || !payload.url) return null
  const key = cache ? buildJoinCacheKey(payload) : ''
  if (cache && key && joinRequestCache.has(key)) {
    return cloneData(joinRequestCache.get(key))
  }
  const response = await sendDataSourceRequest(payload)
  if (cache && key) {
    joinRequestCache.set(key, cloneData(response))
  }
  return response
}

export function mergeJoinedRecords(
  primaryRecords = [],
  joins = [],
  joinRecordsList = [],
) {
  if (!Array.isArray(primaryRecords)) return { records: [], details: [] }
  let current = primaryRecords
  const details = []
  joins.forEach((join, index) => {
    if (!join?.primaryKey || !join?.foreignKey || !join?.targetSourceId) {
      return
    }
    const joinRows = Array.isArray(joinRecordsList[index])
      ? joinRecordsList[index]
      : []
    const beforeCount = current.length
    current = applyJoin(current, joinRows, join)
    details.push({
      joinId: join.id,
      targetSourceId: join.targetSourceId,
      matchedRows: joinRows.length,
      baseBefore: beforeCount,
      baseAfter: current.length,
    })
  })
  return { records: current, details }
}

function applyJoin(baseRows, joinRows, join) {
  if (!Array.isArray(baseRows) || !baseRows.length) return baseRows || []
  const lookup = new Map()
  joinRows.forEach((row) => {
    const key = extractKey(row, join.foreignKey)
    if (key === undefined) return
    if (!lookup.has(key)) lookup.set(key, [])
    lookup.get(key).push(row)
  })
  const joinType = join.joinType === 'inner' ? 'inner' : 'left'
  const fields =
    Array.isArray(join.fields) && join.fields.length ? join.fields : null
  const prefix = join.resultPrefix?.trim() || ''
  const merged = []
  baseRows.forEach((row) => {
    const key = extractKey(row, join.primaryKey)
    const matches = key !== undefined ? lookup.get(key) : null
    if (!matches || !matches.length) {
      if (joinType === 'inner') {
        return
      }
      merged.push({ ...row })
      return
    }
    matches.forEach((match) => {
      merged.push({
        ...row,
        ...projectJoinFields(match, fields, prefix),
      })
    })
  })
  return merged
}

function projectJoinFields(record, fields, prefix) {
  if (!record || typeof record !== 'object') {
    return {}
  }
  const entries = fields || Object.keys(record)
  return entries.reduce((acc, key) => {
    const targetKey = prefix ? `${prefix}.${key}` : key
    if (!(targetKey in acc)) {
      acc[targetKey] = record[key]
    }
    return acc
  }, {})
}

function extractKey(record, key) {
  if (!record || typeof record !== 'object') return undefined
  if (!key) return undefined
  return record[key]
}

function normalizeJoinEntry(entry = {}) {
  return {
    id: entry.id || createJoinId(),
    targetSourceId: String(entry.targetSourceId || '').trim(),
    primaryKey: String(entry.primaryKey || '').trim(),
    foreignKey: String(entry.foreignKey || '').trim(),
    joinType: JOIN_TYPES.includes((entry.joinType || '').toLowerCase())
      ? entry.joinType.toLowerCase()
      : 'left',
    resultPrefix: String(entry.resultPrefix || '').trim(),
    fields: Array.isArray(entry.fields)
      ? entry.fields.map((field) => String(field || '').trim()).filter(Boolean)
      : [],
  }
}

function createJoinId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `join-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeForCache(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForCache(item))
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeForCache(value[key])
        return acc
      }, {})
  }
  return value
}

function cloneData(payload) {
  if (typeof structuredClone === 'function') {
    return structuredClone(payload)
  }
  try {
    return JSON.parse(JSON.stringify(payload))
  } catch {
    return payload
  }
}
