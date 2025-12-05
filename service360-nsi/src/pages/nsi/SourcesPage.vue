<template>
  <section class="sources-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          {{ t('nsi.objectTypes.sources.title', {}, { default: 'Справочник «Источники (нормативные документы)»' }) }}
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            :aria-label="t('nsi.objectTypes.sources.help', {}, { default: 'Справка о справочнике' })"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">
          {{ t('nsi.objectTypes.sources.subtitle', {}, { default: 'Управляйте перечнем нормативных документов, регламентирующих сервисную деятельность.' }) }}
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="filterModel.search"
          :placeholder="t('nsi.objectTypes.sources.searchPlaceholder', {}, { default: 'Поиск…' })"
          clearable
          round
          class="toolbar__search"
          :size="isMobile ? 'small' : undefined"
        />
        <div class="toolbar__filters">
          <NSelect
            v-model:value="filterModel.author"
            :options="authorOptions"
            multiple
            filterable
            :placeholder="t('nsi.objectTypes.sources.filter.author', {}, { default: 'Орган (регулятор)' })"
            clearable
            size="small"
            class="toolbar__select"
          />
          <NDatePicker
            v-model:value="filterModel.approvalRange"
            type="daterange"
            format="dd.MM.yyyy"
            clearable
            size="small"
            :placeholder="t('nsi.objectTypes.sources.filter.approvalDate', {}, { default: 'Дата утверждения' })"
            class="toolbar__select"
          />
          <NDatePicker
            v-model:value="filterModel.periodRange"
            type="daterange"
            format="dd.MM.yyyy"
            clearable
            size="small"
            :placeholder="t('nsi.objectTypes.sources.filter.period', {}, { default: 'Период действия' })"
            class="toolbar__select"
          />
          <NSelect
            v-model:value="filterModel.departments"
            :options="departmentOptions"
            :placeholder="t('nsi.objectTypes.sources.filter.department', {}, { default: 'Исполнитель (подразделение)' })"
            multiple
            filterable
            clearable
            size="small"
            class="toolbar__select toolbar__select--wide"
          />
        </div>
        <NSelect
          v-if="isMobile"
          v-model:value="sortOrder"
          :options="sortOptions"
          size="small"
          class="toolbar__select"
          :aria-label="t('nsi.objectTypes.sources.sortAria', {}, { default: 'Порядок сортировки' })"
        />
        <NButton type="primary" @click="openCreate">+ {{ t('nsi.objectTypes.sources.add', {}, { default: 'Добавить документ' }) }}</NButton>
      </div>
    </NCard>

    <div class="table-area">
      <NDataTable
        v-if="!isMobile"
        class="s360-cards table-full table-stretch"
        :columns="columns"
        :data="normalizedRows"
        :loading="tableLoading"
        :row-key="rowKey"
        :row-props="createRowProps"
        :bordered="false"
        size="small"
      />

      <div v-else class="cards" role="list">
        <div class="list-info">
          {{ t('nsi.objectTypes.sources.listInfo', { shown: visibleCount, total }, { default: 'Показано: ' + visibleCount + ' из ' + total }) }}
        </div>
        <article
          v-for="item in normalizedRows"
          :key="item.id"
          class="card"
          role="group"
          :aria-label="primaryTitle(item)"
        >
          <header class="card__header">
            <div class="card__title" role="heading" aria-level="4">
              <FieldRenderer v-if="primaryField" :field="primaryField" :row="item" />
              <span v-else class="card__title-text">{{ item.name || '—' }}</span>
            </div>
          </header>

          <dl class="card__grid">
            <template
              v-for="(field, fieldIndex) in infoFields"
              :key="`${item.id}:${field.key || field.label || fieldIndex}`"
            >
              <dt>{{ field.label }}</dt>
              <dd>
                <FieldRenderer :field="field" :row="item" />
              </dd>
            </template>
          </dl>

          <footer v-if="actionsField" class="card__actions">
            <ActionsRenderer :row="item" />
          </footer>
        </article>
      </div>

      <div v-if="isMobile && pagination.page < maxPage" class="show-more-bar">
        <NButton tertiary @click="showMore" :loading="tableLoading">{{ t('nsi.objectTypes.sources.showMore', {}, { default: 'Дальше' }) }}</NButton>
      </div>

      <div class="pagination-bar" v-if="!isMobile">
        <NPagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          show-quick-jumper
        >
          <template #prefix>
            <span class="pagination-total">{{ t('nsi.objectTypes.sources.total', { total }, { default: 'Всего: ' + total }) }}</span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="infoOpen"
      preset="card"
      :title="t('nsi.objectTypes.sources.info.title', {}, { default: 'О справочнике источников' })"
      style="max-width: 560px; width: min(92vw, 560px)"
    >
      <p class="text-body">
        {{ t('nsi.objectTypes.sources.info.p1', {}, { default: 'Здесь собраны нормативные документы, на основании которых выполняются технологические работы и обслуживание объектов. Поддерживайте в справочнике актуальные реквизиты, сроки действия и ответственных исполнителей, чтобы коллеги всегда использовали проверенные данные.' }) }}
      </p>
      <template #footer>
        <div class="modal-footer">
          <NButton type="primary" @click="infoOpen = false">{{ t('nsi.objectTypes.sources.info.ok', {}, { default: 'Понятно' }) }}</NButton>
        </div>
      </template>
    </NModal>

    <NModal v-model:show="modalOpen" preset="card" :title="modalTitle" style="width: min(680px, 96vw)">
      <SourcesForm
        :model-value="formModel"
        :department-options="departmentOptions"
        :saving="formSaving"
        :errors="formErrors"
        @update:model-value="updateFormModel"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </NModal>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, reactive, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PropType, VNodeChild } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useIsMobile } from '@/shared/composables/useIsMobile'
import { useRoute } from 'vue-router'

import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NPopover,
  NSelect,
  NTag,
  NTooltip,
  useDialog,
  useMessage,
  type DataTableColumns,
  type DataTableRowKey,
  type SelectOption,
} from 'naive-ui'
import { CreateOutline, DocumentTextOutline, InformationCircleOutline, TrashOutline } from '@vicons/ionicons5'

import {
  SourcesForm,
  type SourcesFormModel,
  sourceQueryKeys,
  useSourceDepartmentsQuery,
  useSourceMutations,
  useSourcesQuery,
} from '@features/source-crud'
import {
  fetchSourceDetails,
  type Department,
  type SaveSourceCollectionInsPayload,
  type SaveSourceCollectionUpdPayload,
  type Source,
  type SourceDetails,
  type SourceFile,
} from '@entities/source'
import { formatDateIsoToRu, formatPeriod, getErrorMessage, timestampToIsoDate } from '@shared/lib'


interface FiltersModel {
  search: string
  author: string[]
  approvalRange: [number, number] | null
  periodRange: [number, number] | null
  departments: number[]
}

interface SourceIdMeta {
  idDocumentNumber: number | null
  idDocumentApprovalDate: number | null
  idDocumentAuthor: number | null
  idDocumentStartDate: number | null
  idDocumentEndDate: number | null
}

interface SourceDetailsEntry extends SourceDetails {
  loaded: boolean
  error: boolean
}

interface NormalizedRow extends Source {
  formattedApprovalDate: string
  periodText: string
  formattedStartDate: string
  formattedEndDate: string
  deptNames: string[]
  deptLoadError: boolean
  detailsLoading: boolean
  authorLabel: string
  files: SourceFile[]
  departmentIds: number[]
}

interface SourceRow extends Source {
  formattedApprovalDate: string
  periodText: string
}

interface CardField {
  key: string
  label: string
  render: (row: NormalizedRow) => VNodeChild
  isPrimary?: boolean
  isActions?: boolean
}

const { isMobile } = useIsMobile('(max-width: 720px)')
const { t } = useI18n()

const message = useMessage()
const dialog = useDialog()
const infoOpen = ref(false)

const queryClient = useQueryClient()
const sourcesQuery = useSourcesQuery()
const departmentsQuery = useSourceDepartmentsQuery()
const { createMutation, updateMutation, deleteMutation, saveDepartmentsMutation } = useSourceMutations()

const departments = computed<Department[]>(() => departmentsQuery.data.value ?? [])
const deptById = computed(() => {
  const map = new Map<number, string>()
  for (const item of departments.value) {
    map.set(item.id, item.name)
  }
  return map
})

const departmentOptions = computed<SelectOption[]>(() =>
  departments.value
    .map((item) => ({ label: item.name, value: item.id }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru')),
)

const sources = computed<Source[]>(() => sourcesQuery.data.value ?? [])
const detailsCache = ref(new Map<number, SourceDetailsEntry>())
const detailsQueue: Array<() => void> = []
const detailsInFlight = new Map<number, Promise<SourceDetailsEntry>>()
let activeDetailsRequests = 0
const DETAILS_CONCURRENCY_LIMIT = 3

const filterModel = reactive<FiltersModel>({
  search: '',
  author: [],
  approvalRange: null,
  periodRange: null,
  departments: [],
})

const route = useRoute()

const pagination = reactive({ page: 1, pageSize: 10 })

// Initialize search filter from route query (?q=...) once pagination exists
watch(
  () => route.query.q,
  (value) => {
    const text = Array.isArray(value)
      ? String(value[value.length - 1] ?? '')
      : typeof value === 'string'
        ? value
        : ''
    filterModel.search = text
    pagination.page = 1
  },
  { immediate: true },
)
const sortOrder = ref<'asc' | 'desc'>('asc')
const sortOptions = [
  { label: 'А-Я', value: 'asc' },
  { label: 'Я-А', value: 'desc' },
]
const tableLoading = computed(() => sourcesQuery.isFetching.value || sourcesQuery.isLoading.value)
const removingId = ref<number | null>(null)

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const modalTitle = computed(() => (modalMode.value === 'edit' ? 'Редактирование документа' : 'Создание документа'))
let editingMeta: SourceIdMeta | null = null
let editingId: number | null = null
let initialDepartmentIds: number[] = []

const emptyFormState = (): SourcesFormModel => ({
  name: '',
  DocumentNumber: '',
  DocumentApprovalDate: null,
  DocumentAuthor: '',
  DocumentStartDate: null,
  DocumentEndDate: null,
  departmentIds: [],
  fileList: [],
})

const formErrors = ref<Partial<Record<keyof SourcesFormModel, string>>>({})
const formSaving = ref(false)
const formModel = ref<SourcesFormModel>(emptyFormState())

function updateFormModel(value: SourcesFormModel) {
  formModel.value = value
}

const authorOptions = computed<SelectOption[]>(() => {
  const authors = new Set<string>()
  for (const item of sources.value) {
    if (item.DocumentAuthor) {
      const trimmed = item.DocumentAuthor.trim()
      if (trimmed) {
        authors.add(trimmed)
      }
    }
  }
  return Array.from(authors)
    .map((author) => ({ label: author, value: author }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'))
})

function normalizeRange(range: [number, number] | null): [string, string] | null {
  if (!range) return null
  const [start, end] = range
  const startIso = timestampToIsoDate(start)
  const endIso = timestampToIsoDate(end)
  if (!startIso || !endIso) return null
  if (startIso <= endIso) return [startIso, endIso]
  return [endIso, startIso]
}

function normalizeText(value: string | null | undefined): string {
  if (value == null) return ''

  return value
    .toString()
    .toLocaleLowerCase('ru-RU')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toSourceRow(record: Source): SourceRow {
  return {
    ...record,
    formattedApprovalDate: formatDateIsoToRu(record.DocumentApprovalDate),
    periodText: formatPeriod(record.DocumentStartDate, record.DocumentEndDate),
  }
}

function matchesQuery(row: SourceRow, query: string, deptNames: string[]): boolean {
  if (!query) return true
  const haystack = [
    row.name,
    row.DocumentNumber,
    row.DocumentAuthor,
    row.formattedApprovalDate,
    row.periodText,
    ...deptNames,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeText(value))

  return haystack.some((value) => value.includes(query))
}

watch(
  () => pagination.pageSize,
  () => {
    pagination.page = 1
  },
)

watch(
  () => filterModel.departments.slice().sort((a, b) => a - b),
  (ids) => {
    if (ids.length) {
      ensureDetailsForIds(sources.value.map((item) => item.id))
    }
  },
)

watch(
  () => sources.value,
  () => {
    pagination.page = 1
  },
  { deep: true },
)

watch(
  () => normalizeText(filterModel.search),
  (query) => {
    if (query) {
      ensureDetailsForIds(sources.value.map((item) => item.id))
    }
  },
)

watch(
  filterModel,
  () => {
    pagination.page = 1
  },
  { deep: true },
)

watch(
  sortOrder,
  () => {
    pagination.page = 1
  },
)

const enrichedSources = computed(() => sources.value.map(toSourceRow))

const filteredSources = computed(() => {
  const filters = filterModel
  const query = normalizeText(filters.search)

  return enrichedSources.value.filter((item) => {
    if (filters.author.length) {
      const author = (item.DocumentAuthor ?? '').trim()
      if (!filters.author.includes(author)) return false
    }

    if (filters.approvalRange) {
      const normalized = normalizeRange(filters.approvalRange)
      if (!normalized) return false
      const [startIso, endIso] = normalized
      const date = item.DocumentApprovalDate
      if (!date || date < startIso || date > endIso) return false
    }

    if (filters.periodRange) {
      const normalized = normalizeRange(filters.periodRange)
      if (!normalized) return false
      const [rangeStart, rangeEnd] = normalized
      const docStart = item.DocumentStartDate ?? '0000-00-00'
      const docEnd = item.DocumentEndDate ?? '9999-12-31'
      if (docStart > rangeEnd || docEnd < rangeStart) return false
    }

    if (filters.departments.length) {
      const details = detailsCache.value.get(item.id)
      if (!details || (!details.loaded && !details.error)) {
        return false
      }
      if (details.error) {
        return false
      }
      if (!details.departmentIds.some((id) => filters.departments.includes(id))) {
        return false
      }
    }

    const details = detailsCache.value.get(item.id)
    const deptNames = details
      ? details.departmentIds
          .map((id) => deptById.value.get(id))
          .filter((name): name is string => Boolean(name))
      : []

    if (query && !matchesQuery(item, query, deptNames)) {
      return false
    }

    return true
  })
})

const sortedSources = computed(() => {
  const base = [...filteredSources.value].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return sortOrder.value === 'desc' ? base.reverse() : base
})

const total = computed(() => sortedSources.value.length)

const pagedSources = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return sortedSources.value.slice(start, start + pagination.pageSize)
})

const mobileSources = computed(() =>
  sortedSources.value.slice(0, Math.min(sortedSources.value.length, pagination.page * pagination.pageSize)),
)

const displaySources = computed(() => (isMobile.value ? mobileSources.value : pagedSources.value))

const visibleCount = computed(() => displaySources.value.length)

const maxPage = computed(() => Math.max(1, Math.ceil((total.value || 0) / pagination.pageSize) || 1))

watchEffect(() => {
  if (pagination.page > maxPage.value) {
    pagination.page = maxPage.value
  }
})

watchEffect(() => {
  const ids = displaySources.value.map((item) => item.id)
  ensureDetailsForIds(ids)
})

const normalizedRows = computed<NormalizedRow[]>(() => {
  return displaySources.value.map((row) => {
    const details = detailsCache.value.get(row.id)
    const departmentIds = details?.departmentIds ?? []
    const deptNames = departmentIds
      .map((id) => deptById.value.get(id))
      .filter((name): name is string => Boolean(name))
    const files = details?.files ?? []

    return {
      ...row,
      formattedApprovalDate: formatDateIsoToRu(row.DocumentApprovalDate),
      formattedStartDate: formatDateIsoToRu(row.DocumentStartDate),
      formattedEndDate: formatDateIsoToRu(row.DocumentEndDate),
      periodText: formatPeriod(row.DocumentStartDate, row.DocumentEndDate),
      deptNames,
      deptLoadError: Boolean(details?.error),
      detailsLoading: Boolean(detailsInFlight.get(row.id)),
      authorLabel: row.DocumentAuthor?.trim() || 'Не указан',
      files,
      departmentIds,
    }
  })
})

function showMore() {
  if (pagination.page < maxPage.value) {
    pagination.page += 1
  }
}

function ensureDetailsForIds(ids: number[]) {
  for (const id of ids) {
    void ensureSourceDetails(id)
  }
}

function enqueueDetails(task: () => void) {
  detailsQueue.push(task)
  processDetailsQueue()
}

function processDetailsQueue() {
  while (activeDetailsRequests < DETAILS_CONCURRENCY_LIMIT && detailsQueue.length) {
    const task = detailsQueue.shift()
    if (!task) continue
    activeDetailsRequests += 1
    task()
  }
}

function setDetails(id: number, entry: SourceDetailsEntry) {
  const next = new Map(detailsCache.value)
  next.set(id, entry)
  detailsCache.value = next
}

function ensureSourceDetails(id: number, options: { force?: boolean } = {}): Promise<SourceDetailsEntry> {
  if (!Number.isFinite(id)) {
    return Promise.resolve({ departmentIds: [], files: [], loaded: true, error: true })
  }

  if (options.force) {
    const next = new Map(detailsCache.value)
    next.delete(id)
    detailsCache.value = next
    detailsInFlight.delete(id)
  }

  if (detailsInFlight.has(id)) {
    return detailsInFlight.get(id)!
  }

  const cached = detailsCache.value.get(id)
  if (cached && !options.force && (cached.loaded || cached.error)) {
    return Promise.resolve(cached)
  }

  const promise = new Promise<SourceDetailsEntry>((resolve) => {
    enqueueDetails(() => {
      void (async () => {
        try {
          const result = await queryClient.fetchQuery({
            queryKey: sourceQueryKeys.details(id),
            queryFn: () => fetchSourceDetails(Number(id)),
          })
          const entry: SourceDetailsEntry = { ...result, loaded: true, error: false }
          setDetails(id, entry)
          resolve(entry)
        } catch (error) {
          console.debug('Failed to load departments for source', id, error)
          const entry: SourceDetailsEntry = { departmentIds: [], files: [], loaded: true, error: true }
          setDetails(id, entry)
          resolve(entry)
        } finally {
          activeDetailsRequests = Math.max(0, activeDetailsRequests - 1)
          detailsInFlight.delete(id)
          processDetailsQueue()
        }
      })()
    })
  })

  detailsInFlight.set(id, promise)
  return promise
}

function renderName(row: NormalizedRow): VNodeChild {
  return row.name || '—'
}

function renderPeriod(row: NormalizedRow): VNodeChild {
  return row.periodText || '—'
}

function renderActions(row: NormalizedRow): VNodeChild {
  const title = row.name?.trim() || 'документ'
  return h('div', { class: 'table-actions' }, [
    h(
      NButton,
      {
        quaternary: true,
        circle: true,
        size: 'small',
        onClick: () => void openEdit(row),
        disabled: removingId.value === row.id,
        'aria-label': `Изменить документ ${title}`,
      },
      { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
    ),
    h(
      NButton,
      {
        quaternary: true,
        circle: true,
        size: 'small',
        type: 'error',
        onClick: () => void handleDelete(row),
        loading: removingId.value === row.id,
        disabled: removingId.value === row.id,
        'aria-label': `Удалить документ ${title}`,
      },
      { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
    ),
  ])
}

const columns: DataTableColumns<NormalizedRow> = [
  {
    title: 'Документ',
    key: 'name',
    className: 'col-name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    render: renderName,
  },
  {
    title: 'Реквизиты',
    key: 'requisites',
    render: renderRequisites,
  },
  {
    title: 'Период действия',
    key: 'period',
    render: renderPeriod,
  },
  {
    title: 'Исполнители',
    key: 'departments',
    render: renderDepartments,
  },
  {
    title: 'Файл',
    key: 'file',
    render: renderFile,
  },
  {
    title: 'Действия',
    key: 'actions',
    className: 'col-actions',
    render: renderActions,
  },
]

const cardFields = computed<CardField[]>(() => [
  { key: 'name', label: 'Документ', render: renderName, isPrimary: true },
  { key: 'requisites', label: 'Реквизиты', render: renderRequisites },
  { key: 'period', label: 'Период действия', render: renderPeriod },
  { key: 'departments', label: 'Исполнители', render: renderDepartments },
  { key: 'file', label: 'Файл', render: renderFile },
  { key: 'actions', label: 'Действия', render: renderActions, isActions: true },
])

const primaryField = computed(
  () => cardFields.value.find((field) => field.isPrimary) ?? cardFields.value[0],
)
const actionsField = computed(() => cardFields.value.find((field) => field.isActions))
const infoFields = computed(() =>
  cardFields.value.filter((field) => !field.isPrimary && !field.isActions),
)

const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: { type: Object as PropType<CardField>, required: true },
    row: { type: Object as PropType<NormalizedRow>, required: true },
  },
  setup(props) {
    return () => props.field.render(props.row)
  },
})

const ActionsRenderer = defineComponent({
  name: 'ActionsRenderer',
  props: {
    row: { type: Object as PropType<NormalizedRow>, required: true },
  },
  setup(props) {
    return () => renderActions(props.row)
  },
})

const primaryTitle = (row: NormalizedRow) => row.name?.trim() || 'Документ'

function rowKey(row: NormalizedRow): DataTableRowKey {
  return row.id
}

function createRowProps(row: NormalizedRow) {
  return {
    onClick: () => {
      void ensureSourceDetails(row.id)
    },
  }
}

function renderRequisites(row: NormalizedRow): VNodeChild {
  const rows = [
    { label: 'Номер', value: row.DocumentNumber || '—', type: 'default' as const },
    { label: 'Утвержд.', value: row.formattedApprovalDate, type: 'info' as const },
    { label: 'Орган', value: row.authorLabel, type: 'default' as const },
  ]

  return h(
    'div',
    { class: 'requisites' },
    rows.map((item) =>
      h('div', { class: 'requisites__row' }, [
        h('span', { class: 'requisites__label' }, `${item.label}:`),
        h(
          NTag,
          { size: 'small', round: true, type: item.type === 'info' ? 'info' : 'default', class: 'requisites__tag' },
          { default: () => item.value },
        ),
      ]),
    ),
  )
}

function renderDepartments(row: NormalizedRow): VNodeChild {
  if (row.detailsLoading) {
    return h('span', { class: 'cell-muted' }, 'Загрузка...')
  }

  if (row.deptLoadError) {
    return h(
      NTooltip,
      { placement: 'top' },
      {
        trigger: () => h('span', { class: 'cell-muted' }, '—'),
        default: () => 'Исполнители недоступны (ошибка сервера)',
      },
    )
  }

  if (!row.deptNames.length) {
    return '—'
  }

  const chips: VNodeChild[] = []
  const limit = 3
  const visible = row.deptNames.slice(0, limit)
  const hidden = row.deptNames.slice(limit)

  for (const name of visible) {
    chips.push(
      h(
        NTag,
        { size: 'small', round: true, class: 'executor-tag' },
        { default: () => name },
      ),
    )
  }

  if (hidden.length) {
    chips.push(
      h(
        NPopover,
        { placement: 'top', trigger: 'hover' },
        {
          trigger: () =>
            h(
              NTag,
              { size: 'small', round: true, class: 'executor-tag executor-tag--more' },
              { default: () => `+${hidden.length}` },
            ),
          default: () =>
            h(
              'div',
              { class: 'executor-popover' },
              hidden.map((name) => h('div', { class: 'executor-popover__item' }, name)),
            ),
        },
      ),
    )
  }

  return h('div', { class: 'executor-cell' }, chips)
}

function resolveFileName(file: SourceFile): string {
  return (
    (typeof file.name === 'string' && file.name) ||
    (typeof file.fileName === 'string' && file.fileName) ||
    (typeof file.FileName === 'string' && file.FileName) ||
    (typeof file.title === 'string' && file.title) ||
    'Файл'
  )
}

function resolveFileUrl(file: SourceFile): string | null {
  const candidates = [file.url, file.href, file.link, file.path, file.FilePath]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) {
      return candidate
    }
  }
  return null
}

function renderFile(row: NormalizedRow): VNodeChild {
  const file = row.files[0]
  if (!file) {
    return '—'
  }

  const name = resolveFileName(file)
  const url = resolveFileUrl(file)

  if (url) {
    return h(
      'a',
      {
        class: 'file-link',
        href: url,
        target: '_blank',
        rel: 'noopener',
      },
      [
        h(
          NIcon,
          { class: 'file-link__icon', size: 18 },
          { default: () => h(DocumentTextOutline) },
        ),
        h('span', { class: 'file-link__text' }, name),
      ],
    )
  }

  return h('span', { class: 'file-link__text' }, name)
}

function validateForm(): boolean {
  const errors: Partial<Record<keyof SourcesFormModel, string>> = {}
  const state = formModel.value

  if (!state.name.trim()) {
    errors.name = 'Укажите наименование'
  }
  if (!state.DocumentNumber.trim()) {
    errors.DocumentNumber = 'Укажите номер документа'
  }
  if (!state.DocumentApprovalDate) {
    errors.DocumentApprovalDate = 'Выберите дату утверждения'
  }
  if (!state.DocumentAuthor.trim()) {
    errors.DocumentAuthor = 'Укажите орган (регулятор)'
  }
  if (!state.departmentIds.length) {
    errors.departmentIds = 'Выберите хотя бы одного исполнителя'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

function openCreate() {
  modalMode.value = 'create'
  formModel.value = emptyFormState()
  formErrors.value = {}
  modalOpen.value = true
  editingId = null
  editingMeta = null
  initialDepartmentIds = []
}

async function openEdit(row: NormalizedRow) {
  modalMode.value = 'edit'
  editingId = row.id
  editingMeta = {
    idDocumentNumber: row.idDocumentNumber ?? null,
    idDocumentApprovalDate: row.idDocumentApprovalDate ?? null,
    idDocumentAuthor: row.idDocumentAuthor ?? null,
    idDocumentStartDate: row.idDocumentStartDate ?? null,
    idDocumentEndDate: row.idDocumentEndDate ?? null,
  }
  await ensureSourceDetails(row.id)
  const details = detailsCache.value.get(row.id)
  initialDepartmentIds = details?.departmentIds ? [...details.departmentIds] : []
  formModel.value = {
    name: row.name ?? '',
    DocumentNumber: row.DocumentNumber ?? '',
    DocumentApprovalDate: row.DocumentApprovalDate ?? null,
    DocumentAuthor: row.DocumentAuthor ?? '',
    DocumentStartDate: row.DocumentStartDate ?? null,
    DocumentEndDate: row.DocumentEndDate ?? null,
    departmentIds: details?.departmentIds ? [...details.departmentIds] : [],
    fileList: [],
  }
  formErrors.value = {}
  modalOpen.value = true
}

function handleCancel() {
  modalOpen.value = false
}

async function handleSubmit() {
  if (!validateForm()) {
    message.error('Проверьте заполнение обязательных полей')
    return
  }

  formSaving.value = true
  try {
    const state = formModel.value
    if (modalMode.value === 'create') {
      const payload: SaveSourceCollectionInsPayload = {
        accessLevel: 1,
        name: state.name.trim(),
        DocumentNumber: state.DocumentNumber.trim(),
        DocumentApprovalDate: state.DocumentApprovalDate!,
        DocumentAuthor: state.DocumentAuthor.trim(),
        DocumentStartDate: state.DocumentStartDate,
        DocumentEndDate: state.DocumentEndDate,
      }
      const result = await createMutation.mutateAsync(payload)
      const newId = result.id
      if (typeof newId !== 'number') {
        throw new Error('Не удалось определить идентификатор созданного документа')
      }
      if (state.departmentIds.length) {
        await saveDepartmentsMutation.mutateAsync({ id: newId, ids: state.departmentIds })
      }
      const existing = detailsCache.value.get(newId)
      setDetails(newId, {
        departmentIds: [...state.departmentIds],
        files: existing?.files ?? [],
        loaded: true,
        error: false,
      })
      await ensureSourceDetails(newId, { force: true })
      await sourcesQuery.refetch()
      message.success('Документ создан')
    } else if (modalMode.value === 'edit' && editingId != null && editingMeta) {
      const payload: SaveSourceCollectionUpdPayload = {
        accessLevel: 1,
        id: editingId,
        cls: 1039,
        name: state.name.trim(),
        idDocumentNumber: editingMeta.idDocumentNumber,
        DocumentNumber: state.DocumentNumber.trim(),
        idDocumentApprovalDate: editingMeta.idDocumentApprovalDate,
        DocumentApprovalDate: state.DocumentApprovalDate!,
        idDocumentAuthor: editingMeta.idDocumentAuthor,
        DocumentAuthor: state.DocumentAuthor.trim(),
        idDocumentStartDate: editingMeta.idDocumentStartDate,
        DocumentStartDate: state.DocumentStartDate,
        idDocumentEndDate: editingMeta.idDocumentEndDate,
        DocumentEndDate: state.DocumentEndDate,
      }
      await updateMutation.mutateAsync(payload)
      const departmentsChanged =
        initialDepartmentIds.length !== state.departmentIds.length ||
        initialDepartmentIds.some((id) => !state.departmentIds.includes(id))
      if (departmentsChanged) {
        await saveDepartmentsMutation.mutateAsync({ id: editingId, ids: state.departmentIds })
        const existing = detailsCache.value.get(editingId)
        setDetails(editingId, {
          departmentIds: [...state.departmentIds],
          files: existing?.files ?? [],
          loaded: true,
          error: false,
        })
      }
      await ensureSourceDetails(editingId, { force: true })
      await sourcesQuery.refetch()
      message.success('Документ обновлён')
    }

    modalOpen.value = false
  } catch (error) {
    message.error(getErrorMessage(error))
  } finally {
    formSaving.value = false
  }
}

async function handleDelete(row: NormalizedRow) {
  const confirmed = await new Promise<boolean>((resolve) => {
    let resolved = false
    const finish = (result: boolean) => {
      if (resolved) return
      resolved = true
      resolve(result)
    }

    dialog.warning({
      title: 'Удаление документа',
      content: `Удалить документ “${row.name}”? Действие необратимо.`,
      positiveText: 'Удалить',
      negativeText: 'Отмена',
      maskClosable: false,
      onPositiveClick: () => finish(true),
      onNegativeClick: () => finish(false),
      onClose: () => finish(false),
    })
  })

  if (!confirmed) return

  removingId.value = row.id
  try {
    await deleteMutation.mutateAsync(row.id)
    const next = new Map(detailsCache.value)
    next.delete(row.id)
    detailsCache.value = next
    await sourcesQuery.refetch()
    message.success('Документ удалён')
  } catch (error) {
    message.error(getErrorMessage(error))
  } finally {
    removingId.value = null
  }
}

</script>

<style scoped lang="scss">
.sources-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow-x: hidden;
  padding: 12px;
  gap: 16px;
}

.table-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.table-full {
  flex: 1;
  min-width: 0;
}

:deep(.n-data-table .n-data-table-table) {
  border-collapse: separate;
  border-spacing: 0 12px;
  width: 100%;
}

:deep(.n-data-table .n-data-table-tbody .n-data-table-tr) {
  background: var(--n-card-color, var(--s360-bg));
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

:deep(.n-data-table .n-data-table-tbody .n-data-table-td) {
  border-bottom: none;
  padding: 12px 14px;
  line-height: 22px;
  vertical-align: top;
}

:deep(.n-data-table .n-data-table-th[data-col-key='name']),
:deep(.n-data-table .n-data-table-td.col-name) {
  width: 260px;
  max-width: 320px;
}

:deep(.n-data-table .n-data-table-th[data-col-key='actions']),
:deep(.n-data-table .n-data-table-td.col-actions) {
  width: 140px;
  text-align: right;
}

:deep(.n-data-table thead th) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--n-table-header-color, var(--n-card-color, var(--s360-bg)));
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar__left {
  flex: 1;
  min-width: 0;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.page-title__info {
  margin-left: 4px;
}

.page-title__info:hover,
.page-title__info:focus {
  background: var(--s360-surface);
  color: var(--n-text-color);
}

.page-title__info:active {
  background: var(--s360-surface);
}

.subtext {
  margin-top: 4px;
  color: var(--n-text-color-3);
  font-size: 12px;
  max-width: 720px;
}

.toolbar__controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  align-items: center;
  width: 100%;
}

.toolbar__search {
  flex: 1 1 260px;
  max-width: 100%;
}

.toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.toolbar__select {
  width: 180px;
}

.toolbar__select--wide {
  width: 220px;
}

.table-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.requisites {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.requisites__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.requisites__label {
  color: var(--n-text-color-3);
  font-size: 12px;
}

.requisites__tag {
  white-space: normal;
  max-width: 100%;
}

.executor-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.executor-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.executor-tag--more {
  background: var(--n-color-pressed);
}

.executor-popover {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.executor-popover__item {
  white-space: nowrap;
}

.file-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--n-primary-color);
  text-decoration: none;
}

.file-link__icon {
  display: inline-flex;
}

.file-link__text {
  text-decoration: underline;
}

.cell-muted {
  color: var(--n-text-color-3);
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.pagination-total {
  margin-right: 12px;
  color: var(--n-text-color-3);
  font-size: 14px;
}

.show-more-bar {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.list-info {
  font-size: 12px;
  color: var(--n-text-color-3);
  padding: 2px 2px 0;
}

.card {
  border: 1px solid var(--s360-border);
  border-radius: 14px;
  padding: 12px;
  background: var(--s360-bg);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  width: 100%;
  box-sizing: border-box;
}

.card__header,
.card__actions {
  min-width: 0;
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card__title {
  margin: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.card__title-text {
  font-weight: 600;
}

.card__grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 6px 10px;
  margin: 10px 0;
}

.card__grid dt {
  color: #6b7280;
  font-size: 12px;
}

.card__grid dd {
  margin: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.card__actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.card__actions .table-actions {
  justify-content: flex-start;
}

.text-body {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 720px) {
  .sources-page {
    padding: 8px;
  }

  .toolbar__controls {
    align-items: stretch;
    gap: 10px;
  }

  .toolbar__filters {
    width: 100%;
  }

  .toolbar__search {
    flex: 1 1 100%;
  }

  .toolbar__select {
    flex: 1 1 160px;
    width: 100%;
  }

  .toolbar__select--wide {
    flex: 1 1 200px;
  }

  .toolbar__search :deep(.n-input__input-el) {
    height: 34px;
  }
}

@media (max-width: 360px) {
  .card__grid {
    grid-template-columns: 100px 1fr;
  }
}
</style>
