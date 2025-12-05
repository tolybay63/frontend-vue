import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMeasureAndSelect } from '../measureMeta'

vi.mock('@shared/api', () => ({
  metaRpc: vi.fn(),
}))

const { metaRpc } = await import('@shared/api')
const metaRpcMock = vi.mocked(metaRpc)

describe('createMeasureAndSelect', () => {
  beforeEach(() => {
    metaRpcMock.mockReset()
  })

  it('keeps previously checked prop values even if backend marks them with "on"', async () => {
    metaRpcMock
      .mockResolvedValueOnce({
        records: [
          {
            id: 111,
            cod: 'new',
            accessLevel: 1,
            kFromBase: 1,
            name: 'Новая единица',
            fullName: 'Новая единица',
          },
        ],
      })
      .mockResolvedValueOnce({
        records: [
          {
            id: 201,
            cod: 'existing',
            name: 'Существующая',
            fullName: 'Существующая',
            checked: 'on',
            leaf: '1',
            level: '0',
            pv: 301,
            propValId: 401,
          },
          {
            id: 555,
            cod: 'new',
            name: 'Новая единица',
            fullName: 'Новая единица',
            checked: 0,
            pv: 777,
            propValId: 888,
          },
        ],
      })
      .mockResolvedValueOnce({ result: true })

    const option = await createMeasureAndSelect('Новая единица')

    expect(metaRpcMock).toHaveBeenNthCalledWith(3, 'prop/savePropRefVal', [
      1180,
      [
        expect.objectContaining({ id: 201, checked: true }),
        expect.objectContaining({ id: 111, checked: true }),
      ],
    ])

    expect(option).toEqual({ id: 111, pv: 111, name: 'Новая единица' })
  })

  it('returns created option even if saving selected values fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    metaRpcMock
      .mockResolvedValueOnce({
        records: [
          {
            id: 123,
            cod: 'new',
            accessLevel: 1,
            kFromBase: 1,
            name: 'Новая единица',
            fullName: 'Новая единица',
          },
        ],
      })
      .mockResolvedValueOnce({ records: [] })
      .mockRejectedValueOnce(new Error('save failed'))

    const option = await createMeasureAndSelect('Новая единица')

    expect(option).toEqual({ id: 123, pv: 123, name: 'Новая единица' })
    expect(metaRpcMock).toHaveBeenNthCalledWith(3, 'prop/savePropRefVal', [
      1180,
      [expect.objectContaining({ id: 123, checked: true })],
    ])
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[measureMeta] Не удалось сохранить выбранные единицы измерения',
      expect.any(Error),
    )

    consoleErrorSpy.mockRestore()
  })
})
