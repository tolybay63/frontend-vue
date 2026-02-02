<template>
  <ModalWrapper
    title="Редактировать перегон"
    @close="closeModal"
    @save="saveData"
    @delete="handleDelete"
    :show-save="canUpdate"
    :show-delete="canDelete"
    :loading="isSaving || isDeleting"
  >
    <div class="form-section">
      <AppInput
        class="col-span-2"
        id="name"
        label="Наименование"
        placeholder="Введите наименование перегона"
        v-model="form.name"
        :required="true"
      />

      <AppDropdown
        class="col-span-2"
        id="section"
        label="Участки ЖД пути"
        placeholder="Выберите участок"
        v-model="form.section"
        :options="sectionOptions"
        :loading="loadingSections"
        :required="true"
      />

      <div class="col-span-2">
        <FullCoordinates
          v-model="form.coordinates"
          :required="true"
        />
      </div>

      <AppNumberInput
        class="col-span-2"
        id="stageLength"
        label="Протяженность"
        placeholder="Введите протяженность"
        v-model="form.stageLength"
        :required="true"
      />
    </div>

    <ConfirmationModal
      v-if="showConfirmModal"
      title="Удаление перегона"
      message="Вы действительно хотите удалить этот перегон?"
      @confirm="confirmDelete"
      @cancel="showConfirmModal = false"
    />
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { usePermissions } from '@/shared/api/auth/usePermissions';
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue'
import FullCoordinates from '@/shared/ui/FormControls/FullCoordinates.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadSection, saveStage, deleteSection } from '@/shared/api/sections/sectionService'
import { getUserData } from '@/shared/api/common/userCache'

const props = defineProps({
  stageData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions();
const canUpdate = computed(() => hasPermission('stag:upd'));
const canDelete = computed(() => hasPermission('stag:del'));

// Form data
const form = ref({
  name: props.stageData.name || '',
  section: null,
  coordinates: {
    coordStartKm: props.stageData.rawData?.StartKm ?? null,
    coordStartPk: props.stageData.rawData?.StartPicket ?? null,
    coordStartZv: props.stageData.rawData?.StartLink ?? null,
    coordEndKm: props.stageData.rawData?.FinishKm ?? null,
    coordEndPk: props.stageData.rawData?.FinishPicket ?? null,
    coordEndZv: props.stageData.rawData?.FinishLink ?? null
  },
  stageLength: props.stageData.StageLength || null,
  rawData: props.stageData.rawData
})

// Dropdown options
const sectionOptions = ref([])

// Loading states
const loadingSections = ref(false)

// Confirmation modal
const showConfirmModal = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)

// Load sections
const loadSectionsData = async () => {
  loadingSections.value = true
  try {
    const response = await loadSection({ page: 1, limit: 999999 })
    sectionOptions.value = response.data.map(section => ({
      label: section.name,
      value: section.id,
      pv: section.rawData?.pv || null
    }))

    // Устанавливаем выбранное значение после загрузки опций
    if (props.stageData.rawData?.parent) {
      const selectedSection = sectionOptions.value.find(
        option => option.value === props.stageData.rawData.parent
      )
      if (selectedSection) {
        form.value.section = selectedSection
      }
    }
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке участков', 'error')
  } finally {
    loadingSections.value = false
  }
}

// Save data
const saveData = async () => {
  if (isSaving.value) return

  try {
    isSaving.value = true

    // Validate required fields
    if (!form.value.name || !form.value.section || !form.value.coordinates.coordStartKm || !form.value.coordinates.coordStartPk || !form.value.coordinates.coordStartZv || !form.value.coordinates.coordEndKm || !form.value.coordinates.coordEndPk || !form.value.coordinates.coordEndZv || !form.value.stageLength) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    // Получаем текущую дату
    const currentDate = new Date().toISOString().split('T')[0]

    // Get user data for objUser and pvUser
    const userData = await getUserData()

    // Используем rawData из props
    const raw = form.value.rawData

    // Формируем данные для сохранения
    const stageData = {
      id: props.stageData.id,
      parent: form.value.section.value,
      cls: raw.cls,
      name: form.value.name,
      idStartKm: raw.idStartKm,
      StartKm: form.value.coordinates.coordStartKm,
      idStartPicket: raw.idStartPicket,
      StartPicket: form.value.coordinates.coordStartPk,
      idStartLink: raw.idStartLink,
      StartLink: form.value.coordinates.coordStartZv,
      idFinishKm: raw.idFinishKm,
      FinishKm: form.value.coordinates.coordEndKm,
      idFinishPicket: raw.idFinishPicket,
      FinishPicket: form.value.coordinates.coordEndPk,
      idFinishLink: raw.idFinishLink,
      FinishLink: form.value.coordinates.coordEndZv,
      idStageLength: raw.idStageLength,
      StageLength: form.value.stageLength,
      idUser: raw.idUser,
      objUser: userData?.id || null,
      pvUser: userData?.pv || null,
      idUpdatedAt: raw.idUpdatedAt,
      UpdatedAt: currentDate
    }

    console.log('Обновление перегона:', stageData)

    // Вызываем API для обновления (операция "upd")
    await saveStage('upd', stageData)

    notificationStore.showNotification('Перегон успешно обновлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при обновлении перегона', 'error')
  } finally {
    isSaving.value = false
  }
}

// Delete handlers
const handleDelete = () => {
  if (!props.stageData?.id) {
    notificationStore.showNotification('Не удалось получить ID перегона для удаления', 'error')
    return
  }
  showConfirmModal.value = true
}

const confirmDelete = async () => {
  if (isDeleting.value) return

  showConfirmModal.value = false
  isDeleting.value = true
  try {
    await deleteSection(props.stageData.id)
    notificationStore.showNotification('Перегон успешно удален', 'success')
    emit('refresh')
    closeModal()
  } catch (error) {
    console.error('Ошибка при удалении перегона:', error)
    notificationStore.showNotification('Ошибка при удалении перегона', 'error')
  } finally {
    isDeleting.value = false
  }
}

// Close modal
const closeModal = () => {
  emit('close')
}

// Initialize
onMounted(() => {
  loadSectionsData()
})
</script>

<style scoped>
.form-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.col-span-2 {
  grid-column: span 2;
}
</style>
