import { sendDataSourceRequest } from '@/shared/api/dataSource'

const JOIN_TYPES = ['left', 'inner']
const COMPUTED_FIELD_RESULT_TYPES = new Set(['number', 'text', 'date'])
const JOIN_AGGREGATORS = new Set([
  'count',
  'sum',
  'avg',
  'value',
  'count_distinct',
  'distinct',
])
const COMPUTED_FIELD_TOKEN_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g

function normalizeComputedFieldEntry(entry = {}) {
  if (!entry || typeof entry !== 'object') return null
  const rawKey =
    typeof entry.fieldKey === 'string'
      ? entry.fieldKey
      : typeof entry.key === 'string'
        ? entry.key
        : typeof entry.name === 'string'
          ? entry.name
          : ''
  const resultType = COMPUTED_FIELD_RESULT_TYPES.has(entry.resultType)
    ? entry.resultType
    : 'number'
  const normalized = {
    fieldKey: String(rawKey || '').trim(),
    expression:
      typeof entry.expression === 'string' ? entry.expression.trim() : '',
    resultType,
  }
  if (typeof entry.id === 'string' && entry.id.trim()) {
    normalized.id = entry.id.trim()
  }
  return normalized
}

export function normalizeComputedFields(list = []) {
  if (!Array.isArray(list)) return []
  return list
    .map((entry) => normalizeComputedFieldEntry(entry))
    .filter((entry) => entry !== null)
}

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
      aggregate: {
        type: 'object',
        properties: {
          groupBy: {
            type: 'array',
            items: { type: 'string' },
          },
          metrics: {
            type: 'array',
            items: {
              type: 'object',
              required: ['key', 'sourceKey', 'op'],
              properties: {
                key: { type: 'string' },
                sourceKey: { type: 'string' },
                op: { type: 'string' },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
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
    fieldsInput: overrides.fieldsInput,
    aggregate: overrides.aggregate || overrides.aggregation || null,
  })
}

export function normalizeJoinList(list = []) {
  if (!Array.isArray(list)) return []
  return list
    .map((entry) => normalizeJoinEntry(entry))
    .filter((entry) => Boolean(entry.targetSourceId))
}

export function extractJoinsFromBody(rawBody = '') {
  if (!rawBody) {
    return { cleanedBody: '', joins: [], computedFields: null }
  }
  let payload = rawBody
  if (typeof payload !== 'string') {
    try {
      payload = JSON.stringify(payload)
    } catch {
      return { cleanedBody: '', joins: [], computedFields: null }
    }
  }
  try {
    const parsed = JSON.parse(payload)
    if (!parsed || typeof parsed !== 'object') {
      return { cleanedBody: payload, joins: [], computedFields: null }
    }
    const joins = Array.isArray(parsed.__joins)
      ? normalizeJoinList(parsed.__joins)
      : []
    let computedFields = null
    if (Array.isArray(parsed.__computedFields)) {
      computedFields = normalizeComputedFields(parsed.__computedFields)
    } else if (Array.isArray(parsed.computedFields)) {
      computedFields = normalizeComputedFields(parsed.computedFields)
    }
    if ('__joins' in parsed) {
      delete parsed.__joins
    }
    if ('__computedFields' in parsed) {
      delete parsed.__computedFields
    }
    if ('computedFields' in parsed) {
      delete parsed.computedFields
    }
    return {
      cleanedBody: JSON.stringify(parsed, null, 2),
      joins,
      computedFields,
    }
  } catch {
    return { cleanedBody: payload, joins: [], computedFields: null }
  }
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
  const normalized = normalizeJoinList(list).map(stripJoinPresentationFields)
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

export function applyComputedFields(records = [], computedFields = []) {
  const source = Array.isArray(records) ? records : []
  if (!source.length) return source
  const list = normalizeComputedFields(computedFields).filter(
    (field) => field.fieldKey && field.expression,
  )
  if (!list.length) return source
  const prepared = list
    .map((field) => ({
      fieldKey: field.fieldKey,
      resultType: field.resultType,
      evaluate: compileComputedFieldExpression(field.expression),
    }))
    .filter((field) => typeof field.evaluate === 'function')
  if (!prepared.length) return source
  return source.map((record) => {
    const next = { ...(record || {}) }
    prepared.forEach((field) => {
      const value = field.evaluate((key) => extractKey(next, key))
      next[field.fieldKey] = normalizeComputedFieldValue(value, field.resultType)
    })
    return next
  })
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
  const preparedRows = applyJoinAggregate(joinRows, join)
  const lookup = new Map()
  preparedRows.forEach((row) => {
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
      acc[targetKey] = extractKey(record, key)
    }
    return acc
  }, {})
}

function extractKey(record, key) {
  if (!record || typeof record !== 'object') return undefined
  if (!key) return undefined
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    return record[key]
  }
  if (key.includes('.')) {
    const resolved = key.split('.').reduce((acc, part) => {
      if (acc == null) return undefined
      return acc[part]
    }, record)
    if (typeof resolved !== 'undefined') {
      return resolved
    }
    const lastPart = key.split('.').pop()
    if (lastPart && Object.prototype.hasOwnProperty.call(record, lastPart)) {
      return record[lastPart]
    }
    return undefined
  }
  return record[key]
}

function applyJoinAggregate(joinRows, join) {
  if (!Array.isArray(joinRows) || !joinRows.length) return joinRows || []
  const aggregate = resolveJoinAggregate(join?.aggregate)
  if (!aggregate) return joinRows
  const groups = new Map()
  joinRows.forEach((row) => {
    const groupValues = aggregate.groupBy.map((key) => extractKey(row, key))
    const groupKey = buildGroupKey(groupValues)
    if (!groups.has(groupKey)) {
      groups.set(groupKey, createJoinAggregateGroup(groupValues, aggregate))
    }
    updateJoinAggregateGroup(groups.get(groupKey), row, aggregate.metrics)
  })
  return Array.from(groups.values()).map((group) =>
    finalizeJoinAggregateGroup(group, aggregate.metrics),
  )
}

function resolveJoinAggregate(value) {
  if (!value || typeof value !== 'object') return null
  const groupBy = Array.isArray(value.groupBy)
    ? value.groupBy.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  if (!groupBy.length) return null
  const metrics = Array.isArray(value.metrics)
    ? value
        .metrics
        .map((item) => normalizeJoinAggregateMetric(item))
        .filter((item) => isJoinAggregateMetricValid(item))
    : []
  if (!metrics.length) return null
  return { groupBy, metrics }
}

function isJoinAggregateMetricValid(metric) {
  if (!metric || typeof metric !== 'object') return false
  if (!metric.key) return false
  if (metric.op === 'count') return true
  return Boolean(metric.sourceKey)
}

function buildGroupKey(values = []) {
  return values.map((value) => normalizeAggregateKeyPart(value)).join('|')
}

function normalizeAggregateKeyPart(value) {
  if (value === null) return 'null:'
  if (typeof value === 'undefined') return 'undefined:'
  if (typeof value === 'object') {
    try {
      return `object:${JSON.stringify(value)}`
    } catch {
      return `object:${String(value)}`
    }
  }
  return `${typeof value}:${String(value)}`
}

function createJoinAggregateGroup(groupValues = [], aggregate) {
  const row = {}
  aggregate.groupBy.forEach((fieldKey, index) => {
    row[fieldKey] = groupValues[index]
  })
  const metrics = aggregate.metrics.reduce((acc, metric) => {
    acc[metric.key] = createJoinAggregateMetricState(metric.op)
    return acc
  }, {})
  return { row, metrics }
}

function createJoinAggregateMetricState(op) {
  if (op === 'avg') {
    return { sum: 0, count: 0 }
  }
  if (op === 'count_distinct') {
    return { values: new Set() }
  }
  if (op === 'value') {
    return { value: null, hasValue: false }
  }
  return { value: 0 }
}

function updateJoinAggregateGroup(group, record, metrics = []) {
  metrics.forEach((metric) => {
    const state = group.metrics[metric.key]
    if (!state) return
    const sourceValue = metric.sourceKey
      ? extractKey(record, metric.sourceKey)
      : undefined
    if (metric.op === 'count') {
      state.value += 1
      return
    }
    if (metric.op === 'count_distinct') {
      if (sourceValue === undefined || sourceValue === null) return
      state.values.add(normalizeAggregateKeyPart(sourceValue))
      return
    }
    if (metric.op === 'value') {
      if (state.hasValue || sourceValue === undefined) return
      state.value = sourceValue
      state.hasValue = true
      return
    }
    const numeric = toNumeric(sourceValue)
    if (numeric === null) return
    if (metric.op === 'sum') {
      state.value += numeric
      return
    }
    if (metric.op === 'avg') {
      state.sum += numeric
      state.count += 1
    }
  })
}

function finalizeJoinAggregateGroup(group, metrics = []) {
  const row = { ...group.row }
  metrics.forEach((metric) => {
    const state = group.metrics[metric.key]
    row[metric.key] = finalizeJoinAggregateMetricState(metric.op, state)
  })
  return row
}

function finalizeJoinAggregateMetricState(op, state = {}) {
  if (op === 'avg') {
    return state.count ? state.sum / state.count : null
  }
  if (op === 'count_distinct') {
    return state.values?.size || 0
  }
  if (op === 'value') {
    return state.hasValue ? state.value : null
  }
  return Number.isFinite(state.value) ? state.value : 0
}

function toNumeric(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function normalizeJoinEntry(entry = {}) {
  const normalizedFields = Array.isArray(entry.fields)
    ? entry.fields.map((field) => String(field || '').trim()).filter(Boolean)
    : []
  const normalizedInput =
    typeof entry.fieldsInput === 'string'
      ? entry.fieldsInput
      : normalizedFields.join(', ')
  const aggregate = normalizeJoinAggregate(entry.aggregate || entry.aggregation)
  return {
    id: entry.id || createJoinId(),
    targetSourceId: String(entry.targetSourceId || '').trim(),
    primaryKey: String(entry.primaryKey || '').trim(),
    foreignKey: String(entry.foreignKey || '').trim(),
    joinType: JOIN_TYPES.includes((entry.joinType || '').toLowerCase())
      ? entry.joinType.toLowerCase()
      : 'left',
    resultPrefix: String(entry.resultPrefix || '').trim(),
    fields: normalizedFields,
    fieldsInput: normalizedInput,
    aggregate,
  }
}

export function stripJoinPresentationFields(entry = {}) {
  if (!entry || typeof entry !== 'object') return {}
  const { fieldsInput: _omit, aggregate, aggregation, ...rest } = entry
  const cleanedAggregate = stripJoinAggregatePresentationFields(
    aggregate || aggregation,
  )
  if (cleanedAggregate) {
    rest.aggregate = cleanedAggregate
  }
  void _omit
  return rest
}

function normalizeJoinAggregate(value) {
  if (!value || typeof value !== 'object') return null
  const groupBy = Array.isArray(value.groupBy)
    ? value.groupBy.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  const metrics = Array.isArray(value.metrics)
    ? value.metrics.map((item) => normalizeJoinAggregateMetric(item))
    : []
  const groupByInput =
    typeof value.groupByInput === 'string'
      ? value.groupByInput
      : groupBy.join(', ')
  return {
    groupBy,
    metrics,
    groupByInput,
  }
}

function normalizeJoinAggregateMetric(value) {
  if (!value || typeof value !== 'object') {
    return { key: '', sourceKey: '', op: 'count' }
  }
  const rawOp = String(value.op || '').trim().toLowerCase()
  const op = JOIN_AGGREGATORS.has(rawOp)
    ? rawOp === 'distinct'
      ? 'count_distinct'
      : rawOp
    : 'count'
  return {
    key: typeof value.key === 'string' ? value.key.trim() : '',
    sourceKey: typeof value.sourceKey === 'string' ? value.sourceKey.trim() : '',
    op,
  }
}

function stripJoinAggregatePresentationFields(value) {
  if (!value || typeof value !== 'object') return null
  const { groupByInput: _omit, metrics, ...rest } = value
  const cleanedMetrics = Array.isArray(metrics)
    ? metrics.map((metric) => {
        if (!metric || typeof metric !== 'object') {
          return { key: '', sourceKey: '', op: 'count' }
        }
        const { id: _id, ...metricRest } = metric
        void _id
        return metricRest
      })
    : []
  void _omit
  return {
    ...rest,
    metrics: cleanedMetrics,
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

function compileComputedFieldExpression(expression = '') {
  const trimmed = String(expression || '').trim()
  if (!trimmed) return null
  const jsExpression = trimmed.replace(COMPUTED_FIELD_TOKEN_REGEX, (_, token) => {
    const key = String(token || '').trim()
    return `__get(${JSON.stringify(key)})`
  })
  try {
    const fn = new Function(
      '__get',
      'number',
      'text',
      'date',
      'len',
      'empty',
      'ts',
      'datediff',
      'hours_between',
      'days_between',
      `return (${jsExpression});`,
    )
    return (resolver) => {
      try {
        return fn(
          (key) => resolver(key),
          toNumber,
          toText,
          toDate,
          valueLength,
          isEmptyValue,
          toTimestamp,
          dateDiff,
          hoursBetween,
          daysBetween,
        )
      } catch {
        return null
      }
    }
  } catch {
    return null
  }
}

function normalizeComputedFieldValue(value, resultType = 'number') {
  if (resultType === 'text') {
    return value === null || typeof value === 'undefined' ? '' : String(value)
  }
  if (resultType === 'date') {
    if (value === null || typeof value === 'undefined' || value === '') return null
    if (value instanceof Date) {
      const timestamp = value.getTime()
      return Number.isFinite(timestamp) ? value.toISOString() : null
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return null
      return new Date(value).toISOString()
    }
    return String(value)
  }
  if (value === null || typeof value === 'undefined' || value === '') {
    return null
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function toNumber(value) {
  if (value === null || typeof value === 'undefined' || value === '') return 0
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function toText(value) {
  return value === null || typeof value === 'undefined' ? '' : String(value)
}

function toDate(value) {
  if (value instanceof Date) return value
  const timestamp = toTimestamp(value)
  return timestamp === null ? null : new Date(timestamp)
}

function valueLength(value) {
  if (value === null || typeof value === 'undefined') return 0
  if (typeof value === 'string' || Array.isArray(value)) return value.length
  if (typeof value === 'object') return Object.keys(value).length
  return String(value).length
}

function isEmptyValue(value) {
  if (value === null || typeof value === 'undefined') return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

function toTimestamp(value) {
  if (value === null || typeof value === 'undefined' || value === '') return null
  if (value instanceof Date) {
    const timestamp = value.getTime()
    return Number.isFinite(timestamp) ? timestamp : null
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const timestamp = Date.parse(String(value))
  return Number.isFinite(timestamp) ? timestamp : null
}

function dateDiff(start, end, unit = 'day') {
  const startTs = toTimestamp(start)
  const endTs = toTimestamp(end)
  if (startTs === null || endTs === null) return null
  const diff = endTs - startTs
  const normalizedUnit = String(unit || 'day').trim().toLowerCase()
  if (normalizedUnit === 'ms' || normalizedUnit === 'millisecond') return diff
  if (normalizedUnit === 's' || normalizedUnit === 'sec' || normalizedUnit === 'second') {
    return diff / 1000
  }
  if (
    normalizedUnit === 'm' ||
    normalizedUnit === 'min' ||
    normalizedUnit === 'minute'
  ) {
    return diff / 60000
  }
  if (normalizedUnit === 'h' || normalizedUnit === 'hour') return diff / 3600000
  return diff / 86400000
}

function hoursBetween(start, end) {
  return dateDiff(start, end, 'hour')
}

function daysBetween(start, end) {
  return dateDiff(start, end, 'day')
}
