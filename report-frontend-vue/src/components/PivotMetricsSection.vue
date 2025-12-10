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
  NInput,
  NInputNumber,
  NSelect,
  NTooltip,
} from 'naive-ui'

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
