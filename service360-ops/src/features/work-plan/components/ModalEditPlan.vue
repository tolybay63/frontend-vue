<template>
  <ModalWrapper
    :title="modalTitle"
    :show-delete="canDelete"
    @close="closeModal"
    :show-cancel="canUpdate"
    :show-save="canUpdate"
    @save="saveData"
    @delete="confirmDelete"
  >
    <div class="form-section">
      <AppDropdown
        class="col-span-2"
        id="work"
        label="Работа"
        placeholder="Выберите работу"
        v-model="form.work"
        :options="workOptions"
        :loading="loadingWorks"
        @update:value="onWorkChange"
        :disabled="true"
        :required="true" />

      <div class="col-span-2">
        <div class="object-header">
          <h4 class="section-title">Объект</h4>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppDropdown
            class="col-span-1"
            id="place"
            label="Место"
            placeholder="Выберите место"
            v-model="form.place"
            :options="placeOptions"
            :loading="loadingPlaces"
            @update:value="onPlaceChange"
            :required="true" />

          <AppDropdown
            class="col-span-1"
            id="objectType"
            label="Тип объекта"
            placeholder="Выберите тип объекта"
            v-model="form.objectType"
            :options="objectTypeOptions"
            :loading="loadingObjectTypes"
            @update:value="onObjectTypeChange"
            :required="true" />

          <AppDropdown
            class="col-span-2"
            id="object"
            label="Объект"
            placeholder="Выберите объект"
            v-model="form.object"
            :options="objectOptions"
            :loading="loadingObjects"
            @update:value="onObjectChange"
            :required="true" />

          <CoordinateInputs
            class="col-span-2"
            v-model="coordinates"
            :object-bounds="objectBounds"
            @update:modelValue="updateCoordinates"
            @invalid-range="handleInvalidRange"
            @out-of-bounds="handleOutOfBounds"
            :required="true" />

          <AppDropdown
            class="col-span-1"
            id="section"
            label="Участок"
            placeholder="Выберите участок"
            v-model="form.section"
            :options="sectionOptions"
            :loading="loadingSections"
            @update:value="onSectionChange"
            :required="true" />

          <AppDatePicker
            class="col-span-1"
            id="plannedDate"
            label="Плановый срок завершения"
            placeholder="Выберите дату"
            v-model="form.plannedDate"
            :required="true" />
        </div>
      </div>
    </div>
  </ModalWrapper>

  <ConfirmationModal
    v-if="showConfirmationModal"
    title="Подтверждение удаления"
    message="Вы уверены, что хотите удалить этот план? Это действие нельзя отменить."
    @confirm="deletePlan"
    @cancel="showConfirmationModal = false"
  />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppDatePicker from '@/shared/ui/FormControls/AppDatePicker.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import CoordinateInputs from '@/shared/ui/FormControls/CoordinateInputs.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { usePermissions } from '@/shared/api/permissions/usePermissions';
import { fetchWorks, fetchLocationByCoords, fetchObjectsForSelect } from '@/shared/api/plans/planWorkApi'
import { updatePlan } from '@/shared/api/plans/updatePlanApi'
import { deletePlan as deletePlanApi } from '@/shared/api/plans/deletePlanApi'

const props = defineProps({
  rowData: { type: Object, required: true }
})

const emit = defineEmits(['close', 'save'])
const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions()
const canUpdate = computed(() => hasPermission('plan:upd'))
const canDelete = computed(() => hasPermission('plan:del'))

const modalTitle = computed(() => canUpdate.value ? 'Редактировать плановую работу' : 'Просмотр плановой работы')


const form = ref({
  work: null,
  place: null,
  objectType: null,
  object: null,
  section: null,
  plannedDate: null
})

const coordinates = ref({
  coordStartKm: 0,
  coordStartPk: 0,
  coordEndKm: 0,
  coordEndPk: 0
})

const objectBounds = ref(null)

const workOptions = ref([])
const placeOptions = ref([])
const objectTypeOptions = ref([])
const objectOptions = ref([])
const sectionOptions = ref([])

const loadingWorks = ref(false)
const loadingPlaces = ref(false)
const loadingObjectTypes = ref(false)
const loadingObjects = ref(false)
const loadingSections = ref(false)

const fullRecordsForWork = ref([])

const selectedWorkData = ref(null)
const selectedObjectData = ref(null)
const selectedSectionData = ref(null)

const showConfirmationModal = ref(false) // State for the confirmation modal

const closeModal = () => emit('close')

const formatDateForBackend = (date) => {
  if (!date) return null
  let d = typeof date === 'string' ? new Date(date) : new Date(date)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const saveData = async () => {
  try {
    if (!form.value.work) {
      notificationStore.showNotification('Не выбрана работа', 'error')
      return
    }
    if (!form.value.object) {
      notificationStore.showNotification('Не выбран объект', 'error')
      return
    }

    const startAbs = coordinates.value.coordStartKm * 1000 + coordinates.value.coordStartPk * 100
    const endAbs = coordinates.value.coordEndKm * 1000 + coordinates.value.coordEndPk * 100

    if (startAbs > endAbs) {
      notificationStore.showNotification('Начало не может быть больше конца', 'error')
      return
    }

    if (objectBounds.value) {
      const objStartAbs = objectBounds.value.startAbs
      const objEndAbs = objectBounds.value.endAbs
      if (startAbs < objStartAbs || endAbs > objEndAbs) {
        notificationStore.showNotification('Координаты не могут выходить за границы выбранного объекта', 'error')
        return
      }
    }

    const original = props.rowData.rawData
    const updatedPlan = { ...original }

    if (selectedWorkData.value) {
      updatedPlan.objWork = selectedWorkData.value.value
      updatedPlan.pvWork = selectedWorkData.value.pv
      updatedPlan.fullNameWork = selectedWorkData.value.label
      updatedPlan.linkCls = selectedWorkData.value.cls
    }

    if (selectedObjectData.value) {
      updatedPlan.objObject = selectedObjectData.value.objObject
      updatedPlan.pvObject = selectedObjectData.value.pvObject
      updatedPlan.nameClsObject = selectedObjectData.value.nameClsObject
      updatedPlan.fullNameObject = selectedObjectData.value.nameObject
    }

    if (selectedSectionData.value) {
      updatedPlan.objLocationClsSection = selectedSectionData.value.value
      updatedPlan.pvLocationClsSection = selectedSectionData.value.pv
      updatedPlan.nameLocationClsSection = selectedSectionData.value.label
    } else {
      updatedPlan.objLocationClsSection = null
      updatedPlan.pvLocationClsSection = null
      updatedPlan.nameLocationClsSection = ''
    }

    updatedPlan.StartKm = coordinates.value.coordStartKm
    updatedPlan.StartPicket = coordinates.value.coordStartPk
    updatedPlan.FinishKm = coordinates.value.coordEndKm
    updatedPlan.FinishPicket = coordinates.value.coordEndPk
    updatedPlan.PlanDateEnd = formatDateForBackend(form.value.plannedDate)
    updatedPlan.UpdatedAt = formatDateForBackend(new Date())

    await updatePlan(updatedPlan)
    notificationStore.showNotification('План работы успешно обновлён!', 'success')
    emit('save')
  } catch (e) {
    console.error('❌ Ошибка при сохранении:', e)
    notificationStore.showNotification(
      'Ошибка при сохранении: ' + (e.message || 'неизвестная ошибка'),
      'error'
    )
  }
}

// Function to show the confirmation modal
const confirmDelete = () => {
  showConfirmationModal.value = true
}

const deletePlan = async () => {
  showConfirmationModal.value = false // Close the confirmation modal

  try {
    await deletePlanApi(props.rowData.rawData.id)
    notificationStore.showNotification('План работы успешно удалён!', 'success')
    emit('close')
    emit('save')
  } catch (e) {
    console.error('❌ Ошибка при удалении:', e)
    notificationStore.showNotification(
      'Ошибка при удалении: ' + (e.message || 'неизвестная ошибка'),
      'error'
    )
  }
}

const loadPlacesForWork = async (workId) => {
  if (!workId) return
  loadingPlaces.value = true
  placeOptions.value = []
  fullRecordsForWork.value = []

  try {
    const places = await fetchObjectsForSelect(workId)
    if (Array.isArray(places) && places.length > 0) {
      placeOptions.value = Array.from(new Map(places.map(p => [p.objSection, p])).values())
        .map(p => ({ label: p.nameSection, value: p.objSection }))
      fullRecordsForWork.value = places
    } else {
      notificationStore.showNotification('Нет доступных мест для выбранной работы', 'error')
    }
  } catch (e) {
    console.error('Ошибка загрузки мест:', e)
    notificationStore.showNotification('Ошибка при загрузке мест', 'error')
  } finally {
    loadingPlaces.value = false
  }
}

const clearDependentFields = () => {
  form.value.place = null
  form.value.objectType = null
  form.value.object = null
  form.value.section = null
  objectTypeOptions.value = []
  objectOptions.value = []
  sectionOptions.value = []
  objectBounds.value = null
}

const onWorkChange = async (selectedWorkId) => {
  if (!selectedWorkId) return
  selectedWorkData.value = workOptions.value.find(w => w.value === selectedWorkId)
  clearDependentFields()
  await loadPlacesForWork(selectedWorkId)
}

const onPlaceChange = async (selectedSectionId) => {
  if (!selectedSectionId || !form.value.work?.value) return
  form.value.objectType = null
  form.value.object = null
  form.value.section = null
  objectOptions.value = []
  sectionOptions.value = []

  const filteredBySection = fullRecordsForWork.value.filter(r => r.objSection === selectedSectionId)
  if (filteredBySection.length === 0) {
    notificationStore.showNotification('Нет данных по выбранному участку', 'warning')
    return
  }

  objectTypeOptions.value = Array.from(new Map(filteredBySection.map(r => [r.objObjectType, r])).values())
    .map(t => ({ label: t.nameObjectType, value: t.objObjectType }))
}

const onObjectTypeChange = async (selectedObjectTypeId) => {
  if (!selectedObjectTypeId) return
  form.value.object = null
  form.value.section = null
  sectionOptions.value = []

  const filtered = fullRecordsForWork.value.filter(
    r => r.objObjectType === selectedObjectTypeId && r.objSection === form.value.place?.value
  )

  objectOptions.value = filtered.map(r => ({
    label: r.nameObject,
    value: r.objObject,
    fullRecord: r
  }))
}

const onObjectChange = async (selectedObjectId) => {
  if (!selectedObjectId) return
  const record = fullRecordsForWork.value.find(r => r.objObject === selectedObjectId)
  if (!record) {
    console.error('Объект не найден в полных данных')
    return
  }

  selectedObjectData.value = record

  objectBounds.value = {
    startAbs: record.StartKm * 1000 + record.StartPicket * 100,
    endAbs: record.FinishKm * 1000 + record.FinishPicket * 100,
    StartKm: record.StartKm,
    StartPicket: record.StartPicket,
    FinishKm: record.FinishKm,
    FinishPicket: record.FinishPicket
  }

  coordinates.value.coordStartKm = Math.floor(record.StartKm) || 0
  coordinates.value.coordStartPk = Math.floor(record.StartPicket) || 0
  coordinates.value.coordEndKm = Math.floor(record.FinishKm) || 0
  coordinates.value.coordEndPk = Math.floor(record.FinishPicket) || 0

  form.value.section = null
  selectedSectionData.value = null
  await loadSections()
}

const loadSections = async () => {
  if (!form.value.work?.value) return
  loadingSections.value = true
  sectionOptions.value = []
  try {
    const sections = await fetchLocationByCoords(
      form.value.work.value,
      coordinates.value.coordStartKm,
      coordinates.value.coordEndKm,
      coordinates.value.coordStartPk,
      coordinates.value.coordEndPk
    )

    if (Array.isArray(sections) && sections.length > 0) {
      sectionOptions.value = sections.map(s => ({
        label: s.label,
        value: s.value,
        pv: s.pv,
        fullRecord: s.fullRecord
      }))

      if (sections.length === 1) {
        form.value.section = sectionOptions.value[0]
        selectedSectionData.value = sectionOptions.value[0]
      } else {
        form.value.section = null
        selectedSectionData.value = null
      }
    } else {

      form.value.section = null
      selectedSectionData.value = null
    }
  } catch (error) {
    console.error('Ошибка при загрузке участков:', error)
    notificationStore.showNotification('Ошибка при загрузке участков', 'error')
    form.value.section = null
    selectedSectionData.value = null
    sectionOptions.value = []
  } finally {
    loadingSections.value = false
  }
}

const onSectionChange = (selectedSectionId) => {
  if (!selectedSectionId) {
    selectedSectionData.value = null
    return
  }
  selectedSectionData.value = sectionOptions.value.find(s => s.value === selectedSectionId)
}

const updateCoordinates = async (newCoordinates) => {
  coordinates.value = newCoordinates

  form.value.section = null
  selectedSectionData.value = null
  sectionOptions.value = []

  if (form.value.work?.value) {
    await loadSections()
  }
}

const handleInvalidRange = (isInvalid) => {
  if (isInvalid) {
    notificationStore.showNotification('Начало не может быть больше конца', 'error')
  }
}

const handleOutOfBounds = () => {
  notificationStore.showNotification('Координаты выходят за границы выбранного объекта', 'error')
}

const populateFormFromRowData = () => {
  const row = props.rowData
  if (row.planDate) {
    form.value.plannedDate = new Date(row.planDate)
  }
  coordinates.value.coordStartKm = row.StartKm || 0
  coordinates.value.coordStartPk = row.StartPicket || 0
  coordinates.value.coordEndKm = row.FinishKm || 0
  coordinates.value.coordEndPk = row.FinishPicket || 0
}

const findOptionInArray = (array, key, value) => {
  return array.find(item => item[key] === value)
}

const restoreFullSelection = async () => {
  const row = props.rowData
  if (!row.objWork || !row.objObject) return

  try {
    const workOption = findOptionInArray(workOptions.value, 'value', row.objWork)
    if (workOption) {
      form.value.work = workOption
      selectedWorkData.value = workOption
      await loadPlacesForWork(row.objWork)
    }

    const records = await fetchObjectsForSelect(row.objWork)
    if (!Array.isArray(records) || records.length === 0) return

    const targetRecord = records.find(r => r.objObject === row.objObject)
    if (!targetRecord) return

    selectedObjectData.value = targetRecord

    objectBounds.value = {
      startAbs: targetRecord.StartKm * 1000 + targetRecord.StartPicket * 100,
      endAbs: targetRecord.FinishKm * 1000 + targetRecord.FinishPicket * 100,
      StartKm: targetRecord.StartKm,
      StartPicket: targetRecord.StartPicket,
      FinishKm: targetRecord.FinishKm,
      FinishPicket: targetRecord.FinishPicket
    }

    const placeOption = findOptionInArray(placeOptions.value, 'value', targetRecord.objSection)
    if (placeOption) {
      form.value.place = placeOption
      await onPlaceChange(targetRecord.objSection)
    }

    const typeOption = findOptionInArray(objectTypeOptions.value, 'value', targetRecord.objObjectType)
    if (typeOption) {
      form.value.objectType = typeOption
      await onObjectTypeChange(targetRecord.objObjectType)
    }

    const objectOption = findOptionInArray(objectOptions.value, 'value', targetRecord.objObject)
    if (objectOption) {
      form.value.object = objectOption
    }

    await loadSections()

    if (row.objLocationClsSection) {
      const sectionOption = findOptionInArray(sectionOptions.value, 'value', row.objLocationClsSection)
      if (sectionOption) {
        form.value.section = sectionOption
        selectedSectionData.value = sectionOption
      }
    }
  } catch (error) {
    console.error('Ошибка при восстановлении формы:', error)
    notificationStore.showNotification('Ошибка при восстановлении данных формы', 'error')
  }
}

onMounted(async () => {
  try {
    loadingWorks.value = true
    const works = await fetchWorks()
    if (Array.isArray(works) && works.length > 0) {
      workOptions.value = works
    }
  } catch (e) {
    console.error('Ошибка при загрузке работ:', e)
    notificationStore.showNotification('Не удалось загрузить список работ', 'error')
  } finally {
    loadingWorks.value = false
  }

  populateFormFromRowData()
  await restoreFullSelection()
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

.section-title {
  font-weight: 600;
  color: #2b6cb0;
  font-size: 14px;
  margin-bottom: 8px;
}

.col-span-2 {
  grid-column: span 2;
}

.object-header {
  position: relative;
  margin-bottom: 16px;
}
</style>