import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const messageMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}))

const createComponentMock = vi.hoisted(() =>
  vi.fn(async (name: string) => ({
    id: `id-${name}`,
    cls: 1027,
    name,
  })),
)

function createStub(name: string) {
  return defineComponent({
    name,
    props: [
      'value',
      'options',
      'multiple',
      'filterable',
      'clearable',
      'loading',
      'disabled',
      'placeholder',
      'show',
      'inputProps',
    ],
    emits: ['update:value', 'search', 'blur', 'update:show'],
    setup(_, { slots, expose }) {
      expose({ focus: vi.fn() })
      return () =>
        h(
          'div',
          { class: name },
          [
            slots.action ? h('div', { class: `${name}__action` }, slots.action()) : null,
            slots.default ? slots.default() : null,
            slots.empty ? h('div', { class: `${name}__empty` }, slots.empty()) : null,
          ].filter(Boolean),
        )
    },
  })
}

vi.mock('naive-ui', () => ({
  NSelect: createStub('NSelect'),
  NButton: createStub('NButton'),
  useDialog: () => ({
    warning: ({ onPositiveClick }: { onPositiveClick?: () => void }) => {
      onPositiveClick?.()
    },
  }),
  useMessage: () => messageMock,
}))

vi.mock('@entities/component', () => ({
  createComponentIfMissing: createComponentMock,
}))

import ComponentsSelect from '../ComponentsSelect.vue'

describe('ComponentsSelect creatable flow', () => {
  beforeEach(() => {
    messageMock.success.mockReset()
    messageMock.error.mockReset()
    messageMock.warning.mockReset()
    messageMock.info.mockReset()
    createComponentMock.mockClear()
  })

  it('emits string[] of names and selects the created option in multiple name mode', async () => {
    const wrapper = mount(ComponentsSelect, {
      props: {
        value: ['Старый компонент'],
        options: [{ label: 'Старый компонент', value: 'Старый компонент' }],
      },
    })

    const internal = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$
    const setupState = internal.setupState as {
      handleSearch: (value: string) => void
      handleCreate: () => Promise<void>
    }

    setupState.handleSearch('Новый компонент')

    await setupState.handleCreate()
    await flushPromises()

    expect(createComponentMock).toHaveBeenCalledTimes(1)
    expect(createComponentMock).toHaveBeenCalledWith('Новый компонент')

    const updates = wrapper.emitted()['update:value']
    expect(updates).toBeDefined()
    const lastUpdate = updates![updates!.length - 1][0]
    expect(lastUpdate).toEqual(['Старый компонент', 'Новый компонент'])

    const created = wrapper.emitted().created
    expect(created).toBeDefined()
    expect(created![0][0]).toMatchObject({
      name: 'Новый компонент',
    })
  })
})
