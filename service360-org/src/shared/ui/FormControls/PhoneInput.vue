<template>
  <div class="form-group">
    <label :for="id">{{ label }}</label>
    <n-input
      :id="id"
      v-bind="$attrs"
      :value="displayValue"
      :placeholder="placeholder"
      :required="required"
      size="medium"
      :status="status"
      @update:value="handleInput"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { defineProps, defineEmits } from 'vue'
import { NInput } from 'naive-ui'

const props = defineProps({
  label: String,
  id: String,
  modelValue: String,
  placeholder: {
    type: String,
    default: '+7 708 517 6491'
  },
  required: {
    type: Boolean,
    default: false
  },
  status: String
})

const emit = defineEmits(['update:modelValue'])

const rawValue = ref('')

const formatPhone = (input) => {
  let digits = input.replace(/\D/g, '')

  if (digits.startsWith('8')) {
    digits = digits.slice(1)
  } else if (digits.startsWith('7')) {
    digits = digits.slice(1)
  }

  digits = digits.slice(0, 10)

  const part1 = digits.slice(0, 3)
  const part2 = digits.slice(3, 6)
  const part3 = digits.slice(6, 10)

  let result = '+7'
  if (part1) result += ` ${part1}`
  if (part2) result += ` ${part2}`
  if (part3) result += ` ${part3}`

  return result
}

watch(
  () => props.modelValue,
  (val) => {
    rawValue.value = formatPhone(val || '')
  },
  { immediate: true }
)

const handleInput = (val) => {
  rawValue.value = formatPhone(val)
  emit('update:modelValue', '+7' + val.replace(/\D/g, '').replace(/^8|^7/, '').slice(0, 10))
}

const displayValue = computed(() => rawValue.value || '+7')
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
