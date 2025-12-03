<template>
  <section class="page" v-if="page">
    <header class="page__header">
      <div>
        <h1>{{ page.pageTitle }}</h1>
        <p class="muted">{{ page.description || 'Описание отсутствует' }}</p>
      </div>
      <button class="btn-outline" type="button" @click="editPage">Настроить</button>
    </header>

    <div v-if="activePageFilters.length" class="page-filters">
      <div class="page-filters__fields">
        <label v-for="filter in activePageFilters" :key="filter.key" class="page-filter">
          <span>{{ filter.label }}</span>
          <input
            v-model="pageFilterValues[filter.key]"
            :placeholder="filter.placeholder || 'Введите значение'"
          />
        </label>
      </div>
      <div class="page-filters__actions">
        <button
          class="btn-outline btn-sm"
          type="button"
          @click="resetPageFilters"
          :disabled="!hasActivePageFilters"
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
          <h3>{{ container.title || template(container.templateId)?.name || 'Контейнер' }}</h3>
          <span class="tag">
            {{ dataSourceLabel(template(container.templateId)) }}
          </span>
        </header>
        <p class="muted" v-if="template(container.templateId)">
          {{ template(container.templateId).description || 'Без описания' }}
        </p>
        <p class="muted" v-else>
          Привяжите представление, чтобы контейнер мог отобразить данные.
        </p>

        <div v-if="template(container.templateId)" class="widget-body">
          <div v-if="templateFilters(container).length" class="container-filters">
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
                  @click="resetContainerFilter(container.id, filter.key)"
                  :disabled="!(containerFilterValues[container.id]?.[filter.key]?.length)"
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
          <div v-if="containerState(container.id).loading" class="widget-placeholder">
            Загружаем данные...
          </div>
          <div v-else-if="containerState(container.id).error" class="widget-error">
            {{ containerState(container.id).error }}
          </div>
          <template v-else-if="containerState(container.id).view">
            <div class="pivot-wrapper" v-if="isTableVisualization(container)">
              <table class="pivot-table">
                <thead>
                  <tr>
                    <th :style="rowHeaderStyle(container.id)">
                      <div class="th-content">
                        Строки
                        <span
                          class="resize-handle"
                          @mousedown.prevent="startRowHeaderResize(container.id, $event)"
                        ></span>
                      </div>
                    </th>
                    <th
                      v-for="column in containerState(container.id).view.columns"
                      :key="column.key"
                      :style="tableColumnStyle(container.id, column.key)"
                    >
                      <div class="th-content">
                        <div
                          v-if="column.levels?.length"
                          class="column-levels"
                        >
                          <span v-for="(level, idx) in column.levels" :key="`${column.key}-lvl-${idx}`">
                            {{ level.fieldLabel }}: {{ level.value }}
                          </span>
                        </div>
                        <div class="column-metric">{{ column.label }}</div>
                        <span
                          class="resize-handle"
                          @mousedown.prevent="startTableColumnResize(container.id, column.key, $event)"
                        ></span>
                      </div>
                    </th>
                    <template v-if="shouldShowRowTotals(container)">
                      <th
                        v-for="total in containerState(container.id).view.rowTotalHeaders"
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
                      <div class="row-tree" :style="{ paddingLeft: `${row.depth * 18}px` }">
                        <button
                          v-if="row.hasChildren"
                          class="row-toggle"
                          type="button"
                          @click="toggleContainerRow(container.id, row.key)"
                        >
                          {{ isContainerRowCollapsed(container.id, row.key) ? '+' : '−' }}
                        </button>
                        <div class="row-content">
                          <span class="row-field" v-if="row.fieldLabel">
                            {{ row.fieldLabel }}:
                          </span>
                          <span>{{ row.label }}</span>
                        </div>
                      </div>
                      <span
                        class="row-resize-handle"
                        @mousedown.prevent="startTableRowResize(container.id, row.key, $event)"
                      ></span>
                    </td>
                    <td v-for="cell in row.cells" :key="cell.key" class="cell">
                      {{ cell.display }}
                    </td>
                    <template v-if="shouldShowRowTotals(container)">
                      <td
                        v-for="total in row.totals"
                        :key="`row-${row.key}-${total.metricId}`"
                        class="total"
                      >
                        {{ total.display }}
                      </td>
                    </template>
                  </tr>
                </tbody>
                <tfoot v-if="shouldShowRowTotals(container) || shouldShowColumnTotals(container)">
                  <tr>
                    <td v-if="shouldShowColumnTotals(container)">Итого по столбцам</td>
                    <template v-if="shouldShowColumnTotals(container)">
                      <td
                        v-for="column in containerState(container.id).view.columns"
                        :key="`total-${column.key}`"
                        class="total"
                      >
                        {{ column.totalDisplay }}
                      </td>
                    </template>
                    <template v-if="shouldShowRowTotals(container)">
                      <td
                        v-for="total in containerState(container.id).view.rowTotalHeaders"
                        :key="`grand-${total.metricId}`"
                        class="grand-total"
                      >
                        {{ containerState(container.id).view.grandTotals[total.metricId] }}
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
import { computed, reactive, watch, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePageBuilderStore } from '@/shared/stores/pageBuilder'
import { fetchPlanRecords } from '@/shared/api/plan'
import { fetchParameterRecords } from '@/shared/api/parameter'
import { sendDataSourceRequest } from '@/shared/api/dataSource'
import ReportChart from '@/components/ReportChart.vue'
import { buildPivotView, normalizeValue } from '@/shared/lib/pivotUtils'
import MultiSelectDropdown from '@/components/MultiSelectDropdown.vue'

const route = useRoute()
const router = useRouter()
const store = usePageBuilderStore()
const pageId = computed(() => route.params.pageId)
const page = computed(() => store.getPageById(pageId.value))
const pageContainers = computed(() => store.pageContainers[pageId.value]?.items || [])

onMounted(() => {
  store.fetchTemplates()
  store.fetchPages()
  if (pageId.value) {
    store.fetchPageContainers(pageId.value, true)
  }
})

watch(
  () => pageId.value,
  (next) => {
    if (next) {
      store.fetchPages()
      store.fetchPageContainers(next, true)
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
const chartPalette = ['#2b6cb0', '#f97316', '#0ea5e9', '#10b981', '#ef4444', '#8b5cf6']
const pageFilterValues = reactive({})
const filterMap = computed(() =>
  store.filters.reduce((acc, filter) => {
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
    return value !== undefined && value !== null && String(value).trim() !== ''
  }),
)
let refreshTimer = null

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
      pageFilterValues[key] = ''
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
  return tpl.snapshot?.filtersMeta || []
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

function templateFieldMetaMap(template) {
  return new Map(Object.entries(template?.snapshot?.fieldMeta || {}))
}

function isTableVisualization(container) {
  const tpl = template(container.templateId)
  return !tpl || !tpl.visualization || tpl.visualization === 'table'
}

function shouldShowRowTotals(container) {
  const options = templateOptions(container)
  if (options.showRowTotals === undefined) return true
  return Boolean(options.showRowTotals)
}

function shouldShowColumnTotals(container) {
  const options = templateOptions(container)
  if (options.showColumnTotals === undefined) return true
  return Boolean(options.showColumnTotals)
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
  const initial = sizing.columnWidths[columnKey] || th?.offsetWidth || defaultColumnWidth
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
  const initial = sizing.rowHeights[rowKey] || tr?.offsetHeight || defaultRowHeight
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
  const initial = sizing.rowHeaderWidth || th?.offsetWidth || defaultRowHeaderWidth
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

async function ensureTemplateData(tpl) {
  if (!tpl) {
    throw new Error('Привяжите представление для отображения данных.')
  }
  if (tpl.remoteSource) {
    return ensureRemoteSourceData(tpl.remoteSource)
  }
  return ensureFallbackData(tpl.dataSource)
}

async function ensureFallbackData(source) {
  if (!source) throw new Error('В представлении не выбран источник данных.')
  if (dataCache[source]) return dataCache[source]
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

async function ensureRemoteSourceData(source) {
  const cacheKey =
    source?.remoteId ||
    source?.id ||
    `${source?.method || 'POST'}:${source?.url || source?.remoteMeta?.URL || ''}`
  if (cacheKey && dataCache[cacheKey]) {
    return dataCache[cacheKey]
  }
  const request = buildRemoteRequest(source)
  const response = await sendDataSourceRequest(request)
  const records = extractRecords(response)
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
  const method = String(source?.method || source?.remoteMeta?.Method || 'POST').toUpperCase()
  const headers = normalizeRemoteHeaders(source?.headers || source?.remoteMeta?.Headers)
  const body = normalizeRemoteBody(source?.body ?? source?.remoteMeta?.MethodBody)
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

function matchFieldSet(record, keys = [], store = {}) {
  return (keys || []).every((key) => {
    const selected = store?.[key]
    if (!selected || !selected.length) return true
    const value = normalizeValue(record?.[key])
    return selected.includes(value)
  })
}

function matchesGlobalFilters(record, source) {
  if (!activePageFilters.value.length) return true
  return activePageFilters.value.every((filter) => {
    const value = pageFilterValues[filter.key]
    if (value === undefined || value === null || String(value).trim() === '') return true
    const binding =
      filter.bindings?.[source] ||
      filter.field ||
      filter.key
    if (!binding) return true
    const recordValue = normalizeValue(record?.[binding])
    if (!recordValue) return false
    return recordValue.toLowerCase().includes(String(value).trim().toLowerCase())
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
    if (!matchesGlobalFilters(record, source)) return false
    if (!matchFieldSet(record, pivot.filters, filterValues)) return false
    if (!matchFieldSet(record, pivot.rows, dimensionValues.rows || {})) return false
    if (!matchFieldSet(record, pivot.columns, dimensionValues.columns || {})) return false
    return true
  })
}

function metricLabel(metric) {
  const agg = { count: 'Количество', sum: 'Сумма', avg: 'Среднее' }
  const title = agg[metric.aggregator] || metric.aggregator
  return `${title}: ${metric.fieldLabel || metric.fieldKey || 'поле'}`
}

function prepareMetrics(list = []) {
  return (list || [])
    .filter((metric) => metric?.fieldKey)
    .map((metric, index) => ({
      ...metric,
      id: metric.id || `metric-${index}`,
      label: metric.label || metricLabel(metric),
    }))
}

function buildChartConfig(view, vizType) {
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
    datasets = view.rowTotalHeaders.map((header, index) => {
      const color = chartPalette[index % chartPalette.length]
      const data = view.rows.map((row) => {
        const total = row.totals.find((item) => item.metricId === header.metricId)
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
    const pieColors = labels.map((_, idx) => chartPalette[idx % chartPalette.length])
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
      value: pageFilterValues[filter.key] ?? '',
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

  try {
    const records = await ensureTemplateData(tpl)
    const filtered = filterRecords(records, tpl.snapshot, tpl.dataSource, container.id)
    const metrics = prepareMetrics(tpl.snapshot?.metrics)
    if (!metrics.length) {
      throw new Error('В представлении не выбраны метрики.')
    }
    const view = buildPivotView({
      records: filtered,
      rows: tpl.snapshot?.pivot?.rows || [],
      columns: tpl.snapshot?.pivot?.columns || [],
      metrics,
      fieldMeta: templateFieldMetaMap(tpl),
      headerOverrides: tpl.snapshot?.options?.headerOverrides || {},
      sorts: tpl.snapshot?.sorts || {},
    })
    if (!view || !view.rows.length) {
      state.error = 'Нет данных после применения фильтров.'
      return
    }
    state.view = view
    state.chart = buildChartConfig(view, tpl.visualization)
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
    const container = pageContainers.value.find((item) => item.id === containerId)
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
    pageFilterValues[filter.key] = ''
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
.column-levels {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #475569;
}
.column-metric {
  font-weight: 600;
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
.row-field {
  color: #6b7280;
  font-size: 12px;
}
.pivot-table .total,
.pivot-table .grand-total {
  font-weight: 600;
}
.chart-container {
  min-height: 220px;
}
</style>
