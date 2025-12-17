import { defineStore } from 'pinia'
import {
  DEFAULT_FIELD_DICTIONARY_ID,
  loadFieldDictionaryConstant,
  saveFieldDictionaryConstant,
} from '@/shared/api/fieldDictionary'

const STORAGE_KEY = 'report-field-dictionary'
const REMOTE_SYNC_DELAY = 800
let pendingFetchPromise = null

function loadDictionary() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.warn('Failed to load field dictionary', err)
  }
  return []
}

function persistDictionary(entries) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function normalizeUrl(value) {
  if (!value || typeof value !== 'string') return ''
  try {
    const url = new URL(value, window.location.origin)
    return url.pathname
  } catch {
    return value.trim()
  }
}

function normalizeEntry(entry = {}) {
  const key = typeof entry?.key === 'string' ? entry.key.trim() : ''
  if (!key) return null
  const label = typeof entry?.label === 'string' ? entry.label : ''
  const urls = Array.isArray(entry?.urls) ? entry.urls : []
  const normalizedUrls = Array.from(
    new Set(
      urls
        .map((url) => normalizeUrl(url))
        .filter((url) => typeof url === 'string' && url.trim().length),
    ),
  )
  return {
    key,
    label,
    urls: normalizedUrls,
  }
}

function normalizeEntries(list = []) {
  const map = new Map()
  list.forEach((entry) => {
    const normalized = normalizeEntry(entry)
    if (!normalized) return
    const existing = map.get(normalized.key)
    if (existing) {
      const mergedUrls = new Set([...(existing.urls || []), ...(normalized.urls || [])])
      map.set(normalized.key, {
        key: normalized.key,
        label: normalized.label || existing.label,
        urls: Array.from(mergedUrls),
      })
    } else {
      map.set(normalized.key, normalized)
    }
  })
  return Array.from(map.values())
}

export const useFieldDictionaryStore = defineStore('fieldDictionary', {
  state: () => ({
    entries: normalizeEntries(loadDictionary()),
    remoteId: DEFAULT_FIELD_DICTIONARY_ID || null,
    loading: false,
    loaded: false,
    error: '',
    saving: false,
    syncTimer: null,
    pendingSync: false,
  }),
  getters: {
    labelMap: (state) =>
      state.entries.reduce((acc, entry) => {
        if (entry.key && entry.label) {
          acc[entry.key] = entry.label
        }
        return acc
      }, {}),
    labelMapLower: (state) =>
      state.entries.reduce((acc, entry) => {
        if (entry.key && entry.label) {
          acc[String(entry.key).toLowerCase()] = entry.label
        }
        return acc
      }, {}),
    entryMap: (state) =>
      state.entries.reduce((acc, entry) => {
        acc[entry.key] = entry
        return acc
      }, {}),
  },
  actions: {
    async fetchDictionary(force = false) {
      if (pendingFetchPromise && !force) {
        return pendingFetchPromise
      }
      if (this.loading || (this.loaded && !force)) {
        return this.entries
      }
      this.loading = true
      this.error = ''
      pendingFetchPromise = loadFieldDictionaryConstant(this.remoteId || undefined)
      try {
        const payload = await pendingFetchPromise
        this.remoteId = payload?.idFieldDict || this.remoteId || DEFAULT_FIELD_DICTIONARY_ID || null
        const incoming = normalizeEntries(payload?.entries || [])
        this.entries = incoming
        this.loaded = true
        persistDictionary(this.entries)
      } catch (err) {
        console.warn('Failed to load field dictionary', err)
        this.error = 'Не удалось загрузить словарь полей.'
      } finally {
        this.loading = false
        pendingFetchPromise = null
      }
      return this.entries
    },
    saveEntry({ key, label, url }) {
      const normalizedKey = key?.trim()
      if (!normalizedKey) return
      const normalizedLabel = typeof label === 'string' ? label : ''
      const normalizedUrl = normalizeUrl(url)
      const existingIndex = this.entries.findIndex((item) => item.key === normalizedKey)
      const urls = new Set(
        existingIndex >= 0 ? this.entries[existingIndex].urls || [] : [],
      )
      if (normalizedUrl) {
        urls.add(normalizedUrl)
      }
      const entry = {
        key: normalizedKey,
        label: normalizedLabel,
        urls: Array.from(urls),
      }
      if (existingIndex >= 0) {
        this.entries.splice(existingIndex, 1, entry)
      } else {
        this.entries.push(entry)
      }
      persistDictionary(this.entries)
      this.scheduleRemoteSync()
    },
    scheduleRemoteSync(delay = REMOTE_SYNC_DELAY) {
      if (this.syncTimer && typeof window !== 'undefined') {
        window.clearTimeout(this.syncTimer)
        this.syncTimer = null
      }
      if (typeof window === 'undefined') {
        this.syncRemoteDictionary()
        return
      }
      this.syncTimer = window.setTimeout(() => {
        this.syncTimer = null
        this.syncRemoteDictionary()
      }, typeof delay === 'number' ? delay : REMOTE_SYNC_DELAY)
    },
    async syncRemoteDictionary() {
      if (!this.entries.length && !this.loaded) return
      if (this.saving) {
        this.pendingSync = true
        return
      }
      this.saving = true
      this.pendingSync = false
      try {
        await saveFieldDictionaryConstant(this.entries, this.remoteId || DEFAULT_FIELD_DICTIONARY_ID || undefined)
        this.error = ''
      } catch (err) {
        console.warn('Failed to save field dictionary', err)
        this.error = 'Не удалось сохранить словарь полей.'
      } finally {
        this.saving = false
        if (this.pendingSync) {
          this.pendingSync = false
          this.scheduleRemoteSync(200)
        }
      }
    },
  },
})
