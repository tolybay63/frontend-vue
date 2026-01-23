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
        return {
          index,
          join,
          records: extractRecords(response),
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

function extractKey(record, key) {
  if (!record || typeof record !== 'object') return undefined
  if (!key) return undefined
  if (key.includes('.')) {
    return key.split('.').reduce((acc, part) => {
      if (acc == null) return undefined
      return acc[part]
    }, record)
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
      acc[targetKey] = record[key]
    }
    return acc
  }, {})
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
  return {
    id: normalizedId,
    remoteId: normalizedId,
    name: entry?.name || entry?.Name || '',
    url: entry?.URL || entry?.url || entry?.requestUrl || '',
    httpMethod: String(method || 'POST').toUpperCase(),
    rawBody: formatRawBody(body),
    headers,
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
