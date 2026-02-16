/**
 *  Файл: src/shared/api/userinfoClient.ts
 *  Назначение: RPC-клиент для сервиса /userinfo (персональные данные).
 *  Использование: userinfoRpc('data/getPersonnalInfo', [id]).
 */
import axios from 'axios'

interface RpcPayload<TParams> {
  method: string
  params?: TParams
}

type RpcError = { message?: string } | string | null | undefined

type RpcEnvelope<TResult> =
  | { result: TResult; error?: undefined }
  | { result?: undefined; error: RpcError }
  | TResult

const ABSOLUTE_URL_PATTERN = /^([a-z][a-z\d+\-.]*:)?\/\//i

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

function ensureLeadingSlash(value: string): string {
  if (!value.startsWith('/')) return `/${value}`
  return value
}

function normalizeRelativeBase(value: string | undefined | null, fallback = '/userinfo') {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  const withoutTrailing = stripTrailingSlashes(trimmed)
  return ensureLeadingSlash(withoutTrailing || fallback)
}

function resolveUserinfoBaseURL(): string {
  const rawBase = import.meta.env.VITE_USERINFO_API_BASE
  const devProxyBase = normalizeRelativeBase(
    import.meta.env.VITE_USERINFO_DEV_PROXY_BASE,
    '/userinfo',
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

  return normalizeRelativeBase(trimmedBase, '/userinfo')
}

const userinfoBaseURL = resolveUserinfoBaseURL()

const userinfoApi = axios.create({
  baseURL: userinfoBaseURL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function userinfoRpc<T = unknown, TParams = unknown>(
  method: string,
  params?: TParams,
): Promise<T> {
  const payload: RpcPayload<TParams> = { method, params }
  const { data } = await userinfoApi.post<RpcEnvelope<T>>('', payload)

  if (data && typeof data === 'object') {
    if ('error' in data && data.error) {
      const message =
        typeof data.error === 'string'
          ? data.error
          : (data.error?.message ?? `RPC ${method} failed`)
      throw new Error(message)
    }

    if ('result' in data) {
      return (data.result ?? undefined) as T
    }
  }

  return data as T
}
