import { defineStore } from 'pinia'
import { DEFAULT_PLAN_PAYLOAD } from '@/shared/api/plan'
import { DEFAULT_PARAMETER_PAYLOAD } from '@/shared/api/parameter'
import { callReportMethod } from '@/shared/api/report'
import { fetchMethodTypeRecords } from '@/shared/api/objects'
import { fetchCurrentUserRecord, fetchPersonnelInfo } from '@/shared/api/user'
import {
  normalizeJoinList,
  parseJoinConfig,
  serializeJoinConfig,
  extractJoinsFromBody,
  stripJoinPresentationFields,
} from '@/shared/lib/sourceJoins'

const STORAGE_KEY = 'report-data-sources'
const USER_CONTEXT_KEY = 'report-user-context'

const defaultSources = [
  {
    id: 'source-plans',
    name: 'Планы (loadPlan)',
    description: 'Загрузка планов из /dtj/api/plan',
    url: '/dtj/api/plan',
    httpMethod: 'POST',
    rawBody: JSON.stringify(
      {
        method: 'data/loadPlan',
        params: [DEFAULT_PLAN_PAYLOAD],
      },
      null,
      2,
    ),
    headers: { 'Content-Type': 'application/json' },
    supportsPivot: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    joins: [],
  },
  {
    id: 'source-parameters',
    name: 'Параметры (loadParameterLog)',
    description: 'Параметры инспекций из /dtj/api/inspections',
    url: '/dtj/api/inspections',
    httpMethod: 'POST',
    rawBody: JSON.stringify(
      {
        method: 'data/loadParameterLog',
        params: [DEFAULT_PARAMETER_PAYLOAD],
      },
      null,
      2,
    ),
    headers: { 'Content-Type': 'application/json' },
    supportsPivot: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    joins: [],
  },
]

function loadSources() {
  if (typeof window === 'undefined') {
    return structuredClone(defaultSources).map(applyJoinDefaults)
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length)
        return parsed.map(applyJoinDefaults)
    }
  } catch (err) {
    console.warn('Failed to load data sources', err)
  }
  return structuredClone(defaultSources).map(applyJoinDefaults)
}

function persistSources(list) {
  if (typeof window === 'undefined') return
  const normalized = Array.isArray(list) ? list.map(applyJoinDefaults) : []
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
}

function loadUserContext() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(USER_CONTEXT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (hasValidUserContext(parsed)) return parsed
    }
  } catch (err) {
    console.warn('Failed to load user context', err)
  }
  return null
}

function persistUserContext(context) {
  if (typeof window === 'undefined') return
  if (!context || context.__fallback) {
    window.localStorage.removeItem(USER_CONTEXT_KEY)
    return
  }
  window.localStorage.setItem(USER_CONTEXT_KEY, JSON.stringify(context))
}

function loadExternalUserContext() {
  if (typeof window === 'undefined') return null
  try {
    const curRaw = window.localStorage.getItem('curUser')
    const personRaw = window.localStorage.getItem('personnalInfo')
    const curParsed = parseMaybeJson(curRaw)
    const personParsed = parseMaybeJson(personRaw)
    const currentUser = curParsed?.result || curParsed
    const personnel = extractPersonRecord(personParsed)
    const context = buildUserContext(currentUser, personnel)
    return hasValidUserContext(context) ? context : null
  } catch (err) {
    console.warn('Failed to parse external user context', err)
    return null
  }
}

function parseMaybeJson(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function extractPersonRecord(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (Array.isArray(payload)) return payload[0]
  if (Array.isArray(payload.result?.records)) return payload.result.records[0]
  if (Array.isArray(payload.records)) return payload.records[0]
  if (payload.result) return payload.result
  return payload
}

function createId(prefix = 'source') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useDataSourcesStore = defineStore('dataSources', {
  state: () => ({
    sources: loadSources(),
    loadedFromRemote: false,
    loadingRemote: false,
    methodTypes: [],
    methodTypesLoaded: false,
    methodTypesLoading: false,
    userContext: loadUserContext(),
    userLoading: false,
  }),
  getters: {
    getById: (state) => (id) =>
      state.sources.find((source) => source.id === id),
  },
  actions: {
    async saveSource(payload) {
      const base = structuredClone(payload)
      base.id = base.id || createId()
      base.name = base.name?.trim() || 'Без названия'
      base.url = base.url?.trim() || ''
      base.httpMethod = base.httpMethod?.toUpperCase?.() || 'POST'
      base.rawBody = base.rawBody || ''
      base.headers = base.headers || { 'Content-Type': 'application/json' }
      const index = this.sources.findIndex((item) => item.id === base.id)
      const existing = index >= 0 ? this.sources[index] : null
      base.supportsPivot = payload.supportsPivot !== false
      base.updatedAt = new Date().toISOString()
      base.joins = normalizeJoinList(base.joins || existing?.joins || [])
      if (!base.createdAt) {
        base.createdAt = base.updatedAt
      }

      base.remoteMeta = base.remoteMeta || existing?.remoteMeta || {}
      if (index >= 0) {
        this.sources.splice(index, 1, base)
      } else {
        this.sources.push(base)
      }
      persistSources(this.sources)

      const syncPromise = this.saveRemoteRecord(base)
        .then((nextId) => {
          persistSources(this.sources)
          return nextId || base.id
        })
        .catch((err) => {
          console.warn('Failed to sync data source', err)
          return base.id
        })

      return { id: base.id, syncPromise }
    },
    removeSource(sourceId) {
      const index = this.sources.findIndex((item) => item.id === sourceId)
      if (index === -1) return
      this.sources.splice(index, 1)
      persistSources(this.sources)
    },
    async fetchRemoteSources() {
      if (this.loadingRemote || this.loadedFromRemote) return
      this.loadingRemote = true
      try {
        const data = await callReportMethod('report/loadReportSource', [0])
        const records = extractRecords(data)
        if (!records.length) return
        const mapped = records.map((entry, index) =>
          normalizeRemoteSource(entry, index),
        )
        const normalized = mapped.map(applyJoinDefaults)
        if (normalized.length) {
          this.sources = normalized
          this.loadedFromRemote = true
          persistSources(this.sources)
        }
      } catch (err) {
        console.warn('Failed to fetch remote data sources', err)
      } finally {
        this.loadingRemote = false
      }
    },
    async fetchMethodTypes() {
      if (this.methodTypesLoading || this.methodTypesLoaded) return
      this.methodTypesLoading = true
      try {
        const records = await fetchMethodTypeRecords()
        if (records.length) {
          this.methodTypes = records
            .map(normalizeMethodTypeRecord)
            .filter((item) => item.name && item.code)
          this.methodTypesLoaded = this.methodTypes.length > 0
        }
      } catch (err) {
        console.warn('Failed to fetch method types', err)
      } finally {
        this.methodTypesLoading = false
      }
    },
    async fetchUserContext(force = false) {
      if (!force && hasValidUserContext(this.userContext)) {
        return this.userContext
      }
      if (!force) {
        const external = loadExternalUserContext()
        if (external) {
          this.userContext = external
          persistUserContext(external)
          return this.userContext
        }
      }
      if (this._userContextPromise && !force) {
        await this._userContextPromise
        return this.userContext
      }
      this.userLoading = true
      const runner = async () => {
        try {
          const currentUser = await fetchCurrentUserRecord()
          const personnelId =
            toNumericId(currentUser?.personId) ||
            toNumericId(currentUser?.idPerson) ||
            toNumericId(currentUser?.objUser) ||
            toNumericId(currentUser?.id) ||
            null
          let personnelInfo = null
          if (personnelId) {
            personnelInfo = await fetchPersonnelInfo(personnelId)
          }
          this.userContext = buildUserContext(currentUser, personnelInfo)
          if (!hasValidUserContext(this.userContext)) {
            const external = loadExternalUserContext()
            if (external) this.userContext = external
          }
          persistUserContext(
            hasValidUserContext(this.userContext) ? this.userContext : null,
          )
        } catch (err) {
          console.warn('Failed to fetch user context', err)
          if (!this.userContext) {
            this.userContext = null
          }
          persistUserContext(this.userContext)
        } finally {
          this.userLoading = false
        }
      }
      if (force) {
        await runner()
        return this.userContext
      }
      this._userContextPromise = runner()
      try {
        await this._userContextPromise
      } finally {
        this._userContextPromise = null
      }
      return this.userContext
    },
    async saveRemoteRecord(source) {
      const fallbackUserContext = loadExternalUserContext()
      const userContext = fallbackUserContext || (await this.fetchUserContext())
      const payload = buildRemotePayload(source, this.methodTypes, userContext)
      if (!payload) return source.id
      const numericId = toNumericId(source.remoteMeta?.id || source.id)
      const operation = numericId ? 'upd' : 'ins'
      const data = await callReportMethod('report/saveReportSource', [
        operation,
        payload,
      ])
      const saved = extractRecords(data)[0]
      if (saved) {
        source.remoteMeta = buildRemoteMeta(saved)
        if (saved.id) {
          source.id = String(saved.id)
        }
        return source.id
      }
      return source.id
    },
  },
})

function extractRecords(payload) {
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.result?.records)) return payload.result.records
  if (Array.isArray(payload.result)) return payload.result
  if (Array.isArray(payload.records)) return payload.records
  return []
}

function normalizeRemoteSource(entry = {}, index = 0) {
  const id = entry.id ? String(entry.id) : createId(`remote-${index}`)
  const name =
    entry.name || entry.title || entry.Name || `Источник ${index + 1}`
  const url = entry.url || entry.URL || entry.requestUrl || '/dtj/api/plan'
  const httpMethod =
    entry.nameMethodTyp?.toUpperCase?.() ||
    entry.method?.toUpperCase?.() ||
    entry.Method?.toUpperCase?.() ||
    'POST'
  const baseBody =
    entry.body ||
    entry.payload ||
    entry.requestBody ||
    entry.rawBody ||
    entry.MethodBody
  const { cleanedBody, joins: bodyJoins } = extractJoinsFromBody(baseBody)
  const rawBody = cleanedBody || toRawBody(baseBody)
  const headers = entry.headers ||
    entry.Headers || { 'Content-Type': 'application/json' }
  return {
    id,
    name,
    description: entry.description || '',
    url,
    httpMethod,
    rawBody,
    headers,
    supportsPivot: entry.supportsPivot !== false,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
    remoteMeta: buildRemoteMeta(entry),
    joins:
      bodyJoins.length
        ? bodyJoins
        : parseJoinConfig(entry.joinConfig || entry.JoinConfig),
  }
}

function normalizeMethodTypeRecord(entry = {}) {
  const rawName = entry.name?.trim() || ''
  const code = rawName ? rawName.toUpperCase() : ''
  return {
    id: entry.id ?? null,
    pv: entry.pv ?? null,
    factor: entry.factor ?? null,
    name: rawName,
    code,
  }
}

function toRawBody(body) {
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

function buildRemoteMeta(entry = {}) {
  if (!entry) return {}
  return {
    id: entry.id,
    cls: entry.cls,
    idMethod: entry.idMethod,
    Method: entry.Method,
    idMethodTyp: entry.idMethodTyp,
    fvMethodTyp: entry.fvMethodTyp,
    pvMethodTyp: entry.pvMethodTyp,
    nameMethodTyp: entry.nameMethodTyp,
    idMethodBody: entry.idMethodBody,
    MethodBody: entry.MethodBody,
    idCreatedAt: entry.idCreatedAt,
    CreatedAt: entry.CreatedAt,
    idUpdatedAt: entry.idUpdatedAt,
    UpdatedAt: entry.UpdatedAt,
    idUser: entry.idUser,
    objUser: entry.objUser,
    pvUser: entry.pvUser,
    fullNameUser: entry.fullNameUser,
    URL: entry.URL || entry.url,
    joinConfig: entry.joinConfig || entry.JoinConfig || entry.joinPayload,
  }
}

function buildRemotePayload(source, methodTypes = [], userContext = null) {
  if (!source?.name) return null
  const nativeId = toNumericId(source.remoteMeta?.id)
  const meta = source.remoteMeta || {}
  const methodName = source.httpMethod?.toUpperCase?.() || 'POST'
  const methodMeta = findMethodMeta(methodName, methodTypes) || {
    fvMethodTyp: meta.fvMethodTyp,
    pvMethodTyp: meta.pvMethodTyp,
    nameMethodTyp: meta.nameMethodTyp || methodName,
  }
  const payload = {
    id: nativeId,
    cls: meta.cls,
    name: source.name,
    Method: meta.Method || methodName,
    idMethod: meta.idMethod,
    idMethodTyp: meta.idMethodTyp,
    fvMethodTyp: methodMeta.fvMethodTyp || 0,
    pvMethodTyp: methodMeta.pvMethodTyp || 0,
    nameMethodTyp: methodMeta.nameMethodTyp || methodName,
    idMethodBody: meta.idMethodBody,
    idCreatedAt: meta.idCreatedAt,
    CreatedAt: meta.CreatedAt || source.createdAt || new Date().toISOString(),
    idUpdatedAt: meta.idUpdatedAt,
    UpdatedAt: new Date().toISOString(),
    idUser: pickUserValue(userContext?.idUser, meta.idUser),
    objUser: pickUserValue(userContext?.objUser, meta.objUser),
    pvUser: pickUserValue(userContext?.pvUser, meta.pvUser),
    fullNameUser: userContext?.fullNameUser || meta.fullNameUser || '',
    URL: source.url || meta.URL || '',
    joinConfig: serializeJoinConfig(source.joins || []),
    MethodBody: serializeSourcePayload(source),
  }

  if (!nativeId) {
    delete payload.id
  }

  return payload
}

function serializeSourcePayload(source = {}) {
  const base = source.rawBody?.trim()
  let payload
  if (!base) {
    payload = {}
  } else {
    try {
      payload = JSON.parse(base)
    } catch {
      return base
    }
  }
  if (Array.isArray(source.joins) && source.joins.length) {
    payload.__joins = source.joins.map(stripJoinPresentationFields)
  }
  return JSON.stringify(payload)
}

function toNumericId(value) {
  if (!value) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function findMethodMeta(methodName, methodTypes = []) {
  if (!methodName) return null
  const normalized = methodName.trim().toUpperCase()
  if (!normalized) return null
  const match = methodTypes.find((item) => item.code === normalized)
  if (!match) return null
  return {
    fvMethodTyp: toNumericId(match.id) || 0,
    pvMethodTyp: toNumericId(match.pv) || 0,
    nameMethodTyp: match.name || normalized,
  }
}

function buildUserContext(currentUser, personnelInfo) {
  if (!currentUser && !personnelInfo) return null
  const info = personnelInfo || {}
  const normalizedFullName =
    info.fullNameUser ||
    info.fullName ||
    [info.UserSecondName, info.UserFirstName, info.UserMiddleName]
      .filter(Boolean)
      .join(' ')
  return {
    idUser:
      toNumericId(info.idUser) ||
      toNumericId(currentUser?.idUser) ||
      toNumericId(currentUser?.id),
    objUser:
      toNumericId(info.objUser) ||
      toNumericId(currentUser?.objUser) ||
      toNumericId(info.id),
    pvUser:
      toNumericId(info.pvUser) ||
      toNumericId(info.pv) ||
      toNumericId(currentUser?.pvUser),
    fullNameUser: normalizedFullName || currentUser?.fullName || '',
  }
}

function pickUserValue(preferred, fallback) {
  return toNumericId(preferred) || toNumericId(fallback) || null
}

function hasValidUserContext(context) {
  if (!context) return false
  return (
    Number.isFinite(Number(context.objUser)) &&
    Number.isFinite(Number(context.pvUser))
  )
}

function applyJoinDefaults(source = {}) {
  if (!source) return source
  const next = { ...source }
  const rawBodySource =
    source.rawBody ||
    source.remoteMeta?.MethodBody ||
    source.remoteMeta?.methodBody ||
    ''
  const { cleanedBody, joins: bodyJoins } = extractJoinsFromBody(rawBodySource)
  next.rawBody = cleanedBody || source.rawBody || rawBodySource || ''
  let normalized = normalizeJoinList(source.joins || [])
  if (!normalized.length) {
    normalized = parseJoinConfig(
      source.remoteMeta?.joinConfig || source.remoteMeta?.JoinConfig,
    )
  }
  if (!normalized.length) {
    normalized = bodyJoins
  }
  next.joins = normalized
  return next
}
