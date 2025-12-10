<template>
  <ModalWrapper
    title="Добавить новую технику"
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
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadEquipmentTypes, loadSections, saveEquipment } from '@/shared/api/resources/resourceService'

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

// Form data
const form = ref({
  inventoryNumber: '',
  name: '',
  equipmentType: null,
  section: null,
  description: ''
})

// Dropdown options
const equipmentTypeOptions = ref([])
const sectionOptions = ref([])

// Loading states
const loadingEquipmentTypes = ref(false)
const loadingSections = ref(false)

// Load equipment types
const loadEquipmentTypesData = async () => {
  loadingEquipmentTypes.value = true
  try {
    equipmentTypeOptions.value = await loadEquipmentTypes()
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
    if (!form.value.inventoryNumber || !form.value.name || !form.value.equipmentType || !form.value.section) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    await saveEquipment(form.value)

    notificationStore.showNotification('Техника успешно добавлена', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при сохранении техники', 'error')
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
  
  padding: 20px;
}

.col-span-2 {
  grid-column: span 2;
}
</style>
