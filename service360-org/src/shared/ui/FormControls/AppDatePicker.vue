<template>
  <div class="form-group">
    <label :for="id">
      {{ label }}
      <span v-if="required" class="required-asterisk">*</span>
    </label>
    <n-date-picker
      :id="id"
      v-bind="$attrs"
      :value="timestamp"
      :placeholder="placeholder"
      :status="status"
      type="date"
      size="medium"
      :locale="ruLocale"
      :format="dateFormat"
      @update:value="updateValue"
      :is-date-disabled="isDateDisabled"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';
import { NDatePicker } from 'naive-ui';
import { ruRU } from 'naive-ui';

const props = defineProps({
  label: String,
  id: String,
  modelValue: {
    type: [String, Date, Number, null],
    default: null
  },
  placeholder: String,
  status: String,
  required: {
    type: Boolean,
    default: false
  },
  isDateDisabled: {
    type: Function,
    default: () => false
  }
});

const emit = defineEmits(['update:modelValue']);

const timestamp = computed(() => {
  if (!props.modelValue) return null;
  
  // Обрабатываем разные типы входных данных
  let date;
  if (props.modelValue instanceof Date) {
    date = props.modelValue;
  } else if (typeof props.modelValue === 'number') {
    date = new Date(props.modelValue);
  } else if (typeof props.modelValue === 'string') {
    date = new Date(props.modelValue);
  } else {
    return null;
  }
  
  return isNaN(date.getTime()) ? null : date.getTime();
});

const updateValue = (newValue) => {
  const date = newValue ? new Date(newValue) : null;
  emit('update:modelValue', date);
};

const ruLocale = ruRU;
const dateFormat = 'dd.MM.yyyy';
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