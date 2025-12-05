/** Файл: src/shared/api/resourceClient.ts
 *  Назначение: JSON-RPC клиент микросервиса «Resource» (http://45.8.116.32/dtj/api/resource).
 *  Использование: импортируйте resourceRpc и вызывайте методы, например: resourceRpc('data/loadMaterial', [0]).
 */
import axios from 'axios'

export interface ResourceRpcResponse<T = unknown> {
  result?: T
  error?: unknown
}

const ABSOLUTE_URL_PATTERN = /^([a-z][a-z\d+\-.]*:)?\/\//i

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

function ensureLeadingSlash(value: string): string {
  if (!value.startsWith('/')) return `/${value}`
  return value
}

function normalizeRelativeBase(value: string | undefined | null, fallback = '/resource-api'): string {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  const withoutTrailing = stripTrailingSlashes(trimmed)
  return ensureLeadingSlash(withoutTrailing || fallback)
}

function resolveResourceBaseURL(): string {
  const rawBase = import.meta.env.VITE_RESOURCE_API_BASE
  const devProxyBase = normalizeRelativeBase(import.meta.env.VITE_RESOURCE_DEV_PROXY_BASE, '/resource-api')

  if (!rawBase) {
    return devProxyBase
  }

  const trimmedBase = rawBase.trim()
  if (!trimmedBase) {
    return devProxyBase
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmedBase)) {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      try {
        const target = new URL(trimmedBase)
        if (target.origin !== window.location.origin) {
          return devProxyBase
        }
      } catch {
        return devProxyBase
      }
    }

    return stripTrailingSlashes(trimmedBase)
  }

  return normalizeRelativeBase(trimmedBase, '/resource-api')
}

const baseURL = resolveResourceBaseURL()

const resourceApi = axios.create({
  baseURL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function resourceRpc<T = unknown, P = unknown>(method: string, params: P): Promise<T> {
  const { data } = await resourceApi.post<ResourceRpcResponse<T>>('', { method, params })
  if (!data) {
    throw new Error('Пустой ответ сервиса ресурсов')
  }

  if ('error' in data && data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Resource API error')
  }

  if (!('result' in data)) {
    throw new Error('Некорректный ответ Resource API: отсутствует result')
  }

  return data.result as T
}
