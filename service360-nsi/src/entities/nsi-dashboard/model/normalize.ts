import type {
  ActivityResponse,
  DiagnosticsResponse,
  NsiCoverage,
  NsiCoverageResponse,
  RelationsCounts,
  RelationsCountsResponse,
} from './types'

type WrappedPayload<T> =
  | T
  | { data?: WrappedPayload<T>; payload?: WrappedPayload<T>; result?: WrappedPayload<T> }

const WRAPPER_KEYS = ['payload', 'data', 'result'] as const

function unwrapPayload<T>(input: WrappedPayload<T>): T {
  if (input && typeof input === 'object') {
    const record = input as Record<(typeof WRAPPER_KEYS)[number], WrappedPayload<T> | null | undefined>
    for (const key of WRAPPER_KEYS) {
      const candidate = record[key]
      if (candidate != null) {
        return unwrapPayload(candidate as WrappedPayload<T>)
      }
    }
  }

  return input as T
}

function extractPartialFlag(input: unknown): boolean | undefined {
  if (!input || typeof input !== 'object') {
    return undefined
  }

  if ('partial' in input) {
    const value = (input as { partial?: unknown }).partial
    if (typeof value === 'boolean') {
      return value
    }
    if (value == null) {
      return undefined
    }
    return Boolean(value)
  }

  const record = input as Record<(typeof WRAPPER_KEYS)[number], unknown>
  for (const key of WRAPPER_KEYS) {
    if (key in record) {
      const nested = extractPartialFlag(record[key])
      if (typeof nested !== 'undefined') {
        return nested
      }
    }
  }

  return undefined
}

export function normalizeCoverageResponse(input: WrappedPayload<NsiCoverageResponse | NsiCoverage>): NsiCoverageResponse {
  const payload = unwrapPayload(input)
  return { ...payload, partial: extractPartialFlag(input) ?? undefined }
}

export function normalizeDiagnosticsResponse(
  input: WrappedPayload<DiagnosticsResponse | DiagnosticsResponse['items']>,
): DiagnosticsResponse {
  const payload = unwrapPayload(input)
  if (Array.isArray(payload)) {
    return { items: payload, partial: extractPartialFlag(input) ?? undefined }
  }
  return { items: payload.items ?? [], partial: extractPartialFlag(payload) ?? undefined }
}

export function normalizeActivityResponse(
  input: WrappedPayload<ActivityResponse | ActivityResponse['items']>,
): ActivityResponse {
  const payload = unwrapPayload(input)
  if (Array.isArray(payload)) {
    return { items: payload, partial: extractPartialFlag(input) ?? undefined }
  }
  return { items: payload.items ?? [], partial: extractPartialFlag(payload) ?? undefined }
}

export function normalizeRelationsResponse(
  input: WrappedPayload<RelationsCountsResponse | RelationsCounts>,
): RelationsCountsResponse {
  const payload = unwrapPayload(input)
  return { ...payload, partial: extractPartialFlag(input) ?? undefined }
}
