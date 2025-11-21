<template>
  <div class="form-group">
    <label :for="id">
      {{ label }}
      <span v-if="required" class="required-asterisk">*</span>
    </label>
    <n-select
      :id="id"
      v-bind="$attrs"
      :value="modelValue?.value ?? modelValue"
      :options="options"
      :placeholder="placeholder"
      :required="required"
      :status="status"
      size="medium"
      label-field="label"
      value-field="value"
      filterable
      :render-label="renderLabel"
      clearable
      @update:value="updateValue"
    />
    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>
<script setup>
import { defineProps, defineEmits, h } from 'vue'
import { NSelect } from 'naive-ui'

const props = defineProps({
  label: String,
  id: String,
  modelValue: [String, Number, Object],
  options: Array,
  placeholder: String,
  required: {
    type: Boolean,
    default: false
  },
  status: String,
  hint: String // 👈 добавили
})

const emit = defineEmits(['update:modelValue'])

const updateValue = (selectedValue) => {
  const selectedOption = props.options.find(opt => opt.value === selectedValue)
  emit('update:modelValue', selectedOption ?? selectedValue)
}

const renderLabel = (option) => {
  // Проверяем, что label существует и является строкой
  const labelText = String(option.label ?? '');
  return h(
    'div',
    { title: labelText },
    labelText
  );
};
</script>

<style scoped>
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

label {
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
}

.required-asterisk {
  color: #e53e3e; 
  font-size: 14px; 
  margin-left: 2px;
  vertical-align: top; 
  line-height: 1.2; 
}

.hint {
  font-size: 12px;
  color: #718096;
  margin: 0;
}
</style>
