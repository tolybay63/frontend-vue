import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, type Ref } from 'vue'

import type { DirectoryOption, LoadedObjectParameter } from '@entities/object-parameter'

type TestParameterRow = LoadedObjectParameter

interface ExposedCreationForm {
  name: string
  measureId: string | null
  sourceId: string | null
  description: string
  componentEnt: string | null
  limitMax: number | null
  limitMin: number | null
  limitNorm: number | null
  comment: string
}

const messageMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}))

const createResetMock = vi.hoisted(() => vi.fn())
const createMutateAsyncMock = vi.hoisted(() => vi.fn())
const linkResetMock = vi.hoisted(() => vi.fn())
const linkMutateAsyncMock = vi.hoisted(() => vi.fn())
const updateResetMock = vi.hoisted(() => vi.fn())
const updateMutateAsyncMock = vi.hoisted(() => vi.fn())
const removeResetMock = vi.hoisted(() => vi.fn())
const removeMutateAsyncMock = vi.hoisted(() => vi.fn())

const loadMeasuresMock = vi.hoisted(() => vi.fn())
const loadSourcesMock = vi.hoisted(() => vi.fn())
const loadComponentsMock = vi.hoisted(() => vi.fn())

const snapshotRef = vi.hoisted(() => ({
  value: {
    items: [] as TestParameterRow[],
    unitDirectory: {} as Record<string, DirectoryOption>,
    sourceDirectory: {} as Record<string, DirectoryOption>,
    unitOptions: [] as DirectoryOption[],
    sourceOptions: [] as DirectoryOption[],
    unitLookup: {} as Record<string, DirectoryOption>,
    sourceLookup: {} as Record<string, DirectoryOption>,
  },
}))

function buildSnapshot(items: TestParameterRow[] = []) {
  return {
    items,
    unitDirectory: {} as Record<string, DirectoryOption>,
    sourceDirectory: {} as Record<string, DirectoryOption>,
    unitOptions: [] as DirectoryOption[],
    sourceOptions: [] as DirectoryOption[],
    unitLookup: {} as Record<string, DirectoryOption>,
    sourceLookup: {} as Record<string, DirectoryOption>,
  }
}

function createDetails(overrides: Partial<TestParameterRow['details']> = {}) {
  return {
    id: 1,
    cls: 1041,
    accessLevel: 1,
    measureRecordId: 11,
    measureId: 1008,
    measurePv: 1321,
    sourceRecordId: 21,
    sourceObjId: 2751,
    sourcePv: 1044,
    descriptionRecordId: 31,
    componentRelationId: 41,
    componentRelationName: 'Параметр <=> Компонент',
     componentCls: 1027,
     componentRelcls: 1074,
     componentRcm: 1149,
     componentEnt: 3466,
    limitMaxId: 51,
    limitMinId: 52,
    limitNormId: 53,
    ...overrides,
  }
}

interface PageExposed {
  openCreate: () => void | Promise<void>
  openEdit: (row: TestParameterRow) => Promise<void>
  handleSubmit: () => Promise<void>
  createModalOpen: Ref<boolean>
  creationForm: ExposedCreationForm
  editingParameter: Ref<unknown>
  isEditMode: Ref<boolean>
}

function getExposed(wrapper: ReturnType<typeof mount>): PageExposed {
  const internal = (wrapper.vm as unknown as { $: { exposed?: unknown } }).$
  if (!internal || !internal.exposed) {
    throw new Error('Component did not expose testing API')
  }
  return internal.exposed as PageExposed
}

function createComponentStub(name: string) {
  return defineComponent({
    name,
    props: ['value', 'modelValue', 'show'],
    setup(_, { slots }) {
      return () =>
        h('div', { class: name }, [
          slots.trigger ? h('div', { class: `${name}__trigger` }, slots.trigger()) : null,
          slots.default ? slots.default() : null,
          slots.footer ? h('div', { class: `${name}__footer` }, slots.footer()) : null,
        ])
    },
  })
}

function createFormStub() {
  return defineComponent({
    name: 'NForm',
    props: ['model', 'rules', 'labelWidth', 'labelPlacement', 'size'],
    setup(_, { slots, expose }) {
      const validate = vi.fn(() => Promise.resolve())
      const restoreValidation = vi.fn()
      expose({ validate, restoreValidation })
      return () => h('form', { class: 'NForm' }, slots.default ? slots.default() : null)
    },
  })
}

vi.mock('naive-ui', () => ({
  NButton: createComponentStub('NButton'),
  NCard: createComponentStub('NCard'),
  NDataTable: createComponentStub('NDataTable'),
  NForm: createFormStub(),
  NFormItem: createComponentStub('NFormItem'),
  NIcon: createComponentStub('NIcon'),
  NInput: createComponentStub('NInput'),
  NInputNumber: createComponentStub('NInputNumber'),
  NModal: createComponentStub('NModal'),
  NPagination: createComponentStub('NPagination'),
  NPopconfirm: createComponentStub('NPopconfirm'),
  NSelect: createComponentStub('NSelect'),
  NSpin: createComponentStub('NSpin'),
  NTag: createComponentStub('NTag'),
  NTooltip: createComponentStub('NTooltip'),
  useMessage: () => messageMock,
}))

vi.mock('@features/object-parameter-crud', () => ({
  useObjectParametersQuery: () => ({
    data: snapshotRef,
    isLoading: { value: false },
    isFetching: { value: false },
    error: { value: null },
  }),
  useObjectParameterMutations: () => ({
    create: { reset: createResetMock, mutateAsync: createMutateAsyncMock, isPending: { value: false } },
    link: { reset: linkResetMock, mutateAsync: linkMutateAsyncMock, isPending: { value: false } },
    update: { reset: updateResetMock, mutateAsync: updateMutateAsyncMock, isPending: { value: false } },
    remove: { reset: removeResetMock, mutateAsync: removeMutateAsyncMock },
  }),
}))

vi.mock('@entities/object-parameter', () => ({
  loadParameterMeasures: loadMeasuresMock,
  loadParameterSources: loadSourcesMock,
  loadParameterComponents: loadComponentsMock,
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, path: '/', hash: '' }),
  useRouter: () => ({ replace: vi.fn() }),
}))

import ObjectParametersPage from '../ObjectParametersPage.vue'

describe('ObjectParametersPage creation flow', () => {
  const measureOption = { id: 1008, pv: 1321, name: 'В' }
  const sourceOption = { id: 2751, pv: 1044, name: '№ 684-ЦЗ' }
  const componentOption = { cls: 1027, relcls: 1074, rcm: 1149, ent: 3466, name: 'голова' }

  beforeAll(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  beforeEach(() => {
    snapshotRef.value = buildSnapshot()

    messageMock.success.mockReset()
    messageMock.error.mockReset()
    messageMock.info.mockReset()
    messageMock.warning.mockReset()

    createResetMock.mockReset()
    linkResetMock.mockReset()
    updateResetMock.mockReset()
    removeResetMock.mockReset()
    removeMutateAsyncMock.mockReset()
    removeMutateAsyncMock.mockReset()
    removeMutateAsyncMock.mockReset()
    removeMutateAsyncMock.mockReset()
    removeMutateAsyncMock.mockReset()
    createMutateAsyncMock.mockReset()
    linkMutateAsyncMock.mockReset()
    updateMutateAsyncMock.mockReset()
    loadMeasuresMock.mockReset()
    loadSourcesMock.mockReset()
    loadComponentsMock.mockReset()

    loadMeasuresMock.mockResolvedValue([measureOption])
    loadSourcesMock.mockResolvedValue([sourceOption])
    loadComponentsMock.mockResolvedValue([componentOption])
    createMutateAsyncMock.mockResolvedValue(undefined)
  })

  it('opens creation modal and loads directories', async () => {
    const wrapper = mount(ObjectParametersPage)
    const exposed = getExposed(wrapper)

    expect(exposed.createModalOpen.value).toBe(false)

    exposed.openCreate()
    await flushPromises()

    expect(exposed.createModalOpen.value).toBe(true)
    expect(createResetMock).toHaveBeenCalledTimes(1)
    expect(linkResetMock).toHaveBeenCalledTimes(1)
    expect(updateResetMock).toHaveBeenCalledTimes(1)
    expect(loadMeasuresMock).toHaveBeenCalledTimes(1)
    expect(loadSourcesMock).toHaveBeenCalledTimes(1)
    expect(loadComponentsMock).toHaveBeenCalledTimes(1)
  })

  it('submits a new parameter with selected values', async () => {
    const wrapper = mount(ObjectParametersPage)
    const exposed = getExposed(wrapper)

    exposed.openCreate()
    await flushPromises()

    exposed.creationForm.name = '  Новый параметр  '
    exposed.creationForm.measureId = String(measureOption.id)
    exposed.creationForm.sourceId = String(sourceOption.id)
    exposed.creationForm.componentEnt = String(componentOption.ent)
    exposed.creationForm.description = '  описание  '
    exposed.creationForm.comment = '  комментарий  '
    exposed.creationForm.limitMax = 454545
    exposed.creationForm.limitMin = 77
    exposed.creationForm.limitNorm = 7777

    await exposed.handleSubmit()
    await flushPromises()

    expect(createMutateAsyncMock).toHaveBeenCalledTimes(1)
    expect(createMutateAsyncMock).toHaveBeenCalledWith({
      name: 'Новый параметр',
      description: 'описание',
      measure: measureOption,
      source: sourceOption,
      component: componentOption,
      limits: {
        max: 454545,
        min: 77,
        norm: 7777,
        comment: 'комментарий',
      },
      accessLevel: 1,
    })
    expect(updateMutateAsyncMock).not.toHaveBeenCalled()
    expect(messageMock.success).toHaveBeenCalledWith('Параметр успешно создан')
    expect(exposed.createModalOpen.value).toBe(false)
    expect(exposed.creationForm.name).toBe('')
  })
})

describe('ObjectParametersPage edit flow', () => {
  const measureOption = { id: 1008, pv: 1321, name: 'мм' }
  const sourceOption = { id: 2747, pv: 1044, name: '№ 288-ЦЖС 1 часть' }
  const componentOption = { cls: 1027, relcls: 1074, rcm: 1149, ent: 3466, name: 'голова' }

  beforeEach(() => {
    snapshotRef.value = buildSnapshot([
      {
        id: '3487',
        name: 'ЛБ п709',
        code: null,
        valueType: 'number',
        unitId: String(measureOption.pv),
        sourceId: String(sourceOption.id),
        componentId: String(componentOption.ent),
        minValue: 10,
        maxValue: 20,
        normValue: 15,
        isRequired: false,
        note: 'старый комментарий',
        description: 'старое описание',
        unitName: measureOption.name,
        sourceName: sourceOption.name,
        componentName: componentOption.name,
        details: createDetails({
          id: 3487,
          measureId: measureOption.id,
          measurePv: measureOption.pv,
          sourceObjId: sourceOption.id,
          sourcePv: sourceOption.pv,
          componentRelationId: 2643,
          componentRelationName: 'ЛБ п709 <=> голова',
        }),
      },
    ])

    messageMock.success.mockReset()
    messageMock.error.mockReset()
    messageMock.info.mockReset()
    messageMock.warning.mockReset()

    createResetMock.mockReset()
    linkResetMock.mockReset()
    updateResetMock.mockReset()
    removeResetMock.mockReset()
    createMutateAsyncMock.mockReset()
    linkMutateAsyncMock.mockReset()
    updateMutateAsyncMock.mockReset()
    loadMeasuresMock.mockReset()
    loadSourcesMock.mockReset()
    loadComponentsMock.mockReset()

    loadMeasuresMock.mockResolvedValue([measureOption])
    loadSourcesMock.mockResolvedValue([sourceOption])
    loadComponentsMock.mockResolvedValue([componentOption])
    updateMutateAsyncMock.mockResolvedValue(undefined)
  })

  it('opens edit modal, loads directories and pre-fills form', async () => {
    const wrapper = mount(ObjectParametersPage)
    const exposed = getExposed(wrapper)

    await exposed.openEdit(snapshotRef.value.items[0])
    await flushPromises()

    expect(updateResetMock).toHaveBeenCalledTimes(1)
    expect(createResetMock).toHaveBeenCalledTimes(1)
    expect(linkResetMock).toHaveBeenCalledTimes(1)
    expect(loadMeasuresMock).toHaveBeenCalledTimes(1)
    expect(loadSourcesMock).toHaveBeenCalledTimes(1)
    expect(loadComponentsMock).toHaveBeenCalledTimes(1)
    expect(exposed.createModalOpen.value).toBe(true)
    expect(exposed.creationForm.name).toBe('ЛБ п709')
    expect(exposed.creationForm.measureId).toBe(String(measureOption.id))
    expect(exposed.creationForm.sourceId).toBe(String(sourceOption.id))
    expect(exposed.creationForm.componentEnt).toBe(String(componentOption.ent))
    expect(exposed.creationForm.limitMax).toBe(20)
    expect(exposed.creationForm.limitMin).toBe(10)
    expect(exposed.creationForm.limitNorm).toBe(15)
    expect(exposed.creationForm.comment).toBe('старый комментарий')
  })

  it('submits an updated parameter', async () => {
    const wrapper = mount(ObjectParametersPage)
    const exposed = getExposed(wrapper)

    await exposed.openEdit(snapshotRef.value.items[0])
    await flushPromises()

    exposed.creationForm.name = 'ЛБ п709 обновлён'
    exposed.creationForm.description = 'новое описание'
    exposed.creationForm.limitMax = 30
    exposed.creationForm.limitMin = 5
    exposed.creationForm.limitNorm = 12
    exposed.creationForm.comment = 'новый комментарий'

    await exposed.handleSubmit()
    await flushPromises()

    expect(updateMutateAsyncMock).toHaveBeenCalledTimes(1)
    expect(updateMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 3487,
        name: 'ЛБ п709 обновлён',
        description: 'новое описание',
        limits: {
          max: 30,
          min: 5,
          norm: 12,
          comment: 'новый комментарий',
        },
      }),
    )
    expect(createMutateAsyncMock).not.toHaveBeenCalled()
    expect(messageMock.success).toHaveBeenCalledWith('Параметр успешно обновлён')
    expect(exposed.createModalOpen.value).toBe(false)
  })
})

describe('ObjectParametersPage mobile card fields', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeAll(() => {
    originalMatchMedia = window.matchMedia
  })

  afterAll(() => {
    window.matchMedia = originalMatchMedia
  })

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    snapshotRef.value = buildSnapshot([
      {
        id: '1',
        name: 'Температура теплоносителя',
        code: 'TMP-001',
        valueType: 'float',
        unitId: 'deg',
        sourceId: 'heating',
        componentId: null,
        minValue: 45,
        maxValue: 95,
        normValue: null,
        isRequired: true,
        note: 'Контроль подачи',
        description: 'Температура на обратке',
        unitName: '°C',
        sourceName: 'Отопление',
        componentName: null,
        details: createDetails({
          id: 1,
          componentRelationId: null,
          componentRelationName: null,
        }),
      },
    ])

    createResetMock.mockReset()
    linkResetMock.mockReset()
    updateResetMock.mockReset()
    removeResetMock.mockReset()
    createMutateAsyncMock.mockReset()
    linkMutateAsyncMock.mockReset()
    loadMeasuresMock.mockReset()
    loadSourcesMock.mockReset()
    loadComponentsMock.mockReset()
  })

  it('renders expected list of card fields on mobile', () => {
    const wrapper = mount(ObjectParametersPage)

    const card = wrapper.find('.card')
    const fieldLabels = card.findAll('dt').map((node) => node.text())

    expect(fieldLabels).toEqual([
      'ЕИ и границы',
      'Комментарии по диапазонам',
      'Источник',
      'Описание',
    ])
  })
})

describe('ObjectParametersPage sorting logic', () => {
  beforeEach(() => {
    snapshotRef.value = buildSnapshot()

    createResetMock.mockReset()
    linkResetMock.mockReset()
    updateResetMock.mockReset()
    removeResetMock.mockReset()
    createMutateAsyncMock.mockReset()
    linkMutateAsyncMock.mockReset()
    loadMeasuresMock.mockReset()
    loadSourcesMock.mockReset()
    loadComponentsMock.mockReset()
    messageMock.info.mockReset()
    messageMock.warning.mockReset()
  })

  it('sorts by name using localeCompare', () => {
    const wrapper = mount(ObjectParametersPage)
    const vm = wrapper.vm as unknown as {
      columns: Array<{ key?: string; sorter?: (a: TestParameterRow, b: TestParameterRow) => number }>
    }

    const nameColumn = vm.columns.find((column) => column.key === 'name')
    expect(nameColumn?.sorter).toBeTypeOf('function')

    const a: TestParameterRow = {
      id: '1',
      name: 'Агрегат',
      code: null,
      valueType: 'string',
      unitId: null,
      sourceId: null,
      componentId: null,
      minValue: null,
      maxValue: null,
      normValue: null,
      isRequired: false,
      note: null,
      description: null,
      unitName: null,
      sourceName: null,
      componentName: null,
      details: createDetails({ id: 1 }),
    }

    const b: TestParameterRow = { ...a, id: '2', name: 'Блок', details: createDetails({ id: 2 }) }

    expect(nameColumn?.sorter?.(a, b) ?? 0).toBeLessThan(0)
    expect(nameColumn?.sorter?.(b, a) ?? 0).toBeGreaterThan(0)
  })

  it('sorts by sourceName treating empty values as empty strings', () => {
    const wrapper = mount(ObjectParametersPage)
    const vm = wrapper.vm as unknown as {
      columns: Array<{ key?: string; sorter?: (a: TestParameterRow, b: TestParameterRow) => number }>
    }

    const sourceColumn = vm.columns.find((column) => column.key === 'sourceName')
    expect(sourceColumn?.sorter).toBeTypeOf('function')

    const withSource: TestParameterRow = {
      id: '1',
      name: 'Параметр',
      code: null,
      valueType: 'string',
      unitId: null,
      sourceId: null,
      componentId: null,
      minValue: null,
      maxValue: null,
      normValue: null,
      isRequired: false,
      note: null,
      description: null,
      unitName: 'Ампер',
      sourceName: 'Альбом',
      componentName: null,
      details: createDetails({ id: 1 }),
    }

    const withAnotherSource: TestParameterRow = {
      ...withSource,
      id: '2',
      sourceName: 'База',
      details: createDetails({ id: 2 }),
    }
    const withoutSource: TestParameterRow = {
      ...withSource,
      id: '3',
      sourceName: null,
      details: createDetails({ id: 3 }),
    }

    expect(sourceColumn?.sorter?.(withSource, withAnotherSource) ?? 0).toBeLessThan(0)
    expect(sourceColumn?.sorter?.(withAnotherSource, withSource) ?? 0).toBeGreaterThan(0)
    expect(sourceColumn?.sorter?.(withoutSource, withSource) ?? 0).toBeLessThan(0)
    expect(sourceColumn?.sorter?.(withSource, withoutSource) ?? 0).toBeGreaterThan(0)
  })
})
