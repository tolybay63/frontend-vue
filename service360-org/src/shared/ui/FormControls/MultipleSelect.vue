<template>
  <div class="form-group">
    <label :for="id">{{ label }}</label>
    <n-select
      :id="id"
      v-bind="$attrs"
      :value="modelValue"
      @update:value="handleUpdate"
      :options="options"
      multiple
      :fallback-option="createFallbackOption"
      :loading="loading"
      filterable
      size="medium"
      label-field="label"
      value-field="value"
      children-field="children"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

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
  loading: {
    type: Boolean,
    default: false
  },
  singlePerGroup: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// Создаем карту: childValue -> parentValue
const childToParentMap = computed(() => {
  const map = {}
  props.options.forEach(parent => {
    if (parent.children) {
      parent.children.forEach(child => {
        map[child.value] = parent.value
      })
    }
  })
  return map
})

// Создаем карту: value -> label для fallback
const valueToLabelMap = computed(() => {
  const map = {}
  props.options.forEach(parent => {
    map[parent.value] = parent.label
    if (parent.children) {
      parent.children.forEach(child => {
        map[child.value] = child.label
      })
    }
  })
  return map
})

// Fallback для отображения выбранных значений
const createFallbackOption = (value) => {
  return {
    label: valueToLabelMap.value[value] || value,
    value: value
  }
}

const handleUpdate = (newValues) => {
  if (!props.singlePerGroup || !newValues || newValues.length === 0) {
    emit('update:modelValue', newValues)
    return
  }

  // Логика: с каждого родителя можно выбрать только одну дочку
  const lastSelected = newValues[newValues.length - 1]
  const lastParent = childToParentMap.value[lastSelected]

  // Фильтруем: оставляем только те, у которых другой родитель, + последний выбранный
  const filtered = newValues.filter((val, idx) => {
    if (idx === newValues.length - 1) return true // последний всегда оставляем
    const parent = childToParentMap.value[val]
    return parent !== lastParent // оставляем только с другим родителем
  })

  emit('update:modelValue', filtered)
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
