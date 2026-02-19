const JOIN_AGGREGATORS = new Set([
  'count',
  'sum',
  'avg',
  'value',
  'count_distinct',
  'distinct',
])
const COMPUTED_FIELD_RESULT_TYPES = new Set(['number', 'text', 'date'])
const COMPUTED_FIELD_TOKEN_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g

function assertDependency(fn, name) {
  if (typeof fn !== 'function') {
    throw new Error(`Dependency "${name}" must be a function.`)
  }
}

export function createRemoteDataSourceClient({
  requestData,
  loadSources,
  fetchJoinPayload,
} = {}) {
  assertDependency(requestData, 'requestData')
  assertDependency(loadSources, 'loadSources')
  assertDependency(fetchJoinPayload, 'fetchJoinPayload')

  const dataCache = new Map()
  const remoteSourceCatalog = new Map()
  let remoteSourcesLoaded = false
  let remoteSourcesLoading = false

  async function fetchRemoteRecords(source, { force = false } = {}) {
    if (!source) {
      throw new Error('В представлении не выбран источник данных.')
    }
    const cacheKey = buildSourceCacheKey(source)
    if (!force && cacheKey && dataCache.has(cacheKey)) {
      return dataCache.get(cacheKey)
    }
    const request = buildRemoteRequest(source)
    const response = await requestData(request)
    let records = extractRecords(response)
    records = applyComputedFields(records, source?.computedFields || [])
    const joins = resolveSourceJoins(source)
    if (records?.length && joins.length) {
      try {
        const joinResults = await fetchRemoteJoinRecords(joins)
        const successful = joinResults.filter((item) => !item.error)
        if (successful.length) {
          const joinRecordsList = successful.map((item) => item.records || [])
          const appliedJoins = successful.map((item) => joins[item.index])
          const { records: enriched } = mergeJoinedRecords(
            records,
            appliedJoins,
            joinRecordsList,
          )
          records = enriched
        }
      } catch (err) {
        console.warn('Failed to merge remote joins', err)
      }
    }
    if (cacheKey) {
      dataCache.set(cacheKey, records)
    }
    return records
  }

  function buildSourceCacheKey(source = {}) {
    return (
      source?.remoteId ||
      source?.id ||
      `${source?.method || 'POST'}:${source?.url || source?.remoteMeta?.URL || ''}`
    )
  }

  async function fetchRemoteJoinRecords(joins = []) {
    if (!joins.length) return []
    await ensureRemoteSourceCatalog()
    const tasks = joins.map(async (join, index) => {
      const target = getRemoteSourceFromCatalog(join.targetSourceId)
      if (!target) {
        return {
          index,
          join,
          records: [],
          error: `Источник связи «${join.targetSourceId}» не найден.`,
        }
      }
      const { payload, error } = buildJoinRequestPayload(target)
      if (!payload || error) {
        return {
          index,
          join,
          records: [],
          error:
            error ||
            `Источник связи «${join.targetSourceId}» содержит некорректный запрос.`,
        }
      }
      try {
        const response = await fetchJoinPayload(payload, { cache: true })
        const records = applyComputedFields(
          extractRecords(response),
          target?.computedFields || [],
        )
        return {
          index,
          join,
          records,
        }
      } catch (err) {
        return {
          index,
          join,
          records: [],
          error:
            err?.response?.data?.message ||
            err?.message ||
            `Не удалось выполнить связь «${join.targetSourceId}».`,
        }
      }
    })
    const results = await Promise.all(tasks)
    return results.sort((a, b) => a.index - b.index)
  }

  async function ensureRemoteSourceCatalog(force = false) {
    if (remoteSourcesLoaded && !force && remoteSourceCatalog.size) {
      return remoteSourceCatalog
    }
    if (remoteSourcesLoading && !force) {
      return remoteSourceCatalog
    }
    remoteSourcesLoading = true
    try {
      remoteSourceCatalog.clear()
      const records = await loadSources()
      ;(records || []).forEach((entry, index) => {
        const normalized = normalizeRemoteSourceRecord(entry, index)
        const key = normalized.remoteId || normalized.id
        if (key) {
          remoteSourceCatalog.set(String(key), normalized)
        }
        if (normalized.name && !remoteSourceCatalog.has(normalized.name)) {
          remoteSourceCatalog.set(normalized.name, normalized)
        }
      })
      remoteSourcesLoaded = true
    } catch (err) {
      console.warn('Failed to load remote sources for joins', err)
    } finally {
      remoteSourcesLoading = false
    }
    return remoteSourceCatalog
  }

  function getRemoteSourceFromCatalog(id) {
    if (id == null) return null
    const stringKey = String(id)
    if (remoteSourceCatalog.has(stringKey)) {
      return remoteSourceCatalog.get(stringKey)
    }
    return remoteSourceCatalog.get(id)
  }

  return {
    fetchRemoteRecords,
    clearCache: () => dataCache.clear(),
    preloadRemoteSources: ensureRemoteSourceCatalog,
  }
}

function buildRemoteRequest(source = {}) {
  const url = source?.url || source?.remoteMeta?.URL || ''
  if (!url) {
    throw new Error('У источника данных отсутствует URL.')
  }
  const method = String(
    source?.method || source?.remoteMeta?.Method || 'POST',
  ).toUpperCase()
  const headers = normalizeRemoteHeaders(
    source?.headers || source?.remoteMeta?.Headers,
  )
  const body = normalizeRemoteBody(
    source?.body ?? source?.remoteMeta?.MethodBody,
  )
  return { url, method, headers, body }
}

function normalizeRemoteHeaders(raw) {
  if (!raw) return { 'Content-Type': 'application/json' }
  if (typeof raw === 'object') return raw
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    // ignore
  }
  return { 'Content-Type': 'application/json' }
}

function normalizeRemoteBody(raw) {
  if (raw == null || raw === '') return undefined
  if (typeof raw === 'object') return raw
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function extractRecords(payload) {
  if (!payload || typeof payload !== 'object') {
    return Array.isArray(payload) ? payload : []
  }
  if (Array.isArray(payload.result?.records)) return payload.result.records
  if (Array.isArray(payload.result)) return payload.result
  if (Array.isArray(payload.records)) return payload.records
  return []
}

function resolveSourceJoins(source = {}) {
  if (!source) return []
  if (Array.isArray(source.joins) && source.joins.length) {
    return normalizeJoinList(source.joins)
  }
  const parsed = parseJoinConfig(source?.remoteMeta?.joinConfig)
  return normalizeJoinList(parsed)
}

export function normalizeJoinList(list = []) {
  if (!Array.isArray(list)) return []
  return list
    .map((entry) => normalizeJoinEntry(entry))
    .filter((entry) => Boolean(entry))
}

function normalizeJoinEntry(entry = {}) {
  const targetSourceId = asString(entry.targetSourceId)
  const primaryKey = asString(entry.primaryKey)
  const foreignKey = asString(entry.foreignKey)
  if (!targetSourceId || !primaryKey || !foreignKey) return null
  return {
    id: asString(entry.id),
    targetSourceId,
    primaryKey,
    foreignKey,
    joinType: entry.joinType === 'inner' ? 'inner' : 'left',
    resultPrefix: asString(entry.resultPrefix),
    fields: Array.isArray(entry.fields) ? entry.fields.filter(Boolean) : [],
    aggregate: normalizeJoinAggregate(entry.aggregate || entry.aggregation),
  }
}

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

function normalizeComputedFields(list = []) {
  if (!Array.isArray(list)) return []
  return list
    .map((entry) => normalizeComputedFieldEntry(entry))
    .filter((entry) => entry !== null)
}

function normalizeJoinAggregate(value) {
  if (!value || typeof value !== 'object') return null
  const groupBy = Array.isArray(value.groupBy)
    ? value.groupBy.map((item) => asString(item)).filter(Boolean)
    : []
  const metrics = Array.isArray(value.metrics)
    ? value.metrics.map((item) => normalizeJoinAggregateMetric(item))
    : []
  return {
    groupBy,
    metrics,
  }
}

function normalizeJoinAggregateMetric(value) {
  if (!value || typeof value !== 'object') {
    return { key: '', sourceKey: '', op: 'count' }
  }
  const rawOp = asString(value.op).toLowerCase()
  const op = JOIN_AGGREGATORS.has(rawOp)
    ? rawOp === 'distinct'
      ? 'count_distinct'
      : rawOp
    : 'count'
  return {
    key: asString(value.key),
    sourceKey: asString(value.sourceKey),
    op,
  }
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : ''
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

function projectJoinFields(record, fields, prefix) {
  if (!record || typeof record !== 'object') {
    return {}
  }
  const entries = fields && fields.length ? fields : Object.keys(record)
  return entries.reduce((acc, key) => {
    const targetKey = prefix ? `${prefix}.${key}` : key
    if (!(targetKey in acc)) {
      acc[targetKey] = extractKey(record, key)
    }
    return acc
  }, {})
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
    ? value.groupBy.map((item) => asString(item)).filter(Boolean)
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

function normalizeRemoteSourceRecord(entry = {}, index = 0) {
  const remoteId = entry?.id ?? entry?.Id ?? entry?.ID
  const normalizedId =
    remoteId !== undefined && remoteId !== null
      ? String(remoteId)
      : `remote-${index}`
  const method =
    entry?.nameMethodTyp ||
    entry?.Method ||
    entry?.method ||
    entry?.httpMethod ||
    'POST'
  const headers = entry?.headers || entry?.Headers || {}
  const body =
    entry?.MethodBody ||
    entry?.body ||
    entry?.payload ||
    entry?.requestBody ||
    entry?.rawBody ||
    ''
  const bodyComputedFields = extractComputedFieldsFromBody(body)
  const explicitComputedFields = normalizeComputedFields(
    entry?.computedFields || entry?.ComputedFields || [],
  )
  return {
    id: normalizedId,
    remoteId: normalizedId,
    name: entry?.name || entry?.Name || '',
    url: entry?.URL || entry?.url || entry?.requestUrl || '',
    httpMethod: String(method || 'POST').toUpperCase(),
    rawBody: formatRawBody(body),
    headers,
    computedFields: explicitComputedFields.length
      ? explicitComputedFields
      : bodyComputedFields,
    joins: parseJoinConfig(entry?.joinConfig || entry?.JoinConfig),
    remoteMeta: entry || {},
  }
}

function formatRawBody(body) {
  if (!body) return ''
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return body
    }
  }
  try {
    return JSON.stringify(body, null, 2)
  } catch {
    return ''
  }
}

export function buildJoinRequestPayload(source = {}) {
  const url = source.url?.trim()
  if (!url) {
    return { payload: null, error: 'У источника нет URL.' }
  }
  const method = String(source.httpMethod || 'POST').toUpperCase()
  const headers = normalizeRemoteHeaders(
    source.headers || source.remoteMeta?.Headers,
  )
  const rawBody = source.rawBody?.trim() || ''
  if (method === 'GET') {
    if (!rawBody) {
      return { payload: { url, method, headers }, error: null }
    }
    const parsed = safeJsonParse(rawBody)
    if (!parsed.ok) {
      return {
        payload: null,
        error: 'Параметры GET-запроса должны быть корректным JSON.',
      }
    }
    return { payload: { url, method, headers, body: parsed.value }, error: null }
  }
  if (!rawBody) {
    return { payload: null, error: 'Тело запроса не заполнено.' }
  }
  const parsed = safeJsonParse(rawBody)
  if (!parsed.ok || typeof parsed.value !== 'object') {
    return {
      payload: null,
      error: 'Тело запроса должно быть валидным JSON-объектом.',
    }
  }
  return { payload: { url, method, headers, body: parsed.value }, error: null }
}

function safeJsonParse(value = '') {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch {
    return { ok: false, value: null }
  }
}

function extractComputedFieldsFromBody(rawBody) {
  let payload = rawBody
  if (!payload) return []
  if (typeof payload === 'string') {
    const parsed = safeJsonParse(payload)
    if (!parsed.ok || !parsed.value || typeof parsed.value !== 'object') {
      return []
    }
    payload = parsed.value
  }
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.__computedFields)) {
    return normalizeComputedFields(payload.__computedFields)
  }
  if (Array.isArray(payload.computedFields)) {
    return normalizeComputedFields(payload.computedFields)
  }
  return []
}

function applyComputedFields(records = [], computedFields = []) {
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
