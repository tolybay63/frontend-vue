import axios from 'axios'

const PLAN_BASE_URL = (import.meta.env.VITE_PLAN_API_BASE || '/dtj/api').trim()

export const planApi = axios.create({
  baseURL: PLAN_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export const DEFAULT_PLAN_PAYLOAD = {
  date: '2025-11-21',
  codCls: 'Cls_WorkPlanCorrectional',
}

export async function fetchPlanRecords(payload = DEFAULT_PLAN_PAYLOAD) {
  const { data } = await planApi.post('/plan', {
    method: 'data/loadPlan',
    params: [payload],
  })
  return data?.result?.records ?? []
}
