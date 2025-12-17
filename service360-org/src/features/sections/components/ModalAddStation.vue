<template>
  <ModalWrapper
    title="Добавить раздельный пункт"
    @close="closeModal"
    @save="saveData"
  >
    <div class="form-section">
      <AppInput
        class="col-span-2"
        id="name"
        label="Наименование"
        placeholder="Введите наименование раздельного пункта"
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
    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import FullCoordinates from '@/shared/ui/FormControls/FullCoordinates.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadSection, saveStation } from '@/shared/api/sections/sectionService'
import { getUserData } from '@/shared/api/common/userCache'

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
  }
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
    if (!form.value.name || !form.value.section || !form.value.coordinates.coordStartKm || !form.value.coordinates.coordStartPk || !form.value.coordinates.coordStartZv || !form.value.coordinates.coordEndKm || !form.value.coordinates.coordEndPk || !form.value.coordinates.coordEndZv) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

// Получаем текущую дату
    const currentDate = new Date().toISOString().split('T')[0]

    // Get user data for objUser and pvUser
    const userData = await getUserData()

    // Формируем данные для сохранения
    const stationData = {
      parent: form.value.section.value,
      name: form.value.name,
      StartKm: form.value.coordinates.coordStartKm,
      StartPicket: form.value.coordinates.coordStartPk,
      StartLink: form.value.coordinates.coordStartZv,
      FinishKm: form.value.coordinates.coordEndKm,
      FinishPicket: form.value.coordinates.coordEndPk,
      FinishLink: form.value.coordinates.coordEndZv,
      CreatedAt: currentDate,
      UpdatedAt: currentDate,
      objUser: userData?.id || null,
      pvUser: userData?.pv || null
    }

    console.log('Создание раздельного пункта:', stationData)

    // Вызываем API для создания (операция "ins")
    await saveStation('ins', stationData)

    notificationStore.showNotification('Раздельный пункт успешно добавлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при сохранении раздельного пункта', 'error')
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
