import { defineStore } from 'pinia'
import {
  fetchCurrentUserRequest,
  loginRequest,
  logoutRequest,
} from '@/shared/api/auth'

function extractErrorMessage(err) {
  if (err?.response?.data?.message) return err.response.data.message
  if (typeof err?.response?.data === 'string') return err.response.data
  return err?.message || 'Не удалось авторизоваться'
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: false,
    error: null,
    initialized: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },
  actions: {
    async loadUser() {
      const { data } = await fetchCurrentUserRequest()
      this.user = data?.result || null
      return this.user
    },
    async checkSession() {
      if (this.initialized) return
      this.loading = true
      this.error = null
      try {
        await this.loadUser()
      } catch (err) {
        if (err?.response?.status !== 401) {
          console.warn('Не удалось получить профиль пользователя', err)
        }
        this.user = null
      } finally {
        this.loading = false
        this.initialized = true
      }
    },
    async login(credentials) {
      this.loading = true
      this.error = null
      try {
        await loginRequest(credentials)
        await this.loadUser()
        this.initialized = true
      } catch (err) {
        this.user = null
        this.error = extractErrorMessage(err)
        this.initialized = true
        throw err
      } finally {
        this.loading = false
      }
    },
    async logout() {
      try {
        await logoutRequest()
      } catch (err) {
        console.warn('Ошибка при выходе', err)
      } finally {
        this.user = null
        this.initialized = true
      }
    },
  },
})
