import axios from 'axios'
import { handleApiError } from '@/shared/api/errorHandler'
import { resolveRetryOptions, shouldRetryRequest, getRetryDelay, sleep } from '@/shared/api/retry'
import { logApiProbe } from '@/shared/api/reportApiProbe'

export async function sendDataSourceRequest({
  url,
  method = 'GET',
  body,
  headers = {},
  retry = null,
  skipAuthRedirect = false,
}) {
  const normalizedMethod = method?.toUpperCase?.() || 'GET'
  const config = {
    url,
    method: normalizedMethod,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    timeout: 60000,
    withCredentials: true,
  }

  const preparePayload = (payload) => {
    if (payload == null) return null
    if (typeof payload === 'string') return payload
    try {
      return JSON.stringify(payload)
    } catch {
      return String(payload)
    }
  }

  const payload = preparePayload(body)
  if (payload) {
    if (normalizedMethod === 'GET') {
      config.method = 'POST'
      config.headers['X-HTTP-Method-Override'] = 'GET'
    }
    config.data = payload
  }

  logApiProbe({
    url: config.url,
    method: config.method,
    body,
    params: config.params,
    source: 'dataSource',
  })

  const retryOptions = resolveRetryOptions(retry)
  if (!retryOptions) {
    try {
      const response = await axios(config)
      return response.data
    } catch (err) {
      throw handleApiError(err, { skipAuthRedirect })
    }
  }

  let attempt = 0
  while (true) {
    try {
      const response = await axios(config)
      return response.data
    } catch (err) {
      if (attempt >= retryOptions.retries || !shouldRetryRequest(err, config, retryOptions)) {
        throw handleApiError(err, { skipAuthRedirect })
      }
      attempt += 1
      await sleep(getRetryDelay(retryOptions, attempt))
    }
  }
}
