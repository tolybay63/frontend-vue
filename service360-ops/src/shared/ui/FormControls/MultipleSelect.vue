<template>
  <div class="form-group">
    <div class="label-container">
      <label :for="id">{{ label }}</label>
      <div v-if="showSelectAll && options.length > 0" class="button-group">
        <button
          type="button"
          class="select-button"
          @click="selectAll"
        >
          Выбрать все
        </button>
        <button
          v-if="modelValue.length > 0"
          type="button"
          class="clear-button"
          @click="clearAll"
        >
          Очистить
        </button>
      </div>
    </div>
    <n-select
      :id="id"
      v-bind="$attrs"
      :value="modelValue"
      @update:value="updateValue"
      :options="options"
      multiple
      :fallback-option="fallbackOption"
      filterable
      size="medium"
      :render-label="renderLabel"
      :max-tag-count="3"
      show-arrow
    />
  </div>
</template>

<script setup>
import { h } from 'vue'

const props = defineProps({
  label: String,
  id: String,
  modelValue: {
    type: Array,
    default: () => []
  },
  options: {
    type: Array,
    default: () => []
  },
  fallbackOption: Function,
  showSelectAll: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const updateValue = (val) => {
  emit('update:modelValue', val)
}

const selectAll = () => {
  const allValues = props.options.map(option => option.value)
  emit('update:modelValue', allValues)
}

const clearAll = () => {
  emit('update:modelValue', [])
}

const renderLabel = (option) => {
  return h('span', { title: option.label }, option.label)
}
</script>

<style scoped>
.form-group {
  display: flex;
  flex-direction: column;
}

.label-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

label {
  font-size: 14px;
  color: #4a5568;
}

.button-group {
  display: flex;
  gap: 8px;
}

.select-button,
.clear-button {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
}

.select-button {
  color: #3b82f6;
  background: transparent;
  border-color: #3b82f6;
}

.select-button:hover {
  background: #3b82f6;
  color: white;
}

.clear-button {
  color: #ef4444;
  background: transparent;
  border-color: #ef4444;
}

.clear-button:hover {
  background: #ef4444;
  color: white;
}
</style>
