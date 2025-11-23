export function formatNumber(value) {
  if (value === null || typeof value === 'undefined') return '—'
  if (Number.isInteger(value)) {
    return new Intl.NumberFormat('ru-RU').format(value)
  }
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatValue(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '—'
  return String(value)
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

function buildDimensionKey(record, dimensions, fieldMetaMap, overrides, levelMetaStore) {
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
  return { key: levels.at(-1)?.pathKey || '__empty__', label: label || '—', levels }
}

function createBucket() {
  return { count: 0, numericCount: 0, sum: 0 }
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
  const num = Number(value)
  if (!Number.isNaN(num)) {
    bucket.numericCount += 1
    bucket.sum += num
  }
}

function finalizeBucket(bucket, aggregator) {
  if (!bucket) return null
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
  records,
  rows,
  columns,
  metrics,
  fieldMeta,
  headerOverrides = {},
}) {
  const fieldMetaMap = normalizeFieldMetaMap(fieldMeta)
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
  const rowLevelMeta = new Map()

  records.forEach((record) => {
    const rowEntry = buildDimensionKey(
      record,
      rows,
      fieldMetaMap,
      headerOverrides,
      rowLevelMeta,
    )
    const columnEntry = buildDimensionKey(record, columns, fieldMetaMap, headerOverrides)
    const rowKey = ensureIndex(rowMap, rowIndex, rowEntry)
    const columnKey = ensureIndex(columnMap, columnIndex, columnEntry)

    metrics.forEach((metric) => {
      const value = record[metric.fieldKey]
      const cellKey = `${rowKey.key}||${columnKey.key}||${metric.id}`
      pushValue(getBucket(cellMap, cellKey), value)
      pushValue(getNestedBucket(rowMetricTotals, rowKey.key, metric.id), value)
      pushValue(getNestedBucket(columnMetricTotals, columnKey.key, metric.id), value)
      pushValue(getBucket(grandMetricTotals, metric.id), value)
      const columnEntryKey = `${columnKey.key}::${metric.id}`
      rowEntry.levels.forEach((level) => {
        pushValue(
          getRowColumnBucket(rowPrefixColumnBuckets, level.pathKey, columnEntryKey),
          value,
        )
        pushValue(getRowMetricBucket(rowPrefixMetricBuckets, level.pathKey, metric.id), value)
      })
    })
  })

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
      const value = finalizeBucket(bucket, column.aggregator)
      return {
        key: cellKey,
        display: formatNumber(value),
        value,
      }
    })
    const totals = metrics.map((metric) => {
      const bucket = getNestedBucket(rowMetricTotals, row.key, metric.id)
      const value = finalizeBucket(bucket, metric.aggregator)
      return {
        metricId: metric.id,
        display: formatNumber(value),
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
    const bucket = getNestedBucket(columnMetricTotals, column.baseKey, column.metricId)
    const value = finalizeBucket(bucket, column.aggregator)
    return {
      ...column,
      totalDisplay: formatNumber(value),
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
    acc[metric.id] = formatNumber(finalizeBucket(bucket, metric.aggregator))
    return acc
  }, {})

  const rowTree = buildRowTree({
    levelMeta: rowLevelMeta,
    columnBuckets: rowPrefixColumnBuckets,
    metricBuckets: rowPrefixMetricBuckets,
    columnEntries,
    metrics,
  })

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
  if (!columnMap.has(columnEntryKey)) columnMap.set(columnEntryKey, createBucket())
  return columnMap.get(columnEntryKey)
}

function getRowMetricBucket(store, levelKey, metricId) {
  if (!store.has(levelKey)) store.set(levelKey, new Map())
  const metricMap = store.get(levelKey)
  if (!metricMap.has(metricId)) metricMap.set(metricId, createBucket())
  return metricMap.get(metricId)
}

function buildRowTree({ levelMeta, columnBuckets, metricBuckets, columnEntries, metrics }) {
  if (!levelMeta.size) return []
  const nodes = new Map()
  const orderedMeta = Array.from(levelMeta.values()).sort((a, b) => a.depth - b.depth)

  const getNode = (meta) => {
    if (nodes.has(meta.pathKey)) return nodes.get(meta.pathKey)
    const columnMap = columnBuckets.get(meta.pathKey) || new Map()
    const metricMap = metricBuckets.get(meta.pathKey) || new Map()
    const cells = columnEntries.map((column) => {
      const bucket = columnMap.get(column.key)
      const value = finalizeBucket(bucket, column.aggregator)
      return {
        key: `${meta.pathKey}||${column.key}`,
        display: formatNumber(value),
        value,
      }
    })
    const totals = metrics.map((metric) => {
      const bucket = metricMap.get(metric.id)
      const value = finalizeBucket(bucket, metric.aggregator)
      return {
        metricId: metric.id,
        display: formatNumber(value),
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

  return orderedMeta.filter((meta) => !meta.parentKey).map((meta) => nodes.get(meta.pathKey))
}
