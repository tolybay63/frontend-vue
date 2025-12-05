/** Файл: src/shared/api/metaClient.ts
 *  Назначение: JSON-RPC клиент к Meta API (http://45.8.116.32/dtj/meta/api) с обходом CORS через Vite proxy.
 *  Использование: импортируйте metaRpc для вызова методов, например: metaRpc('measure/insert', [payload]).
 */
import axios from 'axios'

export interface MetaRpcResponse<T = unknown> {
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

function normalizeRelativeBase(value: string | undefined | null, fallback = '/meta-api'): string {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  const withoutTrailing = stripTrailingSlashes(trimmed)
  return ensureLeadingSlash(withoutTrailing || fallback)
}

function resolveMetaBaseURL(): string {
  const rawBase = import.meta.env.VITE_META_API_BASE
  const devProxyBase = normalizeRelativeBase(import.meta.env.VITE_META_DEV_PROXY_BASE, '/meta-api')

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

  return normalizeRelativeBase(trimmedBase, '/meta-api')
}

const baseURL = resolveMetaBaseURL()
const metaApi = axios.create({
  baseURL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function metaRpc<T = unknown, P = unknown>(method: string, params: P): Promise<T> {
  const { data } = await metaApi.post<MetaRpcResponse<T>>('', { method, params })
  if (!data) throw new Error('Пустой ответ Meta API')
  if ('error' in data && data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Meta API error')
  }
  if (!('result' in data)) throw new Error('Некорректный ответ Meta API: отсутствует result')
  return data.result as T
}
