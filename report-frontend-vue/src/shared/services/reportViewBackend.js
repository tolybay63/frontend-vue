import { formatFormulaValue, formatNumber, formatValue } from '@/shared/lib/pivotUtils'

const RAW_BACKEND_URL = import.meta.env.VITE_REPORT_BACKEND_URL || ''
const PIVOT_BACKEND_ENABLED =
  String(import.meta.env.VITE_PIVOT_BACKEND_ENABLED || '').toLowerCase() ===
  'true'

export const isPivotBackendEnabled = () => PIVOT_BACKEND_ENABLED

export async function fetchBackendView({
  templateId = '',
  remoteSource,
  snapshot,
  filters,
  signal,
}) {
  const baseUrl = normalizeBackendUrl(RAW_BACKEND_URL)
  if (!baseUrl) {
    console.error('VITE_REPORT_BACKEND_URL is missing')
    throw new Error('Не задан адрес сервиса построения отчётов.')
  }
  const payload = {
    templateId,
    remoteSource,
    snapshot,
    filters,
  }
  const response = await fetch(`${baseUrl}/api/report/view`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })
  if (!response.ok) {
    const details = await safeReadResponseText(response)
    console.error('Report view backend error', response.status, details)
    throw new Error('Не удалось получить представление с сервера.')
  }
  const data = await response.json()
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
}) {
  const baseUrl = normalizeBackendUrl(RAW_BACKEND_URL)
  if (!baseUrl) {
    console.error('VITE_REPORT_BACKEND_URL is missing')
    throw new Error('Не задан адрес сервиса построения отчётов.')
  }
  const payload = {
    templateId,
    remoteSource,
    snapshot,
    filters,
  }
  const query = Number.isFinite(limit) ? `?limit=${limit}` : ''
  const response = await fetch(`${baseUrl}/api/report/filters${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })
  if (!response.ok) {
    const details = await safeReadResponseText(response)
    console.error('Report filters backend error', response.status, details)
    throw new Error('Не удалось получить значения фильтров.')
  }
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
  limit,
  offset,
  signal,
}) {
  const baseUrl = normalizeBackendUrl(RAW_BACKEND_URL)
  if (!baseUrl) {
    console.error('VITE_REPORT_BACKEND_URL is missing')
    throw new Error('Не задан адрес сервиса построения отчётов.')
  }
  const payload = {
    templateId,
    remoteSource,
    snapshot,
    filters,
    rowKey,
    columnKey,
    metric,
    detailFields,
    limit,
    offset,
  }
  const response = await fetch(`${baseUrl}/api/report/details`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })
  if (!response.ok) {
    const details = await safeReadResponseText(response)
    console.error('Report details backend error', response.status, details)
    throw new Error('Не удалось получить детализацию.')
  }
  return response.json()
}

export function normalizeBackendView(backendView, metrics = []) {
  const safeView = backendView || {}
  const metricList = Array.isArray(metrics) ? metrics : []
  const metricMap = new Map(metricList.map((metric) => [metric.id, metric]))
  const columns = normalizeBackendColumns(safeView.columns, metricList, metricMap)
  const rows = normalizeBackendRows(safeView.rows, columns, metricMap)
  const rowsWithTotals = rows.map((row) => ({
    ...row,
    totals: normalizeRowTotals(row.totals, row.cells, columns, metricList),
  }))
  const columnsWithTotals = attachColumnTotals(
    columns,
    rowsWithTotals,
    metricMap,
  )
  const grandTotals = buildGrandTotals(
    safeView.totals,
    rowsWithTotals,
    columnsWithTotals,
    metricMap,
  )
  const rowTotalHeaders = metricList.map((metric) => ({
    metricId: metric.id,
    label: `Итого • ${metric.label || metric.title || metric.fieldKey || ''}`,
  }))

  return {
    rows: rowsWithTotals,
    columns: columnsWithTotals,
    rowTotalHeaders,
    grandTotals,
    rowTree: [],
  }
}

function normalizeBackendUrl(value = '') {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

async function safeReadResponseText(response) {
  try {
    return await response.text()
  } catch (err) {
    return ''
  }
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

function resolveMetricId(column, fallbackMetricId, metrics) {
  const list = Array.isArray(metrics) ? metrics : []
  if (column?.metricId && list.some((metric) => metric.id === column.metricId)) {
    return column.metricId
  }
  if (
    fallbackMetricId &&
    list.some((metric) => metric.id === fallbackMetricId)
  ) {
    return fallbackMetricId
  }
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
