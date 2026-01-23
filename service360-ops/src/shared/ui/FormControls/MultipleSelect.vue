<template>
  <div class="form-group">
    <label :for="id">{{ label }}</label>
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
  fallbackOption: Function
})

const emit = defineEmits(['update:modelValue'])

const updateValue = (val) => {
  emit('update:modelValue', val)
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

label {
  margin-bottom: 4px;
  font-size: 14px;
  color: #4a5568;
}
</style>
