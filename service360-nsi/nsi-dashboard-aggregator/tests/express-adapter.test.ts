/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NsiDashboardAggregatorService, type NsiDashboardClients } from '../src/core'
import { registerNsiDashboardRoutes } from '../src/adapters/express'

describe('Express adapter integration', () => {
  const handlers = new Map<string, (...args: any[]) => any>()
  const router = {
    get(path: string, handler: (...args: any[]) => any) {
      handlers.set(path, handler)
    },
  }

  const baseClients: NsiDashboardClients = {
    async fetchSources() {
      return [{ id: '1', DocumentAuthor: 'A', DocumentApprovalDate: '2024-01-01', departmentIds: [1] }]
    },
    async fetchTypes() {
      return []
    },
    async fetchComponents() {
      return []
    },
    async fetchParams() {
      return []
    },
    async fetchDefects() {
      return []
    },
    async fetchWorks() {
      return []
    },
  }

  beforeEach(() => {
    handlers.clear()
  })

  it('returns 200 and cached coverage payload', async () => {
    const fetchSources = vi.fn(baseClients.fetchSources)
    const service = new NsiDashboardAggregatorService(
      { ...baseClients, fetchSources },
      { ttlMs: 100, timeoutMs: 1000, rpcTimeoutMs: 200 },
    )
    registerNsiDashboardRoutes(router, service)
    const handler = handlers.get('/nsi/dashboard/coverage')
    if (!handler) throw new Error('Handler not registered')

    const res = createMockResponse()
    await handler({ headers: {}, query: {} }, res, () => {})

    expect(res.statusCode).toBe(200)
    expect(res.payload.sources.total).toBe(1)
    expect(res.payload.sources.withIssuerDateExec).toBe(1)
    expect(fetchSources).toHaveBeenCalledTimes(1)

    const resSecond = createMockResponse()
    await handler({ headers: {}, query: {} }, resSecond, () => {})
    expect(fetchSources).toHaveBeenCalledTimes(1)

    await new Promise((resolve) => setTimeout(resolve, 120))
    const resThird = createMockResponse()
    await handler({ headers: {}, query: {} }, resThird, () => {})
    expect(fetchSources).toHaveBeenCalledTimes(2)
  })
})

function createMockResponse() {
  return {
    statusCode: 0,
    payload: null as any,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.payload = body
    },
  }
}
