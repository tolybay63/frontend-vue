<template>
  <section class="nsi-diagnostics">
    <header class="nsi-diagnostics__header">
      <div>
        <h2 class="nsi-diagnostics__title">{{ title }}</h2>
        <p class="nsi-diagnostics__description">{{ description }}</p>
      </div>
      <NTooltip v-if="partial" placement="top">
        <template #trigger>
          <span class="nsi-diagnostics__status">{{ partialLabel }}</span>
        </template>
        <span>{{ partialTooltip }}</span>
      </NTooltip>
    </header>

    <div v-if="loading" class="nsi-diagnostics__loading">
      <NSpin size="small" />
    </div>

    <ul v-else class="nsi-diagnostics__list">
      <li v-if="!items.length" class="nsi-diagnostics__empty">{{ emptyText }}</li>
      <li
        v-for="item in items"
        :key="item.code"
        class="nsi-diagnostics__item"
      >
        <span class="nsi-diagnostics__severity" :class="severityClass(item.severity)">
          {{ severityLabel(item.severity) }}
        </span>
        <button type="button" class="nsi-diagnostics__content" @click="emitSelect(item)">
          <span class="nsi-diagnostics__name">{{ item.title }}</span>
          <span class="nsi-diagnostics__count">{{ item.count }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NSpin, NTooltip } from 'naive-ui'

import { useI18n } from '@shared/lib'
import type { DiagnosticItem, DiagnosticSeverity } from '@entities/nsi-dashboard'

defineOptions({
  name: 'NsiDashboardDiagnostics',
})

const props = defineProps<{
  title: string
  description: string
  emptyText: string
  loading?: boolean
  items: DiagnosticItem[]
  severityLabels: Record<DiagnosticSeverity, string>
  partial?: boolean
}>()

const emit = defineEmits<{ (e: 'select', item: DiagnosticItem): void }>()

const { t } = useI18n()

const loading = computed(() => Boolean(props.loading))
const partial = computed(() => Boolean(props.partial))
const partialLabel = computed(() => t('nsi.dashboard.partial.label'))
const partialTooltip = computed(() => t('nsi.dashboard.partial.tooltip'))

function severityClass(severity: DiagnosticSeverity) {
  return `is-${severity}`
}

function severityLabel(severity: DiagnosticSeverity) {
  return props.severityLabels[severity]
}

function emitSelect(item: DiagnosticItem) {
  emit('select', item)
}
</script>

<style scoped>
.nsi-diagnostics {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-md);
  padding: var(--s360-space-xl);
  border-radius: var(--s360-radius-lg);
  background: var(--s360-color-elevated);
  box-shadow: var(--s360-shadow-lg);
}

.nsi-diagnostics__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s360-space-md);
}

.nsi-diagnostics__title {
  margin: 0;
  font-size: var(--s360-font-title-md);
  font-weight: 600;
}

.nsi-diagnostics__description {
  margin: var(--s360-space-xs) 0 0;
  font-size: var(--s360-font-caption);
  color: var(--s360-text-muted);
}

.nsi-diagnostics__status {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--s360-space-sm);
  border-radius: var(--s360-radius);
  background: var(--s360-color-warning-soft);
  color: var(--s360-text-warning);
  font-size: var(--s360-font-caption);
  font-weight: 600;
  line-height: 1.6;
}

.nsi-diagnostics__loading {
  display: flex;
  justify-content: center;
  padding: var(--s360-space-xl) 0;
}

.nsi-diagnostics__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-sm);
}

.nsi-diagnostics__item {
  display: flex;
  gap: var(--s360-space-md);
  align-items: stretch;
}

.nsi-diagnostics__severity {
  min-width: 84px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--s360-space-xs) var(--s360-space-sm);
  border-radius: var(--s360-radius);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.nsi-diagnostics__severity.is-info {
  background: var(--s360-color-info-soft);
  color: var(--s360-text-accent);
}

.nsi-diagnostics__severity.is-warning {
  background: var(--s360-color-warning-soft);
  color: var(--s360-text-warning);
}

.nsi-diagnostics__severity.is-critical {
  background: var(--s360-color-critical-soft);
  color: var(--s360-text-critical);
}

.nsi-diagnostics__content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--s360-space-md);
  border: 1px solid var(--s360-color-border-subtle);
  background: var(--s360-color-neutral-soft);
  border-radius: var(--s360-radius-lg);
  padding: var(--s360-space-sm) var(--s360-space-md);
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.nsi-diagnostics__content:hover,
.nsi-diagnostics__content:focus {
  background: var(--s360-color-primary-soft);
  border-color: var(--s360-color-primary);
}

.nsi-diagnostics__name {
  font-weight: 600;
}

.nsi-diagnostics__count {
  font-weight: 600;
}

.nsi-diagnostics__empty {
  padding: var(--s360-space-md);
  text-align: center;
  color: var(--s360-text-muted);
  font-size: var(--s360-font-body);
  border-radius: var(--s360-radius-lg);
  background: var(--s360-color-neutral-soft);
}
</style>
