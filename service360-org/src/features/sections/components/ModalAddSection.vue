<template>
  <ModalWrapper
    title="Добавить участок"
    @close="closeModal"
    @save="saveData"
    :loading="isSaving"
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
        <SimpleCoordinates
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
import SimpleCoordinates from '@/shared/ui/FormControls/SimpleCoordinates.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { loadClients, saveSection } from '@/shared/api/sections/sectionService'
import { getUserData } from '@/shared/api/common/userCache'

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

// Form data
const form = ref({
  name: '',
  client: null,
  coordinates: {
    coordStartKm: null,
    coordEndKm: null
  },
  stageLength: null
})

// Dropdown options
const clientOptions = ref([])

// Loading states
const loadingClients = ref(false)
const isSaving = ref(false)

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
  if (isSaving.value) return

  try {
    isSaving.value = true

    // Validate required fields
    if (!form.value.name || !form.value.client || !form.value.coordinates.coordStartKm || !form.value.coordinates.coordEndKm || !form.value.stageLength) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    // Validate coordinate range
    if (form.value.coordinates.coordStartKm > form.value.coordinates.coordEndKm) {
      notificationStore.showNotification('Начальная координата не может быть больше конечной координаты', 'error')
      return
    }

    const userData = await getUserData()
    const currentDate = new Date().toISOString().split('T')[0]

    const payload = {
      name: form.value.name,
      StartKm: form.value.coordinates.coordStartKm,
      FinishKm: form.value.coordinates.coordEndKm,
      StageLength: form.value.stageLength,
      objClient: form.value.client.value,
      pvClient: form.value.client.pv,
      CreatedAt: currentDate,
      UpdatedAt: currentDate,
      objUser: userData?.id || null,
      pvUser: userData?.pv || null
    }

    console.log('Сохранение участка:', payload)

    await saveSection('ins', payload)

    notificationStore.showNotification('Участок успешно добавлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message || 'Ошибка при сохранении участка'
    notificationStore.showNotification(errorMessage, 'error')
  } finally {
    isSaving.value = false
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
  gap: 16px;
}

.col-span-2 {
  grid-column: span 2;
}
</style>
