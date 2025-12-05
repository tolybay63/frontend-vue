<template>
  <ModalWrapper
    title="Информация о параметре"
    @close="closeModal"
    :show-save="false"
    :show-cancel="true"
    :show-delete="canDelete"
    @delete="onDeleteClicked"
  >
    <div class="form-section">
      <AppInput
        class="col-span-2"
        id="nameObject"
        label="Объект"
        v-model="form.nameObject"
        :disabled="true"
      />

      <AppInput
        id="nameLocationClsSection"
        label="Участок"
        v-model="form.nameLocationClsSection"
        :disabled="true"
      />
      
      <AppInput
        id="nameSection"
        label="Место"
        v-model="form.nameSection"
        :disabled="true"
      />

      <FullCoordinates
        v-model="form.parsedCoordinates"
        label="Координаты"
        class="col-span-2"
        :disabled="true" 
      />

      <AppInput
        class="col-span-2"
        id="nameComponent"
        label="Компонент"
        v-model="form.nameComponent"
        :disabled="true"
      />

      <AppInput
        class="col-span-2"
        id="nameComponentParams"
        label="Параметр"
        v-model="form.nameComponentParams"
        :disabled="true"
      />

      <AppInput
        id="paramsLimitMin"
        label="Значение (Min)"
        :model-value="minLimitDisplay"
        :disabled="true"
      />

      <AppInput
        id="paramsLimitMax"
        label="Значение (Max)"
        :model-value="String(form.paramsLimitMax ?? '')"
        :disabled="true"
      />
      
      <AppInput
        id="paramsLimit"
        label="Значение"
        :model-value="String(form.paramsLimit ?? '')"
        :disabled="true"
      />

      <AppDatePicker
        id="factDateEnd"
        label="Дата проверки"
        v-model="form.factDateEnd"
        :disabled="true"
      />
      
    </div>
  </ModalWrapper>

  <ConfirmationModal
    v-if="showConfirmModal"
    title="Удаление параметра"
    :message="`Вы действительно хотите удалить запись о параметре?`"
    @confirm="onConfirmDelete"
    @cancel="onCancelDelete"
  />
</template>

<script setup>
import { ref, onMounted, defineEmits, defineProps, computed } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDatePicker from '@/shared/ui/FormControls/AppDatePicker.vue'
import FullCoordinates from '@/shared/ui/FormControls/FullCoordinates.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue'
import { deleteFaultOrParameter } from '@/shared/api/defects/faultApi'
import { usePermissions } from '@/shared/api/permissions/usePermissions';
import { useNotificationStore } from '@/app/stores/notificationStore'

const emit = defineEmits(['close', 'deleted'])
const props = defineProps({
  rowData: {
    type: Object,
    required: true
  }
})

const showConfirmModal = ref(false)
const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions()
const canDelete = computed(() => hasPermission('par:del'))

const initialCoordinates = { 
  coordStartKm: null, 
  coordStartPk: null, 
  coordStartZv: null, 
  coordEndKm: null, 
  coordEndPk: null, 
  coordEndZv: null 
}

const form = ref({
  // Оставленные поля
  factDateEnd: null,
  nameLocationClsSection: '',
  nameSection: '',
  nameObject: '',
  parsedCoordinates: { ...initialCoordinates },
  nameComponent: '',
  nameComponentParams: '',
  paramsLimitMin: '',
  paramsLimitMax: '',
  paramsLimit: '',
  
  rawData: null, 
  id: null, // Добавлено поле для хранения ID записи для удаления
})

const minLimitDisplay = computed(() => {
  const value = form.value.paramsLimitMin;
  if (value === null || value === undefined || value === '') {
    return '0'
  }
  return String(value);
})

const closeModal = () => {
  emit('close')
}

const parseDateForPicker = (dateString) => {
  return dateString || null
}

const parseCoordinatesString = (coordsString, rawData) => {
  const result = { ...initialCoordinates }
  
  if (rawData) {
    result.coordStartKm = rawData.StartKm
    result.coordStartPk = rawData.StartPicket
    result.coordStartZv = rawData.StartLink || null
    
    result.coordEndKm = rawData.FinishKm
    result.coordEndPk = rawData.FinishPicket
    result.coordEndZv = rawData.FinishLink || null
  } else if (coordsString) {
    const match = coordsString.match(/(\d+) км (\d+) пк - (\d+) км (\d+) пк/)
    if (match) {
      result.coordStartKm = parseInt(match[1])
      result.coordStartPk = parseInt(match[2])
      result.coordEndKm = parseInt(match[3])
      result.coordEndPk = parseInt(match[4])
    }
  }
  
  return result
}

const fillFormWithData = () => {
  const data = props.rowData

  form.value.factDateEnd = parseDateForPicker(data.FactDateEnd)
  form.value.nameLocationClsSection = data.nameLocationClsSection || ''
  form.value.nameSection = data.nameSection || ''
  form.value.nameObject = data.nameObject || ''
  form.value.parsedCoordinates = parseCoordinatesString(data.coordinates, data.rawData)
  form.value.nameComponent = data.nameComponent || ''
  form.value.nameComponentParams = data.nameComponentParams || ''
  form.value.paramsLimitMin = data.ParamsLimitMin
  form.value.paramsLimitMax = data.ParamsLimitMax || ''
  form.value.paramsLimit = data.ParamsLimit || ''
  form.value.id = data.rawData?.id || null
}

onMounted(() => {
  fillFormWithData()
})

const onDeleteClicked = () => {
  showConfirmModal.value = true
}

const onCancelDelete = () => {
  showConfirmModal.value = false
}

const onConfirmDelete = async () => {
  showConfirmModal.value = false
  
  const recordId = form.value.id

  if (!recordId) {
    console.error('Не удалось получить ID записи для удаления.')
    notificationStore.showNotification('Не удалось получить ID записи для удаления.', 'error')
    return
  }

  try {
    await deleteFaultOrParameter(recordId)
    
    notificationStore.showNotification('Параметр успешно удален!', 'success')

    emit('deleted') 

  } catch (error) {
    console.error('Ошибка при удалении записи параметра:', error)

    notificationStore.showNotification('Ошибка при удалении параметра.', 'error')
  }
}
</script>

<style scoped>
.form-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  padding: 32px;
  background-color: #f9fafb;
}

.col-span-2 {
  grid-column: span 2;
}
</style>