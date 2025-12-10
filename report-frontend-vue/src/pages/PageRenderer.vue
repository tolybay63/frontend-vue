<template>
  <section v-if="page" class="page">
    <header class="page__header">
      <div>
        <h1>{{ page.pageTitle }}</h1>
        <p class="muted">{{ page.description || 'Описание отсутствует' }}</p>
      </div>
      <div class="page__actions">
        <button
          class="btn-outline btn-outline--icon"
          type="button"
          :disabled="exportingExcel"
          @click="exportPageAsExcel"
        >
          <span>Выгрузить</span>
        </button>
        <button
          class="btn-outline btn-outline--icon"
          type="button"
          :disabled="pageRefreshing"
          @click="refreshPageData"
        >
          <span>{{ pageRefreshing ? 'Обновляем…' : 'Обновить' }}</span>
        </button>
        <button
          class="btn-outline btn-outline--icon"
          type="button"
          @click="editPage"
        >
          <span>Настроить</span>
        </button>
      </div>
    </header>

    <div v-if="activePageFilters.length" class="page-filters">
      <div class="page-filters__fields">
        <label
          v-for="filter in activePageFilters"
          :key="filter.key"
          class="page-filter"
        >
          <span>{{ filter.label }}</span>
          <MultiSelectDropdown
            v-model="pageFilterValues[filter.key]"
            :options="globalFilterValueOptions(filter.key)"
            placeholder="Выберите значения"
          />
        </label>
      </div>
      <div class="page-filters__actions">
        <button
          class="btn-outline btn-sm"
          type="button"
          :disabled="!hasActivePageFilters"
          @click="resetPageFilters"
        >
          Сбросить фильтры
        </button>
      </div>
    </div>

    <div class="layout" :style="layoutStyle">
      <article
        v-for="container in pageContainers"
        :key="container.id"
        class="layout-card"
        :style="containerStyle(container)"
      >
        <header>
          <h3>
            {{
              container.title ||
              template(container.templateId)?.name ||
              'Контейнер'
            }}
          </h3>
          <span class="tag">
            {{ dataSourceLabel(template(container.templateId)) }}
          </span>
        </header>
        <p v-if="template(container.templateId)" class="muted">
          {{ template(container.templateId).description || 'Без описания' }}
        </p>
        <p v-else class="muted">
          Привяжите представление, чтобы контейнер мог отобразить данные.
        </p>

        <div v-if="template(container.templateId)" class="widget-body">
          <div
            v-if="templateFilters(container).length"
            class="container-filters"
          >
            <article
              v-for="filter in templateFilters(container)"
              :key="`${container.id}-${filter.key}`"
              class="container-filter"
            >
              <div class="container-filter__header">
                <span>{{ filter.label }}</span>
                <button
                  class="btn-link"
                  type="button"
                  :disabled="
                    !containerFilterValues[container.id]?.[filter.key]?.length
                  "
                  @click="resetContainerFilter(container.id, filter.key)"
                >
                  Очистить
                </button>
              </div>
              <MultiSelectDropdown
                v-model="containerFilterValues[container.id][filter.key]"
                :options="fieldOptions(filter)"
                placeholder="Выберите значения"
                @update:model-value="requestContainerRefresh(container.id)"
              />
            </article>
          </div>
          <div
            v-if="containerState(container.id).loading"
            class="widget-placeholder"
          >
            Загружаем данные...
          </div>
          <div
            v-else-if="containerState(container.id).error"
            class="widget-error"
          >
            {{ containerState(container.id).error }}
          </div>
          <template v-else-if="containerState(container.id).view">
            <div v-if="isTableVisualization(container)" class="pivot-wrapper">
              <table class="pivot-table">
                <thead>
                  <tr v-if="hasMetricGroups(container)" class="metric-header">
                    <th
                      :rowspan="containerRowHeaderRowSpan(container)"
                      :style="rowHeaderStyle(container.id)"
                      class="row-header-title"
                    >
                      <div class="th-content">
                        {{ containerRowHeaderTitle(container) }}
                        <span
                          class="resize-handle"
                          @mousedown.prevent="
                            startRowHeaderResize(container.id, $event)
                          "
                        ></span>
                      </div>
                    </th>
                    <th
                      v-for="group in containerMetricColumnGroups(container)"
                      :key="`metric-${container.id}-${group.metric.id}`"
                      :colspan="group.span || 1"
                      class="column-field-group"
                    >
                      <div class="th-content">
                        <span class="column-field-value">
                          {{ group.label }}
                        </span>
                      </div>
                    </th>
                    <th
                      v-if="shouldShowRowTotals(container)"
                      :rowspan="containerRowHeaderRowSpan(container)"
                      class="column-field-group"
                    >
                      <span class="column-field-value">Итоги</span>
                    </th>
                  </tr>
                  <template v-if="containerColumnFieldRows(container).length">
                    <tr
                      v-for="(headerRow, rowIndex) in containerColumnFieldRows(
                        container,
                      )"
                      :key="`column-header-${container.id}-${rowIndex}`"
                      class="column-header-row"
                    >
                      <th
                        v-if="!hasMetricGroups(container) && rowIndex === 0"
                        :rowspan="containerColumnFieldRows(container).length"
                        :style="rowHeaderStyle(container.id)"
                        class="row-header-title"
                      >
                        <div class="th-content">
                          {{ containerRowHeaderTitle(container) }}
                          <span
                            class="resize-handle"
                            @mousedown.prevent="
                              startRowHeaderResize(container.id, $event)
                            "
                          ></span>
                        </div>
                      </th>
                      <template
                        v-for="segment in headerRow.segments"
                        :key="`segment-${container.id}-${rowIndex}-${segment.metricId}`"
                      >
                        <template
                          v-for="(cell, cellIndex) in segment.cells"
                          :key="`cell-${container.id}-${rowIndex}-${segment.metricId}-${cellIndex}`"
                        >
                          <th
                            v-if="cell.isValue"
                            :style="
                              tableColumnStyle(container.id, cell.styleKey)
                            "
                            class="column-field-group"
                          >
                            <div class="th-content">
                              <span class="column-field-value">
                                {{ cell.label }}
                              </span>
                              <span
                                class="resize-handle"
                                @mousedown.prevent="
                                  startTableColumnResize(
                                    container.id,
                                    cell.styleKey,
                                    $event,
                                  )
                                "
                              ></span>
                            </div>
                          </th>
                          <th
                            v-else
                            :colspan="cell.colspan"
                            class="column-field-group"
                          >
                            <span class="column-field-value">
                              {{ cell.label }}
                            </span>
                          </th>
                        </template>
                      </template>
                      <th
                        v-if="
                          !hasMetricGroups(container) &&
                          rowIndex === 0 &&
                          shouldShowRowTotals(container)
                        "
                        :rowspan="containerColumnFieldRows(container).length"
                        class="column-field-group"
                      >
                        <span class="column-field-value">Итоги</span>
                      </th>
                    </tr>
                  </template>
                  <tr v-else>
                    <th
                      v-if="!hasMetricGroups(container)"
                      :style="rowHeaderStyle(container.id)"
                      class="row-header-title"
                    >
                      <div class="th-content">
                        {{ containerRowHeaderTitle(container) }}
                        <span
                          class="resize-handle"
                          @mousedown.prevent="
                            startRowHeaderResize(container.id, $event)
                          "
                        ></span>
                      </div>
                    </th>
                    <th
                      v-for="column in containerState(container.id).view
                        .columns"
                      :key="column.key"
                      :style="tableColumnStyle(container.id, column.key)"
                    >
                      <div class="th-content">
                        <span class="column-field-value">{{
                          column.label
                        }}</span>
                        <span
                          class="resize-handle"
                          @mousedown.prevent="
                            startTableColumnResize(
                              container.id,
                              column.key,
                              $event,
                            )
                          "
                        ></span>
                      </div>
                    </th>
                    <template v-if="shouldShowRowTotals(container)">
                      <th
                        v-for="total in containerRowTotalHeaders(container)"
                        :key="`row-total-${total.metricId}`"
                      >
                        {{ total.label }}
                      </th>
                    </template>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in containerRowData(container)"
                    :key="row.key"
                    :style="tableRowStyle(container.id, row.key)"
                  >
                    <td class="row-label" :style="rowHeaderStyle(container.id)">
                      <div
                        class="row-tree"
                        :style="{ paddingLeft: `${row.depth * 18}px` }"
                      >
                        <button
                          v-if="row.hasChildren"
                          class="row-toggle"
                          type="button"
                          @click="toggleContainerRow(container.id, row.key)"
                        >
                          {{
                            isContainerRowCollapsed(container.id, row.key)
                              ? '+'
                              : '−'
                          }}
                        </button>
                        <div class="row-content">
                          <span>{{ row.label }}</span>
                        </div>
                      </div>
                      <span
                        class="row-resize-handle"
                        @mousedown.prevent="
                          startTableRowResize(container.id, row.key, $event)
                        "
                      ></span>
                    </td>
                    <td v-for="cell in row.cells" :key="cell.key" class="cell">
                      {{ cell.display }}
                    </td>
                    <template v-if="shouldShowRowTotals(container)">
                      <td
                        v-for="total in containerRowTotals(container, row)"
                        :key="`row-${row.key}-${total.metricId}`"
                        class="total"
                      >
                        {{ total.display }}
                      </td>
                    </template>
                  </tr>
                </tbody>
                <tfoot
                  v-if="
                    shouldShowRowTotals(container) ||
                    shouldShowColumnTotals(container)
                  "
                >
                  <tr>
                    <td v-if="shouldShowColumnTotals(container)">
                      Итого по столбцам
                    </td>
                    <template v-if="shouldShowColumnTotals(container)">
                      <td
                        v-for="column in containerState(container.id).view
                          .columns"
                        :key="`total-${column.key}`"
                        class="total"
                      >
                        {{
                          shouldDisplayColumnTotal(container, column.metricId)
                            ? column.totalDisplay
                            : '—'
                        }}
                      </td>
                    </template>
                    <template v-if="shouldShowRowTotals(container)">
                      <td
                        v-for="total in containerRowTotalHeaders(container)"
                        :key="`grand-${total.metricId}`"
                        class="grand-total"
                      >
                        {{
                          containerState(container.id).view.grandTotals[
                            total.metricId
                          ]?.display || '—'
                        }}
                      </td>
                    </template>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div
              v-else-if="containerState(container.id).chart"
              class="chart-container"
            >
              <ReportChart
                :viz-type="template(container.templateId).visualization"
                :chart-data="containerState(container.id).chart?.data"
                :chart-options="containerState(container.id).chart?.options"
              />
            </div>
            <div v-else class="widget-placeholder">
              Нет данных для выбранного типа визуализации.
            </div>
          </template>
          <div v-else class="widget-placeholder">
            Нет данных для выбранной комбинации полей или фильтров.
          </div>
        </div>
      </article>
    </div>
  </section>
  <section v-else class="page">
    <p>Страница не найдена или удалена.</p>
    <button class="btn-outline" type="button" @click="goBack">Вернуться</button>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  usePageBuilderStore,
  resolveCommonContainerFieldKeys,
} from '@/shared/stores/pageBuilder'
import { fetchPlanRecords } from '@/shared/api/plan'
import { fetchParameterRecords } from '@/shared/api/parameter'
import { sendDataSourceRequest } from '@/shared/api/dataSource'
import { loadReportSources } from '@/shared/api/report'
import ReportChart from '@/components/ReportChart.vue'
import {
  buildPivotView,
  normalizeValue,
  humanizeKey,
  augmentPivotViewWithFormulas,
  filterPivotViewByVisibility,
} from '@/shared/lib/pivotUtils'
import MultiSelectDropdown from '@/components/MultiSelectDropdown.vue'
import { useFieldDictionaryStore } from '@/shared/stores/fieldDictionary'
import {
  normalizeJoinList,
  mergeJoinedRecords,
  fetchJoinPayload,
  parseJoinConfig,
} from '@/shared/lib/sourceJoins'
const route = useRoute()
const router = useRouter()
const store = usePageBuilderStore()
const fieldDictionaryStore = useFieldDictionaryStore()
const pageId = computed(() => route.params.pageId)
const page = computed(() => store.getPageById(pageId.value))
const pageContainers = computed(
  () => store.pageContainers[pageId.value]?.items || [],
)
const dictionaryLabels = computed(() => fieldDictionaryStore.labelMap || {})
const dictionaryLabelsLower = computed(
  () => fieldDictionaryStore.labelMapLower || {},
)
const remoteSourceCatalog = reactive(new Map())
const remoteSourcesLoaded = ref(false)
const remoteSourcesLoading = ref(false)

onMounted(async () => {
  await Promise.all([
    store.fetchTemplates(true),
    store.fetchPages(true),
    fieldDictionaryStore.fetchDictionary(),
  ])
  if (pageId.value) {
    await store.fetchPageContainers(pageId.value, true)
  }
})

watch(
  () => pageId.value,
  async (next) => {
    if (next) {
      await Promise.all([store.fetchPages(true), store.fetchTemplates(true)])
      await store.fetchPageContainers(next, true)
    }
  },
)

const layoutStyle = computed(() => {
  const preset = store.layoutTemplateMap[page.value?.layout?.preset]
  return {
    gridTemplateColumns: pageContainers.value.length ? preset || '1fr' : '1fr',
  }
})

const containerStates = reactive({})
const containerFilterValues = reactive({})
const containerRefreshTimers = reactive({})
const containerTableSizing = reactive({})
const containerRowCollapse = reactive({})
const dataCache = reactive({})
const defaultColumnWidth = 150
const defaultRowHeight = 48
const defaultRowHeaderWidth = 200
const supportedCharts = ['bar', 'line', 'pie']
const chartPalette = [
  '#2b6cb0',
  '#f97316',
  '#0ea5e9',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
]
const FILTER_META_VALUE_LIMIT = 20
const EMPTY_SET = new Set()
const pageFilterValues = reactive({})
const commonFilterKeys = computed(() =>
  resolveCommonContainerFieldKeys(pageContainers.value, store.templates),
)
const pageFilterOptions = computed(() =>
  commonFilterKeys.value.map((key) => ({
    key,
    label: dictionaryLabelValue(key) || humanizeKey(key),
  })),
)
const filterMap = computed(() =>
  pageFilterOptions.value.reduce((acc, filter) => {
    acc[filter.key] = filter
    return acc
  }, {}),
)
const activePageFilters = computed(() =>
  (page.value?.filters || [])
    .map((key) => filterMap.value[key])
    .filter(Boolean),
)
const hasActivePageFilters = computed(() =>
  activePageFilters.value.some((filter) => {
    const value = pageFilterValues[filter.key]
    return Array.isArray(value) && value.length
  }),
)
const activePageFilterKeySet = computed(
  () => new Set((page.value?.filters || []).filter(Boolean)),
)
const globalFilterValueMap = computed(() => buildGlobalFilterValueMap())
let refreshTimer = null
const pageRefreshing = ref(false)
const exportingExcel = ref(false)

function template(templateId) {
  return store.getTemplateById(templateId)
}
function dataSourceLabel(tpl) {
  if (!tpl) return 'Не задан'
  if (tpl.remoteSource?.name) return tpl.remoteSource.name
  const value = tpl.dataSource
  if (value === 'plans') return 'Планы'
  if (value === 'parameters') return 'Параметры'
  if (!value) return 'Не задан'
  return value
}
function containerState(id) {
  if (!containerStates[id]) {
    containerStates[id] = {
      loading: false,
      error: '',
      view: null,
      chart: null,
      signature: '',
      meta: {
        rowTotalsAllowed: new Set(),
        columnTotalsAllowed: new Set(),
        metricGroups: [],
        columnFieldRows: [],
        rowHeaderTitle: 'Строки',
      },
    }
  }
  return containerStates[id]
}
function containerFilterStore(containerId) {
  if (!containerFilterValues[containerId]) {
    containerFilterValues[containerId] = {}
  }
  return containerFilterValues[containerId]
}

function containerStyle(container) {
  const style = {}
  const span = widthToSpan(container?.width)
  if (span > 1) {
    style.gridColumn = `span ${span}`
  }
  const height = container?.height
  if (height && height !== 'auto') {
    style.minHeight = height
    style.maxHeight = height
    style.overflow = 'auto'
  }
  return style
}

function widthToSpan(width) {
  if (width === '3fr') return 3
  if (width === '2fr') return 2
  return 1
}

function rowCollapseStore(containerId) {
  if (!containerRowCollapse[containerId]) {
    containerRowCollapse[containerId] = reactive({})
  }
  return containerRowCollapse[containerId]
}

function toggleContainerRow(containerId, nodeKey) {
  const store = rowCollapseStore(containerId)
  store[nodeKey] = !store[nodeKey]
}

function isContainerRowCollapsed(containerId, nodeKey) {
  return Boolean(rowCollapseStore(containerId)[nodeKey])
}

function ensurePageFilters(keys = []) {
  keys.forEach((key) => {
    if (!(key in pageFilterValues)) {
      pageFilterValues[key] = []
    }
  })
  Object.keys(pageFilterValues).forEach((key) => {
    if (!keys.includes(key)) {
      delete pageFilterValues[key]
    }
  })
}

function templateFilters(container) {
  const tpl = template(container.templateId)
  if (!tpl) return []
  ensureContainerFilters(container.id, tpl)
  const filtersMeta = tpl.snapshot?.filtersMeta || []
  const excluded = activePageFilterKeySet.value
  return filtersMeta.filter((meta) => !excluded.has(meta.key))
}

function ensureContainerFilters(containerId, tpl) {
  const store = containerFilterStore(containerId)
  const list = tpl.snapshot?.filtersMeta || []
  list.forEach((filter) => {
    if (!Array.isArray(store[filter.key])) {
      const defaults = tpl.snapshot?.filterValues?.[filter.key] || []
      store[filter.key] = [...defaults]
    }
  })
  Object.keys(store).forEach((key) => {
    if (!list.find((item) => item.key === key)) {
      delete store[key]
    }
  })
}

function fieldOptions(filter) {
  return (filter.values || []).map((value) => ({
    value,
    label: value || 'пусто',
  }))
}

function templateOptions(container) {
  const tpl = template(container.templateId)
  return tpl?.snapshot?.options || {}
}

function rowTotalsAllowed(container) {
  return containerState(container.id).meta?.rowTotalsAllowed || EMPTY_SET
}

function columnTotalsAllowed(container) {
  return containerState(container.id).meta?.columnTotalsAllowed || EMPTY_SET
}

function containerRowTotalHeaders(container) {
  const state = containerState(container.id)
  const view = state.view
  if (!view || !Array.isArray(view.rowTotalHeaders)) return []
  const allowed = rowTotalsAllowed(container)
  if (!allowed.size) return []
  return view.rowTotalHeaders.filter((header) => allowed.has(header.metricId))
}

function containerRowTotals(container, row) {
  const allowed = rowTotalsAllowed(container)
  if (!allowed.size) return []
  return (row.totals || []).filter((total) => allowed.has(total.metricId))
}

function containerMetricColumnGroups(container) {
  return containerState(container.id).meta?.metricGroups || []
}

function hasMetricGroups(container) {
  return containerMetricColumnGroups(container).length > 0
}

function templateFieldMetaMap(template) {
  return new Map(Object.entries(template?.snapshot?.fieldMeta || {}))
}

function isTableVisualization(container) {
  const tpl = template(container.templateId)
  return !tpl || !tpl.visualization || tpl.visualization === 'table'
}

function shouldShowRowTotals(container) {
  const options = templateOptions(container)
  const allowed = rowTotalsAllowed(container)
  if (!allowed.size) return false
  if (options.showRowTotals === undefined) return true
  return Boolean(options.showRowTotals)
}

function shouldShowColumnTotals(container) {
  const options = templateOptions(container)
  const allowed = columnTotalsAllowed(container)
  if (!allowed.size) return false
  if (options.showColumnTotals === undefined) return true
  return Boolean(options.showColumnTotals)
}

function shouldDisplayColumnTotal(container, metricId) {
  return columnTotalsAllowed(container).has(metricId)
}

function containerRowHeaderTitle(container) {
  return containerState(container.id).meta?.rowHeaderTitle || 'Строки'
}

function containerColumnFieldRows(container) {
  return containerState(container.id).meta?.columnFieldRows || []
}

function containerRowHeaderRowSpan(container) {
  const metricRows = hasMetricGroups(container) ? 1 : 0
  const columnRows = containerColumnFieldRows(container).length || 1
  return metricRows + columnRows
}

function flattenRowTree(nodes = [], collapseState = {}) {
  const result = []
  const walk = (list) => {
    list.forEach((node) => {
      const item = {
        key: node.key,
        label: node.label,
        fieldLabel: node.fieldLabel,
        depth: node.depth,
        hasChildren: Boolean(node.children?.length),
        cells: node.cells,
        totals: node.totals,
      }
      result.push(item)
      if (!collapseState[node.key] && node.children?.length) {
        walk(node.children)
      }
    })
  }
  walk(nodes)
  return result
}

function tableSizing(containerId) {
  if (!containerTableSizing[containerId]) {
    containerTableSizing[containerId] = {
      columnWidths: reactive({}),
      rowHeights: reactive({}),
    }
  }
  return containerTableSizing[containerId]
}

function tableColumnStyle(containerId, columnKey) {
  const sizing = tableSizing(containerId)
  const width = sizing.columnWidths[columnKey] || defaultColumnWidth
  return { width: `${width}px` }
}

function tableRowStyle(containerId, rowKey) {
  const sizing = tableSizing(containerId)
  const height = sizing.rowHeights[rowKey] || defaultRowHeight
  return { height: `${height}px` }
}

function rowHeaderStyle(containerId) {
  const sizing = tableSizing(containerId)
  const width = sizing.rowHeaderWidth || defaultRowHeaderWidth
  return { width: `${width}px` }
}

function startTableColumnResize(containerId, columnKey, event) {
  const sizing = tableSizing(containerId)
  const startX = event.clientX
  const th = event.currentTarget.closest('th')
  const initial =
    sizing.columnWidths[columnKey] || th?.offsetWidth || defaultColumnWidth
  const onMove = (e) => {
    const delta = e.clientX - startX
    sizing.columnWidths[columnKey] = Math.max(80, initial + delta)
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function startTableRowResize(containerId, rowKey, event) {
  const sizing = tableSizing(containerId)
  const startY = event.clientY
  const tr = event.currentTarget.closest('tr')
  const initial =
    sizing.rowHeights[rowKey] || tr?.offsetHeight || defaultRowHeight
  const onMove = (e) => {
    const delta = e.clientY - startY
    sizing.rowHeights[rowKey] = Math.max(36, initial + delta)
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function startRowHeaderResize(containerId, event) {
  const sizing = tableSizing(containerId)
  const startX = event.clientX
  const th = event.currentTarget.closest('th')
  const initial =
    sizing.rowHeaderWidth || th?.offsetWidth || defaultRowHeaderWidth
  const onMove = (e) => {
    const delta = e.clientX - startX
    sizing.rowHeaderWidth = Math.max(140, initial + delta)
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function syncTableSizing(containerId, view) {
  const sizing = tableSizing(containerId)
  const columnKeys = new Set(view.columns.map((column) => column.key))
  Object.keys(sizing.columnWidths).forEach((key) => {
    if (!columnKeys.has(key) && key !== '__rows__') {
      delete sizing.columnWidths[key]
    }
  })
  const rowKeys =
    view.rowTree && view.rowTree.length
      ? collectTreeKeys(view.rowTree)
      : new Set((view.rows || []).map((row) => row.key))
  Object.keys(sizing.rowHeights).forEach((key) => {
    if (!rowKeys.has(key)) {
      delete sizing.rowHeights[key]
    }
  })
}

function collectTreeKeys(tree = []) {
  const keys = new Set()
  const walk = (nodes) => {
    nodes.forEach((node) => {
      keys.add(node.key)
      if (node.children?.length) walk(node.children)
    })
  }
  walk(tree)
  return keys
}

function groupColumnsByLevel(columns, levelIndex) {
  const cells = []
  let pointer = 0
  while (pointer < columns.length) {
    const value = getColumnLevelValue(columns[pointer], levelIndex)
    let span = 1
    while (
      pointer + span < columns.length &&
      getColumnLevelValue(columns[pointer + span], levelIndex) === value
    ) {
      span += 1
    }
    cells.push({ label: value, colspan: span })
    pointer += span
  }
  return cells
}

function getColumnLevelValue(column, levelIndex) {
  const level = column.levels?.[levelIndex]
  if (!level) return 'Итого'
  return level.value || '—'
}

function containerRowData(container) {
  const view = containerState(container.id).view
  if (!view) return []
  return flattenContainerRows(container.id, view)
}

function flattenContainerRows(containerId, view) {
  if (view.rowTree && view.rowTree.length) {
    return flattenRowTree(view.rowTree, rowCollapseStore(containerId))
  }
  return (view.rows || []).map((row) => ({
    key: row.key,
    label: row.label,
    fieldLabel: '',
    depth: 0,
    hasChildren: false,
    cells: row.cells,
    totals: row.totals,
  }))
}

function includesNodeKey(node, key) {
  if (!node) return false
  if (node.key === key) return true
  return node.children?.some((child) => includesNodeKey(child, key))
}

async function ensureTemplateData(tpl, options = {}) {
  if (!tpl) {
    throw new Error('Привяжите представление для отображения данных.')
  }
  if (tpl.remoteSource) {
    return ensureRemoteSourceData(tpl.remoteSource, options)
  }
  return ensureFallbackData(tpl.dataSource, options)
}

async function ensureFallbackData(source, { force = false } = {}) {
  if (!source) throw new Error('В представлении не выбран источник данных.')
  if (!force && dataCache[source]) return dataCache[source]
  let records = []
  if (source === 'plans') {
    records = await fetchPlanRecords()
  } else if (source === 'parameters') {
    records = await fetchParameterRecords()
  } else {
    throw new Error(`Источник «${source}» не поддерживается.`)
  }
  dataCache[source] = records
  return records
}

async function ensureRemoteSourceData(source, { force = false } = {}) {
  const cacheKey =
    source?.remoteId ||
    source?.id ||
    `${source?.method || 'POST'}:${source?.url || source?.remoteMeta?.URL || ''}`
  if (!force && cacheKey && dataCache[cacheKey]) {
    return dataCache[cacheKey]
  }
  const request = buildRemoteRequest(source)
  const response = await sendDataSourceRequest(request)
  let records = extractRecords(response)
  const joins = resolveSourceJoins(source)
  if (records?.length && joins.length) {
    try {
      const joinResults = await fetchRemoteJoinRecords(joins)
      const successful = joinResults.filter((item) => !item.error)
      if (successful.length) {
        const joinRecordsList = successful.map((item) => item.records || [])
        const appliedJoins = successful.map((item) => joins[item.index])
        const { records: enriched } = mergeJoinedRecords(
          records,
          appliedJoins,
          joinRecordsList,
        )
        records = enriched
      }
    } catch (err) {
      console.warn('Failed to merge remote joins', err)
    }
  }
  if (cacheKey) {
    dataCache[cacheKey] = records
  }
  return records
}

function buildRemoteRequest(source = {}) {
  const url = source?.url || source?.remoteMeta?.URL || ''
  if (!url) {
    throw new Error('У источника данных отсутствует URL.')
  }
  const method = String(
    source?.method || source?.remoteMeta?.Method || 'POST',
  ).toUpperCase()
  const headers = normalizeRemoteHeaders(
    source?.headers || source?.remoteMeta?.Headers,
  )
  const body = normalizeRemoteBody(
    source?.body ?? source?.remoteMeta?.MethodBody,
  )
  return { url, method, headers, body }
}

function normalizeRemoteHeaders(raw) {
  if (!raw) return { 'Content-Type': 'application/json' }
  if (typeof raw === 'object') return raw
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    // ignore
  }
  return { 'Content-Type': 'application/json' }
}

function normalizeRemoteBody(raw) {
  if (raw == null || raw === '') return undefined
  if (typeof raw === 'object') return raw
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function extractRecords(payload) {
  if (!payload || typeof payload !== 'object') {
    return Array.isArray(payload) ? payload : []
  }
  if (Array.isArray(payload.result?.records)) return payload.result.records
  if (Array.isArray(payload.result)) return payload.result
  if (Array.isArray(payload.records)) return payload.records
  return []
}

async function fetchRemoteJoinRecords(joins = []) {
  if (!joins.length) return []
  await ensureRemoteSourceCatalog()
  const tasks = joins.map(async (join, index) => {
    const target = getRemoteSourceFromCatalog(join.targetSourceId)
    if (!target) {
      return {
        index,
        join,
        records: [],
        error: `Источник связи «${join.targetSourceId}» не найден.`,
      }
    }
    const { payload, error } = buildJoinRequestPayload(target)
    if (!payload || error) {
      return {
        index,
        join,
        records: [],
        error:
          error ||
          `Источник связи «${join.targetSourceId}» содержит некорректный запрос.`,
      }
    }
    try {
      const response = await fetchJoinPayload(payload, { cache: true })
      return {
        index,
        join,
        records: extractRecords(response),
      }
    } catch (err) {
      return {
        index,
        join,
        records: [],
        error:
          err?.response?.data?.message ||
          err?.message ||
          `Не удалось выполнить связь «${join.targetSourceId}».`,
      }
    }
  })
  const results = await Promise.all(tasks)
  return results.sort((a, b) => a.index - b.index)
}

async function ensureRemoteSourceCatalog(force = false) {
  if (remoteSourcesLoaded.value && !force && remoteSourceCatalog.size) {
    return remoteSourceCatalog
  }
  if (remoteSourcesLoading.value && !force) {
    return remoteSourceCatalog
  }
  remoteSourcesLoading.value = true
  try {
    remoteSourceCatalog.clear()
    const records = await loadReportSources()
    ;(records || []).forEach((entry, index) => {
      const normalized = normalizeRemoteSourceRecord(entry, index)
      const key = normalized.remoteId || normalized.id
      if (key) {
        remoteSourceCatalog.set(String(key), normalized)
      }
      if (normalized.name && !remoteSourceCatalog.has(normalized.name)) {
        remoteSourceCatalog.set(normalized.name, normalized)
      }
    })
    remoteSourcesLoaded.value = true
  } catch (err) {
    console.warn('Failed to load remote sources for joins', err)
  } finally {
    remoteSourcesLoading.value = false
  }
  return remoteSourceCatalog
}

function getRemoteSourceFromCatalog(id) {
  if (id == null) return null
  const direct = remoteSourceCatalog.get(String(id))
  if (direct) return direct
  return remoteSourceCatalog.get(id)
}

function normalizeRemoteSourceRecord(entry = {}, index = 0) {
  const remoteId = entry?.id ?? entry?.Id ?? entry?.ID
  const normalizedId =
    remoteId !== undefined && remoteId !== null
      ? String(remoteId)
      : `remote-${index}`
  const method =
    entry?.nameMethodTyp ||
    entry?.Method ||
    entry?.method ||
    entry?.httpMethod ||
    'POST'
  const headers = entry?.headers || entry?.Headers || {}
  const body =
    entry?.MethodBody ||
    entry?.body ||
    entry?.payload ||
    entry?.requestBody ||
    entry?.rawBody ||
    ''
  return {
    id: normalizedId,
    remoteId: normalizedId,
    name: entry?.name || entry?.Name || '',
    url: entry?.URL || entry?.url || entry?.requestUrl || '',
    httpMethod: String(method || 'POST').toUpperCase(),
    rawBody: formatRawBody(body),
    headers,
    joins: parseJoinConfig(entry?.joinConfig || entry?.JoinConfig),
    remoteMeta: entry || {},
  }
}

function formatRawBody(body) {
  if (!body) return ''
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return body
    }
  }
  try {
    return JSON.stringify(body, null, 2)
  } catch {
    return ''
  }
}

function buildJoinRequestPayload(source = {}) {
  const url = source.url?.trim()
  if (!url) {
    return { payload: null, error: 'У источника нет URL.' }
  }
  const method = String(source.httpMethod || 'POST').toUpperCase()
  const headers = normalizeRemoteHeaders(
    source.headers || source.remoteMeta?.Headers,
  )
  const rawBody = source.rawBody?.trim() || ''
  if (method === 'GET') {
    if (!rawBody) {
      return { payload: { url, method, headers }, error: null }
    }
    const parsed = safeJsonParse(rawBody)
    if (!parsed.ok) {
      return {
        payload: null,
        error: 'Параметры GET-запроса должны быть корректным JSON.',
      }
    }
    return { payload: { url, method, headers, body: parsed.value }, error: null }
  }
  if (!rawBody) {
    return { payload: null, error: 'Тело запроса не заполнено.' }
  }
  const parsed = safeJsonParse(rawBody)
  if (!parsed.ok || typeof parsed.value !== 'object') {
    return {
      payload: null,
      error: 'Тело запроса должно быть валидным JSON-объектом.',
    }
  }
  return { payload: { url, method, headers, body: parsed.value }, error: null }
}

function safeJsonParse(value = '') {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch {
    return { ok: false, value: null }
  }
}

function resolveSourceJoins(source = {}) {
  if (!source) return []
  if (Array.isArray(source.joins) && source.joins.length) {
    return normalizeJoinList(source.joins)
  }
  const parsed = parseJoinConfig(source?.remoteMeta?.joinConfig)
  return normalizeJoinList(parsed)
}

function matchFieldSet(record, keys = [], store = {}) {
  return (keys || []).every((key) => {
    const selected = store?.[key]
    if (!selected || !selected.length) return true
    const value = normalizeValue(record?.[key])
    return selected.includes(value)
  })
}

function matchesGlobalFilters(record) {
  if (!activePageFilters.value.length) return true
  return activePageFilters.value.every((filter) => {
    const value = pageFilterValues[filter.key]
    if (!Array.isArray(value) || !value.length) return true
    const recordValue = normalizeValue(record?.[filter.key])
    if (!recordValue && recordValue !== '') return false
    return value.includes(recordValue)
  })
}

function filterRecords(records, snapshot, source, containerId) {
  if (!Array.isArray(records)) return []
  const pivot = snapshot?.pivot || {}
  const filterValues = {
    ...(snapshot?.filterValues || {}),
  }
  const containerOverrides = containerFilterValues[containerId] || {}
  Object.entries(containerOverrides).forEach(([key, values]) => {
    filterValues[key] = [...values]
  })
  const dimensionValues = snapshot?.dimensionValues || {}

  return records.filter((record) => {
    if (!matchesGlobalFilters(record)) return false
    if (!matchFieldSet(record, pivot.filters, filterValues)) return false
    if (!matchFieldSet(record, pivot.rows, dimensionValues.rows || {}))
      return false
    if (!matchFieldSet(record, pivot.columns, dimensionValues.columns || {}))
      return false
    return true
  })
}

function prepareMetrics(list = []) {
  return (list || [])
    .filter((metric) =>
      metric?.type === 'formula'
        ? Boolean(metric.expression && String(metric.expression).trim())
        : Boolean(metric.fieldKey),
    )
    .map((metric, index) => {
      const displayLabel = metricDisplayLabel(metric)
      return {
        ...metric,
        id: metric.id || `metric-${index}`,
        type: metric.type || 'base',
        label: displayLabel,
        enabled: metric.enabled !== false,
        outputFormat:
          metric.outputFormat ||
          (metric.type === 'formula' ? 'number' : 'auto'),
        precision: Number.isFinite(metric.precision)
          ? Number(metric.precision)
          : metric.type === 'formula'
            ? 2
            : 2,
      }
    })
}

function metricDisplayLabel(metric = {}) {
  if (metric.type === 'formula') {
    return (
      (typeof metric.title === 'string' && metric.title.trim()) ||
      metric.label ||
      'Формула'
    )
  }
  const title =
    (typeof metric.title === 'string' && metric.title.trim()) ||
    (typeof metric.fieldLabel === 'string' && metric.fieldLabel.trim())
  if (title) return title
  if (typeof metric.label === 'string' && metric.label.trim()) {
    return metric.label.trim()
  }
  return metric.fieldKey || ''
}

function buildChartConfig(view, vizType, rowTotalsAllowed = new Set()) {
  if (!supportedCharts.includes(vizType)) return null
  const labels = view.rows.map((row) => row.label || '—')
  let datasets = []

  if (view.columns.length) {
    datasets = view.columns.map((column, index) => {
      const color = chartPalette[index % chartPalette.length]
      const data = view.rows.map((row) => {
        const cell = row.cells[index]
        return typeof cell?.value === 'number' ? Number(cell.value) : 0
      })
      return {
        label: column.label,
        data,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 2,
        tension: 0.3,
        fill: vizType !== 'line',
      }
    })
  }

  if (!datasets.length && view.rowTotalHeaders.length) {
    const allowedHeaders = view.rowTotalHeaders.filter((header) =>
      rowTotalsAllowed.has(header.metricId),
    )
    datasets = allowedHeaders.map((header, index) => {
      const color = chartPalette[index % chartPalette.length]
      const data = view.rows.map((row) => {
        const total = row.totals.find(
          (item) => item.metricId === header.metricId,
        )
        return typeof total?.value === 'number' ? Number(total.value) : 0
      })
      return {
        label: header.label,
        data,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 2,
        tension: 0.3,
        fill: vizType !== 'line',
      }
    })
  }

  if (!datasets.length) return null

  if (vizType === 'pie') {
    const pieDataset = datasets[0]
    const pieColors = labels.map(
      (_, idx) => chartPalette[idx % chartPalette.length],
    )
    return {
      data: {
        labels,
        datasets: [
          {
            ...pieDataset,
            backgroundColor: pieColors,
            borderColor: '#fff',
            borderWidth: 1,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    }
  }

  return {
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { ticks: { autoSkip: false } },
        y: { beginAtZero: true },
      },
    },
  }
}

async function hydrateContainer(container) {
  const tpl = template(container.templateId)
  const state = containerState(container.id)
  if (!tpl) {
    state.loading = false
    state.error = 'Привяжите представление для отображения данных.'
    state.view = null
    state.chart = null
    state.signature = ''
    return
  }

  ensureContainerFilters(container.id, tpl)
  const signature = JSON.stringify({
    templateId: tpl.id,
    snapshot: tpl.snapshot,
    visualization: tpl.visualization,
    globalFilters: activePageFilters.value.map((filter) => ({
      key: filter.key,
      value: Array.isArray(pageFilterValues[filter.key])
        ? [...pageFilterValues[filter.key]].sort()
        : [],
    })),
    containerFilters: containerFilterValues[container.id],
  })
  if (state.signature === signature && state.view) {
    return
  }

  state.signature = signature
  state.loading = true
  state.error = ''
  state.view = null
  state.chart = null
  state.meta.rowTotalsAllowed = new Set()
  state.meta.columnTotalsAllowed = new Set()
  state.meta.metricGroups = []
  state.meta.columnFieldRows = []
  state.meta.rowHeaderTitle = 'Строки'

  try {
    const records = await ensureTemplateData(tpl)
    const filtered = filterRecords(
      records,
      tpl.snapshot,
      tpl.dataSource,
      container.id,
    )
    const metrics = prepareMetrics(tpl.snapshot?.metrics)
    const rowTotalsAllowed = new Set(
      metrics
        .filter(
          (metric) =>
            metric.showRowTotals !== false && metric.enabled !== false,
        )
        .map((metric) => metric.id),
    )
    const columnTotalsAllowed = new Set(
      metrics
        .filter(
          (metric) =>
            metric.showColumnTotals !== false && metric.enabled !== false,
        )
        .map((metric) => metric.id),
    )
    state.meta.rowTotalsAllowed = rowTotalsAllowed
    state.meta.columnTotalsAllowed = columnTotalsAllowed
    state.meta.metrics = metrics
    if (!metrics.length) {
      throw new Error('В представлении не выбраны метрики.')
    }
    const baseMetrics = metrics.filter((metric) => metric.type !== 'formula')
    const hasBaseMetric = baseMetrics.length > 0
    if (!hasBaseMetric) {
      throw new Error('Добавьте хотя бы одну базовую метрику в представлении.')
    }
    let baseView
    try {
      baseView = buildPivotView({
        records: filtered,
        rows: tpl.snapshot?.pivot?.rows || [],
        columns: tpl.snapshot?.pivot?.columns || [],
        metrics: baseMetrics,
        fieldMeta: templateFieldMetaMap(tpl),
        headerOverrides: tpl.snapshot?.options?.headerOverrides || {},
        sorts: tpl.snapshot?.options?.sorts || {},
      })
    } catch (err) {
      if (err?.code === 'VALUE_AGGREGATION_COLLISION') {
        throw new Error(
          `Метрика с типом «Значение» использует несколько записей на одну ячейку. Скорректируйте конфигурацию на вкладке «Данные».`,
        )
      }
      throw err
    }
    const augmented = augmentPivotViewWithFormulas(baseView, metrics)
    const view = filterPivotViewByVisibility(augmented, metrics)
    if (!view || !view.rows.length) {
      state.error = 'Нет данных после применения фильтров.'
      return
    }
    state.view = view
    state.chart = buildChartConfig(view, tpl.visualization, rowTotalsAllowed)
    const headerMeta = buildHeaderMeta(
      tpl,
      metrics.filter((metric) => metric.enabled !== false),
      view,
    )
    state.meta.metricGroups = headerMeta.metricGroups
    state.meta.columnFieldRows = headerMeta.columnFieldRows
    state.meta.rowHeaderTitle = headerMeta.rowHeaderTitle
    syncTableSizing(container.id, view)
    const collapseStore = rowCollapseStore(container.id)
    Object.keys(collapseStore).forEach((key) => {
      if (!(view.rowTree || []).some((node) => includesNodeKey(node, key))) {
        delete collapseStore[key]
      }
    })
  } catch (err) {
    state.error = err?.message || 'Не удалось построить виджет.'
  } finally {
    state.loading = false
  }
}

function refreshContainers() {
  const list = pageContainers.value || []
  const ids = new Set(list.map((container) => container.id))
  list.forEach((container) => {
    hydrateContainer(container)
  })
  Object.keys(containerStates).forEach((id) => {
    if (!ids.has(id)) delete containerStates[id]
  })
  Object.keys(containerFilterValues).forEach((id) => {
    if (!ids.has(id)) delete containerFilterValues[id]
  })
  Object.keys(containerTableSizing).forEach((id) => {
    if (!ids.has(id)) delete containerTableSizing[id]
  })
  Object.keys(containerRowCollapse).forEach((id) => {
    if (!ids.has(id)) delete containerRowCollapse[id]
  })
}

async function refreshPageData() {
  if (pageRefreshing.value) return
  pageRefreshing.value = true
  try {
    await Promise.all([store.fetchTemplates(true), store.fetchPages(true)])
    if (pageId.value) {
      await store.fetchPageContainers(pageId.value, true)
    }
    const containers = pageContainers.value || []
    if (!containers.length) {
      refreshContainers()
      return
    }
    const grouped = groupContainersByTemplate(containers)
    const tasks = grouped.map(async ({ tpl, containers: related }) => {
      const records = await ensureTemplateData(tpl, { force: true })
      const filtersMeta = buildFilterMetaFromRecords(tpl, records)
      if (!tpl.snapshot) {
        tpl.snapshot = {}
      }
      tpl.snapshot.filtersMeta = filtersMeta
      related.forEach((container) => {
        ensureContainerFilters(container.id, tpl)
        syncContainerFilterSelections(container.id, filtersMeta)
      })
    })
    await Promise.all(tasks)
    refreshContainers()
  } catch (err) {
    console.warn('Failed to refresh page data', err)
    alert('Не удалось обновить данные. Попробуйте позже.')
  } finally {
    pageRefreshing.value = false
  }
}

function collectContainerExportData() {
  const list = pageContainers.value || []
  return list
    .map((container, index) => {
      const state = containerState(container.id)
      const view = state.view
      if (!view) return null
      const tpl = template(container.templateId)
      return {
        title: container.title || tpl?.name || `Контейнер ${index + 1}`,
        headerMeta: {
          metricGroups: state.meta.metricGroups || [],
          columnFieldRows: state.meta.columnFieldRows || [],
          rowHeaderTitle: state.meta.rowHeaderTitle || 'Строки',
        },
        columns: view.columns || [],
        rows: flattenExportRows(view),
        showRowTotals: shouldShowRowTotals(container),
        showColumnTotals: shouldShowColumnTotals(container),
        rowTotals: containerRowTotalHeaders(container),
        rowTotalsSet: new Set(rowTotalsAllowed(container)),
        columnTotalsSet: new Set(columnTotalsAllowed(container)),
        columnTotals: (view.columns || []).map((column) => column.totalDisplay),
        grandTotals: view.grandTotals || {},
      }
    })
    .filter(Boolean)
}

function exportPageAsExcel() {
  const payload = collectContainerExportData()
  if (!payload.length) {
    alert('Нет данных для выгрузки.')
    return
  }
  exportingExcel.value = true
  try {
    const html = buildExcelDocument(payload)
    downloadBlob(html, 'application/vnd.ms-excel', buildExportFilename('xls'))
  } catch (err) {
    console.warn('Failed to export Excel', err)
    alert('Не удалось выгрузить данные в Excel.')
  } finally {
    exportingExcel.value = false
  }
}

function buildExcelDocument(containers) {
  const worksheets = containers
    .map((container, index) => buildWorksheetXml(container, index))
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    ${worksheets}
  </Workbook>`
}

function buildWorksheetXml(container, index) {
  const name = sanitizeWorksheetName(container.title || `Sheet ${index + 1}`)
  const rowsXml = buildWorksheetRowsXml(container)
  return `<Worksheet ss:Name="${name}"><Table>${rowsXml}</Table></Worksheet>`
}

function buildWorksheetRowsXml(container) {
  const {
    headerMeta,
    columns,
    rows,
    showRowTotals,
    showColumnTotals,
    rowTotals,
    rowTotalsSet,
    columnTotalsSet,
    columnTotals,
    grandTotals,
  } = container
  const metricGroups = headerMeta.metricGroups || []
  const columnRows = headerMeta.columnFieldRows || []
  const parts = []

  if (metricGroups.length) {
    const metricCells = [headerMeta.rowHeaderTitle]
    metricGroups.forEach((group) => {
      metricCells.push(group.label || '')
    })
    if (showRowTotals) {
      rowTotals.forEach((total) => metricCells.push(total.label || ''))
    }
    parts.push(buildWorksheetRow(metricCells))
  }

  if (columnRows.length) {
    columnRows.forEach((headerRow, rowIndex) => {
      const cells = []
      if (!metricGroups.length && rowIndex === 0) {
        cells.push(headerMeta.rowHeaderTitle)
      } else {
        cells.push('')
      }
      headerRow.segments.forEach((segment) => {
        segment.cells.forEach((cell) => cells.push(cell.label || ''))
      })
      if (!metricGroups.length && rowIndex === 0 && showRowTotals) {
        rowTotals.forEach((total) => cells.push(total.label || ''))
      }
      parts.push(buildWorksheetRow(cells))
    })
  } else {
    const headerCells = []
    headerCells.push(metricGroups.length ? '' : headerMeta.rowHeaderTitle)
    columns.forEach((column) => headerCells.push(column.label || ''))
    if (showRowTotals) {
      rowTotals.forEach((total) => headerCells.push(total.label || ''))
    }
    parts.push(buildWorksheetRow(headerCells))
  }

  rows.forEach((row) => {
    const cells = [row.label || '']
    row.cells.forEach((cell) => cells.push(cell.display || ''))
    if (showRowTotals) {
      filterRowTotalsForExport(row.totals, rowTotalsSet).forEach((total) => {
        cells.push(total.display || '')
      })
    }
    parts.push(buildWorksheetRow(cells))
  })

  if (showColumnTotals) {
    const totalCells = ['Итого по столбцам']
    columns.forEach((column, index) => {
      totalCells.push(
        columnTotalsSet.has(column.metricId) ? columnTotals[index] || '' : '',
      )
    })
    if (showRowTotals) {
      rowTotals.forEach((total) => {
        totalCells.push(grandTotals?.[total.metricId]?.display || '')
      })
    }
    parts.push(buildWorksheetRow(totalCells))
  }
  return parts.join('')
}

function buildWorksheetRow(values = []) {
  const cells = values
    .map(
      (value) =>
        `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`,
    )
    .join('')
  return `<Row>${cells}</Row>`
}

function sanitizeWorksheetName(name = '') {
  const forbidden = /[\\/?*[\]:]/g
  const trimmed = (name || '').replace(forbidden, '').slice(0, 31)
  return escapeXml(trimmed || 'Sheet')
}

function escapeXml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function flattenExportRows(view) {
  if (!view) return []
  if (view.rowTree && view.rowTree.length) {
    return flattenRowTree(view.rowTree, {})
  }
  return (view.rows || []).map((row) => ({
    key: row.key,
    label: row.label,
    cells: row.cells,
    totals: row.totals,
  }))
}

function filterRowTotalsForExport(totals = [], allowed = new Set()) {
  if (!allowed || !allowed.size) return []
  return (totals || []).filter((total) => allowed.has(total.metricId))
}

function downloadBlob(content, mime, filename) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function buildExportFilename(extension) {
  const base = page.value?.pageTitle || 'report-page'
  const safeBase = base.replace(/[^\w\d-_]+/g, '_')
  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]
  return `${safeBase || 'page'}-${timestamp}.${extension}`
}

function groupContainersByTemplate(containers = []) {
  const map = new Map()
  containers.forEach((container) => {
    const tpl = template(container.templateId)
    if (!tpl) return
    const key = tpl.id || container.templateId
    if (!map.has(key)) {
      map.set(key, { tpl, containers: [] })
    }
    map.get(key).containers.push(container)
  })
  return Array.from(map.values())
}

function buildFilterMetaFromRecords(tpl, records = []) {
  const snapshot = tpl?.snapshot
  if (!snapshot) return []
  const filters = snapshot?.pivot?.filters || []
  if (!filters.length) return []
  const overrides = snapshot?.options?.headerOverrides || {}
  const fieldMeta = snapshot?.fieldMeta || {}
  return filters.map((key) => ({
    key,
    label: resolveFieldLabel(key, overrides, fieldMeta),
    values: collectFilterValuesFromRecords(
      records,
      key,
      FILTER_META_VALUE_LIMIT,
    ),
  }))
}

function resolveFieldLabel(key, overrides = {}, fieldMeta = {}) {
  const normalizedKey = key || ''
  const override = overrides?.[normalizedKey]
  if (override && override.trim()) return override.trim()
  const dictionaryLabel = dictionaryLabelValue(normalizedKey)
  if (dictionaryLabel) return dictionaryLabel
  const meta = fieldMeta?.[normalizedKey]
  if (meta?.label) return meta.label
  return humanizeKey(normalizedKey)
}

function dictionaryLabelValue(key) {
  if (key === null || typeof key === 'undefined') return ''
  const normalized = String(key).trim()
  if (!normalized) return ''
  const direct = dictionaryLabels.value[normalized]
  if (direct) return direct
  const lower = normalized.toLowerCase()
  return dictionaryLabelsLower.value[lower] || ''
}

function globalFilterValueOptions(key) {
  return globalFilterValueMap.value.get(key) || []
}

function buildGlobalFilterValueMap() {
  const containers = pageContainers.value || []
  const templateMap = new Map(store.templates.map((tpl) => [tpl.id, tpl]))
  const aggregate = new Map()
  containers.forEach((container) => {
    const tpl = templateMap.get(container.templateId)
    if (!tpl) return
    collectTemplateFilterValues(aggregate, tpl.snapshot || {})
  })
  const result = new Map()
  aggregate.forEach((set, key) => {
    const options = Array.from(set).map((value) => ({
      value,
      label: value || 'пусто',
    }))
    result.set(key, options)
  })
  return result
}

function collectTemplateFilterValues(targetMap, snapshot = {}) {
  if (!snapshot) return
  const addValues = (key, values = []) => {
    if (!key) return
    const normalizedKey = String(key).trim()
    if (!normalizedKey) return
    if (!targetMap.has(normalizedKey)) {
      targetMap.set(normalizedKey, new Set())
    }
    const bucket = targetMap.get(normalizedKey)
    ;(values || []).forEach((value) => {
      const normalizedValue = normalizeValue(value)
      bucket.add(normalizedValue)
    })
  }
  ;(snapshot.filtersMeta || []).forEach((meta) =>
    addValues(meta?.key, meta?.values || []),
  )
  Object.entries(snapshot.fieldMeta || {}).forEach(([key, meta]) => {
    if (Array.isArray(meta?.values)) {
      addValues(key, meta.values)
    }
    if (meta?.sample && meta.sample !== '—') {
      addValues(key, [meta.sample])
    }
  })
  Object.entries(snapshot.filterValues || {}).forEach(([key, values]) =>
    addValues(key, values),
  )
  const dimensionValues = snapshot.dimensionValues || {}
  Object.values(dimensionValues).forEach((store) => {
    Object.entries(store || {}).forEach(([key, values]) =>
      addValues(key, values),
    )
  })
}

function collectFilterValuesFromRecords(
  records = [],
  key,
  limit = FILTER_META_VALUE_LIMIT,
) {
  if (!Array.isArray(records) || !records.length) return []
  const unique = new Set()
  for (const record of records) {
    const normalized = normalizeValue(record?.[key])
    if (!unique.has(normalized)) {
      unique.add(normalized)
    }
    if (unique.size >= limit) break
  }
  return Array.from(unique)
}

function syncContainerFilterSelections(containerId, filtersMeta = []) {
  const store = containerFilterStore(containerId)
  const allowedMap = new Map(
    filtersMeta.map((meta) => [
      meta.key,
      new Set((meta.values || []).map((value) => normalizeValue(value))),
    ]),
  )
  Object.keys(store).forEach((key) => {
    const allowed = allowedMap.get(key)
    if (!allowed) {
      delete store[key]
      return
    }
    const current = store[key] || []
    const filtered = current.filter((value) =>
      allowed.has(normalizeValue(value)),
    )
    if (filtered.length !== current.length) {
      store[key] = filtered
    }
  })
}

function buildHeaderMeta(tpl, metrics = [], view = null) {
  const snapshot = tpl?.snapshot || {}
  const overrides = snapshot?.options?.headerOverrides || {}
  const fieldMeta = snapshot?.fieldMeta || {}
  const rowFields = snapshot?.pivot?.rows || []
  const columnFields = snapshot?.pivot?.columns || []
  const rowHeaderTitle = rowFields.length
    ? rowFields
        .map((key) => resolveFieldLabel(key, overrides, fieldMeta))
        .join(' › ')
    : 'Строки'
  const columns = view?.columns || []
  const metricGroups =
    columns.length && metrics.length
      ? metrics.map((metric) => {
          const entries = columns.filter(
            (column) => column.metricId === metric.id,
          )
          return {
            metric,
            entries,
            span: entries.length || 1,
            label: metric.label || metricDisplayLabel(metric),
          }
        })
      : []
  const columnFieldRows =
    metricGroups.length && columnFields.length
      ? columnFields.map((fieldKey, levelIndex) => {
          const fieldLabel = resolveFieldLabel(fieldKey, overrides, fieldMeta)
          const isValue = levelIndex === columnFields.length - 1
          const segments = metricGroups.map((group) => {
            const entries = group.entries
            const cells = isValue
              ? entries.map((column) => ({
                  label: getColumnLevelValue(column, levelIndex),
                  colspan: 1,
                  styleKey: column.key,
                  isValue: true,
                }))
              : groupColumnsByLevel(entries, levelIndex).map((cell) => ({
                  label: cell.label,
                  colspan: cell.colspan,
                  isValue: false,
                }))
            return { metricId: group.metric.id, cells }
          })
          return { fieldLabel, segments }
        })
      : []
  return {
    rowHeaderTitle,
    metricGroups,
    columnFieldRows,
  }
}

function scheduleRefresh() {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshContainers()
  }, 200)
}

function requestContainerRefresh(containerId) {
  if (containerRefreshTimers[containerId]) {
    clearTimeout(containerRefreshTimers[containerId])
  }
  containerRefreshTimers[containerId] = setTimeout(() => {
    const container = pageContainers.value.find(
      (item) => item.id === containerId,
    )
    if (container) {
      hydrateContainer(container)
    }
  }, 200)
}

watch(
  () => pageContainers.value,
  () => {
    refreshContainers()
  },
  { immediate: true, deep: true },
)

watch(
  () => store.templates,
  () => {
    refreshContainers()
  },
  { deep: true },
)

watch(
  () => page.value?.filters,
  (keys = []) => {
    ensurePageFilters(keys)
  },
  { immediate: true },
)

watch(
  pageFilterValues,
  () => {
    scheduleRefresh()
  },
  { deep: true },
)

function resetPageFilters() {
  activePageFilters.value.forEach((filter) => {
    pageFilterValues[filter.key] = []
  })
}

function resetContainerFilter(containerId, key) {
  const store = containerFilterStore(containerId)
  store[key] = []
  requestContainerRefresh(containerId)
}

onBeforeUnmount(() => {
  clearTimeout(refreshTimer)
  Object.values(containerRefreshTimers).forEach((timer) => clearTimeout(timer))
})

function goBack() {
  router.push('/pages')
}
function editPage() {
  router.push(`/pages/${pageId.value}/edit`)
}
</script>

<style scoped>
.page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.page__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}
.page__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.btn-outline--icon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  font-weight: 500;
}
.btn-outline--icon .icon {
  font-size: 14px;
  line-height: 1;
}
.icon-excel::before {
  content: '⬇';
}
.icon-refresh::before {
  content: '↻';
}
.icon-settings::before {
  content: '⚙';
}
.muted {
  color: #6b7280;
  font-size: 13px;
}
.page-filters {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.page-filters__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.page-filter {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 220px;
}
.page-filter input {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
}
.page-filters__actions {
  display: flex;
  justify-content: flex-end;
}
.layout {
  display: grid;
  gap: 16px;
}
.layout-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.layout-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.tag {
  background: #eef2ff;
  color: #312e81;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}
.widget-body {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.th-content {
  position: relative;
  padding-right: 12px;
}
.resize-handle {
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
}
.row-resize-handle {
  position: absolute;
  right: -8px;
  bottom: 0;
  width: 16px;
  height: 8px;
  cursor: row-resize;
}
.container-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.container-filter {
  flex: 1 1 220px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.container-filter__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 13px;
}
.container-filter__values {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow: auto;
}
.container-filter__option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.btn-link {
  background: none;
  border: none;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.btn-link:disabled {
  color: #cbd5f5;
  cursor: default;
}
.widget-placeholder {
  background: #f8fafc;
  border: 1px dashed #cbd5f5;
  border-radius: 10px;
  padding: 12px;
  font-size: 13px;
  color: #475569;
}
.widget-error {
  border: 1px solid #fecdd3;
  background: #fff1f2;
  color: #be123c;
  border-radius: 10px;
  padding: 12px;
  font-size: 13px;
}
.pivot-wrapper {
  overflow: auto;
}
.row-header-title {
  font-weight: 600;
  text-align: left;
}
.column-header-row th {
  text-align: center;
}
.column-field-group {
  text-align: center;
  font-weight: 500;
  position: relative;
}
.column-field-value {
  display: block;
  font-size: 14px;
  color: #111827;
}
.pivot-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.pivot-table th,
.pivot-table td {
  border: 1px solid #e5e7eb;
  padding: 6px 8px;
  text-align: right;
}
.pivot-table th:first-child,
.pivot-table td:first-child {
  text-align: left;
}
.pivot-table .row-label {
  font-weight: 500;
  position: relative;
}
.row-tree {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.row-toggle {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  width: 20px;
  height: 20px;
  padding: 0;
  line-height: 18px;
  text-align: center;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}
.row-content {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.pivot-table .total,
.pivot-table .grand-total {
  font-weight: 600;
}
.chart-container {
  min-height: 220px;
}
</style>
