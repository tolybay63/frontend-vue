import axios from 'axios'

const OBJECTS_API_URL = (import.meta.env.VITE_OBJECTS_API_BASE || '/dtj/api/objects').trim()

const objectsApi = axios.create({
  baseURL: OBJECTS_API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export async function callObjectsMethod(method, params = []) {
  const { data } = await objectsApi.post('', { method, params })
  return data
}

export async function fetchFactorValues(factorCode) {
  if (!factorCode) return []
  const data = await callObjectsMethod('data/loadFactorValForSelect', [factorCode])
  return extractRecords(data)
}

export async function loadPresentationLinks() {
  const data = await callObjectsMethod('data/loadObjList', [
    'Cls_ReportPresentation',
    'Prop_LinkToView',
    'reportdata',
  ])
  return extractRecords(data)
}

export async function fetchPersonnelAccessList() {
  const data = await callObjectsMethod('data/loadObjList', [
    'Cls_Personnel',
    'Prop_UserMulti',
    'personnaldata',
  ])
  return extractRecords(data)
}

export function fetchMethodTypeRecords() {
  return fetchFactorValues('Prop_MethodTyp')
}

function extractRecords(payload) {
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.result?.records)) return payload.result.records
  if (Array.isArray(payload.result)) return payload.result
  if (Array.isArray(payload.records)) return payload.records
  return []
}
