import { defineComponent, h } from 'vue'
import { NConfigProvider, ruRU, dateRuRU } from 'naive-ui'

const themeOverrides = {
  common: {
    primaryColor: '#2b6cb0',
    primaryColorHover: '#2c5282',
    primaryColorPressed: '#2a4365',
    primaryColorSuppl: '#2b6cb0'
  }
}

export default defineComponent({
  setup(props, { slots }) {
    return () =>
      h(
        NConfigProvider,
        {
          themeOverrides,
          locale: ruRU,
          dateLocale: dateRuRU
        },
        slots.default ? slots.default() : null
      )
  }
})
