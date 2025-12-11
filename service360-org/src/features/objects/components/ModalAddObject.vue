<template>
  <ModalWrapper
    title="Добавить новый объект"
    @close="closeModal"
    @save="saveData"
  >
    <div class="form-section">
      <AppInput 
      class="col-span-2" 
      id="name" 
      label="Наименование объекта" 
      placeholder="Введите наименование" 
      v-model="form.name" 
      :required="true"
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
      @update:value="onTypeChange"
      />

      <FullCoordinates
      class="col-span-2"
      v-model="coordinates"
      :required="true"
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
      />

      <AppInput 
      class="col-span-2" 
      id="characteristic" 
      label="Характеристика" 
      placeholder="Введите характеристику" 
      v-model="form.characteristic"
      />

      <AppDropdown 
      id="side" 
      label="Сторона" 
      placeholder="Выберите сторону" 
      v-model="form.side" 
      :options="sideOptions" 
      :loading="loadingSides" 
      @update:value="onSideChange"
      />

      <AppInput 
      id="deviceNumber" 
      label="Номер" 
      placeholder="Введите номер прибора" 
      v-model="form.deviceNumber"
      />

      <AppNumberInput 
      id="replacementPeriod" 
      label="Периодичность замены (год)" 
      placeholder="Введите периодичность" 
      v-model="form.replacementPeriod"
      />

      <AppDatePicker 
      id="installDate" 
      label="Дата установки" 
      placeholder="Выберите дату" 
      v-model="form.installDate"
      />

      <AppInput 
      class="col-span-2" 
      id="description" 
      label="Описание объекта" 
      placeholder="Введите примечание..." 
      v-model="form.description" 
      type="textarea"
      />

    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import AppDatePicker from '@/shared/ui/FormControls/AppDatePicker.vue'
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue'
import FullCoordinates from '@/shared/ui/FormControls/FullCoordinates.vue'
import { loadTypes, loadSides, fetchStationOfCoord, saveObjectServed } from '@/shared/api/objects/objectService'
import { getUserData } from '@/shared/api/common/userCache'
import { useNotificationStore } from '@/app/stores/notificationStore'

const notificationStore = useNotificationStore()
const emit = defineEmits(['close', 'save', 'update-table'])

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
    notificationStore.showNotification('Не заполнено "Наименование объекта"', 'error')
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

const saveData = async () => {
  try {
    if (!validateForm()) {
      return
    }
    const user = await getUserData()
    const installDate = formatDateToString(form.value.installDate)
    const createdAt = new Date().toISOString().slice(0, 10)
    const updatedAt = createdAt
    const typeLabel = selectedType.value?.label || ''
    const sideLabel = selectedSide.value?.label || ''
    const sectionName = stationData.value?.name || ''

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
      CreatedAt: createdAt,
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
      fvSide: selectedSide.value?.value ?? null,
      linkCls: selectedType.value?.cls ?? null,
      name: form.value.name || '',
      objObjectType: selectedType.value?.value ?? null,
      objSection: stationData.value?.id ?? null,
      pvObjectType: selectedType.value?.pv ?? null,
      pvSection: stationData.value?.pv ?? null,
      pvSide: selectedSide.value?.pv ?? null,
      objUser: user.id,
      pvUser: user.pv,
    }
    await saveObjectServed(payload)
    notificationStore.showNotification('Объект успешно сохранён!', 'success')
    emit('update-table')
    closeModal()
  } catch (error) {
    notificationStore.showNotification('Ошибка при сохранении объекта', 'error')
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

onMounted(async () => {
  loadingTypes.value = true
  typeOptions.value = await loadTypes()
  loadingTypes.value = false
  loadingSides.value = true
  sideOptions.value = await loadSides()
  loadingSides.value = false
})
</script>

<style scoped>
.form-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  
  padding: 0 32px 32px;
  background-color: #f9fafb;
}
.col-span-2 {
  grid-column: span 2;
}
</style>