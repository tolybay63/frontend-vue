import axios from 'axios'

export async function sendDataSourceRequest({ url, method = 'GET', body, headers = {} }) {
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

  const response = await axios(config)
  return response.data
}
