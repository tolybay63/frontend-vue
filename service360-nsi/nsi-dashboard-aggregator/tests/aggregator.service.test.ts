import { describe, expect, it } from 'vitest'

import {
  NsiDashboardAggregatorService,
  type DiagnosticsResponse,
  type NsiCoverageResponse,
  type NsiDashboardClients,
  type RelationsCountsResponse,
} from '../src/core'

function createMockClients(overrides: Partial<NsiDashboardClients> = {}): NsiDashboardClients {
  const defaults: NsiDashboardClients = {
    async fetchSources() {
      return [
        {
          id: '1',
          DocumentAuthor: 'Минтранс',
          DocumentApprovalDate: '2023-01-01',
          departmentIds: [1, 2],
        },
        {
          id: '2',
          author: null,
          approvalDate: null,
          departments: [],
        },
      ]
    },
    async fetchTypes() {
      return [
        { id: '11', geometry: 'polygon', components: ['c1'] },
        { id: '12', geometry: '', components: [] },
      ]
    },
    async fetchComponents() {
      return [
        { id: '21', params: [{ id: 'p1' }], defects: [{ id: 'd1' }] },
        { id: '22', params: [], defects: [] },
      ]
    },
    async fetchParams() {
      return [
        { id: '31', unitName: 'мм', min: 0, max: 1 },
        { id: '32', unitName: null, min: null, max: null },
      ]
    },
    async fetchDefects() {
      return [
        { id: '41', categoryName: 'Категория', componentId: '21' },
        { id: '42', categoryName: null, component: null },
      ]
    },
    async fetchWorks() {
      return [
        { id: '51', sourceId: '1', objectTypeId: '11', periodicity: 12 },
        { id: '52', sourceId: null, objectTypeId: null, periodicity: null },
      ]
    },
  }

  return { ...defaults, ...overrides }
}

describe('NsiDashboardAggregatorService', () => {
  it('computes coverage metrics based on existing collections', async () => {
    const service = new NsiDashboardAggregatorService(createMockClients(), {
      ttlMs: 1000,
      timeoutMs: 1000,
      rpcTimeoutMs: 500,
    })

    const coverage = (await service.getCoverage({ headers: {} })) as NsiCoverageResponse

    expect(coverage.sources.total).toBe(2)
    expect(coverage.sources.withIssuerDateExec).toBe(1)
    expect(coverage.types.total).toBe(2)
    expect(coverage.types.withShape).toBe(1)
    expect(coverage.types.withComponents).toBe(1)
    expect(coverage.components.withParams).toBe(1)
    expect(coverage.components.withDefects).toBe(1)
    expect(coverage.params.withUnitsAndBounds).toBe(1)
    expect(coverage.defects.withCategoryAndComponent).toBe(1)
    expect(coverage.works.withTypePeriodSource).toBe(1)
    expect(coverage.partial).toBeUndefined()
  })

  it('marks responses as partial when fan-out fails', async () => {
    const failingClients = createMockClients({
      async fetchParams() {
        throw new Error('boom')
      },
    })
    const service = new NsiDashboardAggregatorService(failingClients, {
      ttlMs: 1000,
      timeoutMs: 1000,
      rpcTimeoutMs: 200,
    })

    const coverage = await service.getCoverage({ headers: {} })
    const diagnostics = (await service.getDiagnostics({ headers: {} })) as DiagnosticsResponse
    const relations = (await service.getRelationsCounts({ headers: {} })) as RelationsCountsResponse

    expect(coverage.partial).toBe(true)
    expect(diagnostics.partial).toBe(true)
    expect(relations.partial).toBe(true)
    const paramsDiagnostic = diagnostics.items.find((item) => item.code === 'PARAMS_WITHOUT_UNITS_OR_LIMITS')
    expect(paramsDiagnostic?.severity).toBe('info')
  })
})
