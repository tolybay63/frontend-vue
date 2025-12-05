/** Файл: src/shared/api/httpClient.ts
 *  Назначение: централизованный HTTP-клиент (axios-инстанс + обёртки для REST и форм).
 *  Использование: импортируйте api/get/post/... вместо прямого обращения к axios.
 */
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'

const ABSOLUTE_URL_PATTERN = /^([a-z][a-z\d+\-.]*:)?\/\//i

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

function ensureLeadingSlash(value: string): string {
  if (!value.startsWith('/')) {
    return `/${value}`
  }
  return value
}

function normalizeRelativeBase(value: string | undefined | null): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    return '/api'
  }

  const withoutTrailing = stripTrailingSlashes(trimmed)
  if (!withoutTrailing) {
    return '/'
  }

  return ensureLeadingSlash(withoutTrailing)
}

function resolveBaseURL(): string {
  const rawBase = import.meta.env.VITE_API_BASE
  const devProxyBase = normalizeRelativeBase(import.meta.env.VITE_API_DEV_PROXY_BASE)

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

  return normalizeRelativeBase(trimmedBase)
}

const baseURL = resolveBaseURL()
export const rpcPath = import.meta.env.VITE_RPC_PATH ?? ''

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
})

export async function get<T>(url: string, config?: AxiosRequestConfig) {
  const { data } = await api.get<T>(url, config)
  return data
}

export async function post<T, P = unknown>(url: string, payload?: P, config?: AxiosRequestConfig) {
  const { data } = await api.post<T>(url, payload, config)
  return data
}

export async function put<T, P = unknown>(url: string, payload?: P, config?: AxiosRequestConfig) {
  const { data } = await api.put<T>(url, payload, config)
  return data
}

export async function del<T>(url: string, config?: AxiosRequestConfig) {
  const { data } = await api.delete<T>(url, config)
  return data
}

export async function postForm<T>(
  url: string,
  body: URLSearchParams,
  config?: AxiosRequestConfig,
) {
  const requestConfig: AxiosRequestConfig = {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'text',
    transformResponse: (value) => value,
    ...config,
  }
  const { data } = await api.post<T>(url, body, requestConfig)
  return data
}
