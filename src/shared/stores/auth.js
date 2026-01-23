import { defineStore } from 'pinia'
import {
  fetchCurrentUserRequest,
  fetchPersonalInfoRequest,
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
    personalInfo: null,
    loading: false,
    error: null,
    initialized: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },
  actions: {
    async loadPersonalInfo(userId) {
      if (!userId) {
        this.personalInfo = null
        clearStorage('personnalInfo')
        clearStorage('objUser')
        clearStorage('pvUser')
        return null
      }
      try {
        const { data } = await fetchPersonalInfoRequest(userId)
        const [record] = data?.result?.records || []
        this.personalInfo = record || null
        persistJson('personnalInfo', data || record || null)
        if (record) {
          persistValue('objUser', record.objUser)
          persistValue('pvUser', record.pvUser)
        } else {
          clearStorage('objUser')
          clearStorage('pvUser')
        }
      } catch (err) {
        console.warn('Не удалось получить персональные данные', err)
        this.personalInfo = null
        clearStorage('personnalInfo')
        clearStorage('objUser')
        clearStorage('pvUser')
      }
      return this.personalInfo
    },
    async loadUser() {
      const { data } = await fetchCurrentUserRequest()
      this.user = data?.result || null
      persistJson('curUser', data || this.user || null)
      persistValue('userId', this.user?.id)
      await this.loadPersonalInfo(this.user?.id)
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
        const { data } = await loginRequest(credentials)
        persistJson('userAuth', data ?? 'error')
        if (data !== 'ok') {
          throw new Error(
            typeof data === 'string'
              ? data
              : 'Авторизация не подтверждена сервером',
          )
        }
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
        clearStorage('userAuth')
        clearStorage('curUser')
        clearStorage('personnalInfo')
        clearStorage('userId')
        clearStorage('objUser')
        clearStorage('pvUser')
      }
    },
  },
})

function persistJson(key, value) {
  if (typeof window === 'undefined') return
  if (value == null) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, JSON.stringify(value))
}

function persistValue(key, value) {
  if (typeof window === 'undefined') return
  if (value == null) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, JSON.stringify(value))
}

function clearStorage(key) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}
