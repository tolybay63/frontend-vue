const SUPPORTED_TYPES = ['none', 'dataBar', 'colorScale', 'iconSet']
const DEFAULT_DATA_BAR_COLOR = '#60a5fa'
const DEFAULT_MIN_COLOR = '#ef4444'
const DEFAULT_MID_COLOR = '#facc15'
const DEFAULT_MAX_COLOR = '#22c55e'
const DEFAULT_ICON_STYLE = 'arrows'
const DEFAULT_THRESHOLDS_3 = [0.33, 0.66]
const DEFAULT_THRESHOLDS_4 = [0.25, 0.5, 0.75]
const DEFAULT_SCALE_MODE = 'relative'

export const ICON_SET_LIBRARY = {
  arrows: {
    label: 'Стрелки',
    icons: ['▼', '▶', '▲'],
    colors: ['#dc2626', '#f59e0b', '#16a34a'],
  },
  arrows4: {
    label: 'Стрелки (4)',
    icons: ['▼', '▾', '▴', '▲'],
    colors: ['#dc2626', '#f97316', '#facc15', '#16a34a'],
  },
  traffic: {
    label: 'Светофор',
    icons: ['●', '●', '●'],
    colors: ['#dc2626', '#facc15', '#16a34a'],
  },
  traffic4: {
    label: 'Светофор (4)',
    icons: ['●', '●', '●', '●'],
    colors: ['#dc2626', '#f97316', '#facc15', '#16a34a'],
  },
  trend: {
    label: 'Тренд',
    icons: ['✖', '➜', '✔'],
    colors: ['#dc2626', '#f97316', '#22c55e'],
  },
  trend4: {
    label: 'Тренд (4)',
    icons: ['✖', '➜', '➜', '✔'],
    colors: ['#dc2626', '#f97316', '#facc15', '#22c55e'],
  },
}

export function normalizeConditionalFormatting(config = {}) {
  const type = SUPPORTED_TYPES.includes(config?.type) ? config.type : 'none'
  const scale = normalizeScale(config?.scale)
  return {
    type,
    scale,
    dataBar: normalizeDataBar(config?.dataBar),
    colorScale: normalizeColorScale(config?.colorScale),
    iconSet: normalizeIconSet(config?.iconSet, scale),
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
  const midValue = toFiniteNumber(config?.midValue)
  return {
    minColor: normalizeColor(config?.minColor, DEFAULT_MIN_COLOR),
    midColor: normalizeColor(config?.midColor, DEFAULT_MID_COLOR),
    maxColor: normalizeColor(config?.maxColor, DEFAULT_MAX_COLOR),
    midpoint,
    midValue,
  }
}

function normalizeIconSet(config = {}, scale = {}) {
  const style = ICON_SET_LIBRARY[config?.style] ? config.style : DEFAULT_ICON_STYLE
  const thresholds = normalizeThresholds(config?.thresholds, scale?.mode)
  return {
    style,
    thresholds,
    reversed: config?.reversed === true,
  }
}

function normalizeThresholds(list, mode = DEFAULT_SCALE_MODE) {
  if (!Array.isArray(list)) return []
  const numeric = list.map((value) => Number(value)).filter((value) =>
    Number.isFinite(value),
  )
  if (!numeric.length) return []
  const sorted = numeric.sort((left, right) => left - right)
  if (mode !== 'absolute') {
    return sorted.map((value) => clamp(value, 0.05, 0.95))
  }
  return sorted
}

function normalizeColor(value, fallback) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    return trimmed
  }
  return fallback
}

function clamp(value, min, max) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return min
  return Math.min(Math.max(numeric, min), max)
}

function toFiniteNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function normalizeScale(config = {}) {
  const mode = config?.mode === 'absolute' ? 'absolute' : DEFAULT_SCALE_MODE
  const min = toFiniteNumber(config?.min)
  const max = toFiniteNumber(config?.max)
  return { mode, min, max }
}

function resolveScaleBounds(scale = {}, stats = {}) {
  const mode = scale?.mode === 'absolute' ? 'absolute' : DEFAULT_SCALE_MODE
  const min = Number.isFinite(scale?.min) ? Number(scale.min) : stats?.min
  const max = Number.isFinite(scale?.max) ? Number(scale.max) : stats?.max
  return { mode, min, max }
}

function defaultThresholdsForLevels(count) {
  if (count >= 3) return [...DEFAULT_THRESHOLDS_4]
  return [...DEFAULT_THRESHOLDS_3]
}

function mapThresholdsToAbsolute(relative = [], scale = {}) {
  if (!Number.isFinite(scale?.min) || !Number.isFinite(scale?.max)) {
    return relative
  }
  const span = scale.max - scale.min || 1
  return relative.map((value) => scale.min + value * span)
}

function getIconSetLevels(style) {
  const library = ICON_SET_LIBRARY[style] || ICON_SET_LIBRARY[DEFAULT_ICON_STYLE]
  const levels = Array.isArray(library?.icons) ? library.icons.length : 3
  return Math.max(3, levels)
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
  const scale = resolveScaleBounds(config.scale, stats)
  const span = Number(scale?.max) - Number(scale?.min)
  const ratio =
    Number.isFinite(span) && span !== 0
      ? (numeric - scale.min) / span
      : stats.max === stats.min
        ? 1
        : (numeric - stats.min) / (stats.max - stats.min || 1)
  const normalized = clamp(ratio, 0, 1)
  if (config.type === 'dataBar') {
    return buildDataBarDescriptor(config.dataBar, normalized)
  }
  if (config.type === 'colorScale') {
    return buildColorScaleDescriptor(
      config.colorScale,
      normalized,
      scale,
    )
  }
  if (config.type === 'iconSet') {
    return buildIconDescriptor(config.iconSet, normalized, numeric, scale)
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

function buildColorScaleDescriptor(config, ratio, scale = {}) {
  let midpoint = config?.midpoint ?? 0.5
  if (
    scale?.mode === 'absolute' &&
    Number.isFinite(config?.midValue) &&
    Number.isFinite(scale?.min) &&
    Number.isFinite(scale?.max) &&
    scale.max !== scale.min
  ) {
    midpoint = clamp(
      (Number(config.midValue) - scale.min) / (scale.max - scale.min),
      0,
      1,
    )
  }
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

function buildIconDescriptor(config, ratio, value, scale = {}) {
  const library =
    ICON_SET_LIBRARY[config?.style] || ICON_SET_LIBRARY[DEFAULT_ICON_STYLE]
  const levelCount = getIconSetLevels(config?.style)
  const neededThresholds = Math.max(levelCount - 1, 1)
  let thresholds = Array.isArray(config?.thresholds)
    ? config.thresholds.filter((item) => Number.isFinite(item))
    : []
  if (thresholds.length < neededThresholds) {
    const defaults = defaultThresholdsForLevels(neededThresholds)
    if (scale?.mode === 'absolute') {
      thresholds = mapThresholdsToAbsolute(defaults, scale)
    } else {
      thresholds = defaults
    }
  }
  thresholds = thresholds.slice(0, neededThresholds).sort((a, b) => a - b)
  if (
    scale?.mode === 'absolute' &&
    thresholds.length === neededThresholds &&
    thresholds.every((item) => item >= 0 && item <= 1) &&
    Number.isFinite(scale?.min) &&
    Number.isFinite(scale?.max) &&
    Math.abs(scale.max - scale.min) > 1
  ) {
    thresholds = mapThresholdsToAbsolute(thresholds, scale)
  }
  let index = 0
  if (scale?.mode === 'absolute') {
    thresholds.forEach((threshold) => {
      if (value >= threshold) index += 1
    })
  } else {
    thresholds.forEach((threshold) => {
      if (ratio >= threshold) index += 1
    })
  }
  if (config?.reversed) {
    index = levelCount - 1 - index
  }
  const safeIndex = Math.min(Math.max(index, 0), library.icons.length - 1)
  return {
    type: 'iconSet',
    icon: library.icons[safeIndex],
    iconColor: library.colors[safeIndex],
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
  let normalized = normalizeColor(color, DEFAULT_MIN_COLOR).slice(1)
  if (normalized.length === 3 || normalized.length === 4) {
    const chars = normalized.split('')
    const r = parseInt(chars[0] + chars[0], 16)
    const g = parseInt(chars[1] + chars[1], 16)
    const b = parseInt(chars[2] + chars[2], 16)
    return { r, g, b }
  }
  if (normalized.length === 8) {
    normalized = normalized.slice(0, 6)
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
