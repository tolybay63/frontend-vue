/** Файл: src/shared/api/reportClient.ts
 *  Назначение: JSON-RPC клиент сервиса «Report» (http://45.8.116.32/dtj/api/report).
 *  Использование: импортируйте reportRpc и вызывайте методы, например reportRpc('report/generateReport', [payload]).
 */
import axios from 'axios'

export interface ReportRpcResponse<T = unknown> {
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

function normalizeRelativeBase(value: string | undefined | null, fallback = '/report-api'): string {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  const withoutTrailing = stripTrailingSlashes(trimmed)
  return ensureLeadingSlash(withoutTrailing || fallback)
}

function resolveReportBaseURL(): string {
  const rawBase = import.meta.env.VITE_REPORT_API_BASE
  const devProxyBase = normalizeRelativeBase(
    import.meta.env.VITE_REPORT_DEV_PROXY_BASE,
    '/report-api',
  )

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

  return normalizeRelativeBase(trimmedBase, '/report-api')
}

const reportRpcBaseURL = resolveReportBaseURL()

const reportApi = axios.create({
  baseURL: reportRpcBaseURL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function reportRpc<T = unknown, P = unknown>(method: string, params: P): Promise<T> {
  const { data } = await reportApi.post<ReportRpcResponse<T>>('', { method, params })
  if (!data) {
    throw new Error('Пустой ответ Report API')
  }

  if ('error' in data && data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Report API error')
  }

  if (!('result' in data)) {
    throw new Error('Некорректный ответ Report API: отсутствует result')
  }

  return data.result as T
}

// -------- загрузка сформированных отчётов --------

function resolveReportLoadBaseURL(): string {
  const rawBase = import.meta.env.VITE_REPORT_LOAD_BASE
  const devProxyBase = normalizeRelativeBase(
    import.meta.env.VITE_REPORT_LOAD_DEV_PROXY_BASE,
    '/load-report',
  )

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

  return normalizeRelativeBase(trimmedBase, '/load-report')
}

function resolveReportLoadAbsoluteBaseURL(): string {
  const rawBase = import.meta.env.VITE_REPORT_LOAD_BASE
  if (rawBase && ABSOLUTE_URL_PATTERN.test(rawBase.trim())) {
    return stripTrailingSlashes(rawBase.trim())
  }

  if (typeof window !== 'undefined') {
    try {
      const absolute = new URL(reportLoadBaseURL, window.location.origin)
      return stripTrailingSlashes(absolute.toString())
    } catch {
      // ignore
    }
  }

  return stripTrailingSlashes(reportLoadBaseURL)
}

const reportLoadBaseURL = resolveReportLoadBaseURL()
const reportLoadAbsoluteBaseURL = resolveReportLoadAbsoluteBaseURL()

const reportLoadApi = axios.create({
  baseURL: reportLoadBaseURL,
  withCredentials: false,
  responseType: 'blob',
})

export interface FetchReportFileParams {
  tml: string
  id: string
  ext?: string
}

export interface ReportLoadResult {
  blob: Blob
  fileName?: string
  contentType?: string
  absoluteUrl: string
  query: string
}

export async function fetchReportFile(params: FetchReportFileParams): Promise<ReportLoadResult> {
  const { encodedQuery } = buildQueryString(params)
  const requestPath = encodedQuery ? `?${encodedQuery}` : ''

  const response = await reportLoadApi.get<Blob>(requestPath, { responseType: 'blob' })
  const blob = response.data
  const headers = response.headers ?? {}
  const fileName = decodeFileName(
    toHeaderString(headers['content-disposition'] ?? headers['Content-Disposition']),
  )
  const contentType = toHeaderString(headers['content-type'] ?? headers['Content-Type'])
  const absoluteUrl = `${reportLoadAbsoluteBaseURL}${encodedQuery ? `?${encodedQuery}` : ''}`

  return {
    blob,
    fileName: fileName ?? undefined,
    contentType: typeof contentType === 'string' ? contentType : undefined,
    absoluteUrl,
    query: encodedQuery,
  }
}

function buildQueryString(params: FetchReportFileParams) {
  const encodedParts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    encodedParts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(typeof value === 'string' ? value : String(value))}`,
    )
  }
  const encodedQuery = encodedParts.join('&')
  return { encodedQuery }
}

function toHeaderString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string')
    if (first) return first
  }
  if (value != null) return String(value)
  return undefined
}

function decodeFileName(disposition?: string | undefined): string | null {
  if (!disposition) return null
  const utfMatch = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1])
    } catch {
      return utfMatch[1]
    }
  }

  const asciiMatch = disposition.match(/filename\s*=\s*"?(?<name>[^";]+)"?/i)
  const raw = asciiMatch?.groups?.name ?? null
  if (!raw) return null
  try {
    return decodeURIComponent(raw.trim())
  } catch {
    return raw.trim()
  }
}
