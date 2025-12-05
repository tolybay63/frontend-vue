<template>
  <section class="nsi-checklist">
    <header class="nsi-checklist__header">
      <h2 class="nsi-checklist__title">{{ title }}</h2>
      <NTooltip v-if="partial" placement="top">
        <template #trigger>
          <span class="nsi-checklist__status">{{ partialLabel }}</span>
        </template>
        <span>{{ partialTooltip }}</span>
      </NTooltip>
    </header>
    <ol class="nsi-checklist__list">
      <li v-for="(step, index) in steps" :key="step.id" class="nsi-checklist__item">
        <span class="nsi-checklist__index" :class="{ done: step.done }">
          <NIcon
            v-if="step.done"
            :component="CheckmarkCircleOutline"
            class="nsi-checklist__status-icon"
          />
          <span v-else>{{ index + 1 }}</span>
        </span>
        <div class="nsi-checklist__content">
          <h3 class="nsi-checklist__name">{{ step.title }}</h3>
          <p class="nsi-checklist__description">{{ step.description }}</p>
          <div class="nsi-checklist__actions">
            <NButton text size="small" class="nsi-checklist__link" @click="emitSelect(step.id)">
              {{ goLabel }}
            </NButton>
            <NTooltip placement="top">
              <template #trigger>
                <button type="button" class="nsi-checklist__info" :aria-label="infoLabel">
                  <NIcon :component="InformationCircleOutline" />
                </button>
              </template>
              <span>{{ step.info }}</span>
            </NTooltip>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NIcon, NTooltip } from 'naive-ui'
import { CheckmarkCircleOutline, InformationCircleOutline } from '@vicons/ionicons5'
import { useI18n } from '@shared/lib'

defineOptions({
  name: 'NsiDashboardChecklist',
})

const props = defineProps<{
  title: string
  steps: Array<{
    id: string
    title: string
    description: string
    info: string
    done: boolean
  }>
  goLabel: string
  infoLabel: string
  partial?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const { t } = useI18n()
const partialLabel = computed(() => t('nsi.dashboard.partial.label'))
const partialTooltip = computed(() => t('nsi.dashboard.partial.tooltip'))
const partial = computed(() => Boolean(props.partial))

function emitSelect(id: string) {
  emit('select', id)
}
</script>

<style scoped>
.nsi-checklist {
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-lg);
  padding: var(--s360-space-xl);
  border-radius: var(--s360-radius-lg);
  background: var(--s360-color-elevated);
  box-shadow: var(--s360-shadow-lg);
}

.nsi-checklist__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s360-space-md);
}

.nsi-checklist__title {
  margin: 0;
  font-size: var(--s360-font-title-md);
  font-weight: 600;
}

.nsi-checklist__status {
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

.nsi-checklist__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-lg);
}

.nsi-checklist__item {
  display: flex;
  gap: var(--s360-space-md);
  align-items: flex-start;
}

.nsi-checklist__index {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--s360-color-info-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--s360-text-accent);
}

.nsi-checklist__index.done {
  background: var(--s360-color-success-soft);
  color: var(--s360-text-success);
}

.nsi-checklist__status-icon {
  font-size: 20px;
}

.nsi-checklist__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--s360-space-sm);
}

.nsi-checklist__name {
  margin: 0;
  font-size: var(--s360-font-body);
  font-weight: 600;
}

.nsi-checklist__description {
  margin: 0;
  color: var(--s360-text-muted);
  font-size: var(--s360-font-caption);
}

.nsi-checklist__actions {
  display: flex;
  align-items: center;
  gap: var(--s360-space-sm);
}

.nsi-checklist__link {
  padding: 0;
  height: auto;
  font-weight: 600;
}

.nsi-checklist__info {
  background: none;
  border: none;
  padding: 0;
  color: var(--s360-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.nsi-checklist__info:hover,
.nsi-checklist__info:focus {
  background: var(--s360-color-primary-soft);
  color: var(--s360-text-accent);
}
</style>
