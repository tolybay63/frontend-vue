<!-- Файл: src/pages/nsi/SignsPage.vue
     Назначение: справочник «Признаки» с типами и значениями признаков.
     Использование: доступен по маршруту /nsi/signs. -->
<template>
  <section class="signs-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          {{ t('nsi.objectTypes.signs.title', {}, { default: 'Справочник «Признаки»' }) }}
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            :aria-label="t('nsi.objectTypes.signs.help', {}, { default: 'Справка о справочнике' })"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">
          {{
            t('nsi.objectTypes.signs.subtitle', {}, { default: 'Управляйте перечнем признаков и их значений' })
          }}
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="search"
          :placeholder="t('nsi.objectTypes.signs.searchPlaceholder', {}, { default: 'Поиск…' })"
          clearable
          round
          class="toolbar__search"
        />

        <div class="toolbar__filters">
          <NSelect
            v-model:value="valueFilter"
            :options="valueFilterOptions"
            multiple
            filterable
            clearable
            size="small"
            class="toolbar__filter"
            :placeholder="t('nsi.objectTypes.signs.filter.values', {}, { default: 'Значение признака' })"
          />
        </div>

        <NSelect
          v-if="isMobile"
          v-model:value="sortOrder"
          :options="sortOptions"
          size="small"
          class="toolbar__select"
          :aria-label="t('nsi.objectTypes.signs.sortAria', {}, { default: 'Порядок сортировки' })"
        />

        <NButton type="primary" @click="openCreate">+ {{ t('nsi.objectTypes.signs.add', {}, { default: 'Добавить признак' }) }}</NButton>
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
        <div class="list-info">
          {{ t('nsi.objectTypes.signs.listInfo', { shown: visibleCount, total }, { default: 'Показано: ' + visibleCount + ' из ' + total }) }}
        </div>
        <article
          v-for="item in rows"
          :key="item.id"
          class="card"
          role="group"
          :aria-label="item.name"
        >
          <header class="card__header">
            <h4 class="card__title">{{ item.name }}</h4>
          </header>

          <dl class="card__grid">
            <dt>{{ t('nsi.objectTypes.signs.table.values', {}, { default: 'Значения' }) }}</dt>
            <dd>
              <div class="chip-list">
                <NTag
                  v-for="value in item.values"
                  :key="value.id"
                  size="small"
                  round
                  :bordered="false"
                  type="info"
                  class="value-chip"
                >
                  {{ value.name }}
                </NTag>
                <span v-if="!item.values.length" class="empty">—</span>
              </div>
            </dd>
          </dl>

          <footer class="card__actions">
            <div class="table-actions">
              <NButton quaternary circle size="small" :aria-label="t('nsi.objectTypes.signs.actions.edit', {}, { default: 'Редактировать' })" @click="openEdit(item)">
                <template #icon>
                  <NIcon><CreateOutline /></NIcon>
                </template>
              </NButton>
              <NButton quaternary circle size="small" :aria-label="t('nsi.objectTypes.signs.actions.delete', {}, { default: 'Удалить' })" @click="openDelete(item)">
                <template #icon>
                  <NIcon><TrashOutline /></NIcon>
                </template>
              </NButton>
            </div>
          </footer>
        </article>
      </div>

      <div v-if="isMobile && pagination.page < maxPage" class="show-more-bar">
        <NButton tertiary @click="showMore" :loading="tableLoading">
          {{ t('nsi.objectTypes.signs.showMore', {}, { default: 'Показать ещё' }) }}
        </NButton>
      </div>

      <div class="pagination-bar" v-if="!isMobile">
        <NPagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :item-count="total"
          show-size-picker
          show-quick-jumper
          :aria-label="t('nsi.objectTypes.signs.paginationAria', {}, { default: 'Постраничная навигация по признакам' })"
        >
          <template #prefix>
            <span class="pagination-total">
              {{ t('nsi.objectTypes.signs.total', { total }, { default: 'Всего: ' + total }) }}
            </span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="infoOpen"
      preset="card"
      :title="t('nsi.objectTypes.signs.info.title', {}, { default: 'О справочнике' })"
      style="max-width: 640px"
    >
      <p>
        {{ t('nsi.objectTypes.signs.info.p1', {}, { default: 'Справочник «Признаки» помогает описывать характеристики объектов через типы и значения. Используйте поиск и фильтры, чтобы быстро находить нужные наборы.' }) }}
      </p>
      <p>
        {{ t('nsi.objectTypes.signs.info.p2', {}, { default: 'Добавляйте новые типы признаков вместе со списком значений или пополняйте существующие типы отдельными значениями.' }) }}
      </p>
      <template #footer>
        <NButton type="primary" @click="infoOpen = false">
          {{ t('nsi.objectTypes.signs.info.ok', {}, { default: 'Понятно' }) }}
        </NButton>
      </template>
    </NModal>

    <NModal
      v-model:show="dialogOpen"
      preset="card"
      :title="dialogTitle"
      style="width: min(720px, 96vw)"
    >
      <NForm :model="dialogMode === 'create' ? createForm : editForm" label-width="160px">
        <template v-if="dialogMode === 'create'">
          <NFormItem
            :label="t('nsi.objectTypes.signs.form.name.label', {}, { default: 'Название' })"
            :feedback="createErrors.name || undefined"
            :validation-status="createErrors.name ? 'error' : undefined"
          >
            <NInput v-model:value="createForm.name" />
          </NFormItem>

          <NFormItem
            :label="t('nsi.objectTypes.signs.form.mode.label', {}, { default: 'Тип записи' })"
          >
            <NRadioGroup v-model:value="createForm.mode">
              <NRadioButton value="type">
                {{ t('nsi.objectTypes.signs.form.mode.type', {}, { default: 'Новый тип признака' }) }}
              </NRadioButton>
              <NRadioButton value="value">
                {{ t('nsi.objectTypes.signs.form.mode.value', {}, { default: 'Новое значение признака' }) }}
              </NRadioButton>
            </NRadioGroup>
          </NFormItem>

          <NFormItem
            v-if="createForm.mode === 'value'"
            :label="t('nsi.objectTypes.signs.form.typeSelect.label', {}, { default: 'Тип признака' })"
            :feedback="createErrors.parentTypeId || undefined"
            :validation-status="createErrors.parentTypeId ? 'error' : undefined"
          >
            <NSelect
              v-model:value="createForm.parentTypeId"
              :options="typeSelectOptions"
              filterable
              clearable
              :placeholder="t('nsi.objectTypes.signs.form.typeSelect.placeholder', {}, { default: 'Выберите тип признака' })"
            />
          </NFormItem>

          <div v-if="createForm.mode === 'value'" class="values-preview">
            <div class="values-preview__title">
              {{ t('nsi.objectTypes.signs.form.existingValues', {}, { default: 'Текущие значения' }) }}
            </div>
            <div class="chip-list">
              <NTag
                v-for="value in selectedTypeValues"
                :key="value.id"
                size="small"
                round
                :bordered="false"
                type="info"
                class="value-chip"
              >
                {{ value.name }}
              </NTag>
              <span v-if="!selectedTypeValues.length" class="empty">—</span>
            </div>
          </div>

          <NFormItem
            v-if="createForm.mode === 'type'"
            :label="t('nsi.objectTypes.signs.form.values.label', {}, { default: 'Значения' })"
            :feedback="createErrors.valuesText || undefined"
            :validation-status="createErrors.valuesText ? 'error' : undefined"
          >
            <NInput
              v-model:value="createForm.valuesText"
              type="textarea"
              :placeholder="t('nsi.objectTypes.signs.form.values.placeholder', {}, { default: 'Введите значения через ;' })"
              :autosize="{ minRows: 2, maxRows: 5 }"
            />
          </NFormItem>
        </template>

        <template v-else>
          <NFormItem
            :label="t('nsi.objectTypes.signs.form.name.label', {}, { default: 'Название' })"
            :feedback="editErrors.name || undefined"
            :validation-status="editErrors.name ? 'error' : undefined"
          >
            <NInput v-model:value="editForm.typeName" />
          </NFormItem>

          <NFormItem
            :label="t('nsi.objectTypes.signs.form.values.label', {}, { default: 'Значения' })"
          >
            <div class="values-editor">
              <div
                v-for="(item, index) in editForm.values"
                :key="item.id ? item.id : `new-${index}`"
                class="values-editor__row"
              >
                <NInput v-model:value="item.name" placeholder="Значение" />
                <NButton
                  quaternary
                  circle
                  size="small"
                  :aria-label="t('nsi.objectTypes.signs.actions.delete', {}, { default: 'Удалить' })"
                  @click="removeEditValue(index)"
                >
                  <template #icon>
                    <NIcon><TrashOutline /></NIcon>
                  </template>
                </NButton>
              </div>
              <NButton tertiary size="small" class="values-editor__add" @click="addEditValue">
                <template #icon>
                  <NIcon><AddOutline /></NIcon>
                </template>
                {{ t('nsi.objectTypes.signs.form.addValue', {}, { default: 'Добавить значение' }) }}
              </NButton>
            </div>
          </NFormItem>
        </template>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="closeDialog">{{ t('nsi.objectTypes.signs.actions.cancel', {}, { default: 'Отмена' }) }}</NButton>
          <NButton type="primary" class="btn-primary" :loading="saving" @click="saveDialog">
            {{ t('nsi.objectTypes.signs.actions.save', {}, { default: 'Сохранить' }) }}
          </NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="deleteDialogOpen"
      preset="card"
      :title="t('nsi.objectTypes.signs.delete.title', {}, { default: 'Удалить признак' })"
      style="width: min(520px, 92vw)"
    >
      <p>
        {{ t('nsi.objectTypes.signs.delete.prompt', {}, { default: 'Удалить тип и все его значения?' }) }}
      </p>
      <div v-if="deleteTarget" class="delete-preview">
        <div class="delete-preview__title">{{ deleteTarget.name }}</div>
        <div class="chip-list">
          <NTag
            v-for="value in deleteTarget.values"
            :key="value.id"
            size="small"
            round
            :bordered="false"
            type="info"
            class="value-chip"
          >
            {{ value.name }}
          </NTag>
          <span v-if="!deleteTarget.values.length" class="empty">—</span>
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton @click="deleteDialogOpen = false">{{ t('nsi.objectTypes.signs.actions.cancel', {}, { default: 'Отмена' }) }}</NButton>
          <NButton type="error" :loading="deleteLoading" @click="confirmDelete">
            {{ t('nsi.objectTypes.signs.actions.delete', {}, { default: 'Удалить' }) }}
          </NButton>
        </div>
      </template>
    </NModal>
  </section>
</template>

<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
  NRadioButton,
  NRadioGroup,
  NSelect,
  NTag,
  type DataTableColumn,
  type SelectOption,
  useMessage,
} from 'naive-ui'
import {
  AddOutline,
  CreateOutline,
  InformationCircleOutline,
  TrashOutline,
} from '@vicons/ionicons5'

import { rpc } from '@shared/api'
import {
  extractRecords,
  firstRecord,
  getErrorMessage,
  normalizeText,
  toNumericOrUndefined,
  toOptionalString,
  toRpcId,
} from '@shared/lib'
import { useAuth } from '@features/auth'

const { t } = useI18n()
const message = useMessage()

const SIGN_TYPE_DEFAULT_CLS = 1278
const SIGN_VALUE_DEFAULT_CLS = 1279

interface RawSignRecord {
  id?: number | string
  ID?: number | string
  Id?: number | string
  name?: string
  NAME?: string
  Name?: string
  value?: string
  VALUE?: string
  parent?: number | string | null
  PARENT?: number | string | null
  cls?: number | string
  CLS?: number | string
  CreatedAt?: string
  UpdatedAt?: string
  createdAt?: string
  updatedAt?: string
  objUser?: number | string
  pvUser?: number | string
  idUser?: number | string
  fullNameUser?: string
  idCreatedAt?: number | string
  idUpdatedAt?: number | string
  ObjUser?: number | string
  PvUser?: number | string
  IdUser?: number | string
  FullNameUser?: string
  IdCreatedAt?: number | string
  IdUpdatedAt?: number | string
  [key: string]: unknown
}

interface SignRecord {
  id: string
  name: string
  parentId: string | null
  cls: number | null
  createdAt: string | null
  updatedAt: string | null
  objUser: number | null
  pvUser: number | null
  idUser: number | null
  fullNameUser: string | null
  idCreatedAt: number | null
  idUpdatedAt: number | null
}

interface SignValue {
  id: string
  name: string
  raw: SignRecord
}

interface SignTypeRow {
  id: string
  name: string
  raw: SignRecord
  values: SignValue[]
}

interface EditValue {
  id?: string
  name: string
  originalName?: string
  raw?: SignRecord
}

interface UserMeta {
  objUser?: number
  pvUser?: number
  idUser?: number
  fullNameUser?: string
}

interface PaginationState {
  page: number
  pageSize: number
}

const infoOpen = ref(false)
const dialogOpen = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const deleteDialogOpen = ref(false)
const deleteLoading = ref(false)
const deleteTarget = ref<SignTypeRow | null>(null)

const search = ref('')
const valueFilter = ref<string[] | null>([])
const signRows = ref<SignTypeRow[]>([])
const signTypeOptions = ref<SelectOption[]>([])
const signVariantNames = ref<string[]>([])
const signTypeClsId = ref<number>(SIGN_TYPE_DEFAULT_CLS)
const signValueClsId = ref<number>(SIGN_VALUE_DEFAULT_CLS)

const sortOrder = ref<'type-asc' | 'type-desc'>('type-asc')
const sortOptions = [
  { label: 'По типу (А→Я)', value: 'type-asc' },
  { label: 'По типу (Я→А)', value: 'type-desc' },
]

const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })
const tableLoading = ref(false)
const saving = ref(false)

const createForm = reactive({
  name: '',
  mode: 'type' as 'type' | 'value',
  parentTypeId: null as string | null,
  valuesText: '',
})

const createErrors = reactive({
  name: '',
  parentTypeId: '',
  valuesText: '',
})

const editForm = reactive({
  typeId: '',
  typeName: '',
  values: [] as EditValue[],
})

const editErrors = reactive({
  name: '',
})

const removedValueIds = ref<string[]>([])
const editingRow = ref<SignTypeRow | null>(null)

const auth = useAuth()

const isMobile = ref(false)
let mediaQuery: MediaQueryList | null = null

const filteredRows = computed(() => {
  const searchValue = normalizeText(search.value)
  const selectedValues = new Set((valueFilter.value ?? []).map((value) => normalizeText(value)))

  return signRows.value.filter((row) => {
    if (selectedValues.size) {
      const hasValue = row.values.some((value) => selectedValues.has(normalizeText(value.name)))
      if (!hasValue) return false
    }

    if (!searchValue) return true

    const searchFields = [row.name, ...row.values.map((value) => value.name)]
    return searchFields.some((field) => normalizeText(field).includes(searchValue))
  })
})

const total = computed(() => filteredRows.value.length)
const sortedRows = computed(() => {
  const base = [...filteredRows.value].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return sortOrder.value === 'type-desc' ? base.reverse() : base
})

const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return sortedRows.value.slice(start, start + pagination.pageSize)
})

const mobileRows = computed(() => sortedRows.value.slice(0, pagination.page * pagination.pageSize))
const rows = computed(() => (isMobile.value ? mobileRows.value : paginatedRows.value))
const visibleCount = computed(() => rows.value.length)
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize)))
const rowKey = (row: SignTypeRow) => row.id

const valueFilterOptions = computed<SelectOption[]>(() => {
  const options = new Map<string, SelectOption>()

  for (const name of signVariantNames.value) {
    const normalized = normalizeText(name)
    if (!normalized) continue
    options.set(normalized, { label: name, value: name })
  }

  for (const row of signRows.value) {
    for (const value of row.values) {
      const normalized = normalizeText(value.name)
      if (!normalized || options.has(normalized)) continue
      options.set(normalized, { label: value.name, value: value.name })
    }
  }

  return Array.from(options.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru'),
  )
})

const typeSelectOptions = computed<SelectOption[]>(() => {
  if (signTypeOptions.value.length) return signTypeOptions.value

  return signRows.value
    .map((row) => ({ label: row.name, value: row.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
})

const selectedTypeValues = computed(() => {
  if (!createForm.parentTypeId) return []
  return signRows.value.find((row) => row.id === createForm.parentTypeId)?.values ?? []
})

const columns = computed<DataTableColumn<SignTypeRow>[]>(() => [
  {
    title: t('nsi.objectTypes.signs.table.type', {}, { default: 'Тип признака' }),
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    width: 320,
    ellipsis: { tooltip: true },
    render: (row) => row.name,
  },
  {
    title: t('nsi.objectTypes.signs.table.values', {}, { default: 'Значение признака' }),
    key: 'values',
    minWidth: 200,
    className: 'col-values',
    render: (row) => renderValues(row.values),
  },
  {
    title: t('nsi.objectTypes.signs.table.actions', {}, { default: 'Действия' }),
    key: 'actions',
    width: 120,
    align: 'center',
    render: (row) => renderActions(row),
  },
])

const dialogTitle = computed(() =>
  dialogMode.value === 'create'
    ? t('nsi.objectTypes.signs.dialog.createTitle', {}, { default: 'Добавить признак' })
    : t('nsi.objectTypes.signs.dialog.editTitle', {}, { default: 'Редактировать признак' }),
)

function renderValues(values: SignValue[]) {
  if (!values.length) return '—'
  return h(
    'div',
    { class: 'chip-list' },
    values.map((value) =>
      h(
        NTag,
        { size: 'small', bordered: false, round: true, type: 'info', class: 'value-chip' },
        { default: () => value.name },
      ),
    ),
  )
}

function renderActions(row: SignTypeRow) {
  const editBtn = h(
    NButton,
    {
      quaternary: true,
      circle: true,
      size: 'small',
      onClick: () => openEdit(row),
      'aria-label': t('nsi.objectTypes.signs.actions.edit', {}, { default: 'Редактировать' }),
    },
    { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  )

  const delBtn = h(
    NButton,
    {
      quaternary: true,
      circle: true,
      size: 'small',
      onClick: () => openDelete(row),
      'aria-label': t('nsi.objectTypes.signs.actions.delete', {}, { default: 'Удалить' }),
    },
    { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
  )

  return h('div', { class: 'table-actions' }, [editBtn, delBtn])
}

function resetCreateErrors() {
  createErrors.name = ''
  createErrors.parentTypeId = ''
  createErrors.valuesText = ''
}

function resetEditErrors() {
  editErrors.name = ''
}

function openCreate() {
  dialogMode.value = 'create'
  dialogOpen.value = true
  createForm.name = ''
  createForm.mode = 'type'
  createForm.parentTypeId = null
  createForm.valuesText = ''
  resetCreateErrors()
}

function openEdit(row: SignTypeRow) {
  dialogMode.value = 'edit'
  dialogOpen.value = true
  editingRow.value = row
  editForm.typeId = row.id
  editForm.typeName = row.name
  editForm.values = row.values.map((value) => ({
    id: value.id,
    name: value.name,
    originalName: value.name,
    raw: value.raw,
  }))
  removedValueIds.value = []
  resetEditErrors()
}

function addEditValue() {
  editForm.values.push({ name: '' })
}

function removeEditValue(index: number) {
  const [removed] = editForm.values.splice(index, 1)
  if (removed?.id) {
    removedValueIds.value.push(removed.id)
  }
}

function openDelete(row: SignTypeRow) {
  deleteTarget.value = row
  deleteDialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
}

function showMore() {
  pagination.page = Math.min(maxPage.value, pagination.page + 1)
}

function normalizeRecordId(record: RawSignRecord): string | null {
  return toOptionalString(record.id ?? record.ID ?? record.Id)
}

function normalizeRecordName(record: RawSignRecord): string | null {
  return toOptionalString(record.name ?? record.NAME ?? record.Name ?? record.value ?? record.VALUE)
}

function normalizeRecord(record: RawSignRecord): SignRecord | null {
  const id = normalizeRecordId(record)
  const name = normalizeRecordName(record)
  if (!id || !name) return null

  const parentRaw = toOptionalString(record.parent ?? record.PARENT)
  const parentId = parentRaw && parentRaw !== '0' ? parentRaw : null
  const cls = toNumericOrUndefined(record.cls ?? record.CLS) ?? null

  return {
    id,
    name,
    parentId,
    cls,
    createdAt: toOptionalString(record.CreatedAt ?? record.createdAt) ?? null,
    updatedAt: toOptionalString(record.UpdatedAt ?? record.updatedAt) ?? null,
    objUser: toNumericOrUndefined(record.objUser ?? record.ObjUser) ?? null,
    pvUser: toNumericOrUndefined(record.pvUser ?? record.PvUser) ?? null,
    idUser: toNumericOrUndefined(record.idUser ?? record.IdUser) ?? null,
    fullNameUser: toOptionalString(record.fullNameUser ?? record.FullNameUser) ?? null,
    idCreatedAt: toNumericOrUndefined(record.idCreatedAt ?? record.IdCreatedAt) ?? null,
    idUpdatedAt: toNumericOrUndefined(record.idUpdatedAt ?? record.IdUpdatedAt) ?? null,
  }
}

function resolveDateStamp(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readStorageNumber(key: string): number | undefined {
  if (typeof window === 'undefined') return undefined
  const raw = window.localStorage.getItem(key)
  if (!raw) return undefined
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : undefined
}

function readStorageString(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  const raw = window.localStorage.getItem(key)
  if (!raw) return undefined
  const trimmed = raw.trim()
  return trimmed ? trimmed : undefined
}

function toNumeric(value: unknown): number | undefined {
  if (typeof value === 'number' || typeof value === 'string') {
    return toNumericOrUndefined(value)
  }
  return undefined
}

function parseStoredUserMeta(): UserMeta {
  const meta: UserMeta = {}

  meta.objUser =
    readStorageNumber('objUser') ??
    readStorageNumber('obj_user') ??
    readStorageNumber('objUserId')

  meta.pvUser =
    readStorageNumber('pvUser') ??
    readStorageNumber('pv_user') ??
    readStorageNumber('pvUserId')

  meta.idUser =
    readStorageNumber('idUser') ??
    readStorageNumber('userId') ??
    readStorageNumber('id_user')

  meta.fullNameUser =
    readStorageString('fullNameUser') ??
    readStorageString('fullname') ??
    readStorageString('full_name')

  if (typeof window !== 'undefined') {
    const jsonKeys = ['user', 'currentUser', 'authUser', 'curUser']
    for (const key of jsonKeys) {
      if (meta.objUser && meta.pvUser && meta.idUser && meta.fullNameUser) break
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        if (!meta.objUser) {
          const value = parsed.objUser ?? parsed.obj_user ?? parsed.objUserId
          meta.objUser = toNumeric(value) ?? meta.objUser
        }
        if (!meta.pvUser) {
          const value = parsed.pvUser ?? parsed.pv_user ?? parsed.pvUserId
          meta.pvUser = toNumeric(value) ?? meta.pvUser
        }
        if (!meta.idUser) {
          const value = parsed.idUser ?? parsed.userId ?? parsed.id_user ?? parsed.id
          meta.idUser = toNumeric(value) ?? meta.idUser
        }
        if (!meta.fullNameUser) {
          const value =
            toOptionalString(parsed.fullNameUser ?? parsed.fullname ?? parsed.fullName) ??
            meta.fullNameUser
          meta.fullNameUser = value
        }
      } catch {
        // ignore malformed storage
      }
    }
  }

  if (!meta.idUser && auth.user.value?.id != null) {
    meta.idUser = toNumericOrUndefined(auth.user.value.id)
  }
  if (!meta.fullNameUser && auth.user.value?.fullname) {
    meta.fullNameUser = auth.user.value.fullname
  }

  return meta
}

function buildCreatePayload(name: string, cls: number, parent?: string | null) {
  const stamp = resolveDateStamp()
  const meta = parseStoredUserMeta()

  return {
    name,
    cls,
    parent: parent ? toRpcId(parent) : undefined,
    CreatedAt: stamp,
    UpdatedAt: stamp,
    objUser: meta.objUser,
    pvUser: meta.pvUser,
  }
}

function buildUpdatePayload(record: SignRecord, overrides: Partial<SignRecord> = {}) {
  const stamp = resolveDateStamp()
  const meta = parseStoredUserMeta()

  return {
    id: toRpcId(record.id),
    cls: overrides.cls ?? record.cls ?? undefined,
    parent: overrides.parentId ? toRpcId(overrides.parentId) : undefined,
    name: overrides.name ?? record.name,
    idUser: meta.idUser ?? record.idUser ?? undefined,
    pvUser: meta.pvUser ?? record.pvUser ?? undefined,
    objUser: meta.objUser ?? record.objUser ?? undefined,
    fullNameUser: meta.fullNameUser ?? record.fullNameUser ?? undefined,
    idCreatedAt: record.idCreatedAt ?? undefined,
    CreatedAt: record.createdAt ?? stamp,
    idUpdatedAt: record.idUpdatedAt ?? undefined,
    UpdatedAt: stamp,
  }
}

function extractRecordId(payload: unknown): string | null {
  if (typeof payload === 'number' || typeof payload === 'string') {
    return toOptionalString(payload)
  }

  const record = firstRecord<unknown>(payload)
  if (!record) return null

  if (typeof record === 'number' || typeof record === 'string') {
    return toOptionalString(record)
  }

  return toOptionalString(
    (record as Record<string, unknown>).id ??
      (record as Record<string, unknown>).ID ??
      (record as Record<string, unknown>).Id,
  )
}

async function loadSignClsId(): Promise<void> {
  try {
    const response = await rpc('data/getClsIds', ['Cls_Sign'])
    const record = firstRecord<unknown>(response)
    const fromRecord =
      record && typeof record === 'object'
        ? toNumeric(
            (record as Record<string, unknown>).id ??
              (record as Record<string, unknown>).ID ??
              (record as Record<string, unknown>).cls ??
              (record as Record<string, unknown>).CLS,
          )
        : toNumeric(record)
    const resultValue =
      response && typeof response === 'object' && 'result' in (response as Record<string, unknown>)
        ? (response as { result?: unknown }).result
        : undefined
    const fromResult = toNumeric(resultValue)
    const fallback = toNumeric(response)
    const resolved = fromRecord ?? fromResult ?? fallback
    if (resolved) {
      signTypeClsId.value = resolved
    }
  } catch (error) {
    console.error('[signs] Не удалось загрузить класс признаков', error)
  }
}

async function loadSignVariants(): Promise<void> {
  try {
    const response = await rpc('data/loadClsForSelect', ['Typ_Sign'])
    const records = extractRecords<RawSignRecord>(response)
    const names = records
      .map((record) => normalizeRecordName(record))
      .filter((name): name is string => Boolean(name))
    const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'ru'))
    signVariantNames.value = unique
  } catch (error) {
    console.error('[signs] Не удалось загрузить варианты признаков', error)
  }
}

async function loadSignTypes(): Promise<void> {
  try {
    const response = await rpc('data/loadObj', [signTypeClsId.value])
    const records = extractRecords<RawSignRecord>(response)
    const options = records
      .map((record) => {
        const id = normalizeRecordId(record)
        const name = normalizeRecordName(record)
        if (!id || !name) return null
        return { label: name, value: id }
      })
      .filter((item): item is { label: string; value: string } => Boolean(item))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
    signTypeOptions.value = options
  } catch (error) {
    console.error('[signs] Не удалось загрузить список типов признаков', error)
  }
}

async function loadSigns(): Promise<void> {
  tableLoading.value = true
  try {
    const response = await rpc('data/loadSign', [0])
    const records = extractRecords<RawSignRecord>(response)
    const normalized = records
      .map((record) => normalizeRecord(record))
      .filter((item): item is SignRecord => Boolean(item))

    const typeMap = new Map<string, SignTypeRow>()
    const valuesBucket = new Map<string, SignValue[]>()

    for (const record of normalized) {
      if (!record.parentId) {
        typeMap.set(record.id, {
          id: record.id,
          name: record.name,
          raw: record,
          values: [],
        })
      } else {
        const list = valuesBucket.get(record.parentId) ?? []
        list.push({ id: record.id, name: record.name, raw: record })
        valuesBucket.set(record.parentId, list)
      }
    }

    for (const [parentId, values] of valuesBucket.entries()) {
      const target = typeMap.get(parentId)
      if (target) {
        target.values = values.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        continue
      }

      const fallbackName =
        signTypeOptions.value.find((option) => option.value === parentId)?.label ?? `Тип ${parentId}`
      typeMap.set(parentId, {
        id: parentId,
        name: String(fallbackName),
        raw: {
          id: parentId,
          name: String(fallbackName),
          parentId: null,
          cls: signTypeClsId.value,
          createdAt: null,
          updatedAt: null,
          objUser: null,
          pvUser: null,
          idUser: null,
          fullNameUser: null,
          idCreatedAt: null,
          idUpdatedAt: null,
        },
        values: values.sort((a, b) => a.name.localeCompare(b.name, 'ru')),
      })
    }

    signRows.value = Array.from(typeMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  } catch (error) {
    console.error('[signs] Не удалось загрузить признаки', error)
    message.error(getErrorMessage(error) || 'Не удалось загрузить признаки')
  } finally {
    tableLoading.value = false
  }
}

async function refreshData(): Promise<void> {
  await loadSignClsId()
  await Promise.all([loadSignVariants(), loadSignTypes()])
  await loadSigns()
}

function validateCreateForm(): boolean {
  resetCreateErrors()
  const name = createForm.name.trim()
  if (!name) {
    createErrors.name = 'Введите название'
  }

  if (createForm.mode === 'value' && !createForm.parentTypeId) {
    createErrors.parentTypeId = 'Выберите тип признака'
  }

  return !createErrors.name && !createErrors.parentTypeId
}

async function createSignType(): Promise<void> {
  const name = createForm.name.trim()
  const payload = buildCreatePayload(name, signTypeClsId.value)

  const response = await rpc('data/saveSign', ['ins', payload])
  const typeId = extractRecordId(response)
  if (!typeId) {
    throw new Error('Не удалось прочитать созданный тип признака')
  }

  const values = createForm.valuesText
    .split(';')
    .map((value) => value.trim())
    .filter(Boolean)

  for (const valueName of values) {
    const valuePayload = buildCreatePayload(valueName, signValueClsId.value, typeId)
    await rpc('data/saveSign', ['ins', valuePayload])
  }
}

async function createSignValue(): Promise<void> {
  const name = createForm.name.trim()
  if (!createForm.parentTypeId) return
  const payload = buildCreatePayload(name, signValueClsId.value, createForm.parentTypeId)
  await rpc('data/saveSign', ['ins', payload])
}

async function updateTypeName(row: SignTypeRow, nextName: string): Promise<void> {
  const payload = buildUpdatePayload(row.raw, {
    name: nextName,
    cls: signTypeClsId.value,
  })
  await rpc('data/saveSign', ['upd', payload])
}

async function updateValue(value: EditValue, parentId: string): Promise<void> {
  if (!value.id || !value.raw) return
  const payload = buildUpdatePayload(value.raw, {
    name: value.name.trim(),
    parentId,
    cls: signValueClsId.value,
  })
  await rpc('data/saveSign', ['upd', payload])
}

async function createValue(value: EditValue, parentId: string): Promise<void> {
  const name = value.name.trim()
  if (!name) return
  const payload = buildCreatePayload(name, signValueClsId.value, parentId)
  await rpc('data/saveSign', ['ins', payload])
}

async function deleteValue(id: string): Promise<void> {
  await rpc('data/deleteOwnerWithProperties', [toRpcId(id), 1])
}

async function saveEdit(): Promise<void> {
  const row = editingRow.value
  if (!row) return

  resetEditErrors()
  const name = editForm.typeName.trim()
  if (!name) {
    editErrors.name = 'Введите название'
    return
  }

  const cleanedValues = editForm.values.filter((value) => value.name.trim())

  if (name !== row.name) {
    await updateTypeName(row, name)
  }

  for (const value of cleanedValues) {
    if (value.id) {
      if (value.originalName && value.originalName.trim() === value.name.trim()) {
        continue
      }
      await updateValue(value, row.id)
    } else {
      await createValue(value, row.id)
    }
  }

  for (const valueId of removedValueIds.value) {
    await deleteValue(valueId)
  }
}

async function saveDialog() {
  if (saving.value) return

  saving.value = true
  try {
    if (dialogMode.value === 'create') {
      if (!validateCreateForm()) return
      if (createForm.mode === 'type') {
        await createSignType()
      } else {
        await createSignValue()
      }
      message.success('Признак сохранён')
    } else {
      await saveEdit()
      message.success('Признак обновлён')
    }

    dialogOpen.value = false
    await refreshData()
  } catch (error) {
    console.error('[signs] Не удалось сохранить', error)
    message.error(getErrorMessage(error) || 'Не удалось сохранить признак')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return

  deleteLoading.value = true
  try {
    for (const value of deleteTarget.value.values) {
      await deleteValue(value.id)
    }
    await rpc('data/deleteOwnerWithProperties', [toRpcId(deleteTarget.value.id), 1])
    message.success('Признак удалён')
    deleteDialogOpen.value = false
    deleteTarget.value = null
    await refreshData()
  } catch (error) {
    console.error('[signs] Не удалось удалить признак', error)
    message.error(getErrorMessage(error) || 'Не удалось удалить признак')
  } finally {
    deleteLoading.value = false
  }
}

watch(
  () => [search.value, valueFilter.value],
  () => {
    pagination.page = 1
  },
)

watch(
  () => pagination.pageSize,
  () => {
    pagination.page = 1
  },
)

watch(
  () => createForm.mode,
  (value) => {
    if (value === 'type') {
      createForm.parentTypeId = null
    } else {
      createForm.valuesText = ''
    }
  },
)

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 768px)')
  isMobile.value = mediaQuery.matches
  mediaQuery.addEventListener('change', handleMediaChange)
  void refreshData()
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', handleMediaChange)
})

function handleMediaChange(event: MediaQueryListEvent) {
  isMobile.value = event.matches
}
</script>

<style scoped>
.signs-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow-x: hidden;
}

.table-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
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

:deep(.n-data-table .n-data-table-td.col-values) {
  white-space: normal;
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

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toolbar__left {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.page-title__info :deep(.n-icon) {
  font-size: 16px;
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
  font-size: 12px;
  color: var(--n-text-color-3);
}

.toolbar__controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar__filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar__search {
  width: 280px;
  max-width: 100%;
}

.toolbar__filter {
  width: 220px;
}

.toolbar__select {
  min-width: 180px;
}

.table-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.value-chip {
  white-space: nowrap;
}

.empty {
  color: var(--n-text-color-3);
  font-size: 12px;
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
}

.show-more-bar {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.values-preview {
  margin: 8px 0 16px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--s360-surface);
}

.values-preview__title {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin-bottom: 6px;
}

.values-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.values-editor__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.values-editor__add {
  align-self: flex-start;
}

.delete-preview {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--s360-surface);
}

.delete-preview__title {
  font-weight: 600;
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__controls {
    justify-content: flex-start;
  }

  .toolbar__search,
  .toolbar__filter,
  .toolbar__select {
    width: 100%;
  }

  .card__grid {
    grid-template-columns: 1fr;
  }

  .card__grid dt {
    font-size: 11px;
  }

  .modal-footer {
    flex-direction: column;
  }
}
</style>
