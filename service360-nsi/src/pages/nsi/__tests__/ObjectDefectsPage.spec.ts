import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'

interface TestDefectRow {
  id: number
  name: string
  componentId: string | null
  componentName: string | null
  componentPvId: string | null
  categoryFvId: string | null
  categoryName: string | null
  categoryPvId: string | null
  index: string
  note: string
}

interface ExposedFormState {
  name: string
  componentId: string | null
  componentPvId: string | null
  categoryFvId: string | null
  categoryPvId: string | null
  index: string
  note: string
}

const messageMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}))

const dialogWarningMock = vi.hoisted(() => vi.fn())
const createMutateAsync = vi.hoisted(() => vi.fn())
const updateMutateAsync = vi.hoisted(() => vi.fn())
const removeMutateAsync = vi.hoisted(() => vi.fn())
const deleteDefectOwnerWithPropertiesMock = vi.hoisted(() => vi.fn())
const invalidateQueriesMock = vi.hoisted(() => vi.fn())

const snapshotRef = vi.hoisted(() => ({
  value: {
    items: [] as TestDefectRow[],
    categories: [],
    components: [],
  },
}))

function createComponentStub(name: string) {
  return defineComponent({
    name,
    props: ['value', 'modelValue', 'show'],
    setup(_, { slots }) {
      return () => h('div', { class: name }, slots.default ? slots.default() : null)
    },
  })
}

vi.mock('naive-ui', () => ({
  NButton: createComponentStub('NButton'),
  NCard: createComponentStub('NCard'),
  NDataTable: createComponentStub('NDataTable'),
  NForm: createComponentStub('NForm'),
  NFormItem: createComponentStub('NFormItem'),
  NIcon: createComponentStub('NIcon'),
  NInput: createComponentStub('NInput'),
  NModal: createComponentStub('NModal'),
  NPagination: createComponentStub('NPagination'),
  NPopconfirm: createComponentStub('NPopconfirm'),
  NSelect: createComponentStub('NSelect'),
  NTag: createComponentStub('NTag'),
  useMessage: () => messageMock,
  useDialog: () => ({ warning: dialogWarningMock }),
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))

vi.mock('@features/object-defect-crud', () => ({
  useObjectDefectsQuery: () => ({
    data: snapshotRef,
    isLoading: { value: false },
    isFetching: { value: false },
    error: { value: null },
  }),
  useObjectDefectMutations: () => ({
    create: { mutateAsync: createMutateAsync },
    update: { mutateAsync: updateMutateAsync },
    remove: { mutateAsync: removeMutateAsync },
  }),
  createDefectComponentLookup: () => ({
    byId: new Map(),
    byPvId: new Map(),
    usageById: new Map(),
    usageByPvId: new Map(),
    usageByName: new Map(),
  }),
  createDefectCategoryLookup: () => ({
    byFvId: new Map(),
    byPvId: new Map(),
    usageByFvId: new Map(),
    usageByPvId: new Map(),
    usageByName: new Map(),
  }),
}))

vi.mock('@entities/object-defect', () => ({
  deleteDefectOwnerWithProperties: deleteDefectOwnerWithPropertiesMock,
}))

import ObjectDefectsPage from '../ObjectDefectsPage.vue'

describe('ObjectDefectsPage save flow', () => {
  beforeAll(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  beforeEach(() => {
    snapshotRef.value = {
      items: [
        {
          id: 1,
          name: 'Existing defect',
          componentId: null,
          componentName: null,
          componentPvId: null,
          categoryFvId: null,
          categoryName: null,
          categoryPvId: null,
          index: '',
          note: '',
        },
      ],
      categories: [],
      components: [],
    }

    messageMock.success.mockReset()
    messageMock.error.mockReset()
    messageMock.info.mockReset()
    messageMock.warning.mockReset()

    dialogWarningMock.mockReset()
    dialogWarningMock.mockImplementation(() => {})

    createMutateAsync.mockReset()
    updateMutateAsync.mockReset()
    removeMutateAsync.mockReset()
    deleteDefectOwnerWithPropertiesMock.mockReset()
    invalidateQueriesMock.mockReset()
  })

  it('calls deleteDefectOwnerWithProperties when saving edited defect', async () => {
    deleteDefectOwnerWithPropertiesMock.mockResolvedValue({ success: true })
    createMutateAsync.mockResolvedValue(undefined)

    const wrapper = mount(ObjectDefectsPage)
    const vm = wrapper.vm as unknown as {
      openEdit: (row: TestDefectRow) => void
      form: ExposedFormState
      save: () => Promise<void>
    }

    vm.openEdit(snapshotRef.value.items[0])
    vm.form.name = 'Updated defect'

    await vm.save()

    expect(deleteDefectOwnerWithPropertiesMock).toHaveBeenCalledWith(1)
  })

  it('stops saving and keeps edit mode when deletion fails', async () => {
    deleteDefectOwnerWithPropertiesMock.mockResolvedValue({
      success: false,
      reason: 'Дефект используется в нормативных связях',
    })
    dialogWarningMock.mockImplementation((options: { onNegativeClick?: () => void }) => {
      options.onNegativeClick?.()
    })

    const wrapper = mount(ObjectDefectsPage)
    const vm = wrapper.vm as unknown as {
      openEdit: (row: TestDefectRow) => void
      form: ExposedFormState
      save: () => Promise<void>
    }

    vm.openEdit(snapshotRef.value.items[0])
    vm.form.name = 'Updated defect'

    await vm.save()

    expect(createMutateAsync).not.toHaveBeenCalled()
    expect(messageMock.error).toHaveBeenCalledWith(
      'Дефект используется в нормативных связях',
    )
    expect(dialogWarningMock).toHaveBeenCalled()
  })

  it('creates new defect after successful deletion', async () => {
    deleteDefectOwnerWithPropertiesMock.mockResolvedValue({ success: true })
    createMutateAsync.mockResolvedValue(undefined)

    const wrapper = mount(ObjectDefectsPage)
    const vm = wrapper.vm as unknown as {
      openEdit: (row: TestDefectRow) => void
      form: ExposedFormState
      save: () => Promise<void>
    }

    vm.openEdit(snapshotRef.value.items[0])
    vm.form.name = 'Updated defect'
    vm.form.note = 'Comment'

    await vm.save()

    expect(createMutateAsync).toHaveBeenCalledTimes(1)
    expect(createMutateAsync).toHaveBeenCalledWith({
      name: 'Updated defect',
      componentId: null,
      componentPvId: null,
      categoryFvId: null,
      categoryPvId: null,
      index: null,
      note: 'Comment',
    })
    expect(messageMock.success).toHaveBeenCalledWith('Дефект обновлён')
    expect(updateMutateAsync).not.toHaveBeenCalled()
    expect(dialogWarningMock).not.toHaveBeenCalled()
  })
})

describe('ObjectDefectsPage remove flow', () => {
  beforeEach(() => {
    snapshotRef.value = {
      items: [
        {
          id: 1,
          name: 'Existing defect',
          componentId: null,
          componentName: null,
          componentPvId: null,
          categoryFvId: null,
          categoryName: null,
          categoryPvId: null,
          index: '',
          note: '',
        },
      ],
      categories: [],
      components: [],
    }

    messageMock.success.mockReset()
    messageMock.error.mockReset()
    deleteDefectOwnerWithPropertiesMock.mockReset()
    invalidateQueriesMock.mockReset()
  })

  it('returns true, invalidates cache and shows success message on successful removal', async () => {
    deleteDefectOwnerWithPropertiesMock.mockResolvedValue({ success: true })
    invalidateQueriesMock.mockResolvedValue(undefined)

    const wrapper = mount(ObjectDefectsPage)
    const vm = wrapper.vm as unknown as {
      removeRow: (id: number | string) => Promise<boolean>
    }

    const result = await vm.removeRow(1)

    expect(deleteDefectOwnerWithPropertiesMock).toHaveBeenCalledWith(1)
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['object-defects'] })
    expect(messageMock.success).toHaveBeenCalledWith('Дефект удалён')
    expect(result).toBe(true)
  })

  it('shows error and keeps confirmation open when removal returns reason', async () => {
    deleteDefectOwnerWithPropertiesMock.mockResolvedValue({
      success: false,
      reason: 'Дефект связан с категорией',
    })

    const wrapper = mount(ObjectDefectsPage)
    const vm = wrapper.vm as unknown as {
      removeRow: (id: number | string) => Promise<boolean>
    }

    const result = await vm.removeRow(1)

    expect(deleteDefectOwnerWithPropertiesMock).toHaveBeenCalledWith(1)
    expect(messageMock.error).toHaveBeenCalledWith('Дефект связан с категорией')
    expect(invalidateQueriesMock).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it('shows fallback message when removal throws error', async () => {
    deleteDefectOwnerWithPropertiesMock.mockRejectedValue(new Error('Network error'))

    const wrapper = mount(ObjectDefectsPage)
    const vm = wrapper.vm as unknown as {
      removeRow: (id: number | string) => Promise<boolean>
    }

    const result = await vm.removeRow(1)

    expect(messageMock.error).toHaveBeenCalledWith('Network error')
    expect(invalidateQueriesMock).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })
})
