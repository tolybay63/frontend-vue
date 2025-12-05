<template>
  <div class="coordinate-wrapper">
    <label class="coordinate-label">
      Координаты
      <span v-if="required" class="required-asterisk">*</span>
    </label>
    <div class="coordinate-group">
      <AppNumberInput
        :modelValue="currentStartKm"
        label="Начало (км)"
        placeholder="км"
        :required="required"
        :status="shouldShowError && (isInvalid || isOutOfBounds) ? 'error' : null"
        @update:modelValue="handleStartKm"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <AppNumberInput
        :modelValue="currentStartPk"
        label="Начало (пк)"
        placeholder="пк"
        :max="10"
        :required="required"
        :status="shouldShowError && (isInvalid || isOutOfBounds) ? 'error' : null"
        @update:modelValue="handleStartPk"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <AppNumberInput
        :modelValue="currentEndKm"
        label="Конец (км)"
        placeholder="км"
        :required="required"
        :status="shouldShowError && (isInvalid || isOutOfBounds) ? 'error' : null"
        @update:modelValue="handleEndKm"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <AppNumberInput
        :modelValue="currentEndPk"
        label="Конец (пк)"
        placeholder="пк"
        :max="10"
        :required="required"
        :status="shouldShowError && (isInvalid || isOutOfBounds) ? 'error' : null"
        @update:modelValue="handleEndPk"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, watch } from 'vue'
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      coordStartKm: null,
      coordStartPk: null,
      coordEndKm: null,
      coordEndPk: null
    })
  },
  objectBounds: {
    type: Object,
    default: null
  },
  // ИЗМЕНЕНИЕ: Устанавливаем default: false, чтобы управлять атрибутом извне
  required: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'invalidRange', 'out-of-bounds'])

const notificationStore = useNotificationStore()

const isUserTyping = ref(false)
const shouldShowError = ref(false)

const currentStartKm = computed(() => props.modelValue.coordStartKm ?? 0)
const currentStartPk = computed(() => props.modelValue.coordStartPk ?? 0)
const currentEndKm = computed(() => props.modelValue.coordEndKm ?? 0)
const currentEndPk = computed(() => props.modelValue.coordEndPk ?? 0)

const startAbs = computed(() => currentStartKm.value * 1000 + currentStartPk.value * 100)
const endAbs = computed(() => currentEndKm.value * 1000 + currentEndPk.value * 100)

const isInvalid = computed(() => {
  // Проверяем, что оба километра введены (не null и не undefined).
  // Это предотвращает ошибку, когда заполнено только одно поле.
  const bothKmFilled = props.modelValue.coordStartKm != null && props.modelValue.coordEndKm != null

  // Запускаем проверку только если оба километра заполнены.
  return bothKmFilled ? startAbs.value > endAbs.value : false
})

const isOutOfBounds = computed(() => {
  if (!props.objectBounds) return false
  const objStartAbs = props.objectBounds.StartKm * 1000 + props.objectBounds.StartPicket * 100
  const objEndAbs = props.objectBounds.FinishKm * 1000 + props.objectBounds.FinishPicket * 100
  return startAbs.value < objStartAbs || endAbs.value > objEndAbs
})

const clamp = (value, min, max) => {
  if (value == null || isNaN(value)) return min
  const num = Math.floor(Number(value))
  return Math.max(min, Math.min(max, num))
}

const updateCoords = (field, value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}

const handleStartKm = (value) => updateCoords('coordStartKm', clamp(value, 0, 9999))
const handleStartPk = (value) => updateCoords('coordStartPk', clamp(value, 0, 10))
const handleEndKm = (value) => updateCoords('coordEndKm', clamp(value, 0, 9999))
const handleEndPk = (value) => updateCoords('coordEndPk', clamp(value, 0, 10))

const performValidation = () => {
  if (isInvalid.value) {
    emit('invalidRange', isInvalid.value)
    notificationStore.showNotification('Диапазон координат неверен!', 'error')
  }

  if (isOutOfBounds.value) {
    emit('out-of-bounds')
    notificationStore.showNotification('Координаты выходят за пределы допустимого диапазона!', 'error')
  }
}

const handleFocus = () => {
  isUserTyping.value = true
  shouldShowError.value = false
}

const handleBlur = () => {
  isUserTyping.value = false
  setTimeout(() => {
    shouldShowError.value = true
    performValidation()
  }, 100)
}

watch([startAbs, endAbs], () => {
  if (!isUserTyping.value) {
    performValidation()
  }
})

watch(() => props.objectBounds, () => {
  if (!isUserTyping.value) {
    shouldShowError.value = true
    performValidation()
  }
})
</script>

<style scoped>
/* Стили для внешнего контейнера */
.coordinate-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

/* Стили для заголовка "Координаты" */
.coordinate-label {
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
  margin-bottom: 0px;
}

/* Стили для обязательной звездочки (скопированы для единообразия) */
.required-asterisk {
  color: #e53e3e; 
  font-size: 14px; 
  margin-left: 2px;
  vertical-align: top; 
  line-height: 1.2; 
}

/* Стили для группы инпутов */
.coordinate-group {
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  justify-content: space-between;
}

.coordinate-group > * {
  flex: 1;
  min-width: 152px;
}

@media (max-width: 768px) {
  .coordinate-group {
    flex-direction: column;
    gap: 12px;
  }

  .coordinate-group > * {
    width: 100%;
    min-width: auto;
  }
}
</style>