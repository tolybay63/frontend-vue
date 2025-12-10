import { defineStore } from 'pinia'
import { fetchFactorValues } from '@/shared/api/objects'
import {
  deleteObjectWithProperties,
  loadReportPages,
  savePageContainer,
  saveReportPage,
  deleteComplexEntity,
} from '@/shared/api/report'
import { fetchReportViewTemplates } from '@/shared/services/reportViews'

const LAYOUT_FACTOR_CODE = 'Prop_Layout'
const WIDTH_FACTOR_CODE = 'Prop_Width'
const HEIGHT_FACTOR_CODE = 'Prop_Height'

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

export const usePageBuilderStore = defineStore('pageBuilder', {
  state: () => ({
    pages: [],
    pagesLoading: false,
    pagesLoaded: false,
    pagesError: '',
    pageContainers: {},
    templates: [],
    templatesLoading: false,
    templatesLoaded: false,
    templatesError: '',
    filters: filterLibrary,
    layoutOptions: [],
    layoutLoading: false,
    layoutLoaded: false,
    layoutError: '',
    widthOptions: [],
    widthLoading: false,
    widthLoaded: false,
    widthError: '',
    heightOptions: [],
    heightLoading: false,
    heightLoaded: false,
    heightError: '',
  }),
  getters: {
    getPageById: (state) => (id) => state.pages.find((page) => page.id === id),
    getTemplateById: (state) => (id) => state.templates.find((tpl) => tpl.id === id),
    layoutTemplateMap: (state) =>
      state.layoutOptions.reduce((acc, preset) => {
        acc[preset.value] = preset.template || '1fr'
        return acc
      }, {}),
    layoutLabelMap: (state) =>
      state.layoutOptions.reduce((acc, preset) => {
        acc[preset.value] = preset.label || preset.value
        return acc
      }, {}),
    widthOptionMap: (state) =>
      state.widthOptions.reduce((acc, option) => {
        acc[option.value] = option
        return acc
      }, {}),
    heightOptionMap: (state) =>
      state.heightOptions.reduce((acc, option) => {
        acc[option.value] = option
        return acc
      }, {}),
  },
  actions: {
    async fetchTemplates(force = false) {
      if (this.templatesLoading || (this.templatesLoaded && !force)) return
      this.templatesLoading = true
      this.templatesError = ''
      try {
        const remoteTemplates = await fetchReportViewTemplates()
        this.templates = Array.isArray(remoteTemplates) ? remoteTemplates : []
        this.templatesLoaded = true
      } catch (err) {
        console.warn('Failed to load report templates', err)
        this.templatesError = 'Не удалось загрузить представления.'
        this.templates = []
      } finally {
        this.templatesLoading = false
      }
    },
    async fetchLayoutOptions(force = false) {
      if (this.layoutLoading || (this.layoutLoaded && !force)) return
      this.layoutLoading = true
      this.layoutError = ''
      try {
        const records = await fetchFactorValues(LAYOUT_FACTOR_CODE)
        this.layoutOptions = normalizeLayoutOptions(records)
        this.layoutLoaded = true
      } catch (err) {
        console.warn('Failed to load layout options', err)
        this.layoutError = 'Не удалось загрузить макеты.'
        this.layoutOptions = []
      } finally {
        this.layoutLoading = false
      }
    },
    async fetchWidthOptions(force = false) {
      if (this.widthLoading || (this.widthLoaded && !force)) return
      this.widthLoading = true
      this.widthError = ''
      try {
        const records = await fetchFactorValues(WIDTH_FACTOR_CODE)
        this.widthOptions = normalizeSizeOptions(records, 'width')
        this.widthLoaded = true
      } catch (err) {
        console.warn('Failed to load width options', err)
        this.widthError = 'Не удалось загрузить ширины.'
        this.widthOptions = []
      } finally {
        this.widthLoading = false
      }
    },
    async fetchHeightOptions(force = false) {
      if (this.heightLoading || (this.heightLoaded && !force)) return
      this.heightLoading = true
      this.heightError = ''
      try {
        const records = await fetchFactorValues(HEIGHT_FACTOR_CODE)
        this.heightOptions = normalizeSizeOptions(records, 'height')
        this.heightLoaded = true
      } catch (err) {
        console.warn('Failed to load height options', err)
        this.heightError = 'Не удалось загрузить высоты.'
        this.heightOptions = []
      } finally {
        this.heightLoading = false
      }
    },
    async ensureReferences() {
      await Promise.all([
        this.fetchLayoutOptions(),
        this.fetchWidthOptions(),
        this.fetchHeightOptions(),
        this.fetchTemplates(),
      ])
    },
    async fetchPages(force = false) {
      if (this.pagesLoading || (this.pagesLoaded && !force)) return
      this.pagesLoading = true
      this.pagesError = ''
      try {
        await Promise.all([
          this.fetchLayoutOptions(),
          this.fetchTemplates(),
          this.fetchWidthOptions(),
          this.fetchHeightOptions(),
        ])
        const records = await loadReportPages()
        const containersMap = new Map()
        this.pages = (records || []).map((entry, index) => {
          const page = normalizePageRecord(entry, index, this.layoutOptions)
          const containers = normalizeComplexContainers(
            entry?.complex || [],
            this.templates,
            this.widthOptions,
            this.heightOptions,
          )
          containersMap.set(page.id, containers)
          return page
        })
        containersMap.forEach((items, pageId) => {
          this.pageContainers[pageId] = {
            loading: false,
            loaded: true,
            error: '',
            items,
          }
        })
        this.pagesLoaded = true
      } catch (err) {
        console.warn('Failed to load report pages', err)
        this.pagesError = 'Не удалось загрузить страницы.'
        this.pages = []
      } finally {
        this.pagesLoading = false
      }
    },
    async fetchPageContainers(pageId, force = false) {
      if (!pageId) return []
      if (force || !this.pageContainers[pageId]?.loaded) {
        await this.fetchPages(true)
      }
      return this.pageContainers[pageId]?.items || []
    },
    getContainers(pageId) {
      return this.pageContainers[pageId]?.items || []
    },
    async savePageDraft(draft, deletedContainerIds = []) {
      await this.ensureReferences()
      const userMeta = readUserMeta()
      if (!userMeta) {
        throw new Error('Не удалось определить пользователя. Войдите снова.')
      }
      const layoutMeta = this.layoutOptions.find((item) => item.value === draft.layout?.preset)
      if (!layoutMeta) {
        throw new Error('Выберите макет страницы.')
      }
      const remoteMeta = draft.remoteMeta || {}
      const resolvedNumericId =
        toNumericId(draft.remoteId) ||
        toNumericId(draft.id) ||
        readMetaNumber(remoteMeta, 'id', 'Id', 'ID')
      const fallbackRawId =
        readMetaString(remoteMeta, 'id', 'Id', 'ID') ||
        readMetaString(remoteMeta, 'ObjId', 'objId', 'objPage') ||
        (toStableId(draft.remoteId) || null) ||
        (toStableId(draft.id) || null)
      const resolvedRawId = resolvedNumericId ?? fallbackRawId ?? null
      const operation = resolvedRawId ? 'upd' : 'ins'
      const now = new Date().toISOString().slice(0, 10)
      const normalizedDescription = draft.description?.trim() || ''
      const payload = {
        name: draft.pageTitle?.trim() || draft.menuTitle?.trim() || 'Страница',
        MenuItem: draft.menuTitle?.trim() || '',
        PageTitle: draft.pageTitle?.trim() || '',
        Description: normalizedDescription,
        GlobalFilter: formatFilterString(draft.filters || []),
        fvLayout: layoutMeta.fv,
        pvLayout: layoutMeta.pv,
        CreatedAt: remoteMeta.CreatedAt || now,
        UpdatedAt: now,
        objUser: userMeta.objUser,
        pvUser: userMeta.pvUser,
      }
      if (operation === 'upd') {
        if (!resolvedRawId) {
          throw new Error('Не удалось определить идентификатор страницы.')
        }
        const updateId = resolvedNumericId ?? readMetaNumber(remoteMeta, 'id', 'Id', 'ID')
        if (!updateId) {
          throw new Error('Не удалось определить идентификатор страницы.')
        }
        const clsValue = readMetaNumber(remoteMeta, 'cls', 'Cls', 'CLS')
        const idMenuItem = readMetaNumber(remoteMeta, 'idMenuItem', 'IdMenuItem', 'IDMenuItem')
        const idPageTitle = readMetaNumber(remoteMeta, 'idPageTitle', 'IdPageTitle', 'IDPageTitle')
        const idLayout = readMetaNumber(remoteMeta, 'idLayout', 'IdLayout', 'IDLayout')
        if (!clsValue || !idMenuItem || !idPageTitle || !idLayout) {
          throw new Error('Страница загружена не полностью. Обновите список страниц и попробуйте снова.')
        }
        payload.id = updateId
        payload.cls = clsValue
        payload.idMenuItem = idMenuItem
        payload.idPageTitle = idPageTitle
        payload.idLayout = idLayout
        const idDescription = readMetaNumber(remoteMeta, 'idDescription', 'IdDescription', 'IDDescription')
        if (idDescription) payload.idDescription = idDescription
        const idGlobalFilter = readMetaNumber(remoteMeta, 'idGlobalFilter', 'IdGlobalFilter', 'IDGlobalFilter')
        if (idGlobalFilter) payload.idGlobalFilter = idGlobalFilter
        const idUpdatedAt = readMetaNumber(remoteMeta, 'idUpdatedAt', 'IdUpdatedAt', 'IDUpdatedAt')
        const idUser = readMetaNumber(remoteMeta, 'idUser', 'IdUser', 'IDUser')
        const idCreatedAt = readMetaNumber(remoteMeta, 'idCreatedAt', 'IdCreatedAt', 'IDCreatedAt')
        if (idCreatedAt) payload.idCreatedAt = idCreatedAt
        if (idUpdatedAt) payload.idUpdatedAt = idUpdatedAt
        if (idUser) payload.idUser = idUser
      }
      const saved = await saveReportPage(operation, payload)
      let remoteId = toStableId(saved?.id ?? saved?.Id ?? saved?.ID ?? payload.id ?? resolvedRawId)
      if (!remoteId) {
        await this.fetchPages(true)
        const match = this.pages.find(
          (page) =>
            page.menuTitle === payload.MenuItem &&
            page.pageTitle === payload.PageTitle &&
            page.description === payload.Description,
        )
        remoteId = match?.remoteId || match?.id || ''
      }
      if (!remoteId) throw new Error('Сервер не вернул идентификатор страницы.')
      const existingContainers = this.pageContainers[remoteId]?.items || []
      const autoDeleteIds = collectRemovedContainerIds(existingContainers, draft.layout?.containers || [])
      await this.deleteContainers([...autoDeleteIds, ...deletedContainerIds])
      await this.saveContainers(remoteId, draft.layout?.containers || [])
      await this.fetchPages(true)
      return remoteId
    },
    async saveContainers(pageId, containers = []) {
      if (!containers.length) return
      const numericPageId = toNumericId(pageId)
      const targetPageId = Number.isFinite(numericPageId) ? numericPageId : pageId
      if (!targetPageId) {
        console.warn('Не удалось определить идентификатор страницы для контейнеров.')
        return
      }
      for (const container of containers) {
        const template = this.getTemplateById(container.templateId)
        if (!template) continue
        const linkMeta = template?.linkMeta
        const fallbackObj = toNumericId(
          template.presentationFv ??
            template.remotePresentation?.id ??
            template.remoteId ??
            template.id,
        )
        const fallbackPv = toNumericId(
          template.presentationPv ??
            template.remotePresentation?.pv ??
            template.remotePresentation?.PV ??
            template.remotePresentation?.pvLinkToView ??
            template.remotePresentation?.pvView,
        )
        const objLinkToView = linkMeta?.numericId || fallbackObj
        const pvLinkToView = linkMeta?.pv || fallbackPv
        if (!objLinkToView || !pvLinkToView) continue
        const widthMeta =
          this.widthOptions.find((opt) => opt.value === container.widthOption) ||
          this.widthOptions[0] ||
          null
        const heightMeta =
          this.heightOptions.find((opt) => opt.value === container.heightOption) ||
          this.heightOptions[0] ||
          null
        const payload = {
          Title: container.title?.trim() || 'Контейнер',
          order: container.order || 1,
          objLinkToView,
          pvLinkToView,
          fvWidth: widthMeta?.fv || null,
          pvWidth: widthMeta?.pv || null,
          fvHeight: heightMeta?.fv || null,
          pvHeight: heightMeta?.pv || null,
        }
        const remoteContainerId = getContainerRemoteId(container)
        const hasRemoteIds =
          remoteContainerId &&
          Number.isFinite(toNumericId(container.remoteMeta?.idWidth)) &&
          Number.isFinite(toNumericId(container.remoteMeta?.idHeight)) &&
          Number.isFinite(toNumericId(container.remoteMeta?.idLinkToView))
        const operation = hasRemoteIds ? 'upd' : 'ins'
        payload.id = operation === 'upd' ? remoteContainerId : targetPageId
        if (operation === 'upd') {
          payload.idWidth = toNumericId(container.remoteMeta?.idWidth)
          payload.idHeight = toNumericId(container.remoteMeta?.idHeight)
          payload.idLinkToView = toNumericId(container.remoteMeta?.idLinkToView)
        }
        const result = await savePageContainer(operation, payload)
        if (operation === 'upd') {
          container.remoteMeta = {
            ...container.remoteMeta,
            idWidth: payload.idWidth,
            idHeight: payload.idHeight,
            idLinkToView: payload.idLinkToView,
          }
        } else if (result) {
          container.remoteMeta = {
            id: toNumericId(result?.id ?? result?.Id ?? result?.ID),
            idWidth: toNumericId(result?.idWidth ?? result?.IdWidth),
            idHeight: toNumericId(result?.idHeight ?? result?.IdHeight),
            idLinkToView: toNumericId(result?.idLinkToView ?? result?.IdLinkToView),
          }
        }
      }
    },
    async deleteContainers(ids = []) {
      const uniqueIds = [...new Set(ids)].map((value) => toNumericId(value)).filter(Boolean)
      for (const id of uniqueIds) {
        try {
          await deleteComplexEntity(id)
        } catch (err) {
          console.warn('Failed to delete container', id, err)
        }
      }
    },
    async removePage(pageId) {
      const remoteId = toNumericId(pageId)
      if (!remoteId) return
      try {
        await deleteObjectWithProperties(remoteId)
        this.pages = this.pages.filter((page) => page.id !== String(pageId))
      } catch (err) {
        console.warn('Failed to delete page', err)
        throw err
      }
    },
  },
})

function normalizePageRecord(entry = {}, index = 0, layoutOptions = []) {
  const remoteId = toStableId(entry?.id ?? entry?.Id ?? entry?.ID)
  const layoutMeta = findLayoutByCodes(layoutOptions, entry?.fvLayout, entry?.pvLayout)
  return {
    id: remoteId || `page-${index}`,
    remoteId,
    menuTitle: entry?.MenuItem || entry?.menuTitle || entry?.Menu || '',
    pageTitle: entry?.PageTitle || entry?.name || '',
    description: entry?.Description || entry?.Discription || entry?.description || '',
    filters: parseFilterList(entry?.GlobalFilter),
    containerCount: Number(entry?.ContainerCount || entry?.containerCount || 0),
    layout: {
      preset: layoutMeta?.value || '',
      template: layoutMeta?.template || '1fr',
      fvLayout: layoutMeta?.fv || toNumericId(entry?.fvLayout),
      pvLayout: layoutMeta?.pv || toNumericId(entry?.pvLayout),
      containers: [],
    },
    remoteMeta: entry || {},
  }
}

function normalizeLayoutOptions(records = []) {
  return (records || []).map((record, index) => {
    const fv = toNumericId(record?.fvLayout ?? record?.fv ?? record?.id)
    const pv = toNumericId(record?.pvLayout ?? record?.pv)
    const label = record?.name || record?.Name || `Макет ${index + 1}`
    return {
      id: toStableId(record?.id) || `layout-${index}`,
      value: fv != null ? `layout-${fv}` : `layout-${index}`,
      label,
      fv,
      pv,
      template: resolveLayoutTemplate(label),
      raw: record,
    }
  })
}

function normalizeSizeOptions(records = [], type = 'width') {
  return (records || []).map((record, index) => {
    const fv = toNumericId(record?.fv ?? record?.id)
    const pv = toNumericId(record?.pv)
    const label = record?.name || record?.Name || `${type === 'width' ? 'Ширина' : 'Высота'} ${index + 1}`
    return {
      id: toStableId(record?.id) || `${type}-${index}`,
      value: fv != null ? `${type}-${fv}` : `${type}-${index}`,
      label,
      fv,
      pv,
      css: type === 'width' ? resolveWidthCss(label) : resolveHeightCss(label),
      raw: record,
    }
  })
}

function normalizeContainerRecord(entry = {}, index = 0, templates = [], widthOptions = [], heightOptions = []) {
  const templateId = findTemplateIdByLink(templates, entry?.objLinkToView)
  const widthMeta = findOptionByCodes(widthOptions, entry?.fvWidth, entry?.pvWidth)
  const heightMeta = findOptionByCodes(heightOptions, entry?.fvHeight, entry?.pvHeight)
  return {
    id: toStableId(entry?.id ?? entry?.Id) || `container-${index}`,
    remoteId: toStableId(entry?.id ?? entry?.Id),
    title: entry?.Title || entry?.name || `Контейнер ${index + 1}`,
    templateId,
    widthOption: widthMeta?.value || '',
    heightOption: heightMeta?.value || '',
    width: widthMeta?.css || '1fr',
    height: heightMeta?.css || 'auto',
    order: entry?.order ?? index + 1,
    remoteMeta: entry || {},
  }
}

function normalizeComplexContainers(records = [], templates = [], widthOptions = [], heightOptions = []) {
  return (records || []).map((entry, index) =>
    normalizeContainerRecord(
      {
        id: entry?.idPageContainerComplex,
        Title: entry?.nameLinkToView || entry?.name || `Контейнер ${index + 1}`,
        objLinkToView: entry?.objLinkToView,
        fvWidth: entry?.fvWidth,
        pvWidth: entry?.pvWidth,
        fvHeight: entry?.fvHeight,
        pvHeight: entry?.pvHeight,
        idWidth: entry?.idWidth,
        idHeight: entry?.idHeight,
        idLinkToView: entry?.idLinkToView,
      },
      index,
      templates,
      widthOptions,
      heightOptions,
    ),
  )
}

function collectRemovedContainerIds(existingContainers = [], incomingContainers = []) {
  const existingIds = new Set(
    existingContainers
      .map((container) => getContainerRemoteId(container))
      .filter(Boolean),
  )
  const incomingIds = new Set(
    incomingContainers.map((container) => getContainerRemoteId(container)).filter(Boolean),
  )
  return [...existingIds].filter((id) => !incomingIds.has(id))
}

function findLayoutByCodes(options = [], fv, pv) {
  const numericFv = toNumericId(fv)
  const numericPv = toNumericId(pv)
  return options.find((option) => option.fv === numericFv && option.pv === numericPv) || null
}

function findOptionByCodes(options = [], fv, pv) {
  const numericFv = toNumericId(fv)
  const numericPv = toNumericId(pv)
  return options.find((option) => option.fv === numericFv && option.pv === numericPv) || null
}

function findTemplateIdByLink(templates = [], linkId) {
  const numericLink = toNumericId(linkId)
  const normalized = toStableId(linkId)
  const match = templates.find((tpl) => {
    const tplLinkId = toNumericId(tpl.linkMeta?.numericId)
    const tplRemoteId = toNumericId(tpl.remotePresentation?.id ?? tpl.remoteId)
    return tplLinkId === numericLink || tplRemoteId === numericLink || toStableId(tpl.remoteId) === normalized
  })
  return match?.id || normalized || ''
}

function getContainerRemoteId(container = {}) {
  return (
    toNumericId(container?.remoteMeta?.id) ||
    toNumericId(container?.remoteMeta?.idPageContainerComplex) ||
    toNumericId(container?.remoteId) ||
    null
  )
}

function parseFilterList(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  return String(raw)
    .split(/[;,|]/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function formatFilterString(list = []) {
  return (list || []).filter(Boolean).join(',')
}

function resolveLayoutTemplate(label = '') {
  const lower = label.toLowerCase()
  if (lower.includes('три') || lower.includes('3')) return '1fr 1fr 1fr'
  if (lower.includes('дв') || lower.includes('2')) return '1fr 1fr'
  return '1fr'
}

function resolveWidthCss(label = '') {
  const lower = label.toLowerCase()
  if (lower.includes('3')) return '3fr'
  if (lower.includes('2')) return '2fr'
  return '1fr'
}

function resolveHeightCss(label = '') {
  const lower = label.toLowerCase()
  if (lower.includes('авто')) return 'auto'
  const match = lower.match(/(\d{2,4})/)
  if (match) {
    return `${match[1]}px`
  }
  return 'auto'
}

export function resolveCommonContainerFieldKeys(containers = [], templates = []) {
  if (!Array.isArray(containers) || !containers.length) return []
  const templateMap = new Map((templates || []).map((tpl) => [tpl.id, tpl]))
  let common = null
  containers.forEach((container) => {
    const tpl = templateMap.get(container.templateId)
    if (!tpl) return
    const keys = extractTemplateFieldKeys(tpl)
    if (!keys.length) return
    if (common === null) {
      common = new Set(keys)
    } else {
      common = new Set(keys.filter((key) => common.has(key)))
    }
  })
  return common ? [...common] : []
}

function extractTemplateFieldKeys(template) {
  if (!template) return []
  const snapshot = template.snapshot || {}
  const metaKeys = Object.keys(snapshot.fieldMeta || {})
  const filtersMetaKeys = (snapshot.filtersMeta || [])
    .map((item) => item?.key)
    .filter(Boolean)
  const pivotKeys = [
    ...(snapshot.pivot?.filters || []),
    ...(snapshot.pivot?.rows || []),
    ...(snapshot.pivot?.columns || []),
  ].filter(Boolean)
  const metricKeys = (snapshot.metrics || [])
    .map((metric) => metric?.fieldKey)
    .filter(Boolean)
  return Array.from(new Set([...metaKeys, ...filtersMetaKeys, ...pivotKeys, ...metricKeys]))
}

function toNumericId(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function toStableId(value) {
  if (value === null || typeof value === 'undefined') return ''
  const str = String(value).trim()
  return str || ''
}

function readMetaNumber(meta = {}, ...keys) {
  if (!meta) return null
  for (const key of keys) {
    if (!key) continue
    const numeric = toNumericId(meta[key])
    if (numeric !== null) {
      return numeric
    }
  }
  return null
}

function readMetaString(meta = {}, ...keys) {
  if (!meta) return null
  for (const key of keys) {
    if (!key) continue
    const value = meta[key]
    if (value === null || typeof value === 'undefined') continue
    const str = String(value).trim()
    if (str) {
      return str
    }
  }
  return null
}

function readStoredUserValue(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return Number(JSON.parse(raw)) || null
  } catch {
    return null
  }
}

function readUserMeta() {
  const objUser = readStoredUserValue('objUser')
  const pvUser = readStoredUserValue('pvUser')
  if (!Number.isFinite(objUser) || !Number.isFinite(pvUser)) {
    return null
  }
  return { objUser, pvUser }
}
