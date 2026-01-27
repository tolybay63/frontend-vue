import { createRemoteDataSourceClient } from '@company/report-data-source'
import { sendDataSourceRequest } from '@/shared/api/dataSource'
import { createBatch, getBatchStatus } from '@/shared/api/batch'
import {
  hasPagedBatchResults,
  loadPagedBatchResults,
} from '@/shared/services/batchResults'
import { loadReportSources } from '@/shared/api/report'
import { fetchJoinPayload } from '@/shared/lib/sourceJoins.js'

const REQUEST_FIELD_PREFIX = 'request'
const BATCH_THRESHOLD = Number(import.meta.env.VITE_BATCH_THRESHOLD) || 0
const BATCH_POLL_MS = Number(import.meta.env.VITE_BATCH_POLL_MS) || 2000

async function sendMultiRequestData(payload = {}) {
  const body = normalizeRequestBody(payload.body)
  if (!isMultiRequestBody(body)) {
    return sendDataSourceRequest(payload)
  }
  const batchCandidate = buildBatchCandidate(body, payload)
  const shouldUseBatch =
    batchCandidate &&
    batchCandidate.paramsList.length > BATCH_THRESHOLD &&
    String(payload.method || '').toUpperCase() !== 'GET'
  if (shouldUseBatch) {
    const status = await runBatchJob(batchCandidate.payload)
    const records = await buildRecordsFromBatchStatus(
      status,
      batchCandidate.paramsList,
    )
    return { records }
  }
  const entries = buildRequestEntries(body, payload)
  if (!entries.length) {
    return sendDataSourceRequest(payload)
  }
  const responses = await Promise.all(
    entries.map((entry) => sendDataSourceRequest(entry.request)),
  )
  const records = responses.flatMap((response, index) => {
    const records = extractRecordsFromResponse(response)
    return applyRequestFields(records, entries[index]?.meta?.fields)
  })
  return { records }
}

const client = createRemoteDataSourceClient({
  requestData: sendMultiRequestData,
  loadSources: loadReportSources,
  fetchJoinPayload,
})

export const fetchRemoteRecords = (source, options) =>
  client.fetchRemoteRecords(source, options)
export const clearRemoteRecordCache = () => client.clearCache()
export const preloadRemoteSources = () => client.preloadRemoteSources()

async function runBatchJob(batchPayload) {
  const created = await createBatch(batchPayload)
  const jobId = created?.job_id
  if (!jobId) {
    throw new Error('Не удалось запустить пакетную загрузку.')
  }
  while (true) {
    const status = await getBatchStatus(jobId)
    if (!status || !status.status) {
      throw new Error('Не удалось получить статус пакетной загрузки.')
    }
    if (status.status === 'queued' || status.status === 'running') {
      await waitFor(BATCH_POLL_MS)
      continue
    }
    return status
  }
}

function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildBatchCandidate(body, baseRequest) {
  if (!isPlainObject(body)) return null
  const paramsList = Array.isArray(body.params) ? body.params : []
  if (!paramsList.length) return null
  if (!paramsList.every((item) => isPlainObject(item))) return null
  const method =
    typeof body.method === 'string' && body.method.trim()
      ? body.method.trim()
      : ''
  if (!method) return null
  const endpoint = normalizeBatchEndpoint(baseRequest?.url)
  if (!endpoint) {
    throw new Error('Некорректный endpoint для пакетной загрузки.')
  }
  return {
    payload: {
      endpoint,
      method,
      params: paramsList,
      sourceId: baseRequest?.sourceId || null,
    },
    paramsList,
  }
}

function normalizeBatchEndpoint(rawUrl) {
  const value = String(rawUrl || '').trim()
  if (!value) return ''
  if (typeof window === 'undefined') return value
  try {
    const parsed = new URL(value, window.location.origin)
    if (parsed.origin !== window.location.origin) {
      throw new Error('Batch endpoint должен быть относительным.')
    }
    return `${parsed.pathname}${parsed.search || ''}`
  } catch {
    return value
  }
}

async function buildRecordsFromBatchStatus(status, paramsList = []) {
  if (status.status === 'failed') {
    throw new Error('Пакетная загрузка завершилась с ошибкой.')
  }
  if (status.status === 'cancelled') {
    throw new Error('Пакетная загрузка отменена.')
  }
  let results = status.results
  if (hasPagedBatchResults(status)) {
    const jobId = status.job_id || status.jobId
    const paged = await loadPagedBatchResults(jobId)
    results = paged?.results
  }
  if (!Array.isArray(results)) {
    throw new Error('Результат пакетной загрузки недоступен.')
  }
  const fieldMaps = paramsList.map((params) =>
    buildRequestFieldsFromParams(params),
  )
  return results.flatMap((item, index) => {
    if (!item || item.ok === false) return []
    const rows = extractRecordsFromResponse(item.data)
    const fields = fieldMaps[index] || {}
    return applyRequestFields(rows, fields)
  })
}

function normalizeRequestBody(body) {
  if (body == null || body === '') return null
  if (typeof body === 'object') return body
  if (typeof body !== 'string') return null
  const parsed = safeJsonParse(body)
  return parsed.ok ? parsed.value : null
}

function buildRequestEntries(body, baseRequest) {
  if (!isPlainObject(body)) {
    return [buildRequestEntry(baseRequest, body)]
  }
  if (Array.isArray(body.requests) && body.requests.length) {
    return buildRequestEntriesFromRequests(body, baseRequest)
  }
  if (shouldSplitParamsIntoRequests(body.params)) {
    return buildRequestEntriesFromParams(body, baseRequest)
  }
  const paramsSource = extractParamsForFields(body)
  return [buildRequestEntry(baseRequest, body, paramsSource)]
}

function buildRequestEntriesFromRequests(body, baseRequest) {
  const baseBody = { ...body }
  delete baseBody.requests
  return body.requests
    .map((entry) => buildRequestBodyFromEntry(baseBody, entry))
    .filter(Boolean)
    .map((item) => buildRequestEntry(baseRequest, item.body, item.paramsSource))
}

function buildRequestEntriesFromParams(body, baseRequest) {
  const baseBody = { ...body }
  delete baseBody.params
  return body.params.map((paramsEntry) =>
    buildRequestEntry(
      baseRequest,
      { ...baseBody, params: [paramsEntry] },
      paramsEntry,
    ),
  )
}

function buildRequestBodyFromEntry(baseBody, entry) {
  if (
    isPlainObject(entry) &&
    Object.prototype.hasOwnProperty.call(entry, 'body')
  ) {
    const mergedBody = { ...baseBody, ...entry.body }
    return {
      body: mergedBody,
      paramsSource: extractParamsForFields(mergedBody),
    }
  }
  if (
    isPlainObject(entry) &&
    Object.prototype.hasOwnProperty.call(entry, 'params')
  ) {
    return {
      body: { ...baseBody, params: entry.params },
      paramsSource: entry.params,
    }
  }
  if (isPlainObject(entry)) {
    return {
      body: { ...baseBody, params: entry },
      paramsSource: entry,
    }
  }
  if (typeof entry !== 'undefined') {
    return {
      body: { ...baseBody, params: entry },
      paramsSource: entry,
    }
  }
  return null
}

function buildRequestEntry(baseRequest, body, paramsSource = null) {
  const fields = buildRequestFieldsFromParams(paramsSource)
  return {
    request: {
      url: baseRequest.url,
      method: baseRequest.method,
      headers: baseRequest.headers,
      body,
    },
    meta: { fields },
  }
}

function buildRequestFieldsFromParams(paramsSource) {
  const paramsObject = resolveParamsObject(paramsSource)
  if (!paramsObject) return {}
  return Object.entries(paramsObject).reduce((acc, [key, value]) => {
    const fieldKey = buildRequestFieldKey(key)
    if (!fieldKey) return acc
    acc[fieldKey] = value
    return acc
  }, {})
}

function buildRequestFieldKey(key) {
  const raw = String(key ?? '').trim()
  if (!raw) return ''
  const tokens = raw.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  if (!tokens.length) return ''
  const suffix = tokens
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `${REQUEST_FIELD_PREFIX}${suffix}`
}

function extractParamsForFields(body) {
  if (!isPlainObject(body)) return null
  return resolveParamsObject(body.params)
}

function resolveParamsObject(params) {
  if (isPlainObject(params)) return params
  if (
    Array.isArray(params) &&
    params.length === 1 &&
    isPlainObject(params[0])
  ) {
    return params[0]
  }
  return null
}

function shouldSplitParamsIntoRequests(params) {
  if (!Array.isArray(params) || params.length < 2) return false
  return params.every((item) => isPlainObject(item))
}

function isMultiRequestBody(body) {
  if (!isPlainObject(body)) return false
  if (Array.isArray(body.requests) && body.requests.length) return true
  return shouldSplitParamsIntoRequests(body.params)
}

function applyRequestFields(records, fields = {}) {
  if (!Array.isArray(records) || !records.length) return records || []
  const entries = Object.entries(fields || {})
  if (!entries.length) return records
  return records.map((record) => {
    if (!record || typeof record !== 'object') return record
    const next = { ...record }
    entries.forEach(([key, value]) => {
      if (!(key in next)) {
        next[key] = value
      }
    })
    return next
  })
}

function extractRecordsFromResponse(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.records)) return payload.records
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.result)) return payload.result
  if (payload.result && Array.isArray(payload.result.records)) {
    return payload.result.records
  }
  return []
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function safeJsonParse(value = '') {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch {
    return { ok: false, value: null }
  }
}
