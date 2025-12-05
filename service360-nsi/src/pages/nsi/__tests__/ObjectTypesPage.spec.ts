import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import type { ObjectTypesSnapshot } from '@entities/object-type'

const messageMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}))

const invalidateQueriesMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const createMutateAsyncMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const routerReplaceMock = vi.hoisted(() => vi.fn())

function createComponentStub(name: string) {
  return defineComponent({
    name,
    props: ['value', 'modelValue', 'show'],
    emits: ['update:value', 'created', 'blur'],
    setup(_, { slots }) {
      return () =>
        h('div', { class: name }, [
          slots.default ? h('div', { class: `${name}__default` }, slots.default()) : null,
        ])
    },
  })
}

function createNaiveStub(name: string) {
  return defineComponent({
    name,
    props: ['value', 'modelValue', 'show', 'options', 'type', 'loading'],
    emits: ['update:value', 'update:show'],
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

vi.mock('naive-ui', () => ({
  NButton: createNaiveStub('NButton'),
  NCard: createNaiveStub('NCard'),
  NDataTable: createNaiveStub('NDataTable'),
  NForm: createNaiveStub('NForm'),
  NFormItem: createNaiveStub('NFormItem'),
  NIcon: createNaiveStub('NIcon'),
  NInput: createNaiveStub('NInput'),
  NModal: createNaiveStub('NModal'),
  NPagination: createNaiveStub('NPagination'),
  NPopover: createNaiveStub('NPopover'),
  NPopconfirm: createNaiveStub('NPopconfirm'),
  NRadioButton: createNaiveStub('NRadioButton'),
  NRadioGroup: createNaiveStub('NRadioGroup'),
  NSelect: createNaiveStub('NSelect'),
  NTag: createNaiveStub('NTag'),
  useDialog: () => ({
    warning: ({
      onPositiveClick,
    }: {
      onPositiveClick?: () => void
      onNegativeClick?: () => void
      onClose?: () => void
    }) => {
      onPositiveClick?.()
    },
  }),
  useMessage: () => messageMock,
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}))

const snapshotRef = vi.hoisted(() => ({
  value: {} as ObjectTypesSnapshot,
}))

vi.mock('@features/object-type-crud', () => ({
  useObjectTypesQuery: () => ({
    data: snapshotRef,
    isLoading: { value: false },
    isFetching: { value: false },
    error: { value: null },
  }),
  useObjectTypeMutations: () => ({
    create: { mutateAsync: createMutateAsyncMock },
    updateGeometry: { mutateAsync: vi.fn() },
    renameWithMigration: { mutateAsync: vi.fn() },
    updateComponentsDiff: { mutateAsync: vi.fn() },
    removeCascade: { mutateAsync: vi.fn() },
  }),
  ensureComponentObjects: vi.fn(),
  resolveRemoveLinkIds: vi.fn(),
}))

vi.mock('@features/components-select', () => ({
  ComponentsSelect: createComponentStub('ComponentsSelect'),
}))

vi.mock('@entities/component', () => ({
  createComponentIfMissing: vi.fn(),
}))

vi.mock('lodash-es', () => ({
  debounce: (fn: (...args: unknown[]) => unknown) => fn,
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, path: '/', hash: '' }),
  useRouter: () => ({ replace: routerReplaceMock }),
}))

import ObjectTypesPage from '../ObjectTypesPage.vue'

function buildSnapshot(overrides: Partial<ObjectTypesSnapshot> = {}): ObjectTypesSnapshot {
  return {
    items: [],
    componentsByType: {},
    geometryOptions: [],
    geometryPairByKind: {
      точка: { fv: '100', pv: '200' },
    },
    allComponents: [],
    linksByType: {},
    ...overrides,
  }
}

describe('ObjectTypesPage form component flow', () => {
  beforeEach(() => {
    messageMock.success.mockReset()
    messageMock.error.mockReset()
    messageMock.info.mockReset()
    messageMock.warning.mockReset()
    invalidateQueriesMock.mockReset()
    invalidateQueriesMock.mockImplementation(() => Promise.resolve())
    createMutateAsyncMock.mockReset()
    createMutateAsyncMock.mockImplementation(() => Promise.resolve())
    routerReplaceMock.mockReset()

    snapshotRef.value = buildSnapshot({
      allComponents: [{ id: '10', name: 'Старый компонент' }],
    })

    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it('passes selected component names into create payload after on-the-fly creation', async () => {
    const wrapper = mount(ObjectTypesPage)
    const internal = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$
    const setupState = internal.setupState as {
      form: { name: string; component: string[] }
      handleUpdateComponentValue: (value: string[] | string | null) => void
      handleComponentCreated: (payload: { id: string; cls: number; name: string }) => Promise<void>
      save: () => Promise<void>
    }

    setupState.form.name = 'Новый тип'
    setupState.handleUpdateComponentValue(['Старый компонент'])

    await setupState.handleComponentCreated({ id: '42', cls: 1027, name: 'Новый компонент' })

    expect(setupState.form.component).toEqual(['Старый компонент', 'Новый компонент'])

    await setupState.save()
    await flushPromises()

    expect(createMutateAsyncMock).toHaveBeenCalledTimes(1)
    expect(createMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        componentNames: ['Старый компонент', 'Новый компонент'],
      }),
    )
  })
})
