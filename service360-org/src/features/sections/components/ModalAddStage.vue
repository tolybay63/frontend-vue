<template>
  <ModalWrapper
    title="Добавить перегон"
    @close="closeModal"
    @save="saveData"
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
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import AppNumberInput from '@/shared/ui/FormControls/AppNumberInput.vue'
import FullCoordinates from '@/shared/ui/FormControls/FullCoordinates.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadSection } from '@/shared/api/sections/sectionService'

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

// Form data
const form = ref({
  name: '',
  section: null,
  coordinates: {
    coordStartKm: null,
    coordStartPk: null,
    coordStartZv: null,
    coordEndKm: null,
    coordEndPk: null,
    coordEndZv: null
  },
  stageLength: null
})

// Dropdown options
const sectionOptions = ref([])

// Loading states
const loadingSections = ref(false)

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
    if (!form.value.name || !form.value.section || !form.value.coordinates.coordStartKm || !form.value.coordinates.coordStartPk || !form.value.coordinates.coordStartZv || !form.value.coordinates.coordEndKm || !form.value.coordinates.coordEndPk || !form.value.coordinates.coordEndZv || !form.value.stageLength) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    const payload = {
      name: form.value.name,
      section: form.value.section,
      startKm: form.value.coordinates.coordStartKm,
      startPk: form.value.coordinates.coordStartPk,
      startLink: form.value.coordinates.coordStartZv,
      endKm: form.value.coordinates.coordEndKm,
      endPk: form.value.coordinates.coordEndPk,
      endLink: form.value.coordinates.coordEndZv,
      stageLength: form.value.stageLength
    }

    console.log('Сохранение перегона:', payload)

    // TODO: Добавить реальный вызов API для сохранения
    // await saveStage(payload)

    notificationStore.showNotification('Перегон успешно добавлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при сохранении перегона', 'error')
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
  padding: 20px;
}

.col-span-2 {
  grid-column: span 2;
}
</style>
