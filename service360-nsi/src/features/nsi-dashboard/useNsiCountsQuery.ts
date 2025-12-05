import { useQuery, type UseQueryReturnType } from '@tanstack/vue-query'

import { fetchComponentsSnapshot } from '@entities/component'
import { fetchObjectDefectsSnapshot } from '@entities/object-defect'
import { fetchObjectParametersSnapshot } from '@entities/object-parameter'
import { fetchObjectTypesSnapshot } from '@entities/object-type'
import { fetchSources } from '@entities/source'
import { rpc } from '@shared/api'
import { extractRecords } from '@shared/lib'

export type NsiCounts = {
  objectTypes: number
  components: number
  defects: number
  parameters: number
  works: number
  sources: number
}

interface RawWorkRecord {
  obj?: number | string | null
}

const TOTAL_KEYS = [
  'total',
  'Total',
  'TOTAL',
  'count',
  'Count',
  'COUNT',
  'totalCount',
  'TotalCount',
  'TOTALCOUNT',
]

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) return null
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function extractTotal(record: Record<string, unknown>): number | null {
  for (const key of TOTAL_KEYS) {
    if (!(key in record)) continue
    const total = toFiniteNumber(record[key])
    if (total != null) return total
  }
  return null
}

function extractTotalDeep(value: unknown): number | null {
  if (value == null) return null

  if (Array.isArray(value)) return value.length

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>

    const direct = extractTotal(record)
    if (direct != null) return direct

    if (Array.isArray(record.items)) return record.items.length
    if (Array.isArray(record.records)) return record.records.length
    if (Array.isArray(record.data)) return record.data.length

    const nestedKeys = ['meta', 'result', 'payload', 'response']
    for (const key of nestedKeys) {
      const nested = record[key]
      if (nested == null) continue
      const nestedTotal = extractTotalDeep(nested)
      if (nestedTotal != null) return nestedTotal
    }
  }

  return null
}

function resolveCount(value: unknown, fallback?: () => number): number {
  const extracted = extractTotalDeep(value)
  if (extracted != null) return extracted

  if (fallback) {
    const fallbackValue = fallback()
    if (Number.isFinite(fallbackValue)) return fallbackValue
  }

  return 0
}

async function safeCount(label: string, loader: () => Promise<number>): Promise<number> {
  try {
    const total = await loader()
    console.debug(`[count:${label}]`, total)
    return Number.isFinite(total) ? total : 0
  } catch (error) {
    console.warn(`[count:${label}] failed`, error)
    return 0
  }
}

async function countObjectTypes() {
  const snapshot = await fetchObjectTypesSnapshot()
  return resolveCount(snapshot, () => snapshot.items.length)
}

async function countComponents() {
  const snapshot = await fetchComponentsSnapshot()
  return resolveCount(snapshot, () => snapshot.items.length)
}

async function countDefects() {
  const snapshot = await fetchObjectDefectsSnapshot()
  return resolveCount(snapshot, () => snapshot.items.length)
}

async function countParameters() {
  const snapshot = await fetchObjectParametersSnapshot()
  return resolveCount(snapshot, () => snapshot.items.length)
}

async function countSources() {
  const sources = await fetchSources()
  return resolveCount(sources, () => sources.length)
}

async function countWorks() {
  const payload = await rpc('data/loadProcessCharts', [0])
  return resolveCount(payload, () => extractRecords<RawWorkRecord>(payload).length)
}

async function loadNsiCounts(): Promise<NsiCounts> {
  const [objectTypes, components, defects, parameters, works, sources] = await Promise.all([
    safeCount('object types', countObjectTypes),
    safeCount('components', countComponents),
    safeCount('defects', countDefects),
    safeCount('parameters', countParameters),
    safeCount('works', countWorks),
    safeCount('sources', countSources),
  ])

  return { objectTypes, components, defects, parameters, works, sources }
}

export function useNsiCountsQuery(): UseQueryReturnType<NsiCounts, unknown> {
  return useQuery({
    queryKey: ['nsi', 'counts'],
    queryFn: loadNsiCounts,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    // Сразу отдаём объект с нулями, чтобы верстка не зависела от null
    placeholderData: () => ({
      objectTypes: 0,
      components: 0,
      defects: 0,
      parameters: 0,
      works: 0,
      sources: 0,
    }),
    select: (data) =>
      data ?? {
        objectTypes: 0,
        components: 0,
        defects: 0,
        parameters: 0,
        works: 0,
        sources: 0,
      },
  })
}
