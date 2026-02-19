<template>
  <div class="kpi-card">
    <div class="kpi-card__label">{{ primaryLabel }}</div>
    <button
      class="kpi-card__value"
      :class="{ 'is-clickable': canDrill(primaryMetric) }"
      type="button"
      :disabled="!canDrill(primaryMetric)"
      @click="emitDrill(primaryMetric)"
    >
      {{ primaryDisplay }}
    </button>
    <div v-if="secondaryMetric || tertiaryMetric" class="kpi-card__meta">
      <div
        v-if="secondaryMetric"
        class="kpi-card__meta-item"
        :class="{ 'is-clickable': canDrill(secondaryMetric) }"
        :role="canDrill(secondaryMetric) ? 'button' : undefined"
        :tabindex="canDrill(secondaryMetric) ? 0 : -1"
        @click="emitDrill(secondaryMetric)"
        @keydown.enter.prevent="emitDrill(secondaryMetric)"
        @keydown.space.prevent="emitDrill(secondaryMetric)"
      >
        <span class="kpi-card__meta-label">{{ secondaryLabel }}</span>
        <span class="kpi-card__meta-value">{{ secondaryDisplay }}</span>
      </div>
      <div
        v-if="tertiaryMetric"
        class="kpi-card__meta-item"
        :class="{ 'is-clickable': canDrill(tertiaryMetric) }"
        :role="canDrill(tertiaryMetric) ? 'button' : undefined"
        :tabindex="canDrill(tertiaryMetric) ? 0 : -1"
        @click="emitDrill(tertiaryMetric)"
        @keydown.enter.prevent="emitDrill(tertiaryMetric)"
        @keydown.space.prevent="emitDrill(tertiaryMetric)"
      >
        <span class="kpi-card__meta-label">{{ tertiaryLabel }}</span>
        <span class="kpi-card__meta-value">{{ tertiaryDisplay }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  formatFormulaValue,
  formatNumber,
  formatValue,
} from '@/shared/lib/pivotUtils'

const props = defineProps({
  metrics: {
    type: Array,
    default: () => [],
  },
  grandTotals: {
    type: Object,
    default: () => ({}),
  },
  drilldownMetricIds: {
    type: Array,
    default: () => [],
  },
})
const emit = defineEmits(['drilldown'])

const enabledMetrics = computed(() =>
  (Array.isArray(props.metrics) ? props.metrics : []).filter(
    (metric) => metric && metric.enabled !== false,
  ),
)
const primaryMetric = computed(() => enabledMetrics.value[0] || null)
const secondaryMetric = computed(() => enabledMetrics.value[1] || null)
const tertiaryMetric = computed(() => enabledMetrics.value[2] || null)
const drilldownMetricSet = computed(
  () => new Set((props.drilldownMetricIds || []).map((value) => String(value))),
)

function metricLabel(metric) {
  if (!metric) return ''
  if (metric.type === 'formula') {
    const title = typeof metric.title === 'string' ? metric.title.trim() : ''
    if (title) return title
  }
  const sources = [
    metric.label,
    metric.title,
    metric.fieldLabel,
    metric.displayLabel,
    metric.fieldKey,
  ]
  for (const candidate of sources) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }
  return ''
}

function resolveMetricValue(metric) {
  if (!metric || !metric.id) return null
  const entry = props.grandTotals?.[metric.id]
  if (entry && typeof entry === 'object' && 'value' in entry) {
    return entry.value
  }
  return entry ?? null
}

function formatMetricValue(value, metric) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return '—'
  }
  if (!metric) return formatValue(value)
  const format = metric.outputFormat || 'auto'
  const precision = Number.isFinite(metric.precision)
    ? Number(metric.precision)
    : 2
  if (format && format !== 'auto') {
    return formatFormulaValue(value, format, precision)
  }
  if (metric.aggregator === 'value') {
    return formatValue(value)
  }
  return formatNumber(value, precision)
}

const primaryLabel = computed(
  () => metricLabel(primaryMetric.value) || 'Показатель',
)
const secondaryLabel = computed(
  () => metricLabel(secondaryMetric.value) || 'Показатель 2',
)
const tertiaryLabel = computed(
  () => metricLabel(tertiaryMetric.value) || 'Показатель 3',
)
const primaryDisplay = computed(() =>
  formatMetricValue(resolveMetricValue(primaryMetric.value), primaryMetric.value),
)
const secondaryDisplay = computed(() =>
  formatMetricValue(
    resolveMetricValue(secondaryMetric.value),
    secondaryMetric.value,
  ),
)
const tertiaryDisplay = computed(() =>
  formatMetricValue(
    resolveMetricValue(tertiaryMetric.value),
    tertiaryMetric.value,
  ),
)

function canDrill(metric) {
  if (!metric?.id) return false
  return drilldownMetricSet.value.has(String(metric.id))
}

function emitDrill(metric) {
  if (!canDrill(metric)) return
  emit('drilldown', metric)
}
</script>

<style scoped>
.kpi-card {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 160px;
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.06),
    inset 0 0 0 1px rgba(148, 163, 184, 0.12);
}
.kpi-card__label {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
}
.kpi-card__value {
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  font-size: clamp(28px, 5vw, 44px);
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}
.kpi-card__value.is-clickable {
  cursor: pointer;
}
.kpi-card__value.is-clickable:hover {
  color: #1d4ed8;
}
.kpi-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.kpi-card__meta-item {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 8px 12px;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kpi-card__meta-item.is-clickable {
  cursor: pointer;
  transition: box-shadow 0.16s ease;
}
.kpi-card__meta-item.is-clickable:hover {
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.35);
}
.kpi-card__meta-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748b;
}
.kpi-card__meta-value {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}
</style>
