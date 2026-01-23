import { sendDataSourceRequest } from '@/shared/api/dataSource'

const RAW_FIELD_DICTIONARY_URL = (import.meta.env.VITE_FIELD_DICTIONARY_URL || '').trim()
const RAW_CLIENT_API_BASE = (import.meta.env.VITE_CLIENT_API_BASE || '').trim()
const FALLBACK_REMOTE_URL = 'http://45.8.116.32/dtj/api/client'
const FALLBACK_PROXY_PATH = '/dtj/api/client'

export const DEFAULT_FIELD_DICTIONARY_ID = Number(import.meta.env.VITE_FIELD_DICTIONARY_ID) || 1042

const FIELD_DICTIONARY_URL = resolveFieldDictionaryUrl()

function resolveFieldDictionaryUrl() {
  const candidate =
    RAW_FIELD_DICTIONARY_URL ||
    RAW_CLIENT_API_BASE ||
    (import.meta.env.DEV ? FALLBACK_PROXY_PATH : FALLBACK_REMOTE_URL)
  if (!candidate) return FALLBACK_PROXY_PATH
  if (import.meta.env.DEV && isAbsoluteUrl(candidate)) {
    try {
      const url = new URL(candidate)
      return `${url.pathname}${url.search}` || FALLBACK_PROXY_PATH
    } catch {
      return FALLBACK_PROXY_PATH
    }
  }
  if (isAbsoluteUrl(candidate)) {
    return candidate
  }
  if (candidate.startsWith('/')) {
    return candidate
  }
  return `/${candidate.replace(/^\/+/, '')}`
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value)
}

function parseEntries(rawDict) {
  if (!rawDict) return []
  if (Array.isArray(rawDict)) return rawDict
  if (typeof rawDict === 'string') {
    try {
      return JSON.parse(rawDict)
    } catch {
      return []
    }
  }
  if (typeof rawDict === 'object') {
    return [rawDict]
  }
  return []
}

function extractRecords(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.records)) return payload.records
  if (Array.isArray(payload?.result?.records)) return payload.result.records
  if (Array.isArray(payload?.result)) return payload.result
  return []
}

function chooseDictionaryRecord(records, preferredId = DEFAULT_FIELD_DICTIONARY_ID) {
  if (!Array.isArray(records)) return null
  const preferred = records.find(
    (record) => Number(record?.idFieldDict) === Number(preferredId),
  )
  if (preferred) return preferred
  const parsed = records.find((record) => {
    const value = record?.FieldDict
    if (typeof value !== 'string') return false
    const trimmed = value.trim()
    return trimmed.startsWith('[') || trimmed.startsWith('{')
  })
  return parsed || records[0] || null
}

export async function loadFieldDictionaryConstant(preferredId = DEFAULT_FIELD_DICTIONARY_ID) {
  const response = await sendDataSourceRequest({
    url: FIELD_DICTIONARY_URL,
    method: 'POST',
    body: {
      method: 'data/loadConstant',
      params: [],
    },
  })
  const records = extractRecords(response)
  const target = chooseDictionaryRecord(records, preferredId)
  const idFieldDict = Number(target?.idFieldDict) || preferredId || null
  const entries = parseEntries(target?.FieldDict)
  return {
    entries,
    idFieldDict,
    raw: target || null,
  }
}

export async function saveFieldDictionaryConstant(
  entries = [],
  idFieldDict = DEFAULT_FIELD_DICTIONARY_ID,
  operation = 'upd',
) {
  if (!idFieldDict) {
    throw new Error('idFieldDict is required to save the dictionary.')
  }
  const FieldDict = JSON.stringify(entries || [], null, 2)
  return sendDataSourceRequest({
    url: FIELD_DICTIONARY_URL,
    method: 'POST',
    body: {
      method: 'data/saveConstant',
      params: [
        operation,
        {
          idFieldDict,
          FieldDict,
        },
      ],
    },
  })
}
