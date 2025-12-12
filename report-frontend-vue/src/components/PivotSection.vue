<template>
  <section class="pivot-card">
    <header class="pivot-card__header">
      <div>
        <div class="pivot-card__title">{{ title }}</div>
        <p class="pivot-card__hint">{{ hint }}</p>
      </div>
      <slot name="actions"></slot>
    </header>

    <div class="pivot-card__body">
      <n-select
        v-model:value="selectedKeys"
        multiple
        filterable
        clearable
        :options="fieldOptions"
        :placeholder="placeholder"
        size="large"
      />
      <p class="pivot-card__helper">
        Выберите одно или несколько полей. Ниже можно настроить порядок,
        переименования и фильтры для каждого поля.
      </p>

      <ul v-if="modelValue.length" class="pivot-card__list">
        <li v-for="(key, index) in modelValue" :key="`${section}-${key}`" class="pivot-card__item">
          <div class="pivot-card__item-info">
            <span class="pivot-card__drag">☰</span>
            <div>
              <div class="item-label">{{ displayName(key) }}</div>
              <div class="item-key">{{ key }}</div>
            </div>
          </div>
          <div class="pivot-card__actions">
            <div v-if="editingKey === key" class="item-alias-editor">
              <n-input
                v-model:value="aliasDraft"
                size="small"
                placeholder="Название для пользователя"
              />
              <div class="item-alias-controls">
                <n-button size="tiny" type="primary" @click="applyAlias(key)">
                  Сохранить
                </n-button>
                <n-button size="tiny" quaternary @click="cancelAlias">
                  Отмена
                </n-button>
              </div>
            </div>
            <div v-else class="item-controls">
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button quaternary circle size="small" @click="startAliasEdit(key)">
                    ✏
                  </n-button>
                </template>
                Переименовать поле
              </n-tooltip>

              <n-tooltip v-if="allowValueFilter" trigger="hover">
                <template #trigger>
                  <n-button
                    quaternary
                    circle
                    size="small"
                    :class="{ active: hasFilter(key) }"
                    @click="toggleFilter(key)"
                  >
                    ⚙
                  </n-button>
                </template>
                Настроить значения
              </n-tooltip>

              <n-tooltip v-if="allowValueSort" trigger="hover">
                <template #trigger>
                  <n-button
                    quaternary
                    circle
                    size="small"
                    :class="{ active: sortState[key]?.value && sortState[key]?.value !== 'none' }"
                    @click="cycleSort(key, 'value')"
                  >
                    A/Z
                  </n-button>
                </template>
                Сортировка по значениям
              </n-tooltip>

              <n-tooltip v-if="allowMetricSort" trigger="hover">
                <template #trigger>
                  <n-button
                    quaternary
                    circle
                    size="small"
                    :class="{ active: sortState[key]?.metric && sortState[key]?.metric !== 'none' }"
                    @click="cycleSort(key, 'metric')"
                  >
                    Σ
                  </n-button>
                </template>
                Сортировка по метрике
              </n-tooltip>

              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button
                    quaternary
                    circle
                    size="small"
                    :disabled="index === 0"
                    @click="move(index, -1)"
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
                    :disabled="index === modelValue.length - 1"
                    @click="move(index, 1)"
                  >
                    ↓
                  </n-button>
                </template>
                Ниже
              </n-tooltip>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-button quaternary circle size="small" @click="remove(key)">
                    ×
                  </n-button>
                </template>
                Удалить
              </n-tooltip>
            </div>
          </div>
          <div v-if="activeFilterKey === key" class="pivot-card__filters">
            <div v-if="supportsRangeKey(key)" class="filter-mode">
              <button
                type="button"
                :class="{ active: filterMode === 'values' }"
                @click="filterMode = 'values'"
              >
                Значения
              </button>
              <button
                type="button"
                :class="{ active: filterMode === 'range' }"
                @click="filterMode = 'range'"
              >
                Диапазон
              </button>
            </div>
            <div v-if="!supportsRangeKey(key) || filterMode === 'values'">
              <MultiSelectDropdown
                v-model="localFilters"
                :options="valueOptions(key)"
                placeholder="Выберите значения"
              />
            </div>
            <div v-else class="range-editor">
              <div
                v-if="activeRangeType === 'date'"
                class="range-inputs"
              >
                <n-date-picker
                  v-model:value="rangeDraft.start"
                  type="date"
                  value-format="yyyy-MM-dd"
                  clearable
                  placeholder="От"
                />
                <span class="range-separator">—</span>
                <n-date-picker
                  v-model:value="rangeDraft.end"
                  type="date"
                  value-format="yyyy-MM-dd"
                  clearable
                  placeholder="До"
                />
              </div>
              <div v-else class="range-inputs">
                <n-input-number
                  v-model:value="rangeDraft.start"
                  class="range-input"
                  clearable
                  placeholder="От"
                />
                <span class="range-separator">—</span>
                <n-input-number
                  v-model:value="rangeDraft.end"
                  class="range-input"
                  clearable
                  placeholder="До"
                />
              </div>
              <p class="range-hint">
                Укажите границы. Пустые значения отключают проверку по краю
                диапазона.
              </p>
            </div>
            <div class="filter-actions">
              <button class="btn-outline btn-sm" type="button" @click="applyFilters(key)">
                Применить
              </button>
              <button class="btn-text btn-sm" type="button" @click="cancelFilters">
                Отмена
              </button>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="pivot-card__empty">Нет выбранных полей.</p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  NButton,
  NDatePicker,
  NInput,
  NInputNumber,
  NSelect,
  NTooltip,
} from 'naive-ui'
import MultiSelectDropdown from './MultiSelectDropdown.vue'

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Выберите поля',
  },
  section: {
    type: String,
    default: 'rows',
  },
  fields: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: Array,
    default: () => [],
  },
  headerOverrides: {
    type: Object,
    default: () => ({}),
  },
  valueStore: {
    type: Object,
    default: () => ({}),
  },
  allowValueFilter: {
    type: Boolean,
    default: true,
  },
  rangeStore: {
    type: Object,
    default: () => ({}),
  },
  valueOptionsResolver: {
    type: Function,
    default: () => [],
  },
  sortState: {
    type: Object,
    default: () => ({}),
  },
  allowValueSort: {
    type: Boolean,
    default: true,
  },
  allowMetricSort: {
    type: Boolean,
    default: false,
  },
  getFieldLabel: {
    type: Function,
    default: null,
  },
  supportsRange: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'rename',
  'update-filter-values',
  'update-range-values',
  'update-sort',
])

const editingKey = ref('')
const aliasDraft = ref('')
const activeFilterKey = ref('')
const localFilters = ref([])
const filterMode = ref('values')
const rangeDraft = ref(createEmptyRange())
const activeRangeType = ref('number')

const selectedKeys = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value.filter(Boolean)),
})

const fieldOptions = computed(() =>
  props.fields.map((field) => ({
    label: displayName(field.key),
    value: field.key,
  })),
)

const fieldMap = computed(() =>
  props.fields.reduce((acc, field) => {
    acc.set(field.key, field)
    return acc
  }, new Map()),
)

function displayName(key) {
  if (props.headerOverrides[key]) return props.headerOverrides[key]
  if (props.getFieldLabel) return props.getFieldLabel(key)
  const field = props.fields.find((item) => item.key === key)
  return field?.label || key
}

function startAliasEdit(key) {
  editingKey.value = key
  aliasDraft.value = props.headerOverrides[key] || displayName(key)
}
function cancelAlias() {
  editingKey.value = ''
  aliasDraft.value = ''
}
function applyAlias(key) {
  emit('rename', { key, title: aliasDraft.value?.trim() || '' })
  cancelAlias()
}

function valueOptions(key) {
  return props.valueOptionsResolver(key) || []
}

function hasValueFilter(key) {
  const values = props.valueStore[key]
  return Array.isArray(values) && values.length > 0
}

function hasRangeFilter(key) {
  const range = props.rangeStore[key]
  if (!range || typeof range !== 'object') return false
  return (
    (range.start !== null &&
      typeof range.start !== 'undefined' &&
      range.start !== '') ||
    (range.end !== null && typeof range.end !== 'undefined' && range.end !== '')
  )
}

function hasFilter(key) {
  return hasValueFilter(key) || hasRangeFilter(key)
}

function supportsRangeKey(key) {
  if (typeof props.supportsRange === 'function') {
    return props.supportsRange(key, fieldMap.value.get(key))
  }
  return false
}

function fieldRangeType(key) {
  const descriptor = fieldMap.value.get(key)
  if (descriptor?.type === 'date') return 'date'
  return 'number'
}

function cloneRange(range = {}) {
  if (!range || typeof range !== 'object') return createEmptyRange()
  return {
    start:
      range.start === '' || typeof range.start === 'undefined'
        ? null
        : range.start,
    end:
      range.end === '' || typeof range.end === 'undefined' ? null : range.end,
  }
}

function createEmptyRange() {
  return { start: null, end: null }
}

function toggleFilter(key) {
  if (activeFilterKey.value === key) {
    cancelFilters()
    return
  }
  activeFilterKey.value = key
  localFilters.value = [...(props.valueStore[key] || [])]
  const supports = supportsRangeKey(key)
  const hasRange = supports && hasRangeFilter(key)
  filterMode.value = hasRange ? 'range' : 'values'
  activeRangeType.value = supports ? fieldRangeType(key) : 'number'
  rangeDraft.value = hasRange
    ? cloneRange(props.rangeStore[key])
    : createEmptyRange()
}
function applyFilters(key) {
  if (filterMode.value === 'range' && supportsRangeKey(key)) {
    emit('update-range-values', {
      key,
      range: { ...rangeDraft.value },
    })
  } else {
    emit('update-filter-values', { key, values: [...localFilters.value] })
  }
  cancelFilters()
}
function cancelFilters() {
  activeFilterKey.value = ''
  localFilters.value = []
  filterMode.value = 'values'
  rangeDraft.value = createEmptyRange()
}

function cycleSort(key, type) {
  const sequence = ['none', 'asc', 'desc']
  const current = props.sortState[key]?.[type] || 'none'
  const nextIndex = (sequence.indexOf(current) + 1) % sequence.length
  emit('update-sort', {
    key,
    kind: type,
    direction: sequence[nextIndex],
  })
}

function move(index, delta) {
  const next = index + delta
  if (next < 0 || next >= props.modelValue.length) return
  const copy = [...props.modelValue]
  const [item] = copy.splice(index, 1)
  copy.splice(next, 0, item)
  emit('update:modelValue', copy)
}

function remove(key) {
  const copy = props.modelValue.filter((item) => item !== key)
  emit('update:modelValue', copy)
}
</script>

<style scoped>
.pivot-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fff;
}
.pivot-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.pivot-card__title {
  font-size: 18px;
  font-weight: 600;
}
.pivot-card__hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}
.pivot-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pivot-card__helper {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}
.pivot-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pivot-card__item {
  border: 1px solid #e0e7ff;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f8fafc;
}
.pivot-card__item-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pivot-card__drag {
  font-size: 18px;
  color: #a1a1aa;
}
.item-label {
  font-weight: 600;
  font-size: 14px;
}
.item-key {
  font-size: 12px;
  color: #9ca3af;
}
.pivot-card__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.item-alias-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item-alias-controls {
  display: flex;
  gap: 8px;
}
.pivot-card__empty {
  margin: 0;
  padding: 20px;
  border: 1px dashed #d4d4d8;
  border-radius: 12px;
  text-align: center;
  color: #9ca3af;
}
.pivot-card__filters {
  border-top: 1px dashed #d4d4d8;
  padding-top: 10px;
}
.filter-mode {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.filter-mode button {
  flex: 1;
  border: 1px solid #d4d4d8;
  border-radius: 6px;
  padding: 6px 10px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.filter-mode button.active {
  border-color: #4338ca;
  color: #4338ca;
}
.range-editor {
  border: 1px dashed #d4d4d8;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
}
.range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}
.range-input {
  flex: 1;
}
.range-separator {
  color: #6b7280;
}
.range-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #6b7280;
}
.filter-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.pivot-card__actions .active {
  border-color: #4338ca;
  color: #4338ca;
}
</style>
