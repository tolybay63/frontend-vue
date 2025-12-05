import { http, HttpResponse } from 'msw'

import type {
  ActivityItem,
  DiagnosticItem,
  NsiCoverage,
  NsiSearchResult,
  RelationsCounts,
} from '@entities/nsi-dashboard'

const coverage: NsiCoverage = {
  sources: { total: 24, withIssuerDateExec: 18 },
  types: { total: 12, withShape: 9, withComponents: 8 },
  components: { total: 48, withParams: 36, withDefects: 30 },
  params: { total: 96, withUnitsAndBounds: 72 },
  defects: { total: 54, withCategoryAndComponent: 39 },
  works: { total: 28, withTypePeriodSource: 19 },
}

const diagnostics: DiagnosticItem[] = [
  {
    code: 'WORKS_WITHOUT_SOURCE',
    title: 'Работы без привязки к документу',
    count: 3,
    severity: 'critical',
    linkQuery: { missing: 'source' },
    target: 'works',
  },
  {
    code: 'COMPONENTS_WITHOUT_PARAMS',
    title: 'Компоненты без параметров контроля',
    count: 5,
    severity: 'warning',
    linkQuery: { missing: 'params' },
    target: 'components',
  },
  {
    code: 'DEFECTS_WITHOUT_CATEGORY',
    title: 'Дефекты без категории',
    count: 2,
    severity: 'info',
    linkQuery: { missing: 'category' },
    target: 'defects',
  },
]

const relationsCounts: RelationsCounts = {
  sources: coverage.sources.total,
  types: coverage.types.total,
  components: coverage.components.total,
  params: coverage.params.total,
  defects: coverage.defects.total,
  works: coverage.works.total,
}

const activity: ActivityItem[] = [
  {
    id: 'activity-1',
    title: "Ибрагим добавил дефект 'Вертикальные расслоения шейки' (Компонент: Рельсы)",
    actor: 'Ибрагим',
    ts: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    target: 'defects',
    targetId: 'defect-110',
  },
  {
    id: 'activity-2',
    title: 'Мария обновила параметры контроля для компонента «Опоры освещения»',
    actor: 'Мария',
    ts: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    target: 'components',
    targetId: 'component-42',
  },
  {
    id: 'activity-3',
    title: 'Сергей добавил работу «Осмотр мачт контактной сети»',
    actor: 'Сергей',
    ts: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    target: 'works',
    targetId: 'work-12',
  },
  {
    id: 'activity-4',
    title: 'Екатерина прикрепила документ к типу «Путепровод»',
    actor: 'Екатерина',
    ts: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    target: 'types',
    targetId: 'type-3',
  },
  {
    id: 'activity-5',
    title: 'Александр настроил периодичность для работы «Термообследование стрелок»',
    actor: 'Александр',
    ts: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    target: 'works',
    targetId: 'work-9',
  },
]

const searchIndex: NsiSearchResult[] = [
  { id: 'doc-101', title: 'ПТЭ. Глава 5', extra: 'Документ МЧС', type: 'sources' },
  { id: 'type-3', title: 'Путепровод', extra: 'Тип объекта', type: 'types' },
  { id: 'component-42', title: 'Опора освещения', extra: 'Компонент', type: 'components' },
  { id: 'param-88', title: 'Температура металла', extra: 'Параметр', type: 'params' },
  { id: 'defect-110', title: 'Вертикальные расслоения шейки', extra: 'Дефект', type: 'defects' },
  { id: 'work-12', title: 'Осмотр мачт контактной сети', extra: 'Работа', type: 'works' },
]

export const nsiDashboardHandlers = [
  http.get('/nsi/dashboard/coverage', () => HttpResponse.json(coverage)),
  http.get('/nsi/dashboard/diagnostics', () => HttpResponse.json(diagnostics)),
  http.get('/nsi/dashboard/activity', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? '7')
    return HttpResponse.json(activity.slice(0, limit))
  }),
  http.get('/nsi/dashboard/relations-counts', () => HttpResponse.json(relationsCounts)),
  http.get('/nsi/search', ({ request }) => {
    const url = new URL(request.url)
    const query = (url.searchParams.get('q') ?? '').toLowerCase()
    if (!query) {
      return HttpResponse.json(searchIndex.slice(0, 5))
    }
    const results = searchIndex.filter((item) =>
      item.title.toLowerCase().includes(query) || (item.extra ?? '').toLowerCase().includes(query),
    )
    return HttpResponse.json(results)
  }),
]
