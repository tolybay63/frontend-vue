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
        :disabled="disabled"
        :status="getFieldStatus('coordStartKm')"
        @update:modelValue="handleStartKm"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <AppNumberInput
        :modelValue="currentStartPk"
        label="Начало (пк)"
        placeholder="пк"
        :max="10"
        :disabled="disabled"
        :status="getFieldStatus('coordStartPk')"
        @update:modelValue="handleStartPk"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <AppNumberInput
        :modelValue="currentStartZv"
        label="Начало (зв)"
        placeholder="зв"
        :max="4"
        :disabled="disabled"
        :status="getFieldStatus('coordStartZv')"
        @update:modelValue="handleStartZv"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <AppNumberInput
        :modelValue="currentEndKm"
        label="Конец (км)"
        placeholder="км"
        :disabled="disabled"
        :status="getFieldStatus('coordEndKm')"
        @update:modelValue="handleEndKm"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <AppNumberInput
        :modelValue="currentEndPk"
        label="Конец (пк)"
        placeholder="пк"
        :max="10"
        :disabled="disabled"
        :status="getFieldStatus('coordEndPk')"
        @update:modelValue="handleEndPk"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <AppNumberInput
        :modelValue="currentEndZv"
        label="Конец (зв)"
        placeholder="зв"
        :max="4"
        :disabled="disabled"
        :status="getFieldStatus('coordEndZv')"
        @update:modelValue="handleEndZv"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, watch, onMounted } from 'vue'
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      coordStartKm: null,
      coordStartPk: null,
      coordStartZv: null,
      coordEndKm: null,
      coordEndPk: null,
      coordEndZv: null
    })
  },
  objectBounds: {
    type: Object,
    default: null
  },
  // Добавляем пропс required с default: false
  required: {
    type: Boolean,
    default: false
  },
  // Добавляем пропс disabled с default: false
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'invalidRange', 'out-of-bounds'])

const notificationStore = useNotificationStore()

const isUserTyping = ref(false)
const shouldShowError = ref(false)
const isInitialMount = ref(true)

const currentStartKm = computed(() => props.modelValue.coordStartKm ?? null)
const currentStartPk = computed(() => props.modelValue.coordStartPk ?? null)
const currentStartZv = computed(() => props.modelValue.coordStartZv ?? null)
const currentEndKm = computed(() => props.modelValue.coordEndKm ?? null)
const currentEndPk = computed(() => props.modelValue.coordEndPk ?? null)
const currentEndZv = computed(() => props.modelValue.coordEndZv ?? null)

// Расчет абсолютной координаты
const startAbs = computed(() => {
  const km = currentStartKm.value ?? 0
  const pk = currentStartPk.value ?? 0
  const zv = currentStartZv.value ?? 0
  return km * 1000 + pk * 100 + zv * 25
})

const endAbs = computed(() => {
  const km = currentEndKm.value ?? 0
  const pk = currentEndPk.value ?? 0
  const zv = currentEndZv.value ?? 0
  return km * 1000 + pk * 100 + zv * 25
})

// Проверка на пустые обязательные поля
const hasEmptyRequiredFields = computed(() => {
  if (!props.required) return false
  return currentStartKm.value === null || currentStartKm.value === 0 ||
         currentStartPk.value === null || currentStartPk.value === 0 ||
         currentStartZv.value === null || currentStartZv.value === 0 ||
         currentEndKm.value === null || currentEndKm.value === 0 ||
         currentEndPk.value === null || currentEndPk.value === 0 ||
         currentEndZv.value === null || currentEndZv.value === 0
})

const isInvalid = computed(() => {
  // Не проверяем диапазон если есть пустые поля
  if (hasEmptyRequiredFields.value) return false
  return startAbs.value > endAbs.value
})

const isOutOfBounds = computed(() => {
  if (!props.objectBounds) return false

  const startZv = props.objectBounds.StartLink ?? props.objectBounds.StartZv ?? 0;
  const finishZv = props.objectBounds.FinishLink ?? props.objectBounds.FinishZv ?? 0;

  const objStartAbs = (props.objectBounds.StartKm ?? 0) * 1000 +
                      (props.objectBounds.StartPicket ?? 0) * 100 +
                      startZv * 25;
  const objEndAbs = (props.objectBounds.FinishKm ?? 0) * 1000 +
                    (props.objectBounds.FinishPicket ?? 0) * 100 +
                    finishZv * 25;

  return startAbs.value < objStartAbs || endAbs.value > objEndAbs
})

// Computed для определения статуса каждого поля
const getFieldStatus = (field) => {
  if (!shouldShowError.value) return null

  // Проверка на пустое обязательное поле
  if (props.required) {
    const value = props.modelValue[field]
    if (value === null || value === 0 || value === '') {
      return 'error'
    }
  }

  if (fieldErrors.value[field]) return 'error'
  if (isInvalid.value || isOutOfBounds.value) return 'error'
  return null
}

// Валидация отдельных полей
const fieldErrors = ref({
  coordStartKm: null,
  coordStartPk: null,
  coordStartZv: null,
  coordEndKm: null,
  coordEndPk: null,
  coordEndZv: null
})

const validateField = (field, value, min, max) => {
  if (value == null || value === '') {
    fieldErrors.value[field] = null
    return true
  }

  const num = Number(value)

  if (num < min) {
    fieldErrors.value[field] = `Значение не может быть меньше ${min}`
    return false
  }

  if (num > max) {
    fieldErrors.value[field] = 'Некорректное значение координат'
    return false
  }

  fieldErrors.value[field] = null
  return true
}

const clamp = (value, min, max) => {
  if (value == null || isNaN(value)) return null
  const num = Math.floor(Number(value))
  return Math.max(min, Math.min(max, num))
}

const updateCoords = (field, value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}

const handleStartKm = (value) => {
  if (value === 0) {
    fieldErrors.value.coordStartKm = 'Значение не может быть меньше 1'
    updateCoords('coordStartKm', value)
    notificationStore.showNotification('Значение не может быть меньше 1', 'error')
    return
  }
  const clamped = clamp(value, 1, 999)
  validateField('coordStartKm', clamped, 1, 999)
  updateCoords('coordStartKm', clamped)
}

const handleStartPk = (value) => {
  if (value === 0) {
    fieldErrors.value.coordStartPk = 'Значение не может быть меньше 1'
    updateCoords('coordStartPk', value)
    notificationStore.showNotification('Значение не может быть меньше 1', 'error')
    return
  }
  const clamped = clamp(value, 1, 10)
  validateField('coordStartPk', clamped, 1, 10)
  updateCoords('coordStartPk', clamped)
}

const handleStartZv = (value) => {
  if (value === 0) {
    fieldErrors.value.coordStartZv = 'Значение не может быть меньше 1'
    updateCoords('coordStartZv', value)
    notificationStore.showNotification('Значение не может быть меньше 1', 'error')
    return
  }
  const clamped = clamp(value, 1, 4)
  validateField('coordStartZv', clamped, 1, 4)
  updateCoords('coordStartZv', clamped)
}

const handleEndKm = (value) => {
  if (value === 0) {
    fieldErrors.value.coordEndKm = 'Значение не может быть меньше 1'
    updateCoords('coordEndKm', value)
    notificationStore.showNotification('Значение не может быть меньше 1', 'error')
    return
  }
  const clamped = clamp(value, 1, 999)
  validateField('coordEndKm', clamped, 1, 999)
  updateCoords('coordEndKm', clamped)
}

const handleEndPk = (value) => {
  if (value === 0) {
    fieldErrors.value.coordEndPk = 'Значение не может быть меньше 1'
    updateCoords('coordEndPk', value)
    notificationStore.showNotification('Значение не может быть меньше 1', 'error')
    return
  }
  const clamped = clamp(value, 1, 10)
  validateField('coordEndPk', clamped, 1, 10)
  updateCoords('coordEndPk', clamped)
}

const handleEndZv = (value) => {
  if (value === 0) {
    fieldErrors.value.coordEndZv = 'Значение не может быть меньше 1'
    updateCoords('coordEndZv', value)
    notificationStore.showNotification('Значение не может быть меньше 1', 'error')
    return
  }
  const clamped = clamp(value, 1, 4)
  validateField('coordEndZv', clamped, 1, 4)
  updateCoords('coordEndZv', clamped)
}

const performValidation = () => {
  // Всегда эмитим текущее состояние валидности
  emit('invalidRange', isInvalid.value)

  // Не показываем уведомления при начальной загрузке
  if (isInitialMount.value) {
    return
  }

  // Проверка на пустые обязательные поля
  if (hasEmptyRequiredFields.value) {
    notificationStore.showNotification('Необходимо заполнить все координаты', 'error')
    return
  }

  // Проверка ошибок полей
  const hasFieldErrors = Object.values(fieldErrors.value).some(err => err !== null)
  if (hasFieldErrors) {
    const firstError = Object.values(fieldErrors.value).find(err => err !== null)
    notificationStore.showNotification(firstError, 'error')
    return
  }

  if (isInvalid.value) {
    notificationStore.showNotification('Начальная координата не может быть больше конечной координаты', 'error')
  }

  if (isOutOfBounds.value) {
    emit('out-of-bounds')
    notificationStore.showNotification('Координаты выходят за пределы допустимого диапазона!', 'error')
  } else {
    // Сбрасываем флаг если координаты в пределах
    emit('out-of-bounds', false)
  }
}

const handleFocus = () => {
  isUserTyping.value = true
  shouldShowError.value = false
  // Когда пользователь начинает взаимодействовать, снимаем флаг начальной загрузки
  isInitialMount.value = false
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

// После монтирования компонента даём время для начальной загрузки,
// затем разрешаем показ уведомлений о валидации
onMounted(() => {
  setTimeout(() => {
    isInitialMount.value = false
  }, 1500)
})
</script>

<style scoped>
/* Стили для внешнего контейнера */
.coordinate-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Стили для заголовка "Координаты" */
.coordinate-label {
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
}

/* Стили для обязательной звездочки */
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
  /* Уменьшаем min-width для размещения 6 полей */
  flex: 1;
  min-width: 90px;
}

@media (max-width: 768px) {
  .coordinate-group {
    /* На мобильных устройствах делаем сетку 2x3 */
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .coordinate-group > * {
    width: 100%;
    min-width: auto;
  }
}
</style>