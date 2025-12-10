<template>
  <ModalWrapper
    title="Добавить участок"
    @close="closeModal"
    @save="saveData"
  >
    <div class="form-section">
      <AppInput
        class="col-span-2"
        id="name"
        label="Наименование"
        placeholder="Введите наименование участка"
        v-model="form.name"
        :required="true"
      />

      <AppDropdown
        class="col-span-2"
        id="client"
        label="Клиент"
        placeholder="Выберите клиента"
        v-model="form.client"
        :options="clientOptions"
        :loading="loadingClients"
        :required="true"
      />

      <div class="col-span-2">
        <CoordinateInputs
          v-model="form.coordinates"
          :disablePickets="true"
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
import CoordinateInputs from '@/shared/ui/FormControls/CoordinateInputs.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadClients } from '@/shared/api/sections/sectionService'

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

// Form data
const form = ref({
  name: '',
  client: null,
  coordinates: {
    coordStartKm: null,
    coordStartPk: null,
    coordEndKm: null,
    coordEndPk: null
  },
  stageLength: null
})

// Dropdown options
const clientOptions = ref([])

// Loading states
const loadingClients = ref(false)

// Load clients
const loadClientsData = async () => {
  loadingClients.value = true
  try {
    clientOptions.value = await loadClients()
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке клиентов', 'error')
  } finally {
    loadingClients.value = false
  }
}

// Save data
const saveData = async () => {
  try {
    // Validate required fields
    if (!form.value.name || !form.value.client || !form.value.coordinates.coordStartKm || !form.value.coordinates.coordEndKm || !form.value.stageLength) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    const payload = {
      name: form.value.name,
      client: form.value.client,
      startKm: form.value.coordinates.coordStartKm,
      endKm: form.value.coordinates.coordEndKm,
      stageLength: form.value.stageLength
    }

    console.log('Сохранение участка:', payload)

    // TODO: Добавить реальный вызов API для сохранения
    // await saveSection(payload)

    notificationStore.showNotification('Участок успешно добавлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при сохранении участка', 'error')
  }
}

// Close modal
const closeModal = () => {
  emit('close')
}

// Initialize
onMounted(() => {
  loadClientsData()
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
