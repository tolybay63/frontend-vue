<template>
  <ModalWrapper
    title="Редактировать организационную структуру"
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
        label="Наименование"
        placeholder="Введите наименование"
        v-model="form.name"
        :required="true"
        :disabled="!canUpdate" />

      <AppDropdown
        class="col-span-2"
        id="parent"
        label="Родительское подразделение"
        placeholder="Выберите родительское подразделение"
        v-model="form.parent"
        :options="parentOptions"
        :loading="loadingParents"
        :required="true"
        :disabled="!canUpdate" />

      <AppDropdown
        id="activityType"
        label="Вид деятельности"
        placeholder="Выберите вид деятельности"
        :options="activityOptions"
        :loading="loadingActivities"
        v-model="form.activityType"
        @update:value="handleActivityTypeChange"
        :required="true"
        :disabled="true" />

      <AppDropdown
        id="region"
        label="Регион"
        placeholder="Выберите регион"
        v-model="form.region"
        :options="regionOptions"
        :loading="loadingRegions"
        :required="true"
        :disabled="!canUpdate" />

      <div class="col-span-2" v-if="form.activityType?.value === 1069">
        <h4 class="section-title">Дополнительная информация</h4>
        <div class="coordinate-grid">
          <AppInput
            id="address"
            label="Адрес"
            placeholder="Введите адрес"
            v-model="form.address"
            :required="true"
            :disabled="!canUpdate" />
          <PhoneInput
            id="phone"
            label="Номер телефона"
            placeholder="Введите номер телефона"
            v-model="form.phone"
            :required="true"
            :disabled="!canUpdate" />
        </div>
      </div>

      <div class="col-span-2" v-if="form.activityType?.value === 1070">
        <h4 class="section-title">Дополнительная информация</h4>
        <div class="coordinate-grid">
          <CoordinateInputs
            v-model="form.coordinates"
            :required="true"
            :disabled="!canUpdate" />
          <AppInput
            class="col-span-2"
            id="distance"
            label="Протяженность (км)"
            placeholder="Введите координаты"
            v-model="form.distance"
            :disabled="true"
            :required="true" />
          <MultipleSelect
            class="col-span-2"
            id="multi"
            label="Обслуживаемые объекты"
            v-model="form.multipleSelect"
            :options="multiOptions"
            placeholder="Выберите объекты"
            :required="false"
            :disabled="!canUpdate"
            :fallback-option="(val) => ({ label: val, value: val })"
          />
        </div>
      </div>

      <AppInput
        class="col-span-2"
        id="description"
        label="Описание"
        placeholder="Введите описание..."
        v-model="form.description"
        type="textarea"
        :required="true"
        :disabled="!canUpdate" />

      <div class="active-row">
        <label for="active">Активно</label>
        <n-switch
          id="active"
          :value="form.active?.id === trueOption?.id"
          :disabled="!canUpdate"
          @update:value="val => form.active = val ? trueOption : falseOption"
        />
      </div>
    </div>

    <ConfirmationModal
      v-if="showConfirmModal"
      title="Удаление организационной структуры"
      message="Вы действительно хотите удалить эту организационную структуру?"
      @confirm="confirmDelete"
      @cancel="showConfirmModal = false" />
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import PhoneInput from '@/shared/ui/FormControls/PhoneInput.vue'
import CoordinateInputs from '@/shared/ui/FormControls/CoordinateInputs.vue'
import MultipleSelect from '@/shared/ui/FormControls/MultipleSelect.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue'
import { usePermissions } from '@/shared/api/auth/usePermissions'

import {
  fetchParentDepartments,
  fetchActivityTypes,
  fetchRegions,
  fetchActiveOptions,
  loadTypes
} from '@/shared/api/organization/organizationService'

import { updateLocation, deleteLocation } from '@/shared/api/locations/locationService'
import { useNotificationStore } from '@/app/stores/notificationStore'

const props = defineProps({
  locationData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'update-table', 'deleted'])

const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions()
const canUpdate = computed(() => hasPermission('org:upd'))
const canDelete = computed(() => hasPermission('org:del'))

const showConfirmModal = ref(false)

// Helper function to parse coordinates from km to km+pk
const parseKmToPkFormat = (kmValue) => {
  if (!kmValue) return { km: null, pk: null }
  const km = Math.floor(kmValue)
  const pk = Math.round((kmValue - km) * 10)
  return { km, pk }
}

// Initialize form with existing data
const startCoords = parseKmToPkFormat(props.locationData.StartKm)
const finishCoords = parseKmToPkFormat(props.locationData.FinishKm)

const form = ref({
  name: props.locationData.name || '',
  parent: null,
  activityType: null,
  region: null,
  address: props.locationData.Address || '',
  phone: props.locationData.Phone || '',
  description: props.locationData.Description || '',
  coordinates: {
    coordStartKm: startCoords.km,
    coordStartPk: startCoords.pk,
    coordEndKm: finishCoords.km,
    coordEndPk: finishCoords.pk
  },
  distance: props.locationData.StageLength || '',
  multipleSelect: [],
  active: null,
  rawData: props.locationData
})

const parentOptions = ref([])
const loadingParents = ref(false)

const activityOptions = ref([])
const loadingActivities = ref(false)

const regionOptions = ref([])
const loadingRegions = ref(false)

const trueOption = ref(null)
const falseOption = ref(null)

const multiOptions = ref([])

const closeModal = () => {
  emit('close')
}

const saveData = async () => {
  try {
    await updateLocation(
      form.value,
      multiOptions.value,
      regionOptions.value,
      trueOption.value,
      falseOption.value
    )
    notificationStore.showNotification('Организационная структура успешно обновлена!', 'success')
    emit('update-table')
    closeModal()
  } catch (e) {
    console.error('Ошибка при обновлении:', e)
    notificationStore.showNotification('Ошибка при обновлении структуры', 'error')
  }
}

const handleActivityTypeChange = (selectedOption) => {
  const selectedId = selectedOption?.value
  if (selectedId === 1069 || selectedId === 1070) {
    form.value.address = ''
    form.value.phone = ''
    form.value.coordinates = {
      coordStartKm: 0,
      coordStartPk: 0,
      coordEndKm: 0,
      coordEndPk: 0
    }
    form.value.distance = ''
  }
}

// Delete handlers
const handleDelete = () => {
  if (!props.locationData?.id) {
    notificationStore.showNotification('Не удалось получить ID организационной структуры для удаления.', 'error')
    return
  }
  showConfirmModal.value = true
}

const confirmDelete = async () => {
  showConfirmModal.value = false
  try {
    await deleteLocation(props.locationData.id)
    notificationStore.showNotification('Организационная структура успешно удалена!', 'success')
    emit('deleted')
  } catch (error) {
    console.error('Ошибка при удалении организационной структуры:', error)
    notificationStore.showNotification('Ошибка при удалении организационной структуры.', 'error')
  }
}

watch(
  [
    () => form.value.coordinates.coordStartKm,
    () => form.value.coordinates.coordStartPk,
    () => form.value.coordinates.coordEndKm,
    () => form.value.coordinates.coordEndPk,
  ],
  ([startKm, startPk, endKm, endPk]) => {
    const skm = parseFloat(startKm)
    const spk = parseFloat(startPk)
    const ekm = parseFloat(endKm)
    const epk = parseFloat(endPk)

    const isValid = [skm, spk, ekm, epk].every(n => Number.isFinite(n))

    if (!isValid) {
      form.value.distance = ''
      return
    }

    const startTotal = skm * 1000 + spk * 100
    const endTotal = ekm * 1000 + epk * 100
    const diff = endTotal - startTotal

    if (diff >= 0) {
      form.value.distance = (diff / 1000).toFixed(2)
    } else {
      form.value.distance = 'Неверные данные'
    }
  }
)

onMounted(async () => {
  try {
    loadingParents.value = true
    parentOptions.value = (await fetchParentDepartments()).map(item => ({
      label: item.name,
      value: item.id
    }))

    // Set selected parent
    if (props.locationData.parent) {
      const selectedParent = parentOptions.value.find(opt => opt.value === props.locationData.parent)
      if (selectedParent) {
        form.value.parent = selectedParent
      }
    }
  } catch (e) {
    notificationStore.showNotification('Ошибка загрузки подразделений', 'error')
  } finally {
    loadingParents.value = false
  }

  try {
    loadingActivities.value = true
    activityOptions.value = (await fetchActivityTypes()).map(item => ({
      label: item.name,
      value: item.id
    }))

    // Set selected activity type (cls is the activity type ID)
    if (props.locationData.cls) {
      const selectedActivity = activityOptions.value.find(opt => opt.value === props.locationData.cls)
      if (selectedActivity) {
        form.value.activityType = selectedActivity
      }
    }
  } catch (e) {
    notificationStore.showNotification('Ошибка загрузки видов деятельности', 'error')
  } finally {
    loadingActivities.value = false
  }

  try {
    loadingRegions.value = true
    const rawRegions = await fetchRegions()
    regionOptions.value = rawRegions.map(item => ({
      label: item.name,
      value: item.id,
      id: item.id,
      name: item.name,
      pv: item.pv,
      factor: item.factor,
    }))

    // Set selected region
    if (props.locationData.fvRegion) {
      const selectedRegion = regionOptions.value.find(opt => opt.id === props.locationData.fvRegion)
      if (selectedRegion) {
        form.value.region = selectedRegion
      }
    }
  } catch (e) {
    notificationStore.showNotification('Ошибка загрузки регионов', 'error')
  } finally {
    loadingRegions.value = false
  }

  try {
    const activeOptions = await fetchActiveOptions()
    trueOption.value = activeOptions.find(opt => opt.name.toLowerCase() === 'да')
    falseOption.value = activeOptions.find(opt => opt.name.toLowerCase() === 'нет')

    // Set active status based on current data
    if (props.locationData.fvIsActive) {
      const matchingOption = activeOptions.find(opt => opt.id === props.locationData.fvIsActive)
      form.value.active = matchingOption || falseOption.value
    } else {
      form.value.active = falseOption.value
    }
  } catch (e) {
    notificationStore.showNotification('Ошибка загрузки флага активности', 'error')
  }

  try {
    multiOptions.value = await loadTypes()

    // Set selected multi options
    if (props.locationData.objObjectTypeMulti) {
      const selectedIds = props.locationData.objObjectTypeMulti.split(',').map(id => parseInt(id.trim()))
      form.value.multipleSelect = selectedIds
    }
  } catch (e) {
    notificationStore.showNotification('Ошибка загрузки типов объектов', 'error')
  }
})
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

.coordinate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  
}

.active-row {
  display: flex;
  align-items: center;
  
  grid-column: span 2;
  font-size: 14px;
  font-weight: 500;
  color: #2d3748;
}

#distance {
  grid-column: span 2;
}
</style>
