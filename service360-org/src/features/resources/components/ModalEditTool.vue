<template>
  <ModalWrapper
    title="Редактировать инструмент"
    @close="closeModal"
    :show-delete="canDelete"
    @save="saveData"
    @delete="handleDelete"
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
        id="toolType"
        label="Тип инструмента"
        placeholder="Выберите тип инструмента"
        v-model="form.toolType"
        :options="toolTypeOptions"
        :loading="loadingToolTypes"
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
      title="Удаление инструмента"
      message="Вы действительно хотите удалить этот инструмент?"
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
import { loadToolTypes, loadSections, updateTool, deleteResource } from '@/shared/api/resources/resourceService'
import { usePermissions } from '@/shared/api/auth/usePermissions'

const props = defineProps({
  toolData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'refresh', 'deleted'])
const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions()
const canDelete = computed(() => hasPermission('tool:del'))
const showConfirmModal = ref(false)

// Form data
const form = ref({
  inventoryNumber: props.toolData.number || '',
  name: props.toolData.name || '',
  toolType: null,
  section: null,
  description: props.toolData.rawData?.Description || '',
  rawData: props.toolData.rawData
})

// Dropdown options
const toolTypeOptions = ref([])
const sectionOptions = ref([])

// Loading states
const loadingToolTypes = ref(false)
const loadingSections = ref(false)

// Load tool types
const loadToolTypesData = async () => {
  loadingToolTypes.value = true
  try {
    toolTypeOptions.value = await loadToolTypes()

    // Устанавливаем выбранное значение после загрузки опций
    if (props.toolData.rawData?.fvTypTool) {
      const selectedType = toolTypeOptions.value.find(
        option => option.value === props.toolData.rawData.fvTypTool
      )
      if (selectedType) {
        form.value.toolType = selectedType
      }
    }
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке типов инструментов', 'error')
  } finally {
    loadingToolTypes.value = false
  }
}

// Load sections
const loadSectionsData = async () => {
  loadingSections.value = true
  try {
    sectionOptions.value = await loadSections()

    // Устанавливаем выбранное значение после загрузки опций
    if (props.toolData.rawData?.objLocationClsSection) {
      const selectedSection = sectionOptions.value.find(
        option => option.value === props.toolData.rawData.objLocationClsSection
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
  try {
    // Validate required fields
    if (!form.value.inventoryNumber || !form.value.name || !form.value.toolType || !form.value.section) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    await updateTool(form.value)

    notificationStore.showNotification('Инструмент успешно обновлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при обновлении инструмента', 'error')
  }
}

// Delete handlers
const handleDelete = () => {
  if (!props.toolData?.id) {
    notificationStore.showNotification('Не удалось получить ID инструмента для удаления.', 'error')
    return
  }
  showConfirmModal.value = true
}

const confirmDelete = async () => {
  showConfirmModal.value = false
  try {
    await deleteResource(props.toolData.id)
    notificationStore.showNotification('Инструмент успешно удален!', 'success')
    emit('deleted')
  } catch (error) {
    console.error('Ошибка при удалении инструмента:', error)
    notificationStore.showNotification('Ошибка при удалении инструмента.', 'error')
  }
}

// Close modal
const closeModal = () => {
  emit('close')
}

// Initialize
onMounted(() => {
  loadToolTypesData()
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
