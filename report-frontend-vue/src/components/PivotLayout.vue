<template>
  <div class="pivot-layout">
    <div class="pivot-layout__row">
      <div class="pivot-layout__cell">
        <PivotSection
          title="Строки"
          section="rows"
          hint="Выберите поля, которые будут группировать данные по вертикали."
          :fields="fields"
          :model-value="rows"
          :header-overrides="headerOverrides"
          :value-store="rowValueFilters"
          :value-options-resolver="valueOptionsResolver"
          :sort-state="rowSorts"
          :allow-metric-sort="true"
          :get-field-label="getFieldLabel"
          @update:model-value="$emit('update:rows', $event)"
          @rename="$emit('rename-field', $event)"
          @update-filter-values="$emit('update-row-values', $event)"
          @update-sort="$emit('update-row-sort', $event)"
        />
      </div>
      <div class="pivot-layout__cell">
        <PivotSection
          title="Столбцы"
          section="columns"
          hint="Эти поля развернутся в заголовках таблицы."
          :fields="fields"
          :model-value="columns"
          :header-overrides="headerOverrides"
          :value-store="columnValueFilters"
          :value-options-resolver="valueOptionsResolver"
          :sort-state="columnSorts"
          :allow-metric-sort="true"
          :get-field-label="getFieldLabel"
          @update:model-value="$emit('update:columns', $event)"
          @rename="$emit('rename-field', $event)"
          @update-filter-values="$emit('update-column-values', $event)"
          @update-sort="$emit('update-column-sort', $event)"
        />
      </div>
    </div>
    <div class="pivot-layout__row">
      <div class="pivot-layout__cell">
        <PivotSection
          title="Фильтры таблицы"
          section="filters"
          hint="Эти поля позволят ограничивать набор данных."
          :fields="fields"
          :model-value="filters"
          :header-overrides="headerOverrides"
          :value-store="filterValues"
          :value-options-resolver="valueOptionsResolver"
          :sort-state="filterSorts"
          :allow-metric-sort="false"
          :get-field-label="getFieldLabel"
          @update:model-value="$emit('update:filters', $event)"
          @rename="$emit('rename-field', $event)"
          @update-filter-values="$emit('update-filter-values', $event)"
          @update-sort="$emit('update-filter-sort', $event)"
        />
      </div>
      <div class="pivot-layout__cell">
        <PivotMetricsSection
          :metrics="metrics"
          :fields="fields"
          :aggregators="aggregatorOptions"
          :get-field-label="getFieldLabel"
          :metric-tokens="metricTokens"
          @add="$emit('add-metric')"
          @move="$emit('move-metric', $event)"
          @remove="$emit('remove-metric', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import PivotSection from './PivotSection.vue'
import PivotMetricsSection from './PivotMetricsSection.vue'

defineProps({
  fields: {
    type: Array,
    default: () => [],
  },
  rows: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    default: () => [],
  },
  filters: {
    type: Array,
    default: () => [],
  },
  metrics: {
    type: Array,
    default: () => [],
  },
  headerOverrides: {
    type: Object,
    default: () => ({}),
  },
  filterValues: {
    type: Object,
    default: () => ({}),
  },
  rowValueFilters: {
    type: Object,
    default: () => ({}),
  },
  columnValueFilters: {
    type: Object,
    default: () => ({}),
  },
  rowSorts: {
    type: Object,
    default: () => ({}),
  },
  columnSorts: {
    type: Object,
    default: () => ({}),
  },
  filterSorts: {
    type: Object,
    default: () => ({}),
  },
  valueOptionsResolver: {
    type: Function,
    default: () => [],
  },
  getFieldLabel: {
    type: Function,
    default: null,
  },
  aggregatorOptions: {
    type: Array,
    default: () => [],
  },
  metricTokens: {
    type: Array,
    default: () => [],
  },
})

defineEmits([
  'update:rows',
  'update:columns',
  'update:filters',
  'rename-field',
  'update-filter-values',
  'update-row-values',
  'update-column-values',
  'update-row-sort',
  'update-column-sort',
  'update-filter-sort',
  'add-metric',
  'move-metric',
  'remove-metric',
])
</script>

<style scoped>
.pivot-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.pivot-layout__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(320px, 1fr));
  gap: 20px;
}
.pivot-layout__cell {
  height: 100%;
}
.pivot-layout__cell :deep(.pivot-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}
@media (max-width: 960px) {
  .pivot-layout__row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
