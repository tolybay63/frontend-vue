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
        :disabled="disabled"
        :status="shouldShowError && (isInvalid || isOutOfBounds) ? 'error' : null"
        @update:modelValue="handleStartPk"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <AppNumberInput
        :modelValue="currentStartZv"
        label="Начало (зв)"
        placeholder="зв"
        :max="8"
        :disabled="disabled"
        :status="shouldShowError && (isInvalid || isOutOfBounds) ? 'error' : null"
        @update:modelValue="handleStartZv"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <AppNumberInput
        :modelValue="currentEndKm"
        label="Конец (км)"
        placeholder="км"
        :disabled="disabled"
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
        :disabled="disabled"
        :status="shouldShowError && (isInvalid || isOutOfBounds) ? 'error' : null"
        @update:modelValue="handleEndPk"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <AppNumberInput
        :modelValue="currentEndZv"
        label="Конец (зв)"
        placeholder="зв"
        :max="8"
        :disabled="disabled"
        :status="shouldShowError && (isInvalid || isOutOfBounds) ? 'error' : null"
        @update:modelValue="handleEndZv"
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

const currentStartKm = computed(() => props.modelValue.coordStartKm ?? 0)
const currentStartPk = computed(() => props.modelValue.coordStartPk ?? 0)
const currentStartZv = computed(() => props.modelValue.coordStartZv ?? 0)
const currentEndKm = computed(() => props.modelValue.coordEndKm ?? 0)
const currentEndPk = computed(() => props.modelValue.coordEndPk ?? 0)
const currentEndZv = computed(() => props.modelValue.coordEndZv ?? 0)

// Расчет абсолютной координаты
const startAbs = computed(() => currentStartKm.value * 1000 + currentStartPk.value * 100 + currentStartZv.value * 25)
const endAbs = computed(() => currentEndKm.value * 1000 + currentEndPk.value * 100 + currentEndZv.value * 25)

const isInvalid = computed(() => startAbs.value > endAbs.value)

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
const handleStartZv = (value) => updateCoords('coordStartZv', clamp(value, 0, 99))
const handleEndKm = (value) => updateCoords('coordEndKm', clamp(value, 0, 9999))
const handleEndPk = (value) => updateCoords('coordEndPk', clamp(value, 0, 10))
const handleEndZv = (value) => updateCoords('coordEndZv', clamp(value, 0, 99))

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