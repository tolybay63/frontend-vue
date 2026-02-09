<template>
  <section class="pivot-card pivot-card--metrics">
    <header class="pivot-card__header">
      <div>
        <div class="pivot-card__title">Метрики</div>
        <p class="pivot-card__hint">
          Добавьте хотя бы одну метрику. Можно указать агрегат, название и
          включить/выключить отображение.
        </p>
      </div>
      <n-button quaternary size="small" @click="$emit('add')">
        + Добавить метрику
      </n-button>
    </header>

    <div v-if="metrics.length" class="metrics-list">
      <article
        v-for="(metric, index) in metrics"
        :key="metric.id"
        class="metric-card"
      >
        <div class="metric-card__header">
          <strong>Метрика {{ index + 1 }}</strong>
          <n-select
            v-model:value="metric.type"
            :options="metricTypeOptions"
            size="small"
            @update:value="(value) => switchMetricType(metric, value)"
          />
        </div>
        <div v-if="metric.type !== 'formula'" class="metric-card__row">
          <label class="metric-field">
            <span>Поле</span>
            <n-select
              v-model:value="metric.fieldKey"
              :options="fieldOptions"
              placeholder="Выберите поле"
              size="large"
            />
          </label>
          <label class="metric-field">
            <span>Агрегат</span>
            <n-select
              v-model:value="metric.aggregator"
              :options="aggregatorOptions"
              placeholder="Агрегация"
              size="large"
            />
          </label>
        </div>
        <div
          v-if="metric.type !== 'formula'"
          class="metric-card__row metric-card__row--format"
        >
          <label class="metric-field">
            <span>Формат значения</span>
            <n-select
              v-model:value="metric.outputFormat"
              :options="valueFormatOptions"
              size="large"
            />
          </label>
          <label
            v-if="isNumericFormat(metric.outputFormat)"
            class="metric-field"
          >
            <span>Знаков после запятой</span>
            <n-input-number
              v-model:value="metric.precision"
              :min="0"
              :max="6"
              size="large"
            />
          </label>
        </div>
        <div v-else class="metric-card__formula">
          <label class="metric-field">
            <span>Формула</span>
            <n-input
              :value="formulaDrafts[metric.id] ?? metric.expression ?? ''"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="Например: {{metric-1}} / {{metric-2}}"
              @update:value="(value) => setFormulaDraft(metric, value)"
              @blur="() => commitFormulaDraft(metric)"
            />
          </label>
          <div v-if="metricTokens.length" class="formula-hints">
            <span>Доступные токены:</span>
            <ul>
              <li v-for="token in metricTokens" :key="token.id">
                {{ token.label }} → <code>{{ formatToken(token.id) }}</code>
              </li>
            </ul>
          </div>
          <div class="formula-quick">
            <label class="metric-field">
              <span>Быстрая доля</span>
              <div class="formula-quick__row">
                <n-select
                  :value="shareDraft(metric).baseId"
                  :options="shareMetricOptions"
                  placeholder="Метрика"
                  size="small"
                  :reset-menu-on-options-change="false"
                  class="formula-quick__select"
                  @update:value="(value) => updateShareDraft(metric, { baseId: value })"
                />
                <n-select
                  :value="shareDraft(metric).scope"
                  :options="shareScopeOptions"
                  placeholder="Основа"
                  size="small"
                  :reset-menu-on-options-change="false"
                  class="formula-quick__select"
                  @update:value="(value) => updateShareDraft(metric, { scope: value })"
                />
                <n-button size="small" @click="applyShareTemplate(metric)">
                  Применить
                </n-button>
              </div>
              <small class="metric-hint">
                Автоматически создаёт долю по строке, столбцу или общему итогу.
              </small>
            </label>
          </div>
          <label class="metric-field">
            <span>Формат значения</span>
            <n-select
              v-model:value="metric.outputFormat"
              :options="valueFormatOptions"
              size="large"
            />
          </label>
          <label
            v-if="isNumericFormat(metric.outputFormat)"
            class="metric-field"
          >
            <span>Знаков после запятой</span>
            <n-input-number
              v-model:value="metric.precision"
              :min="0"
              :max="6"
              size="large"
            />
          </label>
        </div>
        <label class="metric-field">
          <span>Название метрики</span>
          <n-input
            v-model:value="metric.title"
            placeholder="Например: Количество заявок"
          />
        </label>
        <label class="metric-field">
          <span>Поля детализации</span>
          <n-select
            v-model:value="metric.detailFields"
            multiple
            filterable
            clearable
            :options="detailFieldOptions"
            placeholder="Выберите поля для расшифровки"
            size="large"
          />
          <small class="metric-hint">
            Эти поля будут показаны при раскрытии значения.
          </small>
        </label>
        <label v-if="metric.type !== 'formula'" class="metric-field">
          <span>Фильтр детализации</span>
          <n-select
            :value="getDetailFilter(metric).mode"
            :options="detailFilterOptions"
            size="large"
            @update:value="(value) => updateDetailFilter(metric, { mode: value })"
          />
          <small class="metric-hint">
            Ограничивает записи в детализации по полю метрики.
          </small>
        </label>
        <div
          v-if="metric.type !== 'formula' && getDetailFilter(metric).mode === 'custom'"
          class="metric-field metric-detail-filter"
        >
          <span>Условие</span>
          <div class="metric-detail-filter__row">
            <n-select
              :value="getDetailFilter(metric).op"
              :options="detailFilterOperatorOptions"
              size="large"
              class="metric-detail-filter__operator"
              @update:value="
                (value) => updateDetailFilter(metric, { op: value })
              "
            />
            <n-input
              :value="getDetailFilter(metric).value"
              placeholder="Значение"
              size="large"
              @update:value="
                (value) => updateDetailFilter(metric, { value })
              "
            />
          </div>
        </div>
        <div class="metric-settings">
          <n-checkbox v-model:checked="metric.enabled">
            Показывать в таблице
          </n-checkbox>
          <n-checkbox v-model:checked="metric.showRowTotals">
            Итоги по строкам
          </n-checkbox>
          <n-checkbox v-model:checked="metric.showColumnTotals">
            Итоги по столбцам
          </n-checkbox>
        </div>
        <div class="metric-formatting">
          <div class="metric-formatting__header">
            <span>Условное форматирование</span>
            <div class="metric-formatting__controls">
              <n-select
                v-model:value="formattingConfig(metric).type"
                :options="formattingTypeOptions"
                size="small"
                class="formatting-type-select"
              />
              <span
                v-if="formattingConfig(metric).type === 'iconSet'"
                class="metric-formatting__preview"
              >
                {{ iconSetPreview(metric) }}
              </span>
              <button
                v-if="formattingConfig(metric).type !== 'none'"
                type="button"
                class="formatting-help__toggle"
                @click="toggleFormattingHelp(metric)"
              >
                ?
              </button>
            </div>
          </div>
          <div
            v-if="formattingConfig(metric).type === 'dataBar'"
            class="formatting-options"
          >
            <label class="formatting-option">
              <span>Режим шкалы</span>
              <n-select
                v-model:value="formattingConfig(metric).scale.mode"
                :options="scaleModeOptions"
                size="small"
              />
            </label>
            <div
              v-if="formattingConfig(metric).scale.mode === 'absolute'"
              class="formatting-range"
            >
              <label class="formatting-option">
                <span>Минимум</span>
                <n-input-number
                  v-model:value="formattingConfig(metric).scale.min"
                  size="small"
                  placeholder="Мин"
                />
              </label>
              <label class="formatting-option">
                <span>Максимум</span>
                <n-input-number
                  v-model:value="formattingConfig(metric).scale.max"
                  size="small"
                  placeholder="Макс"
                />
              </label>
            </div>
            <label class="formatting-option">
              <span>Цвет гистограммы</span>
              <n-color-picker
                v-model:value="formattingConfig(metric).dataBar.color"
                :show-alpha="false"
                :modes="['hex']"
                size="small"
              />
            </label>
            <n-switch
              v-model:value="formattingConfig(metric).dataBar.showValue"
              size="small"
            >
              Показывать значение поверх заливки
            </n-switch>
          </div>
          <div
            v-else-if="formattingConfig(metric).type === 'colorScale'"
            class="formatting-options formatting-options--colors"
          >
            <div class="color-pickers">
              <label class="formatting-option">
                <span>Минимум</span>
                <n-color-picker
                  v-model:value="formattingConfig(metric).colorScale.minColor"
                  :show-alpha="false"
                  :modes="['hex']"
                  size="small"
                />
              </label>
              <label class="formatting-option">
                <span>Середина</span>
                <n-color-picker
                  v-model:value="formattingConfig(metric).colorScale.midColor"
                  :show-alpha="false"
                  :modes="['hex']"
                  size="small"
                />
              </label>
              <label class="formatting-option">
                <span>Максимум</span>
                <n-color-picker
                  v-model:value="formattingConfig(metric).colorScale.maxColor"
                  :show-alpha="false"
                  :modes="['hex']"
                  size="small"
                />
              </label>
            </div>
            <label class="formatting-option">
              <span>Режим шкалы</span>
              <n-select
                v-model:value="formattingConfig(metric).scale.mode"
                :options="scaleModeOptions"
                size="small"
              />
            </label>
            <div
              v-if="formattingConfig(metric).scale.mode === 'absolute'"
              class="formatting-range"
            >
              <label class="formatting-option">
                <span>Минимум</span>
                <n-input-number
                  v-model:value="formattingConfig(metric).scale.min"
                  size="small"
                  placeholder="Мин"
                />
              </label>
              <label class="formatting-option">
                <span>Середина</span>
                <n-input-number
                  v-model:value="formattingConfig(metric).colorScale.midValue"
                  size="small"
                  placeholder="Середина"
                />
              </label>
              <label class="formatting-option">
                <span>Максимум</span>
                <n-input-number
                  v-model:value="formattingConfig(metric).scale.max"
                  size="small"
                  placeholder="Макс"
                />
              </label>
            </div>
            <label
              v-else
              class="slider-label"
            >
              <span>
                Положение середины —
                {{
                  Math.round(formattingConfig(metric).colorScale.midpoint * 100)
                }}%
              </span>
              <n-slider
                :value="
                  Math.round(formattingConfig(metric).colorScale.midpoint * 100)
                "
                :min="5"
                :max="95"
                :step="1"
                @update:value="(value) => updateColorScaleMidpoint(metric, value)"
              />
            </label>
          </div>
          <div
            v-else-if="formattingConfig(metric).type === 'iconSet'"
            class="formatting-options"
          >
            <label class="formatting-option">
              <span>Режим шкалы</span>
              <n-select
                v-model:value="formattingConfig(metric).scale.mode"
                :options="scaleModeOptions"
                size="small"
              />
            </label>
            <div
              v-if="formattingConfig(metric).scale.mode === 'absolute'"
              class="formatting-range"
            >
              <label class="formatting-option">
                <span>Минимум</span>
                <n-input-number
                  v-model:value="formattingConfig(metric).scale.min"
                  size="small"
                  placeholder="Мин"
                />
              </label>
              <label class="formatting-option">
                <span>Максимум</span>
                <n-input-number
                  v-model:value="formattingConfig(metric).scale.max"
                  size="small"
                  placeholder="Макс"
                />
              </label>
            </div>
            <label class="formatting-option">
              <span>Набор значков</span>
              <n-select
                v-model:value="formattingConfig(metric).iconSet.style"
                :options="iconSetOptions"
                size="small"
                class="icon-set-select"
              >
                <template #option="{ option }">
                  <div class="icon-option">
                    <span>{{ option.label }}</span>
                    <span class="icon-option__preview">
                      {{ option.preview }}
                    </span>
                  </div>
                </template>
              </n-select>
            </label>
            <label
              v-if="useIconThresholdSlider(metric)"
              class="slider-label"
            >
              <span>Границы уровней</span>
              <n-slider
                :value="iconThresholdSlider(metric)"
                range
                :step="1"
                :min="5"
                :max="95"
                @update:value="(value) => updateIconThresholdSlider(metric, value)"
              />
            </label>
            <div
              v-else
              class="formatting-thresholds"
            >
              <label
                v-for="(threshold, idx) in iconThresholdInputs(metric)"
                :key="`threshold-${metric.id}-${idx}`"
                class="formatting-option"
              >
                <span>
                  Граница {{ idx + 1 }}
                  {{ formattingConfig(metric).scale.mode === 'absolute' ? '' : ' (%)' }}
                </span>
                <n-input-number
                  :value="threshold"
                  size="small"
                  @update:value="(value) => updateIconThresholdInput(metric, idx, value)"
                />
              </label>
            </div>
            <n-switch
              v-model:value="formattingConfig(metric).iconSet.reversed"
              size="small"
            >
              Инвертировать порядок
            </n-switch>
          </div>
          <div
            v-if="isFormattingHelpOpen(metric) && formattingHelp(metric).lines.length"
            class="formatting-help"
          >
            <p
              v-for="(line, idx) in formattingHelp(metric).lines"
              :key="`help-${metric.id}-${idx}`"
            >
              {{ line }}
            </p>
            <code v-if="formattingHelp(metric).formula">
              {{ formattingHelp(metric).formula }}
            </code>
          </div>
        </div>
        <div class="metric-actions">
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button
                quaternary
                circle
                size="small"
                :disabled="index === 0"
                @click="$emit('move', { index, delta: -1 })"
              >
                ↑
              </n-button>
            </template>
            Выше
          </n-tooltip>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button
                quaternary
                circle
                size="small"
                :disabled="index === metrics.length - 1"
                @click="$emit('move', { index, delta: 1 })"
              >
                ↓
              </n-button>
            </template>
            Ниже
          </n-tooltip>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button
                quaternary
                circle
                size="small"
                :disabled="metrics.length === 1"
                @click="$emit('remove', metric.id)"
              >
                ×
              </n-button>
            </template>
            Удалить
          </n-tooltip>
        </div>
      </article>
    </div>
    <p v-else class="pivot-card__empty">
      Метрики ещё не добавлены. Нажмите «Добавить метрику», чтобы начать.
    </p>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, watch } from 'vue'
import {
  NButton,
  NCheckbox,
  NColorPicker,
  NInput,
  NInputNumber,
  NSelect,
  NSlider,
  NSwitch,
  NTooltip,
} from 'naive-ui'
import {
  ICON_SET_LIBRARY,
  normalizeConditionalFormatting,
} from '@/shared/lib/conditionalFormatting'

const props = defineProps({
  metrics: {
    type: Array,
    default: () => [],
  },
  fields: {
    type: Array,
    default: () => [],
  },
  aggregators: {
    type: Array,
    default: () => [],
  },
  getFieldLabel: {
    type: Function,
    default: null,
  },
  metricTokens: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['add', 'move', 'remove'])

const fieldOptions = computed(() =>
  props.fields.map((field) => ({
    label: props.getFieldLabel ? props.getFieldLabel(field.key) : field.label,
    value: field.key,
  })),
)
const detailFieldOptions = computed(() => {
  const options = []
  const seen = new Set()
  const labelFor = (key, fallbackLabel) =>
    props.getFieldLabel ? props.getFieldLabel(key) : fallbackLabel || key
  props.fields.forEach((field) => {
    if (!field?.key) return
    const baseLabel = labelFor(field.key, field.label)
    if (!seen.has(field.key)) {
      seen.add(field.key)
      options.push({ label: baseLabel, value: field.key })
    }
    if (Array.isArray(field.dateParts)) {
      field.dateParts.forEach((part) => {
        if (!part?.key || seen.has(part.key)) return
        seen.add(part.key)
        options.push({
          label: labelFor(part.key, part.label || baseLabel),
          value: part.key,
        })
      })
    }
  })
  return options
})
const aggregatorOptions = computed(() => props.aggregators)
const metricTokens = computed(() => props.metricTokens || [])
const metricTypeOptions = [
  { label: 'Поле источника', value: 'base' },
  { label: 'Формула', value: 'formula' },
]
const formattingTypeOptions = [
  { label: 'Нет', value: 'none' },
  { label: 'Гистограмма', value: 'dataBar' },
  { label: 'Цветовая шкала', value: 'colorScale' },
  { label: 'Набор значков', value: 'iconSet' },
]
const scaleModeOptions = [
  { label: 'Относительная (по данным)', value: 'relative' },
  { label: 'Абсолютная (фиксированные границы)', value: 'absolute' },
]
const iconSetOptions = Object.entries(ICON_SET_LIBRARY).map(
  ([value, meta]) => ({
    label: meta.label,
    value,
    preview: meta.icons.join(' '),
  }),
)
const valueFormatOptions = [
  { label: 'Авто', value: 'auto' },
  { label: 'Число', value: 'number' },
  { label: 'Целое число', value: 'integer' },
  { label: 'Проценты', value: 'percent' },
  { label: 'Валюта (₽)', value: 'currency' },
  { label: 'Текст', value: 'text' },
]
const detailFilterOptions = [
  { label: 'Нет', value: 'none' },
  { label: 'Флаг = 1', value: 'flag' },
  { label: 'Не пусто', value: 'not_empty' },
  { label: '> 0', value: 'gt0' },
  { label: '>= 1', value: 'gte1' },
  { label: 'Кастом', value: 'custom' },
]
const detailFilterOperatorOptions = [
  { label: '=', value: 'eq' },
  { label: '!=', value: 'ne' },
  { label: '>', value: 'gt' },
  { label: '>=', value: 'gte' },
  { label: '<', value: 'lt' },
  { label: '<=', value: 'lte' },
]
const SHARE_TOKEN_PREFIXES = [
  'row_total:',
  'column_total:',
  'grand_total:',
]
const shareMetricOptions = computed(() =>
  metricTokens.value
    .filter((token) =>
      SHARE_TOKEN_PREFIXES.every((prefix) => !token.id.startsWith(prefix)),
    )
    .map((token) => ({ label: token.label, value: token.id })),
)
const shareScopeOptions = [
  { label: 'По строке', value: 'row' },
  { label: 'По столбцу', value: 'column' },
  { label: 'От итога', value: 'grand' },
]

const formulaDrafts = reactive({})
const shareDrafts = reactive({})
const formattingHelpOpen = reactive({})
const formulaTimers = new Map()
const FORMULA_INPUT_DEBOUNCE_MS = 250

function setFormulaDraft(metric, value) {
  if (!metric?.id) return
  const id = String(metric.id)
  formulaDrafts[id] = value
  if (formulaTimers.has(id)) {
    clearTimeout(formulaTimers.get(id))
  }
  const timer = setTimeout(() => {
    if (metric.expression !== value) {
      metric.expression = value
    }
    formulaTimers.delete(id)
  }, FORMULA_INPUT_DEBOUNCE_MS)
  formulaTimers.set(id, timer)
}

function commitFormulaDraft(metric) {
  if (!metric?.id) return
  const id = String(metric.id)
  const value = formulaDrafts[id] ?? ''
  if (metric.expression !== value) {
    metric.expression = value
  }
  if (formulaTimers.has(id)) {
    clearTimeout(formulaTimers.get(id))
    formulaTimers.delete(id)
  }
}

function shareDraft(metric) {
  if (!metric?.id) return { baseId: '', scope: 'row' }
  const id = String(metric.id)
  if (!shareDrafts[id]) {
    shareDrafts[id] = { baseId: '', scope: 'row' }
  }
  return shareDrafts[id]
}

function updateShareDraft(metric, patch = {}) {
  if (!metric?.id) return
  const id = String(metric.id)
  if (!shareDrafts[id]) {
    shareDrafts[id] = { baseId: '', scope: 'row' }
  }
  shareDrafts[id] = { ...shareDrafts[id], ...patch }
}

function applyShareTemplate(metric) {
  if (!metric?.id) return
  const draft = shareDraft(metric)
  const baseId =
    draft.baseId || shareMetricOptions.value[0]?.value || ''
  if (!baseId) return
  const scope = draft.scope || 'row'
  const scopeToken =
    scope === 'column'
      ? `column_total:${baseId}`
      : scope === 'grand'
        ? `grand_total:${baseId}`
        : `row_total:${baseId}`
  const expression = `{{${baseId}}} / {{${scopeToken}}}`
  const id = String(metric.id)
  metric.expression = expression
  formulaDrafts[id] = expression
  if (formulaTimers.has(id)) {
    clearTimeout(formulaTimers.get(id))
    formulaTimers.delete(id)
  }
  metric.outputFormat = 'percent'
  if (!Number.isFinite(metric.precision)) {
    metric.precision = 2
  }
  if (!metric.title || !metric.title.trim()) {
    const baseLabel =
      shareMetricOptions.value.find((option) => option.value === baseId)
        ?.label || baseId
    const scopeLabel =
      scope === 'column'
        ? 'по столбцу'
        : scope === 'grand'
          ? 'от итога'
          : 'по строке'
    metric.title = `Доля ${scopeLabel} — ${baseLabel}`
  }
}

function switchMetricType(metric, nextType) {
  const next = nextType === 'formula' ? 'formula' : 'base'
  metric.type = next
  if (next === 'formula') {
    metric.fieldKey = ''
    metric.expression = metric.expression || ''
    metric.outputFormat = metric.outputFormat || 'number'
    if (!Number.isFinite(metric.precision)) {
      metric.precision = 2
    }
    if (metric.id) {
      const id = String(metric.id)
      if (!(id in formulaDrafts)) {
        formulaDrafts[id] = metric.expression || ''
      }
    }
  } else {
    metric.expression = ''
    if (!metric.aggregator || metric.aggregator === 'formula') {
      metric.aggregator = 'sum'
    }
    metric.outputFormat = 'auto'
    if (metric.id) {
      const id = String(metric.id)
      if (id in formulaDrafts) {
        delete formulaDrafts[id]
      }
      if (formulaTimers.has(id)) {
        clearTimeout(formulaTimers.get(id))
        formulaTimers.delete(id)
      }
    }
  }
}

function formatToken(id) {
  return `{{${id}}}`
}

function isNumericFormat(format) {
  return (
    !format ||
    format === 'auto' ||
    format === 'number' ||
    format === 'integer' ||
    format === 'percent' ||
    format === 'currency'
  )
}

function normalizeDetailFilter(value = null) {
  const safe = value && typeof value === 'object' ? value : {}
  const mode = detailFilterOptions.some((option) => option.value === safe.mode)
    ? safe.mode
    : 'none'
  const op = detailFilterOperatorOptions.some(
    (option) => option.value === safe.op,
  )
    ? safe.op
    : 'eq'
  const rawValue =
    safe.value === null || typeof safe.value === 'undefined' ? '' : safe.value
  return { mode, op, value: rawValue }
}

function getDetailFilter(metric) {
  return normalizeDetailFilter(metric?.detailFilter)
}

function updateDetailFilter(metric, patch = {}) {
  if (!metric) return
  const current =
    metric.detailFilter && typeof metric.detailFilter === 'object'
      ? metric.detailFilter
      : {}
  metric.detailFilter = normalizeDetailFilter({ ...current, ...patch })
}

watch(
  () => props.metrics,
  (list) => {
    if (!Array.isArray(list)) return
    const activeIds = new Set()
    list.forEach((metric) => {
      if (!Array.isArray(metric.detailFields)) {
        metric.detailFields = []
      }
      if (metric.type === 'formula' && metric.id) {
        const id = String(metric.id)
        activeIds.add(id)
        const draft = formulaDrafts[id]
        const next = metric.expression || ''
        if (typeof draft === 'undefined' || (!formulaTimers.has(id) && draft !== next)) {
          formulaDrafts[id] = next
        }
      }
    })
    Object.keys(formulaDrafts).forEach((id) => {
      if (!activeIds.has(id)) {
        delete formulaDrafts[id]
      }
    })
    Object.keys(shareDrafts).forEach((id) => {
      if (!activeIds.has(id)) {
        delete shareDrafts[id]
      }
    })
  },
  { deep: true, immediate: true },
)

onBeforeUnmount(() => {
  formulaTimers.forEach((timer) => clearTimeout(timer))
  formulaTimers.clear()
})

function formattingConfig(metric) {
  const config = metric.conditionalFormatting
  if (
    !config ||
    !config.dataBar ||
    !config.colorScale ||
    !config.iconSet ||
    !config.scale ||
    !config.type
  ) {
    metric.conditionalFormatting = normalizeConditionalFormatting(config)
  }
  ensureIconThresholds(metric.conditionalFormatting)
  return metric.conditionalFormatting
}

function iconSetPreview(metric) {
  const config = formattingConfig(metric)
  const library =
    ICON_SET_LIBRARY[config.iconSet.style] || ICON_SET_LIBRARY.arrows
  return library.icons.join(' ')
}

function iconThresholdSlider(metric) {
  const config = formattingConfig(metric)
  const [first, second] = config.iconSet.thresholds || [0.33, 0.66]
  return [Math.round(first * 100), Math.round(second * 100)]
}

function updateIconThresholdSlider(metric, value) {
  if (!Array.isArray(value) || value.length !== 2) return
  const [left, right] = [...value].sort((a, b) => a - b)
  formattingConfig(metric).iconSet.thresholds = [
    clampThreshold(left / 100),
    clampThreshold(right / 100),
  ]
}

function updateColorScaleMidpoint(metric, value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return
  formattingConfig(metric).colorScale.midpoint = clamp01(numeric / 100)
}

function clampThreshold(value) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return 0.5
  return Math.min(Math.max(numeric, 0.05), 0.95)
}

function clamp01(value) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return 0.5
  return Math.min(Math.max(numeric, 0), 1)
}

function iconSetLevels(style) {
  const library = ICON_SET_LIBRARY[style] || ICON_SET_LIBRARY.arrows
  return Array.isArray(library?.icons) ? library.icons.length : 3
}

function defaultIconThresholds(count) {
  if (count >= 3) return [0.25, 0.5, 0.75].slice(0, count)
  return [0.33, 0.66].slice(0, count)
}

function ensureIconThresholds(config) {
  if (!config?.iconSet) return
  const needed = Math.max(iconSetLevels(config.iconSet.style) - 1, 1)
  if (
    !Array.isArray(config.iconSet.thresholds) ||
    config.iconSet.thresholds.length !== needed
  ) {
    config.iconSet.thresholds = defaultIconThresholds(needed)
  }
}

function useIconThresholdSlider(metric) {
  const config = formattingConfig(metric)
  return config.scale.mode !== 'absolute' && iconSetLevels(config.iconSet.style) === 3
}

function iconThresholdInputs(metric) {
  const config = formattingConfig(metric)
  const thresholds = config.iconSet.thresholds || []
  if (config.scale.mode === 'absolute') {
    const min = Number(config.scale.min)
    const max = Number(config.scale.max)
    const span = max - min
    const shouldMap =
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      Math.abs(span) > 1 &&
      thresholds.every((value) => value >= 0 && value <= 1)
    if (shouldMap) {
      return thresholds.map((value) => roundThreshold(min + value * span))
    }
    return thresholds.map((value) => roundThreshold(value))
  }
  return thresholds.map((value) =>
    Number.isFinite(value) ? Math.round(value * 100) : null,
  )
}

function updateIconThresholdInput(metric, index, rawValue) {
  const config = formattingConfig(metric)
  const numeric = Number(rawValue)
  if (!Number.isFinite(numeric)) return
  const next = Array.isArray(config.iconSet.thresholds)
    ? [...config.iconSet.thresholds]
    : []
  if (config.scale.mode === 'absolute') {
    next[index] = numeric
  } else {
    next[index] = clampThreshold(numeric / 100)
  }
  config.iconSet.thresholds = next
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)
}

function roundThreshold(value) {
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

function toggleFormattingHelp(metric) {
  if (!metric?.id) return
  const id = String(metric.id)
  formattingHelpOpen[id] = !formattingHelpOpen[id]
}

function isFormattingHelpOpen(metric) {
  if (!metric?.id) return false
  return Boolean(formattingHelpOpen[String(metric.id)])
}

function formattingHelp(metric) {
  const config = formattingConfig(metric)
  const mode = config.scale.mode
  if (config.type === 'dataBar') {
    return {
      lines: [
        mode === 'absolute'
          ? 'Абсолютный режим: длина полосы считается по заданным Мин/Макс.'
          : 'Относительный режим: мин/макс берутся из текущих данных (после фильтров).',
        'Значения ниже минимума и выше максимума прижимаются к краям шкалы.',
      ],
      formula:
        'доля = (значение − min) / (max − min)',
    }
  }
  if (config.type === 'iconSet') {
    return {
      lines: [
        mode === 'absolute'
          ? 'Абсолютный режим: границы задаются в тех же единицах, что и данные.'
          : 'Относительный режим: границы на ползунке — проценты между min и max.',
        'Ниже первой границы — 1-й значок, между границами — следующие уровни.',
        'Для 4 уровней нужно 3 границы, для 3 уровней — 2 границы.',
        'Если меньшие значения лучше — включите «Инвертировать порядок».',
      ],
      formula:
        mode === 'absolute'
          ? ''
          : '% = (значение − min) / (max − min) × 100%',
    }
  }
  if (config.type === 'colorScale') {
    return {
      lines: [
        mode === 'absolute'
          ? 'Абсолютный режим: используйте числовые Мин/Макс и (опционально) Середину.'
          : 'Относительный режим: цвета распределяются между min и max текущих данных.',
        mode === 'absolute'
          ? 'Середина — это значение, в котором цвет переходит от жёлтого к зелёному.'
          : 'Ползунок «Положение середины» задаёт процент позиции между min и max.',
        'Значения вне диапазона прижимаются к краям шкалы.',
      ],
      formula:
        mode === 'absolute'
          ? ''
          : '% = (значение − min) / (max − min) × 100%',
    }
  }
  return { lines: [], formula: '' }
}
</script>

<style scoped>
.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.metric-card {
  border: 1px solid #e0e7ff;
  border-radius: 14px;
  padding: 16px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.metric-card__row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.metric-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.metric-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 200px;
  font-size: 13px;
}
.metric-settings {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
}
.metric-formatting {
  border-top: 1px dashed #d1d5db;
  margin-top: 4px;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.metric-formatting__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.metric-formatting__controls {
  display: flex;
  gap: 12px;
  align-items: center;
}
.metric-formatting__preview {
  font-size: 13px;
  color: #6b7280;
  letter-spacing: 2px;
}
.formatting-help__toggle {
  border: 1px solid #cbd5f5;
  background: #eef2ff;
  color: #4338ca;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-weight: 600;
  cursor: pointer;
}
.formatting-help__toggle:hover {
  background: #e0e7ff;
}
.formatting-type-select {
  min-width: 200px;
}
.icon-set-select {
  min-width: 220px;
}
.formatting-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}
.formatting-options--colors .color-pickers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}
.formatting-range {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.formatting-thresholds {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.formatting-option {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.slider-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.formatting-help {
  border: 1px dashed #cbd5f5;
  background: #f8fafc;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  color: #475569;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.formatting-help code {
  display: inline-block;
  background: #eef2ff;
  color: #4338ca;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 12px;
}
.icon-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.icon-option__preview {
  font-size: 14px;
  color: #6b7280;
  letter-spacing: 2px;
}
.metric-actions {
  display: flex;
  gap: 8px;
}
.metric-card__formula {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.metric-hint {
  font-size: 12px;
  color: #6b7280;
}
.metric-detail-filter__row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.metric-detail-filter__operator {
  min-width: 90px;
}
.formula-hints {
  font-size: 12px;
  background: #fff;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
  color: #374151;
}
.formula-hints ul {
  margin: 4px 0 0;
  padding-left: 16px;
}
.formula-quick {
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  padding: 10px;
  background: #fff;
}
.formula-quick__row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.formula-quick__select {
  min-width: 160px;
  flex: 1;
}
.formula-hints code {
  font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
  font-size: 11px;
  background: #f3f4f6;
  padding: 2px 4px;
  border-radius: 4px;
}
</style>
