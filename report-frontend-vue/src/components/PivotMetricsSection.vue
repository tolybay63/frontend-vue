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
          <div v-else class="metric-card__formula">
            <label class="metric-field">
              <span>Формула</span>
              <n-input
                v-model:value="metric.expression"
                type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="Например: {{metric-1}} / {{metric-2}}"
            />
          </label>
          <div v-if="metricTokens.length" class="formula-hints">
            <span>Доступные метрики:</span>
            <ul>
              <li v-for="token in metricTokens" :key="token.id">
                {{ token.label }} → <code>{{ formatToken(token.id) }}</code>
              </li>
            </ul>
          </div>
          <label class="metric-field">
            <span>Формат значения</span>
            <n-select
              v-model:value="metric.outputFormat"
              :options="formulaFormatOptions"
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
            </div>
          </div>
          <div
            v-if="formattingConfig(metric).type === 'dataBar'"
            class="formatting-options"
          >
            <label class="formatting-option">
              <span>Цвет гистограммы</span>
              <n-color-picker
                v-model:value="formattingConfig(metric).dataBar.color"
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
                  :modes="['hex']"
                  size="small"
                />
              </label>
              <label class="formatting-option">
                <span>Середина</span>
                <n-color-picker
                  v-model:value="formattingConfig(metric).colorScale.midColor"
                  :modes="['hex']"
                  size="small"
                />
              </label>
              <label class="formatting-option">
                <span>Максимум</span>
                <n-color-picker
                  v-model:value="formattingConfig(metric).colorScale.maxColor"
                  :modes="['hex']"
                  size="small"
                />
              </label>
            </div>
            <label class="slider-label">
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
            <label class="slider-label">
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
            <n-switch
              v-model:value="formattingConfig(metric).iconSet.reversed"
              size="small"
            >
              Инвертировать порядок
            </n-switch>
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
import { computed } from 'vue'
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
const iconSetOptions = Object.entries(ICON_SET_LIBRARY).map(
  ([value, meta]) => ({
    label: meta.label,
    value,
    preview: meta.icons.join(' '),
  }),
)
const formulaFormatOptions = [
  { label: 'Авто', value: 'auto' },
  { label: 'Число', value: 'number' },
  { label: 'Целое число', value: 'integer' },
  { label: 'Проценты', value: 'percent' },
  { label: 'Валюта (₽)', value: 'currency' },
  { label: 'Текст', value: 'text' },
]

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
  } else {
    metric.expression = ''
    if (!metric.aggregator || metric.aggregator === 'formula') {
      metric.aggregator = 'sum'
    }
    metric.outputFormat = 'auto'
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

function formattingConfig(metric) {
  const config = metric.conditionalFormatting
  if (
    !config ||
    !config.dataBar ||
    !config.colorScale ||
    !config.iconSet ||
    !config.type
  ) {
    metric.conditionalFormatting = normalizeConditionalFormatting(config)
  }
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
.formula-hints code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 11px;
  background: #f3f4f6;
  padding: 2px 4px;
  border-radius: 4px;
}
</style>
