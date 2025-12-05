import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@shared/api', () => ({
  rpc: vi.fn(),
}))

import { rpc } from '@shared/api'
import { updateParameter } from '../repository'
import type { UpdateParameterPayload } from '../../model/types'

type RpcCall = Parameters<typeof rpc>

const rpcMock = vi.mocked(rpc)

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const basePayload: UpdateParameterPayload = {
  id: 10,
  name: 'Боковой износ, мм',
  description: 'контроль допустимого износа',
  measure: { id: 1008, pv: 1321, name: 'мм' },
  source: { id: 2751, pv: 1044, name: 'Паспорт' },
  component: { cls: 1027, relcls: 1074, rcm: 1149, ent: 3466, name: 'Рельсы' },
  limits: {
    max: 13,
    min: 7,
    norm: 10,
    comment: 'Измерения ежемесячно',
  },
  accessLevel: 1,
  details: {
    id: 4101,
    cls: 1041,
    accessLevel: 1,
    measureRecordId: 901,
    measureId: 1008,
    measurePv: 1321,
    sourceRecordId: 1201,
    sourceObjId: 2751,
    sourcePv: 1044,
    descriptionRecordId: 1301,
    componentRelationId: 1838,
    componentRelationName: 'Боковой износ, мм <=> Рельсы',
    componentCls: 1027,
    componentRelcls: 1074,
    componentRcm: 1149,
    componentEnt: 3466,
    limitMaxId: 5101,
    limitMinId: 5102,
    limitNormId: 5103,
  },
}

function setupRpcMock(
  payload: UpdateParameterPayload,
  overrides: Partial<Record<string, unknown>> = {},
): { saveValueCalls: RpcCall[] } {
  const saveValueCalls: RpcCall[] = []
  const refreshedRecord: Record<string, unknown> = {
    id: payload.details.componentRelationId,
    idro: payload.details.componentRelationId,
    name: `${payload.name} <=> ${payload.component.name}`,
    ParamsLimitMax: payload.limits.max,
    idParamsLimitMax: payload.details.limitMaxId,
    ParamsLimitMin: payload.limits.min,
    idParamsLimitMin: payload.details.limitMinId,
    ParamsLimitNorm: payload.limits.norm,
    idParamsLimitNorm: payload.details.limitNormId,
    cmt: payload.limits.comment,
    ...overrides,
  }

  rpcMock.mockImplementation(async (method, params) => {
    switch (method) {
      case 'data/saveParams':
        return [
          {
            idCollections: payload.details.sourceRecordId,
            idParamsMeasure: payload.details.measureRecordId,
            idParamsDescription: payload.details.descriptionRecordId,
          },
        ]
      case 'data/saveParamComponentValue':
        saveValueCalls.push([method, params])
        return []
      case 'data/editRelObj':
        return []
      case 'data/loadParamsComponent':
        return [refreshedRecord]
      default:
        throw new Error(`Unexpected RPC method ${method}`)
    }
  })

  return { saveValueCalls }
}

describe('updateParameter – limit persistence', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('updates existing limit values using upd mode and passes identifiers', async () => {
    const payload = clone(basePayload)
    const { saveValueCalls } = setupRpcMock(payload)

    await updateParameter(payload)

    const maxCall = saveValueCalls.find((call) => {
      const [, params] = call
      const [first] = Array.isArray(params) ? params : []
      return first && (first as Record<string, unknown>).codProp === 'Prop_ParamsLimitMax'
    })

    expect(maxCall).toBeDefined()
    const [, params] = maxCall!
    const [maxPayload] = params as [Record<string, unknown>]

    expect(maxPayload).toMatchObject({
      mode: 'upd',
      codProp: 'Prop_ParamsLimitMax',
      own: payload.details.componentRelationId,
      idPropVal: payload.details.limitMaxId,
      idParamsLimitMax: payload.details.limitMaxId,
      val: String(payload.limits.max),
    })
    expect(maxPayload.name).toBe(`${payload.name} <=> ${payload.component.name}`)
  })

  it('inserts missing limit values without identifiers', async () => {
    const payload = clone(basePayload)
    payload.limits.norm = 11
    payload.details.limitNormId = null
    const { saveValueCalls } = setupRpcMock(payload, { idParamsLimitNorm: 8901 })

    await updateParameter(payload)

    const normCall = saveValueCalls.find((call) => {
      const [, params] = call
      const [first] = Array.isArray(params) ? params : []
      return first && (first as Record<string, unknown>).codProp === 'Prop_ParamsLimitNorm'
    })

    expect(normCall).toBeDefined()
    const [, params] = normCall!
    const [normPayload] = params as [Record<string, unknown>]

    expect(normPayload).toMatchObject({
      mode: 'ins',
      codProp: 'Prop_ParamsLimitNorm',
      own: payload.details.componentRelationId,
      val: String(payload.limits.norm),
    })
    expect(normPayload).not.toHaveProperty('idPropVal')
    expect(normPayload).not.toHaveProperty('idParamsLimitNorm')
  })
})
