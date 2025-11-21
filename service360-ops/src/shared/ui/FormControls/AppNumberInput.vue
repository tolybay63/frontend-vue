<template>
  <div class="form-group">
    <label :for="id">
      {{ label }}
      <span v-if="required" class="required-asterisk">*</span>
    </label>
    <n-input-number
      :id="id"
      v-bind="$attrs"
      :value="internalValue"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      :step="step"
      :required="required"
      :status="status"
      size="medium"
      @update:value="handleInput"
      @keydown="handleKeydown"
      @blur="handleBlur"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, watch } from 'vue'
import { NInputNumber } from 'naive-ui'

const props = defineProps({
  label: String,
  id: String,
  modelValue: {
    type: [Number, null],
    default: null
  },
  placeholder: String,
  required: {
    type: Boolean,
    default: false
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: Infinity
  },
  step: {
    type: Number,
    default: 1
  },
  status: String
})

const emit = defineEmits(['update:modelValue'])

const internalValue = ref(props.modelValue)

watch(() => props.modelValue, (newVal) => {
  internalValue.value = newVal
})

const handleInput = (newValue) => {
  if (newValue === null || newValue === '' || isNaN(newValue)) {
    internalValue.value = null
    emit('update:modelValue', null)
    return
  }

  let value = Math.floor(Number(newValue))

  if (value < props.min) {
    value = props.min 
  }
  if (props.max !== Infinity && value > props.max) {
    value = props.max 
  }

  internalValue.value = value
  emit('update:modelValue', value)
}

const handleBlur = () => {

  const val = internalValue.value
  if (val !== null && (val < props.min || (props.max !== Infinity && val > props.max))) {
    handleInput(val)
  }
}

const handleKeydown = (e) => {
  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
  ]
  const isCtrl = e.ctrlKey || e.metaKey
  const isNumber = /^[0-9]$/.test(e.key)

  if (e.key === '-' || e.key === 'Minus') {
    e.preventDefault()
    return
  }

  if (!isNumber && !allowedKeys.includes(e.key) && !(isCtrl && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) {
    e.preventDefault()
  }
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
  margin-left: 4px;
  vertical-align: top;
  line-height: 1.2;
}
</style>