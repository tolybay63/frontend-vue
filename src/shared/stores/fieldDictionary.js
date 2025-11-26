import { defineStore } from 'pinia'

const STORAGE_KEY = 'report-field-dictionary'

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

export const useFieldDictionaryStore = defineStore('fieldDictionary', {
  state: () => ({
    entries: loadDictionary(),
  }),
  getters: {
    labelMap: (state) =>
      state.entries.reduce((acc, entry) => {
        if (entry.key && entry.label) {
          acc[entry.key] = entry.label
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
    },
  },
})
