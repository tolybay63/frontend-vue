<template>
  <ModalWrapper
    title="Редактировать технику"
    @close="closeModal"
    :show-delete="canDelete"
    @save="saveData"
    @delete="handleDelete"
    :loading="isSaving"
  >
    <div class="form-section">
      <AppInput
        class="col-span-2"
        id="inventoryNumber"
        label="Инвентарный номер"
        placeholder="Введите инвентарный номер"
        v-model="form.inventoryNumber"
        :required="true"
      />

      <AppInput
        class="col-span-2"
        id="name"
        label="Наименование"
        placeholder="Введите наименование"
        v-model="form.name"
        :required="true"
      />

      <AppDropdown
        class="col-span-2"
        id="equipmentType"
        label="Тип техники"
        placeholder="Выберите тип техники"
        v-model="form.equipmentType"
        :options="equipmentTypeOptions"
        :loading="loadingEquipmentTypes"
        :required="true"
      />

      <AppDropdown
        class="col-span-2"
        id="section"
        label="Участок"
        placeholder="Выберите участок"
        v-model="form.section"
        :options="sectionOptions"
        :loading="loadingSections"
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
      title="Удаление техники"
      message="Вы действительно хотите удалить эту технику?"
      @confirm="confirmDelete"
      @cancel="showConfirmModal = false" />
  </ModalWrapper>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadEquipmentTypes, loadSections, updateEquipment, deleteResource } from '@/shared/api/resources/resourceService'
import { usePermissions } from '@/shared/api/auth/usePermissions'

const props = defineProps({
  equipmentData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'refresh', 'deleted'])
const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions()
const canDelete = computed(() => hasPermission('equ:del'))
const showConfirmModal = ref(false)

// Form data
const form = ref({
  inventoryNumber: props.equipmentData.number || '',
  name: props.equipmentData.name || '',
  equipmentType: null,
  section: null,
  description: props.equipmentData.rawData?.Description || '',
  rawData: props.equipmentData.rawData
})

// Dropdown options
const equipmentTypeOptions = ref([])
const sectionOptions = ref([])

// Loading states
const loadingEquipmentTypes = ref(false)
const loadingSections = ref(false)
const isSaving = ref(false)

// Load equipment types
const loadEquipmentTypesData = async () => {
  loadingEquipmentTypes.value = true
  try {
    equipmentTypeOptions.value = await loadEquipmentTypes()

    // Устанавливаем выбранное значение после загрузки опций
    if (props.equipmentData.rawData?.fvTypEquipment) {
      const selectedType = equipmentTypeOptions.value.find(
        option => option.value === props.equipmentData.rawData.fvTypEquipment
      )
      if (selectedType) {
        form.value.equipmentType = selectedType
      }
    }
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке типов техники', 'error')
  } finally {
    loadingEquipmentTypes.value = false
  }
}

// Load sections
const loadSectionsData = async () => {
  loadingSections.value = true
  try {
    sectionOptions.value = await loadSections()

    // Устанавливаем выбранное значение после загрузки опций
    if (props.equipmentData.rawData?.objLocationClsSection) {
      const selectedSection = sectionOptions.value.find(
        option => option.value === props.equipmentData.rawData.objLocationClsSection
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
    if (!form.value.inventoryNumber || !form.value.name || !form.value.equipmentType || !form.value.section) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    await updateEquipment(form.value)

    notificationStore.showNotification('Техника успешно обновлена', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при обновлении техники', 'error')
  } finally {
    isSaving.value = false
  }
}

// Delete handlers
const handleDelete = () => {
  if (!props.equipmentData?.id) {
    notificationStore.showNotification('Не удалось получить ID техники для удаления.', 'error')
    return
  }
  showConfirmModal.value = true
}

const confirmDelete = async () => {
  showConfirmModal.value = false
  try {
    await deleteResource(props.equipmentData.id)
    notificationStore.showNotification('Техника успешно удалена!', 'success')
    emit('deleted')
  } catch (error) {
    console.error('Ошибка при удалении техники:', error)
    notificationStore.showNotification('Ошибка при удалении техники.', 'error')
  }
}

// Close modal
const closeModal = () => {
  emit('close')
}

// Initialize
onMounted(() => {
  loadEquipmentTypesData()
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
