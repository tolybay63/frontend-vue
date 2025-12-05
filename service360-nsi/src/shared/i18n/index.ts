import { createI18n } from 'vue-i18n'
import nsiRu from './nsi.ru.json'
import nsiComponentsRu from './nsi.components.ru.json'

type Dict = Record<string, unknown>
const toDict = (value: unknown): Dict =>
  typeof value === 'object' && value !== null ? (value as Dict) : {}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'ru',
  fallbackLocale: 'ru',
  messages: {
    ru: {
      // Namespace for NSI-specific translations (merged with overrides)
      nsi: {
        ...toDict(nsiRu),
        // shallow merge on root, deep merge for objectTypes
        objectTypes: {
          ...toDict(toDict(nsiRu).objectTypes),
          ...toDict(toDict(nsiComponentsRu).objectTypes),
        },
      },
    },
  },
})

export type AppI18n = typeof i18n
