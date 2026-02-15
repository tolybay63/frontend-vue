<!-- Файл: src/pages/nsi/ResourceNormsPage.vue
     Назначение: справочник «Нормы расходаресурсов» с поиском по всем полям и таблицей значений.
     Использование: доступен по маршруту /nsi/resource-norms. -->
<template>
  <section class="resource-norms-page">
    <template v-if="!isEditorRoute">
      <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
        <div class="toolbar__left">
          <h2 class="page-title">Справочник «Нормы расхода ресурсов»</h2>
          <div class="subtext">Настраивайте нормы расхода ресурсов для отдельных задач</div>
        </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="search"
          placeholder="Поиск по всем полям"
          clearable
          round
          class="toolbar__search"
        />
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
          :row-props="createRowProps"
          :bordered="false"
          size="small"
        />

        <div v-else class="cards" role="list">
          <div class="list-info">Показано: {{ visibleCount }} из {{ total }}</div>
          <article
            v-for="item in rows"
            :key="item.rowKey"
            class="card card--interactive"
            role="button"
            tabindex="0"
            :aria-label="`Редактировать: ${item.name || item.namerom1 || item.namerom2 || ''}`"
            @click="openEditor(item)"
            @keydown.enter="openEditor(item)"
          >
            <header class="card__header">
              <h4 class="card__title">{{ item.name || '—' }}</h4>
            </header>

            <dl class="card__grid">
              <dt>Работа - Задача</dt>
              <dd>{{ item.name || '—' }}</dd>
              <dt>Исполнители</dt>
              <dd>
                <div v-if="item.personnelItems.length" class="chip-list">
                  <NTag
                    v-for="(entry, idx) in item.personnelItems"
                    :key="`personnel-${idx}`"
                    size="small"
                    round
                    :bordered="false"
                    type="info"
                    class="value-chip"
                  >
                    {{ entry }}
                  </NTag>
                </div>
                <span v-else class="empty">—</span>
              </dd>
              <dt>Материалы</dt>
              <dd>
                <div v-if="item.materialItems.length" class="chip-list">
                  <NTag
                    v-for="(entry, idx) in item.materialItems"
                    :key="`material-${idx}`"
                    size="small"
                    round
                    :bordered="false"
                    type="info"
                    class="value-chip"
                  >
                    {{ entry }}
                  </NTag>
                </div>
                <span v-else class="empty">—</span>
              </dd>
              <dt>Инструменты</dt>
              <dd>
                <div v-if="item.toolItems.length" class="chip-list">
                  <NTag
                    v-for="(entry, idx) in item.toolItems"
                    :key="`tool-${idx}`"
                    size="small"
                    round
                    :bordered="false"
                    type="info"
                    class="value-chip"
                  >
                    {{ entry }}
                  </NTag>
                </div>
                <span v-else class="empty">—</span>
              </dd>
              <dt>Техника</dt>
              <dd>
                <div v-if="item.equipmentItems.length" class="chip-list">
                  <NTag
                    v-for="(entry, idx) in item.equipmentItems"
                    :key="`equipment-${idx}`"
                    size="small"
                    round
                    :bordered="false"
                    type="info"
                    class="value-chip"
                  >
                    {{ entry }}
                  </NTag>
                </div>
                <span v-else class="empty">—</span>
              </dd>
              <dt>Услуги других</dt>
              <dd>
                <div v-if="item.serviceItems.length" class="chip-list">
                  <NTag
                    v-for="(entry, idx) in item.serviceItems"
                    :key="`service-${idx}`"
                    size="small"
                    round
                    :bordered="false"
                    type="info"
                    class="value-chip"
                  >
                    {{ entry }}
                  </NTag>
                </div>
                <span v-else class="empty">—</span>
              </dd>
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
    </template>

    <component v-if="editorVisible" :is="editorWrapper" v-bind="editorWrapperProps">
      <div v-if="isEditorRoute" class="editor-page__header">
        <NButton quaternary size="small" class="editor-back" @click="closeEditorPage">
          Назад
        </NButton>
        <div class="editor-page__title">Норма расхода ресурсов</div>
      </div>
      <div class="norm-editor">
        <div class="norm-editor__header">
          <div class="norm-editor__title">Работа - Задача</div>
          <div class="norm-editor__subtitle">{{ activeRow?.name || '—' }}</div>
        </div>

        <NTabs v-model:value="activeTab" type="line" size="large" class="norm-tabs">
          <NTabPane name="materials" :tab="tabLabel('Материалы', materialRows.length)">
            <div class="segment-header">
              <div>
                <div class="segment-title">Материалы</div>
                <div class="segment-subtitle">Нормы расхода материалов</div>
              </div>
              <NButton size="small" type="primary" @click="addMaterialRow">+ Добавить строку</NButton>
            </div>
            <div class="segment-body">
              <NDataTable
                class="s360-cards table-full"
                :columns="materialColumns"
                :data="materialRows"
                :loading="materialsLoading"
                :row-key="materialRowKey"
                :bordered="false"
                size="small"
              />
            </div>
          </NTabPane>

          <NTabPane name="tools" :tab="tabLabel('Инструменты', toolRows.length)">
            <div class="segment-header">
              <div>
                <div class="segment-title">Инструменты</div>
                <div class="segment-subtitle">Нормы использования инструментов</div>
              </div>
              <NButton size="small" type="primary" @click="addToolRow">+ Добавить строку</NButton>
            </div>
            <div class="segment-body">
              <NDataTable
                class="s360-cards table-full"
                :columns="toolColumns"
                :data="toolRows"
                :loading="toolsLoading"
                :row-key="toolRowKey"
                :bordered="false"
                size="small"
              />
            </div>
          </NTabPane>

          <NTabPane name="equipment" :tab="tabLabel('Техника', equipmentRows.length)">
            <div class="segment-header">
              <div>
                <div class="segment-title">Техника</div>
                <div class="segment-subtitle">Нормы работы техники</div>
              </div>
              <NButton size="small" type="primary" @click="addEquipmentRow">+ Добавить строку</NButton>
            </div>
            <div class="segment-body">
              <NDataTable
                class="s360-cards table-full"
                :columns="equipmentColumns"
                :data="equipmentRows"
                :loading="equipmentsLoading"
                :row-key="equipmentRowKey"
                :bordered="false"
                size="small"
              />
            </div>
          </NTabPane>

          <NTabPane name="services" :tab="tabLabel('Услуги', serviceRows.length)">
            <div class="segment-header">
              <div>
                <div class="segment-title">Услуги</div>
                <div class="segment-subtitle">Услуги сторонних организаций</div>
              </div>
              <NButton size="small" type="primary" @click="addServiceRow">+ Добавить строку</NButton>
            </div>
            <div class="segment-body">
              <NDataTable
                class="s360-cards table-full"
                :columns="serviceColumns"
                :data="serviceRows"
                :loading="servicesLoading"
                :row-key="serviceRowKey"
                :bordered="false"
                size="small"
              />
            </div>
          </NTabPane>

          <NTabPane name="personnel" :tab="tabLabel('Исполнители', personnelRows.length)">
            <div class="segment-header">
              <div>
                <div class="segment-title">Исполнители</div>
                <div class="segment-subtitle">Нормы трудозатрат</div>
              </div>
              <NButton size="small" type="primary" @click="addPersonnelRow">+ Добавить строку</NButton>
            </div>
            <div class="segment-body">
              <NDataTable
                class="s360-cards table-full"
                :columns="personnelColumns"
                :data="personnelRows"
                :loading="personnelLoading"
                :row-key="personnelRowKey"
                :bordered="false"
                size="small"
              />
            </div>
          </NTabPane>
        </NTabs>
      </div>
    </component>
  </section>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDataTable,
  NInput,
  NInputNumber,
  NIcon,
  NModal,
  NPagination,
  NPopconfirm,
  NSelect,
  NTag,
  NTabs,
  NTabPane,
  type DataTableColumns,
  type SelectOption,
  useMessage,
} from 'naive-ui'
import { objectsRpc, rpc as nsiRpc } from '@shared/api'
import { extractRecords, normalizeText, safeString } from '@shared/lib'
import { useIsMobile } from '@/shared/composables/useIsMobile'
import { CheckmarkOutline, TrashOutline } from '@vicons/ionicons5'

interface RawResourceNormRecord {
  id?: number | string | null
  relcls?: number | string | null
  name?: string | null
  relobjTaskWork?: number | string | null
  idTaskWork?: number | string | null
  relobj?: number | string | null
  idrom1?: number | string | null
  clsrom1?: number | string | null
  namerom1?: string | null
  idrom2?: number | string | null
  clsrom2?: number | string | null
  namerom2?: string | null
  material?: RawResourceNormMaterial[] | null
  tool?: RawResourceNormTool[] | null
  equipment?: RawResourceNormEquipment[] | null
  service?: RawResourceNormService[] | null
  personnel?: RawResourceNormPersonnel[] | null
}

interface RawResourceNormMaterial {
  id?: number | string | null
  cls?: number | string | null
  name?: string | null
  idMaterial?: number | string | null
  nameMaterial?: string | null
  nameMeasure?: string | null
  objMaterial?: number | string | null
  pvMaterial?: number | string | null
  idMeasure?: number | string | null
  meaMeasure?: number | string | null
  pvMeasure?: number | string | null
  idTaskWork?: number | string | null
  pvTaskWork?: number | string | null
  idUser?: number | string | null
  objUser?: number | string | null
  pvUser?: number | string | null
  idValue?: number | string | null
  idUpdatedAt?: number | string | null
  UpdatedAt?: string | null
  Value?: number | string | null
}

interface RawResourceNormTool {
  id?: number | string | null
  cls?: number | string | null
  name?: string | null
  idTypTool?: number | string | null
  fvTypTool?: number | string | null
  pvTypTool?: number | string | null
  idTaskWork?: number | string | null
  pvTaskWork?: number | string | null
  idUser?: number | string | null
  objUser?: number | string | null
  pvUser?: number | string | null
  idValue?: number | string | null
  idUpdatedAt?: number | string | null
  UpdatedAt?: string | null
  nameTypTool?: string | null
  Value?: number | string | null
}

interface RawResourceNormEquipment {
  id?: number | string | null
  cls?: number | string | null
  name?: string | null
  idTypEquipment?: number | string | null
  fvTypEquipment?: number | string | null
  pvTypEquipment?: number | string | null
  idTaskWork?: number | string | null
  pvTaskWork?: number | string | null
  idUser?: number | string | null
  objUser?: number | string | null
  pvUser?: number | string | null
  idValue?: number | string | null
  idQuantity?: number | string | null
  idUpdatedAt?: number | string | null
  UpdatedAt?: string | null
  nameTypEquipment?: string | null
  Value?: number | string | null
  Quantity?: number | string | null
}

interface RawResourceNormService {
  id?: number | string | null
  cls?: number | string | null
  name?: string | null
  idTpService?: number | string | null
  objTpService?: number | string | null
  pvTpService?: number | string | null
  idTaskWork?: number | string | null
  pvTaskWork?: number | string | null
  idUser?: number | string | null
  objUser?: number | string | null
  pvUser?: number | string | null
  idValue?: number | string | null
  idUpdatedAt?: number | string | null
  UpdatedAt?: string | null
  nameTpService?: string | null
  Value?: number | string | null
}

interface RawResourceNormPersonnel {
  id?: number | string | null
  cls?: number | string | null
  name?: string | null
  idPosition?: number | string | null
  fvPosition?: number | string | null
  pvPosition?: number | string | null
  idTaskWork?: number | string | null
  pvTaskWork?: number | string | null
  idUser?: number | string | null
  objUser?: number | string | null
  pvUser?: number | string | null
  idValue?: number | string | null
  idQuantity?: number | string | null
  idUpdatedAt?: number | string | null
  UpdatedAt?: string | null
  namePosition?: string | null
  Value?: number | string | null
  Quantity?: number | string | null
}

interface ResourceNormRow {
  rowKey: string
  id: number | null
  relcls: number | null
  taskWorkId: number | null
  taskWorkCls: number | null
  name: string
  idrom1: number | null
  clsrom1: number | null
  namerom1: string
  idrom2: number | null
  clsrom2: number | null
  namerom2: string
  personnelItems: string[]
  materialItems: string[]
  toolItems: string[]
  equipmentItems: string[]
  serviceItems: string[]
  searchBlob: string
}

interface MaterialRow {
  rowKey: string
  id: number | null
  cls: number | null
  name: string
  idMaterial: number | null
  objMaterial: number | null
  pvMaterial: number | null
  idMeasure: number | null
  meaMeasure: number | null
  pvMeasure: number | null
  idTaskWork: number | null
  pvTaskWork: number | null
  idUser: number | null
  objUser: number | null
  pvUser: number | null
  idValue: number | null
  idUpdatedAt: number | null
  updatedAt: string | null
  value: number | null
  materialKey: string | null
  measureKey: string | null
  nameMaterial: string
  nameMeasure: string
  isSaving: boolean
  isDeleting: boolean
  isNew: boolean
}

interface ToolRow {
  rowKey: string
  id: number | null
  cls: number | null
  name: string
  idTypTool: number | null
  fvTypTool: number | null
  pvTypTool: number | null
  idTaskWork: number | null
  pvTaskWork: number | null
  idUser: number | null
  objUser: number | null
  pvUser: number | null
  idValue: number | null
  idUpdatedAt: number | null
  updatedAt: string | null
  value: number | null
  toolKey: string | null
  nameTypTool: string
  isSaving: boolean
  isDeleting: boolean
  isNew: boolean
}

interface EquipmentRow {
  rowKey: string
  id: number | null
  cls: number | null
  name: string
  idTypEquipment: number | null
  fvTypEquipment: number | null
  pvTypEquipment: number | null
  idTaskWork: number | null
  pvTaskWork: number | null
  idUser: number | null
  objUser: number | null
  pvUser: number | null
  idValue: number | null
  idQuantity: number | null
  idUpdatedAt: number | null
  updatedAt: string | null
  value: number | null
  quantity: number | null
  equipmentKey: string | null
  nameTypEquipment: string
  isSaving: boolean
  isDeleting: boolean
  isNew: boolean
}

interface PersonnelRow {
  rowKey: string
  id: number | null
  cls: number | null
  name: string
  idPosition: number | null
  fvPosition: number | null
  pvPosition: number | null
  idTaskWork: number | null
  pvTaskWork: number | null
  idUser: number | null
  objUser: number | null
  pvUser: number | null
  idValue: number | null
  idQuantity: number | null
  idUpdatedAt: number | null
  updatedAt: string | null
  value: number | null
  quantity: number | null
  positionKey: string | null
  namePosition: string
  isSaving: boolean
  isDeleting: boolean
  isNew: boolean
}

interface ServiceRow {
  rowKey: string
  id: number | null
  cls: number | null
  name: string
  idTpService: number | null
  objTpService: number | null
  pvTpService: number | null
  idTaskWork: number | null
  pvTaskWork: number | null
  idUser: number | null
  objUser: number | null
  pvUser: number | null
  idValue: number | null
  idUpdatedAt: number | null
  updatedAt: string | null
  value: number | null
  serviceKey: string | null
  nameTpService: string
  isSaving: boolean
  isDeleting: boolean
  isNew: boolean
}

type DirectoryOption = SelectOption & { id: number; pv: number; label: string }
type ToolOption = SelectOption & { fv: number; pv: number | null; label: string }
type EquipmentOption = SelectOption & { fv: number; pv: number | null; label: string }
type PersonnelOption = SelectOption & { fv: number; pv: number | null; label: string }

interface PaginationState {
  page: number
  pageSize: number
}

const message = useMessage()
const { isMobile } = useIsMobile()
const { isMobile: isCompactEditor } = useIsMobile('(max-width: 1024px)')
const router = useRouter()
const route = useRoute()

const loading = ref(false)
const search = ref('')
const norms = ref<ResourceNormRow[]>([])
const pagination = reactive<PaginationState>({ page: 1, pageSize: 20 })
const editorOpen = ref(false)
const activeRow = ref<ResourceNormRow | null>(null)
const activeTab = ref<'materials' | 'tools' | 'equipment' | 'services' | 'personnel'>('materials')
const editorTaskWorkId = computed(() => asNumber(route.params.taskWorkId))
const isEditorRoute = computed(() => isCompactEditor.value && editorTaskWorkId.value != null)
const editorVisible = computed(() => (isEditorRoute.value ? true : editorOpen.value))
const editorWrapper = computed(() => (isEditorRoute.value ? 'div' : NModal))
const editorWrapperProps = computed(() => {
  if (isEditorRoute.value) {
    return { class: 'editor-page' }
  }
  return {
    show: editorOpen.value,
    'onUpdate:show': (value: boolean) => {
      editorOpen.value = value
    },
    preset: 'card',
    title: 'Редактирование нормы расхода ресурсов',
    style: 'width: min(980px, 96vw)',
  }
})

const materialsLoading = ref(false)
const materialRows = ref<MaterialRow[]>([])
const materialOptions = ref<DirectoryOption[]>([])
const measureOptions = ref<DirectoryOption[]>([])
const materialDirectoryLoading = ref(false)
const measureDirectoryLoading = ref(false)

const toolsLoading = ref(false)
const toolRows = ref<ToolRow[]>([])
const toolOptions = ref<ToolOption[]>([])
const toolDirectoryLoading = ref(false)

const equipmentsLoading = ref(false)
const equipmentRows = ref<EquipmentRow[]>([])
const equipmentOptions = ref<EquipmentOption[]>([])
const equipmentDirectoryLoading = ref(false)

const personnelLoading = ref(false)
const personnelRows = ref<PersonnelRow[]>([])
const personnelOptions = ref<PersonnelOption[]>([])
const personnelDirectoryLoading = ref(false)

const servicesLoading = ref(false)
const serviceRows = ref<ServiceRow[]>([])
const serviceOptions = ref<DirectoryOption[]>([])
const serviceDirectoryLoading = ref(false)

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) return null
    const num = Number(normalized)
    return Number.isNaN(num) ? null : num
  }
  return null
}

function asText(value: unknown): string {
  return safeString(value).trim()
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (!(key in source)) continue
    const parsed = asNumber(source[key])
    if (parsed != null) return parsed
  }
  return null
}

function pickString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (!(key in source)) continue
    const value = asText(source[key])
    if (value) return value
  }
  return ''
}

function buildSearchBlob(fields: Array<string | number | null | undefined>): string {
  const joined = fields.map((value) => safeString(value)).join(' ')
  return normalizeText(joined)
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function buildPersonnelLabel(item: RawResourceNormPersonnel): string {
  const name = asText(item.namePosition)
  const value = asText(item.Value)
  const quantity = asText(item.Quantity)
  const parts: string[] = []
  if (name) parts.push(name)
  if (quantity) parts.push(`${quantity} чел`)
  if (value) parts.push(`${value} мин`)
  return parts.join(' ').trim()
}

function buildMaterialLabel(item: RawResourceNormMaterial): string {
  const name = asText(item.nameMaterial)
  const value = asText(item.Value)
  const measure = asText(item.nameMeasure)
  const amount = [measure, value].filter(Boolean).join(' ')
  if (name && amount) return `${name} ${amount}`.trim()
  return (name || amount).trim()
}

function buildToolLabel(item: RawResourceNormTool): string {
  const name = asText(item.nameTypTool)
  const value = asText(item.Value)
  if (name && value) return `${name} ${value}`.trim()
  return (name || value).trim()
}

function buildEquipmentLabel(item: RawResourceNormEquipment): string {
  const name = asText(item.nameTypEquipment)
  const value = asText(item.Value)
  const quantity = asText(item.Quantity)
  const parts: string[] = []
  if (name) parts.push(name)
  if (quantity) parts.push(`${quantity} единиц`)
  if (value) parts.push(`${value} мин`)
  return parts.join(' ').trim()
}

function buildServiceLabel(item: RawResourceNormService): string {
  const name = asText(item.nameTpService)
  const value = asText(item.Value)
  if (name && value) return `${name} ${value}`.trim()
  return (name || value).trim()
}

function normalizeItems<T>(items: T[], builder: (item: T) => string): string[] {
  return items.map(builder).filter((item) => item.length > 0)
}

function normalizeRecord(record: RawResourceNormRecord, index: number): ResourceNormRow {
  const id = asNumber(record.id)
  const relcls = asNumber(record.relcls)
  const taskWorkId = asNumber(record.relobjTaskWork ?? record.idTaskWork ?? record.relobj ?? record.id)
  const taskWorkCls = relcls
  const idrom1 = asNumber(record.idrom1)
  const clsrom1 = asNumber(record.clsrom1)
  const idrom2 = asNumber(record.idrom2)
  const clsrom2 = asNumber(record.clsrom2)
  const namerom1 = asText(record.namerom1)
  const namerom2 = asText(record.namerom2)
  const explicitName = asText(record.name)
  const name = explicitName || [namerom1, namerom2].filter(Boolean).join(' <=> ')
  const rowKey = id != null ? `norm-${id}` : `norm-${idrom1 ?? 'x'}-${idrom2 ?? 'y'}-${index}`
  const personnelItems = normalizeItems(
    toArray<RawResourceNormPersonnel>(record.personnel),
    buildPersonnelLabel,
  )
  const materialItems = normalizeItems(
    toArray<RawResourceNormMaterial>(record.material),
    buildMaterialLabel,
  )
  const toolItems = normalizeItems(toArray<RawResourceNormTool>(record.tool), buildToolLabel)
  const equipmentItems = normalizeItems(
    toArray<RawResourceNormEquipment>(record.equipment),
    buildEquipmentLabel,
  )
  const serviceItems = normalizeItems(
    toArray<RawResourceNormService>(record.service),
    buildServiceLabel,
  )
  const searchBlob = buildSearchBlob([
    id,
    relcls,
    name,
    idrom1,
    clsrom1,
    namerom1,
    idrom2,
    clsrom2,
    namerom2,
    ...personnelItems,
    ...materialItems,
    ...toolItems,
    ...equipmentItems,
    ...serviceItems,
  ])

  return {
    rowKey,
    id,
    relcls,
    taskWorkId,
    taskWorkCls,
    name,
    idrom1,
    clsrom1,
    namerom1,
    idrom2,
    clsrom2,
    namerom2,
    personnelItems,
    materialItems,
    toolItems,
    equipmentItems,
    serviceItems,
    searchBlob,
  }
}

async function loadResourceNorms() {
  loading.value = true
  try {
    const response = await nsiRpc<unknown>('data/loadResourceNormative', [0, 'ru'])
    const records = extractRecords<RawResourceNormRecord>(response)
    norms.value = records.map((record, index) => normalizeRecord(record, index))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить нормы ресурсов: ${reason}`)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadResourceNorms()
})

async function ensureMaterialDirectory() {
  if (materialOptions.value.length || materialDirectoryLoading.value) return
  materialDirectoryLoading.value = true
  try {
    const response = await objectsRpc<unknown>(
      'data/loadObjList',
      ['Cls_Material', 'Prop_Material', 'resourcedata'],
    )
    const records = extractRecords<Record<string, unknown>>(response)
    materialOptions.value = records
      .map((record) => {
        const id = pickNumber(record, ['id', 'ID'])
        const pv = pickNumber(record, ['pv', 'PV', 'pvMaterial'])
        if (id == null || pv == null) return null
        const label = pickString(record, ['fullName', 'FullName', 'name', 'Name']) || `Материал ${id}`
        return { label, value: `${id}:${pv}`, id, pv }
      })
      .filter(Boolean) as DirectoryOption[]
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить материалы: ${reason}`)
  } finally {
    materialDirectoryLoading.value = false
  }
}

async function ensureMeasureDirectory() {
  if (measureOptions.value.length || measureDirectoryLoading.value) return
  measureDirectoryLoading.value = true
  try {
    const response = await nsiRpc<unknown>('data/loadMeasure', ['Prop_Measure'])
    const records = extractRecords<Record<string, unknown>>(response)
    measureOptions.value = records
      .map((record) => {
        const id = pickNumber(record, ['id', 'ID'])
        const pv = pickNumber(record, ['pv', 'PV', 'pvMeasure'])
        if (id == null || pv == null) return null
        const label = pickString(record, ['name', 'Name', 'text', 'Text']) || `Ед. ${id}`
        return { label, value: `${id}:${pv}`, id, pv }
      })
      .filter(Boolean) as DirectoryOption[]
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить единицы измерения: ${reason}`)
  } finally {
    measureDirectoryLoading.value = false
  }
}

async function ensureToolDirectory() {
  if (toolOptions.value.length || toolDirectoryLoading.value) return
  toolDirectoryLoading.value = true
  try {
    const response = await objectsRpc<unknown>('data/loadFactorValForSelect', ['Prop_TypTool'])
    const records = extractRecords<Record<string, unknown>>(response)
    toolOptions.value = records
      .map((record) => {
        const fv = pickNumber(record, ['fv', 'FV', 'id', 'ID'])
        if (fv == null) return null
        const pv = pickNumber(record, ['pv', 'PV'])
        const label =
          pickString(record, ['name', 'Name', 'value', 'Value', 'code', 'Code']) ||
          `Инструмент ${fv}`
        const value = pv != null ? `${fv}:${pv}` : `missing:${fv}`
        return { label, value, fv, pv: pv ?? null, disabled: pv == null }
      })
      .filter(Boolean) as ToolOption[]
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить инструменты: ${reason}`)
  } finally {
    toolDirectoryLoading.value = false
  }
}

async function ensureEquipmentDirectory() {
  if (equipmentOptions.value.length || equipmentDirectoryLoading.value) return
  equipmentDirectoryLoading.value = true
  try {
    const response = await objectsRpc<unknown>('data/loadFactorValForSelect', ['Prop_TypEquipment'])
    const records = extractRecords<Record<string, unknown>>(response)
    equipmentOptions.value = records
      .map((record) => {
        const fv = pickNumber(record, ['fv', 'FV', 'id', 'ID'])
        if (fv == null) return null
        const pv = pickNumber(record, ['pv', 'PV'])
        const label =
          pickString(record, ['name', 'Name', 'value', 'Value', 'code', 'Code']) ||
          `Техника ${fv}`
        const value = pv != null ? `${fv}:${pv}` : `missing:${fv}`
        return { label, value, fv, pv: pv ?? null, disabled: pv == null }
      })
      .filter(Boolean) as EquipmentOption[]
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить технику: ${reason}`)
  } finally {
    equipmentDirectoryLoading.value = false
  }
}

async function ensurePersonnelDirectory() {
  if (personnelOptions.value.length || personnelDirectoryLoading.value) return
  personnelDirectoryLoading.value = true
  try {
    const response = await objectsRpc<unknown>('data/loadFactorValForSelect', ['Prop_Position'])
    const records = extractRecords<Record<string, unknown>>(response)
    personnelOptions.value = records
      .map((record) => {
        const fv = pickNumber(record, ['fv', 'FV', 'id', 'ID'])
        if (fv == null) return null
        const pv = pickNumber(record, ['pv', 'PV'])
        const label =
          pickString(record, ['name', 'Name', 'value', 'Value', 'code', 'Code']) ||
          `Исполнитель ${fv}`
        const value = pv != null ? `${fv}:${pv}` : `missing:${fv}`
        return { label, value, fv, pv: pv ?? null, disabled: pv == null }
      })
      .filter(Boolean) as PersonnelOption[]
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить исполнителей: ${reason}`)
  } finally {
    personnelDirectoryLoading.value = false
  }
}

async function ensureServiceDirectory() {
  if (serviceOptions.value.length || serviceDirectoryLoading.value) return
  serviceDirectoryLoading.value = true
  try {
    const response = await objectsRpc<unknown>(
      'data/loadObjList',
      ['Cls_TpService', 'Prop_TpService', 'resourcedata'],
    )
    const records = extractRecords<Record<string, unknown>>(response)
    serviceOptions.value = records
      .map((record) => {
        const id = pickNumber(record, ['id', 'ID'])
        const pv = pickNumber(record, ['pv', 'PV', 'pvTpService'])
        if (id == null || pv == null) return null
        const label =
          pickString(record, ['fullName', 'FullName', 'name', 'Name']) || `Услуга ${id}`
        return { label, value: `${id}:${pv}`, id, pv }
      })
      .filter(Boolean) as DirectoryOption[]
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить услуги: ${reason}`)
  } finally {
    serviceDirectoryLoading.value = false
  }
}

function normalizeMaterialRecord(record: RawResourceNormMaterial, index: number): MaterialRow {
  const source = asRecord(record)
  const id = pickNumber(source, ['id', 'ID'])
  const cls = pickNumber(source, ['cls', 'CLS'])
  const name = pickString(source, ['name', 'Name'])
  const idMaterial = pickNumber(source, ['idMaterial', 'IDMATERIAL'])
  const objMaterial = pickNumber(source, ['objMaterial', 'ObjMaterial'])
  const pvMaterial = pickNumber(source, ['pvMaterial', 'PvMaterial'])
  const idMeasure = pickNumber(source, ['idMeasure', 'IDMEASURE'])
  const meaMeasure = pickNumber(source, ['meaMeasure', 'MeaMeasure', 'idMeasure', 'IdMeasure'])
  const pvMeasure = pickNumber(source, ['pvMeasure', 'PvMeasure'])
  const idTaskWork = pickNumber(source, ['idTaskWork', 'IDTASKWORK'])
  const pvTaskWork = pickNumber(source, ['pvTaskWork', 'PVTASKWORK'])
  const idUser = pickNumber(source, ['idUser', 'IDUSER'])
  const objUser = pickNumber(source, ['objUser', 'OBJUSER'])
  const pvUser = pickNumber(source, ['pvUser', 'PVUSER'])
  const idValue = pickNumber(source, ['idValue', 'IDVALUE'])
  const idUpdatedAt = pickNumber(source, ['idUpdatedAt', 'IDUPDATEDAT'])
  const updatedAt = pickString(source, ['UpdatedAt', 'updatedAt'])
  const value = pickNumber(source, ['Value', 'value'])
  const nameMaterial = pickString(source, ['nameMaterial', 'NameMaterial']) || ''
  const nameMeasure = pickString(source, ['nameMeasure', 'NameMeasure']) || ''
  const materialKey =
    objMaterial != null && pvMaterial != null ? `${objMaterial}:${pvMaterial}` : null
  const measureKey = meaMeasure != null && pvMeasure != null ? `${meaMeasure}:${pvMeasure}` : null

  return {
    rowKey: id != null ? `material-${id}` : `material-${index}`,
    id: id ?? null,
    cls: cls ?? null,
    name: name || nameMaterial,
    idMaterial: idMaterial ?? null,
    objMaterial: objMaterial ?? null,
    pvMaterial: pvMaterial ?? null,
    idMeasure: idMeasure ?? null,
    meaMeasure: meaMeasure ?? null,
    pvMeasure: pvMeasure ?? null,
    idTaskWork: idTaskWork ?? null,
    pvTaskWork: pvTaskWork ?? null,
    idUser: idUser ?? null,
    objUser: objUser ?? null,
    pvUser: pvUser ?? null,
    idValue: idValue ?? null,
    idUpdatedAt: idUpdatedAt ?? null,
    updatedAt: updatedAt || null,
    value: value ?? null,
    materialKey,
    measureKey,
    nameMaterial,
    nameMeasure,
    isSaving: false,
    isDeleting: false,
    isNew: false,
  }
}

function normalizeToolRecord(record: RawResourceNormTool, index: number): ToolRow {
  const source = asRecord(record)
  const id = pickNumber(source, ['id', 'ID'])
  const cls = pickNumber(source, ['cls', 'CLS'])
  const name = pickString(source, ['name', 'Name'])
  const idTypTool = pickNumber(source, ['idTypTool', 'IDTYPTOOL'])
  const fvTypTool = pickNumber(source, ['fvTypTool', 'FVTYPTOOL', 'fv', 'FV'])
  const pvTypTool = pickNumber(source, ['pvTypTool', 'PVTYPTOOL', 'pv', 'PV'])
  const idTaskWork = pickNumber(source, ['idTaskWork', 'IDTASKWORK'])
  const pvTaskWork = pickNumber(source, ['pvTaskWork', 'PVTASKWORK'])
  const idUser = pickNumber(source, ['idUser', 'IDUSER'])
  const objUser = pickNumber(source, ['objUser', 'OBJUSER'])
  const pvUser = pickNumber(source, ['pvUser', 'PVUSER'])
  const idValue = pickNumber(source, ['idValue', 'IDVALUE'])
  const idUpdatedAt = pickNumber(source, ['idUpdatedAt', 'IDUPDATEDAT'])
  const updatedAt = pickString(source, ['UpdatedAt', 'updatedAt'])
  const value = pickNumber(source, ['Value', 'value'])
  const nameTypTool = pickString(source, ['nameTypTool', 'NameTypTool']) || ''
  const toolKey = fvTypTool != null && pvTypTool != null ? `${fvTypTool}:${pvTypTool}` : null

  return {
    rowKey: id != null ? `tool-${id}` : `tool-${index}`,
    id: id ?? null,
    cls: cls ?? null,
    name: name || nameTypTool,
    idTypTool: idTypTool ?? null,
    fvTypTool: fvTypTool ?? null,
    pvTypTool: pvTypTool ?? null,
    idTaskWork: idTaskWork ?? null,
    pvTaskWork: pvTaskWork ?? null,
    idUser: idUser ?? null,
    objUser: objUser ?? null,
    pvUser: pvUser ?? null,
    idValue: idValue ?? null,
    idUpdatedAt: idUpdatedAt ?? null,
    updatedAt: updatedAt || null,
    value: value ?? null,
    toolKey,
    nameTypTool,
    isSaving: false,
    isDeleting: false,
    isNew: false,
  }
}

function normalizeEquipmentRecord(record: RawResourceNormEquipment, index: number): EquipmentRow {
  const source = asRecord(record)
  const id = pickNumber(source, ['id', 'ID'])
  const cls = pickNumber(source, ['cls', 'CLS'])
  const name = pickString(source, ['name', 'Name'])
  const idTypEquipment = pickNumber(source, ['idTypEquipment', 'IDTYPEQUIPMENT'])
  const fvTypEquipment = pickNumber(source, ['fvTypEquipment', 'FVTYP_EQUIPMENT', 'fv', 'FV'])
  const pvTypEquipment = pickNumber(source, ['pvTypEquipment', 'PVTYP_EQUIPMENT', 'pv', 'PV'])
  const idTaskWork = pickNumber(source, ['idTaskWork', 'IDTASKWORK'])
  const pvTaskWork = pickNumber(source, ['pvTaskWork', 'PVTASKWORK'])
  const idUser = pickNumber(source, ['idUser', 'IDUSER'])
  const objUser = pickNumber(source, ['objUser', 'OBJUSER'])
  const pvUser = pickNumber(source, ['pvUser', 'PVUSER'])
  const idValue = pickNumber(source, ['idValue', 'IDVALUE'])
  const idQuantity = pickNumber(source, ['idQuantity', 'IDQUANTITY'])
  const idUpdatedAt = pickNumber(source, ['idUpdatedAt', 'IDUPDATEDAT'])
  const updatedAt = pickString(source, ['UpdatedAt', 'updatedAt'])
  const value = pickNumber(source, ['Value', 'value'])
  const quantity = pickNumber(source, ['Quantity', 'quantity'])
  const nameTypEquipment = pickString(source, ['nameTypEquipment', 'NameTypEquipment']) || ''
  const equipmentKey =
    fvTypEquipment != null && pvTypEquipment != null ? `${fvTypEquipment}:${pvTypEquipment}` : null

  return {
    rowKey: id != null ? `equipment-${id}` : `equipment-${index}`,
    id: id ?? null,
    cls: cls ?? null,
    name: name || nameTypEquipment,
    idTypEquipment: idTypEquipment ?? null,
    fvTypEquipment: fvTypEquipment ?? null,
    pvTypEquipment: pvTypEquipment ?? null,
    idTaskWork: idTaskWork ?? null,
    pvTaskWork: pvTaskWork ?? null,
    idUser: idUser ?? null,
    objUser: objUser ?? null,
    pvUser: pvUser ?? null,
    idValue: idValue ?? null,
    idQuantity: idQuantity ?? null,
    idUpdatedAt: idUpdatedAt ?? null,
    updatedAt: updatedAt || null,
    value: value ?? null,
    quantity: quantity ?? null,
    equipmentKey,
    nameTypEquipment,
    isSaving: false,
    isDeleting: false,
    isNew: false,
  }
}

function normalizePersonnelRecord(record: RawResourceNormPersonnel, index: number): PersonnelRow {
  const source = asRecord(record)
  const id = pickNumber(source, ['id', 'ID'])
  const cls = pickNumber(source, ['cls', 'CLS'])
  const name = pickString(source, ['name', 'Name'])
  const idPosition = pickNumber(source, ['idPosition', 'IDPOSITION'])
  const fvPosition = pickNumber(source, ['fvPosition', 'FVPOSITION', 'fv', 'FV'])
  const pvPosition = pickNumber(source, ['pvPosition', 'PVPOSITION', 'pv', 'PV'])
  const idTaskWork = pickNumber(source, ['idTaskWork', 'IDTASKWORK'])
  const pvTaskWork = pickNumber(source, ['pvTaskWork', 'PVTASKWORK'])
  const idUser = pickNumber(source, ['idUser', 'IDUSER'])
  const objUser = pickNumber(source, ['objUser', 'OBJUSER'])
  const pvUser = pickNumber(source, ['pvUser', 'PVUSER'])
  const idValue = pickNumber(source, ['idValue', 'IDVALUE'])
  const idQuantity = pickNumber(source, ['idQuantity', 'IDQUANTITY'])
  const idUpdatedAt = pickNumber(source, ['idUpdatedAt', 'IDUPDATEDAT'])
  const updatedAt = pickString(source, ['UpdatedAt', 'updatedAt'])
  const value = pickNumber(source, ['Value', 'value'])
  const quantity = pickNumber(source, ['Quantity', 'quantity'])
  const namePosition = pickString(source, ['namePosition', 'NamePosition']) || ''
  const positionKey =
    fvPosition != null && pvPosition != null ? `${fvPosition}:${pvPosition}` : null

  return {
    rowKey: id != null ? `personnel-${id}` : `personnel-${index}`,
    id: id ?? null,
    cls: cls ?? null,
    name: name || namePosition,
    idPosition: idPosition ?? null,
    fvPosition: fvPosition ?? null,
    pvPosition: pvPosition ?? null,
    idTaskWork: idTaskWork ?? null,
    pvTaskWork: pvTaskWork ?? null,
    idUser: idUser ?? null,
    objUser: objUser ?? null,
    pvUser: pvUser ?? null,
    idValue: idValue ?? null,
    idQuantity: idQuantity ?? null,
    idUpdatedAt: idUpdatedAt ?? null,
    updatedAt: updatedAt || null,
    value: value ?? null,
    quantity: quantity ?? null,
    positionKey,
    namePosition,
    isSaving: false,
    isDeleting: false,
    isNew: false,
  }
}

function normalizeServiceRecord(record: RawResourceNormService, index: number): ServiceRow {
  const source = asRecord(record)
  const id = pickNumber(source, ['id', 'ID'])
  const cls = pickNumber(source, ['cls', 'CLS'])
  const name = pickString(source, ['name', 'Name'])
  const idTpService = pickNumber(source, ['idTpService', 'IDTPSERVICE'])
  const objTpService = pickNumber(source, ['objTpService', 'OBJTPSERVICE'])
  const pvTpService = pickNumber(source, ['pvTpService', 'PVTPSERVICE'])
  const idTaskWork = pickNumber(source, ['idTaskWork', 'IDTASKWORK'])
  const pvTaskWork = pickNumber(source, ['pvTaskWork', 'PVTASKWORK'])
  const idUser = pickNumber(source, ['idUser', 'IDUSER'])
  const objUser = pickNumber(source, ['objUser', 'OBJUSER'])
  const pvUser = pickNumber(source, ['pvUser', 'PVUSER'])
  const idValue = pickNumber(source, ['idValue', 'IDVALUE'])
  const idUpdatedAt = pickNumber(source, ['idUpdatedAt', 'IDUPDATEDAT'])
  const updatedAt = pickString(source, ['UpdatedAt', 'updatedAt'])
  const value = pickNumber(source, ['Value', 'value'])
  const nameTpService = pickString(source, ['nameTpService', 'NameTpService']) || ''
  const serviceKey =
    objTpService != null && pvTpService != null ? `${objTpService}:${pvTpService}` : null

  return {
    rowKey: id != null ? `service-${id}` : `service-${index}`,
    id: id ?? null,
    cls: cls ?? null,
    name: name || nameTpService,
    idTpService: idTpService ?? null,
    objTpService: objTpService ?? null,
    pvTpService: pvTpService ?? null,
    idTaskWork: idTaskWork ?? null,
    pvTaskWork: pvTaskWork ?? null,
    idUser: idUser ?? null,
    objUser: objUser ?? null,
    pvUser: pvUser ?? null,
    idValue: idValue ?? null,
    idUpdatedAt: idUpdatedAt ?? null,
    updatedAt: updatedAt || null,
    value: value ?? null,
    serviceKey,
    nameTpService,
    isSaving: false,
    isDeleting: false,
    isNew: false,
  }
}

async function loadNormativeMaterials(row: ResourceNormRow) {
  if (!row.taskWorkId) {
    materialRows.value = []
    message.error('Не найден идентификатор связи работы и задачи')
    return
  }

  materialsLoading.value = true
  try {
    const response = await nsiRpc<unknown>('data/loadNormativeMaterial', [row.taskWorkId, 'ru'])
    const records = extractRecords<RawResourceNormMaterial>(response)
    materialRows.value = records.map((record, index) => normalizeMaterialRecord(record, index))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить материалы: ${reason}`)
  } finally {
    materialsLoading.value = false
  }
}

async function loadNormativeTools(row: ResourceNormRow) {
  if (!row.taskWorkId) {
    toolRows.value = []
    message.error('Не найден идентификатор связи работы и задачи')
    return
  }

  toolsLoading.value = true
  try {
    const response = await nsiRpc<unknown>('data/loadNormativeTool', [row.taskWorkId, 'ru'])
    const records = extractRecords<RawResourceNormTool>(response)
    toolRows.value = records.map((record, index) => normalizeToolRecord(record, index))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить инструменты: ${reason}`)
  } finally {
    toolsLoading.value = false
  }
}

async function loadNormativeEquipment(row: ResourceNormRow) {
  if (!row.taskWorkId) {
    equipmentRows.value = []
    message.error('Не найден идентификатор связи работы и задачи')
    return
  }

  equipmentsLoading.value = true
  try {
    const response = await nsiRpc<unknown>('data/loadNormativeEquipment', [row.taskWorkId, 'ru'])
    const records = extractRecords<RawResourceNormEquipment>(response)
    equipmentRows.value = records.map((record, index) => normalizeEquipmentRecord(record, index))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить технику: ${reason}`)
  } finally {
    equipmentsLoading.value = false
  }
}

async function loadNormativePersonnel(row: ResourceNormRow) {
  if (!row.taskWorkId) {
    personnelRows.value = []
    message.error('Не найден идентификатор связи работы и задачи')
    return
  }

  personnelLoading.value = true
  try {
    const response = await nsiRpc<unknown>('data/loadNormativePersonnel', [row.taskWorkId, 'ru'])
    const records = extractRecords<RawResourceNormPersonnel>(response)
    personnelRows.value = records.map((record, index) => normalizePersonnelRecord(record, index))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить исполнителей: ${reason}`)
  } finally {
    personnelLoading.value = false
  }
}

async function loadNormativeServices(row: ResourceNormRow) {
  if (!row.taskWorkId) {
    serviceRows.value = []
    message.error('Не найден идентификатор связи работы и задачи')
    return
  }

  servicesLoading.value = true
  try {
    const response = await nsiRpc<unknown>('data/loadNormativeTpService', [row.taskWorkId, 'ru'])
    const records = extractRecords<RawResourceNormService>(response)
    serviceRows.value = records.map((record, index) => normalizeServiceRecord(record, index))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось загрузить услуги: ${reason}`)
  } finally {
    servicesLoading.value = false
  }
}

async function openEditorInternal(row: ResourceNormRow, showModal = true) {
  if (!row.taskWorkId) {
    message.error('Не найден идентификатор связи работы и задачи')
    return
  }
  activeRow.value = row
  activeTab.value = 'materials'
  editorOpen.value = showModal
  await Promise.all([
    loadNormativeMaterials(row),
    loadNormativeTools(row),
    loadNormativeEquipment(row),
    loadNormativePersonnel(row),
    loadNormativeServices(row),
    ensureMaterialDirectory(),
    ensureMeasureDirectory(),
    ensureToolDirectory(),
    ensureEquipmentDirectory(),
    ensurePersonnelDirectory(),
    ensureServiceDirectory(),
  ])
}

async function findNormByTaskWorkId(taskWorkId: number): Promise<ResourceNormRow | null> {
  let row = norms.value.find((item) => item.taskWorkId === taskWorkId)
  if (row) return row
  await loadResourceNorms()
  row = norms.value.find((item) => item.taskWorkId === taskWorkId)
  return row ?? null
}

async function openEditorFromRoute(taskWorkId: number, showModal: boolean) {
  const row = await findNormByTaskWorkId(taskWorkId)
  if (!row) {
    message.error('Не удалось найти норму расхода ресурсов')
    if (isCompactEditor.value) {
      void router.replace({ name: 'resource-norms' })
    }
    return
  }
  await openEditorInternal(row, showModal)
}

function openEditor(row: ResourceNormRow) {
  if (isCompactEditor.value) {
    if (!row.taskWorkId) {
      message.error('Не найден идентификатор связи работы и задачи')
      return
    }
    void router.push({
      name: 'resource-norms-editor',
      params: { taskWorkId: row.taskWorkId },
    })
    return
  }
  void openEditorInternal(row, true)
}

function closeEditorPage() {
  void router.push({ name: 'resource-norms' })
}

function tabLabel(label: string, count: number) {
  return `${label} (${count})`
}

function createRowProps(row: ResourceNormRow) {
  if (isCompactEditor.value) {
    return {
      onClick: () => openEditor(row),
    }
  }
  return {
    onDblclick: () => openEditor(row),
  }
}

function addMaterialRow() {
  const stamp = Date.now()
  materialRows.value = [
    {
      rowKey: `new-${stamp}`,
      id: null,
      cls: null,
      name: '',
      idMaterial: null,
      objMaterial: null,
      pvMaterial: null,
      idMeasure: null,
      meaMeasure: null,
      pvMeasure: null,
      idTaskWork: activeRow.value?.taskWorkId ?? null,
      pvTaskWork: null,
      idUser: null,
      objUser: null,
      pvUser: null,
      idValue: null,
      idUpdatedAt: null,
      updatedAt: null,
      value: null,
      materialKey: null,
      measureKey: null,
      nameMaterial: '',
      nameMeasure: '',
      isSaving: false,
      isDeleting: false,
      isNew: true,
    },
    ...materialRows.value,
  ]
}

function materialRowKey(row: MaterialRow) {
  return row.rowKey
}

function addToolRow() {
  const stamp = Date.now()
  toolRows.value = [
    {
      rowKey: `new-tool-${stamp}`,
      id: null,
      cls: null,
      name: '',
      idTypTool: null,
      fvTypTool: null,
      pvTypTool: null,
      idTaskWork: activeRow.value?.taskWorkId ?? null,
      pvTaskWork: null,
      idUser: null,
      objUser: null,
      pvUser: null,
      idValue: null,
      idUpdatedAt: null,
      updatedAt: null,
      value: null,
      toolKey: null,
      nameTypTool: '',
      isSaving: false,
      isDeleting: false,
      isNew: true,
    },
    ...toolRows.value,
  ]
}

function toolRowKey(row: ToolRow) {
  return row.rowKey
}

function addEquipmentRow() {
  const stamp = Date.now()
  equipmentRows.value = [
    {
      rowKey: `new-equipment-${stamp}`,
      id: null,
      cls: null,
      name: '',
      idTypEquipment: null,
      fvTypEquipment: null,
      pvTypEquipment: null,
      idTaskWork: activeRow.value?.taskWorkId ?? null,
      pvTaskWork: null,
      idUser: null,
      objUser: null,
      pvUser: null,
      idValue: null,
      idQuantity: null,
      idUpdatedAt: null,
      updatedAt: null,
      value: null,
      quantity: null,
      equipmentKey: null,
      nameTypEquipment: '',
      isSaving: false,
      isDeleting: false,
      isNew: true,
    },
    ...equipmentRows.value,
  ]
}

function equipmentRowKey(row: EquipmentRow) {
  return row.rowKey
}

function addPersonnelRow() {
  const stamp = Date.now()
  personnelRows.value = [
    {
      rowKey: `new-personnel-${stamp}`,
      id: null,
      cls: null,
      name: '',
      idPosition: null,
      fvPosition: null,
      pvPosition: null,
      idTaskWork: activeRow.value?.taskWorkId ?? null,
      pvTaskWork: null,
      idUser: null,
      objUser: null,
      pvUser: null,
      idValue: null,
      idQuantity: null,
      idUpdatedAt: null,
      updatedAt: null,
      value: null,
      quantity: null,
      positionKey: null,
      namePosition: '',
      isSaving: false,
      isDeleting: false,
      isNew: true,
    },
    ...personnelRows.value,
  ]
}

function personnelRowKey(row: PersonnelRow) {
  return row.rowKey
}

function addServiceRow() {
  const stamp = Date.now()
  serviceRows.value = [
    {
      rowKey: `new-service-${stamp}`,
      id: null,
      cls: null,
      name: '',
      idTpService: null,
      objTpService: null,
      pvTpService: null,
      idTaskWork: activeRow.value?.taskWorkId ?? null,
      pvTaskWork: null,
      idUser: null,
      objUser: null,
      pvUser: null,
      idValue: null,
      idUpdatedAt: null,
      updatedAt: null,
      value: null,
      serviceKey: null,
      nameTpService: '',
      isSaving: false,
      isDeleting: false,
      isNew: true,
    },
    ...serviceRows.value,
  ]
}

function serviceRowKey(row: ServiceRow) {
  return row.rowKey
}

function resolveDateStamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function resolveDateTimeStamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}_${hours}:${minutes}`
}

function buildAutoName(prefix: string) {
  return `${prefix}_${resolveDateTimeStamp()}`
}

function readStorageNumber(key: string): number | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

function resolveUserMeta() {
  const objUser = readStorageNumber('objUser') ?? readStorageNumber('objUserId')
  const pvUser = readStorageNumber('pvUser') ?? readStorageNumber('pvUserId')
  return { objUser, pvUser }
}

function normalizeValue(value: number | string | null | undefined): string {
  if (value == null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const num = Number(trimmed.replace(',', '.'))
  return Number.isNaN(num) ? trimmed : String(num)
}

function parseCompositeKey(key: string | null): { fv: number | null; pv: number | null } {
  if (!key) return { fv: null, pv: null }
  if (key.startsWith('missing:')) return { fv: null, pv: null }
  const [fvRaw, pvRaw] = key.split(':')
  return { fv: asNumber(fvRaw), pv: asNumber(pvRaw) }
}

function buildMaterialSignature(row: MaterialRow): string | null {
  const value = normalizeValue(row.value)
  if (!value) return null

  if (
    row.objMaterial != null &&
    row.pvMaterial != null &&
    row.meaMeasure != null &&
    row.pvMeasure != null
  ) {
    return `id:${row.objMaterial}:${row.pvMaterial}|mea:${row.meaMeasure}:${row.pvMeasure}|val:${value}`
  }

  const name = normalizeText(row.nameMaterial)
  const measure = normalizeText(row.nameMeasure)
  if (!name || !measure) return null
  return `name:${name}|mea:${measure}|val:${value}`
}

function hasDuplicateMaterial(target: MaterialRow): boolean {
  const signature = buildMaterialSignature(target)
  if (!signature) return false
  return materialRows.value.some((row) => {
    if (row.rowKey === target.rowKey) return false
    const otherSignature = buildMaterialSignature(row)
    return otherSignature === signature
  })
}

function buildToolSignature(row: ToolRow): string | null {
  const value = normalizeValue(row.value)
  if (!value) return null

  if (row.fvTypTool != null && row.pvTypTool != null) {
    return `fv:${row.fvTypTool}|pv:${row.pvTypTool}|val:${value}`
  }

  const name = normalizeText(row.nameTypTool)
  if (!name) return null
  return `name:${name}|val:${value}`
}

function hasDuplicateTool(target: ToolRow): boolean {
  const signature = buildToolSignature(target)
  if (!signature) return false
  return toolRows.value.some((row) => {
    if (row.rowKey === target.rowKey) return false
    const otherSignature = buildToolSignature(row)
    return otherSignature === signature
  })
}

function buildEquipmentSignature(row: EquipmentRow): string | null {
  const value = normalizeValue(row.value)
  const quantity = normalizeValue(row.quantity)
  if (!value || !quantity) return null
  if (row.fvTypEquipment != null && row.pvTypEquipment != null) {
    return `fv:${row.fvTypEquipment}|pv:${row.pvTypEquipment}|qty:${quantity}|val:${value}`
  }
  const name = normalizeText(row.nameTypEquipment)
  if (!name) return null
  return `name:${name}|qty:${quantity}|val:${value}`
}

function hasDuplicateEquipment(target: EquipmentRow): boolean {
  const signature = buildEquipmentSignature(target)
  if (!signature) return false
  return equipmentRows.value.some((row) => {
    if (row.rowKey === target.rowKey) return false
    const otherSignature = buildEquipmentSignature(row)
    return otherSignature === signature
  })
}

function buildPersonnelSignature(row: PersonnelRow): string | null {
  const value = normalizeValue(row.value)
  const quantity = normalizeValue(row.quantity)
  if (!value || !quantity) return null
  if (row.fvPosition != null && row.pvPosition != null) {
    return `fv:${row.fvPosition}|pv:${row.pvPosition}|qty:${quantity}|val:${value}`
  }
  const name = normalizeText(row.namePosition)
  if (!name) return null
  return `name:${name}|qty:${quantity}|val:${value}`
}

function hasDuplicatePersonnel(target: PersonnelRow): boolean {
  const signature = buildPersonnelSignature(target)
  if (!signature) return false
  return personnelRows.value.some((row) => {
    if (row.rowKey === target.rowKey) return false
    const otherSignature = buildPersonnelSignature(row)
    return otherSignature === signature
  })
}

function buildServiceSignature(row: ServiceRow): string | null {
  const value = normalizeValue(row.value)
  if (!value) return null
  if (row.objTpService != null && row.pvTpService != null) {
    return `id:${row.objTpService}:${row.pvTpService}|val:${value}`
  }
  const name = normalizeText(row.nameTpService)
  if (!name) return null
  return `name:${name}|val:${value}`
}

function hasDuplicateService(target: ServiceRow): boolean {
  const signature = buildServiceSignature(target)
  if (!signature) return false
  return serviceRows.value.some((row) => {
    if (row.rowKey === target.rowKey) return false
    const otherSignature = buildServiceSignature(row)
    return otherSignature === signature
  })
}

async function saveMaterialRow(row: MaterialRow) {
  const relation = activeRow.value
  if (!relation?.taskWorkId) {
    message.error('Не выбран связанный элемент работа-задача')
    return
  }

  if (
    row.objMaterial == null ||
    row.pvMaterial == null ||
    row.meaMeasure == null ||
    row.pvMeasure == null ||
    row.value == null
  ) {
    message.error('Заполните материал, единицу измерения и значение')
    return
  }

  if (hasDuplicateMaterial(row)) {
    message.error('Такая строка уже существует. Дублирование материалов запрещено.')
    return
  }

  const stamp = resolveDateStamp()
  const meta = resolveUserMeta()
  const mode = row.id != null ? 'upd' : 'ins'
  const payload: Record<string, unknown> = {
    name: mode === 'ins' ? buildAutoName('Material') : row.name || buildAutoName('Material'),
    objMaterial: row.objMaterial,
    pvMaterial: row.pvMaterial,
    meaMeasure: row.meaMeasure,
    pvMeasure: row.pvMeasure,
    Value: row.value,
  }

  if (mode === 'ins') {
    payload.relobjTaskWork = relation.taskWorkId
    payload.linkCls = relation.taskWorkCls ?? undefined
    payload.CreatedAt = stamp
    payload.UpdatedAt = stamp
    payload.objUser = meta.objUser ?? undefined
    payload.pvUser = meta.pvUser ?? undefined
  } else {
    payload.id = row.id
    if (row.cls != null) payload.cls = row.cls
    if (row.idMaterial != null) payload.idMaterial = row.idMaterial
    if (row.idMeasure != null) payload.idMeasure = row.idMeasure
    payload.idTaskWork = row.idTaskWork ?? relation.taskWorkId
    payload.relobjTaskWork = relation.taskWorkId
    if (row.pvTaskWork != null) payload.pvTaskWork = row.pvTaskWork
    if (row.idUser != null) payload.idUser = row.idUser
    payload.objUser = row.objUser ?? meta.objUser ?? undefined
    payload.pvUser = row.pvUser ?? meta.pvUser ?? undefined
    if (row.idValue != null) payload.idValue = row.idValue
    if (row.idUpdatedAt != null) payload.idUpdatedAt = row.idUpdatedAt
    payload.UpdatedAt = stamp
  }

  row.isSaving = true
  try {
    await nsiRpc('data/saveNormativeMaterial', [mode, payload])
    await loadNormativeMaterials(relation)
    message.success('Материал сохранён')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось сохранить материал: ${reason}`)
  } finally {
    row.isSaving = false
  }
}

async function deleteMaterialRow(row: MaterialRow) {
  const relation = activeRow.value
  if (!relation) return

  if (row.id == null) {
    materialRows.value = materialRows.value.filter((item) => item.rowKey !== row.rowKey)
    return
  }

  row.isDeleting = true
  try {
    await nsiRpc('data/deleteOwnerWithProperties', [row.id, 1])
    await loadNormativeMaterials(relation)
    message.success('Материал удалён')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось удалить материал: ${reason}`)
  } finally {
    row.isDeleting = false
  }
}

function handleMaterialSelect(row: MaterialRow, value: string | number | null, option?: SelectOption) {
  if (!value || !option) {
    row.materialKey = null
    row.objMaterial = null
    row.pvMaterial = null
    row.idMaterial = null
    row.nameMaterial = ''
    return
  }
  const opt = option as DirectoryOption
  row.materialKey = String(value)
  row.objMaterial = opt.id
  row.pvMaterial = opt.pv
  row.nameMaterial = opt.label
}

function handleMeasureSelect(row: MaterialRow, value: string | number | null, option?: SelectOption) {
  if (!value || !option) {
    row.measureKey = null
    row.meaMeasure = null
    row.pvMeasure = null
    row.idMeasure = null
    row.nameMeasure = ''
    return
  }
  const opt = option as DirectoryOption
  row.measureKey = String(value)
  row.meaMeasure = opt.id
  row.pvMeasure = opt.pv
  row.nameMeasure = opt.label
}

async function saveToolRow(row: ToolRow) {
  const relation = activeRow.value
  if (!relation?.taskWorkId) {
    message.error('Не выбран связанный элемент работа-задача')
    return
  }

  const toolKeyParsed = parseCompositeKey(row.toolKey)
  if (toolKeyParsed.fv != null) row.fvTypTool = toolKeyParsed.fv
  if (toolKeyParsed.pv != null) row.pvTypTool = toolKeyParsed.pv

  if (row.fvTypTool == null || row.pvTypTool == null || row.value == null) {
    message.error('Заполните инструмент и значение')
    return
  }

  if (hasDuplicateTool(row)) {
    message.error('Такая строка уже существует. Дублирование инструментов запрещено.')
    return
  }

  const stamp = resolveDateStamp()
  const meta = resolveUserMeta()
  const mode = row.id != null ? 'upd' : 'ins'
  const payload: Record<string, unknown> = {
    name: mode === 'ins' ? buildAutoName('Tool') : row.name || buildAutoName('Tool'),
    fvTypTool: row.fvTypTool,
    pvTypTool: row.pvTypTool,
    Value: row.value,
  }

  if (mode === 'ins') {
    payload.relobjTaskWork = relation.taskWorkId
    payload.linkCls = relation.taskWorkCls ?? undefined
    payload.CreatedAt = stamp
    payload.UpdatedAt = stamp
    payload.objUser = meta.objUser ?? undefined
    payload.pvUser = meta.pvUser ?? undefined
  } else {
    payload.id = row.id
    if (row.cls != null) payload.cls = row.cls
    if (row.idTypTool != null) payload.idTypTool = row.idTypTool
    payload.idTaskWork = row.idTaskWork ?? relation.taskWorkId
    payload.relobjTaskWork = relation.taskWorkId
    if (row.pvTaskWork != null) payload.pvTaskWork = row.pvTaskWork
    if (row.idUser != null) payload.idUser = row.idUser
    payload.objUser = row.objUser ?? meta.objUser ?? undefined
    payload.pvUser = row.pvUser ?? meta.pvUser ?? undefined
    if (row.idValue != null) payload.idValue = row.idValue
    if (row.idUpdatedAt != null) payload.idUpdatedAt = row.idUpdatedAt
    payload.UpdatedAt = stamp
  }

  row.isSaving = true
  try {
    await nsiRpc('data/saveNormativeTool', [mode, payload])
    await loadNormativeTools(relation)
    message.success('Инструмент сохранён')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось сохранить инструмент: ${reason}`)
  } finally {
    row.isSaving = false
  }
}

async function deleteToolRow(row: ToolRow) {
  const relation = activeRow.value
  if (!relation) return

  if (row.id == null) {
    toolRows.value = toolRows.value.filter((item) => item.rowKey !== row.rowKey)
    return
  }

  row.isDeleting = true
  try {
    await nsiRpc('data/deleteOwnerWithProperties', [row.id, 1])
    await loadNormativeTools(relation)
    message.success('Инструмент удалён')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось удалить инструмент: ${reason}`)
  } finally {
    row.isDeleting = false
  }
}

function handleToolSelect(row: ToolRow, value: string | number | null, option?: SelectOption) {
  if (!value || !option) {
    row.toolKey = null
    row.fvTypTool = null
    row.pvTypTool = null
    row.nameTypTool = ''
    row.idTypTool = null
    return
  }
  const opt = option as ToolOption
  if (opt.pv == null) {
    message.error('Для выбранного инструмента отсутствует pv. Выберите другой.')
    row.toolKey = null
    return
  }
  row.toolKey = String(value)
  row.fvTypTool = opt.fv
  row.pvTypTool = opt.pv
  row.nameTypTool = opt.label
}

async function saveEquipmentRow(row: EquipmentRow) {
  const relation = activeRow.value
  if (!relation?.taskWorkId) {
    message.error('Не выбран связанный элемент работа-задача')
    return
  }

  const equipmentKeyParsed = parseCompositeKey(row.equipmentKey)
  if (equipmentKeyParsed.fv != null) row.fvTypEquipment = equipmentKeyParsed.fv
  if (equipmentKeyParsed.pv != null) row.pvTypEquipment = equipmentKeyParsed.pv

  if (row.fvTypEquipment == null || row.pvTypEquipment == null || row.value == null || row.quantity == null) {
    message.error('Заполните технику, количество и время')
    return
  }

  if (hasDuplicateEquipment(row)) {
    message.error('Такая строка уже существует. Дублирование техники запрещено.')
    return
  }

  const stamp = resolveDateStamp()
  const meta = resolveUserMeta()
  const mode = row.id != null ? 'upd' : 'ins'
  const payload: Record<string, unknown> = {
    name: mode === 'ins' ? buildAutoName('Equipment') : row.name || buildAutoName('Equipment'),
    fvTypEquipment: row.fvTypEquipment,
    pvTypEquipment: row.pvTypEquipment,
    Quantity: row.quantity,
    Value: row.value,
  }

  if (mode === 'ins') {
    payload.relobjTaskWork = relation.taskWorkId
    payload.linkCls = relation.taskWorkCls ?? undefined
    payload.CreatedAt = stamp
    payload.UpdatedAt = stamp
    payload.objUser = meta.objUser ?? undefined
    payload.pvUser = meta.pvUser ?? undefined
  } else {
    payload.id = row.id
    if (row.cls != null) payload.cls = row.cls
    if (row.idTypEquipment != null) payload.idTypEquipment = row.idTypEquipment
    payload.idTaskWork = row.idTaskWork ?? relation.taskWorkId
    payload.relobjTaskWork = relation.taskWorkId
    if (row.pvTaskWork != null) payload.pvTaskWork = row.pvTaskWork
    if (row.idUser != null) payload.idUser = row.idUser
    payload.objUser = row.objUser ?? meta.objUser ?? undefined
    payload.pvUser = row.pvUser ?? meta.pvUser ?? undefined
    if (row.idValue != null) payload.idValue = row.idValue
    if (row.idQuantity != null) payload.idQuantity = row.idQuantity
    if (row.idUpdatedAt != null) payload.idUpdatedAt = row.idUpdatedAt
    payload.UpdatedAt = stamp
  }

  row.isSaving = true
  try {
    await nsiRpc('data/saveNormativeEquipment', [mode, payload])
    await loadNormativeEquipment(relation)
    message.success('Техника сохранена')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось сохранить технику: ${reason}`)
  } finally {
    row.isSaving = false
  }
}

async function deleteEquipmentRow(row: EquipmentRow) {
  const relation = activeRow.value
  if (!relation) return

  if (row.id == null) {
    equipmentRows.value = equipmentRows.value.filter((item) => item.rowKey !== row.rowKey)
    return
  }

  row.isDeleting = true
  try {
    await nsiRpc('data/deleteOwnerWithProperties', [row.id, 1])
    await loadNormativeEquipment(relation)
    message.success('Техника удалена')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось удалить технику: ${reason}`)
  } finally {
    row.isDeleting = false
  }
}

function handleEquipmentSelect(row: EquipmentRow, value: string | number | null, option?: SelectOption) {
  if (!value || !option) {
    row.equipmentKey = null
    row.fvTypEquipment = null
    row.pvTypEquipment = null
    row.nameTypEquipment = ''
    row.idTypEquipment = null
    return
  }
  const opt = option as EquipmentOption
  if (opt.pv == null) {
    message.error('Для выбранной техники отсутствует pv. Выберите другую.')
    row.equipmentKey = null
    return
  }
  row.equipmentKey = String(value)
  row.fvTypEquipment = opt.fv
  row.pvTypEquipment = opt.pv
  row.nameTypEquipment = opt.label
}

async function savePersonnelRow(row: PersonnelRow) {
  const relation = activeRow.value
  if (!relation?.taskWorkId) {
    message.error('Не выбран связанный элемент работа-задача')
    return
  }

  if (row.fvPosition == null || row.pvPosition == null || row.value == null || row.quantity == null) {
    message.error('Заполните исполнителя, количество и время')
    return
  }

  if (hasDuplicatePersonnel(row)) {
    message.error('Такая строка уже существует. Дублирование исполнителей запрещено.')
    return
  }

  const stamp = resolveDateStamp()
  const meta = resolveUserMeta()
  const mode = row.id != null ? 'upd' : 'ins'
  const payload: Record<string, unknown> = {
    name: mode === 'ins' ? buildAutoName('Personnel') : row.name || buildAutoName('Personnel'),
    fvPosition: row.fvPosition,
    pvPosition: row.pvPosition,
    Quantity: row.quantity,
    Value: row.value,
  }

  if (mode === 'ins') {
    payload.relobjTaskWork = relation.taskWorkId
    payload.linkCls = relation.taskWorkCls ?? undefined
    payload.CreatedAt = stamp
    payload.UpdatedAt = stamp
    payload.objUser = meta.objUser ?? undefined
    payload.pvUser = meta.pvUser ?? undefined
  } else {
    payload.id = row.id
    if (row.cls != null) payload.cls = row.cls
    if (row.idPosition != null) payload.idPosition = row.idPosition
    payload.idTaskWork = row.idTaskWork ?? relation.taskWorkId
    payload.relobjTaskWork = relation.taskWorkId
    if (row.pvTaskWork != null) payload.pvTaskWork = row.pvTaskWork
    if (row.idUser != null) payload.idUser = row.idUser
    payload.objUser = row.objUser ?? meta.objUser ?? undefined
    payload.pvUser = row.pvUser ?? meta.pvUser ?? undefined
    if (row.idValue != null) payload.idValue = row.idValue
    if (row.idQuantity != null) payload.idQuantity = row.idQuantity
    if (row.idUpdatedAt != null) payload.idUpdatedAt = row.idUpdatedAt
    payload.UpdatedAt = stamp
  }

  row.isSaving = true
  try {
    await nsiRpc('data/saveNormativePersonnel', [mode, payload])
    await loadNormativePersonnel(relation)
    message.success('Исполнитель сохранён')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось сохранить исполнителя: ${reason}`)
  } finally {
    row.isSaving = false
  }
}

async function deletePersonnelRow(row: PersonnelRow) {
  const relation = activeRow.value
  if (!relation) return

  if (row.id == null) {
    personnelRows.value = personnelRows.value.filter((item) => item.rowKey !== row.rowKey)
    return
  }

  row.isDeleting = true
  try {
    await nsiRpc('data/deleteOwnerWithProperties', [row.id, 1])
    await loadNormativePersonnel(relation)
    message.success('Исполнитель удалён')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось удалить исполнителя: ${reason}`)
  } finally {
    row.isDeleting = false
  }
}

function handlePersonnelSelect(row: PersonnelRow, value: string | number | null, option?: SelectOption) {
  if (!value || !option) {
    row.positionKey = null
    row.fvPosition = null
    row.pvPosition = null
    row.namePosition = ''
    row.idPosition = null
    return
  }
  const opt = option as PersonnelOption
  if (opt.pv == null) {
    message.error('Для выбранного исполнителя отсутствует pv. Выберите другого.')
    row.positionKey = null
    return
  }
  row.positionKey = String(value)
  row.fvPosition = opt.fv
  row.pvPosition = opt.pv
  row.namePosition = opt.label
}

async function saveServiceRow(row: ServiceRow) {
  const relation = activeRow.value
  if (!relation?.taskWorkId) {
    message.error('Не выбран связанный элемент работа-задача')
    return
  }

  if (row.objTpService == null || row.pvTpService == null || row.value == null) {
    message.error('Заполните услугу и значение')
    return
  }

  if (hasDuplicateService(row)) {
    message.error('Такая строка уже существует. Дублирование услуг запрещено.')
    return
  }

  const stamp = resolveDateStamp()
  const meta = resolveUserMeta()
  const mode = row.id != null ? 'upd' : 'ins'
  const payload: Record<string, unknown> = {
    name: mode === 'ins' ? buildAutoName('Service') : row.name || buildAutoName('Service'),
    objTpService: row.objTpService,
    pvTpService: row.pvTpService,
    Value: row.value,
  }

  if (mode === 'ins') {
    payload.relobjTaskWork = relation.taskWorkId
    payload.linkCls = relation.taskWorkCls ?? undefined
    payload.CreatedAt = stamp
    payload.UpdatedAt = stamp
    payload.objUser = meta.objUser ?? undefined
    payload.pvUser = meta.pvUser ?? undefined
  } else {
    payload.id = row.id
    if (row.cls != null) payload.cls = row.cls
    if (row.idTpService != null) payload.idTpService = row.idTpService
    payload.relobjTaskWork = relation.taskWorkId
    if (row.pvTaskWork != null) payload.pvTaskWork = row.pvTaskWork
    if (row.idUser != null) payload.idUser = row.idUser
    payload.objUser = row.objUser ?? meta.objUser ?? undefined
    payload.pvUser = row.pvUser ?? meta.pvUser ?? undefined
    if (row.idValue != null) payload.idValue = row.idValue
    if (row.idUpdatedAt != null) payload.idUpdatedAt = row.idUpdatedAt
    payload.UpdatedAt = stamp
  }

  row.isSaving = true
  try {
    await nsiRpc('data/saveNormativeTpService', [mode, payload])
    await loadNormativeServices(relation)
    message.success('Услуга сохранена')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось сохранить услугу: ${reason}`)
  } finally {
    row.isSaving = false
  }
}

async function deleteServiceRow(row: ServiceRow) {
  const relation = activeRow.value
  if (!relation) return

  if (row.id == null) {
    serviceRows.value = serviceRows.value.filter((item) => item.rowKey !== row.rowKey)
    return
  }

  row.isDeleting = true
  try {
    await nsiRpc('data/deleteOwnerWithProperties', [row.id, 1])
    await loadNormativeServices(relation)
    message.success('Услуга удалена')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(`Не удалось удалить услугу: ${reason}`)
  } finally {
    row.isDeleting = false
  }
}

function handleServiceSelect(row: ServiceRow, value: string | number | null, option?: SelectOption) {
  if (!value || !option) {
    row.serviceKey = null
    row.objTpService = null
    row.pvTpService = null
    row.nameTpService = ''
    row.idTpService = null
    return
  }
  const opt = option as DirectoryOption
  row.serviceKey = String(value)
  row.objTpService = opt.id
  row.pvTpService = opt.pv
  row.nameTpService = opt.label
}

const searchNormalized = computed(() => normalizeText(search.value))

const filteredRows = computed<ResourceNormRow[]>(() => {
  const query = searchNormalized.value
  if (!query) return norms.value
  return norms.value.filter((row) => row.searchBlob.includes(query))
})

const total = computed(() => filteredRows.value.length)
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize)))

const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

const mobileRows = computed(() =>
  filteredRows.value.slice(0, pagination.page * pagination.pageSize),
)

const rows = computed(() => (isMobile.value ? mobileRows.value : paginatedRows.value))
const visibleCount = computed(() => rows.value.length)
const tableLoading = computed(() => loading.value)

function resetEditorState(shouldReload = false) {
  activeRow.value = null
  materialRows.value = []
  toolRows.value = []
  equipmentRows.value = []
  personnelRows.value = []
  serviceRows.value = []
  if (shouldReload) {
    void loadResourceNorms()
  }
}

watch(search, () => {
  pagination.page = 1
})

watch(
  () => [editorTaskWorkId.value, isCompactEditor.value] as const,
  ([taskWorkId, compact], prev) => {
    const [prevTaskWorkId, prevCompact] = prev ?? [null, null]
    if (taskWorkId == null) {
      if (prevTaskWorkId != null) {
        if (editorOpen.value) {
          editorOpen.value = false
        } else if (prevCompact) {
          resetEditorState(true)
        }
      }
      return
    }
    void openEditorFromRoute(taskWorkId, !compact)
  },
  { immediate: true },
)

watch(editorOpen, (open, prev) => {
  if (!open && prev && !isEditorRoute.value) {
    if (editorTaskWorkId.value != null && !isCompactEditor.value) {
      void router.replace({ name: 'resource-norms' })
    }
    resetEditorState(true)
  }
})

watch(
  () => pagination.pageSize,
  () => {
    const max = maxPage.value
    if (pagination.page > max) pagination.page = max
  },
)

function showMore() {
  if (pagination.page < maxPage.value) {
    pagination.page += 1
  }
}

function rowKey(row: ResourceNormRow) {
  return row.rowKey
}

function renderChipList(items: string[]) {
  if (!items.length) return h('span', { class: 'empty' }, '—')

  return h(
    'div',
    { class: 'chip-list' },
    items.map((item, index) =>
      h(
        NTag,
        {
          key: `${item}-${index}`,
          size: 'small',
          bordered: false,
          round: true,
          type: 'info',
          class: 'value-chip',
        },
        { default: () => item },
      ),
    ),
  )
}

const columns = computed<DataTableColumns<ResourceNormRow>>(() => [
  {
    title: 'РАБОТА - ЗАДАЧА',
    key: 'name',
    minWidth: 260,
    render: (row) => row.name || '—',
  },
  {
    title: 'ИСПОЛНИТЕЛИ',
    key: 'personnel',
    minWidth: 220,
    render: (row) => renderChipList(row.personnelItems),
  },
  {
    title: 'МАТЕРИАЛЫ',
    key: 'material',
    minWidth: 220,
    render: (row) => renderChipList(row.materialItems),
  },
  {
    title: 'ИНСТРУМЕНТЫ',
    key: 'tool',
    minWidth: 220,
    render: (row) => renderChipList(row.toolItems),
  },
  {
    title: 'ТЕХНИКА',
    key: 'equipment',
    minWidth: 220,
    render: (row) => renderChipList(row.equipmentItems),
  },
  {
    title: 'УСЛУГИ ДРУГИХ',
    key: 'service',
    minWidth: 220,
    render: (row) => renderChipList(row.serviceItems),
  },
])

const materialColumns = computed<DataTableColumns<MaterialRow>>(() => [
  {
    title: 'Наименование',
    key: 'material',
    minWidth: 260,
    render: (row) =>
      h(NSelect, {
        value: row.materialKey,
        options: materialOptions.value,
        filterable: true,
        clearable: true,
        loading: materialDirectoryLoading.value,
        placeholder: 'Материал',
        onUpdateValue: (value: string | number | null, option?: SelectOption) =>
          handleMaterialSelect(row, value, option),
      }),
  },
  {
    title: 'Ед. измерения',
    key: 'measure',
    minWidth: 180,
    render: (row) =>
      h(NSelect, {
        value: row.measureKey,
        options: measureOptions.value,
        filterable: true,
        clearable: true,
        loading: measureDirectoryLoading.value,
        placeholder: 'Ед. измерения',
        onUpdateValue: (value: string | number | null, option?: SelectOption) =>
          handleMeasureSelect(row, value, option),
      }),
  },
  {
    title: 'Расход',
    key: 'value',
    minWidth: 140,
    render: (row) =>
      h(NInputNumber, {
        value: row.value,
        min: 0,
        placeholder: 'Кол-во',
        onUpdateValue: (value: number | null) => {
          row.value = value
        },
      }),
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 140,
    render: (row) =>
      h('div', { class: 'material-actions' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            circle: true,
            loading: row.isSaving,
            disabled:
              row.objMaterial == null ||
              row.pvMaterial == null ||
              row.meaMeasure == null ||
              row.pvMeasure == null ||
              row.value == null ||
              hasDuplicateMaterial(row),
            onClick: () => void saveMaterialRow(row),
            'aria-label': 'Сохранить материал',
          },
          { icon: () => h(NIcon, null, { default: () => h(CheckmarkOutline) }) },
        ),
        h(
          NPopconfirm,
          {
            positiveText: 'Удалить',
            negativeText: 'Отмена',
            onPositiveClick: () => void deleteMaterialRow(row),
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  circle: true,
                  type: 'error',
                  loading: row.isDeleting,
                  'aria-label': 'Удалить материал',
                },
                { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
              ),
            default: () => 'Удалить материал?',
          },
        ),
      ]),
  },
])

const toolColumns = computed<DataTableColumns<ToolRow>>(() => [
  {
    title: 'Наименование',
    key: 'tool',
    minWidth: 260,
    render: (row) =>
      h(NSelect, {
        value: row.toolKey,
        options: toolOptions.value,
        filterable: true,
        clearable: true,
        loading: toolDirectoryLoading.value,
        placeholder: 'Инструмент',
        onUpdateValue: (value: string | number | null, option?: SelectOption) =>
          handleToolSelect(row, value, option),
      }),
  },
  {
    title: 'Задействовано,ед',
    key: 'value',
    minWidth: 140,
    render: (row) =>
      h(NInputNumber, {
        value: row.value,
        min: 0,
        placeholder: 'Ед',
        onUpdateValue: (value: number | null) => {
          row.value = value
        },
      }),
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 140,
    render: (row) =>
      h('div', { class: 'material-actions' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            circle: true,
            loading: row.isSaving,
            disabled: row.fvTypTool == null || row.pvTypTool == null || row.value == null || hasDuplicateTool(row),
            onClick: () => void saveToolRow(row),
            'aria-label': 'Сохранить инструмент',
          },
          { icon: () => h(NIcon, null, { default: () => h(CheckmarkOutline) }) },
        ),
        h(
          NPopconfirm,
          {
            positiveText: 'Удалить',
            negativeText: 'Отмена',
            onPositiveClick: () => void deleteToolRow(row),
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  circle: true,
                  type: 'error',
                  loading: row.isDeleting,
                  'aria-label': 'Удалить инструмент',
                },
                { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
              ),
            default: () => 'Удалить инструмент?',
          },
        ),
      ]),
  },
])

const equipmentColumns = computed<DataTableColumns<EquipmentRow>>(() => [
  {
    title: 'Наименование',
    key: 'equipment',
    minWidth: 260,
    render: (row) =>
      h(NSelect, {
        value: row.equipmentKey,
        options: equipmentOptions.value,
        filterable: true,
        clearable: true,
        loading: equipmentDirectoryLoading.value,
        placeholder: 'Техника',
        onUpdateValue: (value: string | number | null, option?: SelectOption) =>
          handleEquipmentSelect(row, value, option),
      }),
  },
  {
    title: 'Кол-во, ед.',
    key: 'quantity',
    minWidth: 140,
    render: (row) =>
      h(NInputNumber, {
        value: row.quantity,
        min: 0,
        placeholder: 'Ед.',
        onUpdateValue: (value: number | null) => {
          row.quantity = value
        },
      }),
  },
  {
    title: 'Время работы 1 единицы, минут',
    key: 'value',
    minWidth: 140,
    render: (row) =>
      h(NInputNumber, {
        value: row.value,
        min: 0,
        placeholder: 'Мин',
        onUpdateValue: (value: number | null) => {
          row.value = value
        },
      }),
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 140,
    render: (row) =>
      h('div', { class: 'material-actions' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            circle: true,
            loading: row.isSaving,
            disabled:
              row.fvTypEquipment == null ||
              row.pvTypEquipment == null ||
              row.value == null ||
              row.quantity == null ||
              hasDuplicateEquipment(row),
            onClick: () => void saveEquipmentRow(row),
            'aria-label': 'Сохранить технику',
          },
          { icon: () => h(NIcon, null, { default: () => h(CheckmarkOutline) }) },
        ),
        h(
          NPopconfirm,
          {
            positiveText: 'Удалить',
            negativeText: 'Отмена',
            onPositiveClick: () => void deleteEquipmentRow(row),
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  circle: true,
                  type: 'error',
                  loading: row.isDeleting,
                  'aria-label': 'Удалить технику',
                },
                { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
              ),
            default: () => 'Удалить технику?',
          },
        ),
      ]),
  },
])

const personnelColumns = computed<DataTableColumns<PersonnelRow>>(() => [
  {
    title: 'Наименование',
    key: 'personnel',
    minWidth: 260,
    render: (row) =>
      h(NSelect, {
        value: row.positionKey,
        options: personnelOptions.value,
        filterable: true,
        clearable: true,
        loading: personnelDirectoryLoading.value,
        placeholder: 'Исполнитель',
        onUpdateValue: (value: string | number | null, option?: SelectOption) =>
          handlePersonnelSelect(row, value, option),
      }),
  },
  {
    title: 'Кол-во, чел.',
    key: 'quantity',
    minWidth: 140,
    render: (row) =>
      h(NInputNumber, {
        value: row.quantity,
        min: 0,
        placeholder: 'Чел',
        onUpdateValue: (value: number | null) => {
          row.quantity = value
        },
      }),
  },
  {
    title: 'Время работы 1 человека, минут',
    key: 'value',
    minWidth: 140,
    render: (row) =>
      h(NInputNumber, {
        value: row.value,
        min: 0,
        placeholder: 'Мин',
        onUpdateValue: (value: number | null) => {
          row.value = value
        },
      }),
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 140,
    render: (row) =>
      h('div', { class: 'material-actions' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            circle: true,
            loading: row.isSaving,
            disabled:
              row.fvPosition == null ||
              row.pvPosition == null ||
              row.value == null ||
              row.quantity == null ||
              hasDuplicatePersonnel(row),
            onClick: () => void savePersonnelRow(row),
            'aria-label': 'Сохранить исполнителя',
          },
          { icon: () => h(NIcon, null, { default: () => h(CheckmarkOutline) }) },
        ),
        h(
          NPopconfirm,
          {
            positiveText: 'Удалить',
            negativeText: 'Отмена',
            onPositiveClick: () => void deletePersonnelRow(row),
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  circle: true,
                  type: 'error',
                  loading: row.isDeleting,
                  'aria-label': 'Удалить исполнителя',
                },
                { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
              ),
            default: () => 'Удалить исполнителя?',
          },
        ),
      ]),
  },
])

const serviceColumns = computed<DataTableColumns<ServiceRow>>(() => [
  {
    title: 'Наименование',
    key: 'service',
    minWidth: 260,
    render: (row) =>
      h(NSelect, {
        value: row.serviceKey,
        options: serviceOptions.value,
        filterable: true,
        clearable: true,
        loading: serviceDirectoryLoading.value,
        placeholder: 'Услуга',
        onUpdateValue: (value: string | number | null, option?: SelectOption) =>
          handleServiceSelect(row, value, option),
      }),
  },
  {
    title: 'Объем в ед.измер. услуги',
    key: 'value',
    minWidth: 140,
    render: (row) =>
      h(NInputNumber, {
        value: row.value,
        min: 0,
        placeholder: 'Объем',
        onUpdateValue: (value: number | null) => {
          row.value = value
        },
      }),
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 140,
    render: (row) =>
      h('div', { class: 'material-actions' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            circle: true,
            loading: row.isSaving,
            disabled:
              row.objTpService == null ||
              row.pvTpService == null ||
              row.value == null ||
              hasDuplicateService(row),
            onClick: () => void saveServiceRow(row),
            'aria-label': 'Сохранить услугу',
          },
          { icon: () => h(NIcon, null, { default: () => h(CheckmarkOutline) }) },
        ),
        h(
          NPopconfirm,
          {
            positiveText: 'Удалить',
            negativeText: 'Отмена',
            onPositiveClick: () => void deleteServiceRow(row),
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  circle: true,
                  type: 'error',
                  loading: row.isDeleting,
                  'aria-label': 'Удалить услугу',
                },
                { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
              ),
            default: () => 'Удалить услугу?',
          },
        ),
      ]),
  },
])
</script>

<style scoped>
.resource-norms-page {
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
  gap: 16px;
}

.toolbar__left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 18px;
}

.subtext {
  color: rgba(0, 0, 0, 0.6);
  font-size: 12px;
}

.toolbar__controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.toolbar__search {
  width: 320px;
  max-width: 50vw;
}

.table-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
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

:deep(.n-data-table thead th) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--n-table-header-color, var(--n-card-color, var(--s360-bg)));
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
}

:deep(.n-pagination) {
  font-size: 14px;
}

.pagination-total {
  margin-right: 12px;
  font-size: 14px;
  color: var(--n-text-color-3);
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

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  max-width: 100%;
}

.value-chip {
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value-chip :deep(.n-tag__content) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  color: var(--n-text-color-3);
  font-size: 12px;
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
  overflow: hidden;
}

.card--interactive {
  cursor: pointer;
}

.card--interactive:focus-visible {
  outline: 2px solid var(--n-color-target, #4f46e5);
  outline-offset: 2px;
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
  grid-template-columns: 110px 1fr;
  gap: 6px 10px;
  margin: 10px 0 0;
  width: 100%;
}

.card__grid dt {
  color: #6b7280;
  font-size: 12px;
}

.card__grid dd {
  margin: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
  min-width: 0;
}

.show-more-bar {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.norm-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 72vh;
  overflow: auto;
  padding-right: 4px;
}

.norm-editor__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.norm-editor__title {
  font-size: 12px;
  color: var(--n-text-color-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.norm-editor__subtitle {
  font-size: 16px;
  font-weight: 600;
}

.norm-tabs :deep(.n-tabs-nav) {
  margin-bottom: 8px;
  position: sticky;
  top: 0;
  z-index: 12;
  background: var(--n-card-color, var(--s360-bg));
  padding: 8px 0;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
}

.norm-tabs :deep(.n-tabs-nav-scroll-content) {
  gap: 8px;
}

.segment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.segment-title {
  font-size: 16px;
  font-weight: 600;
}

.segment-subtitle {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.segment-body {
  border: 1px solid var(--s360-border);
  border-radius: 12px;
  padding: 8px;
  background: var(--s360-bg);
}

.material-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.editor-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--s360-border);
  border-radius: 14px;
  padding: 12px;
  background: var(--s360-bg);
}

.editor-page__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.editor-page__title {
  font-size: 16px;
  font-weight: 600;
}

.editor-back {
  font-weight: 500;
}

.editor-page .norm-editor {
  max-height: none;
  overflow: visible;
  padding-right: 0;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .toolbar__controls {
    justify-content: stretch;
  }

  .toolbar__search {
    width: 100%;
    max-width: none;
  }
}
</style>
