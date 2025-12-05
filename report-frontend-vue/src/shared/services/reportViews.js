import {
  loadReportConfigurations,
  loadReportPresentations,
  loadReportSources,
} from '@/shared/api/report'
import { fetchFactorValues, loadPresentationLinks } from '@/shared/api/objects'

const FALLBACK_AGGREGATORS = {
  count: { label: 'Количество', fvFieldVal: 1350, pvFieldVal: 1570 },
  sum: { label: 'Сумма', fvFieldVal: 1349, pvFieldVal: 1569 },
  avg: { label: 'Среднее', fvFieldVal: 1351, pvFieldVal: 1571 },
}

export async function fetchReportViewTemplates() {
  const [presentationsRaw, configsRaw, sourcesRaw, vizRecords, aggRecords, linkRecords] =
    await Promise.all([
      loadReportPresentations(),
      loadReportConfigurations(),
      loadReportSources(),
      fetchFactorValues('Prop_VisualTyp'),
      fetchFactorValues('Prop_FieldVal'),
      loadPresentationLinks(),
    ])

  const visualizationMap = buildVisualizationLookup(vizRecords)
  const aggregatorMap = buildAggregatorMap(aggRecords)
  const sources = sourcesRaw.map((entry, index) => normalizeSource(entry, index))
  const sourceMap = new Map(
    sources.map((source) => [source.remoteId || source.id, source]),
  )
  const configs = configsRaw.map((entry, index) =>
    normalizeConfig(entry, index, aggregatorMap),
  )
  const configMap = new Map(
    configs.map((config) => [config.remoteId || config.id, config]),
  )
  const presentations = presentationsRaw.map((entry, index) =>
    normalizePresentation(entry, index, visualizationMap),
  )
  const linkMap = buildPresentationLinkMap(linkRecords)

  return presentations.map((presentation) => {
    const config = configMap.get(presentation.parentId) || null
    const source = config
      ? sourceMap.get(config.parentId) || null
      : null
    const link =
      linkMap.get(toStableId(presentation.remoteId)) ||
      linkMap.get(toStableId(presentation.id)) ||
      linkMap.get(buildNameKey(presentation.name)) ||
      null
    return buildTemplate(presentation, config, source, link)
  })
}

function buildTemplate(presentation, config, source, link) {
  return {
    id: presentation.id,
    name: presentation.name,
    description: presentation.description,
    visualization: presentation.visualization,
    visualizationLabel: presentation.visualizationLabel,
    dataSource: source?.id || source?.remoteId || config?.parentId || '',
    remoteSource: source,
    snapshot: buildSnapshot(config),
    remotePresentation: presentation.remoteMeta,
    remoteConfig: config?.remoteMeta,
    missingConfig: !config,
    missingSource: !source,
    linkMeta: link,
  }
}

function buildSnapshot(config) {
  if (!config) {
    return {
      pivot: { filters: [], rows: [], columns: [] },
      metrics: [],
      filterValues: {},
      dimensionValues: { rows: {}, columns: {} },
      options: { headerOverrides: {}, sorts: {} },
      filtersMeta: [],
      fieldMeta: {},
    }
  }
  return {
    pivot: config.pivot,
    metrics: config.metrics,
    filterValues: config.filterValues,
    dimensionValues: {
      rows: config.rowFilters,
      columns: config.columnFilters,
    },
    options: {
      headerOverrides: config.headerOverrides,
      sorts: config.sorts,
    },
    filtersMeta: ensureFilterMeta(config),
    fieldMeta: config.fieldMeta,
  }
}

function ensureFilterMeta(config = {}) {
  if (Array.isArray(config.filtersMeta) && config.filtersMeta.length) {
    return config.filtersMeta
  }
  const filters = config.pivot?.filters || []
  if (!filters.length) return []
  return filters.map((key) => ({
    key,
    label: config.headerOverrides?.[key] || key,
    values: [],
  }))
}

function normalizePresentation(entry = {}, index = 0, visualizationMap) {
  const remoteId = toStableId(entry?.id ?? entry?.Id ?? entry?.ID)
  const visualization = resolveVisualizationType(entry, visualizationMap)
  return {
    id: remoteId || createLocalId(`presentation-${index}`),
    remoteId,
    parentId: toStableId(entry?.parent ?? entry?.Parent ?? entry?.parentId),
    name: entry?.name || entry?.Name || `Представление ${index + 1}`,
    description: entry?.Discription || entry?.Description || '',
    visualization,
    visualizationLabel: entry?.nameVisualTyp || entry?.VisualTypName || '',
    fvVisualTyp: toNumericId(entry?.fvVisualTyp ?? entry?.fv),
    pvVisualTyp: toNumericId(entry?.pvVisualTyp ?? entry?.pv),
    remoteMeta: entry || {},
  }
}

function normalizeConfig(entry = {}, index = 0, aggregatorMap) {
  const remoteId = toStableId(entry?.id ?? entry?.Id ?? entry?.ID)
  const filterPayload = parseMetaPayload(entry?.FilterVal)
  const rowPayload = parseMetaPayload(entry?.RowVal)
  const colPayload = parseMetaPayload(entry?.ColVal)
  const headerOverrides = {
    ...(filterPayload.headerOverrides || {}),
    ...(rowPayload.headerOverrides || {}),
    ...(colPayload.headerOverrides || {}),
  }
  const metrics = normalizeMetrics(
    entry?.complex,
    filterPayload.metricSettings,
    aggregatorMap,
  )
  return {
    id: remoteId || createLocalId(`config-${index}`),
    remoteId,
    parentId: toStableId(entry?.parent ?? entry?.Parent ?? entry?.parentId),
    pivot: {
      filters: parseFieldSequence(entry?.Filter),
      rows: parseFieldSequence(entry?.Row),
      columns: parseFieldSequence(entry?.Col),
    },
    filterValues: filterPayload.values || {},
    rowFilters: rowPayload.values || {},
    columnFilters: colPayload.values || {},
    filtersMeta: filterPayload.filtersMeta || [],
    fieldMeta: filterPayload.fieldMeta || {},
    sorts: {
      filters: filterPayload.sorts || {},
      rows: rowPayload.sorts || {},
      columns: colPayload.sorts || {},
    },
    headerOverrides,
    metrics,
    remoteMeta: entry || {},
  }
}

function normalizeSource(entry = {}, index = 0) {
  const remoteId = toStableId(entry?.id ?? entry?.Id ?? entry?.ID)
  return {
    id: remoteId || createLocalId(`source-${index}`),
    remoteId,
    name: entry?.name || entry?.Name || entry?.title || `Источник ${index + 1}`,
    description: entry?.description || entry?.Description || '',
    method: (entry?.nameMethodTyp || entry?.Method || 'POST').toUpperCase(),
    url: entry?.URL || entry?.url || entry?.requestUrl || '',
    body: parseMaybeJson(entry?.MethodBody || entry?.body || entry?.payload),
    headers: parseHeaderPayload(entry?.headers || entry?.Headers),
    remoteMeta: entry || {},
  }
}

function normalizeMetrics(list = [], metricSettings = [], aggregatorMap) {
  if (!Array.isArray(list)) return []
  return list
    .map((entry, index) => {
      const fieldKey = entry?.FieldName || entry?.Field || entry?.FieldLabel || ''
      if (!fieldKey) return null
      const saved = (metricSettings || []).find(
        (item) =>
          toNumericId(item?.remoteId) === toNumericId(entry?.idMetricsComplex) ||
          item?.fieldKey === fieldKey,
      )
      const aggregator =
        saved?.aggregator ||
        resolveAggregatorKeyFromRemote(
          entry?.fvFieldVal,
          entry?.pvFieldVal,
          aggregatorMap,
        ) || 'sum'
      return {
        id: entry?.idMetricsComplex
          ? String(entry.idMetricsComplex)
          : createLocalId(`metric-${index}`),
        fieldKey,
        aggregator,
        fieldLabel: saved?.title || entry?.FieldLabel || fieldKey,
        showRowTotals: saved?.showRowTotals !== false,
        showColumnTotals: saved?.showColumnTotals !== false,
        remoteMeta: entry || {},
      }
    })
    .filter(Boolean)
}

function resolveVisualizationType(entry, lookup) {
  const key = buildVisualizationKey(entry?.fvVisualTyp, entry?.pvVisualTyp)
  if (key && lookup.has(key)) {
    return lookup.get(key).type
  }
  return resolveVisualizationChartType({ name: entry?.nameVisualTyp || entry?.VisualTypName })
}

function buildVisualizationLookup(records = []) {
  const map = new Map()
  if (!Array.isArray(records)) return map
  records.forEach((record, index) => {
    const fv = toNumericId(
      record?.fvVisualTyp ??
        record?.fv ??
        record?.value ??
        record?.FieldVal ??
        record?.id,
    )
    const pv = toNumericId(record?.pvVisualTyp ?? record?.pv ?? record?.pvFieldVal)
    const label = formatVisualizationLabel(record, index)
    if (fv === null) return
    map.set(buildVisualizationKey(fv, pv), {
      label,
      type: resolveVisualizationChartType(record),
    })
  })
  return map
}

function buildVisualizationKey(fv, pv) {
  const numericFv = toNumericId(fv)
  if (!Number.isFinite(numericFv)) return ''
  const numericPv = toNumericId(pv)
  return `${numericFv}:${Number.isFinite(numericPv) ? numericPv : 0}`
}

function buildAggregatorMap(records = []) {
  const map = {}
  ;(records || []).forEach((record) => {
    const key = detectAggregatorKey(record)
    if (!key) return
    map[key] = {
      label: formatAggregatorLabel(record?.name, key),
      fvFieldVal:
        toNumericId(record?.id ?? record?.FieldVal) ||
        FALLBACK_AGGREGATORS[key]?.fvFieldVal ||
        0,
      pvFieldVal:
        toNumericId(record?.pv ?? record?.pvFieldVal) ||
        FALLBACK_AGGREGATORS[key]?.pvFieldVal ||
        0,
    }
  })
  return Object.keys(map).length ? map : FALLBACK_AGGREGATORS
}

function resolveAggregatorKeyFromRemote(fv, pv, map = FALLBACK_AGGREGATORS) {
  const numericFv = toNumericId(fv)
  const numericPv = toNumericId(pv)
  const match = Object.entries(map).find(
    ([, meta]) => meta.fvFieldVal === numericFv && meta.pvFieldVal === numericPv,
  )
  return match ? match[0] : 'sum'
}

function detectAggregatorKey(record = {}) {
  const rawName = String(record?.name || record?.title || '').trim().toLowerCase()
  if (!rawName) return null
  if (rawName.includes('колич') || rawName.includes('count')) return 'count'
  if (rawName.includes('сред') || rawName.includes('avg')) return 'avg'
  if (rawName.includes('сум') || rawName.includes('sum')) return 'sum'
  return null
}

function formatVisualizationLabel(record = {}, index = 0) {
  const label = record?.name || record?.Name || record?.title
  if (label && String(label).trim()) return String(label).trim()
  return `Тип визуализации ${index + 1}`
}

function formatVisualizationChartLabel(record = {}) {
  return record?.name || record?.Name || record?.title || ''
}

function resolveVisualizationChartType(record) {
  const name = String(formatVisualizationChartLabel(record)).toLowerCase()
  const has = (...tokens) => tokens.some((token) => name.includes(token))
  if (has('круг', 'pie')) return 'pie'
  if (has('линей', 'line')) return 'line'
  if (has('столб', 'column', 'bar', 'гист', 'граф')) return 'bar'
  if (has('табл', 'table')) return 'table'
  return 'table'
}

function formatAggregatorLabel(name = '', key = '') {
  const trimmed = String(name).trim()
  if (trimmed) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  }
  return FALLBACK_AGGREGATORS[key]?.label || key
}

function parseFieldSequence(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  const trimmed = String(value).trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean)
    }
  } catch {
    // ignore
  }
  return trimmed
    .split(/[.,|;]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseMetaPayload(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      return {}
    }
  }
  return {}
}

function parseMaybeJson(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function parseHeaderPayload(raw) {
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

function toNumericId(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function toStableId(value) {
  if (value === null || typeof value === 'undefined') return ''
  const str = String(value).trim()
  return str || ''
}

function createLocalId(prefix = 'view') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function buildPresentationLinkMap(records = []) {
  const map = new Map()
  ;(records || []).forEach((record) => {
    const meta = normalizePresentationLink(record)
    if (!meta) return
    map.set(meta.id, meta)
    const nameKey = buildNameKey(meta.name)
    if (nameKey && !map.has(nameKey)) {
      map.set(nameKey, meta)
    }
  })
  return map
}

function normalizePresentationLink(record = {}) {
  const id = toStableId(record?.id ?? record?.Id ?? record?.ID)
  if (!id) return null
  return {
    id,
    numericId: toNumericId(record?.id ?? record?.Id ?? record?.ID),
    pv: toNumericId(record?.pv ?? record?.Pv ?? record?.PV),
    name: record?.name || record?.fullName || '',
    raw: record || {},
  }
}

function buildNameKey(value) {
  if (!value) return ''
  return `name:${String(value).trim().toLowerCase()}`
}
