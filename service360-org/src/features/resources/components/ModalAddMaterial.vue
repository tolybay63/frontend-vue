<template>
  <ModalWrapper
    title="Добавить новый материал"
    @close="closeModal"
    @save="saveData"
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
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadMeasures, saveMaterial } from '@/shared/api/resources/resourceService'

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

// Form data
const form = ref({
  name: '',
  measure: null,
  description: ''
})

// Dropdown options
const measureOptions = ref([])

// Loading states
const loadingMeasures = ref(false)

// Load measures
const loadMeasuresData = async () => {
  loadingMeasures.value = true
  try {
    measureOptions.value = await loadMeasures()
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке единиц измерения', 'error')
  } finally {
    loadingMeasures.value = false
  }
}

// Save data
const saveData = async () => {
  try {
    // Validate required fields
    if (!form.value.name || !form.value.measure) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    await saveMaterial(form.value)

    notificationStore.showNotification('Материал успешно добавлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при сохранении материала', 'error')
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
  
  padding: 20px;
}

.col-span-2 {
  grid-column: span 2;
}
</style>
