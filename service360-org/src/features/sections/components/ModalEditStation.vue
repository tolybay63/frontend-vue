<template>
  <ModalWrapper
    title="Редактировать раздельный пункт"
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
        placeholder="Введите наименование раздельного пункта"
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
    </div>

    <ConfirmationModal
      v-if="showConfirmModal"
      title="Удаление раздельного пункта"
      message="Вы действительно хотите удалить этот раздельный пункт?"
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
import FullCoordinates from '@/shared/ui/FormControls/FullCoordinates.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadSection, saveStation, deleteSection } from '@/shared/api/sections/sectionService'
import { getUserData } from '@/shared/api/common/userCache'

const props = defineProps({
  stationData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions();
const canUpdate = computed(() => hasPermission('stat:upd'));
const canDelete = computed(() => hasPermission('stat:del'));

const form = ref({
  name: props.stationData.name || '',
  section: null,
  coordinates: {
    coordStartKm: props.stationData.rawData?.StartKm ?? null,
    coordStartPk: props.stationData.rawData?.StartPicket ?? null,
    coordStartZv: props.stationData.rawData?.StartLink ?? null,
    coordEndKm: props.stationData.rawData?.FinishKm ?? null,
    coordEndPk: props.stationData.rawData?.FinishPicket ?? null,
    coordEndZv: props.stationData.rawData?.FinishLink ?? null
  },
  rawData: props.stationData.rawData
})

const sectionOptions = ref([])
const loadingSections = ref(false)
const showConfirmModal = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)

const loadSectionsData = async () => {
  loadingSections.value = true
  try {
    const response = await loadSection({ page: 1, limit: 999999 })
    sectionOptions.value = response.data.map(section => ({
      label: section.name,
      value: section.id,
      pv: section.rawData?.pv || null
    }))

    if (props.stationData.rawData?.parent) {
      const selectedSection = sectionOptions.value.find(
        option => option.value === props.stationData.rawData.parent
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

const saveData = async () => {
  if (isSaving.value) return

  try {
    isSaving.value = true

    if (!form.value.name || !form.value.section || !form.value.coordinates.coordStartKm || !form.value.coordinates.coordStartPk || !form.value.coordinates.coordStartZv || !form.value.coordinates.coordEndKm || !form.value.coordinates.coordEndPk || !form.value.coordinates.coordEndZv) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    const userData = await getUserData()
    const currentDate = new Date().toISOString().split('T')[0]
    const raw = form.value.rawData

    const stationData = {
      id: props.stationData.id,
      parent: form.value.section?.value,
      cls: raw.cls,
      name: form.value.name,
      // id полей для координат, User, UpdatedAt
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
      idUser: raw.idUser,
      objUser: userData?.id || null,
      pvUser: userData?.pv || null,
      idUpdatedAt: raw.idUpdatedAt,
      UpdatedAt: currentDate
    }

    await saveStation('upd', stationData)
    notificationStore.showNotification('Раздельный пункт успешно обновлен', 'success')
    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при обновлении раздельного пункта', 'error')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = () => {
  showConfirmModal.value = true
}

const confirmDelete = async () => {
  if (isDeleting.value) return

  showConfirmModal.value = false
  isDeleting.value = true
  try {
    await deleteSection(props.stationData.id)
    notificationStore.showNotification('Раздельный пункт успешно удален', 'success')
    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification('Ошибка при удалении раздельного пункта', 'error')
  } finally {
    isDeleting.value = false
  }
}

const closeModal = () => {
  emit('close')
}

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