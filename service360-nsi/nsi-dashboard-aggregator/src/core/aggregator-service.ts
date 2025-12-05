import {
  ActivityResponse,
  DiagnosticsResponse,
  MixedSearchItem,
  NsiCoverageResponse,
  RelationsCountsResponse,
} from './dto'
import {
  AggregatedCollections,
  AggregatorOptions,
  Logger,
  MetricsRecorder,
  NsiDashboardClients,
  RequestContext,
  RpcCallContext,
  SnapshotResult,
} from './types'
import { TtlCache } from './cache'
import {
  coerceId,
  ensureArray,
  hasArrayValue,
  hasTruthy,
  normalizeString,
  readProperty,
  toIsoString,
  uniqueBy,
} from './utils'

type CollectionKey = keyof AggregatedCollections

const DEFAULT_TTL_MS = Number(process.env.NSI_DASHBOARD_TTL_MS ?? 3000) || 3000
const DEFAULT_TIMEOUT_MS = Number(process.env.NSI_DASHBOARD_TIMEOUT_MS ?? 3000) || 3000
const DEFAULT_RPC_TIMEOUT_MS = 1800
const FEATURE_FLAG = process.env.NSI_DASHBOARD_ENABLED

const collectionEntries: Array<[
  CollectionKey,
  (clients: NsiDashboardClients) => (ctx: RpcCallContext) => Promise<unknown[]>,
]> = [
  ['sources', (clients) => clients.fetchSources.bind(clients)],
  ['types', (clients) => clients.fetchTypes.bind(clients)],
  ['components', (clients) => clients.fetchComponents.bind(clients)],
  ['params', (clients) => clients.fetchParams.bind(clients)],
  ['defects', (clients) => clients.fetchDefects.bind(clients)],
  ['works', (clients) => clients.fetchWorks.bind(clients)],
]

interface DiagnosticDefinition {
  code: string
  title: string
  severity: 'info' | 'warning' | 'critical'
  target: CollectionKey
  linkQuery: Record<string, string>
  counter: (collections: Partial<AggregatedCollections>) => number | null
}

function pickLogger(logger?: Logger): Logger {
  if (logger) return logger
  return {
    info(message: string, meta?: Record<string, unknown>) {
      console.info(message, meta ?? {})
    },
    warn(message: string, meta?: Record<string, unknown>) {
      console.warn(message, meta ?? {})
    },
    error(message: string, meta?: Record<string, unknown>) {
      console.error(message, meta ?? {})
    },
  }
}

function now(): number {
  return Date.now()
}

function millisecondsBetween(start: number, end: number): number {
  return Math.max(0, end - start)
}

export class NsiDashboardAggregatorService {
  private readonly ttlMs: number
  private readonly timeoutMs: number
  private readonly rpcTimeoutMs: number
  private readonly enabled: boolean
  private readonly logger: Logger
  private readonly metrics: MetricsRecorder | null
  private readonly coverageCache: TtlCache<NsiCoverageResponse>
  private readonly diagnosticsCache: TtlCache<DiagnosticsResponse>
  private readonly relationsCache: TtlCache<RelationsCountsResponse>
  private readonly activityCache: TtlCache<ActivityResponse>

  constructor(private readonly clients: NsiDashboardClients, options: AggregatorOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.rpcTimeoutMs = options.rpcTimeoutMs ?? Math.min(this.timeoutMs, DEFAULT_RPC_TIMEOUT_MS)
    const enabledFlag = typeof options.enabled === 'boolean' ? options.enabled : FEATURE_FLAG !== 'false'
    this.enabled = enabledFlag
    this.logger = pickLogger(options.logger)
    this.metrics = options.metrics ?? null
    this.coverageCache = new TtlCache<NsiCoverageResponse>(this.ttlMs)
    this.diagnosticsCache = new TtlCache<DiagnosticsResponse>(this.ttlMs)
    this.relationsCache = new TtlCache<RelationsCountsResponse>(this.ttlMs)
    this.activityCache = new TtlCache<ActivityResponse>(this.ttlMs)
  }

  ensureEnabled(): void {
    if (!this.enabled) {
      const error = new Error('NSI dashboard aggregator is disabled')
      ;(error as Error & { status?: number }).status = 404
      throw error
    }
  }

  async getCoverage(ctx: RequestContext = {}): Promise<NsiCoverageResponse> {
    this.ensureEnabled()
    const cacheKey = this.composeCacheKey('coverage', ctx)
    return this.coverageCache.getOrSet(cacheKey, async () => {
      const { data, partial } = await this.collectSnapshot(ctx)
      const coverage = this.computeCoverage(data)
      return { ...coverage, partial: partial || undefined }
    })
  }

  async getDiagnostics(ctx: RequestContext = {}): Promise<DiagnosticsResponse> {
    this.ensureEnabled()
    const cacheKey = this.composeCacheKey('diagnostics', ctx)
    return this.diagnosticsCache.getOrSet(cacheKey, async () => {
      const { data, partial } = await this.collectSnapshot(ctx)
      const diagnostics = this.computeDiagnostics(data, partial)
      return diagnostics
    })
  }

  async getRelationsCounts(ctx: RequestContext = {}): Promise<RelationsCountsResponse> {
    this.ensureEnabled()
    const cacheKey = this.composeCacheKey('relations', ctx)
    return this.relationsCache.getOrSet(cacheKey, async () => {
      const { data, partial } = await this.collectSnapshot(ctx)
      const payload = this.computeRelations(data)
      return { ...payload, partial: partial || undefined }
    })
  }

  async getActivity(ctx: RequestContext = {}): Promise<ActivityResponse> {
    this.ensureEnabled()
    const cacheKey = this.composeCacheKey('activity', ctx)
    return this.activityCache.getOrSet(cacheKey, async () => {
      const limit = typeof ctx.limit === 'number' && Number.isFinite(ctx.limit) ? ctx.limit : 7
      const { data, partial } = await this.collectSnapshot(ctx)
      const activity = await this.computeActivity(data, ctx, limit, partial)
      return { items: activity, partial: partial || undefined }
    })
  }

  async search(ctx: RequestContext, query: string): Promise<MixedSearchItem[]> {
    this.ensureEnabled()
    const normalized = query.trim()
    if (normalized.length < 2) {
      return []
    }

    const start = now()
    if (typeof this.clients.search === 'function') {
      try {
        const controller = new AbortController()
        const rpcCtx = this.createRpcContext(ctx, controller, this.rpcTimeoutMs)
        const result = await this.clients.search(rpcCtx, normalized)
        this.observeDuration('search.ok', start, now())
        return Array.isArray(result) ? (result as MixedSearchItem[]) : []
      } catch (error) {
        this.logger.warn('nsi-dashboard search fallback triggered', { error })
      }
    }

    const { data } = await this.collectSnapshot(ctx)
    const fallbackResults = this.computeSearch(data, normalized)
    this.observeDuration('search.fallback', start, now())
    return fallbackResults
  }

  private composeCacheKey(prefix: string, ctx: RequestContext): string {
    const tenant = ctx.cacheKey ?? 'global'
    return `${prefix}:${tenant}`
  }

  private createRpcContext(
    ctx: RequestContext,
    controller: AbortController,
    timeoutMs: number,
  ): RpcCallContext {
    return {
      signal: controller.signal,
      headers: ctx.headers ?? {},
      timeoutMs,
    }
  }

  private async collectSnapshot(ctx: RequestContext): Promise<SnapshotResult> {
    const deadline = now() + this.timeoutMs
    const snapshot: SnapshotResult = { data: {}, partial: false, missing: [] }

    const promises = collectionEntries.map(async ([key, selector]) => {
      const fetcher = selector(this.clients)
      const startedAt = now()
      const controller = new AbortController()
      const remaining = Math.max(100, Math.min(this.rpcTimeoutMs, deadline - startedAt))
      if (remaining <= 0) {
        snapshot.partial = true
        snapshot.missing.push(key)
        this.logger.warn('nsi-dashboard fanout skipped due to timeout budget', { key })
        return
      }

      const rpcCtx = this.createRpcContext(ctx, controller, remaining)
      const timeoutTimer = setTimeout(() => {
        controller.abort(new Error(`NSI dashboard RPC timeout for ${key}`))
      }, remaining)

      try {
        const result = await fetcher(rpcCtx)
        const items = ensureArray<unknown>(result)
        snapshot.data[key] = items
        this.observeDuration('fanout.ok', startedAt, now(), { key })
      } catch (error) {
        snapshot.partial = true
        snapshot.missing.push(key)
        this.observeDuration('fanout.error', startedAt, now(), { key })
        this.logger.warn('nsi-dashboard fanout failed', { key, error })
      } finally {
        clearTimeout(timeoutTimer)
      }
    })

    await Promise.all(promises)
    return snapshot
  }

  private computeCoverage(collections: Partial<AggregatedCollections>): NsiCoverageResponse {
    const sources = ensureArray(collections.sources)
    const types = ensureArray(collections.types)
    const components = ensureArray(collections.components)
    const params = ensureArray(collections.params)
    const defects = ensureArray(collections.defects)
    const works = ensureArray(collections.works)

    const sourcesFilled = sources.filter((item) =>
      hasTruthy(item, [
        'DocumentAuthor',
        'author',
        'issuer',
        'organ',
        'organization',
        'details.author',
      ]) &&
      hasTruthy(item, [
        'DocumentApprovalDate',
        'approvalDate',
        'approvedAt',
        'DocumentDate',
        'date',
        'details.approvalDate',
      ]) &&
      hasArrayValue(item, [
        'departmentIds',
        'departments',
        'executors',
        'executorIds',
        'performers',
        'responsibles',
        'details.departmentIds',
      ]),
    ).length

    const typesWithShape = types.filter((item) =>
      hasTruthy(item, [
        'geometry',
        'shape',
        'geometryKind',
        'shapeType',
        'geometry.type',
        'details.geometry',
      ]),
    ).length

    const typesWithComponents = types.filter((item) =>
      hasArrayValue(item, [
        'component',
        'components',
        'componentIds',
        'componentsIds',
        'componentLinks',
        'componentsList',
      ]),
    ).length

    const componentsWithParams = components.filter((item) =>
      hasArrayValue(item, [
        'parameters',
        'params',
        'parameterLinks',
        'parameterIds',
        'paramsList',
        'parameterRelations',
      ]),
    ).length

    const componentsWithDefects = components.filter((item) =>
      hasArrayValue(item, [
        'defects',
        'defectLinks',
        'defectIds',
        'defectsList',
        'defectRelations',
      ]),
    ).length

    const paramsFilled = params.filter((item) => {
      const hasUnits = hasTruthy(item, [
        'unit',
        'unitName',
        'unitId',
        'measure',
        'measureName',
        'measureLabel',
        'details.unit',
        'details.measure',
      ])

      const hasBounds =
        (hasTruthy(item, ['min', 'minValue', 'lowerBound', 'limitMin', 'limits.min', 'limits.lower']) &&
          hasTruthy(item, ['max', 'maxValue', 'upperBound', 'limitMax', 'limits.max', 'limits.upper'])) ||
        hasTruthy(item, ['norm', 'normValue', 'targetValue', 'defaultValue', 'details.norm'])

      return hasUnits && hasBounds
    }).length

    const defectsFilled = defects.filter((item) =>
      hasTruthy(item, ['category', 'categoryName', 'categoryId', 'defectCategory', 'category.label']) &&
      (hasTruthy(item, ['componentId', 'component', 'componentName', 'component.label']) ||
        hasArrayValue(item, ['componentIds', 'components'])),
    ).length

    const worksFilled = works.filter((item) =>
      hasTruthy(item, [
        'objectTypeId',
        'objectType',
        'typeId',
        'type',
        'workTypeId',
        'workType',
        'details.objectType',
      ]) &&
      hasTruthy(item, [
        'periodicity',
        'period',
        'periodType',
        'periodicityValue',
        'interval',
        'schedule',
        'details.periodicity',
      ]) &&
      hasTruthy(item, [
        'sourceId',
        'source',
        'documentId',
        'document',
        'sourceName',
        'details.source',
      ]),
    ).length

    return {
      sources: { total: sources.length, withIssuerDateExec: sourcesFilled },
      types: { total: types.length, withShape: typesWithShape, withComponents: typesWithComponents },
      components: {
        total: components.length,
        withParams: componentsWithParams,
        withDefects: componentsWithDefects,
      },
      params: { total: params.length, withUnitsAndBounds: paramsFilled },
      defects: { total: defects.length, withCategoryAndComponent: defectsFilled },
      works: { total: works.length, withTypePeriodSource: worksFilled },
    }
  }

  private computeDiagnostics(
    collections: Partial<AggregatedCollections>,
    partial: boolean,
  ): DiagnosticsResponse {
    const definitions: DiagnosticDefinition[] = [
      {
        code: 'WORKS_WITHOUT_SOURCE',
        title: 'Работы без источника документа',
        severity: 'warning',
        target: 'works',
        linkQuery: { missing: 'source' },
        counter: ({ works }) => {
          if (!works) return null
          const items = ensureArray(works)
          return items.filter(
            (item) =>
              !hasTruthy(item, ['sourceId', 'source', 'documentId', 'document', 'sourceName', 'details.source']),
          ).length
        },
      },
      {
        code: 'WORKS_WITHOUT_PERIODICITY',
        title: 'Работы без периодичности',
        severity: 'warning',
        target: 'works',
        linkQuery: { missing: 'periodicity' },
        counter: ({ works }) => {
          if (!works) return null
          const items = ensureArray(works)
          return items.filter(
            (item) =>
              !hasTruthy(item, [
                'periodicity',
                'period',
                'periodType',
                'periodicityValue',
                'interval',
                'details.periodicity',
              ]),
          ).length
        },
      },
      {
        code: 'TYPES_WITHOUT_SHAPE',
        title: 'Типы объектов без геометрии',
        severity: 'warning',
        target: 'types',
        linkQuery: { missing: 'geometry' },
        counter: ({ types }) => {
          if (!types) return null
          const items = ensureArray(types)
          return items.filter(
            (item) =>
              !hasTruthy(item, [
                'geometry',
                'shape',
                'geometryKind',
                'shapeType',
                'geometry.type',
                'details.geometry',
              ]),
          ).length
        },
      },
      {
        code: 'TYPES_WITHOUT_COMPONENTS',
        title: 'Типы объектов без компонентов',
        severity: 'warning',
        target: 'types',
        linkQuery: { missing: 'components' },
        counter: ({ types }) => {
          if (!types) return null
          const items = ensureArray(types)
          return items.filter(
            (item) =>
              !hasArrayValue(item, [
                'component',
                'components',
                'componentIds',
                'componentLinks',
                'componentsList',
              ]),
          ).length
        },
      },
      {
        code: 'COMPONENTS_WITHOUT_PARAMS',
        title: 'Компоненты без параметров контроля',
        severity: 'warning',
        target: 'components',
        linkQuery: { missing: 'params' },
        counter: ({ components }) => {
          if (!components) return null
          const items = ensureArray(components)
          return items.filter(
            (item) =>
              !hasArrayValue(item, [
                'parameters',
                'params',
                'parameterLinks',
                'parameterIds',
                'paramsList',
              ]),
          ).length
        },
      },
      {
        code: 'COMPONENTS_WITHOUT_DEFECTS',
        title: 'Компоненты без привязанных дефектов',
        severity: 'info',
        target: 'components',
        linkQuery: { missing: 'defects' },
        counter: ({ components }) => {
          if (!components) return null
          const items = ensureArray(components)
          return items.filter(
            (item) =>
              !hasArrayValue(item, [
                'defects',
                'defectLinks',
                'defectIds',
                'defectsList',
                'defectRelations',
              ]),
          ).length
        },
      },
      {
        code: 'PARAMS_WITHOUT_UNITS_OR_LIMITS',
        title: 'Параметры без единиц измерения или пределов',
        severity: 'warning',
        target: 'params',
        linkQuery: { missing: 'units' },
        counter: ({ params }) => {
          if (!params) return null
          const items = ensureArray(params)
          return items.filter((item) => {
            const hasUnits = hasTruthy(item, [
              'unit',
              'unitName',
              'unitId',
              'measure',
              'measureName',
              'measureLabel',
              'details.unit',
            ])
            const hasBounds =
              (hasTruthy(item, ['min', 'minValue', 'lowerBound', 'limitMin', 'limits.min', 'limits.lower']) &&
                hasTruthy(item, ['max', 'maxValue', 'upperBound', 'limitMax', 'limits.max', 'limits.upper'])) ||
              hasTruthy(item, ['norm', 'normValue', 'targetValue', 'defaultValue', 'details.norm'])
            return !hasUnits || !hasBounds
          }).length
        },
      },
      {
        code: 'DEFECTS_WITHOUT_CATEGORY',
        title: 'Дефекты без категории',
        severity: 'warning',
        target: 'defects',
        linkQuery: { missing: 'category' },
        counter: ({ defects }) => {
          if (!defects) return null
          const items = ensureArray(defects)
          return items.filter(
            (item) =>
              !hasTruthy(item, ['category', 'categoryName', 'categoryId', 'defectCategory', 'category.label']),
          ).length
        },
      },
      {
        code: 'DEFECTS_WITHOUT_COMPONENT',
        title: 'Дефекты без привязки к компоненту',
        severity: 'warning',
        target: 'defects',
        linkQuery: { missing: 'component' },
        counter: ({ defects }) => {
          if (!defects) return null
          const items = ensureArray(defects)
          return items.filter(
            (item) =>
              !hasTruthy(item, ['componentId', 'component', 'componentName', 'component.label']) &&
              !hasArrayValue(item, ['componentIds', 'components']),
          ).length
        },
      },
    ]

    const items = definitions.map((definition) => {
      const value = definition.counter(collections)
      const count = value ?? 0
      const severity = partial ? 'info' : definition.severity
      return {
        code: definition.code,
        title: definition.title,
        count,
        severity,
        linkQuery: definition.linkQuery,
        target: definition.target,
      }
    })

    return { items, partial: partial || undefined }
  }

  private computeRelations(collections: Partial<AggregatedCollections>): RelationsCountsResponse {
    return {
      sources: ensureArray(collections.sources).length,
      types: ensureArray(collections.types).length,
      components: ensureArray(collections.components).length,
      params: ensureArray(collections.params).length,
      defects: ensureArray(collections.defects).length,
      works: ensureArray(collections.works).length,
    }
  }

  private async computeActivity(
    collections: Partial<AggregatedCollections>,
    ctx: RequestContext,
    limit: number,
    partial: boolean,
  ): Promise<ActivityResponse['items']> {
    const start = now()
    if (typeof this.clients.fetchActivity === 'function') {
      try {
        const controller = new AbortController()
        const rpcCtx = this.createRpcContext(ctx, controller, this.rpcTimeoutMs)
        const result = await this.clients.fetchActivity(rpcCtx, limit)
        const normalized = ensureArray(result)
        this.observeDuration('activity.ok', start, now())
        if (normalized.length) {
          return normalized.slice(0, limit) as ActivityResponse['items']
        }
      } catch (error) {
        this.logger.warn('nsi-dashboard activity fallback triggered', { error })
        this.observeDuration('activity.error', start, now())
      }
    }

    const fallback = this.buildFallbackActivity(collections)
    if (partial) {
      return fallback.slice(0, limit).map((item) => ({ ...item, actor: item.actor || 'system' }))
    }
    return fallback.slice(0, limit)
  }

  private buildFallbackActivity(collections: Partial<AggregatedCollections>): ActivityResponse['items'] {
    const pairs: Array<{ target: CollectionKey; record: unknown }> = []
    for (const key of Object.keys(collections) as CollectionKey[]) {
      const list = ensureArray(collections[key])
      for (const record of list) {
        pairs.push({ target: key, record })
      }
    }

    const items = pairs
      .map((entry) => {
        const id =
          coerceId(readProperty(entry.record, 'id')) ||
          coerceId(readProperty(entry.record, 'obj')) ||
          coerceId(readProperty(entry.record, 'number'))

        const title =
          normalizeString(readProperty(entry.record, 'name')) ||
          normalizeString(readProperty(entry.record, 'title')) ||
          normalizeString(readProperty(entry.record, 'label')) ||
          (id ? `${entry.target} #${id}` : null)

        const actor =
          normalizeString(readProperty(entry.record, 'updatedBy')) ||
          normalizeString(readProperty(entry.record, 'author')) ||
          normalizeString(readProperty(entry.record, 'user')) ||
          'system'

        const ts =
          toIsoString(readProperty(entry.record, 'updatedAt')) ||
          toIsoString(readProperty(entry.record, 'ts')) ||
          toIsoString(readProperty(entry.record, 'modifiedAt')) ||
          toIsoString(readProperty(entry.record, 'createdAt'))

        const targetId = id ?? `idx:${Math.random().toString(36).slice(2)}`

        if (!ts || !title) return null

        return {
          id: `${entry.target}:${targetId}:${ts}`,
          title,
          actor,
          ts,
          target: entry.target,
          targetId,
        }
      })
      .filter((item): item is ActivityResponse['items'][number] => Boolean(item))

    const unique = uniqueBy(items, (item) => item.id)
    unique.sort((a, b) => (a.ts > b.ts ? -1 : a.ts < b.ts ? 1 : 0))
    return unique
  }

  private computeSearch(
    collections: Partial<AggregatedCollections>,
    query: string,
  ): MixedSearchItem[] {
    const normalized = query.toLowerCase()
    const results: MixedSearchItem[] = []

    const pushIfMatch = (item: unknown, target: CollectionKey) => {
      const id =
        coerceId(readProperty(item, 'id')) ||
        coerceId(readProperty(item, 'obj')) ||
        coerceId(readProperty(item, 'number'))
      if (!id) return

      const title =
        normalizeString(readProperty(item, 'name')) ||
        normalizeString(readProperty(item, 'title')) ||
        normalizeString(readProperty(item, 'label'))
      const extra =
        normalizeString(readProperty(item, 'DocumentNumber')) ||
        normalizeString(readProperty(item, 'DocumentApprovalDate')) ||
        normalizeString(readProperty(item, 'categoryName')) ||
        normalizeString(readProperty(item, 'objectTypeName')) ||
        normalizeString(readProperty(item, 'sourceName'))

      const haystack = [id, title, extra]
        .filter(Boolean)
        .map((value) => value!.toString().toLowerCase())
      if (!haystack.some((value) => value.includes(normalized))) {
        return
      }

      results.push({ id, type: target, title: title ?? `${target} #${id}`, extra: extra ?? undefined })
    }

    for (const key of Object.keys(collections) as CollectionKey[]) {
      const items = ensureArray(collections[key])
      for (const item of items) pushIfMatch(item, key)
    }

    return results.slice(0, 50)
  }

  private observeDuration(
    metric: string,
    start: number,
    end: number,
    labels?: Record<string, string>,
  ) {
    const duration = millisecondsBetween(start, end)
    if (this.metrics) {
      this.metrics.observeDuration(`nsi_dashboard_${metric}`, duration, labels)
      this.metrics.increment?.(`nsi_dashboard_${metric}_count`, labels)
    } else {
      this.logger.info('nsi-dashboard metric', { metric, duration, ...(labels ?? {}) })
    }
  }
}
