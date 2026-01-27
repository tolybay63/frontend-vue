<template>
  <ModalWrapper
    title="Редактировать сотрудника"
    @close="closeModal"
    :show-save="canUpdate"
    :show-delete="canDelete"
    @save="saveData"
    @delete="handleDelete"
  >
    <div class="form-section">
      <AppInput
        id="tabNumber"
        label="Табельный номер"
        placeholder="Введите табельный номер"
        v-model="form.tabNumber"
        :required="true"
        :disabled="!canUpdate"
      />

      <AppInput
        id="login"
        label="Логин"
        placeholder="Введите логин"
        v-model="form.login"
        :disabled="true"
      />

      <AppInput
        id="secondName"
        label="Фамилия"
        placeholder="Введите фамилию"
        v-model="form.secondName"
        :required="true"
        :disabled="!canUpdate"
      />

      <AppInput
        id="firstName"
        label="Имя"
        placeholder="Введите имя"
        v-model="form.firstName"
        :required="true"
        :disabled="!canUpdate"
      />

      <AppInput
        id="middleName"
        label="Отчество"
        placeholder="Введите отчество"
        v-model="form.middleName"
        :disabled="!canUpdate"
      />

      <AppDropdown
        id="position"
        label="Должность"
        placeholder="Выберите должность"
        v-model="form.position"
        :options="positionOptions"
        :loading="loadingPositions"
        :required="true"
        :disabled="!canUpdate"
      />

      <AppDropdown
        id="location"
        label="Участок"
        placeholder="Выберите участок"
        v-model="form.location"
        :options="locationOptions"
        :loading="loadingLocations"
        :required="true"
        :disabled="!canUpdate"
      />

      <AppDropdown
        id="sex"
        label="Пол"
        placeholder="Выберите пол"
        v-model="form.sex"
        :options="sexOptions"
        :loading="loadingSex"
        :required="true"
        :disabled="!canUpdate"
      />

      <AppInput
        id="email"
        label="Email"
        placeholder="Введите email"
        v-model="form.email"
        type="email"
        :required="true"
        :disabled="!canUpdate"
      />

      <PhoneInput
        id="phone"
        label="Телефон"
        placeholder="Введите телефон"
        v-model="form.phone"
        :required="true"
        :disabled="!canUpdate"
      />

      <AppDatePicker
        id="dateBirth"
        label="Дата рождения"
        placeholder="Выберите дату рождения"
        v-model="form.dateBirth"
        :required="true"
        :disabled="!canUpdate"
      />

      <AppDatePicker
        id="dateEmployment"
        label="Дата приёма на работу"
        placeholder="Выберите дату приёма"
        v-model="form.dateEmployment"
        :required="true"
        :disabled="!canUpdate"
      />

      <AppDatePicker
        id="dateDismissal"
        label="Дата увольнения"
        placeholder="Выберите дату увольнения"
        v-model="form.dateDismissal"
        :disabled="!canUpdate"
      />
    </div>

    <ConfirmationModal
      v-if="showConfirmModal"
      title="Удаление сотрудника"
      message="Вы действительно хотите удалить этого сотрудника?"
      @confirm="confirmDelete"
      @cancel="showConfirmModal = false" />
  </ModalWrapper>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import AppDropdown from '@/shared/ui/FormControls/AppDropdown.vue'
import AppDatePicker from '@/shared/ui/FormControls/AppDatePicker.vue'
import PhoneInput from '@/shared/ui/FormControls/PhoneInput.vue'
import ConfirmationModal from '@/shared/ui/ConfirmationModal.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { usePermissions } from '@/shared/api/auth/usePermissions'
import {
  loadPositions,
  loadLocations,
  loadUserSex,
  updatePersonnel,
  deletePersonnel
} from '@/shared/api/organization/personnelService'

const props = defineProps({
  personnelData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'refresh', 'deleted'])
const notificationStore = useNotificationStore()

const { hasPermission } = usePermissions()
const canUpdate = computed(() => hasPermission('team:upd'))
const canDelete = computed(() => hasPermission('team:del'))

const showConfirmModal = ref(false)

// Helper function to format date from backend to input format
const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date)) return ''
  return date.toISOString().split('T')[0]
}

// Form data
const form = ref({
  tabNumber: props.personnelData.tabNumber || '',
  login: props.personnelData.login || '',
  secondName: props.personnelData.secondName || '',
  firstName: props.personnelData.firstName || '',
  middleName: props.personnelData.middleName || '',
  position: null,
  location: null,
  sex: null,
  email: props.personnelData.email || '',
  phone: props.personnelData.phone || '',
  dateBirth: formatDateForInput(props.personnelData.rawData?.UserDateBirth),
  dateEmployment: formatDateForInput(props.personnelData.rawData?.DateEmployment),
  dateDismissal: formatDateForInput(props.personnelData.rawData?.DateDismissal),
  rawData: props.personnelData.rawData
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

    // Устанавливаем выбранное значение после загрузки опций
    if (props.personnelData.rawData?.fvPosition) {
      const selectedPosition = positionOptions.value.find(
        option => option.value === props.personnelData.rawData.fvPosition
      )
      if (selectedPosition) {
        form.value.position = selectedPosition
      }
    }
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

    // Устанавливаем выбранное значение после загрузки опций
    if (props.personnelData.rawData?.objLocation) {
      const selectedLocation = locationOptions.value.find(
        option => option.value === props.personnelData.rawData.objLocation
      )
      if (selectedLocation) {
        form.value.location = selectedLocation
      }
    }
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

    // Устанавливаем выбранное значение после загрузки опций
    if (props.personnelData.rawData?.fvUserSex) {
      const selectedSex = sexOptions.value.find(
        option => option.value === props.personnelData.rawData.fvUserSex
      )
      if (selectedSex) {
        form.value.sex = selectedSex
      }
    }
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
    if (!form.value.tabNumber || !form.value.secondName ||
        !form.value.firstName || !form.value.position ||
        !form.value.location || !form.value.sex || !form.value.email ||
        !form.value.phone || !form.value.dateBirth || !form.value.dateEmployment) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    await updatePersonnel(form.value)

    notificationStore.showNotification('Сотрудник успешно обновлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    // Check if error is about existing login
    if (error.response?.data?.error?.message === 'loginExists') {
      notificationStore.showNotification('Логин уже существует. Пожалуйста, используйте другой логин', 'error')
    } else {
      notificationStore.showNotification(error.message || 'Ошибка при обновлении сотрудника', 'error')
    }
  }
}

// Close modal
const closeModal = () => {
  emit('close')
}

// Delete handlers
const handleDelete = () => {
  if (!props.personnelData?.id) {
    notificationStore.showNotification('Не удалось получить ID сотрудника для удаления.', 'error')
    return
  }
  showConfirmModal.value = true
}

const confirmDelete = async () => {
  showConfirmModal.value = false
  try {
    // Определяем есть ли логин у сотрудника
    const hasLogin = !!(props.personnelData.login && props.personnelData.login.trim())

    await deletePersonnel(props.personnelData.id, hasLogin)
    notificationStore.showNotification('Сотрудник успешно удален!', 'success')
    emit('deleted')
  } catch (error) {
    console.error('Ошибка при удалении сотрудника:', error)
    notificationStore.showNotification('Ошибка при удалении сотрудника.', 'error')
  }
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
}
</style>
