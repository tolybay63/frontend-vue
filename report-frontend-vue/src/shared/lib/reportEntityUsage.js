function toNumericId(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function toStableId(value) {
  if (value === null || typeof value === 'undefined') return ''
  const str = String(value).trim()
  return str
}

function createLocalId(prefix = 'entity') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function normalizeSource(entry = {}, index = 0) {
  const remoteId = toNumericId(entry?.id ?? entry?.Id ?? entry?.ID)
  return {
    id: remoteId ? String(remoteId) : createLocalId(`source-${index}`),
    remoteId,
    name: entry?.name || entry?.Name || entry?.title || `Источник ${index + 1}`,
    description: entry?.description || entry?.Description || '',
    remoteMeta: entry || {},
  }
}

export function normalizeConfig(entry = {}, index = 0) {
  const remoteId = toNumericId(entry?.id ?? entry?.Id ?? entry?.ID)
  const parentId = toNumericId(entry?.parent ?? entry?.parentId ?? entry?.Parent)
  return {
    id: remoteId ? String(remoteId) : createLocalId(`config-${index}`),
    remoteId,
    parentId,
    name: entry?.name || entry?.Name || `Конфигурация ${index + 1}`,
    remoteMeta: entry || {},
  }
}

export function normalizePresentation(entry = {}, index = 0) {
  const remoteId = toNumericId(entry?.id ?? entry?.Id ?? entry?.ID)
  const parentId = toNumericId(entry?.parent ?? entry?.parentId ?? entry?.Parent)
  return {
    id: remoteId ? String(remoteId) : createLocalId(`presentation-${index}`),
    remoteId,
    parentId,
    name: entry?.name || entry?.Name || `Представление ${index + 1}`,
    remoteMeta: entry || {},
  }
}

export function buildUsageMaps(configs = [], presentations = []) {
  const configById = new Map()
  configs.forEach((cfg) => {
    const key = toStableId(cfg.remoteId ?? cfg.id)
    if (key) configById.set(key, cfg)
  })

  const usageByConfig = new Map()
  presentations.forEach((view) => {
    const key = toStableId(view.parentId)
    if (!key) return
    usageByConfig.set(key, (usageByConfig.get(key) || 0) + 1)
  })

  const usageBySource = new Map()
  presentations.forEach((view) => {
    const configKey = toStableId(view.parentId)
    if (!configKey) return
    const config = configById.get(configKey)
    const sourceKey = toStableId(config?.parentId)
    if (!sourceKey) return
    usageBySource.set(sourceKey, (usageBySource.get(sourceKey) || 0) + 1)
  })

  return { usageByConfig, usageBySource, configById }
}

export function stableEntityId(entity) {
  return toStableId(entity?.remoteId ?? entity?.id)
}

export function stableParentId(entity) {
  return toStableId(entity?.parentId)
}

export function toStableIdList(list = []) {
  return list.map((item) => toStableId(item)).filter(Boolean)
}
