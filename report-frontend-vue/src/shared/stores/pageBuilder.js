import { defineStore } from 'pinia'
import { fetchFactorValues, fetchPersonnelAccessList } from '@/shared/api/objects'
import {
  deleteObjectWithProperties,
  loadReportPages,
  savePageContainer,
  saveReportPage,
  deleteComplexEntity,
} from '@/shared/api/report'
import { fetchReportViewTemplates } from '@/shared/services/reportViews'
import { canUserAccessPage } from '@/shared/lib/pageAccess'
import {
  extractLayoutMeta,
  injectLayoutMeta,
  parseContainerTitle,
  formatContainerTitle,
  defaultLayoutSettings,
  sanitizeContainerTabMap,
} from '@/shared/lib/layoutMeta'
import { DATE_PARTS, buildDatePartKey } from '@/shared/lib/pivotUtils'

const LAYOUT_FACTOR_CODE = 'Prop_Layout'
const WIDTH_FACTOR_CODE = 'Prop_Width'
const HEIGHT_FACTOR_CODE = 'Prop_Height'
const PRIVACY_FACTOR_CODE = 'Prop_Private'

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
    privacyOptions: [],
    privacyLoading: false,
    privacyLoaded: false,
    privacyError: '',
    pageUsers: [],
    pageUsersLoading: false,
    pageUsersLoaded: false,
    pageUsersError: '',
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
    async fetchPrivacyOptions(force = false) {
      if (this.privacyLoading || (this.privacyLoaded && !force)) return
      this.privacyLoading = true
      this.privacyError = ''
      try {
        const records = await fetchFactorValues(PRIVACY_FACTOR_CODE)
        this.privacyOptions = normalizePrivacyOptions(records)
        this.privacyLoaded = true
      } catch (err) {
        console.warn('Failed to load privacy options', err)
        this.privacyError = 'Не удалось загрузить параметры публичности.'
        this.privacyOptions = []
      } finally {
        this.privacyLoading = false
      }
    },
    async fetchPageUsers(force = false) {
      if (this.pageUsersLoading || (this.pageUsersLoaded && !force)) return
      this.pageUsersLoading = true
      this.pageUsersError = ''
      try {
        const records = await fetchPersonnelAccessList()
        this.pageUsers = normalizeAccessUsers(records)
        this.pageUsersLoaded = true
      } catch (err) {
        console.warn('Failed to load page users', err)
        this.pageUsersError = 'Не удалось загрузить список пользователей.'
        this.pageUsers = []
      } finally {
        this.pageUsersLoading = false
      }
    },
    async ensureReferences() {
      await Promise.all([
        this.fetchLayoutOptions(),
        this.fetchWidthOptions(),
        this.fetchHeightOptions(),
        this.fetchTemplates(),
        this.fetchPrivacyOptions(),
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
          this.fetchPrivacyOptions(),
        ])
        const records = await loadReportPages()
        const containersMap = new Map()
        this.pages = (records || []).map((entry, index) => {
          const page = normalizePageRecord(entry, index, this.layoutOptions, this.privacyOptions)
          const containers = normalizeComplexContainers(
            entry?.complex || [],
            this.templates,
            this.widthOptions,
            this.heightOptions,
            page.layout?.containerTabs || {},
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
      const initialContainerTabs = sanitizeContainerTabMap(draft.layout?.containerTabs || {})
      const payload = createBasePagePayload(
        draft,
        layoutMeta,
        normalizedDescription,
        initialContainerTabs,
        now,
        userMeta,
      )
      applyPrivacyPayload(payload, draft, this.privacyOptions)
      if (operation === 'upd') {
        applyUpdateIdentifiers(payload, draft)
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
      const finalContainerTabs = buildContainerTabMap(draft.layout?.containers || [])
      if (!areTabMapsEqual(initialContainerTabs, finalContainerTabs)) {
        draft.remoteId = remoteId
        await this.updatePageLayoutMeta(draft, layoutMeta, normalizedDescription, finalContainerTabs, userMeta)
        draft.layout.containerTabs = { ...finalContainerTabs }
      }
      await this.fetchPages(true)
      return remoteId
    },
    async updatePageLayoutMeta(draft, layoutMeta, normalizedDescription, containerTabMap, userMeta) {
      const remoteId = toStableId(draft.remoteId || draft.id)
      if (!remoteId) return
      await this.ensureDraftRemoteMeta(draft, remoteId)
      const now = new Date().toISOString().slice(0, 10)
      const payload = createBasePagePayload(draft, layoutMeta, normalizedDescription, containerTabMap, now, userMeta)
      applyPrivacyPayload(payload, draft, this.privacyOptions)
      applyUpdateIdentifiers(payload, draft)
      await saveReportPage('upd', payload)
    },
    async ensureDraftRemoteMeta(draft, remoteId) {
      if (hasRequiredPageMeta(draft.remoteMeta)) return
      await this.fetchPages(true)
      const target = this.pages.find((page) => page.remoteId === remoteId || page.id === remoteId)
      if (!target) {
        throw new Error('Не удалось найти страницу для обновления макета. Обновите список страниц и попробуйте снова.')
      }
      draft.remoteMeta = target.remoteMeta || target || {}
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
          Title: formatContainerTitle(container.title, container.tabIndex),
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
      const userMeta = readUserMeta()
      const page = this.getPageById(String(pageId))
      if (page && !canUserAccessPage(page, userMeta)) {
        throw new Error('Недостаточно прав для удаления этой страницы.')
      }
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

function normalizePageRecord(entry = {}, index = 0, layoutOptions = [], privacyOptions = []) {
  const remoteId = toStableId(entry?.id ?? entry?.Id ?? entry?.ID)
  const layoutMeta = findLayoutByCodes(layoutOptions, entry?.fvLayout, entry?.pvLayout)
  const privacy = normalizePrivacyRecord(entry, privacyOptions)
  const rawDescription = entry?.Description || entry?.Discription || entry?.description || ''
  const { text: descriptionText, settings: layoutSettings, containerTabs, metaFlags } = extractLayoutMeta(
    rawDescription || '',
  )
  return {
    id: remoteId || `page-${index}`,
    remoteId,
    menuTitle: entry?.MenuItem || entry?.menuTitle || entry?.Menu || '',
    pageTitle: entry?.PageTitle || entry?.name || '',
    description: descriptionText,
    filters: parseFilterList(entry?.GlobalFilter),
    containerCount: Number(entry?.ContainerCount || entry?.containerCount || 0),
    layout: {
      preset: layoutMeta?.value || '',
      template: layoutMeta?.template || '1fr',
      fvLayout: layoutMeta?.fv || toNumericId(entry?.fvLayout),
      pvLayout: layoutMeta?.pv || toNumericId(entry?.pvLayout),
      settings: layoutSettings,
      containerTabs,
      metaFlags,
      containers: [],
    },
    privacy,
    isPrivate: Boolean(privacy?.isPrivate),
    objUser: toNumericId(entry?.objUser ?? entry?.ObjUser),
    pvUser: toNumericId(entry?.pvUser ?? entry?.PvUser),
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

function normalizePrivacyOptions(records = []) {
  return (records || []).map((record, index) => {
    const fv = toNumericId(record?.fv ?? record?.id)
    const pv = toNumericId(record?.pv)
    const label = record?.name || record?.Name || `Опция ${index + 1}`
    const normalized = (label || '').toString().trim().toLowerCase()
    const isPrivate =
      normalized === 'нет' ||
      normalized === 'no' ||
      normalized.includes('не пуб') ||
      normalized.includes('приват')
    const isPublic =
      normalized === 'да' ||
      normalized === 'yes' ||
      normalized.includes('публ') ||
      normalized.includes('общ')
    return {
      id: toStableId(record?.id) || `privacy-${index}`,
      fv,
      pv,
      label,
      isPrivate,
      isPublic,
      raw: record,
    }
  })
}

function normalizeContainerRecord(entry = {}, index = 0, templates = [], widthOptions = [], heightOptions = []) {
  const templateId = findTemplateIdByLink(templates, entry?.objLinkToView)
  const widthMeta = findOptionByCodes(widthOptions, entry?.fvWidth, entry?.pvWidth)
  const heightMeta = findOptionByCodes(heightOptions, entry?.fvHeight, entry?.pvHeight)
  const rawTitle = entry?.Title || entry?.name || `Контейнер ${index + 1}`
  const parsedTitle = parseContainerTitle(rawTitle)
  return {
    id: toStableId(entry?.id ?? entry?.Id) || `container-${index}`,
    remoteId: toStableId(entry?.id ?? entry?.Id),
    title: parsedTitle.title || rawTitle,
    tabIndex: parsedTitle.tabIndex || 1,
    templateId,
    widthOption: widthMeta?.value || '',
    heightOption: heightMeta?.value || '',
    width: widthMeta?.css || '1fr',
    height: heightMeta?.css || 'auto',
    order: entry?.order ?? index + 1,
    remoteMeta: entry || {},
  }
}

function normalizeComplexContainers(
  records = [],
  templates = [],
  widthOptions = [],
  heightOptions = [],
  containerTabMap = {},
) {
  const tabAssignments = sanitizeContainerTabMap(containerTabMap)
  return (records || []).map((entry, index) => {
    const normalized = normalizeContainerRecord(
      {
        id: entry?.idPageContainerComplex,
        Title: entry?.Title || entry?.nameLinkToView || entry?.name || `Контейнер ${index + 1}`,
        name: entry?.nameLinkToView || entry?.name || '',
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
    )
    const remoteKey =
      toStableId(entry?.idPageContainerComplex ?? entry?.id ?? entry?.Id) || normalized.remoteId || normalized.id
    const assignedTab = remoteKey ? tabAssignments[remoteKey] : null
    if (assignedTab) {
      normalized.tabIndex = assignedTab
    }
    return normalized
  })
}

function normalizeAccessUsers(records = []) {
  if (!Array.isArray(records)) return []
  return records
    .map((record) => {
      const id = toNumericId(record?.id ?? record?.objUser)
      const pv = toNumericId(record?.pv ?? record?.pvUser)
      if (!Number.isFinite(id) || !Number.isFinite(pv)) {
        return null
      }
      const cls = toNumericId(record?.cls ?? record?.Cls)
      return {
        id,
        pv,
        cls: Number.isFinite(cls) ? cls : null,
        name: record?.name || record?.Name || record?.fullName || '',
        fullName: record?.fullName || record?.FullName || record?.name || '',
      }
    })
    .filter(Boolean)
}

function normalizePrivacyRecord(entry = {}, privacyOptions = []) {
  const fv = toNumericId(entry?.fvPrivate ?? entry?.FvPrivate)
  const pv = toNumericId(entry?.pvPrivate ?? entry?.PvPrivate)
  const id = toNumericId(entry?.idPrivate ?? entry?.IdPrivate)
  const optionsMap = new Map((privacyOptions || []).map((option) => [option.fv, option]))
  const option = fv != null ? optionsMap.get(fv) : null
  const label = entry?.namePrivate || entry?.NamePrivate || option?.label || ''
  const isPrivate = option ? Boolean(option.isPrivate) : interpretPrivacyLabel(label)
  const users = normalizeAccessUsers(entry?.objUserMulti)
  return {
    id,
    fv,
    pv,
    label,
    isPrivate,
    users,
  }
}

function sanitizeUserAccessList(list = []) {
  if (!Array.isArray(list)) return []
  return list
    .map((record) => {
      const id = toNumericId(record?.id ?? record?.objUser)
      const pv = toNumericId(record?.pv ?? record?.pvUser)
      if (!Number.isFinite(id) || !Number.isFinite(pv)) {
        return null
      }
      const cls = toNumericId(record?.cls ?? record?.Cls)
      return {
        id,
        pv,
        cls: Number.isFinite(cls) ? cls : null,
        name: record?.name || record?.Name || record?.fullName || '',
        fullName: record?.fullName || record?.FullName || record?.name || '',
      }
    })
    .filter(Boolean)
}

function normalizeDraftPrivacy(draft = {}, privacyOptions = []) {
  const fv = toNumericId(draft?.fvPrivate)
  if (fv === null) return null
  const option = (privacyOptions || []).find((item) => item.fv === fv)
  const pv = toNumericId(draft?.pvPrivate) || option?.pv || null
  const id = toNumericId(draft?.idPrivate)
  return {
    fv,
    pv,
    id,
    users: sanitizeUserAccessList(draft?.objUserMulti),
  }
}

function interpretPrivacyLabel(label = '') {
  const normalized = label.toString().trim().toLowerCase()
  if (!normalized) return false
  if (normalized === 'нет' || normalized === 'no') return true
  if (normalized.includes('не пуб') || normalized.includes('приват')) return true
  return false
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

function createBasePagePayload(draft, layoutMeta, normalizedDescription, containerTabMap, now, userMeta) {
  return {
    name: draft.pageTitle?.trim() || draft.menuTitle?.trim() || 'Страница',
    MenuItem: draft.menuTitle?.trim() || '',
    PageTitle: draft.pageTitle?.trim() || '',
    Description: injectLayoutMeta(
      normalizedDescription,
      draft.layout?.settings || defaultLayoutSettings(),
      containerTabMap,
    ),
    GlobalFilter: formatFilterString(draft.filters || []),
    fvLayout: layoutMeta.fv,
    pvLayout: layoutMeta.pv,
    CreatedAt: draft.remoteMeta?.CreatedAt || now,
    UpdatedAt: now,
    objUser: userMeta.objUser,
    pvUser: userMeta.pvUser,
  }
}

function applyPrivacyPayload(payload, draft, privacyOptions = []) {
  payload.objUserMulti = []
  const privacyMeta = normalizeDraftPrivacy(draft, privacyOptions)
  if (privacyMeta) {
    payload.fvPrivate = privacyMeta.fv
    payload.pvPrivate = privacyMeta.pv
    payload.objUserMulti = privacyMeta.users
    if (privacyMeta.id) {
      payload.idPrivate = privacyMeta.id
    }
  }
}

function applyUpdateIdentifiers(payload, draft) {
  const remoteMeta = draft.remoteMeta || {}
  const updateId = toNumericId(draft.remoteId) || toNumericId(draft.id) || readMetaNumber(remoteMeta, 'id', 'Id', 'ID')
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

function buildContainerTabMap(containers = []) {
  const map = {}
  ;(containers || []).forEach((container) => {
    const remoteId = getContainerRemoteId(container)
    if (!remoteId) return
    const numeric = Number(container?.tabIndex)
    const tabIndex = Number.isFinite(numeric) ? Math.max(1, Math.min(12, Math.trunc(numeric))) : 1
    map[String(remoteId)] = tabIndex
  })
  return sanitizeContainerTabMap(map)
}

function areTabMapsEqual(a = {}, b = {}) {
  const keysA = Object.keys(a || {})
  const keysB = Object.keys(b || {})
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => Number(a[key]) === Number(b[key]))
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

function hasRequiredPageMeta(meta = {}) {
  if (!meta) return false
  const clsValue = readMetaNumber(meta, 'cls', 'Cls', 'CLS')
  const idMenuItem = readMetaNumber(meta, 'idMenuItem', 'IdMenuItem', 'IDMenuItem')
  const idPageTitle = readMetaNumber(meta, 'idPageTitle', 'IdPageTitle', 'IDPageTitle')
  const idLayout = readMetaNumber(meta, 'idLayout', 'IdLayout', 'IDLayout')
  return Boolean(clsValue && idMenuItem && idPageTitle && idLayout)
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
  const datePartKeys = collectDatePartKeys(snapshot.fieldMeta || {})
  return Array.from(
    new Set([...metaKeys, ...filtersMetaKeys, ...pivotKeys, ...metricKeys, ...datePartKeys]),
  )
}

function collectDatePartKeys(fieldMeta = {}) {
  const keys = []
  Object.entries(fieldMeta || {}).forEach(([key, meta]) => {
    if (!meta || meta.type !== 'date') return
    DATE_PARTS.forEach((part) => {
      keys.push(buildDatePartKey(key, part.key))
    })
  })
  return keys
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
