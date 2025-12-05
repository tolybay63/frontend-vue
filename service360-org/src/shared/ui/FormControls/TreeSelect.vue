<template>
  <div class="form-group">
    <label :for="id">{{ label }}</label>
    <n-select
      :id="id"
      v-bind="$attrs"
      :value="modelValue" 
      :options="options"
      :placeholder="placeholder"
      :required="required"
      :status="status"
      size="medium"
      @update:value="updateValue"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import { NSelect } from 'naive-ui'

const props = defineProps({
  label: String,
  id: String,
  modelValue: String, 
  options: Array,
  placeholder: String,
  required: {
    type: Boolean,
    default: false
  },
  status: String
})

const emit = defineEmits(['update:modelValue']) 

const updateValue = (newValue) => {
  emit('update:modelValue', newValue) 
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
