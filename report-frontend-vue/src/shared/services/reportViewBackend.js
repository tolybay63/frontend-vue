import { formatFormulaValue, formatNumber, formatValue } from '@/shared/lib/pivotUtils'
import { logApiProbe } from '@/shared/api/reportApiProbe'
import { handleApiError, normalizeApiError } from '@/shared/api/errorHandler'

const RAW_BACKEND_URL = import.meta.env.VITE_REPORT_BACKEND_URL || ''
const PIVOT_BACKEND_ENABLED =
  String(import.meta.env.VITE_PIVOT_BACKEND_ENABLED || '').toLowerCase() ===
  'true'
const REQUEST_FIELD_PREFIX = 'request'
const REPORT_JOB_POLL_MS = Number(import.meta.env.VITE_REPORT_JOB_POLL_MS) || 2000
const REPORT_SYNC_MODE = String(import.meta.env.VITE_REPORT_SYNC_MODE || 'auto').toLowerCase()
const REPORT_SYNC_THRESHOLD = Number(import.meta.env.VITE_REPORT_SYNC_THRESHOLD)
const DEFAULT_REPORT_SYNC_THRESHOLD = 6
const FILTERS_LIMIT_MESSAGE = 'Слишком много данных…'
const DETAILS_LIMIT_MESSAGE = 'Слишком много данных…'
const JOIN_RECORDS_LIMIT_MESSAGE =
  'Слишком большой объём после соединения источников…'
const JOIN_SOURCE_LIMIT_MESSAGE =
  'Один из источников соединения слишком большой…'
const REPORT_STATUS_LABELS = {
  queued: 'Отчёт в очереди…',
  running: 'Отчёт формируется…',
}

export const isPivotBackendEnabled = () => PIVOT_BACKEND_ENABLED

async function fetchWithErrorHandling(url, options = {}, meta = {}) {
  let response
  try {
    response = await fetch(url, options)
  } catch (err) {
    const handled = handleApiError(err, {
      skipAuthRedirect: meta?.skipAuthRedirect,
    })
    if (handled?.humanMessage) {
      handled.message = handled.humanMessage
    }
    throw handled
  }

  if (response.ok) return response

  const data = await safeReadResponseData(response)
  if (!meta?.silent) {
    console.error(meta?.logLabel || 'Report backend error', response.status, data)
  }
  const error = buildFetchError({
    status: response.status,
    data,
    headers: normalizeHeaders(response.headers),
    url,
    method: options?.method || 'GET',
  })
  const normalized = normalizeApiError(error)
  error.normalized = normalized
  error.humanMessage = normalized.message
  if (!error.message || error.message === 'Network Error') {
    error.message = normalized.message
  }
  const handled = handleApiError(error, {
    skipAuthRedirect: meta?.skipAuthRedirect,
  })
  if (handled?.humanMessage) {
    handled.message = handled.humanMessage
  }
  if (handled?.normalized?.status === 422) {
    const limitMessage = resolveLimitMessage(
      data,
      handled?.normalized?.serverMessage,
      meta?.recordsLimitMessage,
    )
    if (limitMessage) {
      handled.humanMessage = limitMessage
      handled.message = limitMessage
    }
  }
  throw handled
}

async function pollReportJob(jobId, { baseUrl, signal, silent, onStatus } = {}) {
  if (!jobId) {
    throw new Error('Не удалось получить идентификатор задания.')
  }
  let lastStatus = ''
  let polling = true
  while (polling) {
    if (signal?.aborted) {
      throw createAbortError()
    }
    const response = await fetchWithErrorHandling(`${baseUrl}/api/report/jobs/${jobId}`, {
      method: 'GET',
      signal,
    }, {
      silent,
      logLabel: 'Report job status error',
    })
    const data = await safeReadResponseJson(response)
    const status = data?.status
    if (status === 'queued' || status === 'running') {
      if (status !== lastStatus) {
        lastStatus = status
        notifyStatus(onStatus, status)
      }
      await waitFor(REPORT_JOB_POLL_MS, signal)
      continue
    }
    if (status === 'failed') {
      const message =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        'Не удалось получить результат задания.'
      throw new Error(message)
    }
    if (status === 'done') {
      polling = false
      return data?.result ?? data?.data ?? data
    }
    if (!status) {
      polling = false
      return data?.result ?? data
    }
    polling = false
    throw new Error(`Неизвестный статус задания: ${status}`)
  }
}

function shouldRequestSync(payload, snapshot) {
  if (REPORT_SYNC_MODE === 'force_sync') return true
  if (REPORT_SYNC_MODE === 'force_async') return false
  const joinsCount =
    (payload?.remoteSource?.joins?.length || 0) +
    (payload?.joins?.length || 0)
  const computedCount =
    (payload?.computedFields?.length || 0) +
    (payload?.remoteSource?.computedFields?.length || 0)
  if (joinsCount > 0 || computedCount > 0) {
    return false
  }
  const threshold = Number.isFinite(REPORT_SYNC_THRESHOLD)
    ? REPORT_SYNC_THRESHOLD
    : DEFAULT_REPORT_SYNC_THRESHOLD
  if (!Number.isFinite(threshold) || threshold <= 0) return false
  const metricsCount = Array.isArray(snapshot?.metrics)
    ? snapshot.metrics.length
    : 0
  const pivot = snapshot?.pivot || {}
  const filtersCount = Array.isArray(pivot.filters) ? pivot.filters.length : 0
  const rowsCount = Array.isArray(pivot.rows) ? pivot.rows.length : 0
  const columnsCount = Array.isArray(pivot.columns) ? pivot.columns.length : 0
  const complexityScore =
    metricsCount + filtersCount + rowsCount + columnsCount
  return complexityScore <= threshold
}

function notifyStatus(onStatus, status) {
  if (typeof onStatus !== 'function') return
  onStatus({
    status,
    message: REPORT_STATUS_LABELS[status] || '',
  })
}

export async function fetchBackendView({
  templateId = '',
  remoteSource,
  snapshot,
  filters,
  signal,
  silent = false,
  onStatus,
}) {
  const baseUrl = normalizeBackendUrl(RAW_BACKEND_URL)
  if (!baseUrl) {
    if (!silent) {
      console.error('VITE_REPORT_BACKEND_URL is missing')
    }
    throw new Error('Не задан адрес сервиса построения отчётов.')
  }
  const resolvedRemoteSource = withSplitParams(remoteSource, snapshot, filters)
  logApiProbe({
    url: resolvedRemoteSource?.url,
    method: resolvedRemoteSource?.method,
    body: resolvedRemoteSource?.body,
    params: resolvedRemoteSource?.params,
    source: 'remoteSource',
  })
  const payload = {
    templateId,
    remoteSource: resolvedRemoteSource,
    snapshot,
    filters,
  }
  const headers = {
    'Content-Type': 'application/json',
  }
  if (shouldRequestSync(payload, snapshot)) {
    headers['X-Report-Sync'] = '1'
  }
  const response = await fetchWithErrorHandling(`${baseUrl}/api/report/view`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  }, {
    silent,
    logLabel: 'Report view backend error',
    recordsLimitMessage: FILTERS_LIMIT_MESSAGE,
  })
  const data = await safeReadResponseJson(response)
  const jobId = data?.job_id || data?.jobId || null
  if (response.status === 202 || jobId) {
    const result = await pollReportJob(jobId, {
      baseUrl,
      signal,
      silent,
      onStatus,
    })
    return {
      view: result?.view || null,
      chart: result?.chart || null,
    }
  }
  return {
    view: data?.view || null,
    chart: data?.chart || null,
  }
}

export async function fetchBackendFilters({
  templateId = '',
  remoteSource,
  snapshot,
  filters,
  limit,
  signal,
  silent = false,
}) {
  const baseUrl = normalizeBackendUrl(RAW_BACKEND_URL)
  if (!baseUrl) {
    if (!silent) {
      console.error('VITE_REPORT_BACKEND_URL is missing')
    }
    throw new Error('Не задан адрес сервиса построения отчётов.')
  }
  const resolvedRemoteSource = withSplitParams(remoteSource, snapshot, filters)
  logApiProbe({
    url: resolvedRemoteSource?.url,
    method: resolvedRemoteSource?.method,
    body: resolvedRemoteSource?.body,
    params: resolvedRemoteSource?.params,
    source: 'remoteSource',
  })
  const payload = {
    templateId,
    remoteSource: resolvedRemoteSource,
    snapshot,
    filters,
  }
  const query = Number.isFinite(limit) ? `?limit=${limit}` : ''
  const response = await fetchWithErrorHandling(`${baseUrl}/api/report/filters${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  }, {
    silent,
    logLabel: 'Report filters backend error',
    recordsLimitMessage: FILTERS_LIMIT_MESSAGE,
  })
  return response.json()
}

export async function fetchBackendDetails({
  templateId = '',
  remoteSource,
  snapshot,
  filters,
  rowKey,
  columnKey,
  metric,
  detailFields = [],
  detailMetricFilter = null,
  limit,
  offset,
  signal,
  silent = false,
}) {
  const baseUrl = normalizeBackendUrl(RAW_BACKEND_URL)
  if (!baseUrl) {
    if (!silent) {
      console.error('VITE_REPORT_BACKEND_URL is missing')
    }
    throw new Error('Не задан адрес сервиса построения отчётов.')
  }
  const resolvedRemoteSource = withSplitParams(remoteSource, snapshot, filters)
  logApiProbe({
    url: resolvedRemoteSource?.url,
    method: resolvedRemoteSource?.method,
    body: resolvedRemoteSource?.body,
    params: resolvedRemoteSource?.params,
    source: 'remoteSource',
  })
  const payload = {
    templateId,
    remoteSource: resolvedRemoteSource,
    snapshot,
    filters,
    rowKey,
    columnKey,
    metric,
    detailFields,
    limit,
    offset,
  }
  if (detailMetricFilter) {
    payload.detailMetricFilter = detailMetricFilter
  }
  const response = await fetchWithErrorHandling(`${baseUrl}/api/report/details`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  }, {
    silent,
    logLabel: 'Report details backend error',
    recordsLimitMessage: DETAILS_LIMIT_MESSAGE,
  })
  return response.json()
}

export function normalizeBackendView(backendView, metrics = []) {
  const safeView = backendView || {}
  const metricList = Array.isArray(metrics) ? metrics : []
  const metricMap = new Map(metricList.map((metric) => [metric.id, metric]))
  const columns = normalizeBackendColumns(safeView.columns, metricList, metricMap)
  const rows = normalizeBackendRows(safeView.rows, columns, metricMap)
  const rowTree = normalizeBackendRowTree(
    safeView.rowTree,
    columns,
    metricList,
    metricMap,
    rows,
  )
  const rowsWithTotals = rows.map((row) => ({
    ...row,
    totals: normalizeRowTotals(row.totals, row.cells, columns, metricList),
  }))
  const columnsWithTotals = attachColumnTotals(
    columns,
    rowsWithTotals,
    metricMap,
  )
  const reorderedView = applyMetricOrderToView(
    {
      columns: columnsWithTotals,
      rows: rowsWithTotals,
      rowTree,
    },
    metricList,
  )
  const grandTotals = buildGrandTotals(
    safeView.totals,
    reorderedView.rows,
    reorderedView.columns,
    metricMap,
  )
  const rowTotalHeaders = metricList.map((metric) => ({
    metricId: metric.id,
    label: `Итого • ${metric.label || metric.title || metric.fieldKey || ''}`,
  }))

  return {
    rows: reorderedView.rows,
    columns: reorderedView.columns,
    rowTotalHeaders,
    grandTotals,
    rowTree: reorderedView.rowTree,
  }
}

function normalizeBackendUrl(value = '') {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

function withSplitParams(remoteSource, snapshot, filters) {
  if (!remoteSource || typeof remoteSource !== 'object') return remoteSource
  if (!shouldSplitParams(snapshot, filters)) return remoteSource
  const body = remoteSource.body
  if (!isPlainObject(body)) return remoteSource
  if (body.splitParams === true) return remoteSource
  return {
    ...remoteSource,
    body: {
      ...body,
      splitParams: true,
    },
  }
}

function shouldSplitParams(snapshot, filters) {
  const keys = new Set()
  collectSnapshotKeys(keys, snapshot)
  collectFiltersKeys(keys, filters)
  for (const key of keys) {
    if (isRequestFieldKey(key)) return true
  }
  return false
}

function collectSnapshotKeys(target, snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return
  const pivot = snapshot.pivot || {}
  addListValues(target, pivot.filters)
  addListValues(target, pivot.rows)
  addListValues(target, pivot.columns)
  const metrics = Array.isArray(snapshot.metrics) ? snapshot.metrics : []
  metrics.forEach((metric) => {
    addStringValue(target, metric?.fieldKey)
    addStringValue(target, metric?.sourceKey)
    addStringValue(target, metric?.dateSourceKey)
  })
  addObjectKeys(target, snapshot.filterValues)
  addObjectKeys(target, snapshot.filterRanges)
  addObjectKeys(target, snapshot.dimensionValues?.rows)
  addObjectKeys(target, snapshot.dimensionValues?.columns)
  addObjectKeys(target, snapshot.dimensionRanges?.rows)
  addObjectKeys(target, snapshot.dimensionRanges?.columns)
  addObjectKeys(target, snapshot.filterModes)
  addObjectKeys(target, snapshot.fieldMeta)
  addObjectKeys(target, snapshot.options?.headerOverrides)
  const filtersMeta = Array.isArray(snapshot.filtersMeta) ? snapshot.filtersMeta : []
  filtersMeta.forEach((meta) => {
    addStringValue(target, meta?.key || meta?.fieldKey)
  })
  const formatting = Array.isArray(snapshot.conditionalFormatting)
    ? snapshot.conditionalFormatting
    : []
  formatting.forEach((rule) => {
    addStringValue(target, rule?.fieldKey)
  })
}

function collectFiltersKeys(target, filters) {
  if (!filters || typeof filters !== 'object') return
  addObjectKeys(target, filters.globalFilters?.values)
  addObjectKeys(target, filters.globalFilters?.ranges)
  addNestedFilterKeys(target, filters.containerFilters?.values)
  addNestedFilterKeys(target, filters.containerFilters?.ranges)
}

function addNestedFilterKeys(target, collection) {
  if (!collection || typeof collection !== 'object') return
  Object.values(collection).forEach((entry) => {
    addObjectKeys(target, entry)
  })
}

function addListValues(target, list) {
  if (!Array.isArray(list)) return
  list.forEach((item) => addStringValue(target, item))
}

function addObjectKeys(target, obj) {
  if (!obj || typeof obj !== 'object') return
  Object.keys(obj).forEach((key) => addStringValue(target, key))
}

function addStringValue(target, value) {
  if (typeof value !== 'string') return
  const trimmed = value.trim()
  if (!trimmed) return
  target.add(trimmed)
}

function isRequestFieldKey(value) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim().toLowerCase()
  return trimmed.startsWith(REQUEST_FIELD_PREFIX)
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function safeReadResponseText(response) {
  try {
    return await response.text()
  } catch (err) {
    return ''
  }
}

async function safeReadResponseJson(response) {
  try {
    return await response.json()
  } catch (err) {
    return null
  }
}

async function safeReadResponseData(response) {
  const contentType = response?.headers?.get?.('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch (err) {
      return await safeReadResponseText(response)
    }
  }
  return safeReadResponseText(response)
}

function waitFor(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }
    const onAbort = () => {
      cleanup()
      reject(createAbortError())
    }
    const cleanup = () => {
      clearTimeout(timer)
      if (signal) {
        signal.removeEventListener('abort', onAbort)
      }
    }
    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, ms)
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

function createAbortError() {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

function normalizeHeaders(headers) {
  if (!headers || typeof headers.entries !== 'function') return {}
  try {
    return Object.fromEntries(headers.entries())
  } catch (err) {
    return {}
  }
}

function buildFetchError({ status, data, headers, url, method }) {
  const error = new Error('Request failed')
  error.response = { status, data, headers }
  error.config = { url, method }
  return error
}

function resolveLimitMessage(data, serverMessage, fallbackMessage = '') {
  const combined = [
    extractErrorText(data),
    extractErrorText(serverMessage),
  ]
    .join(' ')
    .toLowerCase()
  if (combined.includes('join source records limit exceeded')) {
    return JOIN_SOURCE_LIMIT_MESSAGE
  }
  if (combined.includes('join records limit exceeded')) {
    return JOIN_RECORDS_LIMIT_MESSAGE
  }
  if (combined.includes('records limit exceeded')) {
    return fallbackMessage || ''
  }
  return ''
}

function extractErrorText(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const candidate =
      value?.message ||
      value?.error ||
      value?.detail ||
      value?.errors?.[0]?.message ||
      ''
    if (typeof candidate === 'string') return candidate
  }
  return ''
}

function normalizeBackendColumns(rawColumns, metrics, metricMap) {
  const list = Array.isArray(rawColumns) ? rawColumns : []
  if (!list.length && metrics.length) {
    return metrics.map((metric) => buildFallbackColumn(metric))
  }
  return list.map((column, index) => {
    const key = typeof column?.key === 'string' ? column.key : `column-${index}`
    const split = splitColumnKey(key)
    const metricId = resolveMetricId(column, split.metricId, metrics)
    const metric = metricMap.get(metricId) || metrics[0] || null
    const baseKey =
      typeof column?.baseKey === 'string'
        ? column.baseKey
        : split.baseKey || '__all__'
    const label =
      typeof column?.label === 'string'
        ? column.label
        : metric?.label || metric?.title || metric?.fieldKey || key
    const aggregator = metric?.aggregator || column?.aggregator || 'sum'
    const format = metric?.outputFormat || column?.format || 'auto'
    const precision = Number.isFinite(metric?.precision)
      ? Number(metric.precision)
      : 2
    return {
      key,
      baseKey,
      metricId: metric?.id || metricId || key,
      metric,
      label,
      aggregator,
      format,
      precision,
      width: column?.width ?? null,
      formatting: column?.formatting ?? null,
      levels: Array.isArray(column?.levels) ? column.levels : [],
      values: Array.isArray(column?.values) ? column.values : [],
    }
  })
}

function buildFallbackColumn(metric) {
  return {
    key: `__all__::${metric.id}`,
    baseKey: '__all__',
    metricId: metric.id,
    metric,
    label: metric.label || metric.title || metric.fieldKey || metric.id,
    aggregator: metric.aggregator || 'sum',
    format: metric.outputFormat || 'auto',
    precision: Number.isFinite(metric.precision)
      ? Number(metric.precision)
      : 2,
    width: null,
    formatting: null,
    levels: [],
    values: [],
  }
}

function splitColumnKey(key) {
  if (typeof key !== 'string') {
    return { baseKey: '__all__', metricId: '' }
  }
  const index = key.lastIndexOf('::')
  if (index === -1) return { baseKey: '__all__', metricId: key }
  const baseKey = key.slice(0, index) || '__all__'
  const metricId = key.slice(index + 2)
  return { baseKey, metricId }
}

function toNumericId(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function findMetricByRemoteId(list, value) {
  const numeric = toNumericId(value)
  if (numeric === null) return null
  return (
    list.find(
      (metric) => toNumericId(metric?.remoteMeta?.idMetricsComplex) === numeric,
    ) || null
  )
}

function parseBackendMetricKey(value) {
  if (typeof value !== 'string') return null
  const index = value.lastIndexOf('__')
  if (index <= 0 || index === value.length - 2) return null
  const fieldKey = value.slice(0, index)
  const aggregator = value.slice(index + 2)
  if (!fieldKey || !aggregator) return null
  return { fieldKey, aggregator }
}

function fieldKeyMatches(metricFieldKey, backendFieldKey) {
  if (!metricFieldKey || !backendFieldKey) return false
  if (metricFieldKey === backendFieldKey) return true
  return (
    metricFieldKey.endsWith(`.${backendFieldKey}`) ||
    metricFieldKey.endsWith(`:${backendFieldKey}`)
  )
}

function findMetricByBackendKey(list, value) {
  const parsed = parseBackendMetricKey(value)
  if (!parsed) return null
  const backendAgg = parsed.aggregator.toLowerCase()
  const candidates = list.filter((metric) => {
    if (!metric || metric.type === 'formula') return false
    const metricAgg = String(metric.aggregator || '').toLowerCase()
    if (!metricAgg || metricAgg !== backendAgg) return false
    return fieldKeyMatches(String(metric.fieldKey || ''), parsed.fieldKey)
  })
  if (!candidates.length) return null
  return candidates.find((metric) => metric.enabled !== false) || candidates[0]
}

function resolveMetricId(column, fallbackMetricId, metrics) {
  const list = Array.isArray(metrics) ? metrics : []
  if (column?.metricId && list.some((metric) => metric.id === column.metricId)) {
    return column.metricId
  }
  const byRemote = findMetricByRemoteId(list, column?.metricId)
  if (byRemote) return byRemote.id
  const byBackend = findMetricByBackendKey(list, column?.metricId)
  if (byBackend) return byBackend.id
  if (
    fallbackMetricId &&
    list.some((metric) => metric.id === fallbackMetricId)
  ) {
    return fallbackMetricId
  }
  const byRemoteFallback = findMetricByRemoteId(list, fallbackMetricId)
  if (byRemoteFallback) return byRemoteFallback.id
  const byBackendFallback = findMetricByBackendKey(list, fallbackMetricId)
  if (byBackendFallback) return byBackendFallback.id
  const key = typeof column?.key === 'string' ? column.key : ''
  const byKey = list.find((metric) => metric.id === key)
  if (byKey) return byKey.id
  const byField = list.find((metric) => metric.fieldKey === key)
  if (byField) return byField.id
  const label = typeof column?.label === 'string' ? column.label.trim() : ''
  if (label) {
    const normalized = label.toLowerCase()
    const byLabel = list.find(
      (metric) => (metric.label || '').toLowerCase() === normalized,
    )
    if (byLabel) return byLabel.id
  }
  return list[0]?.id || fallbackMetricId || key
}

function normalizeBackendRows(rawRows, columns, metricMap) {
  const list = Array.isArray(rawRows) ? rawRows : []
  return list.map((row, rowIndex) => {
    const rowKey =
      typeof row?.key === 'string' && row.key ? row.key : `row-${rowIndex}`
    const rowLabel =
      typeof row?.label === 'string' && row.label
        ? row.label
        : rowKey
    const cells = columns.map((column, colIndex) => {
      const rawCell = resolveRowCell(row, column, colIndex)
      const value = normalizeCellValue(rawCell, column, metricMap)
      const display =
        rawCell?.display ??
        formatMetricValue(value, metricMap.get(column.metricId))
      const key =
        rawCell?.key ||
        `${rowKey}||${column.baseKey || '__all__'}||${column.metricId}`
      const formatted = {
        key,
        value,
        display,
      }
      if (rawCell?.formatting) {
        formatted.formatting = rawCell.formatting
      }
      return formatted
    })
    return {
      key: rowKey,
      label: rowLabel,
      cells,
      totals: row?.totals || null,
      levels: Array.isArray(row?.levels) ? row.levels : [],
      values: Array.isArray(row?.values) ? row.values : [],
    }
  })
}

function normalizeBackendRowTree(
  rawNodes,
  columns,
  metrics,
  metricMap,
  rows = [],
  depth = 0,
  parentKey = null,
) {
  const list = Array.isArray(rawNodes) ? rawNodes : []
  if (!list.length) {
    return buildRowTreeFromRows(rows, columns, metrics, metricMap)
  }
  const hasNestedChildren = list.some(
    (node) => Array.isArray(node?.children) && node.children.length,
  )
  const hasParentKeys = list.some((node) => typeof node?.parentKey === 'string')
  if (!hasNestedChildren && hasParentKeys) {
    return buildRowTreeFromFlatList(list, columns, metrics, metricMap)
  }
  return list.map((node, nodeIndex) =>
    normalizeBackendRowNode(
      node,
      columns,
      metrics,
      metricMap,
      Number.isFinite(node?.depth) ? Number(node.depth) : depth,
      typeof node?.parentKey === 'string' ? node.parentKey : parentKey,
      nodeIndex,
    ),
  )
}

function buildRowTreeFromRows(rows = [], columns = [], metrics = [], metricMap) {
  const list = Array.isArray(rows) ? rows : []
  if (!list.length) return []
  const columnCount = Array.isArray(columns) ? columns.length : 0
  const nodeMap = new Map()
  const bucketMap = new Map()
  const childKeysMap = new Map()
  const roots = []
  let maxDepth = 0

  list.forEach((row) => {
    const levels = extractRowLevels(row)
    if (!levels.length) return
    maxDepth = Math.max(maxDepth, levels.length)
    levels.forEach((level, index) => {
      const node = ensureRowTreeNode(
        nodeMap,
        roots,
        childKeysMap,
        level,
        levels,
        index,
      )
      const bucket = ensureRowBucket(bucketMap, node.key, columnCount)
      for (let colIndex = 0; colIndex < columnCount; colIndex += 1) {
        const value = row?.cells?.[colIndex]?.value
        if (typeof value !== 'undefined') {
          bucket[colIndex].push(value)
        }
      }
    })
  })

  if (maxDepth <= 1) return []

  nodeMap.forEach((node) => {
    const values = bucketMap.get(node.key) || []
    const cells = (columns || []).map((column, colIndex) => {
      const metric = metricMap?.get(column.metricId)
      const value = computeMetricTotal(values[colIndex] || [], metric)
      return {
        key: `${node.key}||${column.baseKey || '__all__'}||${column.metricId}`,
        value,
        display: formatMetricValue(value, metric),
      }
    })
    node.cells = cells
    node.totals = normalizeRowTotals(node.totals, cells, columns, metrics)
  })

  return roots
}

function extractRowLevels(row) {
  if (Array.isArray(row?.levels) && row.levels.length) {
    return row.levels.map((level, index) => ({
      fieldKey: level?.fieldKey || null,
      value: level?.value ?? '',
      depth: Number.isFinite(level?.depth) ? Number(level.depth) : index,
      pathKey: level?.pathKey || level?.key || '',
      parentKey: level?.parentKey || null,
    }))
  }
  const rawKey = typeof row?.key === 'string' ? row.key : ''
  const values = Array.isArray(row?.values) ? row.values : []
  let parts = rawKey ? rawKey.split('|') : []
  if (!parts.length && values.length) {
    parts = values.map((value, index) => `level${index}:${value ?? ''}`)
  }
  const labelParts =
    typeof row?.label === 'string' ? row.label.split(' / ') : []
  let prefix = ''
  return parts.map((part, index) => {
    const { fieldKey, value: valueFromKey } = splitRowKeyPart(part)
    const fallbackValue =
      typeof values[index] !== 'undefined'
        ? values[index]
        : typeof labelParts[index] !== 'undefined'
          ? labelParts[index]
          : ''
    const value =
      typeof valueFromKey !== 'undefined' && valueFromKey !== ''
        ? valueFromKey
        : fallbackValue
    prefix = prefix ? `${prefix}|${part}` : part
    return {
      fieldKey,
      value,
      depth: index,
      pathKey: prefix,
      parentKey: index ? parts.slice(0, index).join('|') : null,
    }
  })
}

function splitRowKeyPart(part = '') {
  const text = String(part || '')
  const index = text.indexOf(':')
  if (index < 0) {
    return { fieldKey: null, value: text }
  }
  return {
    fieldKey: text.slice(0, index),
    value: text.slice(index + 1),
  }
}

function ensureRowTreeNode(nodeMap, roots, childKeysMap, level, levels, index) {
  if (nodeMap.has(level.pathKey)) {
    return nodeMap.get(level.pathKey)
  }
  const values = levels.slice(0, index + 1).map((entry) => entry.value)
  const node = {
    key: level.pathKey,
    label: level.value || level.pathKey || '—',
    fieldKey: level.fieldKey || null,
    fieldLabel: '',
    depth: Number.isFinite(level.depth) ? level.depth : index,
    parentKey: level.parentKey || null,
    cells: [],
    totals: null,
    levels: levels.slice(0, index + 1).map((entry) => ({
      fieldKey: entry.fieldKey || null,
      fieldLabel: '',
      value: entry.value,
      depth: entry.depth,
      pathKey: entry.pathKey,
      parentKey: entry.parentKey || null,
    })),
    values,
    children: [],
  }
  nodeMap.set(level.pathKey, node)
  if (level.parentKey) {
    const parent = nodeMap.get(level.parentKey)
    if (parent) {
      if (!childKeysMap.has(parent.key)) {
        childKeysMap.set(parent.key, new Set())
      }
      const childrenSet = childKeysMap.get(parent.key)
      if (!childrenSet.has(node.key)) {
        parent.children.push(node)
        childrenSet.add(node.key)
      }
    } else {
      roots.push(node)
    }
  } else {
    roots.push(node)
  }
  return node
}

function ensureRowBucket(bucketMap, key, columnCount) {
  if (!bucketMap.has(key)) {
    const bucket = Array.from({ length: columnCount }, () => [])
    bucketMap.set(key, bucket)
  }
  return bucketMap.get(key)
}

function normalizeBackendRowNode(
  node,
  columns,
  metrics,
  metricMap,
  depth,
  parentKey,
  fallbackIndex = 0,
) {
  const nodeKey =
    typeof node?.key === 'string' && node.key
      ? node.key
      : `${parentKey || 'row'}-${depth}-${fallbackIndex}`
  const nodeLabel =
    typeof node?.label === 'string' && node.label
      ? node.label
      : nodeKey
  const cells = columns.map((column, colIndex) => {
    const rawCell = resolveRowCell(node, column, colIndex)
    const value = normalizeCellValue(rawCell, column, metricMap)
    const display =
      rawCell?.display ??
      formatMetricValue(value, metricMap.get(column.metricId))
    const key =
      rawCell?.key ||
      `${nodeKey}||${column.baseKey || '__all__'}||${column.metricId}`
    const formatted = {
      key,
      value,
      display,
    }
    if (rawCell?.formatting) {
      formatted.formatting = rawCell.formatting
    }
    return formatted
  })
  const totals = normalizeRowTotals(node?.totals, cells, columns, metrics)
  const normalizedDepth = Number.isFinite(depth) ? Number(depth) : 0
  return {
    key: nodeKey,
    label: nodeLabel,
    fieldKey: node?.fieldKey || null,
    fieldLabel: node?.fieldLabel || '',
    depth: normalizedDepth,
    parentKey,
    cells,
    totals,
    levels: Array.isArray(node?.levels) ? node.levels : [],
    values: Array.isArray(node?.values) ? node.values : [],
    children: Array.isArray(node?.children)
      ? node.children.map((child, index) =>
          normalizeBackendRowNode(
            child,
            columns,
            metrics,
            metricMap,
            normalizedDepth + 1,
            nodeKey,
            index,
          ),
        )
      : [],
  }
}

function buildRowTreeFromFlatList(list, columns, metrics, metricMap) {
  const normalized = list.map((node, index) =>
    normalizeBackendRowNode(
      node,
      columns,
      metrics,
      metricMap,
      Number.isFinite(node?.depth) ? Number(node.depth) : null,
      typeof node?.parentKey === 'string' ? node.parentKey : null,
      index,
    ),
  )
  const nodeMap = new Map(normalized.map((node) => [node.key, node]))
  const roots = []
  normalized.forEach((node) => {
    node.children = Array.isArray(node.children) ? node.children : []
  })
  normalized.forEach((node) => {
    if (node.parentKey && nodeMap.has(node.parentKey) && node.parentKey !== node.key) {
      nodeMap.get(node.parentKey).children.push(node)
    } else {
      roots.push(node)
    }
  })
  const applyDepth = (nodes, parentDepth = 0) => {
    nodes.forEach((node) => {
      if (!Number.isFinite(node.depth)) {
        node.depth = parentDepth
      }
      applyDepth(node.children || [], node.depth + 1)
    })
  }
  applyDepth(roots, 0)
  return roots
}

function applyMetricOrderToView(view, metrics = []) {
  if (!view || !Array.isArray(view.columns)) {
    return view || { columns: [], rows: [], rowTree: [] }
  }
  const orderedColumns = reorderColumnsByMetric(view.columns, metrics)
  if (!orderedColumns.length) {
    return view
  }
  const sameOrder =
    orderedColumns.length === view.columns.length &&
    orderedColumns.every((column, index) => column.key === view.columns[index]?.key)
  if (sameOrder) return view
  return {
    ...view,
    columns: orderedColumns,
    rows: reorderRowsByColumns(view.rows || [], view.columns, orderedColumns),
    rowTree: reorderTreeByColumns(
      view.rowTree || [],
      view.columns,
      orderedColumns,
    ),
  }
}

function reorderColumnsByMetric(columns = [], metrics = []) {
  const list = Array.isArray(columns) ? columns : []
  const metricOrder = (metrics || [])
    .map((metric) => metric?.id)
    .filter(Boolean)
  if (!metricOrder.length || !list.length) return list
  const baseOrder = []
  const baseKeys = new Set()
  list.forEach((column) => {
    const baseKey = column?.baseKey || '__all__'
    if (!baseKeys.has(baseKey)) {
      baseKeys.add(baseKey)
      baseOrder.push(baseKey)
    }
  })
  const columnsByMetric = new Map()
  list.forEach((column) => {
    if (!columnsByMetric.has(column.metricId)) {
      columnsByMetric.set(column.metricId, new Map())
    }
    columnsByMetric.get(column.metricId).set(column.baseKey, column)
  })
  const result = []
  const used = new Set()
  metricOrder.forEach((metricId) => {
    const map = columnsByMetric.get(metricId)
    if (!map) return
    baseOrder.forEach((baseKey) => {
      const column = map.get(baseKey)
      if (!column || used.has(column.key)) return
      used.add(column.key)
      result.push(column)
    })
  })
  list.forEach((column) => {
    if (!used.has(column.key)) {
      result.push(column)
    }
  })
  return result
}

function reorderRowsByColumns(rows = [], prevColumns = [], nextColumns = []) {
  if (!Array.isArray(rows) || !rows.length) return rows
  const indexByKey = new Map(
    (prevColumns || []).map((column, index) => [column.key, index]),
  )
  return rows.map((row) => ({
    ...row,
    cells: (nextColumns || []).map((column) =>
      resolveReorderedCell(row, column, indexByKey),
    ),
  }))
}

function reorderTreeByColumns(nodes = [], prevColumns = [], nextColumns = []) {
  if (!Array.isArray(nodes) || !nodes.length) return nodes
  const indexByKey = new Map(
    (prevColumns || []).map((column, index) => [column.key, index]),
  )
  const normalizeNode = (node) => ({
    ...node,
    cells: (nextColumns || []).map((column) =>
      resolveReorderedCell(node, column, indexByKey),
    ),
    children: Array.isArray(node.children)
      ? node.children.map((child) => normalizeNode(child))
      : [],
  })
  return nodes.map((node) => normalizeNode(node))
}

function resolveReorderedCell(row, column, indexByKey) {
  const idx = indexByKey.get(column.key)
  const cell = idx != null ? row?.cells?.[idx] : null
  if (cell) return cell
  return {
    key: `${row?.key || 'row'}||${column.baseKey || '__all__'}||${column.metricId}`,
    value: null,
    display: '—',
  }
}

function resolveRowCell(row, column, columnIndex) {
  if (!row) return null
  const cells = row.cells
  if (Array.isArray(cells)) {
    const direct = cells[columnIndex]
    if (direct) return direct
    if (column?.key) {
      return cells.find((cell) => cell?.key === column.key) || null
    }
    return null
  }
  if (cells && typeof cells === 'object') {
    if (column?.key && Object.prototype.hasOwnProperty.call(cells, column.key)) {
      return cells[column.key]
    }
    if (
      column?.metricId &&
      Object.prototype.hasOwnProperty.call(cells, column.metricId)
    ) {
      return cells[column.metricId]
    }
    return null
  }
  return null
}

function normalizeCellValue(rawCell, column, metricMap) {
  const value = rawCell?.value ?? rawCell
  const metric = metricMap.get(column.metricId)
  if (!metric) return value
  if (metric.aggregator === 'value' || metric.outputFormat === 'text') {
    return value
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : value
}

function normalizeRowTotals(rawTotals, cells, columns, metrics) {
  const metricList = Array.isArray(metrics) ? metrics : []
  if (Array.isArray(rawTotals)) {
    const map = new Map(
      rawTotals
        .filter((entry) => entry && entry.metricId)
        .map((entry) => [entry.metricId, entry]),
    )
    return metricList.map((metric) => {
      const entry = map.get(metric.id)
      if (entry) {
        const value = entry.value ?? null
        return {
          metricId: metric.id,
          value,
          display: entry.display ?? formatMetricValue(value, metric),
        }
      }
      return {
        metricId: metric.id,
        value: null,
        display: '—',
      }
    })
  }
  if (rawTotals && typeof rawTotals === 'object') {
    return metricList.map((metric) => {
      const value = rawTotals[metric.id]
      if (typeof value !== 'undefined') {
        return {
          metricId: metric.id,
          value,
          display: formatMetricValue(value, metric),
        }
      }
      return {
        metricId: metric.id,
        value: null,
        display: '—',
      }
    })
  }
  return metricList.map((metric) => {
    const values = collectMetricValues(cells, columns, metric.id)
    const value = computeMetricTotal(values, metric)
    return {
      metricId: metric.id,
      value,
      display: formatMetricValue(value, metric),
    }
  })
}

function attachColumnTotals(columns, rows, metricMap) {
  return columns.map((column, index) => {
    const metric = metricMap.get(column.metricId)
    const values = rows.map((row) => row.cells?.[index]?.value)
    const totalValue = computeMetricTotal(values, metric)
    return {
      ...column,
      value: totalValue,
      totalDisplay: formatMetricValue(totalValue, metric),
    }
  })
}

function buildGrandTotals(rawTotals, rows, columns, metricMap) {
  const result = {}
  if (rawTotals && typeof rawTotals === 'object') {
    const rawKeys = Object.keys(rawTotals)
    const hasMetricKeys = rawKeys.some((key) => metricMap.has(key))
    if (hasMetricKeys) {
      metricMap.forEach((metric, metricId) => {
        if (Object.prototype.hasOwnProperty.call(rawTotals, metricId)) {
          const value = rawTotals[metricId]
          result[metricId] = {
            value,
            display: formatMetricValue(value, metric),
          }
        }
      })
      return result
    }
    rawKeys.forEach((key) => {
      const column = columns.find((item) => item.key === key)
      if (!column) return
      const metric = metricMap.get(column.metricId)
      const value = rawTotals[key]
      const entry = result[column.metricId]
      const nextValue = computeMetricTotal(
        [entry?.value, value].filter((item) => typeof item !== 'undefined'),
        metric,
      )
      result[column.metricId] = {
        value: nextValue,
        display: formatMetricValue(nextValue, metric),
      }
    })
    if (Object.keys(result).length) return result
  }
  metricMap.forEach((metric, metricId) => {
    const values = collectMetricValuesFromRows(rows, columns, metricId)
    const value = computeMetricTotal(values, metric)
    result[metricId] = {
      value,
      display: formatMetricValue(value, metric),
    }
  })
  return result
}

function collectMetricValues(cells = [], columns = [], metricId) {
  if (!Array.isArray(cells) || !Array.isArray(columns)) return []
  const values = []
  columns.forEach((column, index) => {
    if (column.metricId !== metricId) return
    values.push(cells[index]?.value)
  })
  return values
}

function collectMetricValuesFromRows(rows = [], columns = [], metricId) {
  const values = []
  rows.forEach((row) => {
    values.push(...collectMetricValues(row.cells || [], columns, metricId))
  })
  return values
}

function computeMetricTotal(values = [], metric) {
  const list = Array.isArray(values) ? values : []
  if (!metric) return null
  if (metric.aggregator === 'value') {
    const defined = list.filter((value) => value !== null && value !== undefined)
    return defined.length === 1 ? defined[0] : null
  }
  const numeric = list
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
  if (!numeric.length) return null
  if (metric.aggregator === 'avg') {
    return numeric.reduce((sum, value) => sum + value, 0) / numeric.length
  }
  return numeric.reduce((sum, value) => sum + value, 0)
}

function formatMetricValue(value, metric) {
  if (value === null || typeof value === 'undefined' || value === '') return '—'
  if (!metric) return formatValue(value)
  const format = metric.outputFormat || 'auto'
  const precision = Number.isFinite(metric.precision)
    ? Number(metric.precision)
    : 2
  if (format && format !== 'auto') {
    return formatFormulaValue(value, format, precision)
  }
  if (metric.aggregator === 'value') {
    return formatValue(value)
  }
  return formatNumber(value, precision)
}
