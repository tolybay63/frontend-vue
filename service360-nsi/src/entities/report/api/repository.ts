/** Файл: src/entities/report/api/repository.ts
 *  Назначение: универсальный HTTP-клиент для генерации и загрузки отчётов (PDF/XLSX).
 *  Использование: вызывайте generateReportFile({ endpoint, format, payload }) из виджетов/страниц.
 */
import type { AxiosRequestConfig, Method } from 'axios'
import { api } from '@shared/api'

export type ReportFormat = 'pdf' | 'xlsx'
export type ReportHttpMethod = 'GET' | 'POST'

export interface GenerateReportFileOptions {
  endpoint: string
  payload?: Record<string, unknown>
  format: ReportFormat
  method?: ReportHttpMethod
  signal?: AbortSignal
  fallbackFileName?: string
}

export interface ReportFileDescriptor {
  blob: Blob
  fileName?: string
  format: ReportFormat
}

const FORMAT_MIME: Record<ReportFormat, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

const METHOD_MAP: Record<ReportHttpMethod, Method> = {
  GET: 'GET',
  POST: 'POST',
}

export async function generateReportFile(
  options: GenerateReportFileOptions,
): Promise<ReportFileDescriptor> {
  const method = options.method ?? 'POST'
  const normalizedMethod: Method = METHOD_MAP[method] ?? 'POST'
  const payload = { ...(options.payload ?? {}), format: options.format }

  const config: AxiosRequestConfig = {
    url: options.endpoint,
    method: normalizedMethod,
    responseType: 'blob',
    headers: {
      Accept: FORMAT_MIME[options.format],
    },
    signal: options.signal,
  }

  if (normalizedMethod === 'GET') {
    config.params = payload
  } else {
    config.data = payload
  }

  const response = await api.request<Blob>(config)
  const filename =
    extractFileName(response.headers?.['content-disposition']) ??
    extractFileName(response.headers?.['Content-Disposition']) ??
    options.fallbackFileName

  return {
    blob: response.data,
    fileName: filename ?? undefined,
    format: options.format,
  }
}

function extractFileName(disposition?: string): string | null {
  if (!disposition) return null

  const utf8Match = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      /* ignore malformed header */
    }
  }

  const asciiMatch = disposition.match(/filename\s*=\s*"?(?<name>[^";]+)"?/i)
  if (asciiMatch?.groups?.name) {
    return asciiMatch.groups.name.trim()
  }

  return null
}
