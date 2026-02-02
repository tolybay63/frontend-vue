<template>
  <ModalWrapper
    v-if="modelValue"
    title="Изменить пароль"
    @close="close"
    @save="handleSave"
    :loading="isChangingPassword"
  >
    <div class="password-form">
      <AppInput
        id="oldPassword"
        label="Текущий пароль"
        placeholder="Введите текущий пароль"
        v-model="form.oldPassword"
        :required="true"
      />
      <AppPasswordInput
        id="newPassword"
        label="Новый пароль"
        placeholder="Введите новый пароль"
        v-model="form.newPassword"
        :required="true"
      />
      <AppPasswordInput
        id="confirmPassword"
        label="Подтвердите пароль"
        placeholder="Введите новый пароль ещё раз"
        v-model="form.confirmPassword"
        :required="true"
      />
      <div class="password-hint">
        Пароль должен содержать не менее 8 символов, включая цифры, заглавные и строчные буквы латинского алфавита и спец. символы (!@#^&amp;_)
      </div>
    </div>
  </ModalWrapper>
</template>

<script setup>
import { ref } from 'vue'
import { changePassword } from '@/shared/api/profile/profileApi'
import { useNotificationStore } from '@/app/stores/notificationStore'
import ModalWrapper from '@/app/layouts/Modal/ModalWrapper.vue'
import AppPasswordInput from '@/shared/ui/FormControls/AppPasswordInput.vue'
import AppInput from '@/shared/ui/FormControls/AppInput.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  userId: { type: [String, Number], default: null },
})

const emit = defineEmits(['update:modelValue'])
const notificationStore = useNotificationStore()

const isChangingPassword = ref(false)
const form = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#^&_]).{8,}$/

const resetForm = () => {
  form.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
}

const close = () => {
  resetForm()
  emit('update:modelValue', false)
}

const handleSave = async () => {
  if (isChangingPassword.value) return

  const { oldPassword, newPassword, confirmPassword } = form.value

  if (!oldPassword) {
    notificationStore.showNotification('Введите текущий пароль', 'error')
    return
  }
  if (!newPassword) {
    notificationStore.showNotification('Введите новый пароль', 'error')
    return
  }
  if (newPassword !== confirmPassword) {
    notificationStore.showNotification('Пароли не совпадают', 'error')
    return
  }
  if (!PASSWORD_REGEX.test(newPassword)) {
    notificationStore.showNotification(
      'Пароль должен содержать не менее 8 символов, включая цифры, заглавные и строчные буквы и спец. символы (!@#^&_)',
      'error'
    )
    return
  }

  if (!props.userId) {
    notificationStore.showNotification('Не удалось определить пользователя', 'error')
    return
  }

  isChangingPassword.value = true
  try {
    await changePassword(props.userId, oldPassword, newPassword)
    notificationStore.showNotification('Пароль успешно изменён!', 'success')
    close()
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message || 'Ошибка при смене пароля'
    notificationStore.showNotification(msg, 'error')
  } finally {
    isChangingPassword.value = false
  }
}
</script>

<style scoped>
.password-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 32px 32px;
}

.password-hint {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  background: #f8fafc;
  border-radius: 6px;
}
</style>
