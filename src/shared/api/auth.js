import axios from 'axios'

const RAW_AUTH_BASE = (import.meta.env.VITE_AUTH_BASE_URL || '').trim()
const DEV_PROXY_BASE = (import.meta.env.VITE_AUTH_DEV_PROXY_BASE || '').trim()

const AUTH_BASE_URL = resolveAuthBaseURL()

export const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
  withCredentials: true,
  timeout: 30000,
})

export function loginRequest({ username, password }) {
  return authApi.get('/auth/login', {
    params: { username, password },
  })
}

export function logoutRequest() {
  return authApi.get('/auth/logout')
}

export function fetchCurrentUserRequest() {
  return authApi.post(
    '/userapi',
    { method: 'data/getCurUserInfo', params: [] },
    { headers: { 'Content-Type': 'application/json' } },
  )
}

export function fetchPersonalInfoRequest(userId) {
  return authApi.post(
    '/userinfo',
    { method: 'data/getPersonnalInfo', params: [userId] },
    { headers: { 'Content-Type': 'application/json' } },
  )
}

function resolveAuthBaseURL() {
  const devFallback = DEV_PROXY_BASE || ''

  if (import.meta.env.DEV) {
    if (RAW_AUTH_BASE && !isAbsoluteUrl(RAW_AUTH_BASE)) {
      return RAW_AUTH_BASE
    }
    return devFallback
  }

  return RAW_AUTH_BASE || devFallback
}

function isAbsoluteUrl(url) {
  return /^https?:\/\//i.test(url)
}
