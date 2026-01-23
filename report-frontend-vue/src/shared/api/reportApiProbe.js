const PROBE_ENABLED = ['1', 'true'].includes(
  String(import.meta.env.VITE_REPORT_API_PROBE || '').toLowerCase(),
)

export function logApiProbe({ url, method, body, params, source } = {}) {
  if (!PROBE_ENABLED) return
  const normalizedUrl = normalizeUrl(url)
  const normalizedMethod = String(method || 'GET').toUpperCase()
  const bodyObject = normalizeBody(body)
  const paramsObject = normalizeParams(params)
  const bodyKeys = bodyObject ? Object.keys(bodyObject) : []
  const queryKeys = paramsObject ? Object.keys(paramsObject) : []
  const bodyParamsKeys = bodyObject ? extractParamsKeys(bodyObject.params) : []
  const pagingKeys = extractNestedKeys(bodyObject?.paging)
  const cursorKeys = extractNestedKeys(bodyObject?.cursor)
  const filterKeys = extractNestedKeys(bodyObject?.filter)
  const groupByKeys = extractNestedKeys(bodyObject?.groupBy)

  const parts = []
  parts.push('[api-probe]')
  if (source) {
    parts.push(`[${source}]`)
  }
  parts.push(normalizedMethod)
  if (normalizedUrl) {
    parts.push(normalizedUrl)
  }
  if (bodyKeys.length) parts.push(`bodyKeys=${bodyKeys.join(',')}`)
  if (queryKeys.length) parts.push(`queryKeys=${queryKeys.join(',')}`)
  if (bodyParamsKeys.length) parts.push(`body.paramsKeys=${bodyParamsKeys.join(',')}`)
  if (pagingKeys.length) parts.push(`pagingKeys=${pagingKeys.join(',')}`)
  if (cursorKeys.length) parts.push(`cursorKeys=${cursorKeys.join(',')}`)
  if (filterKeys.length) parts.push(`filterKeys=${filterKeys.join(',')}`)
  if (groupByKeys.length) parts.push(`groupByKeys=${groupByKeys.join(',')}`)

  console.info(parts.join(' '))
}

function normalizeUrl(url) {
  if (!url) return ''
  if (typeof url === 'string') return url
  try {
    return String(url)
  } catch {
    return ''
  }
}

function normalizeBody(body) {
  if (!body) return null
  if (isPlainObject(body)) return body
  if (typeof body === 'string') {
    const parsed = safeJsonParse(body)
    if (parsed.ok && isPlainObject(parsed.value)) {
      return parsed.value
    }
  }
  return null
}

function normalizeParams(params) {
  if (!params) return null
  if (isPlainObject(params)) return params
  return null
}

function extractParamsKeys(params) {
  if (isPlainObject(params)) return Object.keys(params)
  if (Array.isArray(params)) {
    const firstObject = params.find((entry) => isPlainObject(entry))
    if (firstObject) return Object.keys(firstObject)
  }
  return []
}

function extractNestedKeys(value) {
  if (!isPlainObject(value)) return []
  return Object.keys(value)
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function safeJsonParse(value = '') {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch {
    return { ok: false, value: null }
  }
}
