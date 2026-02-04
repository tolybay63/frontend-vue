import axios from 'axios'

const USER_API_URL = (import.meta.env.VITE_USER_API_BASE || '/userapi').trim()
const USERINFO_API_URL = (import.meta.env.VITE_USERINFO_API_BASE || '/userinfo').trim()

const userApi = axios.create({
  baseURL: USER_API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

const userInfoApi = axios.create({
  baseURL: USERINFO_API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export async function fetchCurrentUserRecord() {
  const { data } = await userApi.post('', {
    method: 'data/getCurUserInfo',
    params: [],
  })
  return extractFirstRecord(data)
}

export async function fetchPersonnelInfo(personId) {
  if (!personId && personId !== 0) return null
  const { data } = await userInfoApi.post('', {
    method: 'data/getPersonnalInfo',
    params: [personId],
  })
  return extractFirstRecord(data)
}

function extractFirstRecord(payload) {
  if (!payload || typeof payload !== 'object') return null
  const records = extractRecords(payload)
  if (records.length) return records[0]
  if (payload.result && typeof payload.result === 'object') {
    return payload.result
  }
  if (payload.records && typeof payload.records === 'object') {
    return payload.records
  }
  if (payload.result != null) return payload.result
  if (payload.records != null) return payload.records
  return null
}

function extractRecords(payload) {
  if (!payload || typeof payload !== 'object') return []
  const candidates = [
    payload.result?.records,
    payload.result,
    payload.records,
  ]
  for (const candidate of candidates) {
    const normalized = normalizeRecordCollection(candidate)
    if (normalized.length) return normalized
  }
  return []
}

function normalizeRecordCollection(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    const isIndexed = keys.every((key) => /^\d+$/.test(key))
    if (isIndexed) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => value[key])
    }
    return [value]
  }
  return []
}
