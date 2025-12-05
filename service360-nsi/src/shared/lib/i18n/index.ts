import { computed } from 'vue'

import { messagesRu } from './messages.ru'

export type Locale = 'ru'
export type MessageParams = Record<string, string | number>

type MessageTree = Record<string, unknown>

const dictionaries: Record<Locale, MessageTree> = {
  ru: messagesRu as unknown as MessageTree,
}

function resolveKey(source: unknown, path: string): unknown {
  if (source == null) return undefined
  const segments = path.split('.')
  let current: unknown = source
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isFinite(index)) return undefined
      current = current[index]
      continue
    }
    if (typeof current !== 'object' || current == null) {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function formatString(template: string, params?: MessageParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key]
    return value == null ? '' : String(value)
  })
}

export function useI18n() {
  const locale = computed<Locale>(() => 'ru')
  const dictionary = computed(() => dictionaries[locale.value])

  const t = (key: string, params?: MessageParams): string => {
    const raw = resolveKey(dictionary.value, key)
    if (typeof raw === 'string') {
      return formatString(raw, params)
    }
    if (typeof raw === 'number' || typeof raw === 'boolean') {
      return String(raw)
    }
    if (Array.isArray(raw)) {
      return raw.map((item) => (typeof item === 'string' ? item : String(item))).join(', ')
    }
    return key
  }

  const tm = <T = unknown>(key: string): T[] => {
    const raw = resolveKey(dictionary.value, key)
    if (Array.isArray(raw)) {
      return raw as T[]
    }
    return []
  }

  return {
    locale,
    t,
    tm,
  }
}
