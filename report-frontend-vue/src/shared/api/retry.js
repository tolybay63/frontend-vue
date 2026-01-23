const DEFAULT_RETRY_OPTIONS = {
  retries: 2,
  delay: 400,
  maxDelay: 4000,
  backoff: 2,
  jitter: 0.2,
  retryOnStatuses: [408, 425, 429, 500, 502, 503, 504],
  retryOnNetwork: true,
  retryOnTimeout: true,
  methods: ['get'],
}

export function resolveRetryOptions(options) {
  if (!options) return null
  if (options === true) {
    return { ...DEFAULT_RETRY_OPTIONS }
  }
  if (typeof options !== 'object') return null
  const retries = Number.isFinite(options.retries)
    ? Math.max(0, Math.trunc(options.retries))
    : DEFAULT_RETRY_OPTIONS.retries
  const delay = Number.isFinite(options.delay)
    ? Math.max(0, options.delay)
    : DEFAULT_RETRY_OPTIONS.delay
  const maxDelay = Number.isFinite(options.maxDelay)
    ? Math.max(delay, options.maxDelay)
    : DEFAULT_RETRY_OPTIONS.maxDelay
  const backoff = Number.isFinite(options.backoff)
    ? Math.max(1, options.backoff)
    : DEFAULT_RETRY_OPTIONS.backoff
  const jitter = Number.isFinite(options.jitter)
    ? Math.min(1, Math.max(0, options.jitter))
    : DEFAULT_RETRY_OPTIONS.jitter
  const methods = Array.isArray(options.methods)
    ? options.methods.map((method) => String(method).toLowerCase())
    : DEFAULT_RETRY_OPTIONS.methods
  const retryOnStatuses = Array.isArray(options.retryOnStatuses)
    ? options.retryOnStatuses.map((status) => Number(status)).filter(Number.isFinite)
    : DEFAULT_RETRY_OPTIONS.retryOnStatuses

  return {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
    retries,
    delay,
    maxDelay,
    backoff,
    jitter,
    methods,
    retryOnStatuses,
  }
}

export function shouldRetryRequest(error, config, retryOptions) {
  if (!retryOptions || !retryOptions.retries) return false
  const method = String(config?.method || 'get').toLowerCase()
  if (Array.isArray(retryOptions.methods) && retryOptions.methods.length) {
    if (!retryOptions.methods.includes(method)) return false
  }
  const status = Number(error?.response?.status || 0)
  if (status === 401 || status === 403) return false
  if (status && Array.isArray(retryOptions.retryOnStatuses)) {
    return retryOptions.retryOnStatuses.includes(status)
  }
  if (!error?.response) {
    if (retryOptions.retryOnTimeout && isTimeoutError(error)) return true
    if (retryOptions.retryOnNetwork) return true
  }
  return false
}

export function getRetryDelay(retryOptions, attempt) {
  const baseDelay = retryOptions.delay * Math.pow(retryOptions.backoff, Math.max(0, attempt - 1))
  const jitter = retryOptions.jitter ? baseDelay * retryOptions.jitter * (Math.random() * 2 - 1) : 0
  return Math.min(retryOptions.maxDelay, Math.max(0, baseDelay + jitter))
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isTimeoutError(error) {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : ''
  return error?.code === 'ECONNABORTED' || message.includes('timeout')
}
