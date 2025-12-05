import { get } from '@shared/api/httpClient'
import { rpc } from '@shared/api'
import { extractRecords, normalizeText, toOptionalString } from '@shared/lib'
import { fetchSources } from '@entities/source'
import { fetchObjectTypesSnapshot } from '@entities/object-type'
import { fetchComponentsSnapshot } from '@entities/component'
import { fetchObjectParametersSnapshot } from '@entities/object-parameter'
import { fetchObjectDefectsSnapshot } from '@entities/object-defect'
import { normalizeCoverageResponse, normalizeDiagnosticsResponse, normalizeRelationsResponse } from '../model/normalize'
import type {
  ActivityResponse,
  DiagnosticsResponse,
  NsiCoverage,
  NsiCoverageResponse,
  NsiSearchResult,
  RelationsCounts,
  RelationsCountsResponse,
} from '../model/types'

export async function fetchNsiCoverage() {
  const response = await get<NsiCoverageResponse | NsiCoverage>('/nsi/dashboard/coverage')
  return normalizeCoverageResponse(response)
}

export async function fetchNsiDiagnostics() {
  const response = await get<DiagnosticsResponse | DiagnosticsResponse['items']>(
    '/nsi/dashboard/diagnostics',
  )
  return normalizeDiagnosticsResponse(response)
}

export async function fetchNsiActivity(limit = 7) {
  // Always use client-side aggregation (no backend dependency)
  const items = await aggregateNsiActivity(limit)
  // Do not mark as partial to avoid showing a warning badge in UI
  return { items } as ActivityResponse
}

export async function fetchNsiRelationsCounts() {
  const response = await get<RelationsCountsResponse | RelationsCounts>(
    '/nsi/dashboard/relations-counts',
  )
  return normalizeRelationsResponse(response)
}

// Fallback search across existing NSI repositories, when /nsi/search is unavailable
async function aggregateNsiSearch(query: string): Promise<NsiSearchResult[]> {
  const q = normalizeText(query)
  if (!q) return []

  type RawWorkRecord = { obj?: number | string | null; name?: string | null; fullName?: string | null }

  const tasks = await Promise.allSettled([
    // sources
    (async () => {
      const list = await fetchSources().catch(() => [])
      return list
        .filter((s) => {
          const hay = [s.name, s.DocumentNumber, s.DocumentAuthor, s.DocumentStartDate, s.DocumentEndDate]
            .map((v) => normalizeText((v as string | null) ?? ''))
          return hay.some((v) => v && v.includes(q))
        })
        .slice(0, 20)
        .map<NsiSearchResult>((s) => ({
          id: String(s.id),
          title: s.name,
          extra: s.DocumentNumber || undefined,
          type: 'sources',
        }))
    })(),
    // object types
    (async () => {
      const snap = await fetchObjectTypesSnapshot().catch(() => ({ items: [] as Array<{ id: string; name: string; geometry?: string | null }> }))
      return snap.items
        .filter((t) => normalizeText(t.name).includes(q))
        .slice(0, 20)
        .map<NsiSearchResult>((t) => ({
          id: t.id,
          title: t.name,
          extra: (t as { geometry?: string | null }).geometry ?? undefined,
          type: 'types',
        }))
    })(),
    // components
    (async () => {
      const snap = await fetchComponentsSnapshot().catch(() => ({ items: [] as Array<{ id: string; name: string }> }))
      return snap.items
        .filter((c) => normalizeText(c.name).includes(q))
        .slice(0, 20)
        .map<NsiSearchResult>((c) => ({ id: c.id, title: c.name, type: 'components' }))
    })(),
    // parameters
    (async () => {
      const snap = await fetchObjectParametersSnapshot().catch(() => ({ items: [] as Array<{ id: string; name: string; code?: string | null; unitName?: string | null; componentName?: string | null }> }))
      return snap.items
        .filter((p) => {
          const hay = [p.name, p.code, p.unitName, p.componentName].map((v) => normalizeText((v as string | null) ?? ''))
          return hay.some((v) => v && v.includes(q))
        })
        .slice(0, 20)
        .map<NsiSearchResult>((p) => ({
          id: p.id,
          title: p.name,
          extra: p.code ?? p.unitName ?? p.componentName ?? undefined,
          type: 'params',
        }))
    })(),
    // defects
    (async () => {
      const snap = await fetchObjectDefectsSnapshot().catch(() => ({ items: [] as Array<{ id: string; name: string; index?: string | null; categoryName?: string | null; componentName?: string | null }> }))
      return snap.items
        .filter((d) => {
          const hay = [d.name, d.index, d.categoryName, d.componentName].map((v) => normalizeText((v as string | null) ?? ''))
          return hay.some((v) => v && v.includes(q))
        })
        .slice(0, 20)
        .map<NsiSearchResult>((d) => ({
          id: d.id,
          title: d.name,
          extra: d.categoryName ?? d.index ?? d.componentName ?? undefined,
          type: 'defects',
        }))
    })(),
    // works
    (async () => {
      try {
        const payload = await rpc('data/loadProcessCharts', [0])
        const records = extractRecords<RawWorkRecord>(payload)
        return records
          .map((r) => ({ id: toOptionalString(r.obj), name: toOptionalString(r.name), fullName: toOptionalString(r.fullName) }))
          .filter((r) => r.id && (normalizeText(r.name).includes(q) || normalizeText(r.fullName).includes(q)))
          .slice(0, 20)
          .map<NsiSearchResult>((r) => ({ id: r.id as string, title: (r.name || r.fullName || r.id) as string, extra: r.fullName ?? undefined, type: 'works' }))
      } catch {
        return [] as NsiSearchResult[]
      }
    })(),
  ])

  const merged: NsiSearchResult[] = []
  for (const t of tasks) {
    if (t.status === 'fulfilled') merged.push(...t.value)
  }

  // Limit total results for dropdown responsiveness
  return merged.slice(0, 50)
}

export async function searchNsi(query: string) {
  try {
    const resp = await get<unknown>('/nsi/search', { params: { q: query } })
    // Validate server response; fallback if HTML/text or unexpected shape
    if (typeof resp === 'string') {
      if (import.meta.env.DEV) console.debug('[nsi-search] invalid HTML response, using fallback')
      return aggregateNsiSearch(query)
    }
    if (Array.isArray(resp)) {
      return resp as NsiSearchResult[]
    }
    if (resp && typeof resp === 'object') {
      const obj = resp as Record<string, unknown>
      const candidates =
        (Array.isArray(obj.items) && (obj.items as unknown[])) ||
        (Array.isArray(obj.records) && (obj.records as unknown[])) ||
        (Array.isArray(obj.data) && (obj.data as unknown[])) ||
        (obj.result &&
          ((Array.isArray(obj.result)
            ? (obj.result as unknown[])
            : Array.isArray((obj.result as { items?: unknown[] }).items)
              ? (((obj.result as { items?: unknown[] }).items as unknown[]))
              : null))) ||
        (obj.payload && Array.isArray((obj.payload as { items?: unknown[] }).items)
          ? (((obj.payload as { items?: unknown[] }).items as unknown[]))
          : null)

      if (Array.isArray(candidates)) {
        return candidates as NsiSearchResult[]
      }
    }
    if (import.meta.env.DEV) console.debug('[nsi-search] unexpected payload shape, using fallback')
    return aggregateNsiSearch(query)
  } catch (error) {
    if (import.meta.env.DEV) console.debug('[nsi-search] request failed, using fallback', error)
    // Fallback to client-side aggregation
    return aggregateNsiSearch(query)
  }
}

// Client-side recent activity aggregation (fallback when backend is absent)
async function aggregateNsiActivity(limit = 7): Promise<ActivityResponse['items']> {
  // We don't have real change timestamps on the client.
  // To avoid misleading users, do not set ts for aggregated items.
  // Keep it as an empty string so UI can hide it conditionally.
  const emptyTs = ''

  type RawRecord = Record<string, unknown>
  type RawWorkRecord = { obj?: number | string | null; name?: string | null }

  const mapSimple = (rec: RawRecord) => ({
    id: toOptionalString((rec as RawRecord).id ?? (rec as RawRecord).ID ?? (rec as RawRecord).number),
    name: toOptionalString(
      (rec as RawRecord).name ??
        (rec as RawRecord).NAME ??
        (rec as RawRecord).title ??
        (rec as RawRecord as { parameterName?: unknown }).parameterName ??
        (rec as RawRecord as { paramsName?: unknown }).paramsName ??
        (rec as RawRecord as { fullName?: unknown }).fullName,
    ),
  })

  const tasks = await Promise.allSettled([
    // sources
    (async () => {
      const list = await fetchSources().catch(() => [])
      const tail = list.slice(-5).reverse()
      return tail.map((s) => ({
        id: `activity:sources:${s.id}`,
        title: s.name,
        actor: 'Источники',
        ts: emptyTs,
        target: 'sources' as const,
        targetId: String(s.id),
      }))
    })(),
    // object types
    (async () => {
      const resp = await rpc('data/loadTypesObjects', [0]).catch(() => null)
      const raw = extractRecords<RawRecord>(resp)
      const tail = raw.slice(-5).reverse().map(mapSimple).filter((r) => r.id && r.name)
      return tail.map((t) => ({
        id: `activity:types:${t.id}`,
        title: t.name as string,
        actor: 'Типы объектов',
        ts: emptyTs,
        target: 'types' as const,
        targetId: t.id as string,
      }))
    })(),
    // components
    (async () => {
      const resp = await rpc('data/loadComponents', [0]).catch(() => null)
      const raw = extractRecords<RawRecord>(resp)
      const tail = raw.slice(-5).reverse().map(mapSimple).filter((r) => r.id && r.name)
      return tail.map((c) => ({
        id: `activity:components:${c.id}`,
        title: c.name as string,
        actor: 'Компоненты',
        ts: emptyTs,
        target: 'components' as const,
        targetId: c.id as string,
      }))
    })(),
    // parameters
    (async () => {
      const resp = await rpc('data/loadParameters', [0]).catch(() => null)
      const raw = extractRecords<RawRecord>(resp)
      const tail = raw.slice(-5).reverse().map(mapSimple).filter((r) => r.id && r.name)
      return tail.map((p) => ({
        id: `activity:params:${p.id}`,
        title: p.name as string,
        actor: 'Параметры',
        ts: emptyTs,
        target: 'params' as const,
        targetId: p.id as string,
      }))
    })(),
    // defects
    (async () => {
      const resp = await rpc('data/loadDefects', [0]).catch(() => null)
      const raw = extractRecords<RawRecord>(resp)
      const tail = raw.slice(-5).reverse().map(mapSimple).filter((r) => r.id && r.name)
      return tail.map((d) => ({
        id: `activity:defects:${d.id}`,
        title: d.name as string,
        actor: 'Дефекты',
        ts: emptyTs,
        target: 'defects' as const,
        targetId: d.id as string,
      }))
    })(),
    // works
    (async () => {
      try {
        const payload = await rpc('data/loadProcessCharts', [0])
        const records = extractRecords<RawWorkRecord>(payload)
        const tail = records
          .map((r) => ({ id: toOptionalString(r.obj), name: toOptionalString(r.name) }))
          .filter((r) => r.id && r.name)
          .slice(-5)
          .reverse()
        return tail.map((w) => ({
          id: `activity:works:${w.id}`,
          title: String(w.name),
          actor: 'Работы',
          ts: emptyTs,
          target: 'works' as const,
          targetId: String(w.id),
        }))
      } catch {
        return [] as ActivityResponse['items']
      }
    })(),
  ])

  // Interleave segments round-robin to keep the feed mixed
  const segments: ActivityResponse['items'][] = []
  for (const t of tasks) {
    if (t.status === 'fulfilled') segments.push(t.value)
  }

  const result: ActivityResponse['items'] = []
  let cursor = 0
  const hasItems = () => segments.some((s) => s.length > 0)
  while (result.length < limit && hasItems()) {
    const seg = segments[cursor % segments.length]
    if (seg.length) {
      const entry = seg.shift()!
      result.push(entry)
    }
    cursor += 1
  }

  return result
}
