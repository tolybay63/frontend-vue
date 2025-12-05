import { Controller, Get, Module, Query, Req } from '@nestjs/common'
import type { Provider } from '@nestjs/common'
import type { Request } from 'express'

import {
  NsiDashboardAggregatorService,
  type AggregatorOptions,
  type NsiDashboardClients,
  type RequestContext,
} from '../core'

export const NSI_DASHBOARD_CLIENTS = Symbol('NSI_DASHBOARD_CLIENTS')
export const NSI_DASHBOARD_OPTIONS = Symbol('NSI_DASHBOARD_OPTIONS')

type NestRequest = Request & {
  headers: Record<string, string | string[] | undefined>
}

function toRequestContext(req: NestRequest): RequestContext {
  return {
    headers: req.headers,
  }
}

@Controller('nsi')
export class NsiDashboardController {
  constructor(private readonly aggregator: NsiDashboardAggregatorService) {}

  @Get('dashboard/coverage')
  getCoverage(@Req() req: NestRequest) {
    return this.aggregator.getCoverage(toRequestContext(req))
  }

  @Get('dashboard/diagnostics')
  getDiagnostics(@Req() req: NestRequest) {
    return this.aggregator.getDiagnostics(toRequestContext(req))
  }

  @Get('dashboard/relations-counts')
  getRelations(@Req() req: NestRequest) {
    return this.aggregator.getRelationsCounts(toRequestContext(req))
  }

  @Get('dashboard/activity')
  getActivity(@Req() req: NestRequest, @Query('limit') limit?: number) {
    const parsedLimit = typeof limit === 'number' ? limit : Number(limit)
    return this.aggregator.getActivity({
      ...toRequestContext(req),
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    })
  }

  @Get('search')
  search(@Req() req: NestRequest, @Query('q') query = '') {
    return this.aggregator.search(
      {
        ...toRequestContext(req),
        query: req.query as Record<string, string | string[] | undefined>,
      },
      query,
    )
  }
}

export const nsiDashboardProviders: Provider[] = [
  {
    provide: NSI_DASHBOARD_OPTIONS,
    useValue: undefined,
  },
  {
    provide: NsiDashboardAggregatorService,
    useFactory: (
      clients: NsiDashboardClients,
      options?: AggregatorOptions,
    ): NsiDashboardAggregatorService => new NsiDashboardAggregatorService(clients, options),
    inject: [NSI_DASHBOARD_CLIENTS, NSI_DASHBOARD_OPTIONS],
  },
]

@Module({
  controllers: [NsiDashboardController],
  providers: nsiDashboardProviders,
  exports: [NsiDashboardAggregatorService, NSI_DASHBOARD_CLIENTS, NSI_DASHBOARD_OPTIONS],
})
export class NsiDashboardModule {}
