<!-- Файл: src/pages/nsi/ComponentsPage.vue
     Назначение: страница справочника «Компоненты» с таблицей, фильтрами и CRUD-модалкой.
     Использование: доступна по маршруту /nsi/components. -->
<template>
  <section class="components-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          {{ t('nsi.objectTypes.components.title', {}, { default: 'Справочник «Компоненты обслуживаемых объектов»' }) }}
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            :aria-label="t('nsi.objectTypes.components.help', {}, { default: 'Информация о справочнике' })"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">
          {{ t('nsi.objectTypes.components.subtitle', {}, { default: 'Здесь можно просмотреть перечень компонентов и их связи с типами объектов, параметрами и дефектами' }) }}
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="search"
          :placeholder="t('nsi.objectTypes.components.searchPlaceholder', {}, { default: 'Поиск…' })"
          clearable
          round
          class="toolbar__search"
        />

        <div class="toolbar__filters">
          <NSelect
            size="small"
            class="toolbar__filter"
            :options="objectTypeFilterOptions"
            :value="objectTypeFilter"
            multiple
            filterable
            clearable
            :placeholder="t('nsi.objectTypes.components.filter.objectTypes', {}, { default: 'Типы объектов' })"
            @update:value="handleObjectTypeFilterChange"
          />
          <NSelect
            size="small"
            class="toolbar__filter"
            :options="parameterFilterOptions"
            :value="parameterFilter"
            multiple
            filterable
            clearable
            :placeholder="t('nsi.objectTypes.components.filter.parameters', {}, { default: 'Параметры' })"
            @update:value="handleParameterFilterChange"
          />
          <NSelect
            size="small"
            class="toolbar__filter"
            :options="defectFilterOptions"
            :value="defectFilter"
            multiple
            filterable
            clearable
            :placeholder="t('nsi.objectTypes.components.filter.defects', {}, { default: 'Дефекты' })"
            @update:value="handleDefectFilterChange"
          />
        </div>

        <NSelect
          v-if="isMobile"
          v-model:value="sortOrder"
          :options="sortOptions"
          size="small"
          class="toolbar__select"
          :aria-label="t('nsi.objectTypes.components.sortAria', {}, { default: 'Порядок сортировки' })"
        />
      </div>
    </NCard>

    <div class="table-area">
      <NDataTable
        v-if="!isMobile"
        class="components-table s360-cards table-full table-stretch"
        :columns="columns"
        :data="rows"
        :loading="tableLoading"
        :row-key="rowKey"
        :bordered="false"
        size="small"
      />

      <div v-else class="cards" role="list">
        <div class="list-info">
          {{ t('nsi.objectTypes.components.listInfo', { shown: visibleCount, total }, { default: 'Показано: ' + visibleCount + ' из ' + total }) }}
        </div>
        <article
          v-for="item in rows"
          :key="item.id"
          class="card"
          role="group"
          :aria-label="item.name"
        >
          <header class="card__header">
            <h3 class="card__title">{{ item.name }}</h3>
          </header>

          <dl class="card__grid">
            <dt>{{ t('nsi.objectTypes.components.section.objectTypes', {}, { default: 'Типы объектов' }) }}</dt>
            <dd><RelationsList :relations="item.objectTypes" :expandable="true" /></dd>
            <dt>{{ t('nsi.objectTypes.components.section.parameters', {}, { default: 'Параметры' }) }}</dt>
            <dd>
              <RelationsList :relations="item.parameters" :formatter="formatParameterRelation" :expandable="true" />
            </dd>
            <dt>{{ t('nsi.objectTypes.components.section.defects', {}, { default: 'Дефекты' }) }}</dt>
            <dd><RelationsList :relations="item.defects" :formatter="formatDefectRelation" :expandable="true" /></dd>
          </dl>

          <!-- actions removed for read-only mode -->
        </article>
      </div>

      <div v-if="isMobile && pagination.page < maxPage" class="show-more-bar">
        <NButton tertiary @click="showMore" :loading="tableLoading">{{ t('nsi.objectTypes.components.showMore', {}, { default: 'Показать ещё' }) }}</NButton>
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

    <NModal v-model:show="infoOpen" preset="card" :title="t('nsi.objectTypes.components.info.title', {}, { default: 'О справочнике' })" style="max-width: 640px">
      <p>
        {{ t('nsi.objectTypes.components.info.p1', {}, { default: 'Компоненты описывают элементы обслуживаемых объектов и используются при настройке параметров, дефектов и работ. Здесь можно посмотреть текущие связи.' }) }}
      </p>
      <p>
        {{ t('nsi.objectTypes.components.info.p2', {}, { default: 'Используйте фильтры, чтобы сузить список по типам объектов, параметрам или дефектам. Добавление новых компонентов осуществляется только при создании типов, дефектов или параметров на соответствующих страницах справочников.' }) }}
      </p>
      <template #footer>
        <NButton type="primary" @click="infoOpen = false">{{ t('nsi.objectTypes.components.info.ok', {}, { default: 'Понятно' }) }}</NButton>
      </template>
    </NModal>

    <!-- CRUD modal removed for read-only mode -->
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
import { useRoute } from 'vue-router'
import {
  NButton,
  NCard,
  NDataTable,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NPopover,
  NSelect,
  NTag,
  NTooltip,
  type DataTableColumns,
  type SelectOption,
} from 'naive-ui'
import { InformationCircleOutline } from '@vicons/ionicons5'

import { type ComponentsSnapshot, type LoadedComponentWithRelations } from '@entities/component'
import { useComponentsQuery } from '@features/component-crud'
import { useObjectParametersQuery } from '@features/object-parameter-crud'
import { useObjectTypesQuery } from '@features/object-type-crud'
import { normalizeText } from '@shared/lib'
import type { LoadedObjectParameter } from '@entities/object-parameter'

const { t } = useI18n()
interface PaginationState {
  page: number
  pageSize: number
}

// removed: ComponentForm (no editing on read-only page)

const infoOpen = ref(false)
const search = ref('')
const objectTypeFilter = ref<string[]>([])
const parameterFilter = ref<string[]>([])
const defectFilter = ref<string[]>([])
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })
// read-only mode: no form or editing state

const route = useRoute()
watch(
  () => route.query.q,
  (value) => {
    const text = Array.isArray(value)
      ? String(value[value.length - 1] ?? '')
      : typeof value === 'string'
        ? value
        : ''
    search.value = text
    pagination.page = 1
  },
  { immediate: true },
)

const { data, isLoading: componentsLoading } = useComponentsQuery()
const { data: parameterSnapshot, isLoading: parametersLoading } = useObjectParametersQuery()
const { data: objectTypesSnapshot } = useObjectTypesQuery()

const snapshot = computed<ComponentsSnapshot | null>(() => data.value ?? null)
const tableLoading = computed(() => componentsLoading.value || parametersLoading.value)

const toTypeSelectOptions = (items: Array<{ id: string; name: string }>): SelectOption[] =>
  items.map((item) => ({ label: item.name, value: item.id }))

const objectTypeSelectOptions = computed<SelectOption[]>(() =>
  toTypeSelectOptions(objectTypesSnapshot.value?.items ?? []),
)
const parameterSelectOptions = computed<SelectOption[]>(() =>
  (snapshot.value?.parameters ?? []).map((item: { id: string; name: string }) => ({
    label: item.name,
    value: item.id,
  })),
)
const defectSelectOptions = computed<SelectOption[]>(() =>
  (snapshot.value?.defects ?? []).map((item) => ({
    label: item.categoryName ? `${item.name} (${item.categoryName})` : item.name,
    value: item.id,
  })),
)

const objectTypeFilterOptions = objectTypeSelectOptions
const parameterFilterOptions = parameterSelectOptions
const defectFilterOptions = defectSelectOptions

interface ParameterMeta {
  unit: string | null
  min: number | null
  max: number | null
  norm: number | null
}

const parameterMetaById = computed<Map<string, ParameterMeta>>(() => {
  const snapshotValue = parameterSnapshot.value
  const map = new Map<string, ParameterMeta>()
  if (!snapshotValue) return map

  snapshotValue.items.forEach((item: LoadedObjectParameter) => {
    map.set(item.id, {
      unit: item.unitName ?? null,
      min: item.minValue,
      max: item.maxValue,
      norm: item.normValue,
    })
  })

  return map
})

// no edit/create modes in read-only view

const sortOrder = ref<'asc' | 'desc'>('asc')
const sortOptions = computed(() => ([
  { label: t('nsi.objectTypes.components.sortAsc'), value: 'asc' },
  { label: t('nsi.objectTypes.components.sortDesc'), value: 'desc' },
]))

const isMobile = ref(false)
let mediaQueryList: MediaQueryList | null = null

const handleMediaQueryChange = (event: MediaQueryList | MediaQueryListEvent) => {
  isMobile.value = 'matches' in event ? event.matches : false
}

onMounted(() => {
  if (typeof window === 'undefined') return
  mediaQueryList = window.matchMedia('(max-width: 768px)')
  isMobile.value = mediaQueryList.matches
  if ('addEventListener' in mediaQueryList) {
    mediaQueryList.addEventListener('change', handleMediaQueryChange)
  } else if ('addListener' in mediaQueryList) {
    // @ts-expect-error Safari < 14
    mediaQueryList.addListener(handleMediaQueryChange)
  }
})

onBeforeUnmount(() => {
  if (!mediaQueryList) return
  if ('removeEventListener' in mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleMediaQueryChange)
  } else if ('removeListener' in mediaQueryList) {
    // @ts-expect-error Safari < 14
    mediaQueryList.removeListener(handleMediaQueryChange)
  }
})

const normalize = (value: string) => normalizeText(value ?? '')

const filteredRows = computed(() => {
  const q = normalize(search.value)
  const typeSet = new Set(objectTypeFilter.value.map(String))
  const parameterSet = new Set(parameterFilter.value.map(String))
  const defectSet = new Set(defectFilter.value.map(String))
  const base = snapshot.value?.items ?? []

  const hasAll = (
    relations: LoadedComponentWithRelations['objectTypes'],
    selected: Set<string>,
  ) => {
    if (!selected.size) return true
    const relationIds = relations.map((rel) => rel.id)
    return Array.from(selected).every((id) => relationIds.includes(id))
  }

  return base.filter((item) => {
    if (!hasAll(item.objectTypes, typeSet)) return false
    if (!hasAll(item.parameters, parameterSet)) return false
    if (!hasAll(item.defects, defectSet)) return false

    if (!q) return true
    const haystack = [
      item.name,
      ...item.objectTypes.map((rel) => rel.name),
      ...item.parameters.map((rel) => rel.name),
      ...item.defects.map((rel) => rel.name),
      ...item.defects.map((rel) => rel.categoryName ?? ''),
    ]
    return haystack.some((part) => part && normalize(part).includes(q))
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

watch([search, objectTypeFilter, parameterFilter, defectFilter], () => {
  pagination.page = 1
})

watchEffect(() => {
  if (pagination.page > maxPage.value) {
    pagination.page = maxPage.value
  }
})

const showMore = () => {
  if (pagination.page < maxPage.value) pagination.page += 1
}

const rowKey = (row: LoadedComponentWithRelations) => row.id

const MAX_CHIPS = 4

const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value)
}

const formatParameterRelation = (
  rel: LoadedComponentWithRelations['parameters'][number],
): string => {
  const meta = parameterMetaById.value.get(rel.id)
  const unit = meta?.unit?.trim() || '—'
  const min = formatNumber(meta?.min)
  const max = formatNumber(meta?.max)
  const norm = formatNumber(meta?.norm)
  return `${rel.name} (ЕИ: ${unit}, мин: ${min}, макс: ${max}, норм: ${norm})`
}

const formatDefectRelation = (rel: LoadedComponentWithRelations['defects'][number]): string => {
  if (!rel.categoryName) return rel.name
  return `${rel.name} (категория: ${rel.categoryName})`
}

type AnyRelation =
  | LoadedComponentWithRelations['objectTypes'][number]
  | LoadedComponentWithRelations['parameters'][number]
  | LoadedComponentWithRelations['defects'][number]

const RelationsList = defineComponent({
  name: 'RelationsList',
  props: {
    relations: {
      type: Array as PropType<AnyRelation[]>,
      required: true,
    },
    formatter: {
      type: Function as PropType<(rel: AnyRelation) => string>,
      default: (rel: AnyRelation) => rel.name,
    },
    clamped: {
      type: Boolean,
      default: false,
    },
    expandable: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const expanded = ref(false)
    const toggle = () => {
      expanded.value = !expanded.value
    }
    return () => {
      const relations = props.relations ?? []
      if (!relations.length) return h('span', { class: 'empty-cell' }, '-')

      const chips = relations.slice(0, MAX_CHIPS)
      const rest = relations.slice(MAX_CHIPS)

      const chipNodes = chips.map((rel) =>
        h(
          NTag,
          {
            size: 'small',
            round: true,
            bordered: true,
            class: 'chip',
            key: `${rel.id}-${rel.name}`,
          },
          { default: () => props.formatter(rel) },
        ),
      )

      const row = h('div', { class: 'chips-row' }, chipNodes)

      // Expandable mode for mobile cards
      if (props.expandable) {
        if (!rest.length) return row
        if (!expanded.value) {
          const toggleBtn = h('button', { type: 'button', class: 'relations-toggle', onClick: toggle }, `Показать все (+${rest.length})`)
          return h('div', { class: 'relations-collapsed' }, [row, toggleBtn])
        }
        const list = relations.map((rel) => h('div', { class: 'relations-expanded__item', key: `${rel.id}-${rel.name}` }, props.formatter(rel)))
        const collapseBtn = h('button', { type: 'button', class: 'relations-toggle', onClick: toggle }, 'Свернуть')
        return h('div', { class: 'relations-expanded' }, [...list, collapseBtn])
      }

      if (!rest.length) {
        return props.clamped ? h('div', { class: 'cell-clamp' }, [row]) : row
      }

      // Desktop table: "+N" chip with popover
      const more = h(
        NPopover,
        { trigger: 'hover' },
        {
          trigger: () => h(NTag, { size: 'small', round: true, class: 'chip chip--more' }, { default: () => `+${rest.length}` }),
          default: () => h('div', { class: 'popover-list' }, rest.map((rel) => h('div', { class: 'popover-item', key: `${rel.id}-${rel.name}` }, props.formatter(rel)))),
        },
      )
      const content = h('div', { class: 'chips-row' }, [...chipNodes, more])
      return props.clamped ? h('div', { class: 'cell-clamp' }, [content]) : content
    }
  },
})

const renderRelationsCell = <T extends AnyRelation>(
  relations: T[],
  formatter: (relation: T) => string,
): VNodeChild => {
  if (!relations.length) return h('span', { class: 'empty-cell' }, '—')

  const tooltip = h(
    'div',
    { class: 'tooltip-list' },
    relations.map((rel) =>
      h('div', { class: 'tooltip-item', key: `${rel.id}-${rel.name}` }, formatter(rel)),
    ),
  )

  return h(
    NTooltip,
    { trigger: 'hover', placement: 'top-start' },
    {
      trigger: () => h(RelationsList, { relations, formatter, clamped: true }),
      default: () => tooltip,
    },
  )
}

// actions removed for read-only mode

const renderNameCell = (row: LoadedComponentWithRelations): VNodeChild =>
  h('div', { class: 'name-cell' }, [h('span', { class: 'name-cell__title' }, row.name)])

const columns = computed<DataTableColumns<LoadedComponentWithRelations>>(() => [
  {
    title: 'Компоненты',
    key: 'name',
    className: 'col-name',
    width: 240,
    minWidth: 240,
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    render: renderNameCell,
  },
  {
    title: 'Типы объектов',
    key: 'objectTypes',
    className: 'col-relations',
    width: 240,
    minWidth: 220,
    render: (row) => h(RelationsList, { relations: row.objectTypes }),
  },
  {
    title: 'Параметры',
    key: 'parameters',
    className: 'col-relations',
    width: 240,
    minWidth: 220,
    render: (row) => renderRelationsCell(row.parameters, formatParameterRelation),
  },
  {
    title: 'Дефекты',
    key: 'defects',
    className: 'col-relations',
    width: 240,
    minWidth: 220,
    render: (row) => renderRelationsCell(row.defects, formatDefectRelation),
  },
  // no actions column in read-only mode
])

// no create/edit handlers in read-only mode

const handleObjectTypeFilterChange = (value: Array<string | number> | null) => {
  objectTypeFilter.value = Array.isArray(value) ? value.map(String) : []
}

const handleParameterFilterChange = (value: Array<string | number> | null) => {
  parameterFilter.value = Array.isArray(value) ? value.map(String) : []
}

const handleDefectFilterChange = (value: Array<string | number> | null) => {
  defectFilter.value = Array.isArray(value) ? value.map(String) : []
}

// no parameter creation helpers in read-only mode
</script>

<style scoped>
.components-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  border: 1px solid var(--s360-color-border-subtle);
  background: var(--s360-color-panel);
  border-radius: 16px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
}

.toolbar__left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 640px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  line-height: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-title__info {
  margin-left: 4px;
}

.subtext {
  color: var(--s360-text-muted);
  max-width: 640px;
}

.toolbar__controls {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: start;
  flex: 1 1 auto;
}

.toolbar__filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 12px;
  align-items: center;
}

.toolbar__filter {
  min-width: 180px;
  flex: 0 1 220px;
}

.toolbar__search {
  min-width: 240px;
}

.toolbar__select {
  min-width: 160px;
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
  vertical-align: top;
}

:deep(.n-data-table thead th) {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--n-table-header-color, #f8fafc);
  box-shadow: 0 1px 0 #E9ECEF;
}

:deep(.n-data-table .n-data-table-th[data-col-key='name']),
:deep(.n-data-table .n-data-table-td.col-name) {
  width: 240px;
  max-width: 260px;
}

:deep(.n-data-table .n-data-table-td.col-relations) {
  min-width: 220px;
  max-width: 280px;
}

/* actions column styles removed for read-only mode */

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 100%;
}

.name-cell__title {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
  font-weight: 600;
  line-height: 1.4;
}

:deep(.components-table .n-data-table-table) {
  table-layout: fixed;
  width: 100%;
}

:deep(.components-table .n-data-table-td) {
  overflow: hidden;
}

.cell-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  word-break: break-word;
}

@media (max-width: 1280px) {
  .cell-clamp {
    -webkit-line-clamp: 2;
  }
}

.chips-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px;
  max-width: 100%;
}

.relations-collapsed { display: flex; flex-direction: column; gap: 8px; }
.relations-expanded { display: flex; flex-direction: column; gap: 6px; }
.relations-expanded__item { padding: 6px 8px; border-radius: 10px; border: 1px solid #E9ECEF; background: #f8fafc; word-break: break-word; }
.relations-toggle { align-self: flex-start; appearance: none; border: none; background: transparent; color: var(--s360-text-accent); font-weight: 600; padding: 0; cursor: pointer; }

.chip {
  background-color: var(--surface-100);
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

.chip--more {
  cursor: pointer;
}

.popover-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 320px;
}

.popover-item {
  white-space: normal;
  word-break: break-word;
}

.tooltip-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 360px;
}

.tooltip-item {
  white-space: normal;
  word-break: break-word;
}

.empty-cell {
  color: var(--neutral-500);
}

.table-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
}

.pagination-total {
  margin-right: 12px;
  color: var(--neutral-500);
}

.cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.card {
  border: 1px solid #E9ECEF;
  border-radius: 16px;
  padding: 12px;
  background: #FFFFFF;
  box-shadow: 0 18px 40px rgba(43, 108, 176, 0.06);
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden; /* clip long chips inside rounded card */
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
  grid-template-columns: 140px 1fr;
  gap: 6px 10px;
  margin: 10px 0;
}

.card__grid dt {
  color: #6C757D;
  font-size: 12px;
}

.card__grid dd {
  margin: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow: hidden; /* prevent horizontal bleed on mobile */
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

.list-info {
  font-size: 12px;
  color: var(--neutral-500);
  padding: 2px 2px 0;
}

.show-more-bar {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-primary {
  min-width: 120px;
}

/* create-mode and param creation styles removed for read-only mode */

@media (max-width: 900px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__controls {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .toolbar__search {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .toolbar__filters {
    width: 100%;
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }

  .toolbar__select {
    flex: 1 1 160px;
  }
}

@media (max-width: 360px) {
  .card__grid {
    grid-template-columns: 110px 1fr;
  }
}
</style>



