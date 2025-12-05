import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SaveDefectRecord } from '../model/dto'
import type { CreateObjectDefectPayload } from '../model/types'

vi.mock('@shared/api', () => ({
  rpc: vi.fn(),
}))

import { rpc } from '@shared/api'
import { createDefect, updateDefect } from './repository'

const rpcMock = vi.mocked(rpc)

const baseResponse: SaveDefectRecord[] = [
  {
    id: 'defect-id',
    name: 'defect-id',
  },
]

const basePayload: CreateObjectDefectPayload = {
  name: '  New defect  ',
  componentId: 'component-id',
  componentPvId: 'component-pv-id',
  categoryFvId: 'category-fv-id',
  categoryPvId: 'category-pv-id',
  index: '1',
  note: 'note',
}

describe('object defect repository mutations', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('sends trimmed name for createDefect', async () => {
    rpcMock.mockResolvedValueOnce(baseResponse)

    await createDefect(basePayload)

    expect(rpcMock).toHaveBeenCalledTimes(1)
    const [, params] = rpcMock.mock.calls[0] as [string, unknown[]]
    expect(Array.isArray(params)).toBe(true)
    const payload = (params as unknown[])[1] as Record<string, unknown>
    expect(payload).toHaveProperty('name', 'New defect')
  })

  it('sends trimmed name for updateDefect', async () => {
    rpcMock.mockResolvedValueOnce(baseResponse)

    await updateDefect({ ...basePayload, id: 'defect-id' })

    expect(rpcMock).toHaveBeenCalledTimes(1)
    const [, params] = rpcMock.mock.calls[0] as [string, unknown[]]
    expect(Array.isArray(params)).toBe(true)
    const payload = (params as unknown[])[1] as Record<string, unknown>
    expect(payload).toMatchObject({ name: 'New defect', id: 'defect-id' })
  })

  it('maps component pv id from generic pv field on createDefect', async () => {
    rpcMock.mockResolvedValueOnce([
      {
        idDefects: 'created-id',
        DefectsName: 'Created defect',
        objDefectsComponent: '1062',
        pv: 1024,
      } as unknown as SaveDefectRecord,
    ])

    const created = await createDefect(basePayload)

    expect(created.componentPvId).toBe('1024')
  })
})
