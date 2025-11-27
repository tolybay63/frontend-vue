import { defineStore } from 'pinia'
import axios from 'axios'
import { DEFAULT_PLAN_PAYLOAD } from '@/shared/api/plan'
import { DEFAULT_PARAMETER_PAYLOAD } from '@/shared/api/parameter'

const STORAGE_KEY = 'report-data-sources'

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
  },
]

function loadSources() {
  if (typeof window === 'undefined') return structuredClone(defaultSources)
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch (err) {
    console.warn('Failed to load data sources', err)
  }
  return structuredClone(defaultSources)
}

function persistSources(list) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function createId(prefix = 'source') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const METHOD_TYPE_MAP = {
  GET: { fvMethodTyp: 1345, pvMethodTyp: 1562, nameMethodTyp: 'GET' },
  POST: { fvMethodTyp: 1346, pvMethodTyp: 1563, nameMethodTyp: 'POST' },
  PUT: { fvMethodTyp: 1347, pvMethodTyp: 1564, nameMethodTyp: 'PUT' },
  PATCH: { fvMethodTyp: 1348, pvMethodTyp: 1565, nameMethodTyp: 'PATCH' },
}

export const useDataSourcesStore = defineStore('dataSources', {
  state: () => ({
    sources: loadSources(),
    loadedFromRemote: false,
    loadingRemote: false,
  }),
  getters: {
    getById: (state) => (id) => state.sources.find((source) => source.id === id),
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
      base.supportsPivot = payload.supportsPivot !== false
      base.updatedAt = new Date().toISOString()
      if (!base.createdAt) {
        base.createdAt = base.updatedAt
      }

      const index = this.sources.findIndex((item) => item.id === base.id)
      const existing = index >= 0 ? this.sources[index] : null
      base.remoteMeta = base.remoteMeta || existing?.remoteMeta || {}
      if (index >= 0) {
        this.sources.splice(index, 1, base)
      } else {
        this.sources.push(base)
      }
      persistSources(this.sources)
      try {
        await this.saveRemoteRecord(base)
        persistSources(this.sources)
      } catch (err) {
        console.warn('Failed to sync data source', err)
      }
      return base.id
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
        const { data } = await axios.post('/dtj/api/report', {
          method: 'report/loadReportSource',
          params: [0],
        })
        const records = extractRecords(data)
        if (!records.length) return
        const mapped = records.map((entry, index) => normalizeRemoteSource(entry, index))
        if (mapped.length) {
          this.sources = mapped
          this.loadedFromRemote = true
          persistSources(this.sources)
        }
      } catch (err) {
        console.warn('Failed to fetch remote data sources', err)
      } finally {
        this.loadingRemote = false
      }
    },
    async saveRemoteRecord(source) {
      const payload = buildRemotePayload(source)
      if (!payload) return
      const numericId = toNumericId(source.remoteMeta?.id || source.id)
      const operation = numericId ? 'upd' : 'ins'
      const { data } = await axios.post('/dtj/api/report', {
        method: 'report/saveReportSource',
        params: [operation, payload],
      })
      const saved = extractRecords(data)[0]
      if (saved) {
        source.remoteMeta = buildRemoteMeta(saved)
        if (saved.id) {
          source.id = String(saved.id)
        }
      }
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
  const name = entry.name || entry.title || entry.Name || `Источник ${index + 1}`
  const url = entry.url || entry.URL || entry.requestUrl || '/dtj/api/plan'
  const httpMethod =
    entry.nameMethodTyp?.toUpperCase?.() ||
    entry.method?.toUpperCase?.() ||
    entry.Method?.toUpperCase?.() ||
    'POST'
  const rawBody = toRawBody(
    entry.body ||
      entry.payload ||
      entry.requestBody ||
      entry.rawBody ||
      entry.MethodBody,
  )
  const headers = entry.headers || entry.Headers || { 'Content-Type': 'application/json' }
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
  }
}

function buildRemotePayload(source) {
  if (!source?.name) return null
  const nativeId = toNumericId(source.remoteMeta?.id || source.id)
  const methodMeta =
    METHOD_TYPE_MAP[source.httpMethod?.toUpperCase?.()] || METHOD_TYPE_MAP.POST || {}
  const meta = source.remoteMeta || {}
  return {
    id: nativeId,
    cls: meta.cls,
    name: source.name,
    Method: meta.Method || source.httpMethod?.toUpperCase?.() || 'POST',
    idMethod: meta.idMethod,
    idMethodTyp: meta.idMethodTyp,
    fvMethodTyp: meta.fvMethodTyp || methodMeta.fvMethodTyp || 0,
    pvMethodTyp: meta.pvMethodTyp || methodMeta.pvMethodTyp || 0,
    nameMethodTyp:
      meta.nameMethodTyp || methodMeta.nameMethodTyp || source.httpMethod?.toUpperCase?.(),
    idMethodBody: meta.idMethodBody,
    MethodBody: source.rawBody || meta.MethodBody || '',
    idCreatedAt: meta.idCreatedAt,
    CreatedAt: meta.CreatedAt || source.createdAt || new Date().toISOString(),
    idUpdatedAt: meta.idUpdatedAt,
    UpdatedAt: new Date().toISOString(),
    idUser: meta.idUser || 1021,
    objUser: meta.objUser || 1003,
    pvUser: meta.pvUser || 1087,
    fullNameUser: meta.fullNameUser || '',
    URL: source.url || meta.URL || '',
  }
}

function toNumericId(value) {
  if (!value) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}
