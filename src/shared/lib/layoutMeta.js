const LAYOUT_MARKER = /<!--layout-config:(.*)-->/s
const CONTAINER_TAB_MARKER = /<!--layout-containers:(.*)-->/s
const TAB_MARKER = /\s*\[\[tab:(\d+)\]\]\s*$/

const DEFAULT_SETTINGS = { columns: 1, tabs: 1, tabNames: ['Вкладка 1'] }
const MAX_COLUMNS = 6
const MAX_TABS = 12

function sanitizeSettings(raw = {}) {
  const columns = Number.isFinite(Number(raw.columns)) ? Number(raw.columns) : DEFAULT_SETTINGS.columns
  const tabs = Number.isFinite(Number(raw.tabs)) ? Number(raw.tabs) : DEFAULT_SETTINGS.tabs
  const sanitizedColumns = clampColumns(columns)
  const sanitizedTabs = clampTabs(tabs)
  const tabNames = sanitizeTabNames(raw.tabNames, sanitizedTabs)
  return {
    columns: sanitizedColumns,
    tabs: sanitizedTabs,
    tabNames,
  }
}

function clampColumns(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return MAX_COLUMNS
  return Math.max(1, Math.min(MAX_COLUMNS, Math.trunc(numeric)))
}

function clampTabs(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return MAX_TABS
  return Math.max(1, Math.min(MAX_TABS, Math.trunc(numeric)))
}

function sanitizeTabNames(rawNames = [], tabs = DEFAULT_SETTINGS.tabs) {
  const list = Array.isArray(rawNames) ? rawNames : []
  return Array.from({ length: clampTabs(tabs) }, (_, index) => {
    const label = list[index]
    if (typeof label === 'string' && label.trim()) {
      return label.trim()
    }
    return `Вкладка ${index + 1}`
  })
}

function sanitizeContainerTabs(raw = {}) {
  if (!raw || typeof raw !== 'object') return {}
  const result = {}
  Object.entries(raw).forEach(([key, value]) => {
    if (!key) return
    const numeric = clampTabs(Number(value) || 1)
    result[String(key)] = numeric
  })
  return result
}

export function extractLayoutMeta(description = '') {
  if (!description) {
    return {
      text: '',
      settings: defaultLayoutSettings(),
      containerTabs: {},
      metaFlags: {
        hasSettingsMarker: false,
        hasContainerMarker: false,
      },
    }
  }
  let working = description
  let containerTabs = {}
  let hasContainerMarker = false
  const containerMatch = working.match(CONTAINER_TAB_MARKER)
  if (containerMatch) {
    hasContainerMarker = true
    try {
      containerTabs = sanitizeContainerTabs(JSON.parse(containerMatch[1]))
    } catch {
      containerTabs = {}
    }
    working = working.replace(CONTAINER_TAB_MARKER, '').trimEnd()
  }
  const layoutMatch = working.match(LAYOUT_MARKER)
  let settings = defaultLayoutSettings()
  let hasSettingsMarker = false
  if (layoutMatch) {
    hasSettingsMarker = true
    let parsed = null
    try {
      parsed = JSON.parse(layoutMatch[1])
    } catch {
      parsed = null
    }
    settings = sanitizeSettings(parsed || DEFAULT_SETTINGS)
    working = working.replace(LAYOUT_MARKER, '').trimEnd()
  } else {
    settings = defaultLayoutSettings()
  }
  return {
    text: working,
    settings,
    containerTabs,
    metaFlags: {
      hasSettingsMarker,
      hasContainerMarker,
    },
  }
}

export function extractLayoutSettings(description = '') {
  const meta = extractLayoutMeta(description)
  return {
    text: meta.text,
    settings: meta.settings,
  }
}

export function injectLayoutSettings(text = '', settings = DEFAULT_SETTINGS) {
  return injectLayoutMeta(text, settings, {})
}

export function injectLayoutMeta(text = '', settings = DEFAULT_SETTINGS, containerTabs = {}) {
  const sanitized = sanitizeSettings(settings)
  const sanitizedTabs = sanitizeContainerTabs(containerTabs)
  let cleanedText = text || ''
  cleanedText = cleanedText.replace(LAYOUT_MARKER, '').replace(CONTAINER_TAB_MARKER, '').trimEnd()
  const markers = []
  markers.push(`<!--layout-config:${JSON.stringify(sanitized)}-->`)
  if (Object.keys(sanitizedTabs).length) {
    markers.push(`<!--layout-containers:${JSON.stringify(sanitizedTabs)}-->`)
  }
  const suffix = markers.join('\n')
  if (!cleanedText) {
    return suffix
  }
  return `${cleanedText}\n\n${suffix}`
}

export function parseContainerTitle(title = '') {
  if (!title) {
    return { title: '', tabIndex: 1 }
  }
  const match = title.match(TAB_MARKER)
  if (!match) {
    return { title, tabIndex: 1 }
  }
  const tabIndex = Math.max(1, Number(match[1]) || 1)
  const cleaned = title.replace(TAB_MARKER, '').trimEnd()
  return { title: cleaned, tabIndex }
}

export function formatContainerTitle(title = '', tabIndex = 1) {
  const normalizedTitle = title?.trim() || 'Контейнер'
  const normalizedTab = Math.max(1, Math.trunc(tabIndex) || 1)
  return `${normalizedTitle} [[tab:${normalizedTab}]]`
}

export function defaultLayoutSettings() {
  return sanitizeSettings(DEFAULT_SETTINGS)
}

export function sanitizeContainerTabMap(map = {}) {
  return sanitizeContainerTabs(map)
}
