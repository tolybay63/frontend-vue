<template>
  <ModalWrapper
    :title="modalTitle"
    :show-delete="canDelete && !isCompleted"
    @close="closeModal"
    :show-cancel="!isCompleted"
    :show-save="canUpdate && !isCompleted"
    @save="saveData"
    @delete="confirmDelete"
    :loading="isSaving || isDeleting"
  >
    <div class="form-section">
      <AppDropdown
        class="full-width-item"
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

        <div class="object-grid">
          <AppDropdown
            id="place"
            label="Место"
            placeholder="Выберите место"
            v-model="form.place"
            :options="placeOptions"
            :loading="loadingPlaces"
            @update:value="onPlaceChange"
            :disabled="isCompleted"
            :required="true" />

          <AppDropdown
            id="objectType"
            label="Тип объекта"
            placeholder="Выберите тип объекта"
            v-model="form.objectType"
            :options="objectTypeOptions"
            :loading="loadingObjectTypes"
            @update:value="onObjectTypeChange"
            :disabled="isCompleted"
            :required="true" />

          <AppDropdown
            class="full-width"
            id="object"
            label="Объект"
            placeholder="Выберите объект"
            v-model="form.object"
            :options="objectOptions"
            :loading="loadingObjects"
            @update:value="onObjectChange"
            :disabled="isCompleted"
            :required="true" />

          <FullCoordinates
            class="full-width"
            v-model="coordinates"
            @update:modelValue="updateCoordinates"
            :out-of-bounds-error="isCoordinatesOutOfBounds"
            :disabled="isCompleted"
            :required="true" />

          <AppDropdown
            id="section"
            label="Участок"
            placeholder="Выберите участок"
            v-model="form.section"
            :options="sectionOptions"
            :loading="loadingSections"
            @update:value="onSectionChange"
            :disabled="isCompleted"
            :required="true" />

          <AppDatePicker
            id="plannedDate"
            label="Плановый срок завершения"
            placeholder="Выберите дату"
            v-model="form.plannedDate"
            :disabled="isCompleted"
            :required="true" />

          <AppInput
            class="full-width"
            id="description"
            label="Описание"
            placeholder="Введите описание..."
            v-model="form.description"
            type="textarea"
            :disabled="isCompleted" />
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
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import FullCoordinates from '@/shared/ui/FormControls/FullCoordinates.vue'
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
const isCompleted = computed(() => !!props.rowData?.rawData?.FactDateEnd)

const modalTitle = computed(() => {
  if (isCompleted.value) return 'Просмотр завершённой работы'
  return canUpdate.value ? 'Редактировать плановую работу' : 'Просмотр плановой работы'
})


const form = ref({
  work: null,
  place: null,
  objectType: null,
  object: null,
  section: null,
  plannedDate: null,
  description: ''
})

const coordinates = ref({
  coordStartKm: 0,
  coordStartPk: 0,
  coordStartZv: 0,
  coordEndKm: 0,
  coordEndPk: 0,
  coordEndZv: 0
})

const objectBounds = ref(null)
const isCoordinatesOutOfBounds = ref(false)

const workOptions = ref([])
const placeOptions = ref([])
const objectTypeOptions = ref([])
const objectOptions = ref([])
const sectionOptions = ref([])

const isSaving = ref(false)
const isDeleting = ref(false)
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
  if (isSaving.value) return

  isSaving.value = true
  try {
    if (!form.value.work) {
      notificationStore.showNotification('Не выбрана работа', 'error')
      return
    }
    if (!form.value.object) {
      notificationStore.showNotification('Не выбран объект', 'error')
      return
    }

    // Проверка выхода за границы объекта (бизнес-логика)
    const newStartCoordinates = coordinates.value.coordStartKm * 1000 + coordinates.value.coordStartPk * 100 + coordinates.value.coordStartZv * 25
    const newFinishCoordinates = coordinates.value.coordEndKm * 1000 + coordinates.value.coordEndPk * 100 + coordinates.value.coordEndZv * 25

    if (objectBounds.value) {
      const objectStartCoordinates = objectBounds.value.startAbs
      const objectFinishCoordinates = objectBounds.value.endAbs

      // Проверка: ObjectStartCoordinates <= NewStartCoordinates <= ObjectFinishCoordinates
      const isStartInBounds = newStartCoordinates >= objectStartCoordinates && newStartCoordinates <= objectFinishCoordinates

      // Проверка: ObjectStartCoordinates <= NewFinishCoordinates <= ObjectFinishCoordinates
      const isFinishInBounds = newFinishCoordinates >= objectStartCoordinates && newFinishCoordinates <= objectFinishCoordinates

      if (!isStartInBounds || !isFinishInBounds) {
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
    updatedPlan.StartLink = coordinates.value.coordStartZv
    updatedPlan.FinishKm = coordinates.value.coordEndKm
    updatedPlan.FinishPicket = coordinates.value.coordEndPk
    updatedPlan.FinishLink = coordinates.value.coordEndZv
    updatedPlan.PlanDateEnd = formatDateForBackend(form.value.plannedDate)
    updatedPlan.Description = form.value.description || ''
    updatedPlan.UpdatedAt = formatDateForBackend(new Date())

    await updatePlan(updatedPlan)
    notificationStore.showNotification('План работы успешно обновлён!', 'success')
    emit('save')
  } catch (e) {
    console.error('❌ Ошибка при сохранении:', e)
    let errorMessage = 'Ошибка при сохранении';

    if (e.response?.data?.error?.message) {
      errorMessage = e.response.data.error.message;
    } else if (e.response?.status === 500) {
      errorMessage = 'Ошибка сервера. Попробуйте еще раз.';
    } else if (e.message) {
      errorMessage = e.message;
    }

    notificationStore.showNotification(errorMessage, 'error')
  } finally {
    isSaving.value = false
  }
}

// Function to show the confirmation modal
const confirmDelete = () => {
  showConfirmationModal.value = true
}

const deletePlan = async () => {
  if (isDeleting.value) return

  showConfirmationModal.value = false // Close the confirmation modal
  isDeleting.value = true
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
  } finally {
    isDeleting.value = false
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

// Функция для парсинга координат из строки nameObject
// Пример строки: "Перегон [30км 1пк 1зв - 46км 9пк 4зв] [ЖД пути на перегоне] [Сарыжаз -Шалабай]"
const parseCoordinatesFromName = (nameObject) => {
  if (!nameObject) return null

  // Ищем координаты в квадратных скобках формата [Xкм Yпк Zзв - Aкм Bпк Cзв]
  const coordPattern = /\[(\d+)км\s+(\d+)пк\s+(\d+)зв\s*-\s*(\d+)км\s+(\d+)пк\s+(\d+)зв\]/
  const match = nameObject.match(coordPattern)

  if (match) {
    return {
      StartKm: parseInt(match[1]),
      StartPicket: parseInt(match[2]),
      StartLink: parseInt(match[3]),
      FinishKm: parseInt(match[4]),
      FinishPicket: parseInt(match[5]),
      FinishLink: parseInt(match[6])
    }
  }

  return null
}

const onObjectChange = async (selectedObjectId) => {
  if (!selectedObjectId) return
  const record = fullRecordsForWork.value.find(r => r.objObject === selectedObjectId)
  if (!record) {
    console.error('Объект не найден в полных данных')
    return
  }

  selectedObjectData.value = record

  // Пытаемся получить звенья из record, если нет - парсим из nameObject
  let startZv = record.StartLink
  let finishZv = record.FinishLink

  if ((startZv === undefined || startZv === null) || (finishZv === undefined || finishZv === null)) {
    const parsed = parseCoordinatesFromName(record.nameObject)
    if (parsed) {
      startZv = startZv ?? parsed.StartLink
      finishZv = finishZv ?? parsed.FinishLink
    }
  }

  // Если всё равно null/undefined, ставим 0
  startZv = startZv ?? 0
  finishZv = finishZv ?? 0

  objectBounds.value = {
    startAbs: record.StartKm * 1000 + record.StartPicket * 100 + startZv * 25,
    endAbs: record.FinishKm * 1000 + record.FinishPicket * 100 + finishZv * 25,
    StartKm: record.StartKm,
    StartPicket: record.StartPicket,
    StartLink: startZv,
    FinishKm: record.FinishKm,
    FinishPicket: record.FinishPicket,
    FinishLink: finishZv
  }

  coordinates.value.coordStartKm = Math.floor(record.StartKm) || null
  coordinates.value.coordStartPk = Math.floor(record.StartPicket) || null
  coordinates.value.coordStartZv = Math.floor(startZv) || null
  coordinates.value.coordEndKm = Math.floor(record.FinishKm) || null
  coordinates.value.coordEndPk = Math.floor(record.FinishPicket) || null
  coordinates.value.coordEndZv = Math.floor(finishZv) || null

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
      coordinates.value.coordEndPk,
      coordinates.value.coordStartZv,
      coordinates.value.coordEndZv
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

  // Проверка выхода за границы объекта (в реальном времени)
  if (objectBounds.value) {
    const newStartCoordinates = newCoordinates.coordStartKm * 1000 + newCoordinates.coordStartPk * 100 + newCoordinates.coordStartZv * 25
    const newFinishCoordinates = newCoordinates.coordEndKm * 1000 + newCoordinates.coordEndPk * 100 + newCoordinates.coordEndZv * 25

    const objectStartCoordinates = objectBounds.value.startAbs
    const objectFinishCoordinates = objectBounds.value.endAbs

    // Проверка: ObjectStartCoordinates <= NewStartCoordinates <= ObjectFinishCoordinates
    const isStartInBounds = newStartCoordinates >= objectStartCoordinates && newStartCoordinates <= objectFinishCoordinates

    // Проверка: ObjectStartCoordinates <= NewFinishCoordinates <= ObjectFinishCoordinates
    const isFinishInBounds = newFinishCoordinates >= objectStartCoordinates && newFinishCoordinates <= objectFinishCoordinates

    if (!isStartInBounds || !isFinishInBounds) {
      isCoordinatesOutOfBounds.value = true
      notificationStore.showNotification('Координаты не могут выходить за границы выбранного объекта', 'error')
    } else {
      isCoordinatesOutOfBounds.value = false
    }
  } else {
    isCoordinatesOutOfBounds.value = false
  }

  form.value.section = null
  selectedSectionData.value = null
  sectionOptions.value = []

  if (form.value.work?.value) {
    await loadSections()
  }
}

const populateFormFromRowData = () => {
  const row = props.rowData
  if (row.planDate) {
    form.value.plannedDate = new Date(row.planDate)
  }
  coordinates.value.coordStartKm = row.StartKm || null
  coordinates.value.coordStartPk = row.StartPicket || null
  coordinates.value.coordStartZv = row.StartLink || null
  coordinates.value.coordEndKm = row.FinishKm || null
  coordinates.value.coordEndPk = row.FinishPicket || null
  coordinates.value.coordEndZv = row.FinishLink || null
  form.value.description = row.rawData?.Description || ''
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

    // Пытаемся получить звенья из targetRecord, если нет - парсим из nameObject
    let startZv = targetRecord.StartLink
    let finishZv = targetRecord.FinishLink

    if ((startZv === undefined || startZv === null) || (finishZv === undefined || finishZv === null)) {
      const parsed = parseCoordinatesFromName(targetRecord.nameObject)
      if (parsed) {
        startZv = startZv ?? parsed.StartLink
        finishZv = finishZv ?? parsed.FinishLink
      }
    }

    // Если всё равно null/undefined, ставим 0
    startZv = startZv ?? 0
    finishZv = finishZv ?? 0

    objectBounds.value = {
      startAbs: targetRecord.StartKm * 1000 + targetRecord.StartPicket * 100 + startZv * 25,
      endAbs: targetRecord.FinishKm * 1000 + targetRecord.FinishPicket * 100 + finishZv * 25,
      StartKm: targetRecord.StartKm,
      StartPicket: targetRecord.StartPicket,
      StartLink: startZv,
      FinishKm: targetRecord.FinishKm,
      FinishPicket: targetRecord.FinishPicket,
      FinishLink: finishZv
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
  grid-template-columns: repeat(2, 1fr);
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

.full-width-item {
  grid-column: span 2;
}

.object-header {
  position: relative;
  margin-bottom: 16px;
}

.object-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
}

.full-width {
  grid-column: span 2;
}

/* Tablet and Mobile styles */
@media (max-width: 1024px) {
  .form-section {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    padding: 0 16px 16px !important;
  }

  .col-span-2 {
    grid-column: span 1 !important;
  }

  .full-width-item {
    grid-column: span 1 !important;
  }

  .object-grid {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }

  .full-width {
    grid-column: span 1 !important;
  }
}
</style>