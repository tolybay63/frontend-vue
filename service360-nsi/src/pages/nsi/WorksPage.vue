<!-- Файл: src/pages/nsi/WorksPage.vue
     Назначение: справочник технологических работ по содержанию и восстановлению объектов.
     Использование: подключается в маршрутизаторе по пути /nsi/works. -->
<template>
  <section class="works-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          {{ t('nsi.objectTypes.works.title', {}, { default: 'Справочник «Технологические работы»' }) }}
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            :aria-label="t('nsi.objectTypes.works.help', {}, { default: 'Справка о справочнике' })"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">
          {{ t('nsi.objectTypes.works.subtitle', {}, { default: 'Ведите перечень технологических работ обслуживаемых объектов: указывайте вид, тип объекта, источник и периодичность' }) }}
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="q"
          :placeholder="t('nsi.objectTypes.works.searchPlaceholder', {}, { default: 'Поиск…' })"
          clearable
          round
          class="toolbar__search"
        />
        <div class="toolbar__filters">
          <NSelect
            v-model:value="workTypeFilter"
            :options="workTypeOptions"
            multiple
            filterable
            :placeholder="t('nsi.objectTypes.works.filter.workType', {}, { default: 'Вид работы' })"
            clearable
            size="small"
            class="toolbar__select"
          />
          <NSelect
            v-model:value="objectTypeFilter"
            :options="objectTypeOptions"
            multiple
            filterable
            :placeholder="t('nsi.objectTypes.works.filter.objectType', {}, { default: 'Тип объекта' })"
            clearable
            size="small"
            class="toolbar__select"
          />
          <NSelect
            v-model:value="sourceFilter"
            :options="sourceOptions"
            multiple
            filterable
            :placeholder="t('nsi.objectTypes.works.filter.source', {}, { default: 'Источник' })"
            clearable
            size="small"
            class="toolbar__select"
          />
          <NSelect
            v-model:value="periodTypeFilter"
            :options="periodTypeOptions"
            multiple
            filterable
            :placeholder="t('nsi.objectTypes.works.filter.period', {}, { default: 'Периодичность' })"
            clearable
            size="small"
            class="toolbar__select"
          />
        </div>
        <NSelect
          v-if="isMobile"
          v-model:value="sortOrder"
          :options="sortOptions"
          size="small"
          class="toolbar__select"
          :aria-label="t('nsi.objectTypes.works.sortAria', {}, { default: 'Порядок сортировки' })"
        />
        <NButton type="primary" @click="openCreate">+ {{ t('nsi.objectTypes.works.add', {}, { default: 'Добавить работу' }) }}</NButton>
      </div>
    </NCard>

    <div class="table-area">
      <NDataTable
        v-if="!isMobile"
        class="s360-cards table-full table-stretch"
        :columns="columns"
        :data="rows"
        :loading="tableLoading"
        :row-key="rowKey"
        :bordered="false"
      />

      <div v-else class="cards" role="list">
        <div class="list-info">
          {{ t('nsi.objectTypes.works.listInfo', { shown: visibleCount, total }, { default: 'Показано: ' + visibleCount + ' из ' + total }) }}
        </div>
        <article
          v-for="item in rows"
          :key="item.id"
          class="card"
          role="group"
          :aria-label="primaryTitle(item)"
        >
          <header class="card__header">
            <div class="card__title" role="heading" aria-level="4">
              <FieldRenderer v-if="primaryField" :field="primaryField" :row="item" />
              <span v-else class="card__title-text">{{ item.name }}</span>
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
        <NButton tertiary @click="showMore" :loading="tableLoading">{{ t('nsi.objectTypes.works.showMore', {}, { default: 'Показать ещё' }) }}</NButton>
      </div>

      <div class="pagination-bar" v-if="!isMobile">
        <NPagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :item-count="total"
          show-size-picker
          show-quick-jumper
          :aria-label="t('nsi.objectTypes.works.paginationAria', {}, { default: 'Постраничная навигация по технологическим работам' })"
        >
          <template #prefix>
            <span class="pagination-total">{{ t('nsi.objectTypes.works.total', { total }, { default: 'Всего: ' + total }) }}</span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="dialogOpen"
      preset="card"
      :title="dialogTitle"
      style="width: min(620px, 96vw)"
    >
      <NForm :model="workForm" label-width="180px" class="work-form">
        <NFormItem
          :label="t('nsi.objectTypes.works.form.name.label', {}, { default: 'Наименование' })"
          :feedback="workFormErrors.name ?? undefined"
          :validation-status="workFormErrors.name ? 'error' : undefined"
        >
          <NInput v-model:value="workForm.name" :placeholder="t('nsi.objectTypes.works.form.name.placeholder', {}, { default: 'Введите наименование' })" />
        </NFormItem>

        <NFormItem
          :label="t('nsi.objectTypes.works.form.objectType.label', {}, { default: 'Тип объекта' })"
          :feedback="workFormErrors.objectTypeId ?? undefined"
          :validation-status="workFormErrors.objectTypeId ? 'error' : undefined"
        >
          <NSelect
            v-model:value="selectedObjectTypeIds"
            multiple
            :options="relationSelectOptions"
            :placeholder="t('nsi.objectTypes.works.form.objectType.placeholder', {}, { default: 'Выберите тип объекта' })"
            :disabled="objectTypeSelectLoading"
            filterable
            clearable
            :loading="objectTypeSelectLoading"
            :max-tag-count="3"
            style="width: 100%"
            @focus="() => loadWorkObjectTypesForForm(isEditMode ? editingRow?.id ?? null : null)"
          />
          <p v-if="!objectTypeSelectLoading && !relationSelectOptions.length" class="text-small">
            {{ t('nsi.objectTypes.works.form.objectType.empty', {}, { default: 'Для работы пока нет доступных типов объектов.' }) }}
          </p>
        </NFormItem>

        <NFormItem
          :label="t('nsi.objectTypes.works.form.workType.label', {}, { default: 'Вид работы' })"
          :feedback="workFormErrors.workTypeId ?? undefined"
          :validation-status="workFormErrors.workTypeId ? 'error' : undefined"
        >
          <NSelect
            v-model:value="workForm.workTypeId"
            :options="workTypeOptions"
            :placeholder="t('nsi.objectTypes.works.form.workType.placeholder', {}, { default: 'Выберите вид работы' })"
            filterable
          />
        </NFormItem>

        <NFormItem
          :label="t('nsi.objectTypes.works.form.source.label', {}, { default: 'Источник' })"
          :feedback="workFormErrors.sourceId ?? undefined"
          :validation-status="workFormErrors.sourceId ? 'error' : undefined"
        >
          <CreatableSelect
            :value="workForm.sourceId"
            :options="sourceFormOptions"
            :loading="sourceOptionsLoading"
            :multiple="false"
            :placeholder="t('nsi.objectTypes.works.form.source.placeholder', {}, { default: 'Выберите источник данных' })"
            @update:value="(v) => (workForm.sourceId = typeof v === 'string' ? v : null)"
          />
        </NFormItem>

        <NFormItem
          :label="t('nsi.objectTypes.works.form.sourceNumber.label', {}, { default: 'Номер в источнике' })"
          :feedback="workFormErrors.sourceNumber ?? undefined"
          :validation-status="workFormErrors.sourceNumber ? 'error' : undefined"
        >
          <NInput v-model:value="workForm.sourceNumber" :placeholder="t('nsi.objectTypes.works.form.sourceNumber.placeholder', {}, { default: 'Например, 99' })" />
        </NFormItem>

        <NFormItem
          :label="t('nsi.objectTypes.works.form.periodType.label', {}, { default: 'Тип периода' })"
          :feedback="workFormErrors.periodTypeId ?? undefined"
          :validation-status="workFormErrors.periodTypeId ? 'error' : undefined"
        >
          <NSelect
            v-model:value="workForm.periodTypeId"
            :options="periodTypeFormOptions"
            :placeholder="t('nsi.objectTypes.works.form.periodType.placeholder', {}, { default: 'Выберите тип периода' })"
            filterable
          />
        </NFormItem>

        <NFormItem
          :label="t('nsi.objectTypes.works.form.periodicity.label', {}, { default: 'Число повторений' })"
          :feedback="workFormErrors.periodicity ?? undefined"
          :validation-status="workFormErrors.periodicity ? 'error' : undefined"
        >
          <NInputNumber v-model:value="workForm.periodicity" :min="1" :placeholder="t('nsi.objectTypes.works.form.periodicity.placeholder', {}, { default: '1' })" />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="dialogOpen = false" :disabled="savingWork">{{ t('nsi.objectTypes.works.actions.cancel', {}, { default: 'Отмена' }) }}</NButton>
          <NButton type="primary" class="btn-primary" :loading="savingWork" @click="saveWork">
            {{ isEditMode ? t('nsi.objectTypes.works.actions.save', {}, { default: 'Сохранить' }) : t('nsi.objectTypes.works.actions.create', {}, { default: 'Создать' }) }}
          </NButton>
        </div>
      </template>
    </NModal>

    <NModal v-model:show="infoOpen" preset="card" :title="t('nsi.objectTypes.works.info.title', {}, { default: 'О справочнике работ' })" style="max-width: 520px">
      <p class="text-body">
        {{ t('nsi.objectTypes.works.info.p1', {}, { default: 'Справочник содержит технологические работы по содержанию и восстановлению обслуживаемых объектов.' }) }}
        {{ t('nsi.objectTypes.works.info.p2', {}, { default: 'В таблице указаны вид работы, тип объекта, источник регламента и периодичность выполнения.' }) }}
      </p>
      <template #footer>
        <div class="modal-footer">
          <NButton type="primary" @click="infoOpen = false">{{ t('nsi.objectTypes.works.info.ok', {}, { default: 'Понятно' }) }}</NButton>
        </div>
      </template>
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
  watchEffect,
  type PropType,
  type VNodeChild,
} from 'vue'
import { useI18n } from 'vue-i18n'
import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NSelect,
  NTag,
  NPopover,
  NTooltip,
  useDialog,
  useMessage,
} from 'naive-ui'
import { InformationCircleOutline, CreateOutline, TrashOutline } from '@vicons/ionicons5'
import { useRoute } from 'vue-router'

import { rpc } from '@shared/api'
import { extractRecords, normalizeText, toOptionalString } from '@shared/lib'
import { loadParameterSources } from '@entities/object-parameter'
import type { ParameterSourceOption } from '@entities/object-parameter'
import { CreatableSelect } from '@features/creatable-select'
import { fetchObjectTypesSnapshot } from '@entities/object-type'


const { t } = useI18n()
interface RawWorkTypeRecord {
  id?: number | string
  ID?: number | string
  name?: string
  NAME?: string
}

interface RawPeriodTypeRecord {
  id?: number | string
  ID?: number | string
  name?: string
  NAME?: string
  fv?: number | string
  FV?: number | string
  pv?: number | string
  PV?: number | string
}

interface RawObjectTypeRelationRecord {
  idrom1?: number | string
  idrom2?: number | string
  namerom2?: string
  NAMEROM2?: string
  idro?: number | string
  IDRO?: number | string
  id?: number | string
  ID?: number | string
  idr?: number | string
  IDR?: number | string
}

interface RawWorkRecord {
  obj?: number | string
  cls?: number | string
  name?: string
  fullName?: string
  nameCollections?: string
  NumberSource?: string | number
  pvCollections?: number | string
  idCollections?: number | string
  fvPeriodType?: number | string
  pvPeriodType?: number | string
  Periodicity?: number | string
  idPeriodType?: number | string
  idNumberSource?: number | string
  idPeriodicity?: number | string
  objCollections?: number | string
}

interface RawWorkObjectTypeRecord {
  id?: number | string
  ID?: number | string
  obj?: number | string
  OBJ?: number | string
  uch2?: number | string
  cls?: number | string
  CLS?: number | string
  cls2?: number | string
  name?: string
  NAME?: string
  checked?: number | string | boolean
  selected?: number | string | boolean
  actual?: number | string | boolean
  fact?: number | string | boolean
  exists?: number | string | boolean
  idro?: number | string
  IDRO?: number | string
  idr?: number | string
  IDR?: number | string
}

interface RawWorkRelationRecord {
  idro?: number | string
  IDRO?: number | string
  idrom1?: number | string
  IDROM1?: number | string
  idrom?: number | string
  IDROM?: number | string
  obj?: number | string
  OBJ?: number | string
  id?: number | string
  ID?: number | string
}

interface WorkTableRow {
  id: string
  name: string
  fullName: string | null
  workTypeId: string | null
  workTypeName: string | null
  objectTypeName: string | null
  objectTypeNames: string[]
  sourceId: string | null
  sourceName: string | null
  sourceNumber: string | null
  sourceObjId: string | null
  sourcePvId: string | null
  sourceRecordId: string | null
  numberSourceRecordId: string | null
  periodTypeId: string | null
  periodTypeName: string | null
  periodTypePvId: string | null
  periodTypeRecordId: string | null
  periodicityValue: number | null
  periodicityText: string
  periodicityRecordId: string | null
  cls: string | null
}

interface PaginationState {
  page: number
  pageSize: number
}

interface CardField {
  key: string
  label: string
  render: (row: WorkTableRow) => VNodeChild
  isPrimary?: boolean
  isActions?: boolean
}

interface WorkTypeOptionDetails {
  id: string
  label: string
}

interface SourceOptionDetails {
  id: string
  label: string
  objId: string
  pvId: string
}

interface PeriodTypeOptionDetails {
  id: string
  label: string
  fvId: string
  pvId: string | null
}

interface WorkObjectTypeOption {
  value: string
  cls: string
  label: string
  relationId?: string | null
}

interface WorkFormState {
  name: string
  workTypeId: string | null
  sourceId: string | null
  sourceNumber: string
  periodTypeId: string | null
  periodicity: number | null
}

interface WorkFormErrors {
  name: string | null
  objectTypeId: string | null
  workTypeId: string | null
  sourceId: string | null
  sourceNumber: string | null
  periodTypeId: string | null
  periodicity: string | null
}

interface ConfirmDialogOptions {
  title?: string
  content: string
  positiveText?: string
  negativeText?: string
  html?: boolean
}

const tableLoading = ref(false)
const q = ref('')
const infoOpen = ref(false)
const workTypeFilter = ref<string[]>([])
const objectTypeFilter = ref<string[]>([])
const sourceFilter = ref<string[]>([])
const periodTypeFilter = ref<string[]>([])

const workTypeOptions = ref<Array<{ label: string; value: string }>>([])
const objectTypeOptions = ref<Array<{ label: string; value: string }>>([])
const sourceOptions = ref<Array<{ label: string; value: string }>>([])
const sourceOptionsLoading = ref(false)
const sourceOptionsLoaded = ref(false)
let sourceOptionsRequestToken = 0
const periodTypeOptions = ref<Array<{ label: string; value: string }>>([])

const workTypeDirectory = new Map<string, WorkTypeOptionDetails>()
const sourceDirectory = new Map<string, SourceOptionDetails>()
const sourceDirectoryByPv = new Map<string, SourceOptionDetails>()
const periodTypeDirectory = new Map<string, PeriodTypeOptionDetails>()
const rawPeriodTypeRecords = new Map<string, RawPeriodTypeRecord>()
const objectTypeNameCache = new Map<string, string>()
let objectTypeNameCacheLoaded = false

async function ensureObjectTypeNameCache(): Promise<void> {
  if (objectTypeNameCacheLoaded) return
  try {
    const snap = await fetchObjectTypesSnapshot()
    for (const item of snap.items) {
      objectTypeNameCache.set(item.id, item.name)
    }
  } catch {
    // ignore network/cache errors, fallback will use raw ids
  } finally {
    objectTypeNameCacheLoaded = true
  }
}

const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })
const route = useRoute()

watch(
  () => route.query.q,
  (value) => {
    const text = Array.isArray(value)
      ? String(value[value.length - 1] ?? '')
      : typeof value === 'string'
        ? value
        : ''
    q.value = text
    pagination.page = 1
  },
  { immediate: true },
)
const works = ref<WorkTableRow[]>([])
const sortOrder = ref<'asc' | 'desc'>('asc')
const sortOptions = [
  { label: 'А-Я', value: 'asc' },
  { label: 'Я-А', value: 'desc' },
]

const removingWorkId = ref<string | null>(null)

const message = useMessage()
const discreteDialog = useDialog()

const confirmDialog = (options: ConfirmDialogOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    let resolved = false

    const finish = (result: boolean) => {
      if (resolved) return

      resolved = true

      resolve(result)
    }

    discreteDialog.warning({
      title: options.title ?? 'Подтверждение',
      content: options.html ? () => h('div', { innerHTML: options.content }) : options.content,
      positiveText: options.positiveText ?? 'Подтвердить',
      negativeText: options.negativeText ?? 'Отмена',
      maskClosable: false,

      onPositiveClick: () => {
        finish(true)
      },

      onNegativeClick: () => {
        finish(false)
      },

      onClose: () => {
        finish(false)
      },
    })
  })
}

const directories = {
  workTypes: new Map<string, string>(),
  objectTypes: new Map<string, string[]>(),
  sources: new Map<string, string>(),
  periodTypes: new Map<string, string>(),
}

function normalizeSourceDetails(option: SourceOptionDetails | null): SourceOptionDetails | null {
  if (!option) return null
  const label = String(option.label ?? '').trim()
  const objId = String(option.objId ?? option.id ?? '').trim()
  if (!label || !objId) return null
  const pvIdRaw = option.pvId ?? option.id ?? objId
  const pvId = String(pvIdRaw ?? '').trim() || objId

  return {
    id: String(option.id ?? objId),
    label,
    objId,
    pvId,
  }
}

function fromParameterSourceOption(option: ParameterSourceOption): SourceOptionDetails | null {
  if (!option) return null
  const objId = option.id != null ? String(option.id) : ''
  const pvId = option.pv != null ? String(option.pv) : ''
  const rawLabel = option.name ?? ''
  const label = rawLabel.trim() || rawLabel
  if (!objId || !pvId || !label) return null

  return {
    id: objId,
    label,
    objId,
    pvId,
  }
}

function mergeSourceDirectory(...batches: SourceOptionDetails[][]): void {
  const byObj = new Map<string, SourceOptionDetails>()
  const byPv = new Map<string, SourceOptionDetails>()

  for (const batch of batches) {
    for (const option of batch) {
      const normalized = normalizeSourceDetails(option)
      if (!normalized) continue
      byObj.set(normalized.objId, normalized)
      byPv.set(normalized.pvId, normalized)
    }
  }

  if (byObj.size === 0 && byPv.size === 0) return

  const sorted = Array.from(byObj.values()).sort((a, b) => a.label.localeCompare(b.label, 'ru'))

  sourceDirectory.clear()
  sourceDirectoryByPv.clear()
  directories.sources.clear()

  for (const detail of sorted) {
    sourceDirectory.set(detail.objId, detail)
    sourceDirectoryByPv.set(detail.pvId, detail)
    directories.sources.set(detail.objId, detail.label)
    directories.sources.set(detail.pvId, detail.label)
  }

  const baseOptions = sorted.map((detail) => ({ label: detail.label, value: detail.objId }))
  const seen = new Set(baseOptions.map((item) => item.value))
  const extras = sourceOptions.value.filter((option) => {
    const key = String(option.value ?? '')
    if (!key || seen.has(key)) return false
    return true
  })

  const combined = [...baseOptions]
  for (const option of extras) {
    const key = String(option.value ?? '')
    if (!key || seen.has(key)) continue
    const label = String(option.label ?? '').trim()
    if (!label) continue
    combined.push({ label, value: key })
    seen.add(key)
  }

  combined.sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'))
  sourceOptions.value = combined
}

async function loadSourceDirectory(force = false): Promise<void> {
  if (sourceOptionsLoading.value) return
  if (sourceOptionsLoaded.value && !force) return

  sourceOptionsLoading.value = true
  const requestToken = ++sourceOptionsRequestToken
  try {
    const response = await loadParameterSources()
    if (requestToken !== sourceOptionsRequestToken) return

    const updates: SourceOptionDetails[] = []
    for (const option of response) {
      const details = fromParameterSourceOption(option)
      if (details) updates.push(details)
    }

    mergeSourceDirectory(Array.from(sourceDirectory.values()), updates)
    sourceOptionsLoaded.value = sourceDirectory.size > 0
  } catch (error) {
    if (requestToken !== sourceOptionsRequestToken) return
    console.error(error)
    message.error('Не удалось загрузить источники')
  } finally {
    if (requestToken === sourceOptionsRequestToken) {
      sourceOptionsLoading.value = false
    }
  }
}

const dialogOpen = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const savingWork = ref(false)
const objectTypeSelectLoading = ref(false)

const workForm = reactive<WorkFormState>({
  name: '',
  workTypeId: null,
  sourceId: null,
  sourceNumber: '',
  periodTypeId: null,
  periodicity: null,
})

const workFormErrors = reactive<WorkFormErrors>({
  name: null,
  objectTypeId: null,
  workTypeId: null,
  sourceId: null,
  sourceNumber: null,
  periodTypeId: null,
  periodicity: null,
})

const objectTypeSelectOptions = ref<WorkObjectTypeOption[]>([])
const objectTypeOptionsOwnerKey = ref<string | null>(null)
// Multi-select values
const selectedObjectTypeIds = ref<string[]>([])
// Snapshot at dialog open
const initialSelectedObjectTypeIds = ref<string[]>([])
const initialRelationIdByValue = ref<Map<string, string>>(new Map())
const editingRow = ref<WorkTableRow | null>(null)

const isEditMode = computed(() => dialogMode.value === 'edit')
const dialogTitle = computed(() => {
  return isEditMode.value ? 'Изменить работу' : 'Создать работу'
})

const sourceFormOptions = computed(() =>
  Array.from(sourceDirectory.values())
    .map((item) => ({ label: item.label, value: item.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
)

const periodTypeFormOptions = computed(() =>
  Array.from(periodTypeDirectory.values())
    .map((item) => ({ label: item.label, value: item.fvId }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
)

const relationSelectOptions = computed(() =>
  objectTypeSelectOptions.value.map((option) => ({ label: option.label, value: option.value })),
)

const isMobile = ref(false)
if (typeof window !== 'undefined') {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

let mediaQueryList: MediaQueryList | null = null
const handleMediaQueryChange = (event: MediaQueryList | MediaQueryListEvent) => {
  isMobile.value = 'matches' in event ? event.matches : false
}

const filteredRows = computed(() => {
  const search = normalizeText(q.value)

  return works.value.filter((item) => {
    if (workTypeFilter.value.length && !workTypeFilter.value.includes(item.workTypeId)) {
      return false
    }
    if (
      objectTypeFilter.value.length &&
      !objectTypeFilter.value.some((name) => item.objectTypeNames?.includes(name))
    ) {
      return false
    }
    if (sourceFilter.value.length && !sourceFilter.value.includes(item.sourceId)) {
      return false
    }
    if (
      periodTypeFilter.value.length &&
      !periodTypeFilter.value.includes(item.periodTypeId)
    ) {
      return false
    }

    if (search) {
      const inName = normalizeText(item.name).includes(search)
      const inFullName = normalizeText(item.fullName ?? '').includes(search)
      if (!inName && !inFullName) return false
    }

    return true
  })
})

const sortedRows = computed(() => {
  const base = [...filteredRows.value].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return sortOrder.value === 'desc' ? base.reverse() : base
})

const total = computed(() => sortedRows.value.length)
const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return sortedRows.value.slice(start, start + pagination.pageSize)
})
const mobileRows = computed(() => sortedRows.value.slice(0, pagination.page * pagination.pageSize))
const rows = computed(() => (isMobile.value ? mobileRows.value : paginatedRows.value))
const visibleCount = computed(() => rows.value.length)

const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize) || 1))

watch([q, workTypeFilter, objectTypeFilter, sourceFilter, periodTypeFilter], () => {
  pagination.page = 1
})

watch(
  () => pagination.pageSize,
  () => {
    pagination.page = 1
  },
)

watchEffect(() => {
  if (pagination.page > maxPage.value) {
    pagination.page = maxPage.value
  }
})

watch(
  () => dialogOpen.value,
  (open, previous) => {
    if (!open && previous) {
      resetDialogState()
    }
  },
)

watch(
  () => selectedObjectTypeIds.value,
  (values) => {
    if (values.length && workFormErrors.objectTypeId) {
      workFormErrors.objectTypeId = null
    }
  },
)

function showMore() {
  if (pagination.page < maxPage.value) pagination.page += 1
}

const renderName = (row: WorkTableRow): VNodeChild => {
  if (!row.fullName) {
    return h('span', { class: 'table-cell__primary' }, row.name)
  }

  return h(
    NTooltip,
    { placement: 'top' },
    {
      trigger: () => h('span', { class: 'table-cell__primary' }, row.name),
      default: () => row.fullName,
    },
  )
}

const renderSource = (row: WorkTableRow): VNodeChild => {
  if (!row.sourceName && !row.sourceNumber) return '—'

  const chip =
    row.sourceName != null
      ? h(
          NTag,
          {
            size: 'small',
            round: true,
            bordered: false,
            class: 'source-chip',
          },
          { default: () => row.sourceName },
        )
      : null

  const number = row.sourceNumber
    ? h('span', { class: 'source-number' }, `№ ${row.sourceNumber}`)
    : null

  if (!chip) return number ?? '—'
  if (!number) return chip

  return h('div', { class: 'source-cell' }, [chip, number])
}

const renderPeriodicity = (row: WorkTableRow): VNodeChild => row.periodicityText || '—'

const MAX_OBJECT_TYPE_CHIPS = 4

const renderObjectTypes = (row: WorkTableRow): VNodeChild => {
  const names = row.objectTypeNames ?? []
  if (!names.length) return '—'

  const chips = names.slice(0, MAX_OBJECT_TYPE_CHIPS)
  const rest = names.slice(MAX_OBJECT_TYPE_CHIPS)

  const chipNodes = chips.map((name, idx) =>
    h(
      NTag,
      { size: 'small', round: true, bordered: true, class: 'chip', key: `${row.id}-ot-${idx}` },
      { default: () => name },
    ),
  )

  if (!rest.length) return h('div', { class: 'cell-clamp' }, [h('div', { class: 'chips-row' }, chipNodes)])

  const more = h(
    NPopover,
    { trigger: 'hover' },
    {
      trigger: () => h(NTag, { size: 'small', round: true, class: 'chip chip--more' }, { default: () => `+${rest.length}` }),
      default: () => h('div', { class: 'popover-list' }, rest.map((name, i) => h('div', { class: 'popover-item', key: `${row.id}-ot-rest-${i}` }, name))),
    },
  )

  return h('div', { class: 'cell-clamp' }, [h('div', { class: 'chips-row' }, [...chipNodes, more])])
}

const renderActions = (row: WorkTableRow): VNodeChild =>
  h('div', { class: 'table-actions' }, [
    h(
      NButton,
      {
        quaternary: true,
        circle: true,
        size: 'small',
        onClick: () => editWork(row),
        disabled: removingWorkId.value === row.id,
        'aria-label': `Изменить работу ${row.name}`,
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
        onClick: () => removeWork(row),
        loading: removingWorkId.value === row.id,
        disabled: removingWorkId.value === row.id,
        'aria-label': `Удалить работу ${row.name}`,
      },
      { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
    ),
  ])

const columns: DataTableColumns<WorkTableRow> = [
  {
    title: 'Работа',
    key: 'name',
    className: 'col-name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    width: 240,
    render: renderName,
  },
  {
    title: 'Вид работы',
    key: 'workTypeName',
    render: (row) => row.workTypeName ?? '—',
  },
  {
    title: 'Тип объекта',
    key: 'objectTypeName',
    render: renderObjectTypes,
  },
  {
    title: 'Источник и номер',
    key: 'sourceName',
    render: renderSource,
  },
  {
    title: 'Периодичность',
    key: 'periodicityText',
    render: renderPeriodicity,
  },
  {
    title: 'Действия',
    key: 'actions',
    className: 'col-actions',
    render: renderActions,
  },
]

const rowKey = (row: WorkTableRow) => row.id

const cardFields = computed<CardField[]>(() => [
  {
    key: 'name',
    label: 'Работа',
    render: renderName,
    isPrimary: true,
  },
  {
    key: 'workTypeName',
    label: 'Вид работы',
    render: (row) => row.workTypeName ?? '—',
  },
  {
    key: 'objectTypeName',
    label: 'Тип объекта',
    render: renderObjectTypes,
  },
  {
    key: 'sourceName',
    label: 'Источник и номер',
    render: renderSource,
  },
  {
    key: 'periodicityText',
    label: 'Периодичность',
    render: renderPeriodicity,
  },
  {
    key: 'actions',
    label: 'Действия',
    render: renderActions,
    isActions: true,
  },
])

const primaryField = computed(
  () => cardFields.value.find((field) => field.isPrimary) ?? cardFields.value[0],
)
const actionsField = computed(() => cardFields.value.find((field) => field.isActions))
const infoFields = computed(() =>
  cardFields.value.filter((field) => !field.isPrimary && !field.isActions),
)

const primaryTitle = (row: WorkTableRow) => row.name || ''

const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: { type: Object as PropType<CardField>, required: true },
    row: { type: Object as PropType<WorkTableRow>, required: true },
  },
  setup(props) {
    return () => props.field.render(props.row)
  },
})

const ActionsRenderer = defineComponent({
  name: 'ActionsRenderer',
  props: {
    row: { type: Object as PropType<WorkTableRow>, required: true },
  },
  setup(props) {
    return () => renderActions(props.row)
  },
})

const toFiniteNumber = (value: string | null | undefined): number | null => {
  if (!value) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const isTruthyFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase()
    return Boolean(trimmed && trimmed !== '0' && trimmed !== 'false' && trimmed !== 'нет')
  }
  return false
}

function clearFormErrors() {
  workFormErrors.name = null
  workFormErrors.objectTypeId = null
  workFormErrors.workTypeId = null
  workFormErrors.sourceId = null
  workFormErrors.sourceNumber = null
  workFormErrors.periodTypeId = null
  workFormErrors.periodicity = null
}

function resetDialogState() {
  workForm.name = ''
  workForm.workTypeId = null
  workForm.sourceId = null
  workForm.sourceNumber = ''
  workForm.periodTypeId = null
  workForm.periodicity = null
  clearFormErrors()
  objectTypeSelectOptions.value = []
  objectTypeOptionsOwnerKey.value = null
  selectedObjectTypeIds.value = []
  initialSelectedObjectTypeIds.value = []
  initialRelationIdByValue.value = new Map()
  editingRow.value = null
}

function getSourceDetails(id: string | null): SourceOptionDetails | null {
  if (!id) return null
  return sourceDirectory.get(id) ?? sourceDirectoryByPv.get(id) ?? null
}

function getPeriodTypeDetails(id: string | null): PeriodTypeOptionDetails | null {
  if (!id) return null
  return periodTypeDirectory.get(id) ?? null
}

function composeWorkFullName(name: string, numberSource: string, sourceName: string | null): string {
  const base = name.trim()
  const number = numberSource.trim()
  const source = sourceName?.trim() ?? ''
  if (base && number && source) {
    return `${base} [тк № ${number} / ${source}]`
  }
  return base
}

function validateWorkForm(): boolean {
  clearFormErrors()
  let valid = true

  if (!workForm.name.trim()) {
    workFormErrors.name = 'Укажите наименование работы'
    valid = false
  }

  if (!selectedObjectTypeIds.value.length) {
    workFormErrors.objectTypeId = 'Выберите тип объекта'
    valid = false
  }

  if (!workForm.workTypeId || !workTypeDirectory.has(workForm.workTypeId)) {
    workFormErrors.workTypeId = 'Выберите вид работы'
    valid = false
  }

  const sourceDetails = getSourceDetails(workForm.sourceId)
  if (!sourceDetails) {
    workFormErrors.sourceId = 'Укажите источник'
    valid = false
  }

  if (!workForm.sourceNumber.trim()) {
    workFormErrors.sourceNumber = 'Заполните номер в источнике'
    valid = false
  }

  const periodTypeDetails = getPeriodTypeDetails(workForm.periodTypeId)
  if (!periodTypeDetails) {
    workFormErrors.periodTypeId = 'Выберите тип периода'
    valid = false
  }

  if (workForm.periodicity == null || Number.isNaN(workForm.periodicity)) {
    workFormErrors.periodicity = 'Укажите число повторений'
    valid = false
  } else if (workForm.periodicity <= 0) {
    workFormErrors.periodicity = 'Значение должно быть больше нуля'
    valid = false
  }

  return valid
}

function applyRowToForm(row: WorkTableRow) {
  workForm.name = row.name
  workForm.workTypeId = row.workTypeId
  workForm.sourceId = row.sourceObjId ?? row.sourcePvId ?? row.sourceId
  workForm.sourceNumber = row.sourceNumber ?? ''
  workForm.periodTypeId = row.periodTypeId
  workForm.periodicity = row.periodicityValue ?? null
}

async function loadWorkObjectTypesForForm(workId: string | null, options: { force?: boolean } = {}) {
  const { force = false } = options
  const ownerKey = workId ?? '__new__'

  if (!force && objectTypeOptionsOwnerKey.value === ownerKey && objectTypeSelectOptions.value.length > 0) {
    return
  }

  if (objectTypeSelectLoading.value) return

  objectTypeSelectLoading.value = true
  initialRelationIdByValue.value = new Map()
  selectedObjectTypeIds.value = []
  initialSelectedObjectTypeIds.value = []

  try {
    const numericId = workId != null ? Number(workId) : NaN
    const ownerParam = workId == null ? 0 : Number.isFinite(numericId) ? numericId : workId
    const [response, relPayload] = await Promise.all([
      rpc('data/loadUch2', ['RT_Works', ownerParam, 'Typ_ObjectTyp']),
      rpc('data/loadComponentsObject2', ['RT_Works', 'Typ_Work', 'Typ_ObjectTyp']),
    ])
    const records = extractRecords<RawWorkObjectTypeRecord>(response)
    const relRecords = extractRecords<RawObjectTypeRelationRecord>(relPayload)

    // Словарь id типа объекта -> человекочитаемое имя из namerom2
    const relNameByTypeId = new Map<string, string>()
    for (const rel of relRecords) {
      const tId = toOptionalString(rel.idrom2)
      const tName = toOptionalString(rel.namerom2 ?? rel.NAMEROM2)
      if (tId && tName) relNameByTypeId.set(tId, tName)
    }

    // Подгрузим кэш наименований типов объектов для случаев,
    // когда в ответе отсутствует поле name/NAME
    await ensureObjectTypeNameCache().catch(() => {})

    const options: WorkObjectTypeOption[] = []
    const defaults: string[] = []

    for (const record of records) {
      const value =
        toOptionalString(record.uch2 ?? record.obj ?? record.ID ?? record.id ?? record.OBJ ?? record.IDR) ?? null
      const cls = toOptionalString(record.cls2 ?? record.cls ?? record.CLS)
      let label = relNameByTypeId.get(value) ?? toOptionalString(record.name ?? record.NAME)
      if (!value || !cls || !label) continue
      // Если всё ещё осталось число — пробуем кэш типов
      if (!label || /^\d+$/.test(label)) {
        const cached = objectTypeNameCache.get(value)
        if (cached) label = cached
      }
      const relationId =
        toOptionalString(record.idro ?? record.IDRO ?? record.idr ?? record.IDR ?? record.id) ?? null
      const option: WorkObjectTypeOption = { value, cls, label, relationId }
      options.push(option)

      const isSelected = isTruthyFlag(record.checked ?? record.selected ?? record.actual ?? record.fact ?? record.exists)
      if (isSelected) {
        defaults.push(option.value)
        if (relationId) initialRelationIdByValue.value.set(option.value, relationId)
      }
    }

    options.sort((a, b) => a.label.localeCompare(b.label, 'ru'))
    objectTypeSelectOptions.value = options
    objectTypeOptionsOwnerKey.value = ownerKey

    // Дополнительно сверяемся с relRecords: берём связи и relationId даже если сервер проставил флаги
    if (workId != null) {
      const ownerStr = toOptionalString(workId)
      for (const rel of relRecords) {
        const id1 = toOptionalString(rel.idrom1)
        if (id1 !== ownerStr) continue
        const related = toOptionalString(rel.idrom2)
        if (!related) continue
        const relationId =
          toOptionalString(rel.idro ?? rel.IDRO ?? rel.id ?? rel.ID ?? rel.idr ?? rel.IDR) ?? null
        if (!defaults.includes(related)) defaults.push(related)
        if (relationId) {
          initialRelationIdByValue.value.set(related, relationId)
        }
        const existingOption = options.find((o) => o.value === related)
        if (existingOption) {
          if (!existingOption.relationId && relationId) {
            existingOption.relationId = relationId
          }
        } else {
          const name = relNameByTypeId.get(related) ?? related
          options.push({ value: related, cls: 'Typ_ObjectTyp', label: name, relationId })
        }
      }
    }

    if (defaults.length) {
      selectedObjectTypeIds.value = [...defaults]
      initialSelectedObjectTypeIds.value = [...defaults]
    } else if (options.length === 1) {
      const only = options[0]
      selectedObjectTypeIds.value = [only.value]
      initialSelectedObjectTypeIds.value = [only.value]
    }
  } catch (error) {
    console.error(error)
    objectTypeSelectOptions.value = []
    objectTypeOptionsOwnerKey.value = null
    selectedObjectTypeIds.value = []
    initialSelectedObjectTypeIds.value = []
    initialRelationIdByValue.value = new Map()
    message.error('Не удалось загрузить типы объектов для работы')
  } finally {
    objectTypeSelectLoading.value = false
  }
}

function openCreate() {
  resetDialogState()
  dialogMode.value = 'create'
  dialogOpen.value = true
  void loadSourceDirectory(!sourceOptionsLoaded.value)
  void loadWorkObjectTypesForForm(null)
}

function editWork(row: WorkTableRow) {
  resetDialogState()
  dialogMode.value = 'edit'
  editingRow.value = row
  applyRowToForm(row)
  dialogOpen.value = true
  void loadSourceDirectory(true)
  void loadWorkObjectTypesForForm(row.id)
}

async function removeWork(row: WorkTableRow) {
  if (removingWorkId.value) return

  const obj = toFiniteNumber(row.id)
  if (obj == null) {
    message.error('Некорректный идентификатор работы')
    return
  }

  const confirmed = await confirmDialog({
    title: 'Подтверждение',
    content: 'Удалить работу и все её связи с типами объектов?',
    positiveText: 'Удалить',
    negativeText: 'Отмена',
  })
  if (!confirmed) return

  removingWorkId.value = row.id

  try {
    const relationsResponse = await rpc('data/loadComponentsObject2', [
      'RT_Works',
      'Typ_Work',
      'Typ_ObjectTyp',
    ])
    const relationRecords = extractRecords<RawWorkRelationRecord>(relationsResponse)

    const relationIds: number[] = []
    for (const record of relationRecords) {
      const ownerRaw = record.idrom1 ?? record.IDROM1 ?? record.idrom ?? record.IDROM ?? record.obj ?? record.OBJ
      const ownerId = toFiniteNumber(toOptionalString(ownerRaw))
      if (ownerId !== obj) continue

      const relationRaw = record.idro ?? record.IDRO ?? record.id ?? record.ID
      const relationId = toFiniteNumber(toOptionalString(relationRaw))
      if (relationId != null) {
        relationIds.push(relationId)
      }
    }

    for (const relationId of relationIds) {
      await rpc('data/deleteOwnerWithProperties', [relationId, 0])
    }

    await rpc('data/deleteOwnerWithProperties', [obj, 1])

    await loadWorks()
    message.success('Работа удалена')
  } catch (error) {
    console.error(error)
    message.error('Не удалось удалить работу')
  } finally {
    removingWorkId.value = null
  }
}

async function saveWork() {
  if (!validateWorkForm()) return

  if (isEditMode.value) {
    await updateWork()
  } else {
    await createWork()
  }
}

async function createWork() {
  const workTypeId = workForm.workTypeId
  const sourceDetails = getSourceDetails(workForm.sourceId)
  const periodTypeDetails = getPeriodTypeDetails(workForm.periodTypeId)
  if (!workTypeId || !sourceDetails || !periodTypeDetails) return
  if (!selectedObjectTypeIds.value.length) return

  const name = workForm.name.trim()
  const numberSource = workForm.sourceNumber.trim()
  const periodicity = workForm.periodicity ?? 0
  const fullName = composeWorkFullName(name, numberSource, sourceDetails.label)

  const payload: Record<string, unknown> = {
    accessLevel: 1,
    cls: toFiniteNumber(workTypeId) ?? workTypeId,
    name,
    fullName,
    objCollections: toFiniteNumber(sourceDetails.objId) ?? sourceDetails.objId,
    pvCollections: toFiniteNumber(sourceDetails.pvId) ?? sourceDetails.pvId,
    nameCollections: sourceDetails.label,
    NumberSource: numberSource,
    fvPeriodType: toFiniteNumber(periodTypeDetails.fvId) ?? periodTypeDetails.fvId,
    Periodicity: periodicity.toString(),
  }

  if (periodTypeDetails.pvId) {
    payload.pvPeriodType = toFiniteNumber(periodTypeDetails.pvId) ?? periodTypeDetails.pvId
  }

  savingWork.value = true
  try {
    const response = await rpc('data/saveProcessCharts', ['ins', payload])
    const records = extractRecords<RawWorkRecord>(response)
    const created = records[0]
    if (!created) throw new Error('Не удалось сохранить работу')

    const objId = toOptionalString(created.obj)
    const clsId = toOptionalString(created.cls ?? workTypeId)
    if (!objId || !clsId) throw new Error('Не удалось определить идентификаторы работы')

    await saveSelectedObjectTypes({ workId: objId, workCls: clsId, workName: name, createAll: true })
    await loadWorks()
    message.success('Работа создана')
    dialogOpen.value = false
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось сохранить работу')
  } finally {
    savingWork.value = false
  }
}

async function updateWork() {
  const row = editingRow.value
  if (!row) return

  const workTypeId = workForm.workTypeId
  const sourceDetails = getSourceDetails(workForm.sourceId)
  const periodTypeDetails = getPeriodTypeDetails(workForm.periodTypeId)
  if (!workTypeId || !sourceDetails || !periodTypeDetails) return

  const name = workForm.name.trim()
  const numberSource = workForm.sourceNumber.trim()
  const periodicity = workForm.periodicity ?? 0
  const fullName = composeWorkFullName(name, numberSource, sourceDetails.label)

  const payload: Record<string, unknown> = {
    accessLevel: 1,
    obj: toFiniteNumber(row.id) ?? row.id,
    cls: toFiniteNumber(workTypeId) ?? workTypeId,
    name,
    fullName,
    objCollections: toFiniteNumber(sourceDetails.objId) ?? sourceDetails.objId,
    pvCollections: toFiniteNumber(sourceDetails.pvId) ?? sourceDetails.pvId,
    nameCollections: sourceDetails.label,
    NumberSource: numberSource,
    fvPeriodType: toFiniteNumber(periodTypeDetails.fvId) ?? periodTypeDetails.fvId,
    Periodicity: periodicity.toString(),
  }

  const idCollections = toFiniteNumber(row.sourceRecordId)
  if (idCollections != null) payload.idCollections = idCollections

  const idNumberSource = toFiniteNumber(row.numberSourceRecordId)
  if (idNumberSource != null) payload.idNumberSource = idNumberSource

  const idPeriodType = toFiniteNumber(row.periodTypeRecordId)
  if (idPeriodType != null) payload.idPeriodType = idPeriodType

  if (row.periodTypePvId) {
    payload.pvPeriodType =
      toFiniteNumber(periodTypeDetails.pvId ?? row.periodTypePvId) ?? periodTypeDetails.pvId ?? row.periodTypePvId
  } else if (periodTypeDetails.pvId) {
    payload.pvPeriodType = toFiniteNumber(periodTypeDetails.pvId) ?? periodTypeDetails.pvId
  }

  const idPeriodicity = toFiniteNumber(row.periodicityRecordId)
  if (idPeriodicity != null) payload.idPeriodicity = idPeriodicity

  savingWork.value = true
  try {
    await rpc('data/saveProcessCharts', ['upd', payload])
    // Detect changes between initial and current selections
    const initialSet = new Set(initialSelectedObjectTypeIds.value)
    const currentSet = new Set(selectedObjectTypeIds.value)
    let changed = false
    if (initialSet.size !== currentSet.size) {
      changed = true
    } else {
      for (const v of currentSet) {
        if (!initialSet.has(v)) { changed = true; break }
      }
    }

    if (changed) {
      await saveSelectedObjectTypes({ workId: row.id, workCls: workTypeId, workName: name })
    }

    await loadWorks()
    message.success('Работа обновлена')
    dialogOpen.value = false
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось обновить работу')
  } finally {
    savingWork.value = false
  }
}

async function saveSelectedObjectTypes(options: { workId: string; workCls: string | null; workName: string; createAll?: boolean }) {
  const { workId, workCls, workName, createAll = false } = options
  if (!workId || !workCls) {
    throw new Error('Не удалось определить работу для привязки типа объекта')
  }

  const current = new Set(selectedObjectTypeIds.value)
  const initial = createAll ? new Set<string>() : new Set(initialSelectedObjectTypeIds.value)

  const toCreate: string[] = []
  const toDelete: string[] = []

  for (const v of current) if (!initial.has(v)) toCreate.push(v)
  for (const v of initial) if (!current.has(v)) toDelete.push(v)

  // Remove unselected relations
  for (const value of toDelete) {
    const relationId = initialRelationIdByValue.value.get(value)
    if (!relationId) continue
    const relationIdNumber = toFiniteNumber(relationId)
    const deleteId = relationIdNumber ?? relationId
    try {
      await rpc('data/deleteOwnerWithProperties', [deleteId, 0])
    } catch (error) {
      console.error(error)
    }
  }

  if (toCreate.length === 0) return

  const uch1 = toFiniteNumber(workId) ?? workId
  const cls1 = toFiniteNumber(workCls) ?? workCls

  for (const value of toCreate) {
    const option = objectTypeSelectOptions.value.find((i) => i.value === value)
    if (!option) continue
    const uch2 = toFiniteNumber(option.value) ?? option.value
    const cls2 = toFiniteNumber(option.cls) ?? option.cls
    const relationName = `${workName} <=> ${option.label}`

    await rpc('data/saveRelObj', [
      {
        uch1,
        cls1,
        uch2,
        cls2,
        codRelTyp: 'RT_Works',
        name: relationName,
      },
    ])
  }
}

function formatPeriodicityText(value: number | null, periodTypeName: string | null): string {
  if (value == null && !periodTypeName) return ''

  if (value == null || Number.isNaN(value)) {
    return periodTypeName ?? ''
  }

  const abs = Math.abs(value)
  const int = Math.trunc(abs)
  const decimals = Math.abs(value - int) > Number.EPSILON
  const base = decimals ? value.toString() : int.toString()

  const mod10 = int % 10
  const mod100 = int % 100
  const ending =
    !decimals && mod10 === 1 && mod100 !== 11
      ? 'раз'
      : !decimals && mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'раза'
        : 'раз'

  const times = `${base} ${ending}`
  if (periodTypeName) {
    return `${times} в ${periodTypeName}`
  }

  return times
}

async function loadWorks() {
  tableLoading.value = true
  try {
    const sourcePromise = loadSourceDirectory(true)
    const [workTypePayload, periodTypePayload, objectTypePayload, worksPayload] = await Promise.all([
      rpc('data/loadClsForSelect', ['Typ_Work']),
      rpc('data/loadFvForSelect', ['Factor_PeriodType']),
      rpc('data/loadComponentsObject2', ['RT_Works', 'Typ_Work', 'Typ_ObjectTyp']),
      rpc('data/loadProcessCharts', [0]),
    ])

    await sourcePromise

    const workTypeRecords = extractRecords<RawWorkTypeRecord>(workTypePayload)
    const periodTypeRecords = extractRecords<RawPeriodTypeRecord>(periodTypePayload)
    const objectTypeRecords = extractRecords<RawObjectTypeRelationRecord>(objectTypePayload)
    const workRecords = extractRecords<RawWorkRecord>(worksPayload)

    directories.workTypes.clear()
    directories.objectTypes.clear()
    directories.periodTypes.clear()
    workTypeDirectory.clear()
    periodTypeDirectory.clear()
    rawPeriodTypeRecords.clear()

    workTypeOptions.value = workTypeRecords
      .map((item) => {
        const id = toOptionalString(item.id ?? item.ID)
        const name = toOptionalString(item.name ?? item.NAME)
        if (!id || !name) return null
        directories.workTypes.set(id, name)
        workTypeDirectory.set(id, { id, label: name })
        return { label: name, value: id }
      })
      .filter((item): item is { label: string; value: string } => Boolean(item))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'))

    periodTypeOptions.value = periodTypeRecords
      .map((item) => {
        const id = toOptionalString(item.id ?? item.ID ?? item.fv ?? item.FV)
        const name = toOptionalString(item.name ?? item.NAME)
        const fvId = toOptionalString(item.fv ?? item.FV ?? id)
        const pvId = toOptionalString(item.pv ?? item.PV ?? null)
        if (!id || !name || !fvId) return null
        directories.periodTypes.set(fvId, name)
        periodTypeDirectory.set(fvId, { id: fvId, label: name, fvId, pvId: pvId ?? null })
        rawPeriodTypeRecords.set(fvId, item)
        return { label: name, value: fvId }
      })
      .filter((item): item is { label: string; value: string } => Boolean(item))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'))

    const uniqueObjectTypes = new Map<string, string>()
    for (const record of objectTypeRecords) {
      const workId = toOptionalString(record.idrom1)
      const name = toOptionalString(record.namerom2)
      if (workId && name) {
        const arr = directories.objectTypes.get(workId) ?? []
        arr.push(name)
        directories.objectTypes.set(workId, arr)
        uniqueObjectTypes.set(name, name)
      }
    }

    objectTypeOptions.value = Array.from(uniqueObjectTypes.values())
      .map((name) => ({ label: name, value: name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'))

    const rowsData: WorkTableRow[] = []

    for (const record of workRecords) {
      const id = toOptionalString(record.obj)
      if (!id) continue

      const name = toOptionalString(record.name) ?? id
      const fullName = toOptionalString(record.fullName)
      const workTypeId = toOptionalString(record.cls)
      const objectTypeNames = directories.objectTypes.get(id) ?? []
      const objectTypeName = objectTypeNames.length ? objectTypeNames.join(', ') : null

      const sourceObjId = toOptionalString(record.objCollections)
      const sourcePvId = toOptionalString(record.pvCollections)
      const sourceRecordId = toOptionalString(record.idCollections)
      const numberSourceRecordId = toOptionalString(record.idNumberSource)

      let sourceId =
        sourceObjId ?? toOptionalString(record.idCollections ?? record.pvCollections) ?? sourcePvId ?? null
      const fallbackSourceName = toOptionalString(record.nameCollections)
      const directorySourceName =
        (sourceId && directories.sources.get(sourceId)) ||
        (sourceObjId && directories.sources.get(sourceObjId)) ||
        (sourcePvId && directories.sources.get(sourcePvId)) ||
        null
      const sourceName = directorySourceName ?? fallbackSourceName
      if (!sourceId && sourceName) {
        sourceId = `name:${sourceName}`
      }
      const sourceNumber = toOptionalString(record.NumberSource)

      const periodTypeId = toOptionalString(record.fvPeriodType ?? record.pvPeriodType) ?? null
      const periodTypePvId = toOptionalString(record.pvPeriodType) ?? null
      const periodTypeRecordId = toOptionalString(record.idPeriodType) ?? null
      const periodTypeName = (periodTypeId && directories.periodTypes.get(periodTypeId)) || null

      const periodicityValueRaw = record.Periodicity
      const periodicityValue =
        typeof periodicityValueRaw === 'number'
          ? periodicityValueRaw
          : periodicityValueRaw != null
            ? Number(periodicityValueRaw)
            : null
      const periodicity =
        periodicityValue != null && Number.isFinite(periodicityValue)
          ? Number(periodicityValue)
          : null
      const periodicityText = formatPeriodicityText(periodicity, periodTypeName)
      const periodicityRecordId = toOptionalString(record.idPeriodicity) ?? null

      rowsData.push({
        id,
        name,
        fullName,
        workTypeId,
        workTypeName: (workTypeId && directories.workTypes.get(workTypeId)) || null,
        objectTypeName,
        objectTypeNames,
        sourceId,
        sourceName,
        sourceNumber,
        sourceObjId,
        sourcePvId,
        sourceRecordId,
        numberSourceRecordId,
        periodTypeId,
        periodTypeName,
        periodTypePvId,
        periodTypeRecordId,
        periodicityValue: periodicity,
        periodicityText,
        periodicityRecordId,
        cls: workTypeId,
      })

      if (workTypeId && !workTypeDirectory.has(workTypeId)) {
        const workTypeLabel = directories.workTypes.get(workTypeId)
        if (workTypeLabel) {
          workTypeDirectory.set(workTypeId, { id: workTypeId, label: workTypeLabel })
        }
      }

      if (sourceObjId && sourceName) {
        directories.sources.set(sourceObjId, sourceName)
        if (sourcePvId) directories.sources.set(sourcePvId, sourceName)
      }

      if (sourceObjId && sourceName && !sourceDirectory.has(sourceObjId)) {
        const pvNormalized = sourcePvId ?? sourceId ?? sourceObjId
        const details: SourceOptionDetails = {
          id: sourceObjId,
          label: sourceName,
          objId: sourceObjId,
          pvId: pvNormalized ?? sourceObjId,
        }
        sourceDirectory.set(sourceObjId, details)
        sourceDirectoryByPv.set(details.pvId, details)
      }

      if (periodTypeId && periodTypeName && !periodTypeDirectory.has(periodTypeId)) {
        periodTypeDirectory.set(periodTypeId, {
          id: periodTypeId,
          label: periodTypeName,
          fvId: periodTypeId,
          pvId: periodTypePvId,
        })
      }
    }

    const existingValues = new Set(sourceOptions.value.map((option) => option.value))
    let sourcesChanged = false
    for (const row of rowsData) {
      if (!row.sourceId || existingValues.has(row.sourceId)) continue
      const label = row.sourceName ?? row.sourceNumber ?? row.sourceId.replace(/^name:/, '')
      sourceOptions.value.push({ label, value: row.sourceId })
      existingValues.add(row.sourceId)
      sourcesChanged = true
    }
    if (sourcesChanged) {
      sourceOptions.value.sort((a, b) => a.label.localeCompare(b.label, 'ru'))
    }

    works.value = rowsData
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Не удалось загрузить работы')
  } finally {
    tableLoading.value = false
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    mediaQueryList = window.matchMedia('(max-width: 768px)')
    handleMediaQueryChange(mediaQueryList)
    mediaQueryList.addEventListener('change', handleMediaQueryChange)
  }
  void loadWorks()
})

onBeforeUnmount(() => {
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleMediaQueryChange)
    mediaQueryList = null
  }
})
</script>

<style scoped>
.works-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-stretch {
  width: 100%;
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
  padding: 0 12px;
  height: auto;
  line-height: 24px;
  vertical-align: middle;
}

:deep(.n-data-table .n-data-table-th[data-col-key='name']),
:deep(.n-data-table .n-data-table-td.col-name) {
  width: 220px;
  max-width: 260px;
}

:deep(.n-data-table .n-data-table-th[data-col-key='actions']),
:deep(.n-data-table .n-data-table-td.col-actions) {
  width: 120px;
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
  color: var(--text-color-3);
  font-size: 12px;
  max-width: 680px;
}

.toolbar__controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  align-items: center;
}

.toolbar__search {
  width: 280px;
  max-width: 100%;
}

.toolbar__filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar__select {
  width: 160px;
}

.work-form :deep(.n-form-item) {
  margin-bottom: 16px;
}

.table-actions {
  display: flex;
  gap: 4px;
}

.table-cell__primary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.source-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.source-chip {
  background: var(--s360-surface);
  color: var(--s360-accent);
  font-weight: 500;
}

.source-number {
  color: var(--text-color-2);
  font-size: 13px;
  line-height: 1.4;
  white-space: normal;
}

/* Chips for object types (like Components page) */
.chips-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px;
  max-width: 100%;
}

.chip {
  background: var(--s360-surface);
  max-width: 100%;
  min-width: 0;
  white-space: normal;
  line-height: 1.3;
}

.chip :deep(.n-tag__content) {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
}

.chip--more { cursor: pointer; }

.popover-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 360px;
}

.popover-item {
  white-space: normal;
  word-break: break-word;
}

.cell-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  word-break: break-word;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.text-body {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.pagination-total {
  margin-right: 12px;
  font-size: 14px;
  color: var(--n-text-color-3);
}

.show-more-bar {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
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
  max-width: 100%;
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

@media (max-width: 768px) {
  .toolbar__controls {
    justify-content: stretch;
  }

  .toolbar__search {
    flex: 1 1 100%;
  }

  .toolbar__filters {
    width: 100%;
  }

  .toolbar__select {
    flex: 1 1 150px;
  }
}

@media (max-width: 360px) {
  .card__grid {
    grid-template-columns: 100px 1fr;
  }
}
</style>
