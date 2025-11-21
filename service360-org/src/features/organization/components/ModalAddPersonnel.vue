<template>
  <ModalWrapper
    title="Добавить нового сотрудника"
    @close="closeModal"
    @save="saveData"
  >
    <div class="form-section">
      <AppInput
        id="tabNumber"
        label="Табельный номер"
        placeholder="Введите табельный номер"
        v-model="form.tabNumber"
        :required="true"
      />

      <AppInput
        id="login"
        label="Логин"
        placeholder="Введите логин"
        v-model="form.login"
        :required="true"
      />

      <AppInput
        id="secondName"
        label="Фамилия"
        placeholder="Введите фамилию"
        v-model="form.secondName"
        :required="true"
      />

      <AppInput
        id="firstName"
        label="Имя"
        placeholder="Введите имя"
        v-model="form.firstName"
        :required="true"
      />

      <AppInput
        id="middleName"
        label="Отчество"
        placeholder="Введите отчество"
        v-model="form.middleName"
      />

      <AppDropdown
        id="position"
        label="Должность"
        placeholder="Выберите должность"
        v-model="form.position"
        :options="positionOptions"
        :loading="loadingPositions"
        :required="true"
      />

      <AppDropdown
        id="location"
        label="Участок"
        placeholder="Выберите участок"
        v-model="form.location"
        :options="locationOptions"
        :loading="loadingLocations"
        :required="true"
      />

      <AppDropdown
        id="sex"
        label="Пол"
        placeholder="Выберите пол"
        v-model="form.sex"
        :options="sexOptions"
        :loading="loadingSex"
      />

      <AppInput
        id="email"
        label="Email"
        placeholder="Введите email"
        v-model="form.email"
        type="email"
      />

      <AppInput
        id="phone"
        label="Телефон"
        placeholder="Введите телефон"
        v-model="form.phone"
      />

      <AppInput
        id="dateBirth"
        label="Дата рождения"
        placeholder="Выберите дату рождения"
        v-model="form.dateBirth"
        type="date"
      />

      <AppInput
        id="dateEmployment"
        label="Дата приёма на работу"
        placeholder="Выберите дату приёма"
        v-model="form.dateEmployment"
        type="date"
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
import {
  loadPositions,
  loadLocations,
  loadUserSex,
  savePersonnel
} from '@/shared/api/organization/personnelService'

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

// Form data
const form = ref({
  tabNumber: '',
  login: '',
  secondName: '',
  firstName: '',
  middleName: '',
  position: null,
  location: null,
  sex: null,
  email: '',
  phone: '',
  dateBirth: '',
  dateEmployment: ''
})

// Dropdown options
const positionOptions = ref([])
const locationOptions = ref([])
const sexOptions = ref([])

// Loading states
const loadingPositions = ref(false)
const loadingLocations = ref(false)
const loadingSex = ref(false)

// Load positions
const loadPositionsData = async () => {
  loadingPositions.value = true
  try {
    positionOptions.value = await loadPositions()
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке должностей', 'error')
  } finally {
    loadingPositions.value = false
  }
}

// Load locations
const loadLocationsData = async () => {
  loadingLocations.value = true
  try {
    locationOptions.value = await loadLocations()
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке участков', 'error')
  } finally {
    loadingLocations.value = false
  }
}

// Load sex options
const loadSexData = async () => {
  loadingSex.value = true
  try {
    sexOptions.value = await loadUserSex()
  } catch (error) {
    notificationStore.showNotification('Ошибка при загрузке справочника пола', 'error')
  } finally {
    loadingSex.value = false
  }
}

// Save data
const saveData = async () => {
  try {
    // Validate required fields
    if (!form.value.tabNumber || !form.value.login || !form.value.secondName ||
        !form.value.firstName || !form.value.position || !form.value.location) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    await savePersonnel(form.value)

    notificationStore.showNotification('Сотрудник успешно добавлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при сохранении сотрудника', 'error')
  }
}

// Close modal
const closeModal = () => {
  emit('close')
}

// Initialize
onMounted(() => {
  loadPositionsData()
  loadLocationsData()
  loadSexData()
})
</script>

<style scoped>
.form-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px;
}
</style>
