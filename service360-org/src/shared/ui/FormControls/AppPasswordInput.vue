<template>
  <div class="form-group">
    <label :for="id">
      {{ label }}
      <span v-if="required" class="required-asterisk">*</span>
    </label>
    <n-input
      :id="id"
      type="password"
      show-password-on="click"
      :value="modelValue"
      :status="status"
      :placeholder="placeholder || 'Введите пароль...'"
      :required="required"
      :disabled="disabled"
      size="medium"
      @update:value="updateValue"
    />
  </div>
</template>

<script setup>
import { NInput } from 'naive-ui'

defineProps({
  label: String,
  id: String,
  modelValue: String,
  placeholder: {
    type: String,
    default: 'Введите пароль...'
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
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
  width: 100%;
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

.form-group :deep(.n-input) {
  border-radius: 6px;
}

.form-group :deep(.n-input__input-el) {
  border-radius: 6px;
}

.form-group :deep(.n-input-wrapper) {
  border-radius: 6px;
}

@media (max-width: 768px) {
  .form-group {
    min-width: 0;
    width: 100%;
  }

  label {
    font-size: 13px;
  }

  .form-group :deep(.n-input) {
    font-size: 16px;
    border-radius: 12px;
    width: 100%;
    min-height: 50px;
  }

  .form-group :deep(.n-input__input-el) {
    border-radius: 12px;
    min-height: 50px;
    height: 50px;
  }

  .form-group :deep(.n-input-wrapper) {
    border-radius: 12px;
    min-height: 50px;
  }
}

@media (max-width: 480px) {
  .form-group :deep(.n-input) {
    min-height: 50px;
  }

  .form-group :deep(.n-input__input-el) {
    min-height: 50px;
    height: 50px;
  }

  .form-group :deep(.n-input-wrapper) {
    min-height: 50px;
  }
}
</style>
