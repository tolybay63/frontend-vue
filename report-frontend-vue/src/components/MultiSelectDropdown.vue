<template>
  <div ref="root" class="multi-select">
    <button class="multi-select__trigger" type="button" @click="toggle">
      <span class="multi-select__label">
        {{ triggerLabel }}
      </span>
      <span v-if="modelValue?.length" class="multi-select__count">
        {{ modelValue.length }}
      </span>
      <span class="multi-select__chevron" :class="{ open }">▾</span>
    </button>

    <div v-if="open" class="multi-select__panel">
      <input
        v-model="search"
        class="multi-select__search"
        type="search"
        placeholder="Поиск..."
      />
      <div class="multi-select__options">
        <label v-for="option in filteredOptions" :key="option.value" class="multi-select__option">
          <input
            type="checkbox"
            :value="option.value"
            :checked="isChecked(option.value)"
            @change="toggleValue(option.value)"
          />
          <span>{{ option.label }}</span>
        </label>
        <p v-if="!filteredOptions.length" class="multi-select__empty">Совпадений нет</p>
      </div>
      <div class="multi-select__actions">
        <button class="btn-outline btn-sm" type="button" @click="clear">Очистить</button>
        <button class="btn-primary btn-sm" type="button" @click="close">Готово</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: 'Выберите значения',
  },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const search = ref('')
const root = ref(null)

const triggerLabel = computed(() => {
  if (!props.modelValue?.length) return props.placeholder
  const labels = props.options
    .filter((option) => props.modelValue.includes(option.value))
    .map((option) => option.label)
  if (!labels.length) return props.placeholder
  if (labels.length > 2) {
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
  }
  return labels.join(', ')
})

const filteredOptions = computed(() => {
  if (!search.value.trim()) return props.options
  return props.options.filter((option) =>
    option.label?.toLowerCase().includes(search.value.trim().toLowerCase()),
  )
})

function toggle() {
  open.value = !open.value
}
function close() {
  open.value = false
}
function toggleValue(value) {
  const next = new Set(props.modelValue || [])
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  emit('update:modelValue', Array.from(next))
}
function isChecked(value) {
  return props.modelValue?.includes(value)
}
function clear() {
  emit('update:modelValue', [])
  search.value = ''
}

function handleClickOutside(event) {
  if (!root.value) return
  if (!root.value.contains(event.target)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

watch(open, (value) => {
  if (!value) {
    search.value = ''
  }
})
</script>

<style scoped>
.multi-select {
  position: relative;
  width: 100%;
}
.multi-select__trigger {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}
.multi-select__label {
  flex: 1;
  font-size: 13px;
  color: #111827;
}
.multi-select__count {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #eef2ff;
  color: #312e81;
}
.multi-select__chevron {
  font-size: 12px;
  transition: transform 0.2s;
}
.multi-select__chevron.open {
  transform: rotate(180deg);
}
.multi-select__panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
  padding: 10px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.multi-select__search {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 13px;
}
.multi-select__options {
  max-height: 200px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.multi-select__option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.multi-select__empty {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}
.multi-select__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
