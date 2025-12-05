/** Файл: src/main.ts
 *  Назначение: точка входа приложения Vue, подключает плагины и монтирует App.
 *  Использование: выполняется Vite при старте и в продакшн-сборке.
 */
import '@shared/styles/tokens.css'
import '@shared/styles/globals.css'
import './assets/styles/service360.css'

import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { i18n } from '@shared/i18n'
import {
  NConfigProvider,
  NDialogProvider,
  NLoadingBarProvider,
  NMessageProvider,
  NNotificationProvider,
  createDiscreteApi,
  dateRuRU,
  ruRU,
} from 'naive-ui'
import type { ConfigProviderProps, GlobalThemeOverrides } from 'naive-ui'

import App from './App.vue'
import { router } from '@app/router'
import { registerPWA } from './pwa'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    // Brand (cool blue)
    primaryColor: '#2b6cb0',
    primaryColorHover: '#2c5282',
    primaryColorPressed: '#2A4365',
    primaryColorSuppl: '#3182ce',
    // Status
    infoColor: '#63b3ed',
    successColor: '#198754',
    warningColor: '#FFC107',
    errorColor: '#DC3545',
  },
}

const configProviderProps: ConfigProviderProps = {
  locale: ruRU,
  dateLocale: dateRuRU,
  themeOverrides,
}

const discreteApis = createDiscreteApi(['message', 'notification', 'dialog', 'loadingBar'], {
  configProviderProps,
})

const app = createApp({
  setup() {
    return () =>
      h(NConfigProvider, configProviderProps, {
        default: () =>
          h(NLoadingBarProvider, null, {
            default: () =>
              h(NDialogProvider, null, {
                default: () =>
                  h(NNotificationProvider, null, {
                    default: () => h(NMessageProvider, null, { default: () => h(App) }),
                  }),
              }),
          }),
      })
  },
})

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
})

const messageKey = Symbol('naive-message')
const notificationKey = Symbol('naive-notification')
const dialogKey = Symbol('naive-dialog')
const loadingBarKey = Symbol('naive-loading-bar')

app.provide(messageKey, discreteApis.message)
app.provide(notificationKey, discreteApis.notification)
app.provide(dialogKey, discreteApis.dialog)
app.provide(loadingBarKey, discreteApis.loadingBar)

app.use(createPinia())
app.use(VueQueryPlugin, { queryClient })
app.use(router)
app.use(i18n)

app.mount('#app')
registerPWA()
