import axios from 'axios'
import { handleApiError } from '@/shared/api/errorHandler'
import { resolveRetryOptions, shouldRetryRequest, getRetryDelay, sleep } from '@/shared/api/retry'
import { logApiProbe } from '@/shared/api/reportApiProbe'

const baseURL = import.meta.env.VITE_API_BASE || '/api'

export const api = axios.create({
  baseURL,
  timeout: 30000,
})

// простейшие перехватчики
api.interceptors.request.use((config) => {
  // тут можно проставлять токен, если появится
  return config
})

export function attachApiInterceptors(client, { source } = {}) {
  client.interceptors.request.use((config) => {
    const url = resolveRequestUrl(config?.baseURL, config?.url)
    logApiProbe({
      url,
      method: config?.method,
      body: config?.data,
      params: config?.params,
      source,
    })
    return config
  })
  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const config = err?.config || {}
      const retryOptions = resolveRetryOptions(config.retry)
      if (retryOptions) {
        config.__retryCount = config.__retryCount || 0
        if (config.__retryCount < retryOptions.retries && shouldRetryRequest(err, config, retryOptions)) {
          config.__retryCount += 1
          await sleep(getRetryDelay(retryOptions, config.__retryCount))
          return client.request(config)
        }
      }
      const handled = handleApiError(err, {
        skipAuthRedirect: config?.skipAuthRedirect || config?.meta?.skipAuthRedirect,
      })
      return Promise.reject(handled)
    },
  )
}

attachApiInterceptors(api, { source: 'api' })

export function withRetry(config = {}, retryOptions = true) {
  return {
    ...config,
    retry: retryOptions,
  }
}

function resolveRequestUrl(baseURL, url) {
  if (!baseURL) return url
  if (!url) return baseURL
  const base = String(baseURL)
  const tail = String(url)
  if (base.endsWith('/') && tail.startsWith('/')) {
    return `${base.slice(0, -1)}${tail}`
  }
  if (!base.endsWith('/') && !tail.startsWith('/')) {
    return `${base}/${tail}`
  }
  return `${base}${tail}`
}
