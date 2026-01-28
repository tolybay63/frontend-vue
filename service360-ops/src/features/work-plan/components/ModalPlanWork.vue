<template>
  <ModalWrapper title="Запланировать новую работу" @close="closeModal" @save="saveData" :show-save="canInsert" :loading="isSaving">
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
        :required="true"
      />

      <div v-for="(object, index) in form.objects" :key="object.id" class="col-span-2">
        <div class="object-header">
          <h4 class="section-title">Объект #{{ index + 1 }}</h4>
          <span v-if="index > 0" class="remove-object" @click="removeObject(index)">×</span>
        </div>

        <div class="object-grid">
          <AppDropdown
            :id="'place-' + object.id"
            label="Место"
            placeholder="Выберите место"
            v-model="object.place"
            :options="object.placeOptions"
            :loading="object.loadingPlaces"
            @update:value="(val) => onPlaceChange(val, index)"
            :required="true"
          />

          <AppDropdown
            :id="'objectType-' + object.id"
            label="Тип объекта"
            placeholder="Выберите тип объекта"
            v-model="object.objectType"
            :options="object.objectTypeOptions"
            :loading="object.loadingObjectTypes"
            @update:value="(val) => onObjectTypeChange(val, index)"
            :required="true"
          />

          <AppDropdown
            class="full-width"
            :id="'object-' + object.id"
            label="Объект"
            placeholder="Выберите объект"
            v-model="object.object"
            :options="object.objectOptions"
            :loading="object.loadingObjects"
            @update:value="(val) => onObjectChange(val, index)"
            :required="true"
          />

          <FullCoordinates
            class="full-width"
            v-model="object.coordinates"
            @update:modelValue="(coords) => updateCoordinates(index, coords)"
            :out-of-bounds-error="object.isCoordinatesOutOfBounds"
            :required="true"
          />

          <AppDropdown
            :id="'section-' + object.id"
            label="Участок"
            placeholder="Выберите участок"
            v-model="object.section"
            :options="object.sectionOptions"
            :loading="object.loadingSections"
            :required="true"
          />

          <AppDatePicker
            :id="'plannedDate-' + object.id"
            label="Плановый срок завершения"
            placeholder="Выберите дату"
            v-model="object.plannedDate"
            :is-date-disabled="isDateDisabled"
            :required="true"
          />
        </div>
      </div>

      <div class="divider full-width-item"></div>

      <div class="full-width-item">
        <UiButton
          text="Добавить объект"
          icon="Plus"
          :loading="isAddingObject"
          @click="addObject"
        />
      </div>
    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppDatePicker from '@/shared/ui/FormControls/AppDatePicker.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import FullCoordinates from '@/shared/ui/FormControls/FullCoordinates.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { usePermissions } from '@/shared/api/permissions/usePermissions';
import { fetchWorks, fetchPlacesForWork, fetchLocationByCoords } from '@/shared/api/plans/planWorkApi'
import { saveAllPlans } from '@/shared/api/plans/savePlanApi'

const emit = defineEmits(['close', 'update-table'])
const notificationStore = useNotificationStore()

let nextObjectId = 1

const { hasPermission } = usePermissions()
const canInsert = computed(() => hasPermission('plan:ins'))
const generateObjectId = () => nextObjectId++

const createNewObjectForm = () => ({
  id: generateObjectId(),
  plannedDate: null,
  place: null,
  objectType: null,
  object: null,
  section: null,
  coordinates: {
    coordStartKm: 0,
    coordStartPk: 0,
    coordStartZv: 0,
    coordEndKm: 0,
    coordEndPk: 0,
    coordEndZv: 0
  },
  objectBounds: null,
  isCoordinatesOutOfBounds: false,

  placeOptions: [],
  objectTypeOptions: [],
  objectOptions: [],
  sectionOptions: [],

  loadingPlaces: false,
  loadingObjectTypes: false,
  loadingObjects: false,
  loadingSections: false,

  filteredRecords: []
})

const form = ref({
  work: null,
  objects: [createNewObjectForm()]
})

const workOptions = ref([])
const loadingWorks = ref(false)
const isAddingObject = ref(false)

const isDateDisabled = () => {
  return false; // Разрешаем выбирать любую дату
};

const closeModal = () => {
  emit('close')
}

const isSaving = ref(false)

const validateForm = () => {
  if (!form.value.work) {
    notificationStore.showNotification('Не выбрана работа', 'error')
    return false
  }

  for (let i = 0; i < form.value.objects.length; i++) {
    const obj = form.value.objects[i]
    const objectNum = i + 1

    if (!obj.place) {
      notificationStore.showNotification(`Объект #${objectNum}: не выбрано Место`, 'error')
      return false
    }
    if (!obj.objectType) {
      notificationStore.showNotification(`Объект #${objectNum}: не выбран Тип объекта`, 'error')
      return false
    }
    if (!obj.object) {
      notificationStore.showNotification(`Объект #${objectNum}: не выбран Объект`, 'error')
      return false
    }
    if (!obj.section) {
      notificationStore.showNotification(`Объект #${objectNum}: не выбран Участок`, 'error')
      return false
    }
    if (!obj.plannedDate) {
      notificationStore.showNotification(`Объект #${objectNum}: не указан Плановый срок завершения работы`, 'error')
      return false
    }

    // Проверка выхода за границы объекта (бизнес-логика)
    const coords = obj.coordinates
    const newStartCoordinates = (coords.coordStartKm || 0) * 1000 + (coords.coordStartPk || 0) * 100 + (coords.coordStartZv || 0) * 25
    const newFinishCoordinates = (coords.coordEndKm || 0) * 1000 + (coords.coordEndPk || 0) * 100 + (coords.coordEndZv || 0) * 25

    if (obj.objectBounds) {
      const objectStartCoordinates = obj.objectBounds.startAbs
      const objectFinishCoordinates = obj.objectBounds.endAbs

      // Проверка: ObjectStartCoordinates <= NewStartCoordinates <= ObjectFinishCoordinates
      const isStartInBounds = newStartCoordinates >= objectStartCoordinates && newStartCoordinates <= objectFinishCoordinates

      // Проверка: ObjectStartCoordinates <= NewFinishCoordinates <= ObjectFinishCoordinates
      const isFinishInBounds = newFinishCoordinates >= objectStartCoordinates && newFinishCoordinates <= objectFinishCoordinates

      if (!isStartInBounds || !isFinishInBounds) {
        notificationStore.showNotification(`Объект #${objectNum}: Координаты выходят за границы объекта`, 'error')
        return false
      }
    }
  }

  return true
}

const saveData = async () => {
  if (isSaving.value) return; 

  if (!validateForm()) {
   
    return
  }

  isSaving.value = true
  try {
    const workData = {
      value: form.value.work.value,
      cls: form.value.work.cls,
      pv: form.value.work.pv,
      fullRecord: form.value.work.fullRecord
    }

    const formsData = form.value.objects.map(obj => {
      const section = obj.section ? {
        value: obj.section.value,
        pv: obj.section.pv,
        fullRecord: obj.section.fullRecord
      } : null

      obj.coordStartKm = obj.coordinates.coordStartKm
      obj.coordStartPk = obj.coordinates.coordStartPk
      obj.coordStartZv = obj.coordinates.coordStartZv
      obj.coordEndKm = obj.coordinates.coordEndKm
      obj.coordEndPk = obj.coordinates.coordEndPk
      obj.coordEndZv = obj.coordinates.coordEndZv

      return {
        ...obj,
        object: obj.object ? {
          value: obj.object.value,
          fullRecord: obj.filteredRecords.find(r => r.fullRecord.objObject === obj.object.value)?.fullRecord || null
        } : null,
        section,
        plannedDate: obj.plannedDate || null
      }
    })

    const results = await saveAllPlans(workData, formsData)

    const failed = results.filter(r => !r.success)
    const successCount = results.length - failed.length

    if (failed.length > 0) {
      notificationStore.showNotification(
        `Сохранено ${successCount} из ${results.length}. Ошибок: ${failed.length}`,
        'warning'
      )
    } else {
      notificationStore.showNotification('Все формы успешно сохранены!', 'success')
    }

    emit('update-table')
    closeModal()
  } catch (e) {
    console.error('Ошибка при сохранении:', e)
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

const addObject = async () => {
  isAddingObject.value = true
  try {
    const newObject = createNewObjectForm()

    if (form.value.work?.value) {
      await loadPlacesForObject(newObject, form.value.work.value)
    }

    form.value.objects.push(newObject)
  } catch (error) {
    notificationStore.showNotification('Не удалось добавить форму', 'error')
  } finally {
    isAddingObject.value = false
  }
}

const removeObject = (index) => {
  if (form.value.objects.length <= 1) return
  form.value.objects.splice(index, 1)
}

const loadPlacesForObject = async (objectForm, workId) => {
  if (!workId) return

  objectForm.loadingPlaces = true
  objectForm.placeOptions = []

  try {
    const places = await fetchPlacesForWork(workId)
    const uniquePlaces = Array.from(new Map(places.map(item => [item.label, item])).values())

    if (uniquePlaces.length > 0) {
      objectForm.placeOptions = uniquePlaces
    } else {
      notificationStore.showNotification('Нет доступных мест для выбранной работы', 'warning')
    }
  } catch (e) {
    console.error(`[Form ${objectForm.id}] Ошибка загрузки мест:`, e)
    notificationStore.showNotification('Ошибка при загрузке мест', 'error')
  } finally {
    objectForm.loadingPlaces = false
  }
}

const onWorkChange = async (selectedWorkId) => {
  if (!selectedWorkId) return

  const loadPromises = form.value.objects.map(async (objectForm) => {
    objectForm.place = null
    objectForm.objectType = null
    objectForm.object = null
    objectForm.section = null
    objectForm.coordinates = { coordStartKm: 0, coordStartPk: 0, coordStartZv: 0, coordEndKm: 0, coordEndPk: 0, coordEndZv: 0 }
    objectForm.objectBounds = null
    objectForm.objectTypeOptions = []
    objectForm.objectOptions = []
    objectForm.sectionOptions = []
    objectForm.filteredRecords = []

    await loadPlacesForObject(objectForm, selectedWorkId)
  })

  await Promise.all(loadPromises)
}

const onPlaceChange = async (selectedPlaceId, index) => {
  if (!selectedPlaceId || index < 0 || !form.value.work?.value) return

  const objectForm = form.value.objects[index]
  objectForm.objectType = null
  objectForm.object = null
  objectForm.section = null
  objectForm.coordinates = { coordStartKm: 0, coordStartPk: 0, coordStartZv: 0, coordEndKm: 0, coordEndPk: 0, coordEndZv: 0 }
  objectForm.objectBounds = null
  objectForm.objectOptions = []
  objectForm.sectionOptions = []
  objectForm.filteredRecords = []

  objectForm.loadingObjectTypes = true

  try {
    const allRecords = await fetchPlacesForWork(form.value.work.value)
    const filteredByPlace = allRecords.filter(record => record.value === selectedPlaceId)

    if (filteredByPlace.length === 0) {
      notificationStore.showNotification('Нет данных по выбранному месту', 'warning')
      return
    }

    objectForm.filteredRecords = filteredByPlace

    const uniqueTypes = [...new Map(
      filteredByPlace.map(r => [r.fullRecord.objObjectType, r.fullRecord])
    ).values()]

    objectForm.objectTypeOptions = uniqueTypes.map(t => ({
      label: t.nameObjectType,
      value: t.objObjectType
    }))
  } catch (error) {
    console.error('Ошибка при загрузке типов объектов:', error)
    notificationStore.showNotification('Ошибка при загрузке типов объектов', 'error')
  } finally {
    objectForm.loadingObjectTypes = false
  }
}

const onObjectTypeChange = async (selectedObjectTypeId, index) => {
  if (!selectedObjectTypeId || index < 0) return

  const objectForm = form.value.objects[index]
  objectForm.object = null
  objectForm.section = null
  objectForm.coordinates = { coordStartKm: 0, coordStartPk: 0, coordStartZv: 0, coordEndKm: 0, coordEndPk: 0, coordEndZv: 0 }
  objectForm.objectBounds = null
  objectForm.sectionOptions = []

  objectForm.loadingObjects = true

  try {
    const filtered = objectForm.filteredRecords.filter(
      r => r.fullRecord.objObjectType === selectedObjectTypeId
    )

    objectForm.objectOptions = filtered.map(r => ({
      label: r.fullRecord.nameObject,
      value: r.fullRecord.objObject
    }))
  } catch (error) {
    console.error('Ошибка при загрузке объектов:', error)
    notificationStore.showNotification('Ошибка при загрузке объектов', 'error')
  } finally {
    objectForm.loadingObjects = false
  }
}

const onObjectChange = async (selectedObjectId, index) => {
  if (!selectedObjectId || index < 0) return

  const objectForm = form.value.objects[index]
  const record = objectForm.filteredRecords.find(r => r.fullRecord.objObject === selectedObjectId)

  if (!record) {
    console.error('Объект не найден в filteredRecords')
    return
  }

  const full = record.fullRecord

  const startZv = full.StartLink ?? 0
  const finishZv = full.FinishLink ?? 0

  objectForm.coordinates = {
    coordStartKm: full.StartKm ?? null,
    coordStartPk: full.StartPicket ?? null,
    coordStartZv: startZv || null,
    coordEndKm: full.FinishKm ?? null,
    coordEndPk: full.FinishPicket ?? null,
    coordEndZv: finishZv || null
  }

  objectForm.objectBounds = {
    startAbs: (full.StartKm || 0) * 1000 + (full.StartPicket || 0) * 100 + startZv * 25,
    endAbs: (full.FinishKm || 0) * 1000 + (full.FinishPicket || 0) * 100 + finishZv * 25,
    StartKm: full.StartKm,
    StartPicket: full.StartPicket,
    StartLink: startZv,
    FinishKm: full.FinishKm,
    FinishPicket: full.FinishPicket,
    FinishLink: finishZv
  }

  await loadSectionsForObject(objectForm)
}

const loadSectionsForObject = async (objectForm) => {
  if (!form.value.work?.value || !objectForm.coordinates.coordStartKm || !objectForm.coordinates.coordEndKm) {
    objectForm.sectionOptions = []
    objectForm.section = null
    return
  }

  objectForm.loadingSections = true
  objectForm.sectionOptions = []
  try {
    const sections = await fetchLocationByCoords(
      form.value.work.value,
      objectForm.coordinates.coordStartKm,
      objectForm.coordinates.coordEndKm,
      objectForm.coordinates.coordStartPk,
      objectForm.coordinates.coordEndPk,
      objectForm.coordinates.coordStartZv,
      objectForm.coordinates.coordEndZv
    )

    if (Array.isArray(sections) && sections.length > 0) {
      objectForm.sectionOptions = sections.map(s => ({
        label: s.name || s.label,
        value: s.id || s.value,
        pv: s.pv,
        fullRecord: s
      }))

      objectForm.section = sections.length === 1 ? objectForm.sectionOptions[0] : null
    } else {
      objectForm.sectionOptions = []
      objectForm.section = null
    }
  } catch (error) {
    console.error('Ошибка при загрузке участков:', error)
    notificationStore.showNotification('Ошибка при загрузке участков', 'error')
    objectForm.sectionOptions = []
    objectForm.section = null
  } finally {
    objectForm.loadingSections = false
  }
}

const updateCoordinates = async (index, newCoords) => {
  const objectForm = form.value.objects[index]
  objectForm.coordinates = newCoords

  // Проверка выхода за границы объекта (в реальном времени)
  if (objectForm.objectBounds) {
    const newStartCoordinates = (newCoords.coordStartKm || 0) * 1000 + (newCoords.coordStartPk || 0) * 100 + (newCoords.coordStartZv || 0) * 25
    const newFinishCoordinates = (newCoords.coordEndKm || 0) * 1000 + (newCoords.coordEndPk || 0) * 100 + (newCoords.coordEndZv || 0) * 25

    const objectStartCoordinates = objectForm.objectBounds.startAbs
    const objectFinishCoordinates = objectForm.objectBounds.endAbs

    // Проверка: ObjectStartCoordinates <= NewStartCoordinates <= ObjectFinishCoordinates
    const isStartInBounds = newStartCoordinates >= objectStartCoordinates && newStartCoordinates <= objectFinishCoordinates

    // Проверка: ObjectStartCoordinates <= NewFinishCoordinates <= ObjectFinishCoordinates
    const isFinishInBounds = newFinishCoordinates >= objectStartCoordinates && newFinishCoordinates <= objectFinishCoordinates

    if (!isStartInBounds || !isFinishInBounds) {
      objectForm.isCoordinatesOutOfBounds = true
      notificationStore.showNotification(`Объект #${index + 1}: Координаты выходят за границы объекта`, 'error')
    } else {
      objectForm.isCoordinatesOutOfBounds = false
    }
  } else {
    objectForm.isCoordinatesOutOfBounds = false
  }

  objectForm.section = null
  objectForm.sectionOptions = []

  if (form.value.work?.value) {
    await loadSectionsForObject(objectForm)
  }
}

onMounted(async () => {
  try {
    loadingWorks.value = true
    const works = await fetchWorks()

    if (Array.isArray(works) && works.length > 0) {
      workOptions.value = works
    } else {
      notificationStore.showNotification('Нет доступных работ', 'warning')
    }
  } catch (e) {
    console.error('Ошибка при загрузке работ:', e)
    notificationStore.showNotification('Не удалось загрузить список работ', 'error')
  } finally {
    loadingWorks.value = false
  }
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

.divider {
  height: 1px;
  background-color: #e0e0e0;
  margin: 16px 0;
}

.object-header {
  position: relative;
}

.remove-object {
  color: red;
  cursor: pointer;
  font-size: 18px;
  position: absolute;
  right: 0;
  top: 0;
  margin-top: 0;
  margin-right: 8px;
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