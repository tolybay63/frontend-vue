<template>
  <ModalWrapper
    title="Редактировать участок"
    @close="closeModal"
    @save="saveData"
    @delete="handleDelete"
    :show-save="canUpdate"
    :show-delete="canDelete"
    :loading="isSaving"
  >
    <div class="form-section">
      <AppInput
        class="col-span-2"
        id="name"
        label="Наименование"
        placeholder="Введите наименование участка"
        v-model="form.name"
        :required="true"
      />

      <AppDropdown
        class="col-span-2"
        id="client"
        label="Клиент"
        placeholder="Выберите клиента"
        v-model="form.client"
        :options="clientOptions"
        :loading="loadingClients"
        :required="true"
      />

      <div class="col-span-2">
        <CoordinateInputs
          v-model="form.coordinates"
          :disablePickets="true"
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
      title="Удаление участка"
      message="Вы действительно хотите удалить этот участок?"
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
import CoordinateInputs from '@/shared/ui/FormControls/CoordinateInputs.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadClients, saveSection, deleteSection } from '@/shared/api/sections/sectionService'
import { getUserData } from '@/shared/api/common/userCache'

const props = defineProps({
  sectionData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions();
const canUpdate = computed(() => hasPermission('sect:upd'));
const canDelete = computed(() => hasPermission('sect:del'));

const form = ref({
  name: props.sectionData.name || '',
  client: null,
  coordinates: {
    coordStartKm: props.sectionData.rawData?.StartKm ?? null,
    coordEndKm: props.sectionData.rawData?.FinishKm ?? null
  },
  stageLength: props.sectionData.StageLength || null,
  rawData: props.sectionData.rawData
})

const clientOptions = ref([])
const loadingClients = ref(false)
const showConfirmModal = ref(false)
const isSaving = ref(false)

const loadClientsData = async () => {
  loadingClients.value = true
  try {
    clientOptions.value = await loadClients()
    if (props.sectionData.rawData?.objClient) {
      const selectedClient = clientOptions.value.find(
        option => option.value === props.sectionData.rawData.objClient
      )
      if (selectedClient) {
        form.value.client = selectedClient
      }
    }
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке клиентов', 'error')
  } finally {
    loadingClients.value = false
  }
}

const saveData = async () => {
  if (isSaving.value) return

  try {
    isSaving.value = true

    if (!form.value.name || !form.value.client || !form.value.coordinates.coordStartKm || !form.value.coordinates.coordEndKm || !form.value.stageLength) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    const userData = await getUserData()
    const currentDate = new Date().toISOString().split('T')[0]
    const raw = form.value.rawData

    const payload = {
      id: props.sectionData.id,
      cls: raw.cls,
      name: form.value.name,
      // id полей для StartKm, FinishKm, StageLength, Client, User, UpdatedAt
      idStartKm: raw.idStartKm,
      StartKm: form.value.coordinates.coordStartKm,
      idFinishKm: raw.idFinishKm,
      FinishKm: form.value.coordinates.coordEndKm,
      idStageLength: raw.idStageLength,
      StageLength: form.value.stageLength,
      idClient: raw.idClient,
      objClient: form.value.client?.value,
      pvClient: form.value.client?.pv,
      idUser: raw.idUser,
      objUser: userData?.id || null,
      pvUser: userData?.pv || null,
      idUpdatedAt: raw.idUpdatedAt,
      UpdatedAt: currentDate
    }

    await saveSection('upd', payload)
    notificationStore.showNotification('Участок успешно обновлен', 'success')
    emit('refresh')
    closeModal()
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message || 'Ошибка при обновлении участка'
    notificationStore.showNotification(errorMessage, 'error')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = () => {
  showConfirmModal.value = true
}

const confirmDelete = async () => {
  showConfirmModal.value = false
  try {
    await deleteSection(props.sectionData.id)
    notificationStore.showNotification('Участок успешно удален', 'success')
    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification('Ошибка при удалении участка', 'error')
  }
}

const closeModal = () => {
  emit('close')
}

onMounted(() => {
  loadClientsData()
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