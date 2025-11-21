<template>
  <div class="login-page">
    <img :src="logoUrl" alt="Service 360" class="logo" />

    <div class="lang-switcher">
      <button
        v-for="lang in languages"
        :key="lang.value"
        type="button"
        class="lang"
        :class="{ active: lang.value === currentLang }"
        @click="currentLang = lang.value"
      >
        {{ lang.label }}
      </button>
    </div>

    <div class="card">
      <h1>Вход в систему</h1>
      <p>Для входа во внутреннюю систему DTJ Service введите логин и пароль.</p>

      <form class="form" @submit.prevent="onSubmit">
        <label class="field">
          <span>Логин</span>
          <input
            v-model.trim="form.username"
            placeholder="Логин"
            autocomplete="username"
            required
          />
        </label>

        <label class="field">
          <span>Пароль</span>
          <input
            v-model="form.password"
            type="password"
            placeholder="Пароль"
            autocomplete="current-password"
            required
          />
        </label>

        <p v-if="authError" class="error">{{ authError }}</p>

        <button class="submit" type="submit" :disabled="disableSubmit">
          {{ loading ? 'Вход...' : 'Войти' }}
        </button>
      </form>
    </div>

    <p class="footer">Разработано ТОО «Компания системных исследований “Фактор”»</p>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/shared/stores/auth'
import logoUrl from '@/shared/assets/logo.png'

const languages = [
  { label: 'Қаз', value: 'kz' },
  { label: 'Рус', value: 'ru' },
  { label: 'Eng', value: 'en' },
]

const currentLang = ref('ru')
const form = reactive({ username: '', password: '' })

const authStore = useAuthStore()
const { loading, error } = storeToRefs(authStore)
const router = useRouter()
const route = useRoute()

const authError = computed(() => error.value)
const disableSubmit = computed(
  () => loading.value || !form.username.trim() || !form.password.trim(),
)

async function onSubmit() {
  if (disableSubmit.value) return
  try {
    await authStore.login({
      username: form.username.trim(),
      password: form.password,
    })

    const redirectTo =
      typeof route.query.redirect === 'string' && route.query.redirect
        ? route.query.redirect
        : '/'
    router.replace(redirectTo)
  } catch (err) {
    // ошибка уже отображается через authStore.error
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: radial-gradient(circle at 20% 20%, #eef3ff, #f5f7fb 55%, #fefefe);
  position: relative;
  text-align: center;
}
.logo {
  position: absolute;
  top: 32px;
  left: 32px;
  height: 56px;
}
.lang-switcher {
  position: absolute;
  top: 32px;
  right: 32px;
  display: flex;
  gap: 8px;
}
.lang {
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-weight: 500;
}
.lang.active {
  color: #2563eb;
}
.card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 24px 50px rgba(37, 99, 235, 0.1);
  padding: 48px 40px;
}
.card h1 {
  font-size: 24px;
  margin-bottom: 8px;
}
.card p {
  color: #6b7280;
  margin-bottom: 24px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}
.field span {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
  display: block;
}
.field input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  padding: 12px;
  font-size: 14px;
  background: #f9fafb;
}
.field input:focus {
  outline: none;
  border-color: #2563eb;
  background: #fff;
}
.submit {
  margin-top: 8px;
  width: 100%;
  border: none;
  border-radius: 12px;
  background: linear-gradient(90deg, #2563eb, #1d4ed8);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  padding: 14px;
  cursor: pointer;
  transition: opacity 0.2s ease;
  text-transform: uppercase;
}
.submit:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.error {
  color: #dc2626;
  font-size: 13px;
  margin-top: -4px;
}
.footer {
  margin-top: 16px;
  color: #9ca3af;
  font-size: 13px;
}
@media (max-width: 640px) {
  .logo,
  .lang-switcher {
    position: static;
    margin-bottom: 16px;
  }
  .card {
    padding: 32px 24px;
  }
}
</style>
