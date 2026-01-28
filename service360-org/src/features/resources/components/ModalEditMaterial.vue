<template>
  <ModalWrapper
    title="Редактировать материал"
    @close="closeModal"
    :show-delete="canDelete"
    @save="saveData"
    @delete="handleDelete"
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

      <AppDropdown
        class="col-span-2"
        id="measure"
        label="Единица измерения"
        placeholder="Выберите единицу измерения"
        v-model="form.measure"
        :options="measureOptions"
        :loading="loadingMeasures"
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
      title="Удаление материала"
      message="Вы действительно хотите удалить этот материал?"
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
import { loadMeasures, updateMaterial, deleteResource } from '@/shared/api/resources/resourceService'
import { usePermissions } from '@/shared/api/auth/usePermissions'

const props = defineProps({
  materialData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'refresh', 'deleted'])
const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions()
const canDelete = computed(() => hasPermission('mat:del'))
const showConfirmModal = ref(false)

// Form data
const form = ref({
  name: props.materialData.name || '',
  measure: null,
  description: props.materialData.rawData?.Description || '',
  rawData: props.materialData.rawData
})

// Dropdown options
const measureOptions = ref([])

// Loading states
const loadingMeasures = ref(false)
const isSaving = ref(false)

// Load measures
const loadMeasuresData = async () => {
  loadingMeasures.value = true
  try {
    measureOptions.value = await loadMeasures()

    // Устанавливаем выбранное значение после загрузки опций
    if (props.materialData.rawData?.meaMeasure) {
      const selectedMeasure = measureOptions.value.find(
        option => option.value === props.materialData.rawData.meaMeasure
      )
      if (selectedMeasure) {
        form.value.measure = selectedMeasure
      }
    }
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке единиц измерения', 'error')
  } finally {
    loadingMeasures.value = false
  }
}

// Save data
const saveData = async () => {
  if (isSaving.value) return

  try {
    isSaving.value = true

    // Validate required fields
    if (!form.value.name || !form.value.measure) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    await updateMaterial(form.value)

    notificationStore.showNotification('Материал успешно обновлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при обновлении материала', 'error')
  } finally {
    isSaving.value = false
  }
}

// Delete handlers
const handleDelete = () => {
  if (!props.materialData?.id) {
    notificationStore.showNotification('Не удалось получить ID материала для удаления.', 'error')
    return
  }
  showConfirmModal.value = true
}

const confirmDelete = async () => {
  showConfirmModal.value = false
  try {
    await deleteResource(props.materialData.id)
    notificationStore.showNotification('Материал успешно удален!', 'success')
    emit('deleted')
  } catch (error) {
    console.error('Ошибка при удалении материала:', error)
    notificationStore.showNotification('Ошибка при удалении материала.', 'error')
  }
}

// Close modal
const closeModal = () => {
  emit('close')
}

// Initialize
onMounted(() => {
  loadMeasuresData()
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
