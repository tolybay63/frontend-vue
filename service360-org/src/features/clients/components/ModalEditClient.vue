<template>
  <ModalWrapper
    title="Редактировать клиента"
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
        placeholder="Введите наименование"
        v-model="form.name"
        :required="true"
      />

      <AppInput
        class="col-span-2"
        id="bin"
        label="БИН"
        placeholder="Введите БИН"
        v-model="form.bin"
        :required="true"
      />

      <AppInput
        class="col-span-2"
        id="contactPerson"
        label="Контактное лицо"
        placeholder="Введите контактное лицо"
        v-model="form.contactPerson"
        :required="true"
      />

      <AppInput
        class="col-span-2"
        id="contactDetails"
        label="Контактные данные"
        placeholder="Введите контактные данные"
        v-model="form.contactDetails"
        :required="true"
      />

      <AppInput
        class="col-span-2"
        id="description"
        label="Описание"
        placeholder="Введите описание..."
        v-model="form.description"
        type="textarea"
      />
    </div>

    <ConfirmationModal
      v-if="showConfirmModal"
      title="Удаление клиента"
      message="Вы действительно хотите удалить этого клиента?"
      @confirm="confirmDelete"
      @cancel="showConfirmModal = false"
    />
  </ModalWrapper>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePermissions } from '@/shared/api/auth/usePermissions';
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { updateClient, deleteClient } from '@/shared/api/clients/clientService'

const props = defineProps({
  clientData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'refresh', 'deleted'])
const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions();
const canUpdate = computed(() => hasPermission('cl:upd'));
const canDelete = computed(() => hasPermission('cl:del'));

const showConfirmModal = ref(false)
const isSaving = ref(false)

// Form data
const form = ref({
  name: props.clientData.name || '',
  bin: props.clientData.bin || '',
  contactPerson: props.clientData.contactPerson || '',
  contactDetails: props.clientData.contactDetails || '',
  description: props.clientData.description || '',
  rawData: props.clientData.rawData
})

// Save data
const saveData = async () => {
  if (isSaving.value) return

  try {
    isSaving.value = true

    // Validate required fields
    if (!form.value.name || !form.value.bin || !form.value.contactPerson || !form.value.contactDetails) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    await updateClient(form.value)

    notificationStore.showNotification('Клиент успешно обновлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при обновлении клиента', 'error')
  } finally {
    isSaving.value = false
  }
}

// Delete handlers
const handleDelete = () => {
  if (!props.clientData?.id) {
    notificationStore.showNotification('Не удалось получить ID клиента для удаления.', 'error')
    return
  }
  showConfirmModal.value = true
}

const confirmDelete = async () => {
  showConfirmModal.value = false
  try {
    await deleteClient(props.clientData.id)
    notificationStore.showNotification('Клиент успешно удален!', 'success')
    emit('deleted')
  } catch (error) {
    console.error('Ошибка при удалении клиента:', error)
    notificationStore.showNotification('Ошибка при удалении клиента.', 'error')
  }
}

// Close modal
const closeModal = () => {
  emit('close')
}
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