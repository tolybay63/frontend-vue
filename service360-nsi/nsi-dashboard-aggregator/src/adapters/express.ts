import type {
  ActivityResponse,
  DiagnosticsResponse,
  MixedSearchItem,
  NsiCoverageResponse,
  RelationsCountsResponse,
} from '../core'
import { NsiDashboardAggregatorService } from '../core'
import type { RequestContext } from '../core/types'

export interface ExpressLikeRequest {
  headers: Record<string, string | string[] | undefined>
  query: Record<string, string | string[] | undefined>
}

export interface ExpressLikeResponse {
  status(code: number): ExpressLikeResponse
  json(payload: unknown): void
}

export type ExpressLikeNext = (error?: unknown) => void

export interface ExpressLikeRouter {
  get(path: string, handler: (req: ExpressLikeRequest, res: ExpressLikeResponse, next: ExpressLikeNext) => unknown): unknown
}

function toRequestContext(req: ExpressLikeRequest): RequestContext {
  return {
    headers: req.headers ?? {},
    query: req.query ?? {},
  }
}

async function resolveCoverage(service: NsiDashboardAggregatorService, ctx: RequestContext): Promise<NsiCoverageResponse> {
  return service.getCoverage(ctx)
}

async function resolveDiagnostics(
  service: NsiDashboardAggregatorService,
  ctx: RequestContext,
): Promise<DiagnosticsResponse> {
  return service.getDiagnostics(ctx)
}

async function resolveRelations(
  service: NsiDashboardAggregatorService,
  ctx: RequestContext,
): Promise<RelationsCountsResponse> {
  return service.getRelationsCounts(ctx)
}

async function resolveActivity(
  service: NsiDashboardAggregatorService,
  ctx: RequestContext,
): Promise<ActivityResponse> {
  const limitParam = ctx.query?.limit
  const limit = Array.isArray(limitParam) ? Number(limitParam[0]) : Number(limitParam ?? 7)
  return service.getActivity({ ...ctx, limit: Number.isFinite(limit) ? limit : 7 })
}

async function resolveSearch(
  service: NsiDashboardAggregatorService,
  ctx: RequestContext,
): Promise<MixedSearchItem[]> {
  const queryParam = ctx.query?.q
  const query = Array.isArray(queryParam) ? String(queryParam[0] ?? '') : String(queryParam ?? '')
  return service.search(ctx, query)
}

function handleError(res: ExpressLikeResponse, error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: unknown }).status) || 500
    res.status(status).json({ message: (error as Error).message ?? 'Internal error' })
    return
  }
  res.status(500).json({ message: 'Internal error' })
}

export function registerNsiDashboardRoutes(
  router: ExpressLikeRouter,
  service: NsiDashboardAggregatorService,
) {
  const wrap = <T>(resolver: (service: NsiDashboardAggregatorService, ctx: RequestContext) => Promise<T>) =>
    async (req: ExpressLikeRequest, res: ExpressLikeResponse, next: ExpressLikeNext) => {
      try {
        const ctx = toRequestContext(req)
        const payload = await resolver(service, ctx)
        res.status(200).json(payload)
      } catch (error) {
        if (typeof next === 'function') {
          next(error)
        } else {
          handleError(res, error)
        }
      }
    }

  router.get('/nsi/dashboard/coverage', wrap(resolveCoverage))
  router.get('/nsi/dashboard/diagnostics', wrap(resolveDiagnostics))
  router.get('/nsi/dashboard/relations-counts', wrap(resolveRelations))
  router.get('/nsi/dashboard/activity', wrap(resolveActivity))
  router.get('/nsi/search', wrap(resolveSearch))
}
