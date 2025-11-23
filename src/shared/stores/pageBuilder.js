import { defineStore } from 'pinia'

const PAGE_STORAGE_KEY = 'page-builder-pages'
const TEMPLATE_STORAGE_KEY = 'page-builder-templates'

const defaultTemplates = [
  {
    id: 'tpl-traffic',
    name: 'Сводка по отклонениям',
    description: 'Планы: перекос и просадки по участкам с графиком.',
    dataSource: 'plans',
    visualization: 'bar',
    snapshot: {
      pivot: {
        rows: ['StartKm'],
        columns: ['PlanDateEnd'],
        filters: [],
      },
      metrics: [{ id: 'metric-1', fieldKey: 'PlanDateEnd', aggregator: 'count' }],
    },
  },
  {
    id: 'tpl-parameters',
    name: 'Параметры пути',
    description: 'Параметры инспекции по локациям.',
    dataSource: 'parameters',
    visualization: 'table',
    snapshot: {
      pivot: {
        rows: ['objLocation'],
        columns: [],
        filters: ['period'],
      },
      metrics: [{ id: 'metric-2', fieldKey: 'periodType', aggregator: 'count' }],
    },
  },
]

const defaultPages = [
  {
    id: 'page-monitoring',
    menuTitle: 'Мониторинг пути',
    pageTitle: 'Мониторинг пути',
    description: 'Страница со сводкой по планам и параметрам инспекции.',
    filters: ['period', 'area'],
    layout: {
      preset: 'two-column',
      containers: [
        {
          id: 'slot-1',
          title: 'Отклонения плана',
          templateId: 'tpl-traffic',
          width: '1fr',
          height: 'auto',
        },
        {
          id: 'slot-2',
          title: 'Параметры путей',
          templateId: 'tpl-parameters',
          width: '1fr',
          height: 'auto',
        },
      ],
    },
  },
]

const layoutPresets = [
  { value: 'single', label: 'Одна колонка', template: '1fr' },
  { value: 'two-column', label: 'Две колонки', template: '1fr 1fr' },
  { value: 'three-column', label: 'Три колонки', template: '1fr 1fr 1fr' },
]

const filterLibrary = [
  {
    key: 'period',
    label: 'Период',
    placeholder: 'Например: 2025-11',
    bindings: {
      plans: 'PlanDateEnd',
      parameters: 'date',
    },
  },
  {
    key: 'area',
    label: 'Участок / зона',
    placeholder: 'Например: Восточный участок',
    bindings: {
      plans: 'nameLocationClsSection',
      parameters: 'objLocation',
    },
  },
  {
    key: 'object',
    label: 'Объект / ID',
    placeholder: 'Введите название или ID',
    bindings: {
      plans: 'fullNameObject',
      parameters: 'objLocationName',
    },
  },
]

function loadFromStorage(key, fallback) {
  if (typeof window === 'undefined') return structuredClone(fallback)
  try {
    const raw = window.localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.warn('pageBuilder store load failed', err)
  }
  return structuredClone(fallback)
}

function persist(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const usePageBuilderStore = defineStore('pageBuilder', {
  state: () => ({
    pages: loadFromStorage(PAGE_STORAGE_KEY, defaultPages),
    templates: loadFromStorage(TEMPLATE_STORAGE_KEY, defaultTemplates),
    filters: filterLibrary,
    layoutPresets,
  }),
  getters: {
    getPageById: (state) => (id) => state.pages.find((page) => page.id === id),
    getTemplateById: (state) => (id) => state.templates.find((tpl) => tpl.id === id),
    layoutTemplateMap: (state) =>
      state.layoutPresets.reduce((acc, preset) => {
        acc[preset.value] = preset.template
        return acc
      }, {}),
  },
  actions: {
    savePage(payload) {
      const page = structuredClone(payload)
      page.id = page.id || createId('page')
      if (!page.layout) {
        page.layout = { preset: 'single', containers: [] }
      }
      const index = this.pages.findIndex((item) => item.id === page.id)
      if (index >= 0) {
        this.pages.splice(index, 1, page)
      } else {
        this.pages.push(page)
      }
      persist(PAGE_STORAGE_KEY, this.pages)
      return page.id
    },
    removePage(pageId) {
      const index = this.pages.findIndex((item) => item.id === pageId)
      if (index >= 0) {
        this.pages.splice(index, 1)
        persist(PAGE_STORAGE_KEY, this.pages)
      }
    },
    saveTemplate(payload) {
      const template = structuredClone(payload)
      template.id = template.id || createId('tpl')
      const index = this.templates.findIndex((item) => item.id === template.id)
      if (index >= 0) {
        this.templates.splice(index, 1, template)
      } else {
        this.templates.push(template)
      }
      persist(TEMPLATE_STORAGE_KEY, this.templates)
      return template.id
    },
    updateTemplate(templateId, patch) {
      const index = this.templates.findIndex((item) => item.id === templateId)
      if (index === -1) return
      const current = this.templates[index]
      const next = {
        ...current,
        ...structuredClone(patch),
        id: templateId,
      }
      this.templates.splice(index, 1, next)
      persist(TEMPLATE_STORAGE_KEY, this.templates)
      return next
    },
    removeTemplate(templateId) {
      const index = this.templates.findIndex((item) => item.id === templateId)
      if (index === -1) return
      this.templates.splice(index, 1)
      persist(TEMPLATE_STORAGE_KEY, this.templates)

      let pagesChanged = false
      this.pages.forEach((page) => {
        const containers = page?.layout?.containers || []
        containers.forEach((container) => {
          if (container.templateId === templateId) {
            container.templateId = ''
            pagesChanged = true
          }
        })
      })
      if (pagesChanged) {
        persist(PAGE_STORAGE_KEY, this.pages)
      }
    },
  },
})
