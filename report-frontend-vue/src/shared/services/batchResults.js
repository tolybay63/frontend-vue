import { getBatchResults } from '@/shared/api/batch'

const MAX_PAGE_SIZE = 5000
const DEFAULT_PAGE_SIZE = Math.min(
  Number(import.meta.env.VITE_BATCH_RESULTS_PAGE_SIZE) || 1000,
  MAX_PAGE_SIZE,
)
const MAX_PAGES_GUARD = 10000

export function hasPagedBatchResults(status) {
  return Boolean(status?.resultsAvailableVia === 'paged' || status?.resultsFileRef)
}

export async function loadPagedBatchResults(jobId, { pageSize } = {}) {
  if (!jobId) {
    throw new Error('Batch job id is required to load results.')
  }
  const limit = clampNumber(pageSize || DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE)
  let offset = 0
  let total = null
  const results = []
  let pagesFetched = 0

  while (true) {
    const page = await getBatchResults(jobId, { offset, limit })
    const pageResults = Array.isArray(page?.results) ? page.results : []
    if (total == null) {
      const reportedTotal = Number(page?.total)
      total = Number.isFinite(reportedTotal) ? reportedTotal : null
    }
    results.push(...pageResults)
    offset += pageResults.length
    pagesFetched += 1

    if (total != null && results.length >= total) break
    if (pageResults.length < limit) break
    if (pagesFetched >= MAX_PAGES_GUARD) break
  }

  return { results, total: total ?? results.length, status: 'done' }
}

function clampNumber(value, min, max) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return min
  return Math.min(Math.max(Math.trunc(numeric), min), max)
}
