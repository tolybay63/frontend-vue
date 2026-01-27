<template>
  <ModalWrapper
    title="Добавить новый инструмент"
    @close="closeModal"
    @save="saveData"
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
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadToolTypes, loadSections, saveTool } from '@/shared/api/resources/resourceService'

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

// Form data
const form = ref({
  inventoryNumber: '',
  name: '',
  toolType: null,
  section: null,
  description: ''
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

    await saveTool(form.value)

    notificationStore.showNotification('Инструмент успешно добавлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при сохранении инструмента', 'error')
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
