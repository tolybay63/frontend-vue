<!-- Файл: src/pages/auth/LoginPage.vue
     Назначение: страница авторизации с формой логина.
     Использование: подключается в маршрутизаторе по пути /login. -->
<template>
  <section class="login-page">
    <NCard class="login-card">
      <header class="login-header">
        <h1 class="login-title">Вход в Service 360</h1>
        <p class="login-subtitle">
          Используйте свою учетную запись, чтобы продолжить работу в системе.
        </p>
      </header>

      <NForm class="login-form" label-placement="top" @submit.prevent="handleSubmit">
        <NAlert
          v-if="errorMessage"
          class="login-error"
          type="error"
          :show-icon="true"
          :closable="false"
        >
          {{ errorMessage }}
        </NAlert>

        <NFormItem
          label="Логин"
          :feedback="fieldErrors.username ?? undefined"
          :validation-status="fieldErrors.username ? 'error' : undefined"
        >
          <NInput
            v-model:value="form.username"
            placeholder="Введите логин"
            autocomplete="username"
          />
        </NFormItem>

        <NFormItem
          label="Пароль"
          :feedback="fieldErrors.password ?? undefined"
          :validation-status="fieldErrors.password ? 'error' : undefined"
        >
          <NInput
            v-model:value="form.password"
            type="password"
            placeholder="Введите пароль"
            autocomplete="current-password"
          />
        </NFormItem>

        <div class="login-actions">
          <NButton
            class="btn-primary"
            type="primary"
            attr-type="submit"
            :loading="isAuthenticating"
            :disabled="isAuthenticating"
          >
            Войти
          </NButton>
        </div>
      </NForm>
    </NCard>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NButton, NCard, NForm, NFormItem, NInput } from 'naive-ui'

import { useAuth } from '@features/auth'
import type { LoginCredentials } from '@features/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuth()
const isAuthenticating = auth.isAuthenticating
const authError = auth.error

const form = reactive<LoginCredentials>({ username: '', password: '' })

const fieldErrors = reactive<{ username: string | null; password: string | null }>({
  username: null,
  password: null,
})

const submitError = ref<string | null>(null)
const errorMessage = computed(() => submitError.value ?? authError.value ?? null)

const validate = () => {
  fieldErrors.username = form.username.trim() ? null : 'Введите логин'
  fieldErrors.password = form.password ? null : 'Введите пароль'
  return !fieldErrors.username && !fieldErrors.password
}

watch(() => form.username, (value) => {
  if (value && fieldErrors.username) {
    fieldErrors.username = null
  }
})

watch(() => form.password, (value) => {
  if (value && fieldErrors.password) {
    fieldErrors.password = null
  }
})

watch(
  () => route.query.redirect,
  (val) => {
    const redirect = Array.isArray(val) ? val[0] : val
    auth.setRedirectPath(typeof redirect === 'string' ? redirect : null)
  },
  { immediate: true },
)

const handleSubmit = async () => {
  if (isAuthenticating.value) return

  submitError.value = null
  auth.clearError()

  if (!validate()) {
    submitError.value = 'Проверьте правильность введенных данных'
    return
  }

  try {
    const res = await auth.login({ ...form })
    if (res?.ok) {
      form.password = ''
      const target = auth.consumeRedirectPath() ?? (route.query.redirect as string) ?? '/'
      await router.replace(target)
    }
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Не удалось выполнить вход'
  }
}
</script>

<style scoped>
.login-page {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(43, 108, 176, 0.10);
}

.login-header {
  margin-bottom: 24px;
  text-align: center;
}

.login-title {
  margin: 0 0 12px;
  font-size: 26px;
  font-weight: 700;
  color: #0f3e44;
}

.login-subtitle {
  margin: 0;
  color: #506266;
  font-size: 14px;
  line-height: 1.5;
}

.login-error {
  margin-bottom: 16px;
}

.login-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.login-actions .n-button {
  min-width: 120px;
}
</style>

