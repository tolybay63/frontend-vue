<!-- Файл: src/pages/nsi/TasksPage.vue
     Назначение: справочник «Задачи» с таблицей, фильтрами, поиском, пагинацией и CRUD-модалкой. -->
<template>
  <section class="tasks-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          {{ t('nsi.tasks.title', {}, { default: 'Справочник «Задачи»' }) }}
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            :aria-label="t('nsi.tasks.help', {}, { default: 'Справка о справочнике' })"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">
          {{
            t(
              'nsi.tasks.subtitle',
              {},
              {
                default:
                  'Ведите перечень операций, при выполнении которых будут расходоваться ресурсы. Добавляйте новые задачи и указывайте единицы измерения.',
              },
            )
          }}
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="q"
          :placeholder="t('nsi.tasks.searchPlaceholder', {}, { default: 'Поиск…' })"
          clearable
          round
          class="toolbar__search"
        />

        <div class="toolbar__filters">
          <NSelect
            v-model:value="measureFilter"
            :options="measureFilterOptions"
            multiple
            filterable
            clearable
            size="small"
            class="toolbar__select"
            :placeholder="t('nsi.tasks.filter.measure', {}, { default: 'Единица измерения' })"
          />
        </div>

        <NSelect
          v-if="isMobile"
          v-model:value="sortOrder"
          :options="sortOptions"
          size="small"
          class="toolbar__select"
          :aria-label="t('nsi.tasks.sortAria', {}, { default: 'Порядок сортировки' })"
        />

        <NButton type="primary" @click="openCreate">
          + {{ t('nsi.tasks.add', {}, { default: 'Добавить задачу' }) }}
        </NButton>
      </div>
    </NCard>

    <div class="table-area">
      <NDataTable
        v-if="!isMobile"
        class="tasks-table s360-cards table-full table-stretch"
        :columns="columns"
        :data="rows"
        :loading="tableLoading"
        :row-key="rowKey"
        :bordered="false"
      />

      <div v-else class="cards" role="list">
        <div class="list-info">
          {{
            t(
              'nsi.tasks.listInfo',
              { shown: visibleCount, total },
              { default: 'Показано: ' + visibleCount + ' из ' + total },
            )
          }}
        </div>
        <article
          v-for="item in rows"
          :key="item.rowKey"
          class="card"
          role="group"
          :aria-label="item.name"
        >
          <header class="card__header">
            <div class="card__title" role="heading" aria-level="4">
              <FieldRenderer :field="primaryField" :row="item" />
            </div>
          </header>

          <dl class="card__grid">
            <template
              v-for="(field, fieldIndex) in infoFields"
              :key="`${item.rowKey}:${field.key || field.label || fieldIndex}`"
            >
              <dt>{{ field.label }}</dt>
              <dd>
                <FieldRenderer :field="field" :row="item" />
              </dd>
            </template>
          </dl>

          <footer class="card__actions">
            <ActionsRenderer :row="item" />
          </footer>
        </article>
      </div>

      <div v-if="isMobile && pagination.page < maxPage" class="show-more-bar">
        <NButton tertiary @click="showMore" :loading="tableLoading">
          {{ t('nsi.tasks.showMore', {}, { default: 'Показать ещё' }) }}
        </NButton>
      </div>

      <div class="pagination-bar" v-if="!isMobile">
        <NPagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :item-count="total"
          show-size-picker
          show-quick-jumper
          :aria-label="t('nsi.tasks.paginationAria', {}, { default: 'Постраничная навигация по задачам' })"
        >
          <template #prefix>
            <span class="pagination-total">
              {{ t('nsi.tasks.total', { total }, { default: 'Всего: ' + total }) }}
            </span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="modalOpen"
      preset="card"
      :title="modalTitle"
      style="width: min(520px, 96vw)"
    >
      <NForm
        ref="formRef"
        :model="formModel"
        :rules="formRules"
        size="small"
        :label-width="isMobile ? undefined : 180"
        :label-placement="isMobile ? 'top' : 'left'"
        class="task-form"
      >
        <NFormItem
          :label="t('nsi.tasks.form.name.label', {}, { default: 'Наименование' })"
          path="name"
        >
          <NInput
            v-model:value="formModel.name"
            :placeholder="t('nsi.tasks.form.name.placeholder', {}, { default: 'Введите наименование задачи' })"
            maxlength="250"
            show-count
          />
        </NFormItem>

        <NFormItem
          :label="t('nsi.tasks.form.measure.label', {}, { default: 'Единица измерения' })"
          path="measureId"
        >
          <CreatableSelect
            :value="formModel.measureId"
            :options="measureSelectOptions"
            :multiple="false"
            :clearable="false"
            :loading="formLoading || measureOptionsLoading"
            :placeholder="t('nsi.tasks.form.measure.placeholder', {}, { default: 'Выберите или создайте единицу измерения' })"
            :create="createMeasureOption"
            @update:value="updateMeasureValue"
            @created="handleMeasureCreated"
          />
        </NFormItem>

        <NFormItem
          :label="t('nsi.tasks.form.description.label', {}, { default: 'Описание' })"
        >
          <NInput
            v-model:value="formModel.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 5 }"
            :placeholder="t('nsi.tasks.form.description.placeholder', {}, { default: 'Добавьте комментарий или примечание' })"
            maxlength="1000"
            show-count
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="closeModal" :disabled="formLoading">
            {{ t('nsi.tasks.actions.cancel', {}, { default: 'Отмена' }) }}
          </NButton>
          <NButton type="primary" class="btn-primary" :loading="formLoading" @click="handleSubmit">
            {{
              modalMode === 'edit'
                ? t('nsi.tasks.actions.save', {}, { default: 'Сохранить' })
                : t('nsi.tasks.actions.create', {}, { default: 'Создать' })
            }}
          </NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="infoOpen"
      preset="card"
      :title="t('nsi.tasks.info.title', {}, { default: 'О справочнике задач' })"
      style="max-width: 520px; width: min(92vw, 520px)"
    >
      <p class="text-body">
        {{
          t(
            'nsi.tasks.info.p1',
            {},
            {
              default:
                'Справочник «Задачи» помогает планировать расход ресурсов. Сохраняйте операции с указанием единиц измерения, чтобы использовать их при формировании работ и ведомостей.',
            },
          )
        }}
      </p>
      <p class="text-body">
        {{
          t(
            'nsi.tasks.info.p2',
            {},
            {
              default:
                'Можно искать по названию, фильтровать по единице измерения, сортировать и редактировать записи. При отсутствии нужной единицы создайте её прямо из формы.',
            },
          )
        }}
      </p>
      <template #footer>
        <div class="modal-footer">
          <NButton type="primary" @click="infoOpen = false">
            {{ t('nsi.tasks.info.ok', {}, { default: 'Понятно' }) }}
          </NButton>
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
  onMounted,
  reactive,
  ref,
  watch,
  type PropType,
  type VNodeChild,
} from 'vue'
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
  NPopconfirm,
  NSelect,
  NTooltip,
  useDialog,
  useMessage,
  type DataTableColumns,
  type FormInst,
  type FormRules,
  type SelectOption,
} from 'naive-ui'
import { InformationCircleOutline, CreateOutline, TrashOutline } from '@vicons/ionicons5'

import { normalizeText } from '@shared/lib'
import { useIsMobile } from '@/shared/composables/useIsMobile'
import {
  loadTasks as fetchTasks,
  createTask as rpcCreateTask,
  updateTask as rpcUpdateTask,
  deleteTask as rpcDeleteTask,
  type Task,
  type TaskMutationInput,
} from '@entities/task'
import {
  loadParameterMeasures,
  createMeasureAndSelect,
  type ParameterMeasureOption,
} from '@entities/object-parameter'
import { CreatableSelect } from '@features/creatable-select'

const NO_MEASURE_KEY = '__none__'
const MEASURE_PROP_ID = 1180

const { t } = useI18n()
const { isMobile } = useIsMobile('(max-width: 768px)')
const message = useMessage()
const dialog = useDialog()

type TaskTableRow = Task & { rowKey: string; index: number }

interface FieldDescriptor {
  key: string
  label: string
  render?: (row: TaskTableRow) => VNodeChild
}

const tasks = ref<Task[]>([])
const loading = ref(false)

const q = ref('')
const measureFilter = ref<string[]>([])
const sortOrder = ref<'name-asc' | 'name-desc' | 'measure-asc' | 'measure-desc'>('name-asc')

const pagination = reactive({
  page: 1,
  pageSize: 20,
})

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const formLoading = ref(false)
const infoOpen = ref(false)

const formRef = ref<FormInst | null>(null)
const formModel = reactive<{
  name: string
  measureId: string | null
  description: string
}>({
  name: '',
  measureId: null,
  description: '',
})

const formRules: FormRules = {
  name: {
    required: true,
    trigger: ['blur', 'input'],
    message: t('nsi.tasks.validation.name', {}, { default: 'Укажите наименование задачи' }),
  },
  measureId: {
    required: true,
    trigger: ['blur', 'change'],
    message: t('nsi.tasks.validation.measure', {}, { default: 'Выберите единицу измерения' }),
  },
}

const editingTask = ref<Task | null>(null)
const deletingKey = ref<string | null>(null)

const measureOptions = ref<ParameterMeasureOption[]>([])
const measureOptionsLoading = ref(false)
let measureRefreshToken = 0

function normalizeMeasureOption(option: ParameterMeasureOption): ParameterMeasureOption {
  const id = Number(option.id)
  const pv = Number(option.pv)
  const name = (option.name ?? '').trim() || `Единица ${id}`
  return { id, pv, name }
}

function mergeMeasureOptions(next: ParameterMeasureOption[]) {
  const map = new Map<number, ParameterMeasureOption>()
  const current = measureOptions.value.map(normalizeMeasureOption)
  const incoming = next.map(normalizeMeasureOption)

  for (const option of [...current, ...incoming]) {
    if (!Number.isFinite(option.id)) continue
    map.set(option.id, option)
  }

  measureOptions.value = Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ru'),
  )
}

async function ensureMeasureDirectory(force = false) {
  if (measureOptions.value.length && !force) return
  measureOptionsLoading.value = true
  try {
    const items = await loadParameterMeasures()
    mergeMeasureOptions(items)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    measureOptionsLoading.value = false
  }
}

function ensureMeasureForTask(task: Task) {
  if (task.measureObjId == null) return
  const key = String(task.measureObjId)
  const exists = measureOptions.value.some((option) => String(option.id) === key)
  if (!exists) {
    mergeMeasureOptions([
      {
        id: task.measureObjId,
        pv: task.measurePvId ?? task.measureObjId,
        name: task.measureName ?? `Единица ${task.measureObjId}`,
      },
    ])
    void refreshMeasureDirectory({
      id: task.measureObjId,
      pv: task.measurePvId ?? task.measureObjId,
      name: task.measureName ?? `Единица ${task.measureObjId}`,
    })
  }
}

const measureOptionById = computed(() => {
  const map = new Map<string, ParameterMeasureOption>()
  measureOptions.value.forEach((option) => map.set(String(option.id), option))
  return map
})

const measureSelectOptions = computed<SelectOption[]>(() =>
  measureOptions.value.map((option) => ({
    label: option.name,
    value: String(option.id),
  })),
)

const noMeasureLabel = computed(() =>
  t('nsi.tasks.filter.noMeasure', {}, { default: 'Без единицы измерения' }),
)

const hasTasksWithoutMeasure = computed(() =>
  tasks.value.some((taskItem) => taskItem.measureObjId == null),
)

const measureFilterOptions = computed<SelectOption[]>(() => {
  const map = new Map<string, SelectOption>()
  measureOptions.value.forEach((option) => {
    const value = String(option.id)
    map.set(value, { label: option.name, value })
  })

  tasks.value.forEach((taskItem) => {
    if (taskItem.measureObjId == null) return
    const value = String(taskItem.measureObjId)
    if (!map.has(value)) {
      map.set(value, {
        label: taskItem.measureName ?? `Единица ${taskItem.measureObjId}`,
        value,
      })
    }
  })

  const result = Array.from(map.values()).sort((a, b) =>
    String(a.label ?? '').localeCompare(String(b.label ?? ''), 'ru'),
  )

  if (hasTasksWithoutMeasure.value) {
    result.push({ label: noMeasureLabel.value, value: NO_MEASURE_KEY })
  }

  return result
})

const sortOptions = computed<SelectOption[]>(() => [
  {
    label: t('nsi.tasks.sort.nameAsc', {}, { default: 'По имени (А→Я)' }),
    value: 'name-asc',
  },
  {
    label: t('nsi.tasks.sort.nameDesc', {}, { default: 'По имени (Я→А)' }),
    value: 'name-desc',
  },
  {
    label: t('nsi.tasks.sort.measureAsc', {}, { default: 'По единице (А→Я)' }),
    value: 'measure-asc',
  },
  {
    label: t('nsi.tasks.sort.measureDesc', {}, { default: 'По единице (Я→А)' }),
    value: 'measure-desc',
  },
])

function deriveRowKey(task: Task, index: number): string {
  if (task.rawId != null && task.rawId !== '') return task.rawId
  if (task.id != null) return `task-${task.id}`
  return `task-${index}`
}

const processedRows = computed<TaskTableRow[]>(() =>
  tasks.value.map((taskItem, index) => ({
    ...taskItem,
    rowKey: deriveRowKey(taskItem, index),
    index,
  })),
)

const searchNormalized = computed(() => normalizeText(q.value))

const filteredRows = computed<TaskTableRow[]>(() => {
  const search = searchNormalized.value
  const filterValues = new Set(measureFilter.value)
  const hasFilter = filterValues.size > 0
  const includeNoMeasure = filterValues.has(NO_MEASURE_KEY)

  return processedRows.value.filter((row) => {
    if (hasFilter) {
      const rowKey = row.measureObjId != null ? String(row.measureObjId) : NO_MEASURE_KEY
      if (row.measureObjId == null) {
        if (!includeNoMeasure) return false
      } else if (!filterValues.has(rowKey)) {
        return false
      }
    }

    if (!search) return true

    const fields = [
      row.name,
      row.measureName,
      row.description,
    ].map((value) => normalizeText(value ?? ''))

    return fields.some((field) => field.includes(search))
  })
})

function compareName(a: TaskTableRow, b: TaskTableRow) {
  return a.name.localeCompare(b.name, 'ru')
}

function compareMeasure(a: TaskTableRow, b: TaskTableRow) {
  return (a.measureName ?? '').localeCompare(b.measureName ?? '', 'ru')
}

const sortedRows = computed<TaskTableRow[]>(() => {
  const [field, direction] = sortOrder.value.split('-') as ['name' | 'measure', 'asc' | 'desc']
  const base = [...filteredRows.value]

  base.sort(field === 'measure' ? compareMeasure : compareName)
  if (direction === 'desc') base.reverse()

  return base
})

const total = computed(() => sortedRows.value.length)
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize)))

const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return sortedRows.value.slice(start, start + pagination.pageSize)
})

const mobileRows = computed(() =>
  sortedRows.value.slice(0, pagination.page * pagination.pageSize),
)

const rows = computed(() => (isMobile.value ? mobileRows.value : paginatedRows.value))
const visibleCount = computed(() => rows.value.length)
const tableLoading = computed(() => loading.value)

watch(
  () => [q.value, measureFilter.value],
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

watch(
  () => pagination.pageSize,
  () => {
    const max = maxPage.value
    if (pagination.page > max) pagination.page = max
  },
)

function rowKey(row: TaskTableRow) {
  return row.rowKey
}

function renderNameCell(row: TaskTableRow): VNodeChild {
  return h('div', { class: 'name-cell__title' }, row.name || '—')
}

function renderMeasureCell(row: TaskTableRow): VNodeChild {
  return row.measureName ?? '—'
}

function renderTooltipLines(value: string) {
  return value.split(/\n+/).map((line, index) => h('div', { key: `line-${index}` }, line || ' '))
}

function renderMultilineCell(value: string | null | undefined): VNodeChild {
  const text = value?.trim()
  if (!text) return '—'

  const block = () => h('div', { class: 'cell-multiline' }, text)

  return h(
    NTooltip,
    { placement: 'top', delay: 120 },
    {
      trigger: block,
      default: () => renderTooltipLines(text),
    },
  )
}

function renderDescriptionCell(row: TaskTableRow) {
  return renderMultilineCell(row.description)
}

async function confirmDelete(row: TaskTableRow): Promise<boolean> {
  return new Promise((resolve) => {
    const name = row.name || t('nsi.tasks.item.untitled', {}, { default: 'без названия' })
    const dialogReactive = dialog.warning({
      title: t('nsi.tasks.actions.remove.title', {}, { default: 'Удалить задачу?' }),
      content: t(
        'nsi.tasks.actions.remove.prompt',
        { name },
        { default: `Удалить «${name}» и связанные данные?` },
      ),
      positiveText: t('nsi.tasks.actions.remove.confirm', {}, { default: 'Удалить' }),
      negativeText: t('nsi.tasks.actions.remove.cancel', {}, { default: 'Отмена' }),
      maskClosable: false,
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    })

    if (!dialogReactive) resolve(false)
  })
}

async function handleDelete(row: TaskTableRow) {
  if (deletingKey.value) return
  const confirmed = await confirmDelete(row)
  if (!confirmed) return

  deletingKey.value = row.rowKey
  try {
    await rpcDeleteTask(row)
    message.success(t('nsi.tasks.actions.remove.success', {}, { default: 'Задача удалена' }))
    await loadTasks()
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    deletingKey.value = null
  }
}

function renderActionsCell(row: TaskTableRow): VNodeChild {
  const editButton = h(
    NButton,
    {
      quaternary: true,
      circle: true,
      size: 'small',
      'aria-label': t('nsi.tasks.actions.edit', {}, { default: 'Редактировать задачу' }),
      onClick: () => openEdit(row),
    },
    { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  )

  const deleteButton = h(
    NPopconfirm,
    {
      onPositiveClick: () => handleDelete(row),
      positiveText: t('nsi.tasks.actions.remove.confirm', {}, { default: 'Удалить' }),
      negativeText: t('nsi.tasks.actions.remove.cancel', {}, { default: 'Отмена' }),
      disabled: Boolean(deletingKey.value && deletingKey.value !== row.rowKey),
    },
    {
      trigger: () =>
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'small',
            type: 'error',
            loading: deletingKey.value === row.rowKey,
            'aria-label': t('nsi.tasks.actions.remove.tooltip', {}, { default: 'Удалить задачу' }),
          },
          { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
        ),
      default: () =>
        t('nsi.tasks.actions.remove.confirmBody', {}, { default: 'Удалить выбранную задачу?' }),
    },
  )

  return h('div', { class: 'table-actions' }, [editButton, deleteButton])
}

const columns = computed<DataTableColumns<TaskTableRow>>(() => [
  {
    title: t('nsi.tasks.table.name', {}, { default: 'Наименование' }),
    key: 'name',
    minWidth: 240,
    sorter: compareName,
    render: (row) => renderNameCell(row),
  },
  {
    title: t('nsi.tasks.table.measure', {}, { default: 'Единица измерения' }),
    key: 'measure',
    width: 180,
    sorter: compareMeasure,
    render: (row) => renderMeasureCell(row),
  },
  {
    title: t('nsi.tasks.table.description', {}, { default: 'Описание' }),
    key: 'description',
    minWidth: 280,
    render: (row) => renderDescriptionCell(row),
  },
  {
    title: t('nsi.tasks.table.actions', {}, { default: 'Действия' }),
    key: 'actions',
    width: 120,
    align: 'center',
    className: 'actions-column',
    render: (row) => renderActionsCell(row),
  },
])

const primaryField: FieldDescriptor = {
  key: 'name',
  label: '',
  render: (row) => renderNameCell(row),
}

const infoFields = computed<FieldDescriptor[]>(() => [
  {
    key: 'measureName',
    label: t('nsi.tasks.table.measure', {}, { default: 'Единица измерения' }),
    render: (row) => renderMeasureCell(row),
  },
  {
    key: 'description',
    label: t('nsi.tasks.table.description', {}, { default: 'Описание' }),
    render: (row) => renderDescriptionCell(row),
  },
])

async function loadTasks() {
  loading.value = true
  try {
    const data = await fetchTasks()
    tasks.value = data
    data.forEach((taskItem) => ensureMeasureForTask(taskItem))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    loading.value = false
  }
}

function resetForm() {
  formModel.name = ''
  formModel.measureId = null
  formModel.description = ''
  formRef.value?.restoreValidation()
}

function applyTaskToForm(task: Task) {
  formModel.name = task.name
  formModel.measureId =
    task.measureObjId != null ? String(task.measureObjId) : formModel.measureId ?? null
  formModel.description = task.description ?? ''
}

async function openCreate() {
  modalMode.value = 'create'
  editingTask.value = null
  resetForm()
  await ensureMeasureDirectory()
  modalOpen.value = true
}

async function openEdit(task: Task) {
  modalMode.value = 'edit'
  editingTask.value = task
  ensureMeasureForTask(task)
  await ensureMeasureDirectory()
  resetForm()
  applyTaskToForm(task)
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

function updateMeasureValue(value: string[] | string | null) {
  if (Array.isArray(value)) {
    formModel.measureId = value[0] ?? null
  } else if (typeof value === 'string') {
    formModel.measureId = value
  } else {
    formModel.measureId = null
  }
}

async function createMeasureOption(name: string) {
  const created = await createMeasureAndSelect(name, { propId: MEASURE_PROP_ID })
  const normalized = normalizeMeasureOption(created)
  mergeMeasureOptions([normalized])
  const value = String(normalized.id)
  formModel.measureId = value
  void (async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    await refreshMeasureDirectory(normalized)
  })()
  return { label: normalized.name, value }
}

function handleMeasureCreated(option: { label: string; value: string }) {
  if (!measureFilter.value.includes(option.value)) return
  measureFilter.value = [...measureFilter.value]
}

async function refreshMeasureDirectory(fallback: ParameterMeasureOption) {
  const refreshToken = ++measureRefreshToken
  try {
    const refreshed = await loadParameterMeasures()
    if (refreshToken !== measureRefreshToken) return
    mergeMeasureOptions(refreshed)
    const resolvedOption =
      refreshed.find((option) => Number(option.id) === Number(fallback.id)) ??
      refreshed.find((option) => Number(option.pv) === Number(fallback.pv)) ??
      fallback
    if (formModel.measureId === String(fallback.id)) {
      formModel.measureId = String(resolvedOption.id)
    }
  } catch (error) {
    if (refreshToken !== measureRefreshToken) return
    console.error('[tasks] Не удалось обновить единицы измерения', error)
    mergeMeasureOptions([fallback])
  }
}

function buildTaskMutation(): TaskMutationInput | null {
  const measureId = formModel.measureId
  if (!measureId) {
    message.error(t('nsi.tasks.validation.measure', {}, { default: 'Выберите единицу измерения' }))
    return null
  }

  const option = measureOptionById.value.get(measureId)
  if (!option) {
    message.error(
      t('nsi.tasks.validation.measureMissing', {}, { default: 'Единица измерения недоступна' }),
    )
    return null
  }

  return {
    name: formModel.name,
    description: formModel.description,
    measure: {
      objId: Number(option.id),
      pvId: Number(option.pv),
      name: option.name,
    },
  }
}

async function handleSubmit() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const mutation = buildTaskMutation()
  if (!mutation) return

  formLoading.value = true
  try {
    if (modalMode.value === 'edit' && editingTask.value) {
      await rpcUpdateTask(editingTask.value, mutation)
      message.success(t('nsi.tasks.actions.saveSuccess', {}, { default: 'Изменения сохранены' }))
    } else {
      await rpcCreateTask(mutation)
      message.success(t('nsi.tasks.actions.createSuccess', {}, { default: 'Задача создана' }))
    }
    modalOpen.value = false
    await loadTasks()
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    message.error(reason)
  } finally {
    formLoading.value = false
  }
}

function showMore() {
  const nextPage = pagination.page + 1
  if (nextPage <= maxPage.value) {
    pagination.page = nextPage
  }
}

const modalTitle = computed(() =>
  modalMode.value === 'edit'
    ? t('nsi.tasks.modal.edit', {}, { default: 'Редактирование задачи' })
    : t('nsi.tasks.modal.create', {}, { default: 'Создание задачи' }),
)

onMounted(async () => {
  await Promise.all([loadTasks(), ensureMeasureDirectory()])
})

const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: {
      type: Object as PropType<FieldDescriptor>,
      required: true,
    },
    row: {
      type: Object as PropType<TaskTableRow>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const { field, row } = props
      if (field.render) return field.render(row)
      const value = (row as unknown as Record<string, unknown>)[field.key]
      if (value == null || value === '') return '—'
      if (typeof value === 'string') return value
      if (typeof value === 'number') return String(value)
      return String(value ?? '—')
    }
  },
})

const ActionsRenderer = defineComponent({
  name: 'ActionsRenderer',
  props: {
    row: {
      type: Object as PropType<TaskTableRow>,
      required: true,
    },
  },
  setup(props) {
    return () => renderActionsCell(props.row)
  },
})
</script>

<style scoped>
.tasks-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  gap: 4px;
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
  padding: 0;
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

.toolbar__filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar__select {
  min-width: 200px;
}

.toolbar__search {
  width: clamp(200px, 22vw, 320px);
}

.table-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
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

:deep(.n-data-table .n-data-table-th[data-col-key='actions']),
:deep(.n-data-table .n-data-table-td.actions-column) {
  width: 120px;
  text-align: center;
}

.name-cell__title {
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
}

.cell-multiline {
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
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
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  justify-content: flex-end;
  flex-wrap: wrap;
}

.table-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
}

:deep(.n-data-table .n-data-table-tr:hover) .table-actions {
  opacity: 1;
}

.card__actions .table-actions {
  opacity: 1;
  justify-content: flex-end;
}

.actions-column {
  text-align: center;
}

.actions-column :deep(.n-data-table-th__title) {
  justify-content: center;
}

.actions-column :deep(.n-data-table-td__content) {
  justify-content: center;
}

.list-info {
  font-size: 13px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
}

.show-more-bar {
  display: flex;
  justify-content: center;
  padding: 8px 0 12px;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
}

.pagination-total {
  font-size: 13px;
  color: var(--s360-color-text-subtle, rgba(0, 0, 0, 0.6));
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .toolbar__controls {
    justify-content: stretch;
  }

  .toolbar__search,
  .toolbar__select,
  .toolbar__filters {
    width: 100%;
  }
}

@media (max-width: 360px) {
  .card__grid {
    grid-template-columns: 100px 1fr;
  }
}
</style>
