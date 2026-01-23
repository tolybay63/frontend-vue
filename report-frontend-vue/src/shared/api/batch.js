import axios from 'axios'
import { attachApiInterceptors } from '@/shared/api/http'

const baseURL =
  import.meta.env.VITE_BATCH_API_BASE ||
  import.meta.env.VITE_REPORT_BACKEND_URL ||
  ''

const batchApi = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

attachApiInterceptors(batchApi, { source: 'batchApi' })

export async function createBatch(payload) {
  const { data } = await batchApi.post('/batch', payload)
  return data
}

export async function getBatchStatus(jobId) {
  const { data } = await batchApi.get(`/batch/${jobId}`)
  return data
}

export async function cancelBatch(jobId) {
  const { data } = await batchApi.delete(`/batch/${jobId}`)
  return data
}
