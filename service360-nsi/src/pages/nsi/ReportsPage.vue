<!-- Файл: src/pages/nsi/ReportsPage.vue
     Назначение: справочник «Отчёты» с поиском, фильтрами, таблицей и генерацией отчётов. -->
<template>
  <section class="reports-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          {{ t('nsi.reports.title', {}, { default: 'Справочник «Отчёты»' }) }}
        </h2>
        <div class="subtext">
          {{
            t(
              'nsi.reports.subtitle',
              {},
              {
                default:
                  'Ведите перечень стандартных аналитических отчётов, фильтруйте по оргструктуре и запускайте генерацию в пару кликов.',
              },
            )
          }}
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="searchQuery"
          round
          clearable
          size="small"
          class="toolbar__search"
          :placeholder="
            t('nsi.reports.searchPlaceholder', {}, { default: 'Поиск по названию или описанию…' })
          "
        >
          <template #suffix>
            <NIcon :component="SearchOutline" />
          </template>
        </NInput>

        <NButton
          type="primary"
          size="small"
          :disabled="isProduction"
          :title="isProduction ? t('nsi.reports.create.disabledHint', {}, { default: 'Добавление временно недоступно' }) : undefined"
          @click="openCreateDialog"
        >
          {{ t('nsi.reports.createReport', {}, { default: 'Добавить отчёт' }) }}
        </NButton>
      </div>
    </NCard>

    <div class="table-area">
      <NDataTable
        v-if="!isMobile"
        class="reports-table s360-cards table-full table-stretch"
        :columns="columns"
        :data="desktopRows"
        :row-key="rowKey"
        :loading="tableLoading"
        :bordered="false"
        :flex-height="false"
      >
        <template #empty>
          <NEmpty :description="t('nsi.reports.empty', {}, { default: 'Отчёты не найдены' })" />
        </template>
      </NDataTable>

      <template v-else>
        <div class="list-info">
          {{
            t(
              'nsi.reports.listInfo',
              { shown: visibleCount, total },
              { default: 'Показано: ' + visibleCount + ' из ' + total },
            )
          }}
        </div>

        <div v-if="mobileRows.length" class="cards" role="list">
          <article
            v-for="item in mobileRows"
            :key="item.rowKey"
            class="card"
            role="group"
            :aria-label="item.name"
          >
            <header class="card__header">
              <div class="card__title" role="heading" aria-level="4">
                {{ item.name }}
              </div>
              <span class="index-chip">№ {{ item.index }}</span>
            </header>

            <dl class="card__grid">
              <dt>{{ t('nsi.reports.table.periodicity', {}, { default: 'Периодичность' }) }}</dt>
              <dd>
                <span class="period-chip">
                  {{
                    getPeriodTypeLabel(item.periodTypeId) ||
                    t('nsi.reports.form.periodTypeEmpty', {}, { default: 'Не указан' })
                  }}
                </span>
              </dd>
            </dl>

            <footer class="card__actions">
              <ActionsRenderer :row="item" />
            </footer>
          </article>
        </div>

        <NEmpty
          v-else
          class="cards-empty"
          :description="t('nsi.reports.empty', {}, { default: 'Отчёты не найдены' })"
        />
      </template>

      <div class="pagination-bar" v-if="total">
        <NPagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          show-quick-jumper
          :aria-label="
            t('nsi.reports.pagination', {}, { default: 'Постраничная навигация по отчётам' })
          "
        >
          <template #prefix>
            <span class="pagination-total">
              {{ t('nsi.reports.total', { total }, { default: 'Всего: ' + total }) }}
            </span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="generator.open"
      preset="card"
      :title="
        generator.report?.name ??
        t('nsi.reports.actions.generate', {}, { default: 'Сформировать отчёт' })
      "
      style="width: min(520px, 96vw)"
    >
      <template v-if="generatorOrgUnitLabel" #header-extra>
        <span class="modal-subtitle">{{ generatorOrgUnitLabel }}</span>
      </template>

      <p v-if="generator.report?.description" class="modal-description">
        {{ generator.report.description }}
      </p>

      <NForm
        ref="generatorFormRef"
        :model="generatorForm"
        :rules="generatorRules"
        size="small"
        label-placement="top"
        class="generator-form"
      >
        <NGrid cols="1" :x-gap="16" :y-gap="12">
          <NFormItemGi
            span="24"
            :label="t('nsi.reports.form.date', {}, { default: 'Дата отчёта' })"
            path="date"
          >
            <NDatePicker
              v-model:value="generatorForm.date"
              type="date"
              format="dd.MM.yyyy"
              value-format="yyyy-MM-dd"
              :placeholder="
                t('nsi.reports.form.datePlaceholder', {}, { default: 'Выберите дату' })
              "
              clearable
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="t('nsi.reports.form.client', {}, { default: 'Организация заказчика' })"
            path="objClient"
          >
            <NSelect
              v-model:value="generatorForm.objClient"
              :options="clientOptions"
              :loading="clientsLoading"
              filterable
              clearable
              :placeholder="
                t('nsi.reports.form.clientPlaceholder', {}, { default: 'Выберите организацию' })
              "
              @update:value="handleClientSelect"
              style="width: 100%"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="
              t('nsi.reports.table.orgUnit', {}, { default: 'Организационная единица исполнителя' })
            "
            path="orgUnitId"
          >
            <NTreeSelect
              v-model:value="generatorForm.orgUnitId"
              :options="orgStructureTreeOptions"
              :loading="orgStructureLoading"
              filterable
              clearable
              :placeholder="
                t(
                  'nsi.reports.form.orgUnitPlaceholder',
                  {},
                  { default: 'Выберите орг. единицу исполнителя' },
                )
              "
              @update:value="handleGeneratorOrgUnitSelect"
            />
          </NFormItemGi>

          <NFormItemGi
            span="24"
            :label="
              t(
                'nsi.reports.form.director',
                {},
                { default: 'Ответственное лицо исполнителя' },
              )
            "
            path="directorId"
          >
            <NSelect
              v-model:value="generatorForm.directorId"
              :options="filteredPersonnelOptions"
              :loading="personnelLoading"
              filterable
              clearable
              :placeholder="
                t(
                  'nsi.reports.form.directorPlaceholder',
                  {},
                  { default: 'Выберите ответственного' },
                )
              "
              @update:value="handleDirectorSelect"
              style="width: 100%"
            />
          </NFormItemGi>
        </NGrid>
      </NForm>

      <div class="modal-footer">
        <NButton quaternary @click="generator.open = false">
          {{ t('common.cancel', {}, { default: 'Отмена' }) }}
        </NButton>
        <NButton type="primary" :loading="generator.submitting" @click="handleGenerate">
          {{ t('nsi.reports.actions.generate', {}, { default: 'Сформировать' }) }}
        </NButton>
      </div>
    </NModal>

    <NModal
      v-model:show="preview.open"
      preset="card"
      :draggable="true"
      transform-origin-disabled
      :style="previewModalStyle"
      :title="
        preview.report?.name ??
        t('nsi.reports.preview.title', {}, { default: 'Предпросмотр отчёта' })
      "
    >
      <template v-if="preview.orgUnitName" #header-extra>
        <span class="modal-subtitle">{{ preview.orgUnitName }}</span>
      </template>

      <div class="preview-bar">
        <div class="preview-meta">
          <div class="preview-meta__title">
            {{ t('nsi.reports.form.periodType', {}, { default: 'Период' }) }}:
            {{ previewPeriodLabel }}
          </div>
          <div class="preview-meta__subtitle">
            {{
              t(
                'nsi.reports.preview.format',
                { format: preview.format.toUpperCase() },
                { default: 'Формат: ' + preview.format.toUpperCase() },
              )
            }}
          </div>
        </div>
        <div class="preview-actions">
          <NButton tertiary size="small" @click="refreshPreview" :loading="preview.loading">
            <template #icon>
              <NIcon :component="RefreshOutline" />
            </template>
            {{ t('nsi.reports.preview.refresh', {}, { default: 'Обновить' }) }}
          </NButton>
          <NButton
            tertiary
            size="small"
            :disabled="!preview.report || preview.loading"
            :loading="excelExportLoading"
            @click="downloadExcel"
          >
            <template #icon>
              <NIcon :component="CloudDownloadOutline" />
            </template>
            {{ t('nsi.reports.preview.downloadXlsx', {}, { default: 'Выгрузить в Excel' }) }}
          </NButton>
        </div>
      </div>

      <div class="preview-body" :style="previewBodyStyle">
        <NSpin :show="preview.loading">
          <div v-if="preview.format === 'pdf' && preview.url" class="preview-frame">
            <iframe
              :key="preview.url"
              ref="previewFrameRef"
              class="preview-iframe"
              :src="preview.url"
              title="Просмотр отчёта"
            />
          </div>
          <NEmpty
            v-else
            class="preview-empty"
            :description="
              t(
                'nsi.reports.preview.empty',
                {},
                { default: 'Сформируйте отчёт, чтобы увидеть превью' },
              )
            "
          />
        </NSpin>
        <button
          class="modal-resize-handle"
          type="button"
          aria-label="Изменить размер"
          @mousedown="startModalResize"
        />
      </div>
    </NModal>

    <NModal
      v-model:show="editDialog.open"
      preset="card"
      :title="
        editDialog.mode === 'create'
          ? t('nsi.reports.create.title', {}, { default: 'Новый отчёт' })
          : t('nsi.reports.edit.title', {}, { default: 'Редактирование отчёта' })
      "
      style="width: min(520px, 96vw)"
    >
      <NForm
        ref="editFormRef"
        :model="editDialog.form"
        :rules="editFormRules"
        size="small"
        label-placement="top"
        class="edit-form"
      >
        <NFormItem :label="t('nsi.reports.table.index', {}, { default: 'Индекс' })" path="index">
          <NInput v-model:value="editDialog.form.index" />
        </NFormItem>
        <NFormItem
          :label="t('nsi.reports.table.name', {}, { default: 'Наименование' })"
          path="name"
        >
          <NInput v-model:value="editDialog.form.name" />
        </NFormItem>
        <NFormItem
          :label="t('nsi.reports.form.periodType', {}, { default: 'Период отчёта' })"
          path="periodTypeId"
        >
          <NSelect
            v-model:value="editDialog.form.periodTypeId"
            :options="periodTypeOptions"
            :loading="periodTypesLoading"
            filterable
            clearable
            :placeholder="
              t('nsi.reports.form.periodTypePlaceholder', {}, { default: 'Выберите период' })
            "
          />
        </NFormItem>
      </NForm>

      <div class="modal-footer">
        <NButton quaternary @click="editDialog.open = false">
          {{ t('common.cancel', {}, { default: 'Отмена' }) }}
        </NButton>
        <NButton type="primary" :loading="editDialog.submitting" @click="handleEditSave">
          {{
            editDialog.mode === 'create'
              ? t('common.create', {}, { default: 'Создать' })
              : t('common.save', {}, { default: 'Сохранить' })
          }}
        </NButton>
      </div>
    </NModal>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  type Component as VueComponent,
  type PropType,
} from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NEmpty,
  NForm,
  NFormItem,
  NFormItemGi,
  NGrid,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSpin,
  NTooltip,
  NTreeSelect,
  type DataTableColumns,
  type DatePickerProps,
  type FormInst,
  type FormRules,
  type SelectOption,
  type TreeSelectOption,
  useDialog,
  useMessage,
} from 'naive-ui'
import {
  CloudDownloadOutline,
  CreateOutline,
  DocumentTextOutline,
  RefreshOutline,
  SearchOutline,
  TrashOutline,
} from '@vicons/ionicons5'

import reportsSeed from '@/data/reportTemplates.json'
import { useAuth } from '@features/auth'
import { useIsMobile } from '@/shared/composables/useIsMobile'
import { normalizeText } from '@shared/lib'
import {
  fetchReportFile,
  reportRpc,
  objectsRpc,
  personnalRpc,
  orgStructureRpc,
  type FetchReportFileParams,
} from '@shared/api'
import { type ReportFileDescriptor, type ReportFormat } from '@entities/report'

type DatePickerValue = DatePickerProps['value']

type SortOrder = 'index-asc' | 'index-desc' | 'name-asc' | 'name-desc'

interface ReportTemplate {
  id: string
  index: string
  name: string
  periodTypeId: number | null
  description: string
  rpc: ReportRpcConfig
}

type ReportRow = ReportTemplate & { rowKey: string }
type ReportFileResult = ReportFileDescriptor & { jobId?: string | null; remoteUrl?: string | null }

interface ReportRpcConfig {
  tml: string
  generateMethod: string
  defaultFormat?: ReportFormat
  previewFormat?: ReportFormat
  mapPayload?: (payload: Record<string, unknown>, report: ReportTemplate) => Record<string, unknown>
  buildGenerateParams?: (payload: Record<string, unknown>, report: ReportTemplate) => unknown
  buildLoadParams?: (options: {
    payload: Record<string, unknown>
    report: ReportTemplate
    jobId: string
    format: ReportFormat
  }) => FetchReportFileParams
}

const BASE_REPORT_RPC: ReportRpcConfig = {
  tml: 'ПО-4',
  generateMethod: 'report/generateReport',
  defaultFormat: 'pdf',
  previewFormat: 'pdf',
  mapPayload: (payload, report) => ({
    ...payload,
    tml: (payload.tml as string | null) ?? report.index ?? 'ПО-4',
  }),
  buildGenerateParams: (payload) => [payload],
  buildLoadParams: ({ jobId, payload, format }) => ({
    tml: (payload.tml as string) ?? 'ПО-4',
    id: jobId,
    ...(format === 'pdf' ? { ext: 'pdf' } : {}),
  }),
}

interface RpcRecordsEnvelope<T> {
  records?: T[] | null
}

interface PeriodTypeRecord {
  id: number
  text: string
}

interface ClientRecord {
  id: number
  fullName?: string | null
  name?: string | null
  pv?: number | null
}

interface PersonnelRecord {
  id: number
  fullName: string
  login?: string | null
  namePosition?: string | null
  nameLocation?: string | null
  UserPhone?: string | null
  objLocation?: number | null
}

interface OrgUnitRecord {
  id: number
  name: string
  parent?: number | null
}

interface GeneratorFormModel {
  date: DatePickerValue | null
  objClient: number | null
  objLocation: number | null
  orgUnitId: number | null
  fullNameClient: string | null
  directorId: number | null
  fullNameDirector: string | null
  nameDirectorPosition: string | null
  nameDirectorLocation: string | null
  fulNameUser: string | null
  nameUserPosition: string | null
  UserPhone: string | null
  tml: string | null
}

interface StoredReportEntry {
  id?: string
  index: string
  name: string
  periodTypeId?: number | null
  description?: string
}

const REPORTS_DATA_ENDPOINT = '/dev-reports'

const INITIAL_REPORTS: ReportTemplate[] = normalizeStoredReports(
  (reportsSeed as StoredReportEntry[]) ?? [],
)

function cloneReport(report: ReportTemplate): ReportTemplate {
  return {
    ...report,
    rpc: report.rpc ?? BASE_REPORT_RPC,
  }
}

function normalizeStoredReportEntry(entry: StoredReportEntry | undefined, fallbackIndex: number) {
  if (!entry) return null
  const id =
    typeof entry.id === 'string' && entry.id.trim()
      ? entry.id.trim()
      : `report-${fallbackIndex + 1}`
  const indexValue = typeof entry.index === 'string' ? entry.index.trim() : ''
  const nameValue = typeof entry.name === 'string' ? entry.name.trim() : ''
  if (!indexValue || !nameValue) return null
  const periodTypeId =
    typeof entry.periodTypeId === 'number' && Number.isFinite(entry.periodTypeId)
      ? entry.periodTypeId
      : null

  return {
    id,
    index: indexValue,
    name: nameValue,
    periodTypeId,
    description: typeof entry.description === 'string' ? entry.description : '',
    rpc: BASE_REPORT_RPC,
  }
}

function normalizeStoredReports(entries: StoredReportEntry[]): ReportTemplate[] {
  return entries
    .map((entry, index) => normalizeStoredReportEntry(entry, index))
    .filter((entry): entry is ReportTemplate => Boolean(entry))
}

function toStoredReportEntry(report: ReportTemplate): StoredReportEntry {
  return {
    id: report.id,
    index: report.index,
    name: report.name,
    periodTypeId: report.periodTypeId ?? null,
    description: report.description ?? '',
  }
}

const reports = ref<ReportTemplate[]>(INITIAL_REPORTS.map((report) => cloneReport(report)))

const { t } = useI18n()
const { isMobile } = useIsMobile('(max-width: 768px)')
const message = useMessage()
const dialog = useDialog()
const auth = useAuth()
const isProduction = import.meta.env.PROD

const searchQuery = ref('')
const sortOrder = ref<SortOrder>('index-asc')

const pagination = reactive({
  page: 1,
  pageSize: 10,
})

const tableLoading = ref(false)
const deletingId = ref<string | null>(null)

const periodTypes = ref<PeriodTypeRecord[]>([])
const periodTypesLoading = ref(false)
let periodTypesPromise: Promise<void> | null = null

const periodTypeOptions = computed<SelectOption[]>(() =>
  periodTypes.value.map((item) => ({
    label: item.text,
    value: item.id,
  })),
)

const periodTypeLabelMap = computed(() => {
  const map = new Map<number, string>()
  periodTypes.value.forEach((item) => {
    if (typeof item.id === 'number') {
      map.set(item.id, item.text)
    }
  })
  return map
})

function getPeriodTypeLabel(id: number | null | undefined) {
  if (id == null) return ''
  return periodTypeLabelMap.value.get(id) ?? ''
}

async function loadReportsFromRepo() {
  if (import.meta.env.PROD || typeof fetch === 'undefined') {
    reports.value = INITIAL_REPORTS.map((report) => cloneReport(report))
    return
  }
  try {
    const response = await fetch(REPORTS_DATA_ENDPOINT, { cache: 'no-store' })
    if (!response.ok) throw new Error(`status ${response.status}`)
    const payload = (await response.json()) as StoredReportEntry[]
    const normalized = normalizeStoredReports(payload)
    const source = normalized.length ? normalized : INITIAL_REPORTS
    reports.value = source.map((item) => cloneReport(item))
  } catch (error) {
    console.warn('[ReportsPage] loadReportsFromRepo failed:', error)
    reports.value = INITIAL_REPORTS.map((report) => cloneReport(report))
  }
}

async function persistReportsToRepo() {
  if (import.meta.env.PROD || typeof fetch === 'undefined') return
  try {
    await fetch(REPORTS_DATA_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reports.value.map((report) => toStoredReportEntry(report)), null, 2),
    })
  } catch (error) {
    console.warn('[ReportsPage] persistReportsToRepo failed:', error)
  }
}

const filteredReports = computed(() => {
  const search = normalizeText(searchQuery.value)

  const rows = reports.value.filter((report) => {
    const periodLabel = normalizeText(getPeriodTypeLabel(report.periodTypeId))
    const matchesSearch =
      !search ||
      normalizeText(report.index).includes(search) ||
      normalizeText(report.name).includes(search) ||
      periodLabel.includes(search)
    return matchesSearch
  })

  const order = sortOrder.value
  if (order === 'name-asc') {
    rows.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  } else if (order === 'name-desc') {
    rows.sort((a, b) => b.name.localeCompare(a.name, 'ru'))
  } else if (order === 'index-desc') {
    rows.sort((a, b) => compareIndexValues(b.index, a.index))
  } else {
    rows.sort((a, b) => compareIndexValues(a.index, b.index))
  }

  return rows
})

const sortedReports = computed(() => filteredReports.value)

const processedRows = computed<ReportRow[]>(() =>
  sortedReports.value.map((report) => ({ ...report, rowKey: report.id })),
)

const total = computed(() => processedRows.value.length)

const paginatedRows = computed<ReportRow[]>(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return processedRows.value.slice(start, end)
})

const desktopRows = computed(() => paginatedRows.value)
const mobileRows = computed(() => processedRows.value)
const visibleCount = computed(() =>
  isMobile.value ? mobileRows.value.length : desktopRows.value.length,
)

const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize)))

watch(searchQuery, () => {
  pagination.page = 1
})

watch([total, () => pagination.pageSize], () => {
  if (pagination.page > maxPage.value) {
    pagination.page = maxPage.value
  }
})

const rowKey = (row: ReportRow) => row.id

type ActionButtonVariant = 'default' | 'error' | 'primary'

interface ActionButtonOptions {
  label: string
  icon: VueComponent
  onClick: () => void
  variant?: ActionButtonVariant
  loading?: boolean
}

function createActionButton(options: ActionButtonOptions) {
  const { label, icon, onClick, variant = 'default', loading } = options
  const buttonType = variant === 'primary' ? 'primary' : variant === 'error' ? 'error' : undefined
  const button = h(
    NButton,
    {
      quaternary: variant !== 'primary',
      circle: true,
      size: 'small',
      type: buttonType,
      loading,
      'aria-label': label,
      onClick,
    },
    {
      icon: () => h(NIcon, null, { default: () => h(icon) }),
    },
  )

  return h(
    NTooltip,
    { placement: 'top' },
    {
      default: () => label,
      trigger: () => button,
    },
  )
}

function splitIndexValue(value: string) {
  const normalized = value.trim()
  const match = normalized.match(/^([^\d]*?)(\d+)?$/)
  const prefixSource = match?.[1] ?? ''
  const prefix =
    prefixSource
      .replace(/\s*-\s*/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || normalized
  const number = match?.[2] ? Number(match[2]) : Number.NaN
  return {
    prefix: prefix.toLocaleUpperCase('ru'),
    number,
    raw: normalized,
  }
}

function compareIndexValues(leftValue: string, rightValue: string) {
  const left = splitIndexValue(leftValue)
  const right = splitIndexValue(rightValue)
  const prefixCompare = left.prefix.localeCompare(right.prefix, 'ru')
  if (prefixCompare !== 0) {
    return prefixCompare
  }

  const leftHasNumber = Number.isFinite(left.number)
  const rightHasNumber = Number.isFinite(right.number)
  if (leftHasNumber && rightHasNumber) {
    if (left.number !== right.number) {
      return left.number - right.number
    }
  } else if (leftHasNumber) {
    return -1
  } else if (rightHasNumber) {
    return 1
  }

  return left.raw.localeCompare(right.raw, 'ru')
}

function renderIndexCell(row: ReportRow) {
  return h('span', { class: 'index-chip' }, row.index)
}

function renderNameCell(row: ReportRow) {
  return h('div', { class: 'name-cell' }, [
    h('div', { class: 'name-cell__title' }, row.name),
  ])
}

function renderPeriodChip(periodTypeId: number | null | undefined) {
  const label =
    getPeriodTypeLabel(periodTypeId) ||
    t('nsi.reports.form.periodTypeEmpty', {}, { default: 'Не указан' })
  return h('span', { class: 'period-chip' }, label)
}

function renderActionsCell(row: ReportRow) {
  const editButton = createActionButton({
    label: t('nsi.reports.actions.edit', {}, { default: 'Редактировать' }),
    icon: CreateOutline,
    onClick: () => openEdit(row),
  })

  const deleteButton = createActionButton({
    label: t('nsi.reports.actions.remove', {}, { default: 'Удалить' }),
    icon: TrashOutline,
    onClick: () => confirmDelete(row),
    variant: 'error',
    loading: deletingId.value === row.id,
  })

  const generateButton = createActionButton({
    label: t('nsi.reports.actions.generate', {}, { default: 'Сформировать' }),
    icon: DocumentTextOutline,
    onClick: () => openGenerator(row),
    variant: 'primary',
  })

  return h('div', { class: 'table-actions' }, [editButton, deleteButton, generateButton])
}

const columns = computed<DataTableColumns<ReportRow>>(() => [
  {
    title: t('nsi.reports.table.index', {}, { default: 'Индекс' }),
    key: 'index',
    width: 110,
    align: 'center',
    sorter: (a, b) => compareIndexValues(a.index, b.index),
    render: (row) => renderIndexCell(row),
  },
  {
    title: t('nsi.reports.table.name', {}, { default: 'Наименование отчёта' }),
    key: 'name',
    minWidth: 320,
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    render: (row) => renderNameCell(row),
  },
  {
    title: t('nsi.reports.table.periodicity', {}, { default: 'Периодичность' }),
    key: 'periodicity',
    width: 220,
    render: (row) => renderPeriodChip(row.periodTypeId),
  },
  {
    title: t('nsi.reports.table.actions', {}, { default: 'Действия' }),
    key: 'actions',
    width: 220,
    align: 'center',
    className: 'actions-column',
    render: (row) => renderActionsCell(row),
  },
])

const generatorFormRef = ref<FormInst | null>(null)
const generatorForm = reactive<GeneratorFormModel>({
  date: null,
  objClient: null,
  objLocation: null,
  orgUnitId: null,
  fullNameClient: null,
  directorId: null,
  fullNameDirector: null,
  nameDirectorPosition: null,
  nameDirectorLocation: null,
  fulNameUser: null,
  nameUserPosition: null,
  UserPhone: null,
  tml: null,
})
const generator = reactive({
  open: false,
  submitting: false,
  report: null as ReportTemplate | null,
})

const clients = ref<ClientRecord[]>([])
const clientsLoading = ref(false)
let clientsPromise: Promise<void> | null = null
const personnel = ref<PersonnelRecord[]>([])
const personnelLoading = ref(false)
let personnelPromise: Promise<void> | null = null
const orgUnits = ref<OrgUnitRecord[]>([])
const orgStructureLoading = ref(false)
let orgStructurePromise: Promise<void> | null = null

const clientOptions = computed<SelectOption[]>(() =>
  clients.value.map((item) => ({
    label: item.fullName ?? item.name ?? `ID ${item.id}`,
    value: item.id,
  })),
)

const orgChildrenMap = computed<Map<number, number[]>>(() => {
  const map = new Map<number, number[]>()
  orgUnits.value.forEach((unit) => {
    if (unit.parent == null) return
    const siblings = map.get(unit.parent) ?? []
    siblings.push(unit.id)
    map.set(unit.parent, siblings)
  })
  return map
})

function collectOrgDescendantIds(rootId: number | null | undefined) {
  if (rootId == null) return []
  const ids: number[] = []
  const stack: number[] = [rootId]
  while (stack.length) {
    const current = stack.pop()!
    ids.push(current)
    const children = orgChildrenMap.value.get(current)
    if (children?.length) {
      stack.push(...children)
    }
  }
  return ids
}

function getOrgUnitName(id: number | null | undefined) {
  if (id == null) return ''
  const unit = orgUnits.value.find((item) => item.id === id)
  return unit?.name ?? ''
}

function toNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

const personnelOptions = computed<SelectOption[]>(() =>
  personnel.value.map((person) => ({
    label: person.namePosition ? `${person.fullName} (${person.namePosition})` : person.fullName,
    value: person.id,
  })),
)

const filteredPersonnelOptions = computed<SelectOption[]>(() => {
  const targetOrgId = generatorForm.orgUnitId ?? null
  if (targetOrgId == null) return personnelOptions.value
  const allowedSet = new Set(collectOrgDescendantIds(targetOrgId))
  return personnel.value
    .filter((person) => {
      const locationId = toNumericId(person.objLocation)
      return locationId != null && allowedSet.has(locationId)
    })
    .map((person) => ({
      label: person.namePosition ? `${person.fullName} (${person.namePosition})` : person.fullName,
      value: person.id,
    }))
})

const generatorOrgUnitLabel = computed(() =>
  getOrgUnitName(generatorForm.orgUnitId),
)

const currentUser = auth.user
const currentUserPersonnel = computed(() => {
  const login = currentUser.value?.login
  if (!login) return null
  return personnel.value.find((person) => person.login === login) ?? null
})

watch(
  () => currentUserPersonnel.value,
  () => {
    if (generator.open) {
      applyExecutorFromCurrentUser()
    }
  },
)

const orgStructureTreeOptions = computed<TreeSelectOption[]>(() =>
  buildOrgTreeOptions(orgUnits.value),
)

const generatorRules: FormRules = {
  date: {
    required: true,
    trigger: ['blur', 'change'],
    validator: (_, value) => {
      if (!hasDateValue(value as DatePickerValue | null)) {
        return new Error(
          t('nsi.reports.validation.date', {}, { default: 'Укажите дату отчёта' }),
        )
      }
      return true
    },
  },
  objClient: {
    required: true,
    trigger: ['blur', 'change'],
    validator: (_, value) => {
      if (toNumericId(value) == null) {
        return new Error(
          t('nsi.reports.validation.objClient', {}, { default: 'Выберите организацию заказчика' }),
        )
      }
      return true
    },
  },
  orgUnitId: {
    required: true,
    trigger: ['blur', 'change'],
    validator: (_, value) => {
      if (toNumericId(value) == null) {
        return new Error(
          t(
            'nsi.reports.validation.orgUnit',
            {},
            { default: 'Выберите организационную единицу исполнителя' },
          ),
        )
      }
      return true
    },
  },
  directorId: {
    required: true,
    trigger: ['blur', 'change'],
    validator: (_, value) => {
      if (toNumericId(value) == null) {
        return new Error(
          t(
            'nsi.reports.validation.director',
            {},
            { default: 'Выберите ответственного со стороны подрядчика' },
          ),
        )
      }
      return true
    },
  },
}

const previewFrameRef = ref<HTMLIFrameElement | null>(null)

const preview = reactive<{
  open: boolean
  loading: boolean
  format: ReportFormat
  fileName: string
  blob: Blob | null
  url: string
  report: ReportTemplate | null
  payload: Record<string, unknown>
  jobId: string | null
  remoteUrl: string | null
  orgUnitName: string
}>({
  open: false,
  loading: false,
  format: 'pdf',
  fileName: '',
  blob: null,
  url: '',
  report: null,
  payload: {},
  jobId: null,
  remoteUrl: null,
  orgUnitName: '',
})

const previewPeriodLabel = computed(() => {
  const label = getPeriodTypeLabel(preview.report?.periodTypeId ?? null)
  return label || t('nsi.reports.form.periodTypeEmpty', {}, { default: 'Не указан' })
})

const excelExportLoading = ref(false)
const MODAL_MIN_WIDTH = 640
const MODAL_MIN_HEIGHT = 420

const modalSize = reactive({
  width: Math.min(960, typeof window === 'undefined' ? 960 : window.innerWidth - 80),
  height: Math.min(640, typeof window === 'undefined' ? 640 : window.innerHeight - 160),
})

const previewModalStyle = computed(() => {
  const maxWidth = typeof window === 'undefined' ? modalSize.width : window.innerWidth - 32
  const width = clamp(modalSize.width, MODAL_MIN_WIDTH, maxWidth)
  return {
    width: `${width}px`,
    maxWidth: '95vw',
  }
})

const previewBodyStyle = computed(() => {
  const maxHeight = typeof window === 'undefined' ? modalSize.height : window.innerHeight - 120
  const height = clamp(modalSize.height, MODAL_MIN_HEIGHT, maxHeight)
  return {
    minHeight: `${height}px`,
  }
})

const editFormRef = ref<FormInst | null>(null)
const editDialog = reactive({
  open: false,
  submitting: false,
  mode: 'edit' as 'edit' | 'create',
  reportId: null as string | null,
  form: {
    index: '',
    name: '',
    periodTypeId: null as number | null,
  },
})

const editFormRules: FormRules = {
  index: {
    required: true,
    trigger: ['blur', 'input'],
    message: t('nsi.reports.validation.index', {}, { default: 'Укажите индекс отчёта' }),
  },
  name: {
    required: true,
    trigger: ['blur', 'input'],
    message: t('nsi.reports.validation.name', {}, { default: 'Укажите наименование отчёта' }),
  },
  periodTypeId: {
    type: 'number',
    required: true,
    trigger: ['blur', 'change'],
    message: t(
      'nsi.reports.validation.periodType',
      {},
      { default: 'Укажите период отчёта' },
    ),
  },
}

function openCreateDialog() {
  editDialog.mode = 'create'
  editDialog.reportId = null
  editDialog.form.index = ''
  editDialog.form.name = ''
  editDialog.form.periodTypeId = null
  editDialog.open = true
  editFormRef.value?.restoreValidation()
  void loadPeriodTypes()
}

function openGenerator(report: ReportTemplate) {
  generator.report = report
  resetGeneratorForm(report)
  generator.open = true
  generatorFormRef.value?.restoreValidation()
  void ensureReferenceDataLoaded()
}

async function ensureReferenceDataLoaded() {
  await Promise.all([
    loadPeriodTypes(),
    loadClients(),
    loadPersonnel(),
    loadOrgUnits(),
  ])
}

function resetGeneratorForm(report: ReportTemplate) {
  generatorForm.date = Date.now()
  generatorForm.objClient = null
  generatorForm.fullNameClient = null
  generatorForm.orgUnitId = null
  generatorForm.objLocation = null
  generatorForm.directorId = null
  generatorForm.fullNameDirector = null
  generatorForm.nameDirectorPosition = null
  generatorForm.nameDirectorLocation = null
  generatorForm.fulNameUser = null
  generatorForm.nameUserPosition = null
  generatorForm.UserPhone = null
  generatorForm.tml = report.index ?? report.rpc?.tml ?? null
  applyExecutorFromCurrentUser()
}

function handleGeneratorOrgUnitSelect(value: number | string | null) {
  const normalizedValue = toNumericId(value)
  generatorForm.orgUnitId = normalizedValue
  generatorForm.objLocation = normalizedValue
  if (
    normalizedValue == null ||
    (generatorForm.directorId != null &&
      !filteredPersonnelOptions.value.some((option) => option.value === generatorForm.directorId))
  ) {
    generatorForm.directorId = null
    generatorForm.fullNameDirector = null
    generatorForm.nameDirectorPosition = null
    generatorForm.nameDirectorLocation = null
  }
}

function handleClientSelect(value: number | string | null) {
  const normalizedValue = toNumericId(value)
  generatorForm.objClient = normalizedValue
  if (normalizedValue == null) {
    generatorForm.fullNameClient = null
    return
  }
  const client = clients.value.find((item) => item.id === normalizedValue)
  generatorForm.fullNameClient = client?.fullName ?? client?.name ?? null
}

function handleDirectorSelect(value: number | string | null) {
  const normalizedValue = toNumericId(value)
  generatorForm.directorId = normalizedValue
  if (normalizedValue == null) {
    generatorForm.fullNameDirector = null
    generatorForm.nameDirectorPosition = null
    generatorForm.nameDirectorLocation = null
    generatorForm.objLocation = generatorForm.orgUnitId
    return
  }
  const person = personnel.value.find((item) => item.id === normalizedValue)
  generatorForm.fullNameDirector = person?.fullName ?? null
  generatorForm.nameDirectorPosition = person?.namePosition ?? null
  generatorForm.nameDirectorLocation = person?.nameLocation ?? null
}

async function loadPeriodTypes() {
  if (periodTypes.value.length || periodTypesPromise) {
    return periodTypesPromise
  }
  periodTypesPromise = (async () => {
    periodTypesLoading.value = true
    try {
      const response = await objectsRpc<RpcRecordsEnvelope<PeriodTypeRecord>>(
        'data/loadPeriodType',
        [],
      )
      periodTypes.value = dedupeById(response?.records ?? [])
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.error('[ReportsPage] loadPeriodTypes failed:', reason)
      message.error(
        t('nsi.reports.errors.periodTypeLoad', {}, { default: 'Не удалось загрузить типы периодов' }),
      )
    } finally {
      periodTypesLoading.value = false
      periodTypesPromise = null
    }
  })()
  return periodTypesPromise
}

async function loadClients() {
  if (clients.value.length || clientsPromise) {
    return clientsPromise
  }
  clientsPromise = (async () => {
    clientsLoading.value = true
    try {
      const response = await objectsRpc<RpcRecordsEnvelope<ClientRecord>>(
        'data/loadObjList',
        ['Cls_Client', 'Prop_Client', 'clientdata'],
      )
      clients.value = dedupeById(response?.records ?? [])
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.error('[ReportsPage] loadClients failed:', reason)
      message.error(
        t(
          'nsi.reports.errors.clientsLoad',
          {},
          { default: 'Не удалось загрузить организации заказчиков' },
        ),
      )
    } finally {
      clientsLoading.value = false
      clientsPromise = null
    }
  })()
  return clientsPromise
}

async function loadPersonnel() {
  if (personnel.value.length || personnelPromise) {
    return personnelPromise
  }
  personnelPromise = (async () => {
    personnelLoading.value = true
    try {
      const response = await personnalRpc<RpcRecordsEnvelope<PersonnelRecord>>(
        'data/loadPersonnal',
        [0],
      )
      personnel.value = dedupeById(response?.records ?? [])
      if (generator.open) {
        applyExecutorFromCurrentUser()
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.error('[ReportsPage] loadPersonnel failed:', reason)
      message.error(
        t(
          'nsi.reports.errors.personnelLoad',
          {},
          { default: 'Не удалось загрузить список сотрудников' },
        ),
      )
    } finally {
      personnelLoading.value = false
      personnelPromise = null
    }
  })()
  return personnelPromise
}

async function loadOrgUnits() {
  if (orgUnits.value.length || orgStructurePromise) {
    return orgStructurePromise
  }
  orgStructurePromise = (async () => {
    orgStructureLoading.value = true
    try {
      const response = await orgStructureRpc<RpcRecordsEnvelope<OrgUnitRecord>>(
        'data/loadObjForSelect',
        ['Cls_LocationSection'],
      )
      orgUnits.value = dedupeById(response?.records ?? [])
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.error('[ReportsPage] loadOrgUnits failed:', reason)
      message.error(
        t(
          'nsi.reports.errors.orgUnitsLoad',
          {},
          { default: 'Не удалось загрузить организационные единицы' },
        ),
      )
    } finally {
      orgStructureLoading.value = false
      orgStructurePromise = null
    }
  })()
  return orgStructurePromise
}

function buildPayload(report: ReportTemplate) {
  const selectedOrgUnit = generatorForm.orgUnitId ?? generatorForm.objLocation ?? null
  return {
    tml: generatorForm.tml ?? report.index ?? report.rpc?.tml ?? null,
    date: normalizeDateValue(generatorForm.date),
    periodType: report.periodTypeId,
    objClient: generatorForm.objClient,
    objLocation: selectedOrgUnit,
    fullNameClient: generatorForm.fullNameClient,
    fullNameDirector: generatorForm.fullNameDirector,
    nameDirectorPosition: generatorForm.nameDirectorPosition,
    nameDirectorLocation: generatorForm.nameDirectorLocation,
    fulNameUser: generatorForm.fulNameUser,
    nameUserPosition: generatorForm.nameUserPosition,
    UserPhone: generatorForm.UserPhone,
  }
}

function normalizeDateValue(value: DatePickerValue | null): string | null {
  if (value == null) return null
  if (typeof value === 'number') {
    return formatDateInputValue(new Date(value))
  }
  if (typeof value === 'string') {
    return value
  }
  return null
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function hasDateValue(value: DatePickerValue | null): boolean {
  if (value == null) return false
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }
  if (typeof value === 'string') {
    const stringValue = value as unknown as string
    return stringValue.trim().length > 0
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasDateValue(item))
  }
  return false
}

function dedupeById<T extends { id: number | string }>(
  records: T[] = [],
): Array<T & { id: number }> {
  const unique = new Map<number, T & { id: number }>()
  records.forEach((record) => {
    const numericId = toNumericId(record.id)
    if (numericId == null) return
    if (!unique.has(numericId)) {
      const normalizedRecord = { ...record, id: numericId } as T & { id: number }
      unique.set(numericId, normalizedRecord)
    }
  })
  return Array.from(unique.values())
}

function buildOrgTreeOptions(records: OrgUnitRecord[]): TreeSelectOption[] {
  const nodes = new Map<number, TreeSelectOption & { children?: TreeSelectOption[] }>()
  const roots: TreeSelectOption[] = []

  records.forEach((record) => {
    nodes.set(record.id, {
      label: record.name,
      key: record.id,
      value: record.id,
      children: [],
    })
  })

  records.forEach((record) => {
    const node = nodes.get(record.id)
    if (!node) return
    const parentId = record.parent ?? null
    if (parentId != null && nodes.has(parentId)) {
      const parentNode = nodes.get(parentId)!
      parentNode.children = parentNode.children ?? []
      parentNode.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const compact = (options: TreeSelectOption[]) => {
    options.forEach((option) => {
      if (option.children && option.children.length) {
        compact(option.children)
      } else {
        delete option.children
      }
    })
  }

  compact(roots)
  return roots
}

/* Построение дерева исполнителей пока не используется (включим позже вместе с UI)
type PersonnelTreeNode = TreeSelectOption & {
  nodeType?: 'org' | 'person'
  orgRef?: number | null
  children?: PersonnelTreeNode[]
}

function buildPersonnelTreeOptions(
  orgRecords: OrgUnitRecord[],
  personnelRecords: PersonnelRecord[],
): TreeSelectOption[] {
  const orgNodes = new Map<number, PersonnelTreeNode>()
  const roots: PersonnelTreeNode[] = []

  orgRecords.forEach((org) => {
    orgNodes.set(org.id, {
      label: org.name,
      key: `org-${org.id}`,
      value: `org-${org.id}`,
      selectable: false,
      nodeType: 'org',
      orgRef: org.id,
      children: [],
    })
  })

  orgRecords.forEach((org) => {
    const node = orgNodes.get(org.id)!
    if (org.parent != null && orgNodes.has(org.parent)) {
      orgNodes.get(org.parent)!.children!.push(node)
    } else {
      roots.push(node)
    }
  })

  personnelRecords.forEach((person) => {
    const label = person.namePosition
      ? `${person.fullName} (${person.namePosition})`
      : person.fullName
    const node: PersonnelTreeNode = {
      label,
      key: `person-${person.id}`,
      value: person.id,
      nodeType: 'person',
      orgRef: typeof person.objLocation === 'number' ? person.objLocation : null,
    }
    const parent =
      typeof person.objLocation === 'number' ? orgNodes.get(person.objLocation) : null
    if (parent) {
      parent.children = parent.children ?? []
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return compactPersonnelTree(roots)
}

function compactPersonnelTree(nodes: PersonnelTreeNode[]): PersonnelTreeNode[] {
  return nodes
    .map((node) => {
      const next: PersonnelTreeNode = { ...node }
      if (node.children?.length) {
        const children = compactPersonnelTree(node.children)
        if (children.length) {
          next.children = children
        } else {
          delete next.children
        }
      } else {
        delete next.children
      }
      return next
    })
    .filter((node) => (node.nodeType === 'org' ? Boolean(node.children?.length) : true))
}

function filterPersonnelTree(options: TreeSelectOption[], allowedOrgIds: Set<number>) {
  const traverse = (nodes: PersonnelTreeNode[]): PersonnelTreeNode[] => {
    const result: PersonnelTreeNode[] = []
    nodes.forEach((node) => {
      if (node.nodeType === 'person') {
        if (node.orgRef == null || allowedOrgIds.has(node.orgRef)) {
          result.push({ ...node, children: undefined })
        }
        return
      }
      const children = node.children ? traverse(node.children) : []
      if (children.length) {
        result.push({ ...node, children })
      }
    })
    return result
  }
  return traverse(options as PersonnelTreeNode[])
}
*/

function pickString(
  source: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  if (!source) return null
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
  }
  return null
}

function applyExecutorFromCurrentUser() {
  const person = currentUserPersonnel.value
  if (person) {
    generatorForm.fulNameUser = person.fullName ?? null
    generatorForm.nameUserPosition = person.namePosition ?? person.nameLocation ?? null
    generatorForm.UserPhone = person.UserPhone ?? null
    return
  }

  const userRecord = currentUser.value as Record<string, unknown> | null
  generatorForm.fulNameUser = pickString(userRecord, ['fullname', 'fullName', 'name'])
  generatorForm.nameUserPosition = pickString(userRecord, ['namePosition', 'position'])
  generatorForm.UserPhone = pickString(userRecord, ['UserPhone', 'phone', 'mobile'])
}

async function generateReportViaRpc(
  report: ReportTemplate,
  payload: Record<string, unknown>,
  format: ReportFormat = report.rpc?.previewFormat ?? report.rpc?.defaultFormat ?? 'pdf',
): Promise<ReportFileResult> {
  if (!report.rpc) {
    throw new Error('RPC-конфигурация для отчёта не найдена')
  }

  const mappedPayload = report.rpc.mapPayload ? report.rpc.mapPayload(payload, report) : payload
  const params = report.rpc.buildGenerateParams?.(mappedPayload, report) ?? [mappedPayload]
  const result = await reportRpc(report.rpc.generateMethod, params)
  const jobId = extractJobId(result)
  if (!jobId) {
    throw new Error('Report API не вернул идентификатор сформированного отчёта')
  }

  const loadParams = report.rpc.buildLoadParams?.({
    payload: mappedPayload,
    report,
    jobId,
    format,
  }) ?? {
    tml: report.rpc.tml,
    id: jobId,
    ...(format === 'pdf' ? { ext: 'pdf' } : {}),
  }

  const loadResult = await fetchReportFile(loadParams)
  const detectedFormat = format ?? detectReportFormat(loadResult)
  const normalizedBlob =
    detectedFormat === 'pdf'
      ? new Blob([loadResult.blob], { type: 'application/pdf' })
      : loadResult.blob

  return {
    blob: normalizedBlob,
    format: detectedFormat,
    fileName: loadResult.fileName ?? resolveReportFileName(report, detectedFormat),
    jobId,
    remoteUrl: loadResult.absoluteUrl,
  }
}

function extractJobId(result: unknown): string | null {
  if (typeof result === 'string') {
    return result
  }
  if (result && typeof result === 'object') {
    if ('id' in result && typeof (result as { id?: unknown }).id === 'string') {
      return (result as { id: string }).id
    }
    if ('result' in result && typeof (result as { result?: unknown }).result === 'string') {
      return (result as { result: string }).result
    }
  }
  return null
}

function detectReportFormat(meta: { contentType?: string; fileName?: string }): ReportFormat {
  const name = meta.fileName?.toLowerCase() ?? ''
  const type = meta.contentType?.toLowerCase() ?? ''
  if (name.endsWith('.pdf') || type.includes('pdf')) return 'pdf'
  if (name.endsWith('.xlsx') || type.includes('spreadsheet') || type.includes('excel')) {
    return 'xlsx'
  }
  return 'pdf'
}

async function handleGenerate() {
  if (!generator.report) return
  try {
    await generatorFormRef.value?.validate()
  } catch {
    return
  }

  generator.submitting = true
  const report = generator.report
  const payload = buildPayload(report)
  const orgUnitName = getOrgUnitName(generatorForm.orgUnitId)

  try {
    const file = await generateReportViaRpc(report, payload, 'pdf')
    await openPreview(report, file, payload, orgUnitName)
    message.success(t('nsi.reports.generate.success', {}, { default: 'Отчёт успешно сформирован' }))
    generator.open = false
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    generator.submitting = false
  }
}

async function openPreview(
  report: ReportTemplate,
  file: ReportFileResult,
  payload: Record<string, unknown>,
  orgUnitName?: string | null,
) {
  preview.report = report
  preview.payload = { ...payload }
  preview.jobId = file.jobId ?? null
  preview.remoteUrl = file.remoteUrl ?? null
  const payloadOrgUnit = toNumericId(
    (payload.objLocation as number | string | null | undefined) ?? null,
  )
  preview.orgUnitName = orgUnitName || getOrgUnitName(payloadOrgUnit)
  preview.open = true
  await applyPreviewFile(file)
}

async function applyPreviewFile(file: ReportFileResult) {
  releasePreviewUrl()
  preview.format = file.format
  preview.fileName = resolveReportFileName(preview.report, file.format, file.fileName)
  const normalizedBlob =
    file.format === 'pdf' && file.blob.type !== 'application/pdf'
      ? new Blob([file.blob], { type: 'application/pdf' })
      : file.blob
  preview.blob = normalizedBlob

  if (file.format === 'pdf') {
    preview.url = URL.createObjectURL(normalizedBlob)
    return
  }

  preview.url = ''
}

async function refreshPreview() {
  if (!preview.report) return
  preview.loading = true
  try {
    const file = await generateReportViaRpc(preview.report, preview.payload, 'pdf')
    preview.jobId = file.jobId ?? preview.jobId
    preview.remoteUrl = file.remoteUrl ?? preview.remoteUrl
    await applyPreviewFile(file)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    preview.loading = false
  }
}

async function downloadExcel() {
  if (!preview.report) return
  excelExportLoading.value = true
  try {
    const file = await generateReportViaRpc(preview.report, preview.payload, 'xlsx')
    const fileName = resolveReportFileName(preview.report, 'xlsx', file.fileName)
    await saveBlobToDisk(file.blob, fileName)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    if (error instanceof Error && error.message === 'user-abort') return
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    excelExportLoading.value = false
  }
}

function releasePreviewUrl() {
  if (preview.url && preview.url.startsWith('blob:')) {
    URL.revokeObjectURL(preview.url)
  }
  preview.url = ''
}

watch(
  () => preview.open,
  (open) => {
    if (!open) {
      releasePreviewUrl()
      preview.report = null
      preview.payload = {}
      preview.jobId = null
      preview.remoteUrl = null
      preview.blob = null
      preview.fileName = ''
      preview.format = 'pdf'
      preview.orgUnitName = ''
      stopModalResize()
    }
  },
)

onMounted(() => {
  void loadReportsFromRepo()
  void loadPeriodTypes()
  if (typeof window === 'undefined') return
  syncModalBounds()
  window.addEventListener('resize', syncModalBounds)
})

onBeforeUnmount(() => {
  releasePreviewUrl()
  stopModalResize()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', syncModalBounds)
  }
})

function openEdit(report: ReportTemplate) {
  editDialog.mode = 'edit'
  editDialog.reportId = report.id
  editDialog.form.index = report.index
  editDialog.form.name = report.name
  editDialog.form.periodTypeId = report.periodTypeId ?? null
  editDialog.open = true
  editFormRef.value?.restoreValidation()
  void loadPeriodTypes()
}

async function handleEditSave() {
  try {
    await editFormRef.value?.validate()
  } catch {
    return
  }

  editDialog.submitting = true
  try {
    const payload = {
      index: editDialog.form.index.trim(),
      name: editDialog.form.name.trim(),
      periodTypeId: editDialog.form.periodTypeId ?? null,
    }

    if (editDialog.mode === 'create') {
      const newReport: ReportTemplate = {
        id: createReportId(),
        index: payload.index,
        name: payload.name,
        periodTypeId: payload.periodTypeId,
        description: '',
        rpc: BASE_REPORT_RPC,
      }
      reports.value = [...reports.value, newReport]
      message.success(
        t('nsi.reports.create.success', {}, { default: 'Отчёт добавлен в справочник' }),
      )
    } else {
      if (!editDialog.reportId) return
      const target = reports.value.find((item) => item.id === editDialog.reportId)
      if (!target) return
      target.index = payload.index
      target.name = payload.name
      target.periodTypeId = payload.periodTypeId
      message.success(t('common.saved', {}, { default: 'Изменения сохранены' }))
    }

    await persistReportsToRepo()
    editDialog.open = false
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    editDialog.submitting = false
  }
}

function createReportId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `report-${Date.now()}`
}

function confirmDelete(report: ReportTemplate) {
  const d = dialog.warning({
    title: t('nsi.reports.actions.remove', {}, { default: 'Удалить отчёт?' }),
    content: t(
      'nsi.reports.actions.removeConfirm',
      { name: report.name },
      { default: `Отчёт «${report.name}» будет удалён из справочника.` },
    ),
    positiveText: t('common.delete', {}, { default: 'Удалить' }),
    negativeText: t('common.cancel', {}, { default: 'Отмена' }),
    onPositiveClick: async () => {
      deletingId.value = report.id
      reports.value = reports.value.filter((item) => item.id !== report.id)
      await persistReportsToRepo()
      deletingId.value = null
      message.success(t('nsi.reports.actions.removeSuccess', {}, { default: 'Отчёт удалён' }))
    },
  })
  return d
}

function ensureFileName(name: string, format: ReportFormat) {
  const lower = name.toLowerCase()
  if (lower.endsWith(`.${format}`)) {
    return name
  }
  return `${name}.${format}`
}

function resolveReportFileName(
  report: ReportTemplate | null,
  format: ReportFormat,
  provided?: string | null,
) {
  if (provided && provided.trim()) {
    return ensureFileName(provided.trim(), format)
  }
  if (report?.rpc?.tml) {
    return ensureFileName(report.rpc.tml, format)
  }
  if (report?.index) {
    return ensureFileName(report.index, format)
  }
  if (report?.name) {
    return `${slugify(report.name)}.${format}`
  }
  return `report.${format}`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function saveBlobToDisk(blob: Blob, defaultName: string) {
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as WindowWithFilePicker).showSaveFilePicker({
        suggestedName: defaultName,
        types: [
          {
            description: 'Excel Workbook',
            accept: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('user-abort')
      }
      throw error
    }
  }
  downloadBlob(blob, defaultName)
}

const resizeState = reactive({
  active: false,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
})

function startModalResize(event: MouseEvent) {
  if (typeof window === 'undefined') return
  event.preventDefault()
  resizeState.active = true
  resizeState.startX = event.clientX
  resizeState.startY = event.clientY
  resizeState.startWidth = modalSize.width
  resizeState.startHeight = modalSize.height
  window.addEventListener('mousemove', handleModalResize)
  window.addEventListener('mouseup', stopModalResize)
}

function handleModalResize(event: MouseEvent) {
  if (!resizeState.active) return
  const maxWidth = typeof window === 'undefined' ? modalSize.width : window.innerWidth - 32
  const maxHeight = typeof window === 'undefined' ? modalSize.height : window.innerHeight - 120
  modalSize.width = clamp(
    resizeState.startWidth + (event.clientX - resizeState.startX),
    MODAL_MIN_WIDTH,
    maxWidth,
  )
  modalSize.height = clamp(
    resizeState.startHeight + (event.clientY - resizeState.startY),
    MODAL_MIN_HEIGHT,
    maxHeight,
  )
}

function stopModalResize() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', handleModalResize)
    window.removeEventListener('mouseup', stopModalResize)
  }
  resizeState.active = false
}

function syncModalBounds() {
  if (typeof window === 'undefined') return
  modalSize.width = clamp(modalSize.width, MODAL_MIN_WIDTH, window.innerWidth - 32)
  modalSize.height = clamp(modalSize.height, MODAL_MIN_HEIGHT, window.innerHeight - 120)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

type WindowWithFilePicker = Window &
  typeof globalThis & {
    showSaveFilePicker?: (options: ExcelSavePickerOptions) => Promise<FileSystemFileHandle>
  }

type ExcelSavePickerOptions = {
  suggestedName?: string
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}

type FileSystemFileHandle = {
  createWritable: () => Promise<FileSystemWritableFileStream>
}

type FileSystemWritableFileStream = {
  write: (data: Blob) => Promise<void>
  close: () => Promise<void>
}

const ActionsRenderer = defineComponent({
  name: 'ReportsActionsRenderer',
  props: {
    row: {
      type: Object as PropType<ReportRow>,
      required: true,
    },
  },
  setup(props) {
    return () => renderActionsCell(props.row)
  },
})
</script>

<style scoped>
.reports-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.subtext {
  font-size: 14px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
}

.toolbar__controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.toolbar__search {
  width: clamp(200px, 22vw, 320px);
}

.table-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:deep(.n-data-table .n-data-table-table) {
  border-collapse: separate;
  border-spacing: 0 12px;
}

:deep(.n-data-table .n-data-table-tbody .n-data-table-tr) {
  background: var(--n-card-color, var(--s360-bg));
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
}

:deep(.n-data-table .n-data-table-td) {
  border-bottom: none;
  padding: 12px;
  vertical-align: middle;
}

:deep(.n-data-table .n-data-table-tr:hover) .table-actions {
  opacity: 1;
}

.index-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--s360-chip-bg, rgba(0, 0, 0, 0.06));
  font-weight: 600;
}

.name-cell__title {
  font-weight: 600;
  margin-bottom: 6px;
}

.period-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--s360-chip-bg, rgba(0, 0, 0, 0.06));
  font-size: 12px;
  font-weight: 500;
  color: var(--s360-color-text, rgba(0, 0, 0, 0.8));
}


.table-actions {
  display: inline-flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.actions-column :deep(.n-data-table-th__title),
.actions-column :deep(.n-data-table-td__content) {
  justify-content: center;
}

.list-info {
  font-size: 13px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
  padding-left: 4px;
}

.cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.card {
  border: 1px solid var(--s360-border, rgba(0, 0, 0, 0.08));
  border-radius: 14px;
  padding: 12px;
  background: var(--s360-bg, #fff);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card__title {
  font-weight: 600;
  margin: 0;
}

.card__description {
  margin: 0;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.7));
  font-size: 14px;
}

.card__grid {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 6px 10px;
  margin: 0;
}

.card__grid dt {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.card__grid dd {
  margin: 0;
  font-weight: 500;
}

.card__actions {
  display: flex;
  justify-content: flex-end;
}

.card .table-actions {
  opacity: 1;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
}

.pagination-total {
  font-size: 13px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
}

.modal-subtitle {
  font-size: 13px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
}

.modal-description {
  font-size: 14px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.7));
  margin-bottom: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.preview-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.preview-body {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 520px;
}

.preview-frame {
  border: 1px solid var(--s360-border, rgba(0, 0, 0, 0.08));
  border-radius: 12px;
  overflow: auto;
  flex: 1;
  min-height: 520px;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  min-height: 520px;
}

.modal-resize-handle {
  position: absolute;
  width: 16px;
  height: 16px;
  right: 8px;
  bottom: 8px;
  border: none;
  background: transparent;
  cursor: nwse-resize;
  padding: 0;
}

.modal-resize-handle::after {
  content: '';
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 12px;
  height: 12px;
  border-right: 2px solid rgba(0, 0, 0, 0.2);
  border-bottom: 2px solid rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

.preview-meta__title {
  font-weight: 600;
}

.preview-meta__subtitle {
  font-size: 13px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.7));
}

.field-hint {
  font-size: 12px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__controls {
    justify-content: stretch;
  }

  .toolbar__search {
    width: 100%;
  }

  .card__grid {
    grid-template-columns: 1fr;
  }
}
</style>
