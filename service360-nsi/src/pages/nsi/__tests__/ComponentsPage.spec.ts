import { ref } from 'vue'
import { fireEvent, render, waitFor } from '@testing-library/vue'
import ComponentsPage from '../ComponentsPage.vue'

const messageMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}))

const createMutateAsyncMock = vi.hoisted(() => vi.fn())
const updateMutateAsyncMock = vi.hoisted(() => vi.fn())
const removeMutateAsyncMock = vi.hoisted(() => vi.fn())

const useComponentsQueryMock = vi.hoisted(() =>
  vi.fn(() => ({
    data: ref({
      items: [
        {
          id: '1',
          cls: '1027',
          name: 'Рельс',
          objectTypes: [
            { id: '1', name: 'ЖД путь', relationId: 'rel-1', cls: '1001' },
            { id: '2', name: 'Стрелочный перевод', relationId: 'rel-2', cls: '1001' },
          ],
          parameters: [
            { id: '101', name: 'Температура', relationId: 'pr-1', cls: '1041' },
          ],
          defects: [
            {
              id: '201',
              name: 'Коррозия',
              relationId: 'df-1',
              cls: '1061',
              categoryName: 'Повреждения',
            },
          ],
          details: { id: 1, cls: 1027, accessLevel: 1 },
        },
      ],
      objectTypes: [
        { id: '1', name: 'ЖД путь', cls: '1001' },
        { id: '2', name: 'Стрелочный перевод', cls: '1001' },
      ],
      parameters: [
        { id: '101', name: 'Температура', cls: '1041' },
        { id: '102', name: 'Влажность', cls: '1041' },
      ],
      defects: [
        { id: '201', name: 'Коррозия', cls: '1061' },
        { id: '202', name: 'Трещина', cls: '1061' },
      ],
    }),
    isLoading: ref(false),
  })),
)

vi.mock('@features/component-crud', () => ({
  useComponentsQuery: useComponentsQueryMock,
  useComponentMutations: () => ({
    create: { mutateAsync: createMutateAsyncMock },
    update: { mutateAsync: updateMutateAsyncMock },
    remove: { mutateAsync: removeMutateAsyncMock },
  }),
}))

vi.mock('naive-ui', async () => {
  const actual = await vi.importActual<typeof import('naive-ui')>('naive-ui')
  return {
    ...actual,
    useMessage: () => messageMock,
  }
})

vi.mock('@entities/component', async () => {
  const actual = await vi.importActual<typeof import('@entities/component')>('@entities/component')
  return {
    ...actual,
    createObjectTypeOnTheFly: vi.fn(async (name: string) => ({ id: '999', name, cls: '1001' })),
    createParameterOnTheFly: vi.fn(async (name: string) => ({ id: '888', name, cls: '1041' })),
    createDefectOnTheFly: vi.fn(async (name: string) => ({ id: '777', name, cls: '1061' })),
  }
})

describe('ComponentsPage', () => {
  beforeEach(() => {
    messageMock.success.mockReset()
    messageMock.error.mockReset()
    createMutateAsyncMock.mockReset()
    updateMutateAsyncMock.mockReset()
    removeMutateAsyncMock.mockReset()
  })

  it('renders components table', async () => {
    const { getByText } = render(ComponentsPage)
    await waitFor(() => expect(getByText('Рельс')).toBeTruthy())
    expect(getByText('Типы объектов')).toBeTruthy()
  })

  it('creates component via modal', async () => {
    const { getByText, getByPlaceholderText } = render(ComponentsPage)

    await fireEvent.click(getByText('+ Добавить компонент'))
    const nameInput = getByPlaceholderText('Введите наименование компонента') as HTMLInputElement
    await fireEvent.update(nameInput, 'Новый компонент')
    await fireEvent.click(getByText('Сохранить'))

    await waitFor(() => {
      expect(createMutateAsyncMock).toHaveBeenCalledWith({
        name: 'Новый компонент',
        objectTypeIds: [],
        parameterIds: [],
        defectIds: [],
      })
    })
  })
})
