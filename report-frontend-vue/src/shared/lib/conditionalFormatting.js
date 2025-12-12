const SUPPORTED_TYPES = ['none', 'dataBar', 'colorScale', 'iconSet']
const DEFAULT_DATA_BAR_COLOR = '#60a5fa'
const DEFAULT_MIN_COLOR = '#ef4444'
const DEFAULT_MID_COLOR = '#facc15'
const DEFAULT_MAX_COLOR = '#22c55e'
const DEFAULT_ICON_STYLE = 'arrows'
const DEFAULT_THRESHOLDS = [0.33, 0.66]

export const ICON_SET_LIBRARY = {
  arrows: {
    label: 'Стрелки',
    icons: ['▼', '▶', '▲'],
    colors: ['#dc2626', '#f59e0b', '#16a34a'],
  },
  traffic: {
    label: 'Светофор',
    icons: ['●', '●', '●'],
    colors: ['#dc2626', '#facc15', '#16a34a'],
  },
  trend: {
    label: 'Тренд',
    icons: ['✖', '➜', '✔'],
    colors: ['#dc2626', '#f97316', '#22c55e'],
  },
}

export function normalizeConditionalFormatting(config = {}) {
  const type = SUPPORTED_TYPES.includes(config?.type) ? config.type : 'none'
  return {
    type,
    dataBar: normalizeDataBar(config?.dataBar),
    colorScale: normalizeColorScale(config?.colorScale),
    iconSet: normalizeIconSet(config?.iconSet),
  }
}

export function applyConditionalFormattingToView(view, metrics = []) {
  if (!view) return view
  clearFormatting(view)
  const metricConfigs = new Map()
  metrics.forEach((metric) => {
    const normalized = normalizeConditionalFormatting(metric?.conditionalFormatting)
    if (normalized.type !== 'none') {
      metricConfigs.set(metric.id, normalized)
    }
  })
  if (!metricConfigs.size) return view

  const valueStore = new Map()
  const ensureStore = (metricId) => {
    if (!valueStore.has(metricId)) valueStore.set(metricId, [])
    return valueStore.get(metricId)
  }
  const registerValue = (metricId, rawValue) => {
    if (!metricConfigs.has(metricId)) return
    const numeric = Number(rawValue)
    if (!Number.isFinite(numeric)) return
    ensureStore(metricId).push(numeric)
  }
  const columnMetricIds = (view.columns || []).map((column) => column.metricId)
  const registerCells = (cells = []) =>
    cells.forEach((cell, index) => {
      const metricId = columnMetricIds[index]
      if (metricId) registerValue(metricId, cell?.value)
    })

  ;(view.rows || []).forEach((row) => {
    registerCells(row.cells || [])
    ;(row.totals || []).forEach((total) =>
      registerValue(total.metricId, total.value),
    )
  })
  traverseRowTree(view.rowTree, (node) => {
    registerCells(node.cells || [])
    ;(node.totals || []).forEach((total) =>
      registerValue(total.metricId, total.value),
    )
  })
  ;(view.columns || []).forEach((column) =>
    registerValue(column.metricId, column.value),
  )
  Object.entries(view.grandTotals || {}).forEach(([metricId, entry]) =>
    registerValue(metricId, entry?.value),
  )

  const statsMap = new Map()
  valueStore.forEach((values, metricId) => {
    if (!values.length) return
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((acc, value) => acc + value, 0) / values.length
    statsMap.set(metricId, { min, max, avg })
  })
  if (!statsMap.size) return view

  const applyCellFormatting = (cell, metricId) => {
    if (!metricConfigs.has(metricId)) return
    const formatting = buildFormattingDescriptor(
      metricConfigs.get(metricId),
      statsMap.get(metricId),
      cell?.value,
    )
    if (formatting) {
      cell.formatting = formatting
    }
  }

  ;(view.rows || []).forEach((row) => {
    ;(row.cells || []).forEach((cell, index) => {
      const metricId = columnMetricIds[index]
      if (metricId) applyCellFormatting(cell, metricId)
    })
    ;(row.totals || []).forEach((total) =>
      applyCellFormatting(total, total.metricId),
    )
  })
  traverseRowTree(view.rowTree, (node) => {
    ;(node.cells || []).forEach((cell, index) => {
      const metricId = columnMetricIds[index]
      if (metricId) applyCellFormatting(cell, metricId)
    })
    ;(node.totals || []).forEach((total) =>
      applyCellFormatting(total, total.metricId),
    )
  })
  ;(view.columns || []).forEach((column) => {
    const formatting = buildFormattingDescriptor(
      metricConfigs.get(column.metricId),
      statsMap.get(column.metricId),
      column.value,
    )
    if (formatting) {
      column.totalFormatting = formatting
    }
  })
  Object.entries(view.grandTotals || {}).forEach(([metricId, entry]) => {
    const formatting = buildFormattingDescriptor(
      metricConfigs.get(metricId),
      statsMap.get(metricId),
      entry?.value,
    )
    if (formatting) {
      entry.formatting = formatting
    }
  })
  return view
}

function normalizeDataBar(config = {}) {
  return {
    color: normalizeColor(config?.color, DEFAULT_DATA_BAR_COLOR),
    showValue: config?.showValue !== false,
  }
}

function normalizeColorScale(config = {}) {
  const midpoint =
    typeof config?.midpoint === 'number' ? clamp(config.midpoint, 0, 1) : 0.5
  return {
    minColor: normalizeColor(config?.minColor, DEFAULT_MIN_COLOR),
    midColor: normalizeColor(config?.midColor, DEFAULT_MID_COLOR),
    maxColor: normalizeColor(config?.maxColor, DEFAULT_MAX_COLOR),
    midpoint,
  }
}

function normalizeIconSet(config = {}) {
  const style = ICON_SET_LIBRARY[config?.style] ? config.style : DEFAULT_ICON_STYLE
  const thresholds = normalizeThresholds(config?.thresholds)
  return {
    style,
    thresholds,
    reversed: config?.reversed === true,
  }
}

function normalizeThresholds(list) {
  if (!Array.isArray(list) || list.length < 2) {
    return [...DEFAULT_THRESHOLDS]
  }
  const [first, second] = list
  const a = clamp(Number(first), 0.05, 0.95)
  const b = clamp(Number(second), 0.1, 0.99)
  const sorted = [a, b].sort((left, right) => left - right)
  const distinct = sorted[0] === sorted[1] ? [sorted[0], sorted[1] + 0.05] : sorted
  return distinct.map((value) => clamp(value, 0.05, 0.95))
}

function normalizeColor(value, fallback) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return trimmed
  }
  return fallback
}

function clamp(value, min, max) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return min
  return Math.min(Math.max(numeric, min), max)
}

function clearFormatting(view) {
  if (!view) return
  const clearRowSet = (rows = []) =>
    rows.forEach((row) => {
      ;(row.cells || []).forEach((cell) => delete cell.formatting)
      ;(row.totals || []).forEach((total) => delete total.formatting)
    })
  clearRowSet(view.rows || [])
  traverseRowTree(view.rowTree, (node) => {
    ;(node.cells || []).forEach((cell) => delete cell.formatting)
    ;(node.totals || []).forEach((total) => delete total.formatting)
  })
  ;(view.columns || []).forEach((column) => delete column.totalFormatting)
  Object.values(view.grandTotals || {}).forEach((entry) => {
    if (entry && typeof entry === 'object') delete entry.formatting
  })
}

function traverseRowTree(nodes, visit) {
  if (!Array.isArray(nodes) || !nodes.length) return
  nodes.forEach((node) => {
    if (typeof visit === 'function') visit(node)
    if (Array.isArray(node.children) && node.children.length) {
      traverseRowTree(node.children, visit)
    }
  })
}

function buildFormattingDescriptor(config, stats, rawValue) {
  if (!config || !stats) return null
  const numeric = Number(rawValue)
  if (!Number.isFinite(numeric)) return null
  const ratio =
    stats.max === stats.min
      ? 1
      : (numeric - stats.min) / (stats.max - stats.min || 1)
  const normalized = clamp(ratio, 0, 1)
  if (config.type === 'dataBar') {
    return buildDataBarDescriptor(config.dataBar, normalized)
  }
  if (config.type === 'colorScale') {
    return buildColorScaleDescriptor(config.colorScale, normalized)
  }
  if (config.type === 'iconSet') {
    return buildIconDescriptor(config.iconSet, normalized)
  }
  return null
}

function buildDataBarDescriptor(config, ratio) {
  return {
    type: 'dataBar',
    percent: ratio,
    barColor: config?.color || DEFAULT_DATA_BAR_COLOR,
    showValue: config?.showValue !== false,
  }
}

function buildColorScaleDescriptor(config, ratio) {
  const midpoint = config?.midpoint ?? 0.5
  const base =
    ratio <= midpoint
      ? mixColors(config?.minColor, config?.midColor, midpoint ? ratio / midpoint : 0)
      : mixColors(
          config?.midColor,
          config?.maxColor,
          midpoint === 1 ? 1 : (ratio - midpoint) / (1 - midpoint || 1),
        )
  return {
    type: 'colorScale',
    backgroundColor: base,
    textColor: pickTextColor(base),
  }
}

function buildIconDescriptor(config, ratio) {
  const library = ICON_SET_LIBRARY[config?.style] || ICON_SET_LIBRARY[DEFAULT_ICON_STYLE]
  const thresholds = Array.isArray(config?.thresholds)
    ? config.thresholds
    : DEFAULT_THRESHOLDS
  let index = 0
  if (ratio >= thresholds[1]) index = 2
  else if (ratio >= thresholds[0]) index = 1
  if (config?.reversed) {
    index = 2 - index
  }
  return {
    type: 'iconSet',
    icon: library.icons[index],
    iconColor: library.colors[index],
  }
}

function mixColors(start, end, ratio) {
  const startRgb = hexToRgb(start || DEFAULT_MIN_COLOR)
  const endRgb = hexToRgb(end || DEFAULT_MAX_COLOR)
  const percent = clamp(Number(ratio), 0, 1)
  const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * percent)
  const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * percent)
  const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * percent)
  return rgbToHex(r, g, b)
}

function hexToRgb(color) {
  const normalized = normalizeColor(color, DEFAULT_MIN_COLOR).slice(1)
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split('').map((char) => parseInt(char.repeat(2), 16))
    return { r, g, b }
  }
  const intVal = parseInt(normalized, 16)
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  }
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`
}

function pickTextColor(color) {
  const { r, g, b } = hexToRgb(color)
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luma > 150 ? '#111827' : '#f8fafc'
}
