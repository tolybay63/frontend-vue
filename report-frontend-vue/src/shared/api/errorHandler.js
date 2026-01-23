import { getActivePinia } from 'pinia'
import router from '@/shared/config/router'
import { useAuthStore } from '@/shared/stores/auth'

const STATUS_MESSAGES = {
  0: 'Нет соединения с сервером. Проверьте интернет.',
  400: 'Некорректный запрос.',
  401: 'Нужна авторизация. Войдите снова.',
  403: 'Недостаточно прав для выполнения операции.',
  404: 'Запрошенные данные не найдены.',
  409: 'Конфликт данных. Обновите страницу и попробуйте снова.',
  422: 'Ошибка валидации данных.',
  429: 'Слишком много запросов. Попробуйте позже.',
  500: 'Ошибка сервера. Попробуйте позже.',
  502: 'Сервер недоступен. Попробуйте позже.',
  503: 'Сервис временно недоступен.',
  504: 'Превышено время ожидания ответа.',
}

const AUTH_STORAGE_KEYS = [
  'userAuth',
  'curUser',
  'personnalInfo',
  'userId',
  'objUser',
  'pvUser',
]

let authCleanupTriggeredAt = 0

export function normalizeApiError(error) {
  const status = Number(error?.response?.status || 0)
  const responseData = error?.response?.data
  const serverMessage =
    typeof responseData === 'string'
      ? responseData
      : responseData?.message || responseData?.error || ''
  const message = serverMessage || STATUS_MESSAGES[status] || 'Произошла ошибка. Попробуйте позже.'
  return {
    status,
    message,
    serverMessage: serverMessage || null,
    code: error?.code || null,
    isNetworkError: !error?.response,
  }
}

export function handleApiError(error, options = {}) {
  const normalized = normalizeApiError(error)
  error.normalized = normalized
  error.humanMessage = normalized.message
  if (!error.message || error.message === 'Network Error') {
    error.message = normalized.message
  }
  const skipAuthRedirect = Boolean(options.skipAuthRedirect)
  if (!skipAuthRedirect && (normalized.status === 401 || normalized.status === 403)) {
    handleAuthFailure({ redirect: options.redirectOnAuthError !== false })
  }
  return error
}

function handleAuthFailure({ redirect = true } = {}) {
  const now = Date.now()
  if (now - authCleanupTriggeredAt < 1000) return
  authCleanupTriggeredAt = now
  clearAuthStorage()
  resetAuthStore()
  if (redirect) {
    redirectToLogin()
  }
}

function clearAuthStorage() {
  if (typeof window === 'undefined') return
  AUTH_STORAGE_KEYS.forEach((key) => {
    window.localStorage.removeItem(key)
  })
}

function resetAuthStore() {
  try {
    const pinia = getActivePinia()
    if (!pinia) return
    const authStore = useAuthStore(pinia)
    authStore.$patch({
      user: null,
      personalInfo: null,
      loading: false,
      error: null,
      initialized: true,
    })
  } catch (err) {
    console.warn('Failed to reset auth state', err)
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  const currentRoute = router?.currentRoute?.value
  if (currentRoute?.path === '/login') return
  const redirectTarget =
    currentRoute?.fullPath && currentRoute.fullPath !== '/login'
      ? currentRoute.fullPath
      : null
  if (typeof router?.replace === 'function') {
    const nextRoute = { path: '/login' }
    if (redirectTarget) {
      nextRoute.query = { redirect: redirectTarget }
    }
    router.replace(nextRoute).catch(() => {})
    return
  }
  const query = redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''
  window.location.assign(`/login${query}`)
}
