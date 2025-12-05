<!-- Страница: src/pages/nsi/ResourcesPage.vue
     Назначение: Справочник «Ресурсы» с единым списком и типом ресурса. Материалы/услуги берутся из resource API, техника/инструменты/профессии — из Factor_*.
     Использование: роут /nsi/resources (с фильтром по типу через query ?type=materials|equipment|tools|professions|third-party). -->
<template>
  <section class="resources-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          Ресурсы
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            aria-label="Подсказка по разделу"
            @click="infoOpen = true"
        >
          <template #icon>
            <NIcon><InformationCircleOutline /></NIcon>
          </template>
        </NButton>
        </h2>
        <div class="subtext">Ведите единые списки ресурсов</div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="search"
          placeholder="Поиск по названию и описанию"
          clearable
          round
          class="toolbar__search"
        />

        <div class="toolbar__filters">
          <NSelect
            v-model:value="typeFilter"
            :options="typeOptions"
            clearable
            filterable
            size="small"
            class="toolbar__select"
            placeholder="Вид ресурса"
            @update:value="handleTypeFilterUpdate"
          />
        </div>

        <NSelect
          v-if="isMobile"
          v-model:value="sortOrder"
          :options="sortOptions"
          size="small"
          class="toolbar__select"
          aria-label="Сортировка"
        />

        <NButton type="primary" @click="openCreate">+ Добавить ресурс</NButton>
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
        size="small"
      />

      <div v-else class="cards" role="list">
        <div class="list-info">Показано: {{ visibleCount }} из {{ total }}</div>
        <article
          v-for="item in rows"
          :key="item.id"
          class="card"
          role="group"
          :aria-label="item.name"
        >
          <header class="card__header">
            <h4 class="card__title">{{ item.name }}</h4>
            <NTag size="small" :bordered="false" round type="info">{{ typeLabels[item.type] }}</NTag>
          </header>

          <dl v-if="!isNameOnlyType(item.type)" class="card__grid">
            <dt>Ед. изм.</dt>
            <dd>{{ item.unit }}</dd>
            <dt>Описание</dt>
            <dd>{{ item.description || '-' }}</dd>
          </dl>
        </article>
      </div>

      <div v-if="isMobile && pagination.page < maxPage" class="show-more-bar">
        <NButton tertiary @click="showMore" :loading="tableLoading">Показать ещё</NButton>
      </div>

      <div class="pagination-bar" v-if="!isMobile">
        <NPagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :item-count="total"
          show-size-picker
          show-quick-jumper
        >
          <template #prefix>
            <span class="pagination-total">Всего: {{ total }}</span>
          </template>
        </NPagination>
      </div>
    </div>

    <!-- Инфо -->
    <NModal v-model:show="infoOpen" preset="card" title="О справочнике" style="max-width: 640px">
      <p>
        Справочник «Ресурсы» объединяет материалы, технику, инструменты, профессии и услуги сторонних в единую таблицу с полем «Вид ресурса». Для
        техники, инструментов и профессий сохраняется только название (без единиц и описаний). В меню доступны быстрые фильтры по видам.
      </p>
      <template #footer>
        <NButton type="primary" @click="infoOpen = false">Понятно</NButton>
      </template>
    </NModal>

    <!-- Форма создания/редактирования -->
    <NModal v-model:show="dialogOpen" preset="card" :title="dialogTitle" style="width: min(560px, 96vw)">
      <NForm :model="form" label-width="160px">
        <NFormItem label="Вид ресурса" :feedback="errors.type ?? undefined" :validation-status="errors.type ? 'error' : undefined">
          <NSelect
            v-model:value="form.type"
            :options="typeOptions"
            placeholder="Выберите вид ресурса"
            :disabled="isEditing"
          />
        </NFormItem>
        <NFormItem label="Название" :feedback="errors.name ?? undefined" :validation-status="errors.name ? 'error' : undefined">
          <NInput v-model:value="form.name" placeholder="Например: Щебень фр. 5-20" />
        </NFormItem>
        <NFormItem
          v-if="requiresMeasure"
          label="Единица измерения"
          :feedback="errors.measureKey ?? undefined"
          :validation-status="errors.measureKey ? 'error' : undefined"
        >
          <NSelect
            v-model:value="form.measureKey"
            :options="measureOptions"
            placeholder="Выберите единицу измерения"
            filterable
            :loading="measureLoading"
          />
        </NFormItem>
        <NFormItem v-else label="Единица измерения">
          <span class="form-hint">Не требуется для выбранного вида ресурса</span>
        </NFormItem>
        <NFormItem v-if="supportsDescription" label="Описание">
          <NInput v-model:value="form.description" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" placeholder="Краткое описание" />
        </NFormItem>
        <NFormItem v-else label="Описание">
          <span class="form-hint">Не требуется для выбранного вида ресурса</span>
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="modal-footer">
          <NButton @click="dialogOpen = false">Отмена</NButton>
          <NButton type="primary" class="btn-primary" :loading="saveLoading" @click="save">Сохранить</NButton>
        </div>
      </template>
    </NModal>
  </section>
  
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NTag,
  type DataTableColumn,
  type SelectOption,
  useMessage,
} from 'naive-ui'
import { InformationCircleOutline } from '@vicons/ionicons5'
import { metaRpc, resourceRpc, rpc as nsiRpc } from '@shared/api'

type ResourceType = 'materials' | 'equipment' | 'tools' | 'professions' | 'third-party'
type NameOnlyResourceType = Extract<ResourceType, 'equipment' | 'tools' | 'professions'>
type MeasuredResourceType = Extract<ResourceType, 'materials' | 'third-party'>

interface PaginationState {
  page: number
  pageSize: number
}

const router = useRouter()
const route = useRoute()

const infoOpen = ref(false)
const dialogOpen = ref(false)
const editingRow = ref<ResourceRow | null>(null)
const search = ref('')
const typeFilter = ref<ResourceType | null>(null)
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })
const tableLoading = ref(false)
const measureLoading = ref(false)
const sortOrder = ref<'name-asc' | 'name-desc'>('name-asc')
const sortOptions = [
  { label: 'По названию (А→Я)', value: 'name-asc' },
  { label: 'По названию (Я→А)', value: 'name-desc' },
]

const typeLabels: Record<ResourceType, string> = {
  materials: 'Материал',
  equipment: 'Техника',
  tools: 'Инструменты',
  professions: 'Профессия',
  'third-party': 'Услуги сторонних',
}

const typeOptions = Object.entries(typeLabels).map(([value, label]) => ({ label, value })) as SelectOption[]

const NAME_ONLY_TYPES = ['equipment', 'tools', 'professions'] as const
const NAME_ONLY_TYPE_SET = new Set<ResourceType>(NAME_ONLY_TYPES)

function isNameOnlyType(type: ResourceType): type is NameOnlyResourceType {
  return NAME_ONLY_TYPE_SET.has(type)
}

function isMeasuredResource(type: ResourceType): type is MeasuredResourceType {
  return type === 'materials' || type === 'third-party'
}

const message = useMessage()

interface ResourceRow {
  id: string
  type: ResourceType
  name: string
  unit: string
  description?: string
  raw: ResourcePayloadBase
  measureKey?: string | null
}

interface ResourceFormState {
  type: ResourceType
  name: string
  measureKey: string | null
  description: string
}

interface ResourcePayloadBase {
  [key: string]: unknown
  name?: string | null
  fullName?: string | null
  Description?: string | null
}

interface MaterialResponse extends ResourcePayloadBase {
  meaMeasure?: string | number | null
  pvMeasure?: string | number | null
}

interface ServiceResponse extends ResourcePayloadBase {
  meaMeasure?: string | number | null
  pvMeasure?: string | number | null
}

interface FactorResponse extends ResourcePayloadBase {
  id?: string | number | null
  pv?: string | number | null
  fv?: string | number | null
}

type EquipmentResponse = FactorResponse

type ToolResponse = FactorResponse

type ProfessionResponse = FactorResponse

interface MeasureResponse {
  id?: string | number | null
  pv?: string | number | null
  name?: string | null
}

interface MeasureSelectOption extends SelectOption {
  value: string
  label: string
  id: string | number | null
  pv: string | number | null
  name: string
}

type MeasureLookup = Map<string, string>

const ARRAY_WRAPPER_KEYS = [
  'result',
  'Result',
  'data',
  'Data',
  'value',
  'Value',
  'items',
  'Items',
  'rows',
  'Rows',
  'records',
  'Records',
]

const ID_CANDIDATES = [
  'id',
  'Id',
  'ID',
  'fv',
  'Fv',
  'FV',
  'pv',
  'Pv',
  'PV',
  'idMaterial',
  'IdMaterial',
  'ID_Material',
  'idService',
  'IdService',
  'idEquipment',
  'IdEquipment',
  'idTool',
  'IdTool',
  'code',
  'Code',
  'guid',
  'Guid',
  'GUID',
  'Ref_Key',
  'refKey',
]

const META_PARENT_BY_TYPE: Record<NameOnlyResourceType, number> = {
  equipment: 1252,
  tools: 1256,
  professions: 1127,
}

const FACTOR_KEY_BY_TYPE: Record<NameOnlyResourceType, string> = {
  equipment: 'Factor_Equipment',
  tools: 'Factor_Tool',
  professions: 'Factor_Position',
}

const remoteItems = ref<ResourceRow[]>([])
const measureOptions = ref<MeasureSelectOption[]>([])
let measureOptionMap: Map<string, MeasureSelectOption> = new Map()

const form = reactive<ResourceFormState>({ type: 'materials', name: '', measureKey: null, description: '' })
const errors = reactive<{ [K in keyof ResourceFormState]?: string | null }>({})

const dialogTitle = computed(() => (editingRow.value ? 'Редактировать ресурс' : 'Добавить ресурс'))
const isEditing = computed(() => editingRow.value !== null)
const requiresMeasure = computed(() => isMeasuredResource(form.type))
const supportsDescription = computed(() => !isNameOnlyType(form.type))
const saveLoading = ref(false)

const normalizedSearch = computed(() => search.value.trim().toLocaleLowerCase('ru-RU'))

const filtered = computed(() => {
  const base = typeFilter.value ? remoteItems.value.filter((r) => r.type === typeFilter.value) : remoteItems.value

  if (!normalizedSearch.value) return base

  return base.filter((r) => {
    const hay = `${r.name}\n${r.description || ''}`.toLocaleLowerCase('ru-RU')
    return hay.includes(normalizedSearch.value)
  })
})

const sortedRows = computed(() => {
  const arr = [...filtered.value]
  arr.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return sortOrder.value === 'name-asc' ? arr : arr.reverse()
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

watch([search, typeFilter], () => {
  pagination.page = 1
})

watch(
  () => pagination.pageSize,
  () => {
    pagination.page = 1
  },
)

watch(
  () => [pagination.page, total.value],
  () => {
    if (pagination.page > maxPage.value) pagination.page = maxPage.value
  },
  { immediate: true },
)

watch(
  () => form.type,
  (next) => {
    if (isNameOnlyType(next)) {
      form.measureKey = null
      errors.measureKey = null
      form.description = ''
      errors.description = null
    }
  },
)

function resetForm(partial?: Partial<ResourceFormState>) {
  form.type = partial?.type ?? (typeFilter.value ?? 'materials')
  form.name = partial?.name ?? ''
  form.measureKey = partial?.measureKey ?? null
  form.description = partial?.description ?? ''
  errors.type = null
  errors.name = null
  errors.measureKey = null
  errors.description = null
}

function openCreate() {
  editingRow.value = null
  resetForm()
  dialogOpen.value = true
}

function validate(): boolean {
  let ok = true
  errors.type = form.type ? null : 'Выберите вид'
  const trimmedName = formatText(form.name)
  errors.name = trimmedName ? null : 'Заполните название'
  if (!trimmedName) ok = false
  if (!form.type) ok = false
  if (requiresMeasure.value) {
    errors.measureKey = form.measureKey ? null : 'Выберите единицу измерения'
    if (!form.measureKey) ok = false
  } else {
    errors.measureKey = null
  }
  return ok
}

const RESOURCE_METHOD_BY_TYPE: Record<MeasuredResourceType, string> = {
  materials: 'data/saveMaterial',
  'third-party': 'data/saveTpService',
}

interface MetaFactorInsertRecord {
  id?: number | string | null
  name?: string | null
}

interface MetaFactorInsertResult {
  records?: MetaFactorInsertRecord[]
}

async function save() {
  if (!validate()) return

  const normalizedName = formatText(form.name)
  const normalizedDescription = resolveDescription(form.description)
  form.name = normalizedName
  form.description = normalizedDescription

  const currentRow = editingRow.value
  const currentType = form.type

  saveLoading.value = true
  try {
    if (isNameOnlyType(currentType)) {
      await saveNameOnlyResource(currentType, normalizedName, currentRow)
    } else {
      if (!isMeasuredResource(currentType)) {
        throw new Error('Неподдерживаемый вид ресурса')
      }
      const method = RESOURCE_METHOD_BY_TYPE[currentType]
      const mode = currentRow ? 'upd' : 'ins'
      const payload = buildPayload(
        {
          type: currentType,
          name: normalizedName,
          description: normalizedDescription,
          measureKey: form.measureKey,
        },
        currentRow,
      )
      await resourceRpc(method, [mode, payload])
    }
    message.success(currentRow ? 'Ресурс обновлён' : 'Ресурс добавлен')
    dialogOpen.value = false
    editingRow.value = null
    resetForm()
    await fetchResources()
  } catch (error) {
    console.error('Не удалось сохранить ресурс', error)
    const text = error instanceof Error ? error.message : 'Не удалось сохранить ресурс'
    message.error(text)
  } finally {
    saveLoading.value = false
  }
}

function resolveMetaId(record?: ResourcePayloadBase | null): number {
  if (!record) return 0
  for (const key of ['id', 'Id', 'ID', 'fv', 'Fv', 'FV', 'pv', 'Pv', 'PV']) {
    const value = (record as Record<string, unknown>)[key]
    const num = Number(formatText(value))
    if (!Number.isNaN(num) && Number.isFinite(num)) return num
  }
  return 0
}

function buildMetaPayload(type: NameOnlyResourceType, name: string, row: ResourceRow | null) {
  const parent = META_PARENT_BY_TYPE[type]
  const id = resolveMetaId(row?.raw)
  return {
    rec: {
      id,
      cod: '',
      accessLevel: 1,
      name,
      fullName: name,
      cmt: null,
      parent,
    },
  }
}

async function saveNameOnlyResource(type: NameOnlyResourceType, name: string, row: ResourceRow | null) {
  const payload = buildMetaPayload(type, name, row)
  const result = await metaRpc<MetaFactorInsertResult>('factor/insert', [payload])
  const records = unwrapArrayPayload<MetaFactorInsertRecord>(result)
  if (!records.length) {
    throw new Error('Meta API: не удалось сохранить запись')
  }
}

interface BuildPayloadState {
  type: MeasuredResourceType
  name: string
  description: string
  measureKey: string | null
}

function buildPayload(state: BuildPayloadState, row: ResourceRow | null): Record<string, unknown> {
  const base: Record<string, unknown> = row ? { ...row.raw } : {}

  base.name = state.name
  base.Description = state.description

  if (state.type === 'materials' || state.type === 'third-party') {
    const option = state.measureKey ? measureOptionMap.get(state.measureKey) : undefined
    if (option) {
      base.meaMeasure = normalizeMeasurePart(option.id)
      base.pvMeasure = normalizeMeasurePart(option.pv)
      const measureName = option.name
      base.fullName = measureName ? `${state.name}, ${measureName}` : state.name
    } else if (!row) {
      base.meaMeasure = null
      base.pvMeasure = null
    }
  }

  if (
    (state.type === 'materials' || state.type === 'third-party') &&
    (!('fullName' in base) || !base.fullName)
  ) {
    base.fullName = state.name
  }

  return base
}

function normalizeMeasurePart(value: unknown): number | string | null {
  if (value == null) return null
  const numeric = Number(value)
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    return numeric
  }
  if (typeof value === 'string') return value
  return String(value)
}

const rowKey = (row: ResourceRow) => row.id

const shouldHideDetailsColumns = computed(() => Boolean(typeFilter.value && isNameOnlyType(typeFilter.value)))

function getColumnKey(column: DataTableColumn<ResourceRow>): string | number | undefined {
  return (column as DataTableColumn<ResourceRow> & { key?: string | number }).key
}

const columns = computed<DataTableColumn<ResourceRow>[]>(() => {
  const base: DataTableColumn<ResourceRow>[] = [
    {
      title: 'Название',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
      width: 400,
      ellipsis: { tooltip: true },
      render: (row) => h('span', { class: 'table-cell__primary' }, row.name),
    },
    {
      title: 'Вид ресурса',
      key: 'type',
      width: 180,
      render: (row) => h(NTag, { size: 'small', bordered: false, round: true, type: 'info' }, { default: () => typeLabels[row.type] }),
    },
    {
      title: 'Ед. изм.',
      key: 'unit',
      width: 120,
      render: (row) => row.unit || '—',
    },
    {
      title: 'Описание',
      key: 'description',
      ellipsis: { tooltip: true },
      render: (row) => row.description || '—',
    },
  ]

  if (shouldHideDetailsColumns.value) {
    return base.filter((column) => {
      const key = getColumnKey(column)
      return key !== 'unit' && key !== 'description'
    })
  }

  return base
})

function showMore() {
  if (pagination.page < maxPage.value) pagination.page += 1
}

async function fetchResources() {
  tableLoading.value = true
  measureLoading.value = true
  try {
    const [materialsRaw, servicesRaw, equipmentRaw, toolsRaw, professionsRaw, measuresRaw] = await Promise.all([
      resourceRpc<unknown>('data/loadMaterial', [0]),
      resourceRpc<unknown>('data/loadTpService', [0]),
      nsiRpc<unknown>('data/loadFvForSelect', [FACTOR_KEY_BY_TYPE.equipment]),
      nsiRpc<unknown>('data/loadFvForSelect', [FACTOR_KEY_BY_TYPE.tools]),
      nsiRpc<unknown>('data/loadFvForSelect', [FACTOR_KEY_BY_TYPE.professions]),
      nsiRpc<unknown>('data/loadMeasure', ['Prop_Measure']),
    ])

    const measureRecords = unwrapArrayPayload<MeasureResponse>(measuresRaw)
    const dictionaries = buildMeasureDictionaries(measureRecords)
    measureOptions.value = dictionaries.options
    measureOptionMap = dictionaries.map

    remoteItems.value = [
      ...createMaterialRows(unwrapArrayPayload<MaterialResponse>(materialsRaw), dictionaries.lookup),
      ...createServiceRows(unwrapArrayPayload<ServiceResponse>(servicesRaw), dictionaries.lookup),
      ...createEquipmentRows(unwrapArrayPayload<EquipmentResponse>(equipmentRaw)),
      ...createToolRows(unwrapArrayPayload<ToolResponse>(toolsRaw)),
      ...createProfessionRows(unwrapArrayPayload<ProfessionResponse>(professionsRaw)),
    ]
  } catch (error) {
    console.error('Не удалось загрузить справочник ресурсов', error)
    const text = error instanceof Error ? error.message : 'Не удалось загрузить ресурсы'
    message.error(text)
    remoteItems.value = []
  } finally {
    tableLoading.value = false
    measureLoading.value = false
  }
}

function setTypeFromQuery() {
  const q = String(route.query.type || '')
  if (q && ['materials', 'equipment', 'tools', 'professions', 'third-party'].includes(q)) {
    typeFilter.value = q as ResourceType
  } else {
    typeFilter.value = null
  }
}

onMounted(() => {
  setTypeFromQuery()
  void fetchResources()
})

watch(
  () => route.query.type,
  () => setTypeFromQuery(),
)

function handleTypeFilterUpdate(next: ResourceType | null) {
  const query = { ...route.query }
  if (next) {
    query.type = next
  } else {
    delete query.type
  }
  void router.replace({ path: route.path, query })
}

type MeasureDictionaries = {
  lookup: MeasureLookup
  options: MeasureSelectOption[]
  map: Map<string, MeasureSelectOption>
}

function buildMeasureDictionaries(records: MeasureResponse[]): MeasureDictionaries {
  const lookup: MeasureLookup = new Map()
  const options: MeasureSelectOption[] = []
  const map = new Map<string, MeasureSelectOption>()

  for (const record of records) {
    const key = createMeasureKey(record.id, record.pv)
    if (!key) continue
    const name = formatText(record.name)
    if (!name) continue

    lookup.set(key, name)

    const option: MeasureSelectOption = {
      label: name,
      value: key,
      id: record.id ?? null,
      pv: record.pv ?? null,
      name,
    }

    options.push(option)
    map.set(key, option)
  }

  options.sort((a, b) => a.label.localeCompare(b.label, 'ru'))

  return { lookup, options, map }
}

function formatText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

function resolveName(value: unknown): string {
  const text = formatText(value)
  return text || 'Без названия'
}

function resolveDescription(value: unknown): string {
  return formatText(value)
}

function createMeasureKey(id?: unknown, pv?: unknown): string {
  const idPart = formatText(id)
  const pvPart = formatText(pv)
  if (!idPart && !pvPart) return ''
  return `${idPart}__${pvPart}`
}

function unwrapArrayPayload<T>(payload: unknown): T[] {
  const visited = new Set<unknown>()
  const queue: unknown[] = [payload]
  let fallback: T[] | null = null

  while (queue.length) {
    const current = queue.shift()
    if (current == null) continue
    if (visited.has(current)) continue
    visited.add(current)

    if (Array.isArray(current)) {
      if (current.length) return current as T[]
      if (!fallback) fallback = current as T[]
      continue
    }

    if (typeof current === 'object') {
      const record = current as Record<string, unknown>

      for (const key of ARRAY_WRAPPER_KEYS) {
        if (key in record) {
          queue.push(record[key])
        }
      }

      for (const value of Object.values(record)) {
        queue.push(value)
      }
    }
  }

  return fallback ?? []
}

function resolveMeasureName(lookup: MeasureLookup, id?: unknown, pv?: unknown): string {
  const key = createMeasureKey(id, pv)
  if (!key) return ''
  return lookup.get(key) ?? ''
}

function resolveRowId(prefix: string, record: ResourcePayloadBase, fallbackIndex: number): string {
  for (const key of ID_CANDIDATES) {
    const value = record[key]
    const text = formatText(value)
    if (text) {
      return `${prefix}-${text}`
    }
  }

  return `${prefix}-${fallbackIndex}`
}

function createMaterialRows(materials: MaterialResponse[], measures: MeasureLookup): ResourceRow[] {
  return materials.map((material, index) => {
    const id = resolveRowId('material', material, index)
    const unit = resolveMeasureName(measures, material.meaMeasure, material.pvMeasure) || '—'
    const measureKey = createMeasureKey(material.meaMeasure, material.pvMeasure) || null
    return {
      id,
      type: 'materials',
      name: resolveName(material.name),
      unit,
      description: resolveDescription(material.Description),
      raw: material,
      measureKey,
    }
  })
}

function createServiceRows(services: ServiceResponse[], measures: MeasureLookup): ResourceRow[] {
  return services.map((service, index) => {
    const id = resolveRowId('service', service, index)
    const unit = resolveMeasureName(measures, service.meaMeasure, service.pvMeasure) || '—'
    const measureKey = createMeasureKey(service.meaMeasure, service.pvMeasure) || null
    return {
      id,
      type: 'third-party',
      name: resolveName(service.name),
      unit,
      description: resolveDescription(service.Description),
      raw: service,
      measureKey,
    }
  })
}

function createEquipmentRows(equipment: EquipmentResponse[]): ResourceRow[] {
  return createNameOnlyRows(equipment, 'equipment', 'equipment')
}

function createToolRows(tools: ToolResponse[]): ResourceRow[] {
  return createNameOnlyRows(tools, 'tools', 'tool')
}

function createProfessionRows(records: ProfessionResponse[]): ResourceRow[] {
  return createNameOnlyRows(records, 'professions', 'profession')
}

function createNameOnlyRows(records: FactorResponse[], type: NameOnlyResourceType, prefix: string): ResourceRow[] {
  return records.map((item, index) => {
    const id = resolveRowId(prefix, item, index)
    return {
      id,
      type,
      name: resolveName(item.name ?? item.fullName),
      unit: '',
      description: '',
      raw: item,
      measureKey: null,
    }
  })
}

const isMobile = computed(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false))
</script>

<style scoped>
.resources-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px;
}

.toolbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.toolbar__left { display: flex; flex-direction: column; gap: 6px; }
.page-title { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 18px; }
.page-title__info { margin-left: 2px; }
.subtext { color: rgba(0,0,0,0.6); font-size: 12px; }

.toolbar__controls { display: flex; align-items: center; gap: 10px; }
.toolbar__search { width: 320px; max-width: 50vw; }
.toolbar__filters { display: inline-flex; align-items: center; gap: 8px; }
.toolbar__select { width: 240px; }

.table-area { display: flex; flex-direction: column; gap: 8px; }
.pagination-bar { display: flex; justify-content: flex-end; }

.table-actions { display: inline-flex; align-items: center; gap: 4px; }
.table-cell__primary { display: inline-flex; align-items: center; gap: 4px; }

/* Desktop table look-alike of other NSI pages */
.table-full { flex: 1; min-width: 0; }
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
  border-bottom: none; /* убираем двойные линии */
  padding: 0 12px;
  height: auto;
  line-height: 24px;
  vertical-align: middle;
}
:deep(.n-data-table thead th) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--n-table-header-color, var(--n-card-color, var(--s360-bg)));
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
}
:deep(.n-pagination) { font-size: 14px; }
.pagination-total { margin-right: 12px; font-size: 14px; color: var(--n-text-color-3); }

/* Mobile cards (как на других страницах) */
.cards { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.list-info { font-size: 12px; color: var(--n-text-color-3); padding: 2px 2px 0; }
.card { border: 1px solid var(--s360-border); border-radius: 14px; padding: 12px; background: var(--s360-bg); box-shadow: 0 1px 4px rgba(0,0,0,0.04); max-width: 100%; width: 100%; box-sizing: border-box; }
.card__header, .card__actions { min-width: 0; }
.card__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.card__title { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.card__grid { display: grid; grid-template-columns: 110px 1fr; gap: 6px 10px; margin: 10px 0; }
.card__grid dt { color: #6b7280; font-size: 12px; }
.card__grid dd { margin: 0; word-break: break-word; overflow-wrap: anywhere; }
.card__actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.card__actions .table-actions { justify-content: flex-start; opacity: 1; }
.show-more-bar { display: flex; justify-content: center; margin-top: 10px; }
.form-hint { color: var(--n-text-color-3); font-size: 13px; }

@media (max-width: 768px) {
  .toolbar { flex-direction: column; align-items: stretch; gap: 10px; }
  .toolbar__controls { flex-wrap: wrap; }
  .toolbar__search { width: 100%; max-width: none; }
  .toolbar__select { width: 100%; }
}
</style>
