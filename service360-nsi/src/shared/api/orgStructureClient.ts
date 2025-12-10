/** Файл: src/shared/api/orgStructureClient.ts
 *  Назначение: JSON-RPC клиент сервиса оргструктуры (эндпоинт `/dtj/api/orgstructure`).
 *  Использование: импортируйте orgStructureRpc и вызывайте методы, например:
 *  orgStructureRpc('data/loadObjForSelect', ['Cls_LocationSection']).
 */
import axios from 'axios'

interface OrgStructureRpcResponse<T = unknown> {
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

function normalizeRelativeBase(value: string | undefined | null, fallback = '/orgstructure-api') {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  const withoutTrailing = stripTrailingSlashes(trimmed)
  return ensureLeadingSlash(withoutTrailing || fallback)
}

function resolveOrgStructureBaseURL(): string {
  const rawBase = import.meta.env.VITE_ORGSTRUCTURE_API_BASE
  const devProxyBase = normalizeRelativeBase(
    import.meta.env.VITE_ORGSTRUCTURE_DEV_PROXY_BASE,
    '/orgstructure-api',
  )

  if (!rawBase) return devProxyBase

  const trimmedBase = rawBase.trim()
  if (!trimmedBase) return devProxyBase

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

  return normalizeRelativeBase(trimmedBase, '/orgstructure-api')
}

const orgStructureBaseURL = resolveOrgStructureBaseURL()

const orgStructureApi = axios.create({
  baseURL: orgStructureBaseURL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function orgStructureRpc<T = unknown, P = unknown>(
  method: string,
  params: P,
): Promise<T> {
  const { data } = await orgStructureApi.post<OrgStructureRpcResponse<T>>('', { method, params })
  if (!data) throw new Error('Пустой ответ OrgStructure API')

  if ('error' in data && data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'OrgStructure API error')
  }

  if (!('result' in data)) {
    throw new Error('Некорректный ответ OrgStructure API: отсутствует result')
  }

  return data.result as T
}
