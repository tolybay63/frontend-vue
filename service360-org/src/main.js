import { createApp } from 'vue'
import App from './App.vue'
import router from './app/router'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import naive from 'naive-ui'
import VCalendar from 'v-calendar'
import 'v-calendar/style.css'

import './assets/styles/global.css'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(naive)
app.use(VCalendar, {})
app.use(pinia)
app.use(router)

app.mount('#app')