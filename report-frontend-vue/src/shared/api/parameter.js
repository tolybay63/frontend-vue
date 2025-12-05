import axios from 'axios'

const PARAMETER_BASE_URL = (
  import.meta.env.VITE_INSPECTION_API_BASE || '/dtj/api/inspections'
).trim()

export const parameterApi = axios.create({
  baseURL: PARAMETER_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export const DEFAULT_PARAMETER_PAYLOAD = {
  date: '2025-11-23',
  periodType: 41,
  objLocation: 1071,
}

export async function fetchParameterRecords(payload = DEFAULT_PARAMETER_PAYLOAD) {
  const { data } = await parameterApi.post('', {
    method: 'data/loadParameterLog',
    params: [payload],
  })
  return data?.result?.records ?? []
}
