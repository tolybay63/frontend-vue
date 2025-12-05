<template>
  <section class="nsi-activity">
    <header class="nsi-activity__header">
      <h2 class="nsi-activity__title">{{ title }}</h2>
      <NTooltip v-if="partial" placement="top">
        <template #trigger>
          <span class="nsi-activity__status">{{ partialLabel }}</span>
        </template>
        <span>{{ partialTooltip }}</span>
      </NTooltip>
    </header>

    <ul class="nsi-activity__list">
      <li v-if="!items.length" class="nsi-activity__empty">{{ emptyText }}</li>
      <li v-for="item in items" :key="item.id" class="nsi-activity__item">
        <button type="button" class="nsi-activity__button" @click="emitSelect(item)">
          <span class="nsi-activity__primary">{{ item.title }}</span>
          <span class="nsi-activity__meta">
            <strong>{{ item.actor }}</strong>
            <span v-if="formatTime(item.ts)">{{ formatTime(item.ts) }}</span>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NTooltip } from 'naive-ui'

import { useI18n } from '@shared/lib'
import type { ActivityItem } from '@entities/nsi-dashboard'

defineOptions({
  name: 'NsiDashboardRecentActivity',
})

const props = defineProps<{
  title: string
  emptyText: string
  items: ActivityItem[]
  partial?: boolean
}>()

const emit = defineEmits<{ (e: 'select', item: ActivityItem): void }>()

const { t } = useI18n()
const partial = computed(() => Boolean(props.partial))
const partialLabel = computed(() => t('nsi.dashboard.partial.label'))
const partialTooltip = computed(() => t('nsi.dashboard.partial.tooltip'))

const formatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function formatTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return formatter.format(date)
}

function emitSelect(item: ActivityItem) {
  emit('select', item)
}
</script>

<style scoped>
.nsi-activity {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-md);
  padding: var(--s360-space-xl);
  background: var(--s360-color-elevated);
  border-radius: var(--s360-radius-lg);
  box-shadow: var(--s360-shadow-lg);
}

.nsi-activity__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s360-space-md);
}

.nsi-activity__title {
  margin: 0;
  font-size: var(--s360-font-title-md);
  font-weight: 600;
}

.nsi-activity__status {
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

.nsi-activity__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-sm);
}

.nsi-activity__item {
  display: flex;
}

.nsi-activity__button {
  border: 1px solid var(--s360-color-border-subtle);
  background: var(--s360-color-neutral-soft);
  border-radius: var(--s360-radius-lg);
  padding: var(--s360-space-md);
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-xs);
  text-align: left;
  cursor: pointer;
  color: inherit;
  width: 100%;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.nsi-activity__button:hover,
.nsi-activity__button:focus {
  background: var(--s360-color-primary-soft);
  border-color: var(--s360-color-primary);
}

.nsi-activity__primary {
  font-weight: 600;
}

.nsi-activity__meta {
  display: flex;
  gap: var(--s360-space-sm);
  font-size: var(--s360-font-caption);
  color: var(--s360-text-muted);
}

.nsi-activity__meta strong {
  color: var(--s360-text-accent);
}

.nsi-activity__empty {
  padding: var(--s360-space-md);
  text-align: center;
  color: var(--s360-text-muted);
  background: var(--s360-color-neutral-soft);
  border-radius: var(--s360-radius-lg);
}
</style>
