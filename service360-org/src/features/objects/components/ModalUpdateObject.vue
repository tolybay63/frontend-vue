<template>
  <ModalWrapper
    title="Редактировать объект"
    @close="closeModal"
    :show-save="canUpdate"
    :show-delete="canDelete"
    @save="saveData"
    @delete="handleDelete"
  >
    <div class="form-section">
      <AppInput 
        class="col-span-2" 
        id="name" 
        label="Наименование объекта" 
        placeholder="Введите наименование" 
        v-model="form.name" 
        :required="true"
        :disabled="!canUpdate"
      />

      <AppDropdown 
        class="col-span-2" 
        id="type" 
        label="Вид объекта" 
        placeholder="Выберите вид объекта" 
        v-model="form.type" 
        :options="typeOptions" 
        :loading="loadingTypes" 
        :required="true" 
        :disabled="true"
        @update:value="onTypeChange"
      />

      <FullCoordinates
      class="col-span-2"
      v-model="coordinates"
      :required="true"
      :disabled="!canUpdate"
      />

      <AppInput 
        class="col-span-2" 
        id="place" 
        label="Место" 
        placeholder="Введите место" 
        v-model="form.place" 
        :disabled="true"
        :required="true" 
      />

      <AppInput 
        class="col-span-2" 
        id="additionalInfo" 
        label="Дополнительные сведения" 
        placeholder="Введите сведения" 
        v-model="form.additionalInfo"
        :disabled="!canUpdate"
      />

      <AppInput 
        class="col-span-2" 
        id="characteristic" 
        label="Характеристика" 
        placeholder="Введите характеристику" 
        v-model="form.characteristic"
        :disabled="!canUpdate"
      />

      <AppDropdown 
        id="side" 
        label="Сторона" 
        placeholder="Выберите сторону" 
        v-model="form.side" 
        :options="sideOptions" 
        :loading="loadingSides" 
        @update:value="onSideChange"
        :disabled="!canUpdate"
      />

      <AppInput 
        id="deviceNumber" 
        label="Номер" 
        placeholder="Введите номер прибора" 
        v-model="form.deviceNumber"
        :disabled="!canUpdate"
      />

      <AppNumberInput 
        id="replacementPeriod" 
        label="Периодичность замены (год)" 
        placeholder="Введите периодичность" 
        v-model="form.replacementPeriod"
        :disabled="!canUpdate"
      />

      <AppDatePicker 
        id="installDate" 
        label="Дата установки" 
        placeholder="Выберите дату" 
        v-model="form.installDate"
        :disabled="!canUpdate"
      />

      <AppInput 
        class="col-span-2" 
        id="description" 
        label="Описание объекта" 
        placeholder="Введите примечание..." 
        v-model="form.description" 
        type="textarea"
        :disabled="!canUpdate"
      />
    </div>

    <ConfirmationModal
      v-if="showConfirmModal"
      title="Удаление объекта"
      message="Вы действительно хотите удалить этот объект?"
      @confirm="confirmDelete"
      @cancel="showConfirmModal = false" />
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import AppDatePicker from '@/shared/ui/FormControls/AppDatePicker.vue'
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue'
import FullCoordinates from '@/shared/ui/FormControls/FullCoordinates.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue'
import { loadTypes, loadSides, fetchStationOfCoord, deleteObject, updateObjectServed } from '@/shared/api/objects/objectService'
import { getUserData } from '@/shared/api/common/userCache'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { usePermissions } from '@/shared/api/auth/usePermissions';

const props = defineProps({
  rowData: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'save', 'deleted'])

const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions();
const canUpdate = computed(() => hasPermission('obj:upd'));
const canDelete = computed(() => hasPermission('obj:del'));


const form = ref({
  name: '',
  type: null,
  additionalInfo: '',
  characteristic: '',
  side: null,
  deviceNumber: '',
  replacementPeriod: null,
  installDate: null,
  description: '',
  place: '',
})

const coordinates = ref({
  coordStartKm: 0,
  coordStartPk: 0,
  coordStartZv: 0,
  coordEndKm: 0,
  coordEndPk: 0,
  coordEndZv: 0,
})

const typeOptions = ref([])
const sideOptions = ref([])
const loadingTypes = ref(false)
const loadingSides = ref(false)
const selectedType = ref(null)
const selectedSide = ref(null)
const stationData = ref(null)
const isFetching = ref(false)
const showConfirmModal = ref(false)
let fetchTimeout = null

const closeModal = () => emit('close')

const formatDateToString = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const validateForm = () => {
  if (!form.value.name.trim()) {
    notificationStore.showNotification('Не заполнено Наименование объекта', 'error')
    return false
  }
  if (!form.value.type) {
    notificationStore.showNotification('Не выбран Вид объекта', 'error')
    return false
  }
  if (!form.value.place || form.value.place === 'Место не найдено') {
    notificationStore.showNotification('Не удалось определить "Место" по координатам. Проверьте координаты', 'error')
    return false
  }
  return true
}

onMounted(async () => {
  loadingTypes.value = true
  typeOptions.value = await loadTypes()
  loadingTypes.value = false

  loadingSides.value = true
  sideOptions.value = await loadSides()
  loadingSides.value = false

  if (props.rowData) {
    form.value = {
      name: props.rowData.name,
      type: props.rowData.objObjectType || null,
      additionalInfo: props.rowData.location,
      characteristic: props.rowData.feature,
      side: props.rowData.fvSide || null,
      deviceNumber: props.rowData.number,
      replacementPeriod: props.rowData.replacement,
      installDate: props.rowData.installDate ? new Date(props.rowData.installDate.split('.').reverse().join('-')) : null,
      description: props.rowData.description,
      place: props.rowData.sectionName || '',
    }

    coordinates.value = {
      coordStartKm: props.rowData.rawData?.StartKm ?? 0,
      coordStartPk: props.rowData.rawData?.StartPicket ?? 0,
      coordStartZv: props.rowData.rawData?.StartLink ?? 0,
      coordEndKm: props.rowData.rawData?.FinishKm ?? 0,
      coordEndPk: props.rowData.rawData?.FinishPicket ?? 0,
      coordEndZv: props.rowData.rawData?.FinishLink ?? 0,
    }
  }
})

const saveData = async () => {
  if (!validateForm()) {
    return
  }
  try {
    const user = await getUserData()
    const installDate = formatDateToString(form.value.installDate)
    const updatedAt = new Date().toISOString().slice(0, 10)
    const typeLabel = selectedType.value?.label || typeOptions.value.find(t => t.value === form.value.type)?.label || ''
    const sideLabel = selectedSide.value?.label || sideOptions.value.find(s => s.value === form.value.side)?.label || ''
    const sectionName = stationData.value?.name || props.rowData.nameSection || form.value.place || ''

    const startCoordStr = `${coordinates.value.coordStartKm ?? ''}км` +
      (coordinates.value.coordStartPk != null ? ` ${coordinates.value.coordStartPk}пк` : '') +
      (coordinates.value.coordStartZv != null ? ` ${coordinates.value.coordStartZv}зв` : '')

    const endCoordStr = `${coordinates.value.coordEndKm ?? ''}км` +
      (coordinates.value.coordEndPk != null ? ` ${coordinates.value.coordEndPk}пк` : '') +
      (coordinates.value.coordEndZv != null ? ` ${coordinates.value.coordEndZv}зв` : '')

    const coordsString = `[${startCoordStr} - ${endCoordStr}]`

    const fullName = [form.value.name || '', form.value.additionalInfo || '', coordsString, sideLabel ? `[${sideLabel}]` : '', `[${typeLabel}]`, `[${sectionName}]`]
      .filter(Boolean).join(' ').trim()

    const payload = {
      ...props.rowData.rawData, // Используем rawData для сохранения всех id/cls и прочих полей
      id: props.rowData.id, // Явно указываем id для обновления
      cls: props.rowData.cls, // Явно указываем cls для обновления
      Description: form.value.description || '',
      FinishKm: coordinates.value.coordEndKm,
      FinishPicket: coordinates.value.coordEndPk,
      FinishLink: coordinates.value.coordEndZv,
      InstallationDate: installDate,
      LocationDetails: form.value.additionalInfo || '',
      Number: form.value.deviceNumber || '',
      PeriodicityReplacement: form.value.replacementPeriod || '',
      Specs: form.value.characteristic || '',
      StartKm: coordinates.value.coordStartKm,
      StartPicket: coordinates.value.coordStartPk,
      StartLink: coordinates.value.coordStartZv,
      UpdatedAt: updatedAt,
      fullName,
      fvSide: form.value.side,
      linkCls: props.rowData.rawData?.linkCls ?? null,
      name: form.value.name || '',
      objObjectType: form.value.type,
      pvObjectType: props.rowData.rawData?.pvObjectType ?? null,
      pvSide: selectedSide.value?.pv ?? (form.value.side === null ? null : props.rowData.rawData?.pvSide),
      objUser: user.id,
      pvUser: user.pv,
      // idSection остается из базы (rawData), а objSection и pvSection обновляются если координаты изменились
      objSection: stationData.value?.id ?? props.rowData.rawData?.objSection,
      pvSection: stationData.value?.pv ?? props.rowData.rawData?.pvSection,
    }

    // Удаляем поля, которые не должны отправляться или отправляются автоматом
    delete payload.nameObjectType
    delete payload.nameSection
    delete payload.nameSide
    
    // Используем новый метод для обновления
    await updateObjectServed(payload) 
    
    notificationStore.showNotification('Объект успешно обновлён!', 'success')
    emit('save')
  } catch (error) {
    console.error(error)
    notificationStore.showNotification('Ошибка при обновлении объекта', 'error')
  }
}

const handleDelete = () => {
  if (!props.rowData?.id) {
    notificationStore.showNotification('Не удалось получить ID объекта для удаления.', 'error')
    return
  }
  showConfirmModal.value = true
}

const confirmDelete = async () => {
  showConfirmModal.value = false
  try {
    await deleteObject(props.rowData.id)
    notificationStore.showNotification('Объект успешно удален!', 'success')
    emit('deleted')
  } catch (error) {
    console.error('Ошибка при удалении объекта:', error)
    notificationStore.showNotification('Ошибка при удалении объекта.', 'error')
  }
}

const onTypeChange = (value) => {
  selectedType.value = typeOptions.value.find(t => t.value === value)
}

const onSideChange = (value) => {
  selectedSide.value = sideOptions.value.find(s => s.value === value)
}

const fetchPlace = async () => {
  const { coordStartKm, coordStartPk, coordStartZv, coordEndKm, coordEndPk, coordEndZv } = coordinates.value
  if (coordStartKm == null || coordEndKm == null) return
  isFetching.value = true
  const data = await fetchStationOfCoord({
    StartKm: coordStartKm,
    FinishKm: coordEndKm,
    StartPicket: coordStartPk,
    FinishPicket: coordEndPk,
    StartLink: coordStartZv,
    FinishLink: coordEndZv,
  })
  const records = data?.result?.records || []
  if (records.length > 0) {
    form.value.place = records[0].name
    stationData.value = records[0]
  } else {
    form.value.place = 'Место не найдено'
    stationData.value = null
  }
  isFetching.value = false
}

watch(
  () => ({ ...coordinates.value }),
  () => {
    if (fetchTimeout) clearTimeout(fetchTimeout)
    fetchTimeout = setTimeout(() => fetchPlace(), 800)
  },
  { deep: true }
)
</script>

<style scoped>
.form-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  padding: 0 32px 32px;
  background-color: #f9fafb;
}
.col-span-2 {
  grid-column: span 2;
}
</style>