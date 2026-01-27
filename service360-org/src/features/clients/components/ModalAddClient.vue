<template>
  <ModalWrapper
    title="Добавить нового клиента"
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

      <AppInput
        class="col-span-2"
        id="bin"
        label="БИН"
        placeholder="Введите БИН"
        v-model="form.bin"
        :required="true"
      />

      <AppInput
        class="col-span-2"
        id="contactPerson"
        label="Контактное лицо"
        placeholder="Введите контактное лицо"
        v-model="form.contactPerson"
        :required="true"
      />

      <AppInput
        class="col-span-2"
        id="contactDetails"
        label="Контактные данные"
        placeholder="Введите контактные данные"
        v-model="form.contactDetails"
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
import { ref } from 'vue'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'
import { useNotificationStore } from '@/app/stores/notificationStore'
import { saveClient } from '@/shared/api/clients/clientService'

const emit = defineEmits(['close', 'refresh'])
const notificationStore = useNotificationStore()

// Form data
const form = ref({
  name: '',
  bin: '',
  contactPerson: '',
  contactDetails: '',
  description: ''
})

// Save data
const saveData = async () => {
  try {
    // Validate required fields
    if (!form.value.name || !form.value.bin || !form.value.contactPerson || !form.value.contactDetails) {
      notificationStore.showNotification('Пожалуйста, заполните все обязательные поля', 'error')
      return
    }

    await saveClient(form.value)

    notificationStore.showNotification('Клиент успешно добавлен', 'success')

    emit('refresh')
    closeModal()
  } catch (error) {
    notificationStore.showNotification(error.message || 'Ошибка при сохранении клиента', 'error')
  }
}

// Close modal
const closeModal = () => {
  emit('close')
}
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