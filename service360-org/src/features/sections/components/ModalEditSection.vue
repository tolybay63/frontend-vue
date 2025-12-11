<template>
  <ModalWrapper
    title="Редактировать участок"
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

const props = defineProps({
  sectionData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

// Form data
const form = ref({
  name: props.sectionData.name || '',
  client: null,
  coordinates: {
    coordStartKm: props.sectionData.rawData?.StartKm ?? null,
    coordStartPk: null,
    coordEndKm: props.sectionData.rawData?.FinishKm ?? null,
    coordEndPk: null
  },
  stageLength: props.sectionData.StageLength || null,
  rawData: props.sectionData.rawData
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

    // Устанавливаем выбранное значение после загрузки опций
    if (props.sectionData.rawData?.objClient) {
      const selectedClient = clientOptions.value.find(
        option => option.value === props.sectionData.rawData.objClient
      )
      if (selectedClient) {
        form.value.client = selectedClient
      }
    }
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
      stageLength: form.value.stageLength,
      rawData: form.value.rawData
    }

    console.log('Обновление участка:', payload)

    // TODO: Добавить реальный вызов API для обновления
    // await updateSection(payload)

    notificationStore.showNotification('Участок успешно обновлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при обновлении участка', 'error')
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
