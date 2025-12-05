<template>
  <div class="form-group">
    <label :for="id">
      {{ label }}
      <span v-if="required" class="required-asterisk">*</span>
    </label>
    <n-input
      :id="id"
      v-bind="$attrs"
      :value="modelValue"
      :status="status"
      :placeholder="placeholder || 'Введите текст...'"
      :required="required"
      size="medium"
      @update:value="updateValue"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import { NInput } from 'naive-ui'

const props = defineProps({
  label: String,
  id: String,
  modelValue: String,
  placeholder: {
    type: String,
    default: 'Введите текст...'
  },
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

.required-asterisk {
  color: #e53e3e; 
  font-size: 14px; 
  font-weight: normal; 
  margin-left: 0px;
  vertical-align: top; 
  line-height: 1.2; 
}
</style>
