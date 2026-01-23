<template>
  <div class="filter-range-control">
    <div
      v-if="supportsRange && showModeToggle && !lockRange"
      class="filter-range-control__mode"
    >
      <button
        type="button"
        :class="{ active: currentMode === 'values' }"
        @click="setMode('values')"
      >
        Значения
      </button>
      <button
        type="button"
        :class="{ active: currentMode === 'range' }"
        @click="setMode('range')"
      >
        Диапазон
      </button>
    </div>
    <div v-if="!supportsRange || currentMode === 'values'">
      <MultiSelectDropdown
        v-model="localValues"
        :options="options"
        :placeholder="placeholder"
        :disabled="disabled"
      />
    </div>
    <div v-else class="filter-range-control__range">
      <div v-if="rangeType === 'date'" class="range-inputs">
        <n-date-picker
          v-model:value="rangeDraft.start"
          class="range-input"
          type="date"
          value-format="yyyy-MM-dd"
          clearable
          :disabled="disabled"
          placeholder="От"
        />
        <span class="range-separator">—</span>
        <n-date-picker
          v-model:value="rangeDraft.end"
          class="range-input"
          type="date"
          value-format="yyyy-MM-dd"
          clearable
          :disabled="disabled"
          placeholder="До"
        />
      </div>
      <div v-else class="range-inputs">
        <n-input-number
          v-model:value="rangeDraft.start"
          class="range-input"
          :disabled="disabled"
          clearable
          placeholder="От"
        />
        <span class="range-separator">—</span>
        <n-input-number
          v-model:value="rangeDraft.end"
          class="range-input"
          :disabled="disabled"
          clearable
          placeholder="До"
        />
      </div>
      <p v-if="showRangeHint" class="range-hint">
        Укажите границы. Пустое значение отключает соответствующую сторону
        диапазона.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { NDatePicker, NInputNumber } from 'naive-ui'
import MultiSelectDropdown from './MultiSelectDropdown.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  range: {
    type: Object,
    default: null,
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: 'Выберите значения',
  },
  supportsRange: {
    type: Boolean,
    default: false,
  },
  rangeType: {
    type: String,
    default: 'number',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  showModeToggle: {
    type: Boolean,
    default: true,
  },
  lockRange: {
    type: Boolean,
    default: false,
  },
  showRangeHint: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'update:range'])

const localValues = ref([...(props.modelValue || [])])
watch(
  () => props.modelValue,
  (next) => {
    localValues.value = [...(next || [])]
  },
)
watch(
  localValues,
  (values) => {
    emit('update:modelValue', [...(values || [])])
  },
  { deep: true },
)

const rangeDraft = ref(cloneRange(props.range))
watch(
  () => props.range,
  (next) => {
    rangeDraft.value = cloneRange(next)
    if (props.supportsRange) {
      currentMode.value = props.lockRange
        ? 'range'
        : hasActiveRange(next)
          ? 'range'
          : 'values'
    }
  },
  { deep: true },
)
watch(
  rangeDraft,
  (next) => {
    emit('update:range', cloneRange(next))
  },
  { deep: true },
)

const currentMode = ref(resolveInitialMode())

watch(
  () => props.lockRange,
  (locked) => {
    if (locked && props.supportsRange) {
      currentMode.value = 'range'
    }
  },
  { immediate: true },
)

function resolveInitialMode() {
  if (!props.supportsRange) return 'values'
  if (props.lockRange) return 'range'
  return hasActiveRange(props.range) ? 'range' : 'values'
}

function setMode(mode) {
  if (props.lockRange) return
  if (mode === currentMode.value) return
  if (mode === 'values') {
    rangeDraft.value = createEmptyRange()
  } else if (mode === 'range') {
    localValues.value = []
  }
  currentMode.value = mode
}

function createEmptyRange() {
  return { start: null, end: null }
}

function cloneRange(range) {
  if (!range || typeof range !== 'object') {
    return createEmptyRange()
  }
  return {
    start: isDefined(range.start) ? range.start : null,
    end: isDefined(range.end) ? range.end : null,
  }
}

function hasActiveRange(range) {
  if (!range || typeof range !== 'object') return false
  return isDefined(range.start) || isDefined(range.end)
}

function isDefined(value) {
  return !(value === null || typeof value === 'undefined' || value === '')
}
</script>

<style scoped>
.filter-range-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.filter-range-control__mode {
  display: flex;
  gap: 6px;
}
.filter-range-control__mode button {
  flex: 1;
  border: 1px solid #d4d4d8;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  padding: 6px 8px;
  cursor: pointer;
}
.filter-range-control__mode button.active {
  border-color: #4338ca;
  color: #4338ca;
}
.filter-range-control__range {
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 6px 10px;
  background: #fff;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.range-input {
  flex: 1;
}
.filter-range-control__range :deep(.n-input),
.filter-range-control__range :deep(.n-input-number),
.filter-range-control__range :deep(.n-input-wrapper) {
  min-height: 40px;
}
.filter-range-control__range :deep(.n-input__input-el),
.filter-range-control__range :deep(.n-input-number-input),
.filter-range-control__range :deep(.n-input__textarea-el) {
  min-height: 38px;
}
.range-separator {
  color: #6b7280;
}
.range-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #6b7280;
}
</style>
