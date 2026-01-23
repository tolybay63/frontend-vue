<template>
  <div class="cf-cell" :class="wrapperClass" :style="wrapperStyle">
    <span
      v-if="isDataBar"
      class="cf-cell__bar"
      :style="barStyle"
      aria-hidden="true"
    ></span>
    <span
      v-if="isIcon"
      class="cf-cell__icon"
      :style="{ color: props.formatting?.iconColor || '#4b5563' }"
      aria-hidden="true"
    >
      {{ props.formatting?.icon }}
    </span>
    <span v-if="shouldShowValue" class="cf-cell__value">
      {{ safeDisplay }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  display: {
    type: [String, Number],
    default: '—',
  },
  formatting: {
    type: Object,
    default: null,
  },
})

const safeDisplay = computed(() => {
  if (props.display === null || typeof props.display === 'undefined') return '—'
  const value = String(props.display)
  return value.trim() ? value : '—'
})

const type = computed(() => props.formatting?.type || 'none')
const isDataBar = computed(() => type.value === 'dataBar')
const isColorScale = computed(() => type.value === 'colorScale')
const isIcon = computed(() => type.value === 'iconSet')

const wrapperClass = computed(() => ({
  'cf-cell--bar': isDataBar.value,
  'cf-cell--color': isColorScale.value,
  'cf-cell--icon': isIcon.value,
}))

const wrapperStyle = computed(() => {
  if (isColorScale.value) {
    return {
      backgroundColor: props.formatting?.backgroundColor || '#e5e7eb',
      color: props.formatting?.textColor || '#111827',
    }
  }
  return {}
})

const barStyle = computed(() => {
  if (!isDataBar.value) return {}
  const percent = Math.min(
    Math.max(Number(props.formatting?.percent) || 0, 0),
    1,
  )
  return {
    width: `${Math.round(percent * 100)}%`,
    backgroundColor: props.formatting?.barColor || '#60a5fa',
  }
})

const shouldShowValue = computed(() => {
  if (isDataBar.value) {
    return props.formatting?.showValue !== false
  }
  return true
})
</script>

<style scoped>
.cf-cell {
  position: relative;
  display: inline-flex;
  width: 100%;
  min-height: 28px;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  font-variant-numeric: tabular-nums;
  color: inherit;
}
.cf-cell__value {
  position: relative;
  z-index: 1;
}
.cf-cell__icon {
  font-size: 14px;
  line-height: 1;
  position: relative;
  z-index: 1;
}
.cf-cell__bar {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 70%;
  border-radius: 4px;
  background-color: #60a5fa;
  opacity: 0.35;
  transition: width 0.2s ease;
}
.cf-cell--color {
  border-radius: 6px;
  padding: 2px 6px;
}
.cf-cell--bar {
  padding: 2px 4px;
}
</style>
