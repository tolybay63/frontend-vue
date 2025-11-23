<template>
  <section class="page">
    <h1>Конструктор отчётов</h1>

    <article class="step">
      <header class="step__header">
        <div class="step__badge">1</div>
        <div>
          <h2>Источник и параметры</h2>
          <p class="muted">
            Выберите источник данных и задайте параметры выборки. Сначала загрузите таблицу,
            чтобы перейти к следующему шагу.
          </p>
        </div>
        <div
          v-if="hasPlanData || (!isPlanSource && hasResultData)"
          class="step__status"
        >
          <span class="dot dot--success"></span>
          Данные загружены
        </div>
      </header>

      <div class="step__body">
        <div class="form-grid">
          <label class="field">
            <span class="field__label">Источник данных</span>
            <select v-model="dataSource">
              <option disabled value="">Выберите источник</option>
              <option value="plans">Планы</option>
              <option value="objects">Объекты</option>
              <option value="defects">Дефекты</option>
              <option value="kpi">KPI</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">Период</span>
            <input v-model="filters.period" placeholder="2025-01..2025-12" />
          </label>
          <label class="field">
            <span class="field__label">Участок / зона</span>
            <input v-model="filters.area" placeholder="Участок/зона" />
          </label>
          <label class="field">
            <span class="field__label">Объект или ID</span>
            <input v-model="filters.object" placeholder="Объект/ID" />
          </label>
        </div>

        <div class="step__actions">
          <button
            class="btn-primary"
            type="button"
            @click="run"
            :disabled="!dataSource || planLoading"
          >
            {{
              isPlanSource
                ? planLoading
                  ? 'Загрузка...'
                  : 'Загрузить план'
                : 'Сформировать'
            }}
          </button>
          <button
            v-if="isPlanSource"
            class="btn-outline"
            type="button"
            @click="refreshPlanFields"
            :disabled="!hasPlanData || planLoading"
          >
            Обновить данные
          </button>
        </div>

        <div v-if="isPlanSource" class="step__info">
          <p class="muted">
            POST /dtj/api/plan · data/loadPlan<br />
            Параметры: {{ planPayloadDisplay }}
          </p>
          <p class="muted" v-if="hasPlanData">
            Загружено записей: <strong>{{ planRecords.length }}</strong>
          </p>
        </div>

        <p v-if="planError" class="error">{{ planError }}</p>
        <p v-else-if="planLoading" class="muted">Получаем данные плана...</p>

        <details v-if="isPlanSource && filteredPlanRecords.length">
          <summary>Сырые записи ({{ filteredPlanRecords.length }})</summary>
          <pre>{{ filteredPlanRecords }}</pre>
        </details>
      </div>
    </article>

    <article
      v-if="isPlanSource"
      class="step"
      :class="{ 'step--disabled': !hasPlanData }"
    >
      <header class="step__header">
        <div class="step__badge">2</div>
        <div>
          <h2>Настройте сводную таблицу</h2>
          <p class="muted">
            Выберите поля для фильтров, строк и столбцов, задайте агрегации и сразу увидите результат ниже.
          </p>
        </div>
        <div v-if="pivotReady" class="step__status">
          <span class="dot dot--success"></span>
          Таблица готова
        </div>
      </header>

      <div class="step__body">
        <p v-if="!hasPlanData" class="muted">
          Сначала загрузите данные плана, чтобы настроить сводную таблицу.
        </p>
        <template v-else>
          <section class="config-panel">
            <div class="config-block">
              <input v-model="configName" placeholder="Название конфигурации" />
              <button class="btn-success" type="button" @click="saveCurrentConfig">Сохранить конфигурацию</button>
            </div>
            <div class="config-block">
              <select v-model="selectedConfigId">
                <option value="">Выберите конфигурацию</option>
                <option v-for="cfg in savedConfigs" :key="cfg.id" :value="cfg.id">
                  {{ cfg.name }}
                </option>
              </select>
              <button
                class="btn-outline"
                type="button"
                @click="loadSelectedConfig"
                :disabled="!selectedConfigId"
              >
                Загрузить
              </button>
              <button
                class="btn-danger"
                type="button"
                @click="deleteSelectedConfig"
                :disabled="!selectedConfigId"
              >
                Удалить
              </button>
            </div>
          </section>

          <div class="pivot-layout">
            <section class="samples">
              <div class="step__subheader">
                <h3>Доступные поля</h3>
                <span class="muted">
                  Название, ключ и примеры реальных значений из загруженной таблицы
                </span>
              </div>
              <ul>
                <li v-for="field in planFields" :key="field.key">
                  <div class="field-main">
                    <strong>{{ field.label }}</strong>
                    <span class="key-tag">{{ field.key }}</span>
                  </div>
                  <div class="field-meta">
                    <span>Тип: {{ field.type === 'number' ? 'Число' : 'Текст' }}</span>
                    <span>
                      Пример:
                      <code>{{ field.sample }}</code>
                    </span>
                  </div>
                  <div v-if="field.values.length" class="value-examples">
                    <span class="meta-label">Частые значения (до 20):</span>
                    <div class="chip-list">
                      <span
                        v-for="value in field.values"
                        :key="`${field.key}-${value || 'empty'}-example`"
                        class="chip"
                      >
                        {{ value || 'пусто' }}
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </section>

            <section class="pivot-grid">
              <div v-for="section in pivotSections" :key="section.key" class="pivot-section">
                <div class="pivot-title">{{ section.title }}</div>
                <div class="field-list">
                  <label
                    v-for="field in planFields"
                    :key="`${section.key}-${field.key}`"
                    class="field-option"
                  >
                    <input type="checkbox" :value="field.key" v-model="pivotConfig[section.key]" />
                    <span>{{ field.label }}</span>
                  </label>
                </div>
              </div>
            </section>
          </div>

          <section class="metrics-panel">
            <header>
              <h3>Метрики сводной таблицы</h3>
              <button class="btn-outline" type="button" @click="addMetric">Добавить метрику</button>
            </header>
            <div v-if="!pivotMetrics.length" class="muted">
              Добавьте хотя бы одну метрику (поле + агрегат), чтобы увидеть расчёты.
            </div>
            <div class="metrics-list">
              <div v-for="metric in pivotMetrics" :key="metric.id" class="metric-row">
                <select v-model="metric.fieldKey">
                  <option disabled value="">Поле</option>
                  <option
                    v-for="field in planFields"
                    :key="`metric-${metric.id}-${field.key}`"
                    :value="field.key"
                  >
                    {{ field.label }}
                  </option>
                </select>
                <select v-model="metric.aggregator">
                  <option v-for="agg in aggregatorOptions" :key="agg.value" :value="agg.value">
                    {{ agg.label }}
                  </option>
                </select>
                <button
                  class="remove"
                  type="button"
                  @click="removeMetric(metric.id)"
                  :disabled="pivotMetrics.length === 1"
                >
                  ×
                </button>
              </div>
            </div>
          </section>

          <div v-if="selectedFilterFields.length" class="filters-panel">
            <h3>Значения фильтров</h3>
            <div class="filters-panel__actions">
              <span class="muted">Отметьте конкретные значения, чтобы сузить выборку.</span>
              <button
                class="btn-outline btn-sm"
                type="button"
                @click="resetFilterValues"
                :disabled="!hasSelectedFilterValues"
              >
                Сбросить значения
              </button>
            </div>
            <div class="filters-grid">
              <div v-for="field in selectedFilterFields" :key="field.key" class="filters-field">
                <div class="filter-title">{{ field.label }}</div>
                <div class="filter-values">
                  <label
                    v-for="value in field.values"
                    :key="`${field.key}-${value}`"
                    class="filter-option"
                  >
                    <input
                      type="checkbox"
                      :value="value"
                      v-model="filterValues[field.key]"
                    />
                    <span>{{ value || 'пусто' }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div v-if="pivotWarnings.length" class="warning">
            <p v-for="note in pivotWarnings" :key="note">{{ note }}</p>
          </div>

          <div v-else-if="pivotView && pivotView.rows.length" class="pivot-preview">
            <div class="step__subheader">
              <h3>Сводная таблица</h3>
              <span class="muted">Обновляется при изменении полей</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Строки</th>
                  <th v-for="column in pivotView.columns" :key="column.key">
                    {{ column.label }}
                  </th>
                  <th
                    v-for="total in pivotView.rowTotalHeaders"
                    :key="`row-total-${total.metricId}`"
                  >
                    {{ total.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in pivotView.rows" :key="row.key">
                  <td class="row-label">{{ row.label }}</td>
                  <td v-for="cell in row.cells" :key="cell.key" class="cell">
                    {{ cell.display }}
                  </td>
                  <td
                    v-for="total in row.totals"
                    :key="`row-${row.key}-${total.metricId}`"
                    class="total"
                  >
                    {{ total.display }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Итого по столбцам</td>
                  <td v-for="column in pivotView.columns" :key="`total-${column.key}`" class="total">
                    {{ column.totalDisplay }}
                  </td>
                  <td
                    v-for="total in pivotView.rowTotalHeaders"
                    :key="`grand-${total.metricId}`"
                    class="grand-total"
                  >
                    {{ pivotView.grandTotals[total.metricId] }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-else class="empty-state">
            <h4>Нет данных для этой комбинации полей</h4>
            <p>
              Проверьте выбранные значения фильтров и метрик. Если фильтры не нужны, очистите их —
              таблица построится по всем загруженным строкам.
            </p>
            <ul class="empty-state__tips">
              <li>Попробуйте выбрать другие поля в строках или столбцах.</li>
              <li>Очистите значения фильтров, чтобы вернуть все записи.</li>
              <li>Убедитесь, что в источнике есть данные за заданный период.</li>
            </ul>
            <div class="empty-state__meta">
              <span>Загружено строк: {{ planRecords.length }}</span>
              <span>После фильтрации: {{ filteredPlanRecords.length }}</span>
            </div>
            <button
              class="btn-outline btn-sm"
              type="button"
              @click="resetFilterValues"
              :disabled="!hasSelectedFilterValues"
            >
              Очистить значения фильтров
            </button>
          </div>
        </template>
      </div>
    </article>

    <article
      class="step"
      :class="{
        'step--disabled': isPlanSource ? !pivotReady : !hasResultData,
      }"
    >
      <header class="step__header">
        <div class="step__badge">3</div>
        <div>
          <h2>Визуализация и выдача</h2>
          <p class="muted">
            После настройки сводной таблицы выберите вид диаграммы или выгрузите результат.
          </p>
        </div>
      </header>

      <div class="step__body">
        <div class="viz-grid">
          <label class="field">
            <span class="field__label">Тип визуализации</span>
            <select v-model="vizType" :disabled="!canUseVizSettings">
              <option value="table">Таблица</option>
              <option value="bar">Столбчатая диаграмма</option>
              <option value="line">Линейная диаграмма</option>
              <option value="pie">Круговая диаграмма</option>
            </select>
          </label>
        </div>

        <div class="step__actions">
          <button
            class="btn-primary"
            type="button"
            @click="saveTemplate"
            :disabled="!canUseVizSettings"
          >
            Сохранить как шаблон
          </button>
          <button
            v-if="isPlanSource"
            class="btn-outline"
            type="button"
            @click="exportToCsv"
            :disabled="!pivotReady"
          >
            Выгрузить в Excel (CSV)
          </button>
        </div>

        <div v-if="!isPlanSource && hasResultData" class="result">
          <pre v-if="vizType === 'table'">{{ result }}</pre>
          <div v-else>Заглушка визуализации: {{ vizType }}</div>
        </div>
        <p v-else-if="!canUseVizSettings" class="muted">
          Завершите предыдущие шаги, чтобы выбрать визуализацию или экспорт.
        </p>
      </div>
    </article>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { api } from '@/shared/api/http'
import { DEFAULT_PLAN_PAYLOAD, fetchPlanRecords } from '@/shared/api/plan'

const dataSource = ref('')
const vizType = ref('table')
const filters = ref({ period: '', area: '', object: '' })
const result = ref([])

const planRecords = ref([])
const planFields = ref([])
const planLoading = ref(false)
const planError = ref('')
const planPayloadDisplay = JSON.stringify(DEFAULT_PLAN_PAYLOAD)

const isPlanSource = computed(() => dataSource.value === 'plans')
const hasResultData = computed(() => {
  const value = result.value
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return Boolean(value)
})
const hasPlanData = computed(() => isPlanSource.value && planFields.value.length > 0)

const pivotSections = [
  { key: 'filters', title: 'Фильтры' },
  { key: 'rows', title: 'Строки' },
  { key: 'columns', title: 'Столбцы' },
]

const pivotConfig = reactive({
  filters: [],
  rows: [],
  columns: [],
})

const filterValues = reactive({})
const pivotMetrics = reactive([])
const pivotMetricsVersion = ref(0)

const aggregatorOptions = [
  { value: 'count', label: 'Количество' },
  { value: 'sum', label: 'Сумма' },
  { value: 'avg', label: 'Среднее' },
]

const CONFIG_STORAGE_KEY = 'report-pivot-configs'
const savedConfigs = ref(loadSavedConfigs())
const selectedConfigId = ref('')
const configName = ref('')

watch(
  () => dataSource.value,
  (value, prev) => {
    if (value === 'plans' && prev !== 'plans') {
      loadPlanFields(true)
      ensureMetricExists()
    }
    if (value !== 'plans' && prev === 'plans') {
      resetPlanState()
    }
  },
)

watch(
  () => planFields.value.map((field) => field.key),
  (validKeys) => {
    pivotSections.forEach((section) => {
      pivotConfig[section.key] = pivotConfig[section.key].filter((key) =>
        validKeys.includes(key),
      )
    })
    pivotMetrics.forEach((metric) => {
      if (metric.fieldKey && !validKeys.includes(metric.fieldKey)) {
        metric.fieldKey = ''
      }
    })
    pivotMetricsVersion.value += 1
  },
)

watch(
  () => [...pivotConfig.filters],
  (next, prev) => {
    next.forEach((key) => {
      if (!filterValues[key]) filterValues[key] = []
    })
    prev.forEach((key) => {
      if (!next.includes(key)) {
        delete filterValues[key]
      }
    })
  },
  { deep: true },
)

watch(
  () => planFields.value,
  (fields) => {
    if (fields.length && pivotMetrics.length === 1 && !pivotMetrics[0].fieldKey) {
      const firstNumericField = fields.find((field) => field.type === 'number')
      const firstFieldKey = firstNumericField?.key || fields[0]?.key
      if (firstFieldKey) {
        pivotMetrics[0].fieldKey = firstFieldKey
        pivotMetrics[0].aggregator = firstNumericField ? 'sum' : 'count'
        pivotMetricsVersion.value += 1
      }
    }
  },
  { deep: true },
)

watch(
  () => savedConfigs.value,
  (configs) => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configs))
  },
  { deep: true },
)

watch(
  pivotMetrics,
  () => {
    pivotMetricsVersion.value += 1
  },
  { deep: true },
)

const planFieldsMap = computed(() => {
  return planFields.value.reduce((acc, field) => {
    acc.set(field.key, field)
    return acc
  }, new Map())
})

const selectedFilterFields = computed(() =>
  pivotConfig.filters
    .map((key) => planFieldsMap.value.get(key))
    .filter(Boolean),
)

const activeMetrics = computed(() => {
  pivotMetricsVersion.value
  return pivotMetrics
    .map((metric) => {
      const field = planFieldsMap.value.get(metric.fieldKey)
      if (!field || !metric.fieldKey) return null
      return {
        ...metric,
        label: aggregatorLabel(metric.aggregator, field),
        field,
      }
    })
    .filter(Boolean)
})

const filteredPlanRecords = computed(() => {
  if (!planRecords.value.length) return []
  return planRecords.value.filter((record) => {
    return pivotConfig.filters.every((fieldKey) => {
      const selectedValues = filterValues[fieldKey]
      if (!selectedValues || !selectedValues.length) return true
      const normalizedRecordValue = normalizeValue(record[fieldKey])
      return selectedValues.includes(normalizedRecordValue)
    })
  })
})

const pivotWarnings = computed(() => {
  const messages = []
  if (!planRecords.value.length) {
    messages.push('Загрузите данные плана, чтобы построить сводную таблицу.')
  }
  if (!pivotConfig.rows.length && !pivotConfig.columns.length) {
    messages.push('Добавьте хотя бы одно поле в строки или столбцы.')
  }
  if (!activeMetrics.value.length) {
    messages.push('Добавьте хотя бы одну метрику.')
  }
  activeMetrics.value.forEach((metric) => {
    if (
      metric.field.type !== 'number' &&
      metric.aggregator !== 'count'
    ) {
      messages.push(
        `Метрика «${metric.label}» требует числовое поле. Выберите другое поле или агрегат.`,
      )
    }
  })
  return messages
})

const pivotView = computed(() => {
  if (pivotWarnings.value.length) return null
  if (!filteredPlanRecords.value.length) return null
  return buildPivotView({
    records: filteredPlanRecords.value,
    rows: pivotConfig.rows,
    columns: pivotConfig.columns,
    metrics: activeMetrics.value,
  })
})
const pivotReady = computed(() => Boolean(pivotView.value && pivotView.value.rows.length))
const canUseVizSettings = computed(() =>
  isPlanSource.value ? pivotReady.value : hasResultData.value,
)
const hasSelectedFilterValues = computed(() =>
  Object.values(filterValues).some((values) => values && values.length),
)

async function run() {
  if (isPlanSource.value) {
    await loadPlanFields(true)
    return
  }

  const { data } = await api.get('/reports/preview', {
    params: {
      source: dataSource.value,
      viz: vizType.value,
      period: filters.value.period,
      area: filters.value.area,
      object: filters.value.object,
    },
  })
  result.value = data
}

function saveTemplate() {
  alert('Шаблон сохранён (заглушка)')
}

async function refreshPlanFields() {
  await loadPlanFields(true)
}

async function loadPlanFields(force = false) {
  if (!isPlanSource.value) return
  if (planLoading.value) return
  if (!force && planFields.value.length) return

  planLoading.value = true
  planError.value = ''
  try {
    const records = await fetchPlanRecords()
    planRecords.value = records
    result.value = records
    planFields.value = extractFieldDescriptors(records)
    ensureMetricExists()
  } catch (err) {
    planError.value =
      err?.response?.data?.message ||
      err?.message ||
      'Не удалось загрузить данные плана.'
    planRecords.value = []
    planFields.value = []
  } finally {
    planLoading.value = false
  }
}

function resetPlanState() {
  planRecords.value = []
  planFields.value = []
  planError.value = ''
  replaceArray(pivotConfig.filters, [])
  replaceArray(pivotConfig.rows, [])
  replaceArray(pivotConfig.columns, [])
  pivotMetrics.splice(0, pivotMetrics.length)
  pivotMetricsVersion.value += 1
  Object.keys(filterValues).forEach((key) => delete filterValues[key])
}

function resetFilterValues() {
  Object.keys(filterValues).forEach((key) => {
    filterValues[key] = []
  })
}

function extractFieldDescriptors(records) {
  const map = new Map()
  records.forEach((record) => {
    Object.entries(record || {}).forEach(([key, value]) => {
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: FIELD_ALIASES[key] || humanizeKey(key),
          sample: formatSample(value),
          total: 0,
          numericCount: 0,
          values: new Set(),
        })
      }
      const descriptor = map.get(key)
      descriptor.total += 1
      if (typeof value === 'number') descriptor.numericCount += 1
      if (descriptor.values.size < 20) {
        descriptor.values.add(normalizeValue(value))
      }
      if (!descriptor.sample && value !== undefined && value !== null) {
        descriptor.sample = formatSample(value)
      }
    })
  })

  return Array.from(map.values()).map((descriptor) => ({
    key: descriptor.key,
    label: descriptor.label,
    sample: descriptor.sample || '—',
    values: Array.from(descriptor.values),
    type:
      descriptor.numericCount > 0 && descriptor.numericCount === descriptor.total
        ? 'number'
        : 'string',
  }))
}

function buildPivotView({ records, rows, columns, metrics }) {
  const rowIndex = []
  const rowMap = new Map()
  const columnIndex = []
  const columnMap = new Map()
  const cellMap = new Map()
  const rowMetricTotals = new Map()
  const columnMetricTotals = new Map()
  const grandMetricTotals = new Map()

  records.forEach((record) => {
    const rowKey = buildDimensionKey(record, rows)
    const columnKey = buildDimensionKey(record, columns)
    ensureIndex(rowMap, rowIndex, rowKey)
    ensureIndex(columnMap, columnIndex, columnKey)

    metrics.forEach((metric) => {
      const value = record[metric.fieldKey]
      const cellKey = `${rowKey.key}||${columnKey.key}||${metric.id}`
      pushValue(getBucket(cellMap, cellKey), value)
      pushValue(getNestedBucket(rowMetricTotals, rowKey.key, metric.id), value)
      pushValue(getNestedBucket(columnMetricTotals, columnKey.key, metric.id), value)
      pushValue(getBucket(grandMetricTotals, metric.id), value)
    })
  })

  const columnEntries = columnIndex.length
    ? flattenColumns(columnIndex, metrics)
    : metrics.map((metric) => ({
        key: `__all__::${metric.id}`,
        baseKey: '__all__',
        metricId: metric.id,
        label: metric.label,
        aggregator: metric.aggregator,
      }))

  const rowsView = rowIndex.length ? rowIndex : [{ key: '__all__', label: 'Все записи' }]

  const rowsResult = rowsView.map((row) => {
    const cells = columnEntries.map((column) => {
      const cellKey = `${row.key}||${column.baseKey}||${column.metricId}`
      const bucket = cellMap.get(cellKey)
      return {
        key: cellKey,
        display: formatNumber(finalizeBucket(bucket, column.aggregator)),
      }
    })
    const totals = metrics.map((metric) => {
      const bucket = getNestedBucket(rowMetricTotals, row.key, metric.id)
      return {
        metricId: metric.id,
        display: formatNumber(finalizeBucket(bucket, metric.aggregator)),
      }
    })
    return {
      key: row.key,
      label: row.label,
      cells,
      totals,
    }
  })

  const columnsResult = columnEntries.map((column) => {
    const bucket = getNestedBucket(columnMetricTotals, column.baseKey, column.metricId)
    return {
      ...column,
      totalDisplay: formatNumber(finalizeBucket(bucket, column.aggregator)),
    }
  })

  const rowTotalHeaders = metrics.map((metric) => ({
    metricId: metric.id,
    label: `Итого • ${metric.label}`,
  }))

  const grandTotals = metrics.reduce((acc, metric) => {
    const bucket = grandMetricTotals.get(metric.id)
    acc[metric.id] = formatNumber(finalizeBucket(bucket, metric.aggregator))
    return acc
  }, {})

  return {
    rows: rowsResult,
    columns: columnsResult,
    rowTotalHeaders,
    grandTotals,
  }
}

function ensureIndex(store, collection, entry) {
  if (!store.has(entry.key)) {
    store.set(entry.key, entry)
    collection.push(entry)
  }
  return store.get(entry.key)
}

function flattenColumns(columnIndex, metrics) {
  const entries = []
  columnIndex.forEach((column) => {
    metrics.forEach((metric) => {
      entries.push({
        key: `${column.key}::${metric.id}`,
        baseKey: column.key,
        metricId: metric.id,
        label:
          column.label && column.label !== 'Все записи'
            ? `${column.label} • ${metric.label}`
            : metric.label,
        aggregator: metric.aggregator,
      })
    })
  })
  return entries
}

function buildDimensionKey(record, dimensions) {
  if (!dimensions.length) {
    return { key: '__all__', label: 'Все записи' }
  }
  const label = dimensions
    .map((fieldKey) => formatValue(record[fieldKey]))
    .join(' / ')
  const key = dimensions
    .map((fieldKey) => `${fieldKey}:${normalizeValue(record[fieldKey])}`)
    .join('|')
  return { key: key || '__empty__', label: label || '—' }
}

function createBucket() {
  return { count: 0, numericCount: 0, sum: 0 }
}

function getBucket(store, key) {
  if (!store.has(key)) store.set(key, createBucket())
  return store.get(key)
}

function getNestedBucket(store, outerKey, innerKey) {
  if (!store.has(outerKey)) store.set(outerKey, new Map())
  const nested = store.get(outerKey)
  if (!nested.has(innerKey)) nested.set(innerKey, createBucket())
  return nested.get(innerKey)
}

function pushValue(bucket, value) {
  if (!bucket) return
  bucket.count += 1
  const num = Number(value)
  if (!Number.isNaN(num)) {
    bucket.numericCount += 1
    bucket.sum += num
  }
}

function finalizeBucket(bucket, aggregator) {
  if (!bucket) return null
  if (aggregator === 'count') return bucket.count
  if (!bucket.numericCount) return null
  if (aggregator === 'sum') return bucket.sum
  if (aggregator === 'avg') return bucket.sum / bucket.numericCount
  return null
}

function formatNumber(value) {
  if (value === null || typeof value === 'undefined') return '—'
  if (Number.isInteger(value)) {
    return new Intl.NumberFormat('ru-RU').format(value)
  }
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatSample(value) {
  if (value === null || typeof value === 'undefined') return '—'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (err) {
      return '[object]'
    }
  }
  if (value === '') return 'пусто'
  return String(value)
}

function formatValue(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '—'
  return String(value)
}

function normalizeValue(value) {
  if (value === null || typeof value === 'undefined') return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (err) {
      return ''
    }
  }
  return String(value)
}

function humanizeKey(key = '') {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim()
    .replace(/^./, (char) => char.toUpperCase())
}

function aggregatorLabel(aggregator, field) {
  const agg = aggregatorOptions.find((opt) => opt.value === aggregator)
  const aggName = agg ? agg.label : aggregator
  const fieldLabel = field?.label || field?.key || 'поле'
  return `${aggName}: ${fieldLabel}`
}

function ensureMetricExists() {
  if (!pivotMetrics.length) {
    const firstNumericField = planFields.value.find((field) => field.type === 'number')
    const firstFieldKey = firstNumericField?.key || planFields.value[0]?.key || ''
    pivotMetrics.push(
      createMetric({
        fieldKey: firstFieldKey,
        aggregator: firstNumericField ? 'sum' : 'count',
      }),
    )
    pivotMetricsVersion.value += 1
  }
}

let metricCounter = 0
function createMetric(overrides = {}) {
  metricCounter += 1
  return {
    id: `metric-${metricCounter}`,
    fieldKey: overrides.fieldKey || '',
    aggregator: overrides.aggregator || 'count',
  }
}

function addMetric() {
  pivotMetrics.push(createMetric())
  pivotMetricsVersion.value += 1
}

function removeMetric(metricId) {
  if (pivotMetrics.length === 1) return
  const index = pivotMetrics.findIndex((metric) => metric.id === metricId)
  if (index >= 0) {
    pivotMetrics.splice(index, 1)
    pivotMetricsVersion.value += 1
  }
}

function loadSavedConfigs() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveCurrentConfig() {
  if (!configName.value.trim()) {
    alert('Укажите название конфигурации')
    return
  }
  if (!activeMetrics.value.length) {
    alert('Добавьте хотя бы одну метрику')
    return
  }
  const payload = snapshotCurrentConfig()
  const normalizedName = configName.value.trim()
  const existingIndex = savedConfigs.value.findIndex((cfg) => cfg.name === normalizedName)
  const entry = {
    id: existingIndex >= 0 ? savedConfigs.value[existingIndex].id : createId(),
    name: normalizedName,
    updatedAt: new Date().toISOString(),
    payload,
  }
  if (existingIndex >= 0) {
    savedConfigs.value.splice(existingIndex, 1, entry)
  } else {
    savedConfigs.value.push(entry)
  }
  selectedConfigId.value = entry.id
}

function snapshotCurrentConfig() {
  return {
    pivot: {
      filters: [...pivotConfig.filters],
      rows: [...pivotConfig.rows],
      columns: [...pivotConfig.columns],
    },
    metrics: pivotMetrics.map((metric) => ({ ...metric })),
    filterValues: Object.entries(filterValues).reduce((acc, [key, values]) => {
      acc[key] = [...values]
      return acc
    }, {}),
  }
}

function loadSelectedConfig() {
  const entry = savedConfigs.value.find((cfg) => cfg.id === selectedConfigId.value)
  if (!entry) return
  applyConfig(entry.payload)
}

function applyConfig(payload) {
  replaceArray(pivotConfig.filters, payload?.pivot?.filters || [])
  replaceArray(pivotConfig.rows, payload?.pivot?.rows || [])
  replaceArray(pivotConfig.columns, payload?.pivot?.columns || [])
  pivotMetrics.splice(0, pivotMetrics.length, ...(payload?.metrics || []).map((metric) => ({ ...metric })))
  pivotMetricsVersion.value += 1
  if (!pivotMetrics.length) ensureMetricExists()

  Object.keys(filterValues).forEach((key) => delete filterValues[key])
  Object.entries(payload?.filterValues || {}).forEach(([key, values]) => {
    filterValues[key] = [...values]
  })
}

function deleteSelectedConfig() {
  const index = savedConfigs.value.findIndex((cfg) => cfg.id === selectedConfigId.value)
  if (index >= 0) {
    savedConfigs.value.splice(index, 1)
    selectedConfigId.value = ''
  }
}

function replaceArray(target, next) {
  target.splice(0, target.length, ...next)
}

function exportToCsv() {
  if (!pivotView.value) {
    alert('Нет данных для экспорта')
    return
  }
  const csv = buildCsvFromPivot(pivotView.value)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pivot-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function buildCsvFromPivot(view) {
  const header = ['Строки', ...view.columns.map((col) => col.label), ...view.rowTotalHeaders.map((total) => total.label)]
  const rows = view.rows.map((row) => [
    row.label,
    ...row.cells.map((cell) => cell.display),
    ...row.totals.map((total) => total.display),
  ])
  const totalsRow = [
    'Итого по столбцам',
    ...view.columns.map((column) => column.totalDisplay),
    ...view.rowTotalHeaders.map((total) => view.grandTotals[total.metricId]),
  ]

  return [header, ...rows, totalsRow]
    .map((line) =>
      line
        .map((value) => {
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(';'),
    )
    .join('\n')
}

const FIELD_ALIASES = {
  name: 'Название плана',
  nameCls: 'Класс плана',
  nameClsWork: 'Класс работ',
  fullNameWork: 'Описание работ',
  fullNameObject: 'Объект',
  nameClsObject: 'Тип объекта',
  PlanDateEnd: 'Плановая дата окончания',
  CreatedAt: 'Создано',
  UpdatedAt: 'Обновлено',
  StartKm: 'Начальный километр',
  FinishKm: 'Конечный километр',
  StartPicket: 'Начальный пикет',
  FinishPicket: 'Конечный пикет',
  fullNameUser: 'Ответственный',
  nameLocationClsSection: 'Участок',
  id: 'ID записи',
  login: 'Логин',
  nameLocation: 'Локация',
  idIncident: 'Инцидент',
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `cfg-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
</script>

<style scoped>
.page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.step {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: var(--s360-radius-lg, 16px);
  background: var(--s360-color-surface, #fff);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.step--disabled {
  opacity: 0.55;
  pointer-events: none;
}
.step__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.step__badge {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--s360-color-primary, #2b6cb0);
  color: #fff;
  font-weight: 600;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step__status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--s360-text-success, #198754);
  font-weight: 600;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
  background: currentColor;
}
.dot--success {
  background: var(--s360-text-success, #198754);
}
.step__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}
.field__label {
  font-weight: 600;
  color: var(--s360-text-primary, #111827);
}
.field input,
.field select,
.config-block select,
.config-block input {
  border: 1px solid var(--s360-color-border-subtle, #d1d5db);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  background: var(--s360-color-surface, #fff);
  width: 100%;
}
.step__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}
.step__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.muted {
  color: var(--s360-text-muted, #6b7280);
  font-size: 13px;
}
.config-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.config-block {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.pivot-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.samples {
  flex: 1 1 260px;
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  background: var(--s360-color-panel, #f8fafc);
}
.samples ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.samples li {
  padding-bottom: 6px;
  border-bottom: 1px solid var(--s360-color-border-subtle, #f3f4f6);
  font-size: 13px;
}
.field-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.key-tag {
  font-size: 11px;
  color: #374151;
  background: var(--s360-color-neutral-soft, #e5e7eb);
  padding: 2px 6px;
  border-radius: 6px;
}
.field-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #4b5563;
  margin-bottom: 6px;
}
.field-meta code {
  background: #111827;
  color: #fff;
  border-radius: 6px;
  padding: 1px 6px;
  font-size: 12px;
}
.value-examples {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.meta-label {
  font-size: 12px;
  color: var(--s360-text-muted, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border-radius: 999px;
  border: 1px solid var(--s360-color-border-subtle, #d1d5db);
  padding: 2px 10px;
  font-size: 12px;
  background: var(--s360-color-surface, #fff);
}
.samples li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.pivot-grid {
  flex: 2 1 420px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.pivot-section {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  background: var(--s360-color-panel, #fdfdfd);
  display: flex;
  flex-direction: column;
  min-height: 280px;
}
.pivot-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.field-list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.metrics-panel {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
}
.metrics-panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}
.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.metric-row select {
  min-width: 180px;
  border: 1px solid var(--s360-color-border-subtle, #d1d5db);
  border-radius: 8px;
  padding: 8px;
  background: var(--s360-color-surface, #fff);
}
.metric-row .remove {
  border: 1px solid #f87171;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  background: #fef2f2;
  color: #b91c1c;
  cursor: pointer;
}
.filters-panel {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.filters-panel__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.filters-field {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 10px;
  padding: 10px;
}
.filter-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.filter-values {
  max-height: 180px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.filter-option {
  display: flex;
  align-items: center;
  gap: 6px;
}
.warning {
  border: 1px solid #f97316;
  border-radius: 10px;
  padding: 12px;
  color: #c2410c;
  background: #fff7ed;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pivot-preview {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  overflow: auto;
  background: var(--s360-color-surface, #fff);
}
.pivot-preview table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.pivot-preview th,
.pivot-preview td {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  padding: 8px;
  text-align: right;
}
.pivot-preview th:first-child,
.pivot-preview td:first-child {
  text-align: left;
}
.row-label {
  font-weight: 500;
}
.cell {
  min-width: 90px;
}
.total,
.grand-total {
  font-weight: 600;
}
.error {
  color: var(--s360-text-critical, #dc2626);
  font-size: 13px;
}
.result {
  border: 1px solid var(--s360-color-border-subtle, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  background: var(--s360-color-panel, #f9fafb);
}
.empty-state {
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  padding: 16px;
  background: var(--s360-color-panel, #f9fafb);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.empty-state h4 {
  margin: 0;
  font-size: 16px;
}
.empty-state__tips {
  margin: 0;
  padding-left: 18px;
  color: #4b5563;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.empty-state__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #4b5563;
}
.step__subheader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.viz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
details summary {
  cursor: pointer;
  margin-bottom: 8px;
}
@media (max-width: 768px) {
  .step__header {
    flex-direction: column;
  }
  .config-block {
    flex-direction: column;
    align-items: stretch;
  }
  .step__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
