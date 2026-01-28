<template>
  <ModalWrapper title="Запланировать по объектам" @close="closeModal" @save="saveData" :show-save="true" :loading="isSaving">
    <div class="form-section">
      <AppDropdown
        class="full-width-item"
        id="work"
        label="Работа"
        placeholder="Выберите работу"
        v-model="form.work"
        :options="workOptions"
        :loading="loadingWorks"
        :required="true"
        @update:value="onWorkChange"
      />

      <AppDropdown
        id="place"
        label="Место"
        placeholder="Выберите место"
        v-model="form.place"
        :options="placeOptions"
        :loading="loadingPlaces"
        :required="true"
        @update:value="onPlaceChange"
      />

      <AppDropdown
        id="section"
        label="Участок"
        placeholder="Выберите участок"
        v-model="form.section"
        :options="sectionOptions"
        :loading="loadingSections"
        :required="true"
        @update:value="onSectionChange"
      />

      <AppDropdown
        id="objectType"
        label="Тип Объекта"
        placeholder="Выберите тип объекта"
        v-model="form.objectType"
        :options="objectTypeOptions"
        :loading="loadingObjectTypes"
        :required="true"
        @update:value="onObjectTypeChange"
      />

      <AppDatePicker
        id="plannedDate"
        label="Плановый срок завершения"
        placeholder="Выберите дату"
        v-model="form.plannedDate"
        :required="true"
      />

      <MultipleSelect
        class="full-width-item"
        id="objects"
        label="Объект"
        v-model="form.objects"
        :options="objectOptions"
        :loading="loadingObjects"
        :show-select-all="true"
      />
    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppDatePicker from '@/shared/ui/FormControls/AppDatePicker.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import MultipleSelect from '@/shared/ui/FormControls/MultipleSelect.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadWorksList, loadPlacesList, loadSectionsByWorkAndPlace, loadObjectsByParams, saveSeveralPlans } from '@/shared/api/plans/planByObjectsApi'

const emit = defineEmits(['close', 'update-table'])
const notificationStore = useNotificationStore()

const form = ref({
  work: null,
  place: null,
  section: null,
  objectType: null,
  plannedDate: null,
  objects: []
})

// Данные выбранного участка (для dbeg, dend)
const selectedSectionData = ref(null)

// Options
const workOptions = ref([])
const placeOptions = ref([])
const sectionOptions = ref([])
const objectTypeOptions = ref([])
const objectOptions = ref([])

// Loading states
const loadingWorks = ref(false)
const loadingPlaces = ref(false)
const loadingSections = ref(false)
const loadingObjectTypes = ref(false)
const loadingObjects = ref(false)

const isSaving = ref(false)

const closeModal = () => {
  emit('close')
}

// Обработчик выбора работы
const onWorkChange = () => {
  // Сбрасываем зависимые поля
  form.value.place = null
  form.value.section = null
  form.value.objectType = null
  form.value.objects = []
  sectionOptions.value = []
  objectTypeOptions.value = []
  objectOptions.value = []
  selectedSectionData.value = null
}

// Обработчик выбора места
const onPlaceChange = async (placeId) => {
  // Сбрасываем зависимые поля
  form.value.section = null
  form.value.objectType = null
  form.value.objects = []
  objectTypeOptions.value = []
  objectOptions.value = []
  selectedSectionData.value = null

  if (!placeId || !form.value.work) return

  const workId = typeof form.value.work === 'object' ? form.value.work.value : form.value.work

  loadingSections.value = true
  try {
    const sections = await loadSectionsByWorkAndPlace(workId, placeId)
    sectionOptions.value = sections
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке участков', 'error')
    sectionOptions.value = []
  } finally {
    loadingSections.value = false
  }
}

// Обработчик выбора участка
const onSectionChange = (sectionId) => {
  // Сбрасываем зависимые поля
  form.value.objectType = null
  form.value.objects = []
  objectOptions.value = []

  if (!sectionId) {
    objectTypeOptions.value = []
    selectedSectionData.value = null
    return
  }

  // Находим выбранный участок для получения objObjectTypeMulti и dbeg/dend
  const section = sectionOptions.value.find(s => s.value === sectionId)
  if (section) {
    selectedSectionData.value = section
    // Тип объекта берём из objObjectTypeMulti выбранного участка
    objectTypeOptions.value = (section.objObjectTypeMulti || []).map(t => ({
      label: t.name,
      value: t.id,
      cls: t.cls,
      fullName: t.fullname
    }))
  } else {
    objectTypeOptions.value = []
    selectedSectionData.value = null
  }
}

// Обработчик выбора типа объекта
const onObjectTypeChange = async (objectTypeId) => {
  // Сбрасываем объекты
  form.value.objects = []

  if (!objectTypeId || !form.value.place || !selectedSectionData.value) {
    objectOptions.value = []
    return
  }

  const placeId = typeof form.value.place === 'object' ? form.value.place.value : form.value.place

  loadingObjects.value = true
  try {
    const objects = await loadObjectsByParams(
      placeId,
      objectTypeId,
      selectedSectionData.value.dbeg,
      selectedSectionData.value.dend
    )
    objectOptions.value = objects
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке объектов', 'error')
    objectOptions.value = []
  } finally {
    loadingObjects.value = false
  }
}

const validateForm = () => {
  if (!form.value.work) {
    notificationStore.showNotification('Не выбрана работа', 'error')
    return false
  }
  if (!form.value.place) {
    notificationStore.showNotification('Не выбрано место', 'error')
    return false
  }
  if (!form.value.section) {
    notificationStore.showNotification('Не выбран участок', 'error')
    return false
  }
  if (!form.value.objectType) {
    notificationStore.showNotification('Не выбран тип объекта', 'error')
    return false
  }
  if (!form.value.plannedDate) {
    notificationStore.showNotification('Не указан плановый срок завершения', 'error')
    return false
  }
  if (!form.value.objects || form.value.objects.length === 0) {
    notificationStore.showNotification('Не выбран ни один объект', 'error')
    return false
  }
  return true
}

const formatDateToString = (date) => {
  if (!date) return null
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const saveData = async () => {
  if (isSaving.value) return

  if (!validateForm()) return

  isSaving.value = true
  try {
    // Получаем полные данные работы
    const work = typeof form.value.work === 'object'
      ? form.value.work
      : workOptions.value.find(w => w.value === form.value.work)

    // Получаем полные данные выбранных объектов
    const selectedObjects = form.value.objects.map(objId => {
      return objectOptions.value.find(o => o.value === objId)
    }).filter(Boolean)

    await saveSeveralPlans({
      work,
      section: selectedSectionData.value,
      plannedDate: formatDateToString(form.value.plannedDate),
      objects: selectedObjects
    })

    notificationStore.showNotification('Работы успешно запланированы!', 'success')
    emit('update-table')
    closeModal()
  } catch (error) {
    console.error('Ошибка при сохранении:', error)
    const errorMessage = error.response?.data?.error?.message || error.message || 'Ошибка при сохранении'
    notificationStore.showNotification(errorMessage, 'error')
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  // Загружаем работы и места при открытии модалки
  loadingWorks.value = true
  loadingPlaces.value = true

  try {
    const [works, places] = await Promise.all([
      loadWorksList(),
      loadPlacesList()
    ])
    workOptions.value = works
    placeOptions.value = places
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке данных', 'error')
  } finally {
    loadingWorks.value = false
    loadingPlaces.value = false
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

.full-width-item {
  grid-column: span 2;
}

@media (max-width: 1024px) {
  .form-section {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 0 16px 16px;
  }

  .full-width-item {
    grid-column: span 1;
  }
}
</style>
