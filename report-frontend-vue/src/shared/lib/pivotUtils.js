export function formatNumber(value, precision = 2) {
  if (value === null || typeof value === 'undefined' || value === '') return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return '—'
  if (precision === 0) {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(num)
}

export function formatValue(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '—'
  return String(value)
}

function formatMetricOutput(value, aggregator) {
  if (aggregator === 'value') {
    if (value === null || typeof value === 'undefined' || value === '')
      return '—'
    return String(value)
  }
  return formatNumber(value)
}

export function formatFormulaValue(value, format = 'number', precision = 2) {
  if (value === null || typeof value === 'undefined' || value === '') return '—'
  if (format === 'text') {
    return String(value)
  }
  if (format === 'integer') {
    return formatNumber(value, 0)
  }
  if (format === 'percent') {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return '—'
    return `${formatNumber(numeric * 100, precision)}%`
  }
  if (format === 'currency') {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return '—'
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(numeric)
  }
  if (format === 'auto') {
    const numeric = Number(value)
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return formatNumber(numeric, precision)
    }
    return String(value)
  }
  return formatNumber(value, precision)
}

export function normalizeValue(value) {
  if (value === null || typeof value === 'undefined') return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (err) {
      return ''
    }
  }
  return String(value)
}

export function humanizeKey(key = '') {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim()
    .replace(/^./, (char) => char.toUpperCase())
}

const VALUE_COLLATOR =
  typeof Intl !== 'undefined' && typeof Intl.Collator === 'function'
    ? new Intl.Collator('ru-RU', { sensitivity: 'base', numeric: true })
    : null

function normalizeFieldMetaMap(fieldMeta) {
  if (!fieldMeta) return new Map()
  if (fieldMeta instanceof Map) return fieldMeta
  if (typeof fieldMeta === 'object') {
    return new Map(Object.entries(fieldMeta))
  }
  return new Map()
}

function resolveFieldMeta(fieldMetaMap, key) {
  if (!fieldMetaMap) return {}
  return fieldMetaMap.get(key) || {}
}

function displayFieldLabel(fieldMetaMap, overrides, key) {
  const override = overrides?.[key]
  if (override && override.trim()) return override.trim()
  const meta = resolveFieldMeta(fieldMetaMap, key)
  return meta?.label || humanizeKey(key)
}

function buildDimensionKey(
  record,
  dimensions,
  fieldMetaMap,
  overrides,
  levelMetaStore,
) {
  if (!dimensions.length) {
    return { key: '__all__', label: 'Все записи', levels: [] }
  }
  const levels = []
  let prefix = ''
  dimensions.forEach((fieldKey, index) => {
    const partKey = `${fieldKey}:${normalizeValue(record[fieldKey])}`
    prefix = prefix ? `${prefix}|${partKey}` : partKey
    const value = formatValue(record[fieldKey])
    const fieldLabel = displayFieldLabel(fieldMetaMap, overrides, fieldKey)
    const entry = {
      fieldKey,
      fieldLabel,
      value,
      depth: index,
      pathKey: prefix,
      parentKey: index === 0 ? null : levels[index - 1].pathKey,
    }
    levels.push(entry)
    if (levelMetaStore && !levelMetaStore.has(prefix)) {
      levelMetaStore.set(prefix, entry)
    }
  })
  const label = levels.map((level) => level.value || '—').join(' / ')
  return {
    key: levels.at(-1)?.pathKey || '__empty__',
    label: label || '—',
    levels,
  }
}

function createBucket() {
  return { count: 0, numericCount: 0, sum: 0, last: null }
}

function getBucket(store, key) {
  if (!store.has(key)) store.set(key, createBucket())
  return store.get(key)
}

function getNestedBucket(store, outerKey, innerKey) {
  if (!store.has(outerKey)) store.set(outerKey, new Map())
  const nested = store.get(outerKey)
  if (!nested.has(innerKey)) nested.set(innerKey, createBucket())
  return nested.get(innerKey)
}

function pushValue(bucket, value) {
  if (!bucket) return
  bucket.count += 1
  bucket.last = value
  const num = Number(value)
  if (!Number.isNaN(num)) {
    bucket.numericCount += 1
    bucket.sum += num
  }
}

function finalizeBucket(bucket, aggregator) {
  if (aggregator === 'value' && bucket && bucket.count > 1) {
    const error = new Error('VALUE_AGGREGATION_COLLISION')
    error.code = 'VALUE_AGGREGATION_COLLISION'
    throw error
  }
  if (!bucket) return null
  if (aggregator === 'value') return bucket.last
  if (aggregator === 'count') return bucket.count
  if (!bucket.numericCount) return null
  if (aggregator === 'sum') return bucket.sum
  if (aggregator === 'avg') return bucket.sum / bucket.numericCount
  return null
}

function flattenColumns(columnIndex, metrics) {
  const entries = []
  columnIndex.forEach((column) => {
    metrics.forEach((metric) => {
      entries.push({
        key: `${column.key}::${metric.id}`,
        baseKey: column.key,
        metricId: metric.id,
        label:
          column.label && column.label !== 'Все записи'
            ? `${column.label} • ${metric.label}`
            : metric.label,
        aggregator: metric.aggregator,
        levels: column.levels || [],
      })
    })
  })
  return entries
}

function ensureIndex(store, collection, entry) {
  if (!store.has(entry.key)) {
    store.set(entry.key, entry)
    collection.push(entry)
  }
  return store.get(entry.key)
}

export function buildPivotView({
  records = [],
  rows = [],
  columns = [],
  metrics = [],
  fieldMeta,
  headerOverrides = {},
  sorts = {},
}) {
  const fieldMetaMap = normalizeFieldMetaMap(fieldMeta)
  const rowSortConfig = normalizeSortConfig(rows, sorts?.rows)
  const columnSortConfig = normalizeSortConfig(columns, sorts?.columns)
  const primaryMetric = metrics[0] || null
  const rowIndex = []
  const rowMap = new Map()
  const columnIndex = []
  const columnMap = new Map()
  const cellMap = new Map()
  const rowMetricTotals = new Map()
  const columnMetricTotals = new Map()
  const grandMetricTotals = new Map()
  const rowPrefixColumnBuckets = new Map()
  const rowPrefixMetricBuckets = new Map()
  const columnPrefixMetricBuckets = new Map()
  const rowLevelMeta = new Map()

  records.forEach((record) => {
    const rowEntry = buildDimensionKey(
      record,
      rows,
      fieldMetaMap,
      headerOverrides,
      rowLevelMeta,
    )
    const columnEntry = buildDimensionKey(
      record,
      columns,
      fieldMetaMap,
      headerOverrides,
    )
    const rowKey = ensureIndex(rowMap, rowIndex, rowEntry)
    const columnKey = ensureIndex(columnMap, columnIndex, columnEntry)

    metrics.forEach((metric) => {
      const value = record[metric.fieldKey]
      const cellKey = `${rowKey.key}||${columnKey.key}||${metric.id}`
      pushValue(getBucket(cellMap, cellKey), value)
      pushValue(getNestedBucket(rowMetricTotals, rowKey.key, metric.id), value)
      pushValue(
        getNestedBucket(columnMetricTotals, columnKey.key, metric.id),
        value,
      )
      pushValue(getBucket(grandMetricTotals, metric.id), value)
      const columnEntryKey = `${columnKey.key}::${metric.id}`
      rowEntry.levels.forEach((level) => {
        pushValue(
          getRowColumnBucket(
            rowPrefixColumnBuckets,
            level.pathKey,
            columnEntryKey,
          ),
          value,
        )
        pushValue(
          getPrefixMetricBucket(
            rowPrefixMetricBuckets,
            level.pathKey,
            metric.id,
          ),
          value,
        )
      })
      columnEntry.levels.forEach((level) => {
        pushValue(
          getPrefixMetricBucket(
            columnPrefixMetricBuckets,
            level.pathKey,
            metric.id,
          ),
          value,
        )
      })
    })
  })

  if (columnIndex.length > 1 && columnSortConfig.size) {
    sortDimensionIndex(columnIndex, columns, columnSortConfig, {
      prefixMetricBuckets: columnPrefixMetricBuckets,
      metricId: primaryMetric?.id,
      metricAggregator: primaryMetric?.aggregator,
    })
  }

  if (rowIndex.length > 1 && rowSortConfig.size) {
    sortDimensionIndex(rowIndex, rows, rowSortConfig, {
      prefixMetricBuckets: rowPrefixMetricBuckets,
      metricId: primaryMetric?.id,
      metricAggregator: primaryMetric?.aggregator,
    })
  }

  const columnEntries = columnIndex.length
    ? flattenColumns(columnIndex, metrics)
    : metrics.map((metric) => ({
        key: `__all__::${metric.id}`,
        baseKey: '__all__',
        metricId: metric.id,
        label: metric.label,
        aggregator: metric.aggregator,
      }))

  const rowsView = rowIndex.length
    ? rowIndex
    : [{ key: '__all__', label: 'Все записи', levels: [] }]

  const rowsResult = rowsView.map((row) => {
    const cells = columnEntries.map((column) => {
      const cellKey = `${row.key}||${column.baseKey}||${column.metricId}`
      const bucket = cellMap.get(cellKey)
      let value
      try {
        value = finalizeBucket(bucket, column.aggregator)
      } catch (err) {
        if (err?.code === 'VALUE_AGGREGATION_COLLISION') {
          throw buildValueAggregationError(column.metricId)
        }
        throw err
      }
      return {
        key: cellKey,
        display: formatMetricOutput(value, column.aggregator),
        value,
      }
    })
    const totals = metrics.map((metric) => {
      const bucket = getNestedBucket(rowMetricTotals, row.key, metric.id)
      let value
      try {
        value = finalizeBucket(bucket, metric.aggregator)
      } catch (err) {
        if (err?.code === 'VALUE_AGGREGATION_COLLISION') {
          throw buildValueAggregationError(metric.id)
        }
        throw err
      }
      return {
        metricId: metric.id,
        display: formatMetricOutput(value, metric.aggregator),
        value,
      }
    })
    return {
      key: row.key,
      label: row.label,
      cells,
      totals,
      levels: row.levels || [],
    }
  })

  const columnsResult = columnEntries.map((column) => {
    const bucket = getNestedBucket(
      columnMetricTotals,
      column.baseKey,
      column.metricId,
    )
    let value
    try {
      value = finalizeBucket(bucket, column.aggregator)
    } catch (err) {
      if (err?.code === 'VALUE_AGGREGATION_COLLISION') {
        throw buildValueAggregationError(column.metricId)
      }
      throw err
    }
    return {
      ...column,
      totalDisplay: formatMetricOutput(value, column.aggregator),
      value,
      levels: column.levels || [],
    }
  })

  const rowTotalHeaders = metrics.map((metric) => ({
    metricId: metric.id,
    label: `Итого • ${metric.label}`,
  }))

  const grandTotals = metrics.reduce((acc, metric) => {
    const bucket = grandMetricTotals.get(metric.id)
    let value
    try {
      value = finalizeBucket(bucket, metric.aggregator)
    } catch (err) {
      if (err?.code === 'VALUE_AGGREGATION_COLLISION') {
        throw buildValueAggregationError(metric.id)
      }
      throw err
    }
    acc[metric.id] = {
      value,
      display: formatMetricOutput(value, metric.aggregator),
    }
    return acc
  }, {})

  const rowTree = buildRowTree({
    levelMeta: rowLevelMeta,
    columnBuckets: rowPrefixColumnBuckets,
    metricBuckets: rowPrefixMetricBuckets,
    columnEntries,
    metrics,
  })

  if (rowTree.length && rowSortConfig.size) {
    sortRowTreeByConfig(rowTree, rowSortConfig, {
      metricId: primaryMetric?.id,
      metricAggregator: primaryMetric?.aggregator,
    })
  }

  return {
    rows: rowsResult,
    columns: columnsResult,
    rowTotalHeaders,
    grandTotals,
    rowTree,
  }
}

function getRowColumnBucket(store, levelKey, columnEntryKey) {
  if (!store.has(levelKey)) store.set(levelKey, new Map())
  const columnMap = store.get(levelKey)
  if (!columnMap.has(columnEntryKey))
    columnMap.set(columnEntryKey, createBucket())
  return columnMap.get(columnEntryKey)
}

function getPrefixMetricBucket(store, levelKey, metricId) {
  if (!store.has(levelKey)) store.set(levelKey, new Map())
  const metricMap = store.get(levelKey)
  if (!metricMap.has(metricId)) metricMap.set(metricId, createBucket())
  return metricMap.get(metricId)
}

function buildRowTree({
  levelMeta,
  columnBuckets,
  metricBuckets,
  columnEntries,
  metrics,
}) {
  if (!levelMeta.size) return []
  const nodes = new Map()
  const orderedMeta = Array.from(levelMeta.values()).sort(
    (a, b) => a.depth - b.depth,
  )

  const getNode = (meta) => {
    if (nodes.has(meta.pathKey)) return nodes.get(meta.pathKey)
    const columnMap = columnBuckets.get(meta.pathKey) || new Map()
    const metricMap = metricBuckets.get(meta.pathKey) || new Map()
    const cells = columnEntries.map((column) => {
      const bucket = columnMap.get(column.key)
      let value
      try {
        value = finalizeBucket(bucket, column.aggregator)
      } catch (err) {
        if (err?.code === 'VALUE_AGGREGATION_COLLISION') {
          throw buildValueAggregationError(column.metricId)
        }
        throw err
      }
      return {
        key: `${meta.pathKey}||${column.key}`,
        display: formatMetricOutput(value, column.aggregator),
        value,
      }
    })
    const totals = metrics.map((metric) => {
      const bucket = metricMap.get(metric.id)
      let value
      try {
        value = finalizeBucket(bucket, metric.aggregator)
      } catch (err) {
        if (err?.code === 'VALUE_AGGREGATION_COLLISION') {
          throw buildValueAggregationError(metric.id)
        }
        throw err
      }
      return {
        metricId: metric.id,
        display: formatMetricOutput(value, metric.aggregator),
        value,
      }
    })
    const node = {
      key: meta.pathKey,
      label: meta.value || '—',
      fieldKey: meta.fieldKey,
      fieldLabel: meta.fieldLabel,
      depth: meta.depth,
      parentKey: meta.parentKey,
      cells,
      totals,
      children: [],
    }
    nodes.set(meta.pathKey, node)
    return node
  }

  orderedMeta.forEach((meta) => {
    const node = getNode(meta)
    if (meta.parentKey && levelMeta.has(meta.parentKey)) {
      const parent = getNode(levelMeta.get(meta.parentKey))
      parent.children.push(node)
    }
  })

  return orderedMeta
    .filter((meta) => !meta.parentKey)
    .map((meta) => nodes.get(meta.pathKey))
}

function normalizeSortConfig(dimensions = [], state = {}) {
  const map = new Map()
  if (!Array.isArray(dimensions) || !dimensions.length) {
    return map
  }
  dimensions.forEach((key) => {
    const entry = state?.[key]
    if (!entry) return
    const config = {}
    const valueDirection = normalizeDirection(entry.value)
    const metricDirection = normalizeDirection(entry.metric)
    if (valueDirection) config.value = valueDirection
    if (metricDirection) config.metric = metricDirection
    if (config.value || config.metric) {
      map.set(key, config)
    }
  })
  return map
}

function normalizeDirection(value) {
  return value === 'asc' || value === 'desc' ? value : null
}

function sortDimensionIndex(entries, dimensions, config, options = {}) {
  if (!Array.isArray(entries) || !entries.length) return
  if (!config?.size) return
  const orderedKeys = (dimensions || []).filter((key) => config.has(key))
  if (!orderedKeys.length) return
  const metricId = options.metricId
  const metricAggregator = options.metricAggregator
  const prefixMetricBuckets = options.prefixMetricBuckets

  entries.sort((left, right) => {
    for (const fieldKey of orderedKeys) {
      const sortEntry = config.get(fieldKey)
      if (!sortEntry) continue
      const leftLevel = findLevelEntry(left, fieldKey)
      const rightLevel = findLevelEntry(right, fieldKey)
      if (sortEntry.metric && metricId && prefixMetricBuckets) {
        const leftMetric = resolvePrefixMetricValue(
          prefixMetricBuckets,
          leftLevel,
          metricId,
          metricAggregator,
        )
        const rightMetric = resolvePrefixMetricValue(
          prefixMetricBuckets,
          rightLevel,
          metricId,
          metricAggregator,
        )
        const metricComparison = compareNumbers(
          leftMetric,
          rightMetric,
          sortEntry.metric,
        )
        if (metricComparison !== 0) return metricComparison
      }
      if (sortEntry.value) {
        const valueComparison = compareStrings(
          leftLevel?.value,
          rightLevel?.value,
          sortEntry.value,
        )
        if (valueComparison !== 0) return valueComparison
      }
    }
    return 0
  })
}

function findLevelEntry(entry, fieldKey) {
  if (!entry?.levels || !entry.levels.length) return null
  return entry.levels.find((level) => level.fieldKey === fieldKey) || null
}

function resolvePrefixMetricValue(store, level, metricId, aggregator) {
  if (!store || !level?.pathKey || !metricId || !aggregator) return null
  const metricMap = store.get(level.pathKey)
  if (!metricMap) return null
  const bucket = metricMap.get(metricId)
  if (!bucket) return null
  return finalizeBucket(bucket, aggregator)
}

function compareStrings(left, right, direction = 'asc') {
  const a = typeof left === 'string' ? left : left != null ? String(left) : ''
  const b =
    typeof right === 'string' ? right : right != null ? String(right) : ''
  const result = VALUE_COLLATOR
    ? VALUE_COLLATOR.compare(a, b)
    : a.localeCompare(b)
  return direction === 'desc' ? -result : result
}

function compareNumbers(left, right, direction = 'asc') {
  const a =
    typeof left === 'number'
      ? left
      : Number.isFinite(left)
        ? Number(left)
        : null
  const b =
    typeof right === 'number'
      ? right
      : Number.isFinite(right)
        ? Number(right)
        : null
  if (a === null && b === null) return 0
  if (a === null) return direction === 'asc' ? 1 : -1
  if (b === null) return direction === 'asc' ? -1 : 1
  if (a === b) return 0
  return direction === 'asc' ? a - b : b - a
}

function sortRowTreeByConfig(nodes, sortConfig, options = {}) {
  if (!Array.isArray(nodes) || !nodes.length || !sortConfig?.size) return
  const fieldKey = nodes[0]?.fieldKey
  const config = fieldKey ? sortConfig.get(fieldKey) : null
  if (config) {
    nodes.sort((a, b) => compareTreeNodes(a, b, config, options))
  }
  nodes.forEach((node) => {
    if (node.children?.length) {
      sortRowTreeByConfig(node.children, sortConfig, options)
    }
  })
}

function compareTreeNodes(a, b, config, { metricId }) {
  if (config.metric && metricId) {
    const metricComparison = compareNumbers(
      pickMetricValue(a.totals, metricId),
      pickMetricValue(b.totals, metricId),
      config.metric,
    )
    if (metricComparison !== 0) return metricComparison
  }
  if (config.value) {
    return compareStrings(a.label, b.label, config.value)
  }
  return 0
}

function pickMetricValue(totals = [], metricId) {
  if (!Array.isArray(totals) || !metricId) return null
  const entry = totals.find((total) => total.metricId === metricId)
  return typeof entry?.value === 'number' ? entry.value : (entry?.value ?? null)
}

const FORMULA_TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g

export function extractFormulaMetricIds(expression = '') {
  if (!expression) return []
  const ids = new Set()
  const input = String(expression)
  let match
  while ((match = FORMULA_TOKEN_REGEX.exec(input))) {
    if (match[1]) ids.add(match[1])
  }
  return Array.from(ids)
}

export function augmentPivotViewWithFormulas(view, metrics = []) {
  if (!view || !Array.isArray(metrics) || !metrics.length) return view
  const formulas = metrics.filter(
    (metric) =>
      metric?.type === 'formula' &&
      typeof metric.expression === 'string' &&
      metric.expression.trim(),
  )
  if (!formulas.length) return view
  const baseMetrics = metrics.filter((metric) => metric?.type !== 'formula')
  if (!baseMetrics.length) return view
  const evaluators = formulas
    .map((metric) => {
      const compiled = compileFormulaExpression(metric.expression)
      if (!compiled) return null
      return { metric, evaluate: compiled }
    })
    .filter(Boolean)
  if (!evaluators.length) return view

  const columnEntries = Array.isArray(view.columns) ? view.columns : []
  const baseKeyMeta = buildColumnBaseMeta(columnEntries)
  const baseKeyOrder = baseKeyMeta.order
  const columnMap = columnEntries.reduce((acc, column) => {
    const key = buildColumnKey(column.baseKey, column.metricId)
    acc.set(key, column)
    return acc
  }, new Map())
  const columnTotals = columnEntries.reduce((acc, column) => {
    if (!acc.has(column.baseKey)) acc.set(column.baseKey, new Map())
    acc.get(column.baseKey).set(column.metricId, column.value)
    return acc
  }, new Map())
  const rowCellMaps = buildRowCellMaps(view.rows || [], columnEntries)
  const treeCellMaps = buildRowCellMaps(view.rowTree || [], columnEntries, true)
  const metricsById = new Map(metrics.map((metric) => [metric.id, metric]))
  const formulaEvaluators = new Map(
    evaluators.map((entry) => [entry.metric.id, entry.evaluate]),
  )
  const metricOrder = metrics.filter(
    (metric) => metric && metricsById.has(metric.id),
  )

  const newColumns = buildAugmentedColumns({
    baseKeyOrder,
    baseKeyMeta,
    metricOrder,
    columnMap,
    columnTotals,
    formulaEvaluators,
  })
  const newRows = buildAugmentedRows({
    rows: view.rows || [],
    baseKeyOrder,
    metricOrder,
    rowCellMaps,
    formulaEvaluators,
  })
  const newRowTree = Array.isArray(view.rowTree)
    ? buildAugmentedRowTree({
        nodes: view.rowTree,
        baseKeyOrder,
        metricOrder,
        treeCellMaps,
        formulaEvaluators,
      })
    : []
  const newRowTotalHeaders = metricOrder.map((metric) => ({
    metricId: metric.id,
    label: `Итого • ${metric.label || metric.title || metric.fieldKey || ''}`,
  }))
  const newRowsWithTotals = computeRowTotals(
    newRows,
    metricOrder,
    formulaEvaluators,
  )
  const newTreeWithTotals = computeRowTotals(
    newRowTree,
    metricOrder,
    formulaEvaluators,
    true,
  )
  const newGrandTotals = buildGrandTotals(
    view.grandTotals || {},
    metricOrder,
    formulaEvaluators,
  )

  return {
    ...view,
    columns: newColumns,
    rows: newRowsWithTotals,
    rowTree: newTreeWithTotals,
    rowTotalHeaders: newRowTotalHeaders,
    grandTotals: newGrandTotals,
  }
}

function computeRowTotals(
  rows,
  metricOrder,
  formulaEvaluators,
  isTree = false,
) {
  if (!Array.isArray(rows) || !rows.length) return rows
  return rows.map((row) => {
    const totalMap = (row.totals || []).reduce((acc, total) => {
      acc.set(total.metricId, total)
      return acc
    }, new Map())
    const newTotals = metricOrder.map((metric) => {
      if (metric.type === 'formula') {
        const evaluator = formulaEvaluators.get(metric.id)
        if (!evaluator) {
          return { metricId: metric.id, display: '—', value: null }
        }
        const values = {}
        totalMap.forEach((entry, metricId) => {
          values[metricId] = entry?.value
        })
        const value = evaluator((id) => values[id])
        return {
          metricId: metric.id,
          value,
          display: formatFormulaValue(
            value,
            metric.outputFormat,
            metric.precision,
          ),
        }
      }
      const entry = totalMap.get(metric.id)
      if (entry) return entry
      return { metricId: metric.id, display: '—', value: null }
    })
    const base = {
      ...row,
      totals: newTotals,
    }
    if (isTree && Array.isArray(row.children) && row.children.length) {
      base.children = computeRowTotals(
        row.children,
        metricOrder,
        formulaEvaluators,
        true,
      )
    }
    return base
  })
}

function buildGrandTotals(baseTotals, metricOrder, formulaEvaluators) {
  const result = {}
  metricOrder.forEach((metric) => {
    if (metric.type === 'formula') {
      const evaluator = formulaEvaluators.get(metric.id)
      if (!evaluator) {
        result[metric.id] = { value: null, display: '—' }
        return
      }
      const values = {}
      Object.entries(baseTotals || {}).forEach(([metricId, entry]) => {
        values[metricId] = entry?.value ?? null
      })
      const value = evaluator((id) => values[id])
      result[metric.id] = {
        value,
        display: formatFormulaValue(
          value,
          metric.outputFormat,
          metric.precision,
        ),
      }
    } else {
      result[metric.id] = baseTotals[metric.id] || { value: null, display: '—' }
    }
  })
  return result
}

function buildAugmentedColumns({
  baseKeyOrder,
  baseKeyMeta,
  metricOrder,
  columnMap,
  columnTotals,
  formulaEvaluators,
}) {
  const columns = []
  baseKeyOrder.forEach((baseKey) => {
    const template = baseKeyMeta.meta.get(baseKey)
    metricOrder.forEach((metric) => {
      if (metric.type === 'formula') {
        const evaluator = formulaEvaluators.get(metric.id)
        const values = columnTotals.get(baseKey) || new Map()
        const columnKey = buildColumnKey(baseKey, metric.id)
        const value = evaluator ? evaluator((id) => values.get(id)) : null
        columns.push({
          key: columnKey,
          baseKey,
          metricId: metric.id,
          label: template?.label || metric.label || '',
          aggregator: 'formula',
          levels: template?.levels || [],
          totalDisplay: formatFormulaValue(
            value,
            metric.outputFormat,
            metric.precision,
          ),
          value,
        })
      } else {
        const existing = columnMap.get(buildColumnKey(baseKey, metric.id))
        if (existing) {
          columns.push(existing)
        }
      }
    })
  })
  return columns
}

function buildAugmentedRows({
  rows,
  baseKeyOrder,
  metricOrder,
  rowCellMaps,
  formulaEvaluators,
}) {
  return rows.map((row) => {
    const map = rowCellMaps.get(row.key) || new Map()
    const newCells = buildCellSequence({
      baseKeyOrder,
      metricOrder,
      map,
      rowKey: row.key,
      formulaEvaluators,
    })
    return {
      ...row,
      cells: newCells,
    }
  })
}

function buildAugmentedRowTree({
  nodes,
  baseKeyOrder,
  metricOrder,
  treeCellMaps,
  formulaEvaluators,
}) {
  return nodes.map((node) => {
    const map = treeCellMaps.get(node.key) || new Map()
    const newCells = buildCellSequence({
      baseKeyOrder,
      metricOrder,
      map,
      rowKey: node.key,
      formulaEvaluators,
    })
    return {
      ...node,
      cells: newCells,
      children: node.children
        ? buildAugmentedRowTree({
            nodes: node.children,
            baseKeyOrder,
            metricOrder,
            treeCellMaps,
            formulaEvaluators,
          })
        : [],
    }
  })
}

function buildCellSequence({
  baseKeyOrder,
  metricOrder,
  map,
  rowKey,
  formulaEvaluators,
}) {
  const cells = []
  baseKeyOrder.forEach((baseKey) => {
    const metricsMap = map.get(baseKey) || new Map()
    metricOrder.forEach((metric) => {
      if (metric.type === 'formula') {
        const evaluator = formulaEvaluators.get(metric.id)
        const values = {}
        metricsMap.forEach((cell, metricId) => {
          values[metricId] = cell?.value
        })
        const value = evaluator ? evaluator((id) => values[id]) : null
        cells.push({
          key: `${rowKey}||${baseKey}||${metric.id}`,
          value,
          display: formatFormulaValue(
            value,
            metric.outputFormat,
            metric.precision,
          ),
        })
      } else {
        const cell = metricsMap.get(metric.id)
        if (cell) {
          cells.push(cell)
        } else {
          cells.push({
            key: `${rowKey}||${baseKey}||${metric.id}`,
            value: null,
            display: '—',
          })
        }
      }
    })
  })
  return cells
}

function buildRowCellMaps(rows, columns, isTree = false) {
  const columnList = Array.isArray(columns) ? columns : []
  const map = new Map()
  rows.forEach((row) => {
    const baseMap = new Map()
    const cells = row.cells || []
    cells.forEach((cell, index) => {
      const column = columnList[index]
      if (!column) return
      if (!baseMap.has(column.baseKey)) {
        baseMap.set(column.baseKey, new Map())
      }
      baseMap.get(column.baseKey).set(column.metricId, cell)
    })
    map.set(row.key, baseMap)
    if (isTree && Array.isArray(row.children)) {
      const childMaps = buildRowCellMaps(row.children, columns, true)
      childMaps.forEach((value, key) => {
        map.set(key, value)
      })
    }
  })
  return map
}

function buildColumnBaseMeta(columns) {
  const meta = new Map()
  const order = []
  if (Array.isArray(columns) && columns.length) {
    columns.forEach((column) => {
      if (!meta.has(column.baseKey)) {
        meta.set(column.baseKey, {
          label: column.label,
          levels: column.levels || [],
        })
        order.push(column.baseKey)
      }
    })
  } else {
    meta.set('__all__', { label: 'Все записи', levels: [] })
    order.push('__all__')
  }
  return { meta, order }
}

function compileFormulaExpression(expression = '') {
  const trimmed = String(expression || '').trim()
  if (!trimmed) return null
  const jsExpression = trimmed.replace(FORMULA_TOKEN_REGEX, (_, id) => {
    if (!id) return '__get("")'
    return `__get("${id}")`
  })
  try {
    const fn = new Function('__get', `return (${jsExpression});`)
    return (resolver) => {
      try {
        return fn((id) => resolver(id))
      } catch {
        return null
      }
    }
  } catch {
    return null
  }
}

function buildColumnKey(baseKey, metricId) {
  return `${baseKey || '__all__'}::${metricId}`
}

export function filterPivotViewByVisibility(view, metrics = []) {
  if (!view) return view
  const allowedIds = new Set(
    (metrics || [])
      .filter((metric) => metric?.enabled !== false)
      .map((metric) => metric.id),
  )
  const originalColumns = view.columns || []
  const columnIndexMap = new Map()
  originalColumns.forEach((column, index) =>
    columnIndexMap.set(column.key, index),
  )
  const filteredColumns = originalColumns.filter((column) =>
    allowedIds.has(column.metricId),
  )
  const columnIndices = filteredColumns.map((column) =>
    columnIndexMap.get(column.key),
  )
  const filterCells = (cells = []) =>
    columnIndices
      .map((idx) => (Array.isArray(cells) ? cells[idx] : undefined))
      .filter((cell) => typeof cell !== 'undefined')
  const filterTotals = (totals = []) =>
    (totals || []).filter((total) => allowedIds.has(total.metricId))
  const filteredRows = (view.rows || []).map((row) => ({
    ...row,
    cells: filterCells(row.cells || []),
    totals: filterTotals(row.totals || []),
  }))
  const filteredRowTree = filterRowTreeByVisibility(
    view.rowTree || [],
    columnIndices,
    allowedIds,
  )
  const filteredRowHeaders = (view.rowTotalHeaders || []).filter((header) =>
    allowedIds.has(header.metricId),
  )
  const filteredGrandTotals = Object.entries(view.grandTotals || {}).reduce(
    (acc, [metricId, entry]) => {
      if (allowedIds.has(metricId)) {
        acc[metricId] = entry
      }
      return acc
    },
    {},
  )
  return {
    ...view,
    columns: filteredColumns,
    rows: filteredRows,
    rowTree: filteredRowTree,
    rowTotalHeaders: filteredRowHeaders,
    grandTotals: filteredGrandTotals,
  }
}

function filterRowTreeByVisibility(
  nodes = [],
  columnIndices = [],
  allowedIds = new Set(),
) {
  if (!Array.isArray(nodes) || !nodes.length) return nodes
  return nodes.map((node) => {
    const filtered = {
      ...node,
      cells: columnIndices
        .map((idx) => (Array.isArray(node.cells) ? node.cells[idx] : undefined))
        .filter((cell) => typeof cell !== 'undefined'),
      totals: (node.totals || []).filter((total) =>
        allowedIds.has(total.metricId),
      ),
    }
    if (Array.isArray(node.children) && node.children.length) {
      filtered.children = filterRowTreeByVisibility(
        node.children,
        columnIndices,
        allowedIds,
      )
    }
    return filtered
  })
}

function buildValueAggregationError(metricId) {
  const error = new Error('VALUE_AGGREGATION_COLLISION')
  error.code = 'VALUE_AGGREGATION_COLLISION'
  error.metricId = metricId
  return error
}
