import { defineStore } from 'pinia'

const STORAGE_KEY = 'report-entity-archive'
const DEFAULT_ARCHIVE = {
  sources: [],
  configs: [],
}

function loadArchive() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_ARCHIVE }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_ARCHIVE }
    const parsed = JSON.parse(raw)
    return {
      sources: Array.isArray(parsed?.sources) ? parsed.sources : [],
      configs: Array.isArray(parsed?.configs) ? parsed.configs : [],
    }
  } catch (err) {
    console.warn('Failed to load archive state', err)
    return { ...DEFAULT_ARCHIVE }
  }
}

function persistArchive(archive) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(archive))
  } catch (err) {
    console.warn('Failed to persist archive state', err)
  }
}

function resolveBucket(type) {
  if (type === 'source' || type === 'sources') return 'sources'
  if (type === 'config' || type === 'configs') return 'configs'
  return null
}

function normalizeId(value) {
  if (value === null || typeof value === 'undefined') return ''
  return String(value).trim()
}

export const useEntityArchiveStore = defineStore('entityArchive', {
  state: () => ({
    archive: loadArchive(),
  }),
  getters: {
    isArchived: (state) => (type, id) => {
      const bucket = resolveBucket(type)
      if (!bucket) return false
      const normalized = normalizeId(id)
      if (!normalized) return false
      return state.archive[bucket].includes(normalized)
    },
  },
  actions: {
    archiveEntity(type, id) {
      const bucket = resolveBucket(type)
      if (!bucket) return
      const normalized = normalizeId(id)
      if (!normalized) return
      if (!this.archive[bucket].includes(normalized)) {
        this.archive[bucket].push(normalized)
        persistArchive(this.archive)
      }
    },
    restoreEntity(type, id) {
      const bucket = resolveBucket(type)
      if (!bucket) return
      const normalized = normalizeId(id)
      if (!normalized) return
      this.archive[bucket] = this.archive[bucket].filter(
        (entry) => entry !== normalized,
      )
      persistArchive(this.archive)
    },
    toggleArchive(type, id) {
      if (this.isArchived(type, id)) {
        this.restoreEntity(type, id)
      } else {
        this.archiveEntity(type, id)
      }
    },
  },
})
