<template>
  <ModalWrapper
    title="Редактировать перегон"
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

const props = defineProps({
  stageData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

// Form data
const form = ref({
  name: props.stageData.name || '',
  section: null,
  coordinates: {
    coordStartKm: props.stageData.rawData?.StartKm ?? null,
    coordStartPk: props.stageData.rawData?.StartPicket ?? null,
    coordStartZv: props.stageData.rawData?.StartLink ?? null,
    coordEndKm: props.stageData.rawData?.FinishKm ?? null,
    coordEndPk: props.stageData.rawData?.FinishPicket ?? null,
    coordEndZv: props.stageData.rawData?.FinishLink ?? null
  },
  stageLength: props.stageData.StageLength || null,
  rawData: props.stageData.rawData
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

    // Устанавливаем выбранное значение после загрузки опций
    if (props.stageData.rawData?.parent) {
      const selectedSection = sectionOptions.value.find(
        option => option.value === props.stageData.rawData.parent
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
      stageLength: form.value.stageLength,
      rawData: form.value.rawData
    }

    console.log('Обновление перегона:', payload)

    // TODO: Добавить реальный вызов API для обновления
    // await updateStage(payload)

    notificationStore.showNotification('Перегон успешно обновлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при обновлении перегона', 'error')
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
