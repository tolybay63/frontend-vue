/** Файл: src/shared/api/dtjDataClient.ts
 *  Назначение: JSON-RPC клиенты для сервисов objects/personnal (http://45.8.116.32/dtj/api/*).
 *  Использование: импортируйте objectsRpc/personnalRpc и вызывайте методы, например
 *  objectsRpc('data/loadPeriodType', []).
 */
import axios from 'axios'

interface RpcResponse<T = unknown> {
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

function normalizeRelativeBase(value: string | undefined | null, fallback: string): string {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  const withoutTrailing = stripTrailingSlashes(trimmed)
  return ensureLeadingSlash(withoutTrailing || fallback)
}

function resolveRpcBaseURL(
  rawBase: string | undefined | null,
  devProxyBase: string | undefined | null,
  fallbackProxy = '/api',
): string {
  const devProxy = normalizeRelativeBase(devProxyBase, fallbackProxy)

  if (!rawBase) {
    return devProxy
  }

  const trimmedBase = rawBase.trim()
  if (!trimmedBase) {
    return devProxy
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmedBase)) {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      try {
        const target = new URL(trimmedBase)
        if (target.origin !== window.location.origin) {
          return devProxy
        }
      } catch {
        return devProxy
      }
    }

    return stripTrailingSlashes(trimmedBase)
  }

  return normalizeRelativeBase(trimmedBase, fallbackProxy)
}

const objectsBaseURL = resolveRpcBaseURL(
  import.meta.env.VITE_OBJECTS_API_BASE,
  import.meta.env.VITE_OBJECTS_DEV_PROXY_BASE,
  '/objects-api',
)

const personnalBaseURL = resolveRpcBaseURL(
  import.meta.env.VITE_PERSONNAL_API_BASE,
  import.meta.env.VITE_PERSONNAL_DEV_PROXY_BASE,
  '/personnal-api',
)

const objectsApi = axios.create({
  baseURL: objectsBaseURL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
})

const personnalApi = axios.create({
  baseURL: personnalBaseURL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
})

async function callRpc<T = unknown, P = unknown>(client: typeof objectsApi, method: string, params: P) {
  const { data } = await client.post<RpcResponse<T>>('', { method, params })
  if (!data) {
    throw new Error('Пустой ответ RPC сервиса')
  }

  if ('error' in data && data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'RPC error')
  }

  if (!('result' in data)) {
    throw new Error('Некорректный ответ RPC: отсутствует result')
  }

  return data.result as T
}

export async function objectsRpc<T = unknown, P = unknown>(method: string, params: P): Promise<T> {
  return callRpc<T, P>(objectsApi, method, params)
}

export async function personnalRpc<T = unknown, P = unknown>(method: string, params: P): Promise<T> {
  return callRpc<T, P>(personnalApi, method, params)
}
