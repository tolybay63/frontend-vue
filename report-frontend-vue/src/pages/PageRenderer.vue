<template>
  <section v-if="page && canViewPage" class="page">
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
        <div
          v-for="filter in activePageFilters"
          :key="filter.key"
          class="page-filter"
        >
          <span class="page-filter__label">{{ filter.label }}</span>
          <FilterRangeControl
            :model-value="pageFilterValues[filter.key]"
            :range="pageFilterRanges[filter.key]"
            :options="globalFilterValueOptions(filter.key)"
            :supports-range="
              filterSupportsRange(filter) && !isValuesOnlyFilter(filter)
            "
            :range-type="filter.type === 'date' ? 'date' : 'number'"
            placeholder="Выберите значения"
            :show-mode-toggle="!hasForcedFilterMode(filter)"
            :lock-range="isGlobalRangeFilter(filter)"
            :show-range-hint="!isGlobalRangeFilter(filter)"
            @update:model-value="
              handlePageFilterValuesChange(
                filter.key,
                $event,
                filter.preferredMode,
              )
            "
            @update:range="handlePageFilterRangeChange(filter.key, $event)"
          />
        </div>
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

    <div v-if="tabOptions.length > 1" class="layout-tabs">
      <button
        v-for="tab in tabOptions"
        :key="`tab-${tab.value}`"
        type="button"
        :class="['layout-tab', { 'layout-tab--active': activeTab === tab.value }]"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="layout" :style="layoutStyle">
      <p v-if="!visibleContainers.length" class="layout__empty">
        Нет контейнеров на этой вкладке.
      </p>
      <article
        v-for="container in visibleContainers"
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
                    !hasActiveContainerFilter(container.id, filter.key)
                  "
                  @click="resetContainerFilter(container.id, filter.key)"
                >
                  Очистить
                </button>
              </div>
              <FilterRangeControl
                :model-value="containerFilterValues[container.id][filter.key]"
                :range="containerFilterRanges[container.id]?.[filter.key]"
                :options="containerFilterOptions(container.id, filter)"
                :supports-range="
                  filterSupportsRange(filter) && !isValuesOnlyFilter(filter)
                "
                :range-type="filter.type === 'date' ? 'date' : 'number'"
                placeholder="Выберите значения"
                :show-mode-toggle="!hasForcedFilterMode(filter)"
                :lock-range="isContainerRangeFilter(filter)"
                :show-range-hint="!isContainerRangeFilter(filter)"
                @update:model-value="
                  handleContainerFilterValuesChange(
                    container.id,
                    filter,
                    $event,
                  )
                "
                @update:range="
                  handleContainerFilterRangeChange(
                    container.id,
                    filter,
                    $event,
                  )
                "
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
              <table class="pivot-table table-density--standard">
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
                        class="column-field-group column-field-group--total"
                      >
                        ИТОГО
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
                    <td
                      v-for="(cell, cellIndex) in row.cells"
                      :key="cell.key"
                      class="cell"
                      :class="{
                        'cell--clickable': canShowCellDetails(
                          container,
                          columnEntry(container, cellIndex),
                        ),
                      }"
                      @click="
                        handleCellDetails(
                          container,
                          row,
                          columnEntry(container, cellIndex),
                        )
                      "
                    >
                      <ConditionalCellValue
                        :display="cell.display"
                        :formatting="cell.formatting"
                      />
                    </td>
                    <template v-if="shouldShowRowTotals(container)">
                      <td
                        v-for="total in containerRowTotals(container, row)"
                        :key="`row-${row.key}-${total.metricId}`"
                        class="total"
                      >
                        <ConditionalCellValue
                          :display="total.display"
                          :formatting="total.formatting"
                        />
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
                      ИТОГО
                    </td>
                    <template v-if="shouldShowColumnTotals(container)">
                      <td
                        v-for="column in containerState(container.id).view
                          .columns"
                        :key="`total-${column.key}`"
                        class="total"
                      >
                        <ConditionalCellValue
                          v-if="
                            shouldDisplayColumnTotal(container, column.metricId)
                          "
                          :display="column.totalDisplay"
                          :formatting="column.totalFormatting"
                        />
                        <span v-else>—</span>
                      </td>
                    </template>
                    <template v-if="shouldShowRowTotals(container)">
                      <td
                        v-for="total in containerRowTotalHeaders(container)"
                        :key="`grand-${total.metricId}`"
                        class="grand-total"
                      >
                        <ConditionalCellValue
                          :display="
                            containerGrandTotalDisplay(container, total.metricId)
                          "
                          :formatting="
                            containerGrandTotalFormatting(
                              container,
                              total.metricId,
                            )
                          "
                        />
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
  <section v-else-if="page" class="page page__restricted">
    <div class="page__restricted-card">
      <h2>Нет доступа к странице</h2>
      <p class="muted">
        Эта страница доступна только автору или пользователям, которых он отметил при сохранении.
      </p>
      <button class="btn-outline" type="button" @click="goBack">К списку страниц</button>
    </div>
  </section>
  <section v-else class="page">
    <p>Страница не найдена или удалена.</p>
    <button class="btn-outline" type="button" @click="goBack">Вернуться</button>
  </section>

  <div
    v-if="detailDialog.visible"
    class="detail-overlay"
    @click.self="closeDetailDialog"
  >
    <div class="detail-panel">
      <header class="detail-panel__header">
        <div>
          <p class="detail-panel__eyebrow">Расшифровка значения</p>
          <h3>{{ detailDialog.metricLabel }}</h3>
          <p class="detail-panel__context">
            {{ detailDialog.rowLabel || 'Все строки' }}
            <span v-if="detailDialog.columnLabel">
              • {{ detailDialog.columnLabel }}
            </span>
          </p>
        </div>
        <div class="detail-panel__actions">
          <button
            class="detail-panel__action"
            type="button"
            :disabled="!detailDialog.entries.length"
            @click="exportDetailRecords"
          >
            Выгрузить
          </button>
          <button class="detail-panel__close" type="button" @click="closeDetailDialog">
            ×
          </button>
        </div>
      </header>
      <section class="detail-panel__body">
        <p class="detail-panel__meta">
          {{ detailDialog.containerLabel }}
          <span v-if="detailDialog.total">
            •
            {{ detailDialog.total }}
            запис{{ detailDialog.total === 1 ? 'ь' : 'ей' }}
            <template v-if="detailDialog.entries.length < detailDialog.total">
              (показаны первые {{ detailDialog.entries.length }})
            </template>
          </span>
        </p>
        <div v-if="detailDialog.loading" class="detail-panel__placeholder">
          Загружаем записи…
        </div>
        <p v-else-if="detailDialog.error" class="detail-panel__error">
          {{ detailDialog.error }}
        </p>
        <template v-else>
          <div v-if="detailDialog.entries.length" class="detail-table-wrapper">
            <table class="detail-table">
              <thead>
                <tr>
                  <th
                    v-for="field in detailDialog.fields"
                    :key="field.key"
                    :class="{ 'is-number': isNumericField(field) }"
                  >
                    {{ field.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(entry, entryIndex) in detailDialog.entries"
                  :key="`detail-${entryIndex}`"
                >
                  <td
                    v-for="field in detailDialog.fields"
                    :key="`${entryIndex}-${field.key}`"
                    :class="{ 'is-number': isNumericField(field) }"
                  >
                    {{ formatDetailValue(resolvePivotFieldValue(entry, field.key)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="detail-panel__empty">
            Нет данных для выбранной ячейки.
          </p>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  usePageBuilderStore,
  resolveCommonContainerFieldKeys,
} from '@/shared/stores/pageBuilder'
import { useAuthStore } from '@/shared/stores/auth'
import { fetchPlanRecords } from '@/shared/api/plan'
import { fetchParameterRecords } from '@/shared/api/parameter'
import { sendDataSourceRequest } from '@/shared/api/dataSource'
import { loadReportSources } from '@/shared/api/report'
import ReportChart from '@/components/ReportChart.vue'
import ConditionalCellValue from '@/components/ConditionalCellValue.vue'
import {
  buildPivotView,
  normalizeValue,
  humanizeKey,
  augmentPivotViewWithFormulas,
  filterPivotViewByVisibility,
  formatValue,
  resolvePivotFieldValue,
  parseDatePartKey,
  formatDatePartFieldLabel,
} from '@/shared/lib/pivotUtils'
import {
  applyConditionalFormattingToView,
  normalizeConditionalFormatting,
} from '@/shared/lib/conditionalFormatting'
import FilterRangeControl from '@/components/FilterRangeControl.vue'
import { useFieldDictionaryStore } from '@/shared/stores/fieldDictionary'
import {
  normalizeJoinList,
  mergeJoinedRecords,
  fetchJoinPayload,
  parseJoinConfig,
} from '@/shared/lib/sourceJoins.js'
import { defaultLayoutSettings } from '@/shared/lib/layoutMeta'
import { canUserAccessPage, readStoredUserMeta, resolveUserMeta } from '@/shared/lib/pageAccess'
const route = useRoute()
const router = useRouter()
const store = usePageBuilderStore()
const fieldDictionaryStore = useFieldDictionaryStore()
const authStore = useAuthStore()
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
    store.fetchPrivacyOptions(),
    fieldDictionaryStore.fetchDictionary(),
  ])
  if (pageId.value) {
    await store.fetchPageContainers(pageId.value, true)
  }
  refreshContainers()
})

watch(
  () => pageId.value,
  async (next) => {
    if (next) {
      await Promise.all([
        store.fetchPages(true),
        store.fetchTemplates(true),
        store.fetchPrivacyOptions(),
      ])
      await store.fetchPageContainers(next, true)
      refreshContainers()
    }
  },
)

const layoutSettings = computed(() => {
  const raw = page.value?.layout?.settings || defaultLayoutSettings()
  const columns = Math.max(1, Math.min(6, Number(raw.columns) || 1))
  const tabs = Math.max(1, Math.min(12, Number(raw.tabs) || 1))
  const rawNames = Array.isArray(raw.tabNames) ? raw.tabNames : []
  const tabNames = Array.from({ length: tabs }, (_, index) => {
    const label = rawNames[index]
    if (typeof label === 'string' && label.trim()) {
      return label.trim()
    }
    return `Вкладка ${index + 1}`
  })
  return { columns, tabs, tabNames }
})
const activeTab = ref(1)
const tabOptions = computed(() =>
  layoutSettings.value.tabNames.map((label, index) => ({
    value: index + 1,
    label,
  })),
)
const visibleContainers = computed(() => {
  if (!pageContainers.value.length) return []
  if (layoutSettings.value.tabs <= 1) return pageContainers.value
  const current = Math.min(
    layoutSettings.value.tabs,
    Math.max(1, activeTab.value),
  )
  return pageContainers.value.filter(
    (container) => (container.tabIndex || 1) === current,
  )
})
watch(
  tabOptions,
  (options) => {
    const values = options.map((option) => option.value)
    if (!values.length) {
      activeTab.value = 1
      return
    }
    if (!values.includes(activeTab.value)) {
      activeTab.value = values[0]
    }
  },
  { immediate: true },
)
const layoutStyle = computed(() => {
  const template = `repeat(${layoutSettings.value.columns}, minmax(0, 1fr))`
  return {
    gridTemplateColumns: pageContainers.value.length ? template : '1fr',
  }
})

const containerStates = reactive({})
const containerFilterValues = reactive({})
const containerFilterRanges = reactive({})
const availablePageFilterValues = reactive({})
const availableContainerFilterValues = reactive({})
const containerRefreshTimers = reactive({})
const containerTableSizing = reactive({})
const containerRowCollapse = reactive({})
const detailDialog = reactive({
  visible: false,
  containerId: '',
  loading: false,
  error: '',
  entries: [],
  fields: [],
  total: 0,
  containerLabel: '',
  rowLabel: '',
  columnLabel: '',
  metricLabel: '',
})
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
const pageFilterRanges = reactive({})
const commonFilterKeys = computed(() =>
  resolveCommonContainerFieldKeys(pageContainers.value, store.templates),
)
const globalFieldMetaMap = computed(() => buildGlobalFieldMetaMap())
const pageFilterOptions = computed(() =>
  commonFilterKeys.value.map((key) => {
    const descriptor = globalFieldMetaMap.value.get(key) || {}
    const hasRange = globalFilterRangeDefaults.value.has(key)
    const modePreference = normalizePreferredMode(
      globalFilterModeMap.value.get(key),
    )
    const preferredMode = modePreference || (hasRange ? 'range' : '')
    const dateMeta = parseDatePartKey(key)
    return {
      key,
      label: resolveGlobalFilterLabel(key, descriptor),
      type: descriptor.type || (dateMeta ? 'string' : ''),
      rangeOnly: preferredMode === 'range',
      preferredMode,
    }
  }),
)
const filterMap = computed(() =>
  pageFilterOptions.value.reduce((acc, filter) => {
    acc[filter.key] = filter
    return acc
  }, {}),
)

function resolveGlobalFilterLabel(key, descriptor = {}) {
  const direct = dictionaryLabelValue(key)
  if (direct) return direct
  if (descriptor?.label) return descriptor.label
  const dateMeta = parseDatePartKey(key)
  if (dateMeta) {
    const baseDictionary = dictionaryLabelValue(dateMeta.fieldKey)
    const baseDescriptor = globalFieldMetaMap.value.get(dateMeta.fieldKey)
    const baseLabel =
      baseDictionary ||
      baseDescriptor?.label ||
      humanizeKey(dateMeta.fieldKey)
    return formatDatePartFieldLabel(baseLabel, dateMeta.part)
  }
  return humanizeKey(key)
}
const activePageFilters = computed(() =>
  (page.value?.filters || [])
    .map((key) => filterMap.value[key])
    .filter(Boolean),
)
const hasActivePageFilters = computed(() =>
  activePageFilters.value.some((filter) => {
    const value = pageFilterValues[filter.key]
    if (Array.isArray(value) && value.length) return true
    return hasActiveRange(pageFilterRanges[filter.key])
  }),
)
const activePageFilterKeySet = computed(
  () => new Set((page.value?.filters || []).filter(Boolean)),
)
const globalFilterValueMap = computed(() => buildGlobalFilterValueMap())
const globalFilterRangeDefaults = computed(() => buildGlobalFilterRangeMap())
const globalFilterModeMap = computed(() => buildGlobalFilterModeMap())
const currentUserMeta = computed(() => {
  const personal = resolveUserMeta(authStore.personalInfo)
  if (personal) return personal
  return readStoredUserMeta()
})
const canViewPage = computed(() => canUserAccessPage(page.value, currentUserMeta.value))
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
    records: [],
    rawRecords: [],
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

function containerRangeStore(containerId) {
  if (!containerFilterRanges[containerId]) {
    containerFilterRanges[containerId] = {}
  }
  return containerFilterRanges[containerId]
}

function hasActiveContainerFilter(containerId, key) {
  const values = containerFilterStore(containerId)[key]
  if (Array.isArray(values) && values.length) return true
  const range = containerRangeStore(containerId)[key]
  return hasActiveRange(range)
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
  const rangeDefaults = globalFilterRangeDefaults.value
  keys.forEach((key) => {
    if (!(key in pageFilterValues)) {
      pageFilterValues[key] = []
    }
    if (!(key in pageFilterRanges)) {
      const defaults = cloneRange(rangeDefaults.get(key))
      if (defaults && hasActiveRange(defaults)) {
        pageFilterRanges[key] = defaults
      }
    }
  })
  Object.keys(pageFilterValues).forEach((key) => {
    if (!keys.includes(key)) {
      delete pageFilterValues[key]
    }
  })
  Object.keys(pageFilterRanges).forEach((key) => {
    if (!keys.includes(key)) {
      delete pageFilterRanges[key]
    }
  })
}

function templateFilters(container) {
  const tpl = template(container.templateId)
  if (!tpl) return []
  ensureContainerFilters(container.id, tpl)
  const fieldMeta = tpl.snapshot?.fieldMeta || {}
  const rangeStore = tpl.snapshot?.filterRanges || {}
  const filtersMeta = (tpl.snapshot?.filtersMeta || []).map((meta) => {
    const range = sanitizeRange(rangeStore?.[meta.key])
    const preferredMode =
      normalizePreferredMode(meta?.mode) || (range ? 'range' : '')
    return {
      ...meta,
      type: fieldMeta?.[meta.key]?.type || '',
      rangeOnly: preferredMode === 'range',
      preferredMode,
    }
  })
  const excluded = activePageFilterKeySet.value
  return filtersMeta.filter((meta) => !excluded.has(meta.key))
}

function ensureContainerFilters(containerId, tpl) {
  const store = containerFilterStore(containerId)
  const rangeStore = containerRangeStore(containerId)
  const list = tpl.snapshot?.filtersMeta || []
  const defaultRanges = tpl.snapshot?.filterRanges || {}
  list.forEach((filter) => {
    if (!Array.isArray(store[filter.key])) {
      const defaults = tpl.snapshot?.filterValues?.[filter.key] || []
      store[filter.key] = [...defaults]
    }
    if (!(filter.key in rangeStore)) {
      const defaults = sanitizeRange(defaultRanges?.[filter.key])
      if (defaults) {
        rangeStore[filter.key] = defaults
      }
    }
  })
  Object.keys(store).forEach((key) => {
    if (!list.find((item) => item.key === key)) {
      delete store[key]
    }
  })
  Object.keys(rangeStore).forEach((key) => {
    if (!list.find((item) => item.key === key)) {
      delete rangeStore[key]
    }
  })
}

function fieldOptionsFromValues(values = []) {
  return (values || []).map((value) => ({
    value,
    label: value || 'пусто',
  }))
}

function templateOptions(container) {
  const tpl = template(container.templateId)
  return tpl?.snapshot?.options || {}
}

function containerFilterOptions(containerId, filter) {
  const available = availableContainerFilterValues[containerId]?.[filter.key]
  if (Array.isArray(available) && available.length) return available
  return fieldOptionsFromValues(filter.values)
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

function containerGrandTotalEntry(container, metricId) {
  const view = containerState(container.id).view
  if (!view) return null
  return view.grandTotals?.[metricId] || null
}
function containerGrandTotalDisplay(container, metricId) {
  const entry = containerGrandTotalEntry(container, metricId)
  return entry?.display ?? '—'
}
function containerGrandTotalFormatting(container, metricId) {
  const entry = containerGrandTotalEntry(container, metricId)
  return entry?.formatting || null
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

function containerColumns(container) {
  return containerState(container.id).view?.columns || []
}

function columnEntry(container, index) {
  return containerColumns(container)[index] || null
}

function canShowCellDetails(container, columnEntry) {
  if (!columnEntry) return false
  const metrics = containerState(container.id).meta?.metrics || []
  const metric = metrics.find((item) => item.id === columnEntry.metricId)
  return Boolean(metric && metric.type !== 'formula' && metric.fieldKey)
}

function closeDetailDialog() {
  detailDialog.visible = false
  detailDialog.containerId = ''
  detailDialog.loading = false
  detailDialog.error = ''
  detailDialog.entries = []
  detailDialog.fields = []
  detailDialog.total = 0
}

function handleCellDetails(container, row, columnEntry) {
  if (!columnEntry || !canShowCellDetails(container, columnEntry)) return
  const tpl = template(container.templateId)
  if (!tpl) return
  const state = containerState(container.id)
  const metrics = state.meta.metrics || []
  const metric = metrics.find((item) => item.id === columnEntry.metricId)
  if (!metric) return
  detailDialog.visible = true
  detailDialog.containerId = container.id
  detailDialog.loading = true
  detailDialog.error = ''
  detailDialog.entries = []
  detailDialog.total = 0
  detailDialog.containerLabel =
    container.title || tpl.name || 'Контейнер'
  detailDialog.rowLabel = row.label || 'Все записи'
  detailDialog.columnLabel = columnEntry.label || tpl.snapshot?.pivot?.columns?.join(' • ') || ''
  detailDialog.metricLabel =
    metric.label || metric.title || metric.fieldKey || 'Метрика'
  detailDialog.fields = resolveDetailFieldDescriptors(tpl, metric)
  const rowsPivot = tpl.snapshot?.pivot?.rows || []
  const columnsPivot = tpl.snapshot?.pivot?.columns || []
  const rowKey = row.key || '__all__'
  const columnKey = columnEntry.baseKey || '__all__'
  requestAnimationFrame(() => {
    try {
      const matched = (state.records || []).filter(
        (record) =>
          matchesDimensionPath(record, rowsPivot, rowKey) &&
          matchesDimensionPath(record, columnsPivot, columnKey),
      )
      detailDialog.total = matched.length
      detailDialog.entries = matched.slice(0, 200)
      detailDialog.loading = false
      if (!matched.length) {
        detailDialog.error = 'Нет подробностей для этой ячейки.'
      }
    } catch (err) {
      detailDialog.error =
        err?.message || 'Не удалось собрать детализацию ячейки.'
      detailDialog.loading = false
    }
  })
}

function matchesDimensionPath(record, dimensions = [], targetKey = '__all__') {
  if (!targetKey || targetKey === '__all__') return true
  const recordPath = buildDimensionPath(record, dimensions)
  return recordPath.startsWith(targetKey)
}

function buildDimensionPath(record, dimensions = []) {
  if (!Array.isArray(dimensions) || !dimensions.length) return '__all__'
  let prefix = ''
  dimensions.forEach((fieldKey) => {
    const value = resolvePivotFieldValue(record, fieldKey)
    const normalized = `${fieldKey}:${normalizeValue(value)}`
    prefix = prefix ? `${prefix}|${normalized}` : normalized
  })
  return prefix || '__all__'
}

function resolveDetailFieldDescriptors(tpl, metric) {
  if (!tpl) return []
  const explicitFields = Array.isArray(metric?.detailFields)
    ? metric.detailFields.filter(Boolean)
    : []
  const defaults = [
    ...(tpl.snapshot?.pivot?.rows || []),
    ...(tpl.snapshot?.pivot?.columns || []),
    metric?.fieldKey,
  ].filter(Boolean)
  const fieldsSet = new Set(
    (explicitFields.length ? explicitFields : defaults).filter(Boolean),
  )
  const fieldMeta = templateFieldMetaMap(tpl)
  const overrides = tpl.snapshot?.options?.headerOverrides || {}
  const rawFieldMeta = tpl.snapshot?.fieldMeta || {}
  return Array.from(fieldsSet)
    .filter(Boolean)
    .map((key) => ({
      key,
      label: resolveFieldLabel(key, overrides, rawFieldMeta),
      type:
        resolveFieldMetaEntry(fieldMeta, key)?.type ||
        (metric?.fieldKey === key ? 'number' : 'string'),
    }))
}

function formatDetailValue(value) {
  return formatValue(value)
}

function isNumericField(field) {
  if (!field) return false
  return field.type === 'number' || field.type === 'integer'
}

function exportDetailRecords() {
  if (!detailDialog.entries.length || !detailDialog.fields.length) return
  const header = detailDialog.fields.map((field) => field.label || field.key)
  const rows = detailDialog.entries.map((entry) =>
    detailDialog.fields.map((field) =>
      formatDetailValue(resolvePivotFieldValue(entry, field.key)),
    ),
  )
  const lines = [header, ...rows]
    .map((cols) =>
      cols
        .map((value) => {
          const str =
            value === null || typeof value === 'undefined' ? '' : String(value)
          if (str.includes('"') || str.includes(';') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        })
        .join(';'),
    )
    .join('\n')
  const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  link.download = `detail-${timestamp}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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

function resolveFieldMetaEntry(store, key) {
  if (!store) return null
  const direct =
    typeof store.get === 'function' ? store.get(key) : store?.[key]
  if (direct) return direct
  const meta = parseDatePartKey(key)
  if (!meta) return null
  return typeof store.get === 'function'
    ? store.get(meta.fieldKey)
    : store?.[meta.fieldKey]
}

function matchFieldSet(
  record,
  keys = [],
  store = {},
  rangeStore = {},
  fieldMetaMap = new Map(),
) {
  return (keys || []).every((key) => {
    const selected = store?.[key]
    if (selected && selected.length) {
      const value = normalizeValue(resolvePivotFieldValue(record, key))
      if (!selected.includes(value)) {
        return false
      }
    }
    const range = rangeStore?.[key]
    if (range && hasActiveRange(range)) {
      const descriptor = resolveFieldMetaEntry(fieldMetaMap, key)
      const value = resolvePivotFieldValue(record, key)
      if (!valueSatisfiesRange(value, range, descriptor)) {
        return false
      }
    }
    return true
  })
}

function isDefinedRangeValue(value) {
  return !(value === null || typeof value === 'undefined' || value === '')
}

function cloneRange(range) {
  if (!range || typeof range !== 'object') return null
  return {
    start: isDefinedRangeValue(range.start) ? range.start : null,
    end: isDefinedRangeValue(range.end) ? range.end : null,
  }
}

function sanitizeRange(range) {
  const copy = cloneRange(range)
  if (!copy) return null
  return hasActiveRange(copy) ? copy : null
}

function hasActiveRange(range) {
  if (!range || typeof range !== 'object') return false
  return isDefinedRangeValue(range.start) || isDefinedRangeValue(range.end)
}

function rangesEqual(a, b) {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.start === b.start && a.end === b.end
}

function areValueArraysEqual(a = [], b = []) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

function inferRangeType(range, descriptor = null) {
  if (descriptor?.type) return descriptor.type
  if (!range || typeof range !== 'object') return ''
  if (typeof range.start === 'number' || typeof range.end === 'number') {
    return 'number'
  }
  if (typeof range.start === 'string' || typeof range.end === 'string') {
    return 'date'
  }
  return ''
}

function normalizeComparableValue(value, type) {
  if (value === null || typeof value === 'undefined') return null
  if (type === 'number') {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }
  if (type === 'date') {
    return parseDateValue(value)
  }
  return null
}

function parseDateValue(value) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.getTime()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const str = String(value).trim()
  if (!str) return null
  const dotted = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (dotted) {
    const [, day, month, year] = dotted
    const isoString = `${year}-${month}-${day}T00:00:00Z`
    const timestamp = Date.parse(isoString)
    return Number.isFinite(timestamp) ? timestamp : null
  }
  const parsed = Date.parse(str)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeRangeBoundary(value, type, bound = 'start') {
  if (!isDefinedRangeValue(value)) return null
  if (type === 'number') {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }
  if (type === 'date') {
    const timestamp = parseDateValue(value)
    if (!Number.isFinite(timestamp)) return null
    if (bound === 'end') {
      return timestamp + 86399999
    }
    return timestamp
  }
  return null
}

function valueSatisfiesRange(rawValue, range, descriptor = null) {
  if (!hasActiveRange(range)) return true
  const type = inferRangeType(range, descriptor)
  if (!type) return true
  const comparable = normalizeComparableValue(rawValue, type)
  if (comparable === null) return false
  const start = normalizeRangeBoundary(range.start, type, 'start')
  if (start !== null && comparable < start) return false
  const end = normalizeRangeBoundary(range.end, type, 'end')
  if (end !== null && comparable > end) return false
  return true
}

function matchesGlobalFilters(record, excludeKey = null) {
  if (!activePageFilters.value.length) return true

  return activePageFilters.value.every((filter) => {
    const key = filter?.key
    if (!key) return true
    if (excludeKey && key === excludeKey) return true

    const values = pageFilterValues[key]
    if (Array.isArray(values) && values.length) {
      const recordValue = normalizeValue(resolvePivotFieldValue(record, key))
      if (!values.includes(recordValue)) return false
    }

    const range = pageFilterRanges[key]
    if (range && hasActiveRange(range)) {
      const dateMeta = parseDatePartKey(key)
      const descriptor =
        globalFieldMetaMap.value.get(key) ||
        (dateMeta ? globalFieldMetaMap.value.get(dateMeta.fieldKey) : null)

      const resolvedValue = resolvePivotFieldValue(record, key)
      if (!valueSatisfiesRange(resolvedValue, range, descriptor)) {
        return false
      }
    }

    return true
  })
}

function filterRecords(records, snapshot, source, containerId) {
  if (!Array.isArray(records)) return []
  const pivot = snapshot?.pivot || {}
  const filterValues = {
    ...(snapshot?.filterValues || {}),
  }
  const filterRanges = {
    ...(snapshot?.filterRanges || {}),
  }
  const containerOverrides = containerFilterValues[containerId] || {}
  Object.entries(containerOverrides).forEach(([key, values]) => {
    filterValues[key] = [...values]
  })
  const containerRangeOverrides = containerFilterRanges[containerId] || {}
  Object.entries(containerRangeOverrides).forEach(([key, range]) => {
    const sanitized = sanitizeRange(range)
    if (sanitized) {
      filterRanges[key] = sanitized
    } else {
      delete filterRanges[key]
    }
  })
  const dimensionValues = snapshot?.dimensionValues || {}
  const dimensionRanges = snapshot?.dimensionRanges || {}
  const fieldMetaMap = new Map(Object.entries(snapshot?.fieldMeta || {}))

  return records.filter((record) => {
    if (!matchesGlobalFilters(record)) return false
    if (
      !matchFieldSet(
        record,
        pivot.filters,
        filterValues,
        filterRanges,
        fieldMetaMap,
      )
    )
      return false
    if (
      !matchFieldSet(
        record,
        pivot.rows,
        dimensionValues.rows || {},
        dimensionRanges.rows || {},
        fieldMetaMap,
      )
    )
      return false
    if (
      !matchFieldSet(
        record,
        pivot.columns,
        dimensionValues.columns || {},
        dimensionRanges.columns || {},
        fieldMetaMap,
      )
    )
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
      const conditionalFormatting = normalizeConditionalFormatting(
        metric.conditionalFormatting,
      )
      return {
        ...metric,
        id: metric.id || `metric-${index}`,
        type: metric.type || 'base',
        label: displayLabel,
        enabled: metric.enabled !== false,
        conditionalFormatting,
        outputFormat:
          metric.outputFormat ||
          (metric.type === 'formula' ? 'number' : 'auto'),
        precision: Number.isFinite(metric.precision)
          ? Number(metric.precision)
          : metric.type === 'formula'
            ? 2
            : 2,
        detailFields: Array.isArray(metric.detailFields)
          ? metric.detailFields.filter(Boolean)
          : [],
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

function buildChartConfig(
  view,
  vizType,
  rowTotalsAllowed = new Set(),
  metrics = [],
) {
  if (!supportedCharts.includes(vizType)) return null
  const labels = view.rows.map((row, index) => displayRowLabel(row, index))
  let datasets = []

  if (view.columns.length) {
    datasets = view.columns.map((column, index) => {
      const color = chartPalette[index % chartPalette.length]
      const data = view.rows.map((row) => {
        const cell = row.cells[index]
        return typeof cell?.value === 'number' ? Number(cell.value) : 0
      })
      return {
        label: displayColumnLabel(column, index),
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
        label: header.label || `Метрика ${index + 1}`,
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

  const chartTitle = buildChartTitle(metrics)

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
        plugins: {
          legend: { position: 'bottom' },
          title: {
            display: Boolean(chartTitle),
            text: chartTitle,
            align: 'center',
            padding: { top: 4, bottom: 8 },
          },
        },
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
        title: {
          display: Boolean(chartTitle),
          text: chartTitle,
          align: 'center',
          padding: { top: 4, bottom: 8 },
        },
      },
      scales: {
        x: { ticks: { autoSkip: false } },
        y: { beginAtZero: true },
      },
    },
  }
}

function buildChartTitle(metrics = []) {
  const labels = (metrics || [])
    .filter((metric) => metric?.enabled !== false)
    .map((metric) => metric?.label || metric?.title || metric?.fieldLabel)
    .map((label) => (label ? String(label).trim() : ''))
    .filter(Boolean)
  const unique = [...new Set(labels)]
  return unique.join(', ')
}

function displayRowLabel(row, index) {
  if (Array.isArray(row?.values) && row.values.length) {
    return row.values.filter(Boolean).join(' • ')
  }
  if (row?.label) return row.label
  return `Строка ${index + 1}`
}

function displayColumnLabel(column, index) {
  const metricLabel = columnMetricLabel(column)
  const normalizedMetric = normalizeLabelValue(metricLabel)
  const values = Array.isArray(column?.values)
    ? column.values.map((value) => (value == null ? '' : String(value).trim()))
    : []
  const categories = values
    .map((value) => value.trim())
    .filter((value) => value && (!normalizedMetric || normalizeLabelValue(value) !== normalizedMetric))
  if (categories.length) {
    return categories.join(' • ')
  }
  const rawLabel = typeof column?.label === 'string' ? column.label : ''
  const stripped = stripMetricFromLabel(rawLabel, metricLabel)
  if (stripped) {
    return stripped
  }
  if (metricLabel) {
    return metricLabel
  }
  if (rawLabel) {
    return rawLabel.trim()
  }
  return `Колонка ${index + 1}`
}

function columnMetricLabel(column = {}) {
  const sources = [
    column?.metric?.label,
    column?.metric?.title,
    column?.metric?.fieldLabel,
    column?.metric?.displayLabel,
  ]
  for (const candidate of sources) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }
  return ''
}

function normalizeLabelValue(value) {
  if (!value) return ''
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase()
}

function stripMetricFromLabel(label, metricLabel) {
  if (!label) return ''
  const trimmed = String(label).trim()
  if (!trimmed) return ''
  if (!metricLabel) return trimmed
  const normalizedMetric = normalizeLabelValue(metricLabel)
  if (!normalizedMetric) return trimmed
  const tokens = trimmed
    .split(/[•\-–—,:]/)
    .map((token) => token.trim())
    .filter((token) => token && normalizeLabelValue(token) !== normalizedMetric)
  if (tokens.length) {
    return tokens.join(' • ')
  }
  return ''
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
    globalRanges: activePageFilters.value.reduce((acc, filter) => {
      const range = sanitizeRange(pageFilterRanges[filter.key])
      if (range) {
        acc[filter.key] = range
      }
      return acc
    }, {}),
    containerFilters: containerFilterValues[container.id],
    containerRanges: containerFilterRanges[container.id],
  })
  if (state.signature === signature && state.view) {
    return
  }

  state.signature = signature
  state.loading = true
  state.error = ''
  state.view = null
  state.chart = null
  state.records = []
  state.meta.rowTotalsAllowed = new Set()
  state.meta.columnTotalsAllowed = new Set()
  state.meta.metricGroups = []
  state.meta.columnFieldRows = []
  state.meta.rowHeaderTitle = 'Строки'

  try {
    const records = await ensureTemplateData(tpl)
    state.rawRecords = Array.isArray(records) ? records : []
    const filtered = filterRecords(
      records,
      tpl.snapshot,
      tpl.dataSource,
      container.id,
    )
    state.records = filtered
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
      const sortsToApply = tpl.snapshot?.options?.sorts || {}
      baseView = buildPivotView({
        records: filtered,
        rows: tpl.snapshot?.pivot?.rows || [],
        columns: tpl.snapshot?.pivot?.columns || [],
        metrics: baseMetrics,
        fieldMeta: templateFieldMetaMap(tpl),
        headerOverrides: tpl.snapshot?.options?.headerOverrides || {},
        sorts: sortsToApply,
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
    const visibleView = filterPivotViewByVisibility(augmented, metrics)
    const view = applyConditionalFormattingToView(visibleView, metrics)
    if (!view || !view.rows.length) {
      state.error = 'Нет данных после применения фильтров.'
      return
    }
    state.view = view
    state.chart = buildChartConfig(
      view,
      tpl.visualization,
      rowTotalsAllowed,
      metrics,
    )
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
    recalcContainerFilterOptions(container.id)
    recalcPageFilterOptions()
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
  Object.keys(containerFilterRanges).forEach((id) => {
    if (!ids.has(id)) delete containerFilterRanges[id]
  })
  Object.keys(containerTableSizing).forEach((id) => {
    if (!ids.has(id)) delete containerTableSizing[id]
  })
  Object.keys(containerRowCollapse).forEach((id) => {
    if (!ids.has(id)) delete containerRowCollapse[id]
  })
  recalcPageFilterOptions()
  recalcAllContainerFilterOptions()
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
  const previousMeta = new Map(
    (snapshot?.filtersMeta || []).map((meta) => [meta?.key, meta || {}]),
  )
  return filters.map((key) => ({
    key,
    label: resolveFieldLabel(key, overrides, fieldMeta),
    values: collectFilterValuesFromRecords(
      records,
      key,
      FILTER_META_VALUE_LIMIT,
    ),
    mode: normalizePreferredMode(previousMeta.get(key)?.mode),
  }))
}

function resolveFieldLabel(key, overrides = {}, fieldMeta = {}) {
  const normalizedKey = key || ''
  const override = overrides?.[normalizedKey]
  if (override && override.trim()) return override.trim()
  const dictionaryLabel = dictionaryLabelValue(normalizedKey)
  if (dictionaryLabel) return dictionaryLabel
  const dateMeta = parseDatePartKey(normalizedKey)
  if (dateMeta) {
    const baseOverride = overrides?.[dateMeta.fieldKey]
    if (baseOverride && baseOverride.trim()) {
      return formatDatePartFieldLabel(baseOverride, dateMeta.part)
    }
    const baseDictionary = dictionaryLabelValue(dateMeta.fieldKey)
    if (baseDictionary) {
      return formatDatePartFieldLabel(baseDictionary, dateMeta.part)
    }
    const baseMeta = fieldMeta?.[dateMeta.fieldKey]
    const baseLabel = baseMeta?.label || humanizeKey(dateMeta.fieldKey)
    return formatDatePartFieldLabel(baseLabel, dateMeta.part)
  }
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

function filterSupportsRange(filter = {}) {
  const type = filter?.type
  return type === 'number' || type === 'date'
}

function normalizePreferredMode(value) {
  if (value === 'range' || value === 'values') return value
  return ''
}

function isGlobalRangeFilter(filter) {
  if (!filter) return false
  if (filter.preferredMode === 'range') return true
  return Boolean(filter?.rangeOnly)
}

function isContainerRangeFilter(filter) {
  if (!filter) return false
  if (filter.preferredMode === 'range') return true
  return Boolean(filter?.rangeOnly)
}

function isValuesOnlyFilter(filter) {
  return filter?.preferredMode === 'values'
}

function hasForcedFilterMode(filter) {
  return Boolean(filter?.preferredMode)
}

function globalFilterValueOptions(key) {
  const dynamic = computeFilteredGlobalOptions(key)
  if (dynamic.length) return dynamic
  const available = availablePageFilterValues[key]
  if (Array.isArray(available) && available.length) return available
  return globalFilterValueMap.value.get(key) || []
}

function computeFilteredGlobalOptions(targetKey) {
  if (!targetKey) return []
  const containers = pageContainers.value || []
  if (!containers.length) return []
  const values = new Map()
  containers.forEach((container) => {
    const state = containerState(container.id)
    const records = state.rawRecords || []
    if (!records.length) return
    records.forEach((record) => {
      if (!matchesGlobalFilters(record, targetKey)) return
      if (!matchesContainerFilters(record, container)) return
      const resolvedValue = resolvePivotFieldValue(record, targetKey)
      const normalized = normalizeValue(resolvedValue)
      if (!values.has(normalized)) {
        const display = formatValue(resolvedValue)
        values.set(
          normalized,
          display && display !== '—' ? display : normalized || 'пусто',
        )
      }
    })
  })
  if (!values.size) return []
  return Array.from(values.entries()).map(([value, label]) => ({
    value,
    label,
  }))
}

function matchesContainerFilters(record, container, excludeKey = null) {
  const tpl = template(container.templateId)
  // Если шаблон или snapshot ещё не загружены, контейнер не должен отбрасывать записи
  if (!tpl || !tpl.snapshot) return true
  const snapshot = tpl.snapshot
  const fieldMetaMap = new Map(Object.entries(snapshot.fieldMeta || {}))
  const filterValues = { ...(snapshot.filterValues || {}) }
  const filterRanges = { ...(snapshot.filterRanges || {}) }
  if (excludeKey) {
    delete filterValues[excludeKey]
    delete filterRanges[excludeKey]
  }
  const overrides = containerFilterValues[container.id] || {}
  Object.entries(overrides).forEach(([key, values]) => {
    if (key === excludeKey) return
    filterValues[key] = [...values]
  })
  const rangeOverrides = containerFilterRanges[container.id] || {}
  Object.entries(rangeOverrides).forEach(([key, range]) => {
    if (key === excludeKey) return
    const sanitized = sanitizeRange(range)
    if (sanitized) {
      filterRanges[key] = sanitized
    } else {
      delete filterRanges[key]
    }
  })
  const dimensionValues = snapshot.dimensionValues || {}
  const dimensionRanges = snapshot.dimensionRanges || {}
  if (
    !matchFieldSet(
      record,
      snapshot.pivot?.filters,
      filterValues,
      filterRanges,
      fieldMetaMap,
    )
  )
    return false
  if (
    !matchFieldSet(
      record,
      snapshot.pivot?.rows,
      dimensionValues.rows || {},
      dimensionRanges.rows || {},
      fieldMetaMap,
    )
  )
    return false
  if (
    !matchFieldSet(
      record,
      snapshot.pivot?.columns,
      dimensionValues.columns || {},
      dimensionRanges.columns || {},
      fieldMetaMap,
    )
  )
    return false
  return true
}

function collectAvailableValues(records = [], key) {
  if (!Array.isArray(records) || !records.length) return new Map()
  const values = new Map()
  records.forEach((record) => {
    const resolvedValue = resolvePivotFieldValue(record, key)
    const normalized = normalizeValue(resolvedValue)
    if (!values.has(normalized)) {
      const display = formatValue(resolvedValue)
      values.set(
        normalized,
        display && display !== '—' ? display : normalized || 'пусто',
      )
    }
  })
  return values
}

function recalcPageFilterOptions() {
  const keys = activePageFilters.value.map((filter) => filter.key)
  const containers = pageContainers.value || []
  const result = {}
  keys.forEach((key) => {
    const values = new Map()
    containers.forEach((container) => {
      const state = containerState(container.id)
      const records = state.rawRecords || []
      if (!records.length) return
      const filtered = records.filter(
        (record) =>
          matchesGlobalFilters(record, key) &&
          matchesContainerFilters(record, container),
      )
      const collected = collectAvailableValues(filtered, key)
      collected.forEach((label, value) => {
        if (!values.has(value)) values.set(value, label)
      })
    })
    result[key] = Array.from(values.entries()).map(([value, label]) => ({
      value,
      label,
    }))
  })
  Object.keys(availablePageFilterValues).forEach((key) => {
    if (!keys.includes(key)) {
      delete availablePageFilterValues[key]
    }
  })
  Object.entries(result).forEach(([key, options]) => {
    availablePageFilterValues[key] = options
  })
}

function recalcContainerFilterOptions(containerId) {
  const container = (pageContainers.value || []).find(
    (item) => item.id === containerId,
  )
  if (!container) {
    delete availableContainerFilterValues[containerId]
    return
  }
  const filters = templateFilters(container)
  if (!filters.length) {
    delete availableContainerFilterValues[containerId]
    return
  }
  const state = containerState(container.id)
  const records = state.rawRecords || []
  const bucket = availableContainerFilterValues[containerId] || {}
  const next = {}
  filters.forEach((filter) => {
    const filtered = records.filter(
      (record) =>
        matchesGlobalFilters(record) &&
        matchesContainerFilters(record, container, filter.key),
    )
    const collected = collectAvailableValues(filtered, filter.key)
    next[filter.key] = Array.from(collected.entries()).map(
      ([value, label]) => ({
        value,
        label,
      }),
    )
  })
  Object.keys(bucket).forEach((key) => {
    if (!next[key]) {
      delete bucket[key]
    }
  })
  Object.entries(next).forEach(([key, options]) => {
    if (!availableContainerFilterValues[containerId]) {
      availableContainerFilterValues[containerId] = {}
    }
    availableContainerFilterValues[containerId][key] = options
  })
}

function recalcAllContainerFilterOptions() {
  const containers = pageContainers.value || []
  containers.forEach((container) => {
    recalcContainerFilterOptions(container.id)
  })
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

function buildGlobalFieldMetaMap() {
  const containers = pageContainers.value || []
  const templateMap = new Map(store.templates.map((tpl) => [tpl.id, tpl]))
  const result = new Map()
  containers.forEach((container) => {
    const tpl = templateMap.get(container.templateId)
    if (!tpl) return
    Object.entries(tpl.snapshot?.fieldMeta || {}).forEach(([key, meta]) => {
      if (!result.has(key)) {
        result.set(key, meta || {})
      }
    })
  })
  return result
}

function buildGlobalFilterRangeMap() {
  const containers = pageContainers.value || []
  const templateMap = new Map(store.templates.map((tpl) => [tpl.id, tpl]))
  const ranges = new Map()
  containers.forEach((container) => {
    const tpl = templateMap.get(container.templateId)
    if (!tpl) return
    mergeRangeMap(ranges, tpl.snapshot?.filterRanges || {})
    mergeRangeMap(ranges, tpl.snapshot?.dimensionRanges?.rows || {})
    mergeRangeMap(ranges, tpl.snapshot?.dimensionRanges?.columns || {})
  })
  return ranges
}

function buildGlobalFilterModeMap() {
  const containers = pageContainers.value || []
  const templateMap = new Map(store.templates.map((tpl) => [tpl.id, tpl]))
  const modeBuckets = new Map()
  containers.forEach((container) => {
    const tpl = templateMap.get(container.templateId)
    if (!tpl) return
    ;(tpl.snapshot?.filtersMeta || []).forEach((meta) => {
      if (!meta?.key) return
      const normalized = normalizePreferredMode(meta.mode)
      if (!normalized) return
      if (!modeBuckets.has(meta.key)) {
        modeBuckets.set(meta.key, new Set([normalized]))
      } else {
        modeBuckets.get(meta.key).add(normalized)
      }
    })
  })
  const result = new Map()
  modeBuckets.forEach((set, key) => {
    if (set.size === 1) {
      const [mode] = Array.from(set)
      result.set(key, mode)
    }
  })
  return result
}

function mergeRangeMap(target, source = {}) {
  if (!source || typeof source !== 'object') return
  Object.entries(source).forEach(([key, range]) => {
    if (target.has(key)) return
    const sanitized = sanitizeRange(range)
    if (sanitized) {
      target.set(key, sanitized)
    }
  })
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
    const normalized = normalizeValue(resolvePivotFieldValue(record, key))
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

watch(
  pageFilterRanges,
  () => {
    scheduleRefresh()
  },
  { deep: true },
)

function resetPageFilters() {
  activePageFilters.value.forEach((filter) => {
    pageFilterValues[filter.key] = []
    delete pageFilterRanges[filter.key]
  })
}

function resetContainerFilter(containerId, key) {
  const store = containerFilterStore(containerId)
  store[key] = []
  delete containerRangeStore(containerId)[key]
  requestContainerRefresh(containerId)
}

function handlePageFilterValuesChange(key, values, forcedMode = '') {
  const next = Array.isArray(values) ? [...values] : []
  if (areValueArraysEqual(pageFilterValues[key], next)) {
    if (forcedMode !== 'range' && pageFilterRanges[key]) {
      delete pageFilterRanges[key]
    }
    return
  }
  pageFilterValues[key] = next
  if (forcedMode !== 'range') {
    delete pageFilterRanges[key]
  }
  recalcPageFilterOptions()
  recalcAllContainerFilterOptions()
  if (forcedMode === 'range') {
    return
  }
  scheduleRefresh()
}

function handlePageFilterRangeChange(key, range) {
  const sanitized = sanitizeRange(range)
  const current = pageFilterRanges[key]
  if (sanitized) {
    const changed = !rangesEqual(current, sanitized)
    if (changed) {
      pageFilterRanges[key] = sanitized
    }
    if (pageFilterValues[key]?.length) {
      pageFilterValues[key] = []
    }
    recalcPageFilterOptions()
    recalcAllContainerFilterOptions()
    scheduleRefresh()
    return
  }
  if (current) {
    delete pageFilterRanges[key]
  }
  recalcPageFilterOptions()
  recalcAllContainerFilterOptions()
  scheduleRefresh()
}

function handleContainerFilterValuesChange(containerId, filter, values) {
  const key = filter.key
  const store = containerFilterStore(containerId)
  const next = Array.isArray(values) ? [...values] : []
  const current = store[key] || []
  if (areValueArraysEqual(current, next)) {
    if (!isContainerRangeFilter(filter)) {
      delete containerRangeStore(containerId)[key]
      requestContainerRefresh(containerId)
    }
    return
  }
  store[key] = next
  if (!isContainerRangeFilter(filter)) {
    delete containerRangeStore(containerId)[key]
  }
  recalcContainerFilterOptions(containerId)
  recalcPageFilterOptions()
  requestContainerRefresh(containerId)
}

function handleContainerFilterRangeChange(containerId, filter, range) {
  const key = filter.key
  const rangeStore = containerRangeStore(containerId)
  const sanitized = sanitizeRange(range)
  const currentRange = rangeStore[key]
  const filterStore = containerFilterStore(containerId)
  if (sanitized) {
    const changedRange = !rangesEqual(currentRange, sanitized)
    if (changedRange) {
      rangeStore[key] = sanitized
    }
    if (filterStore[key]?.length) {
      filterStore[key] = []
    }
    if (changedRange || filterStore[key]?.length === 0) {
      recalcContainerFilterOptions(containerId)
      recalcPageFilterOptions()
      requestContainerRefresh(containerId)
    }
    return
  }
  if (currentRange) {
    delete rangeStore[key]
    requestContainerRefresh(containerId)
  }
  recalcContainerFilterOptions(containerId)
  recalcPageFilterOptions()
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
  padding: 24px clamp(16px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}
.page__restricted {
  min-height: 60vh;
  align-items: center;
  justify-content: center;
}
.page__restricted-card {
  max-width: 420px;
  margin: 0 auto;
  padding: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: center;
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
  flex-wrap: nowrap;
  align-items: center;
}
.page__actions > * {
  flex-shrink: 0;
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
.page-filter__label {
  font-size: 13px;
  color: #111827;
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
.layout-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.layout-tab {
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.layout-tab--active {
  background: #312e81;
  color: #fff;
  border-color: #312e81;
}
.layout__empty {
  margin: 0;
  padding: 12px;
  color: #6b7280;
  font-size: 13px;
  grid-column: 1 / -1;
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
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 12px;
  background: #f8fafc;
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
  overflow-x: auto;
  border: 1px solid #dfe7f5;
  border-radius: 18px;
  background: #fff;
  padding: 4px;
  box-shadow:
    inset 0 0 0 1px rgba(148, 163, 184, 0.08),
    0 8px 24px rgba(15, 23, 42, 0.06);
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
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #0f172a;
  line-height: 1.35;
  word-break: break-word;
  max-height: 4.05em;
}
.pivot-table {
  --cell-padding-y: 9px;
  --cell-padding-x: 10px;
  --group-divider-color: rgba(148, 163, 184, 0.18);
  --row-divider-color: rgba(203, 213, 225, 0.5);
  --row-hover-color: rgba(148, 163, 184, 0.12);
  --column-hover-color: rgba(37, 99, 235, 0.08);
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  line-height: 1.25;
  background: #fff;
  color: #1f2937;
  font-feature-settings: 'tnum' 1;
}
.pivot-table.table-density--compact {
  --cell-padding-y: 7px;
  --cell-padding-x: 8px;
  font-size: 12px;
}
.pivot-table th,
.pivot-table td {
  padding: var(--cell-padding-y) var(--cell-padding-x);
  border: none;
  position: relative;
  transition: background 140ms ease, color 140ms ease;
  overflow: visible;
  z-index: 0;
}
.pivot-table th {
  text-align: center;
  vertical-align: top;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.pivot-table thead th {
  background: #f8fafc;
  color: rgba(15, 23, 42, 0.85);
  border-bottom: 1px solid #d9e2f1;
  font-size: 13.5px;
}
.pivot-table td,
.pivot-table th {
  font-weight: 500;
}
.pivot-table th:first-child,
.pivot-table td:first-child {
  text-align: left;
}
.pivot-table tr > :nth-child(2) {
  padding-left: calc(var(--cell-padding-x) + 6px);
}
.pivot-table .row-label {
  font-weight: 600;
  position: relative;
  background: #f9fafb;
  border-right: 1px solid #edf2f7;
  color: #0f172a;
}
.pivot-table tbody td {
  text-align: right;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.98);
}
.pivot-table tbody td.cell {
  text-align: right;
}
.pivot-table tbody td,
.pivot-table tbody .row-label {
  border-top: 1px solid var(--row-divider-color);
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
  border-top: 2px solid #dbeafe;
  color: #0f172a;
  background: linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%);
  padding-left: calc(var(--cell-padding-x) + 4px);
  border-left: 1px solid rgba(99, 102, 241, 0.25);
}
.pivot-table th.column-field-group--total,
.pivot-table th.grand-total {
  background: #eef2ff;
  color: #312e81;
  border-left: 1px solid rgba(99, 102, 241, 0.25);
}
.pivot-table tbody tr:hover td,
.pivot-table tbody tr:hover .row-label {
  background: var(--row-hover-color);
}
.pivot-table tr > :is(th, td)::before {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 1px;
  right: -4px;
  background: transparent;
  pointer-events: none;
  z-index: -1;
}
.pivot-table tr > :nth-child(2)::before,
.pivot-table tr > :last-child::before {
  background: var(--group-divider-color);
}
.pivot-table td.total::before,
.pivot-table td.grand-total::before,
.pivot-table th.column-field-group--total::before,
.pivot-table th.grand-total::before {
  background: var(--group-divider-color);
}
.pivot-table td::after,
.pivot-table th::after {
  content: '';
  position: absolute;
  top: -9999px;
  bottom: -9999px;
  left: 0;
  right: 0;
  background: transparent;
  transition: background 140ms ease;
  pointer-events: none;
  z-index: -1;
}
.pivot-table td:hover::after,
.pivot-table th:hover::after {
  background: var(--column-hover-color);
}
.pivot-table td:focus-within,
.pivot-table td:focus-within::after {
  background: rgba(37, 99, 235, 0.12);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.4);
}
.pivot-table input {
  width: 100%;
  border: 1px solid transparent;
  border-bottom: 1px solid #e2e8f0;
  padding: 4px 0;
  font-size: inherit;
  color: inherit;
  background: transparent;
  font-feature-settings: 'tnum' 1;
}
.pivot-table input:focus {
  outline: none;
  border-bottom-color: #1d4ed8;
}
.pivot-table input::placeholder {
  color: #94a3b8;
}
.pivot-table tbody td.disabled {
  opacity: 0.5;
}
.pivot-table.table-density--standard {
  font-size: 12.5px;
}
@media (max-width: 1200px) {
  .pivot-table {
    --cell-padding-y: 10px;
    --cell-padding-x: 10px;
    font-size: 12px;
  }
}
@media (max-width: 768px) {
  .pivot-wrapper {
    border-radius: 12px;
  }
  .pivot-table {
    font-size: 12px;
  }
}
@media (max-width: 900px) {
  .page__actions {
    flex-wrap: wrap;
  }
}
.chart-container {
  min-height: 220px;
}
.cell--clickable {
  cursor: pointer;
}
.cell--clickable:hover {
  background: rgba(99, 102, 241, 0.08);
}
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 16px;
  z-index: 1000;
}
.detail-panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.18),
    inset 0 0 0 1px rgba(148, 163, 184, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  width: min(100%, 1040px);
  max-height: 90vh;
}
.detail-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.detail-panel__eyebrow {
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #818cf8;
  margin: 0 0 4px;
}
.detail-panel__context {
  color: #475569;
  font-size: 13px;
  margin: 4px 0 0;
}
.detail-panel__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.detail-panel__action {
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: #312e81;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}
.detail-panel__action:disabled {
  opacity: 0.5;
  cursor: default;
}
.detail-panel__close {
  border: none;
  background: #e2e8f0;
  color: #0f172a;
  border-radius: 999px;
  width: 32px;
  height: 32px;
  font-size: 20px;
  cursor: pointer;
}
.detail-panel__meta {
  font-size: 13px;
  color: #475569;
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.detail-panel__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.detail-panel__placeholder,
.detail-panel__error,
.detail-panel__empty {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  font-size: 13px;
  color: #475569;
}
.detail-panel__error {
  color: #b91c1c;
  background: #fef2f2;
}
.detail-table-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: auto;
  max-height: 60vh;
}
.detail-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12.5px;
  table-layout: fixed;
}
.detail-table th,
.detail-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  word-break: break-word;
}
.detail-table th {
  font-weight: 600;
  background: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 2;
}
.detail-table td {
  color: #1f2937;
}
.detail-table .is-number {
  text-align: right;
  font-feature-settings: 'tnum' 1;
}
.detail-table tr:last-child td {
  border-bottom: none;
}
</style>
  font-size: 13.5px;
  color: rgba(15, 23, 42, 0.85);
  padding-bottom: 4px;
}
.metric-header .column-field-group {
  font-size: 13.5px;
  color: rgba(15, 23, 42, 0.9);
  text-transform: none;
}
.column-field-group:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  right: 0;
  width: 1px;
  background: rgba(148, 163, 184, 0.15);
}
.column-field-group--total::after {
  display: none;
}
.column-field-group--total {
  border-left: 1px solid rgba(148, 163, 184, 0.15);
  padding-left: 14px;
}
