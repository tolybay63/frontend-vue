import {
  loadReportConfigurations,
  loadReportPresentations,
  loadReportSources,
} from '@/shared/api/report'
import { fetchFactorValues, loadPresentationLinks } from '@/shared/api/objects'
import {
  parseJoinConfig,
  extractJoinsFromBody,
} from '@/shared/lib/sourceJoins.js'

const FALLBACK_AGGREGATORS = {
  count: { label: 'Количество', fvFieldVal: 1350, pvFieldVal: 1570 },
  sum: { label: 'Сумма', fvFieldVal: 1349, pvFieldVal: 1569 },
  avg: { label: 'Среднее', fvFieldVal: 1351, pvFieldVal: 1571 },
  value: { label: 'Значение', fvFieldVal: 0, pvFieldVal: 0 },
}

export async function fetchReportViewTemplates() {
  const [
    presentationsRaw,
    configsRaw,
    sourcesRaw,
    vizRecords,
    aggRecords,
    linkRecords,
  ] = await Promise.all([
    loadReportPresentations(),
    loadReportConfigurations(),
    loadReportSources(),
    fetchFactorValues('Prop_VisualTyp'),
    fetchFactorValues('Prop_FieldVal'),
    loadPresentationLinks(),
  ])

  const visualizationMap = buildVisualizationLookup(vizRecords)
  const aggregatorMap = buildAggregatorMap(aggRecords)
  const sources = sourcesRaw.map((entry, index) =>
    normalizeSource(entry, index),
  )
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
    const source = config ? sourceMap.get(config.parentId) || null : null
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
      filterRanges: {},
      dimensionValues: { rows: {}, columns: {} },
      dimensionRanges: { rows: {}, columns: {} },
      options: { headerOverrides: {}, sorts: {} },
      filtersMeta: [],
      fieldMeta: {},
    }
  }
  return {
    pivot: config.pivot,
    metrics: config.metrics,
    filterValues: config.filterValues,
    filterRanges: config.filterRanges || {},
    dimensionValues: {
      rows: config.rowFilters,
      columns: config.columnFilters,
    },
    dimensionRanges: {
      rows: config.rowRanges || {},
      columns: config.columnRanges || {},
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
  const knownKeys = collectKnownFieldKeys(filterPayload, rowPayload, colPayload)
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
      filters: parseFieldSequence(entry?.Filter, knownKeys),
      rows: parseFieldSequence(entry?.Row, knownKeys),
      columns: parseFieldSequence(entry?.Col, knownKeys),
    },
    filterValues: filterPayload.values || {},
    filterRanges: filterPayload.ranges || {},
    rowFilters: rowPayload.values || {},
    rowRanges: rowPayload.ranges || {},
    columnFilters: colPayload.values || {},
    columnRanges: colPayload.ranges || {},
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
  const baseBody =
    entry?.MethodBody ||
    entry?.body ||
    entry?.payload ||
    entry?.requestBody ||
    entry?.rawBody ||
    ''
  const { cleanedBody, joins: embeddedJoins } = extractJoinsFromBody(baseBody)
  const formattedBody = cleanedBody || baseBody
  const parsedBody = parseMaybeJson(formattedBody || baseBody)
  const joinConfig = parseJoinConfig(entry?.joinConfig || entry?.JoinConfig)
  return {
    id: remoteId || createLocalId(`source-${index}`),
    remoteId,
    name: entry?.name || entry?.Name || entry?.title || `Источник ${index + 1}`,
    description: entry?.description || entry?.Description || '',
    method: (entry?.nameMethodTyp || entry?.Method || 'POST').toUpperCase(),
    url: entry?.URL || entry?.url || entry?.requestUrl || '',
    body: parsedBody,
    headers: parseHeaderPayload(entry?.headers || entry?.Headers),
    rawBody: formatRawBody(formattedBody),
    joins: embeddedJoins.length ? embeddedJoins : joinConfig,
    remoteMeta: entry || {},
  }
}

function normalizeMetrics(list = [], metricSettings = [], aggregatorMap) {
  const remoteList = Array.isArray(list) ? list : []
  const settings = Array.isArray(metricSettings) ? metricSettings : []
  const result = []
  const remoteById = new Map(
    remoteList.map((entry) => [toNumericId(entry?.idMetricsComplex), entry]),
  )
  const remoteByField = new Map(
    remoteList.map((entry) => [entry?.FieldName || entry?.Field, entry]),
  )
  const usedRemote = new Set()
  if (settings.length) {
    settings.forEach((saved, index) => {
      if (saved?.type === 'formula') {
        result.push({
          id: saved.id || createLocalId(`metric-${index}`),
          type: 'formula',
          title: saved.title || '',
          enabled: saved.enabled !== false,
          showRowTotals: saved.showRowTotals !== false,
          showColumnTotals: saved.showColumnTotals !== false,
          expression: saved.expression || '',
          outputFormat: saved.outputFormat || 'number',
          precision: Number.isFinite(saved.precision)
            ? Number(saved.precision)
            : 2,
        })
        return
      }
      const entry =
        (saved?.remoteId && remoteById.get(toNumericId(saved.remoteId))) ||
        (saved?.fieldKey && remoteByField.get(saved.fieldKey))
      if (entry) {
        usedRemote.add(entry)
        result.push(buildNormalizedMetric(entry, saved, aggregatorMap, index))
      }
    })
  }
  remoteList.forEach((entry, index) => {
    if (usedRemote.has(entry)) return
    result.push(buildNormalizedMetric(entry, null, aggregatorMap, index))
  })
  return result
}

function buildNormalizedMetric(
  entry = {},
  saved = null,
  aggregatorMap,
  index = 0,
) {
  const fieldKey =
    entry?.FieldName ||
    entry?.Field ||
    entry?.FieldLabel ||
    saved?.fieldKey ||
    ''
  const aggregator =
    saved?.aggregator ||
    resolveAggregatorKeyFromRemote(
      entry?.fvFieldVal,
      entry?.pvFieldVal,
      aggregatorMap,
    ) ||
    'sum'
  return {
    id: entry?.idMetricsComplex
      ? String(entry.idMetricsComplex)
      : saved?.id || createLocalId(`metric-${index}`),
    type: 'base',
    fieldKey,
    aggregator,
    fieldLabel: saved?.title || entry?.FieldLabel || fieldKey,
    showRowTotals: saved?.showRowTotals !== false,
    showColumnTotals: saved?.showColumnTotals !== false,
    remoteMeta: entry || {},
  }
}

function resolveVisualizationType(entry, lookup) {
  const key = buildVisualizationKey(entry?.fvVisualTyp, entry?.pvVisualTyp)
  if (key && lookup.has(key)) {
    return lookup.get(key).type
  }
  return resolveVisualizationChartType({
    name: entry?.nameVisualTyp || entry?.VisualTypName,
  })
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
    const pv = toNumericId(
      record?.pvVisualTyp ?? record?.pv ?? record?.pvFieldVal,
    )
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
  if (!Object.keys(map).length) {
    return FALLBACK_AGGREGATORS
  }
  Object.entries(FALLBACK_AGGREGATORS).forEach(([key, meta]) => {
    if (!map[key]) {
      map[key] = meta
    }
  })
  return map
}

function resolveAggregatorKeyFromRemote(fv, pv, map = FALLBACK_AGGREGATORS) {
  const numericFv = toNumericId(fv)
  const numericPv = toNumericId(pv)
  const match = Object.entries(map).find(
    ([, meta]) =>
      meta.fvFieldVal === numericFv && meta.pvFieldVal === numericPv,
  )
  return match ? match[0] : 'sum'
}

function detectAggregatorKey(record = {}) {
  const rawName = String(record?.name || record?.title || '')
    .trim()
    .toLowerCase()
  if (!rawName) return null
  if (rawName.includes('колич') || rawName.includes('count')) return 'count'
  if (rawName.includes('сред') || rawName.includes('avg')) return 'avg'
  if (rawName.includes('сум') || rawName.includes('sum')) return 'sum'
  if (rawName.includes('знач') || rawName.includes('value')) return 'value'
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

function parseFieldSequence(value, knownKeys = null) {
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
  const tokens = trimmed
    .split(/[.,|;]/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (!tokens.length) return []
  return rebuildSequenceTokens(tokens, knownKeys)
}

function parseMetaPayload(raw) {
  const fallback = { values: {}, ranges: {} }
  if (!raw) return fallback
  let payload = raw
  if (typeof raw === 'string') {
    try {
      payload = JSON.parse(raw)
    } catch {
      return fallback
    }
  }
  if (!payload || typeof payload !== 'object') return fallback
  return {
    ...payload,
    values: payload.values || {},
    ranges: payload.ranges || {},
  }
}

function collectKnownFieldKeys(...payloads) {
  const set = new Set()
  payloads.forEach((payload) => {
    if (!payload || typeof payload !== 'object') return
    collectKeysFromPayload(set, payload.values)
    collectKeysFromPayload(set, payload.ranges)
    collectKeysFromPayload(set, payload.headerOverrides)
    collectKeysFromPayload(set, payload.sorts)
    collectKeysFromPayload(set, payload.fieldMeta)
    if (Array.isArray(payload.filtersMeta)) {
      payload.filtersMeta.forEach((meta) => {
        if (meta?.key) set.add(String(meta.key).trim())
      })
    }
    if (Array.isArray(payload.metricSettings)) {
      payload.metricSettings.forEach((meta) => {
        if (meta?.fieldKey) set.add(String(meta.fieldKey).trim())
      })
    }
  })
  return set
}

function collectKeysFromPayload(target, source) {
  if (!source || typeof source !== 'object') return
  Object.keys(source).forEach((key) => {
    const normalized = String(key).trim()
    if (normalized) target.add(normalized)
  })
}

function rebuildSequenceTokens(tokens = [], knownKeys = new Set()) {
  const result = []
  let index = 0
  while (index < tokens.length) {
    const match = findKnownSequence(tokens, index, knownKeys)
    if (match) {
      result.push(match.value)
      index = match.nextIndex
      continue
    }
    const heuristic = attemptJoinHeuristic(tokens, index)
    if (heuristic) {
      result.push(heuristic.value)
      index = heuristic.nextIndex
      continue
    }
    result.push(tokens[index])
    index += 1
  }
  return result
}

function findKnownSequence(tokens, start, knownKeys = new Set()) {
  if (!knownKeys || !knownKeys.size) return null
  for (let end = tokens.length; end > start; end -= 1) {
    const candidate = tokens.slice(start, end).join('.')
    if (knownKeys.has(candidate)) {
      return { value: candidate, nextIndex: end }
    }
  }
  return null
}

const JOIN_PREFIX_PATTERN = /^[A-Z0-9_]+$/
const JOIN_FIELD_PATTERN = /^[a-zA-Z0-9_]+$/

function attemptJoinHeuristic(tokens, start) {
  const prefix = tokens[start]
  const next = tokens[start + 1]
  if (!prefix || !next) return null
  if (JOIN_PREFIX_PATTERN.test(prefix) && JOIN_FIELD_PATTERN.test(next)) {
    return { value: `${prefix}.${next}`, nextIndex: start + 2 }
  }
  return null
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
