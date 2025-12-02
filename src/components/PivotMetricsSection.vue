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

    <div class="metrics-list" v-if="metrics.length">
      <article v-for="(metric, index) in metrics" :key="metric.id" class="metric-card">
        <div class="metric-card__row">
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
        <label class="metric-field">
          <span>Название метрики</span>
          <n-input
            v-model:value="metric.title"
            placeholder="Например: Количество заявок"
          />
        </label>
        <div class="metric-settings">
          <n-checkbox v-model:checked="metric.enabled">Включена</n-checkbox>
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
import { NButton, NCheckbox, NInput, NSelect, NTooltip } from 'naive-ui'

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
})

defineEmits(['add', 'move', 'remove'])

const fieldOptions = computed(() =>
  props.fields.map((field) => ({
    label: props.getFieldLabel ? props.getFieldLabel(field.key) : field.label,
    value: field.key,
  })),
)
const aggregatorOptions = computed(() => props.aggregators)
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
</style>
