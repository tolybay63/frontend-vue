import type {
  ActivityItem,
  MixedSearchItem,
  NsiCoverageResponse,
  RelationsCountsResponse,
  DiagnosticsResponse,
} from './dto'

export interface RpcCallContext {
  signal: AbortSignal
  headers: Record<string, string | string[] | undefined>
  timeoutMs: number
}

export interface RequestContext {
  headers?: Record<string, string | string[] | undefined>
  cacheKey?: string
  limit?: number
  query?: Record<string, string | string[] | undefined>
}

export interface NsiDashboardClients {
  fetchSources(ctx: RpcCallContext): Promise<unknown[]>
  fetchTypes(ctx: RpcCallContext): Promise<unknown[]>
  fetchComponents(ctx: RpcCallContext): Promise<unknown[]>
  fetchParams(ctx: RpcCallContext): Promise<unknown[]>
  fetchDefects(ctx: RpcCallContext): Promise<unknown[]>
  fetchWorks(ctx: RpcCallContext): Promise<unknown[]>
  fetchActivity?(ctx: RpcCallContext, limit: number): Promise<ActivityItem[]>
  search?(ctx: RpcCallContext, query: string): Promise<MixedSearchItem[]>
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export interface MetricsRecorder {
  observeDuration(metric: string, durationMs: number, labels?: Record<string, string>): void
  increment?(metric: string, labels?: Record<string, string>): void
}

export interface AggregatorOptions {
  ttlMs?: number
  timeoutMs?: number
  rpcTimeoutMs?: number
  enabled?: boolean
  logger?: Logger
  metrics?: MetricsRecorder | null
}

export interface AggregatedCollections {
  sources: unknown[]
  types: unknown[]
  components: unknown[]
  params: unknown[]
  defects: unknown[]
  works: unknown[]
}

export interface SnapshotResult {
  data: Partial<AggregatedCollections>
  partial: boolean
  missing: Array<keyof AggregatedCollections>
}

export interface CoverageResult {
  payload: NsiCoverageResponse
  collections: Partial<AggregatedCollections>
}

export interface DiagnosticsResult {
  payload: DiagnosticsResponse
  collections: Partial<AggregatedCollections>
}

export interface ActivityResult {
  payload: ActivityItem[]
  partial: boolean
}

export interface RelationsResult {
  payload: RelationsCountsResponse
}
