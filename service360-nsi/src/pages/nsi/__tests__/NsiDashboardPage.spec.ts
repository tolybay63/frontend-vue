import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/vue'
import { defineComponent, h, ref } from 'vue'

import type {
  ActivityItem,
  DiagnosticItem,
  NsiCoverage,
  RelationsCounts,
} from '@entities/nsi-dashboard'

const coverageMock: NsiCoverage = {
  sources: { total: 10, withIssuerDateExec: 8 },
  types: { total: 5, withShape: 5, withComponents: 4 },
  components: { total: 6, withParams: 4, withDefects: 3 },
  params: { total: 8, withUnitsAndBounds: 6 },
  defects: { total: 4, withCategoryAndComponent: 3 },
  works: { total: 7, withTypePeriodSource: 5 },
}

const diagnosticsMock: DiagnosticItem[] = [
  {
    code: 'COMPONENTS_WITHOUT_PARAMS',
    title: 'Компоненты без параметров контроля',
    count: 2,
    severity: 'warning',
    linkQuery: { missing: 'params' },
    target: 'components',
  },
]

const activityMock: ActivityItem[] = [
  {
    id: 'activity-1',
    title: 'Ибрагим добавил дефект «Вертикальные расслоения шейки» (Компонент: Рельсы)',
    actor: 'Ибрагим',
    ts: '2024-02-01T11:32:00.000Z',
    target: 'defects',
    targetId: 'defect-1',
  },
]

const relationsMock: RelationsCounts = {
  sources: coverageMock.sources.total,
  types: coverageMock.types.total,
  components: coverageMock.components.total,
  params: coverageMock.params.total,
  defects: coverageMock.defects.total,
  works: coverageMock.works.total,
}

const pushMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@tanstack/vue-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown }) => {
    const key = Array.isArray(queryKey) ? String(queryKey[1]) : String(queryKey)
    switch (key) {
      case 'coverage':
        return { data: ref(coverageMock), isLoading: ref(false) }
      case 'diagnostics':
        return { data: ref(diagnosticsMock), isLoading: ref(false) }
      case 'activity':
        return { data: ref(activityMock), isLoading: ref(false) }
      case 'relations':
        return { data: ref(relationsMock), isLoading: ref(false) }
      default:
        return { data: ref(null), isLoading: ref(false) }
    }
  },
}))

function createStub(tag: string) {
  return defineComponent({
    inheritAttrs: false,
    setup(_, { slots }) {
      return () => h(tag, null, [slots.trigger?.(), slots.default?.()])
    },
  })
}

vi.mock('naive-ui', () => {
  const Button = defineComponent({
    props: { type: { type: String, default: 'button' } },
    emits: ['click'],
    setup(props, { slots, emit }) {
      return () =>
        h(
          'button',
          {
            type: 'button',
            onClick: (event: MouseEvent) => emit('click', event),
          },
          slots.default?.(),
        )
    },
  })

  const Input = defineComponent({
    props: { value: { type: String, default: '' }, placeholder: { type: String, default: '' } },
    emits: ['update:value'],
    setup(props, { emit }) {
      return () =>
        h('input', {
          value: props.value,
          placeholder: props.placeholder,
          onInput: (event: Event) => emit('update:value', (event.target as HTMLInputElement).value),
        })
    },
  })

  const Switch = defineComponent({
    props: { value: { type: Boolean, default: false } },
    emits: ['update:value'],
    setup(props, { emit }) {
      return () =>
        h(
          'button',
          {
            type: 'button',
            role: 'switch',
            'aria-checked': props.value ? 'true' : 'false',
            onClick: () => emit('update:value', !props.value),
          },
          props.value ? 'on' : 'off',
        )
    },
  })

  return {
    NButton: Button,
    NInput: Input,
    NSwitch: Switch,
    NTooltip: createStub('div'),
    NPopover: createStub('div'),
    NSpin: createStub('div'),
    NCard: createStub('section'),
    NProgress: defineComponent({
      props: { percentage: { type: Number, default: 0 } },
      setup(props) {
        return () => h('div', { 'data-percentage': props.percentage })
      },
    }),
    NIcon: defineComponent({
      setup(_, { slots }) {
        return () => h('span', slots.default?.())
      },
    }),
  }
})

vi.mock('@/widgets/nsi-dashboard/CtaRow.vue', () => ({
  default: defineComponent({
    props: { title: { type: String, default: '' }, actions: { type: Array, default: () => [] } },
    emits: [
      // 'toggle-assistant',
      'select-search',
    ],
    setup(props) {
      return () =>
        h('section', [
          h('h1', props.title),
          ...(Array.isArray(props.actions)
            ? props.actions.map((action) => {
                const typed = action as { label?: string }
                return h('button', { type: 'button' }, typed.label ?? '')
              })
            : []),
        ])
    },
  }),
}))

vi.mock('@/widgets/nsi-dashboard/RelationsMap.vue', () => ({
  default: defineComponent({
    emits: ['select-node'],
    setup(_, { emit }) {
      return () =>
        h(
          'button',
          {
            type: 'button',
            onClick: () => emit('select-node', 'sources'),
          },
          'Источники',
        )
    },
  }),
}))

vi.mock('@/widgets/nsi-dashboard/KpiTiles.vue', () => ({
  default: defineComponent({
    emits: ['select'],
    setup(_, { emit }) {
      return () =>
        h(
          'button',
          {
            type: 'button',
            onClick: () => emit('select', 'components'),
          },
          '→ Привязать параметры/дефекты',
        )
    },
  }),
}))

vi.mock('@/widgets/nsi-dashboard/Checklist.vue', () => ({
  default: defineComponent({
    setup() {
      return () => h('div')
    },
  }),
}))

vi.mock('@/widgets/nsi-dashboard/Diagnostics.vue', () => ({
  default: defineComponent({
    setup() {
      return () => h('div')
    },
  }),
}))

vi.mock('@/widgets/nsi-dashboard/RecentActivity.vue', () => ({
  default: defineComponent({
    setup() {
      return () => h('div')
    },
  }),
}))

import NsiDashboardPage from '../NsiDashboardPage.vue'

describe('NsiDashboardPage', () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  it('renders dashboard header and quick actions', () => {
    render(NsiDashboardPage)
    expect(
      screen.getByRole('heading', { name: 'Нормативная база отрасли Service 360' }),
    ).toBeTruthy()
    expect(screen.getAllByRole('button', { name: '+ Документ' })[0]).toBeTruthy()
  })

  it('navigates to sources page when relations node clicked', async () => {
    render(NsiDashboardPage)
    const sourcesButton = screen.getAllByRole('button', { name: 'Источники' })[0]
    await fireEvent.click(sourcesButton)
    expect(pushMock).toHaveBeenCalledWith({ name: 'sources' })
  })

  it('navigates to components missing params from KPI tile', async () => {
    render(NsiDashboardPage)
    const tileButton = screen.getAllByRole('button', { name: '→ Привязать параметры/дефекты' })[0]
    await fireEvent.click(tileButton)
    expect(pushMock).toHaveBeenCalledWith({ name: 'components', query: { missing: 'params' } })
  })
})
