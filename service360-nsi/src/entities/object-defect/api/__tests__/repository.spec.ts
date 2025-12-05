import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@shared/api', () => ({
  rpc: vi.fn(),
}))

import { rpc } from '@shared/api'
import { deleteDefectOwnerWithProperties } from '../repository'

const rpcMock = vi.mocked(rpc)

describe('deleteDefectOwnerWithProperties', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('returns success when rpc resolves without message', async () => {
    rpcMock.mockResolvedValueOnce(null)

    const result = await deleteDefectOwnerWithProperties(10)

    expect(result).toEqual({ success: true })
    expect(rpcMock).toHaveBeenCalledWith('data/deleteOwnerWithProperties', [10, 1])
  })

  it('returns failure when rpc resolves with a message', async () => {
    rpcMock.mockResolvedValueOnce('Дефект используется')

    const result = await deleteDefectOwnerWithProperties(5)

    expect(result).toEqual({ success: false, reason: 'Дефект используется' })
  })

  it('returns failure when rpc throws', async () => {
    rpcMock.mockRejectedValueOnce(new Error('Network error'))

    const result = await deleteDefectOwnerWithProperties(7)

    expect(result).toEqual({ success: false, reason: 'Network error' })
  })
})
