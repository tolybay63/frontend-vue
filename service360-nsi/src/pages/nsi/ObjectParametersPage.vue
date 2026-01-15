<!-- Файл: src/pages/nsi/ObjectParametersPage.vue
     Назначение: страница CRUD для параметров обслуживаемых объектов (пока только просмотр).
     Использование: подключается в маршрутизаторе по пути /nsi/object-parameters. -->
<template>
  <section class="object-parameters-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          {{ t('nsi.objectTypes.params.title', {}, { default: 'Справочник «Параметры обслуживаемых объектов»' }) }}
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            :aria-label="t('nsi.objectTypes.params.help', {}, { default: 'Справка о справочнике' })"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">
          {{ t('nsi.objectTypes.params.subtitle', {}, { default: 'Управляйте перечнем параметров обслуживаемых объектов и контролируйте их диапазоны значений' }) }}
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="q"
          :placeholder="t('nsi.objectTypes.params.searchPlaceholder', {}, { default: 'Поиск…' })"
          clearable
          round
          class="toolbar__search"
        />
        <NSelect
          v-if="isMobile"
          v-model:value="sortOrder"
          :options="sortOptions"
          size="small"
          class="toolbar__select"
          :aria-label="t('nsi.objectTypes.params.sortAria', {}, { default: 'Порядок сортировки' })"
        />
        <NButton type="primary" @click="openCreate">+ {{ t('nsi.objectTypes.params.add', {}, { default: 'Добавить параметр' }) }}</NButton>
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
        :max-height="tableMaxHeight || undefined"
      />

      <div v-else class="cards">
        <div class="list-info">
          {{ t('nsi.objectTypes.params.listInfo', { shown: visibleCount, total }, { default: 'Показано: ' + visibleCount + ' из ' + total }) }}
        </div>
        <article
          v-for="item in rows"
          :key="rowKey(item)"
          class="card"
          role="group"
          :aria-label="primaryTitle(item)"
        >
          <header class="card__header">
            <div class="card__title" role="heading" aria-level="4">
              <FieldRenderer v-if="primaryField" :field="primaryField" :row="item" />
              <span v-else class="card__title-text">{{ item.name }}</span>
            </div>
            <span v-if="statusText(item)" class="badge" :class="statusClass(item)">
              {{ statusText(item) }}
            </span>
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
        <NButton tertiary @click="showMore" :loading="tableLoading">
          {{ t('nsi.objectTypes.params.showMore', {}, { default: 'Показать ещё' }) }}
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
          :aria-label="t('nsi.objectTypes.params.paginationAria', {}, { default: 'Постраничная навигация по параметрам' })"
        >
          <template #prefix>
            <span class="pagination-total">{{ t('nsi.objectTypes.params.total', { total }, { default: 'Всего: ' + total }) }}</span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="infoOpen"
      preset="card"
      :title="t('nsi.objectTypes.params.info.title', {}, { default: 'О справочнике' })"
      style="max-width: 640px; width: 92vw"
    >
      <p>
        {{ t('nsi.objectTypes.params.info.p1', {}, { default: 'Здесь собраны параметры, необходимые для контроля состояния и эксплуатации обслуживаемых объектов. Указывайте единицу измерения, компонент и допустимые границы значений.' }) }}
      </p>
      <p>
        {{ t('nsi.objectTypes.params.info.p2', {}, { default: 'Используйте кнопку «Добавить параметр», чтобы создать запись, выбрать компонент и задать допустимые границы значений. Имеется возможность редактирования и удаления существующих записей, которые еще не использовались в системе учета работ или мониторинга.' }) }}
      </p>
      <template #footer>
        <NButton type="primary" @click="infoOpen = false">{{ t('nsi.objectTypes.params.info.ok', {}, { default: 'Понятно' }) }}</NButton>
      </template>
    </NModal>

    <NModal
      v-model:show="createModalOpen"
      preset="card"
      :title="modalTitle"
      style="max-width: 640px; width: 92vw"
    >
      <NSpin :show="directoriesLoading && !directoriesLoaded">
        <NForm
          ref="formRef"
          :model="creationForm"
          :rules="creationRules"
          size="small"
          :label-width="isMobile ? undefined : 200"
          :label-placement="isMobile ? 'top' : 'left'"
          :class="['creation-form', { 'creation-form--mobile': isMobile }]"
        >
          <NFormItem :label="t('nsi.objectTypes.params.form.name.label', {}, { default: 'Наименование параметра' })" path="name">
            <div class="name-field">
              <NInput
                v-model:value="creationForm.name"
                :placeholder="t('nsi.objectTypes.params.form.name.placeholder', {}, { default: 'Введите наименование нового параметра' })"
              />
              <div v-if="existingParameterHint" class="field-hint">
                {{ existingParameterHint }}
              </div>
              <div v-if="duplicateNameUnitWarning" class="field-hint field-hint--error">
                {{ duplicateNameUnitWarning }}
              </div>
              <NSelect
                v-if="showExistingParameterSuggestions"
                v-model:value="selectedExistingParameterId"
                :options="existingParameterOptions"
                :render-label="renderParameterOptionLabel"
                size="small"
                clearable
                :placeholder="t('nsi.objectTypes.params.form.name.matchPlaceholder', {}, { default: 'Выберите существующий параметр (ЕИ)' })"
              />
            </div>
          </NFormItem>

          <NFormItem :label="t('nsi.objectTypes.params.form.measure.label', {}, { default: 'Единица измерения' })" path="measureId">
            <CreatableSelect
              :value="creationForm.measureId"
              :options="measureSelectOptions"
              :loading="directoriesLoading && !directoriesLoaded"
              :multiple="false"
              :placeholder="t('nsi.objectTypes.params.form.measure.placeholder', {}, { default: 'Выберите единицу измерения' })"
              :create="createMeasureOption"
              :disabled="isExistingSelection"
              @created="handleMeasureCreated"
              @update:value="(v) => (creationForm.measureId = typeof v === 'string' ? v : null)"
            />
          </NFormItem>

          <NFormItem :label="t('nsi.objectTypes.params.form.source.label', {}, { default: 'Источник' })" path="sourceId">
            <CreatableSelect
              :value="creationForm.sourceId"
              :options="sourceSelectOptions"
              :loading="directoriesLoading && !directoriesLoaded"
              :multiple="false"
              :placeholder="t('nsi.objectTypes.params.form.source.placeholder', {}, { default: 'Выберите источник данных' })"
              :disabled="isExistingSelection"
              @update:value="(v) => (creationForm.sourceId = typeof v === 'string' ? v : null)"
            />
          </NFormItem>

          <NFormItem :label="t('nsi.objectTypes.params.form.description.label', {}, { default: 'Описание' })">
            <NInput
              v-model:value="creationForm.description"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              :placeholder="t('nsi.objectTypes.params.form.description.placeholder', {}, { default: 'Добавьте описание параметра' })"
              :disabled="isExistingSelection"
            />
          </NFormItem>

          <NFormItem :label="t('nsi.objectTypes.params.form.component.label', {}, { default: 'Компонент' })" path="componentEnt">
            <ComponentsSelect
              :value="creationForm.componentEnt"
              :options="componentSelectOptions"
              :loading="directoriesLoading && !directoriesLoaded"
              :multiple="false"
              :value-kind="'id'"
              :placeholder="t('nsi.objectTypes.params.form.component.placeholder', {}, { default: 'Выберите компонент' })"
              :disabled="isEditMode"
              @created="handleComponentCreated"
              @update:value="(v) => (creationForm.componentEnt = typeof v === 'string' ? v : null)"
            />

          </NFormItem>

          <NFormItem :label="t('nsi.objectTypes.params.form.signType.label', {}, { default: 'Тип признака' })">
            <CreatableSelect
              :value="creationForm.signTypeIds"
              :options="signSelectOptions"
              :multiple="true"
              :clearable="true"
              :loading="signOptionsLoading"
              :placeholder="t('nsi.objectTypes.params.form.signType.placeholder', {}, { default: 'Выберите тип признака' })"
              @update:value="(v) => (creationForm.signTypeIds = Array.isArray(v) ? v.map(String) : [])"
              :create="createSignTypeOption"
            />
          </NFormItem>

          <NFormItem
            v-if="!hasSignTypeSelection"
            :label="t('nsi.objectTypes.params.form.limits.label', {}, { default: 'Предельные значения (если применимо)' })"
          >
            <div class="limits-grid">
              <div class="limits-grid__item">
                <span class="limits-grid__label">{{ t('nsi.objectTypes.params.form.limits.max.label', {}, { default: 'Максимум' }) }}</span>
                <NInputNumber
                  v-model:value="creationForm.limitMax"
                  :show-button="false"
                  :placeholder="t('nsi.objectTypes.params.form.limits.max.placeholder', {}, { default: 'Максимальное значение' })"
                  clearable
                />
              </div>
              <div class="limits-grid__item">
                <span class="limits-grid__label">{{ t('nsi.objectTypes.params.form.limits.min.label', {}, { default: 'Минимум' }) }}</span>
                <NInputNumber
                  v-model:value="creationForm.limitMin"
                  :show-button="false"
                  :placeholder="t('nsi.objectTypes.params.form.limits.min.placeholder', {}, { default: 'Минимальное значение' })"
                  clearable
                />
              </div>
            </div>

          </NFormItem>


          <NFormItem :label="t('nsi.objectTypes.params.form.comment.label', {}, { default: 'Комментарий' })">
            <NInput
              v-model:value="creationForm.comment"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              :placeholder="t('nsi.objectTypes.params.form.comment.placeholder', {}, { default: 'Комментарий к диапазону' })"
            />
          </NFormItem>
        </NForm>
      </NSpin>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="handleCancelCreate" :disabled="creationPending">{{ t('nsi.objectTypes.params.actions.cancel', {}, { default: 'Отмена' }) }}</NButton>
          <NButton
            type="primary"
            :loading="creationPending"
            :disabled="creationPending || saveDisabled"
            @click="handleSubmit"
          >
            {{ t('nsi.objectTypes.params.actions.save', {}, { default: 'Сохранить' }) }}
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
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  nextTick,
  type PropType,
  type VNodeChild,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'

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
  NPopconfirm,
  NSpin,
  NTag,
  NTooltip,
  useMessage,
  type DataTableColumn,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { CreateOutline, InformationCircleOutline, TrashOutline } from '@vicons/ionicons5'

import {
  useObjectParameterMutations,
  useObjectParametersQuery,
} from '@features/object-parameter-crud'
import type {
  CreateObjectParameterPayload,
  LinkObjectParameterPayload,
  UpdateObjectParameterPayload,
} from '@features/object-parameter-crud'
import {
  loadParameterComponents,
  loadParameterMeasures,
  loadParameterSources,
  loadParameterSignTypes,
  saveParameterSignTypes,
} from '@entities/object-parameter'
import type {
  LoadedObjectParameter,
  ParameterComponentOption,
  ParameterMeasureOption,
  ParameterSignOption,
  ParameterSourceOption,
} from '@entities/object-parameter'
import { rpc } from '@shared/api'
import { firstRecord, getErrorMessage, normalizeText, toNumericOrUndefined, toOptionalString } from '@shared/lib'
import { ComponentsSelect } from '@features/components-select'
import { CreatableSelect } from '@features/creatable-select'
import { createMeasureAndSelect } from '@entities/object-parameter'

interface PaginationState {
  page: number
  pageSize: number
}

interface CardField {
  key: string
  label: string
  render: (row: LoadedObjectParameter) => VNodeChild
  isPrimary?: boolean
  isStatus?: boolean
  isActions?: boolean
}

interface CreateParameterForm {
  name: string
  measureId: string | null
  sourceId: string | null
  description: string
  componentEnt: string | null
  signTypeIds: string[]
  limitMax: number | null
  limitMin: number | null
  limitNorm: number | null
  comment: string
}

const router = useRouter()
const route = useRoute()
const queryClient = useQueryClient()

const { t } = useI18n()

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const infoOpen = ref(false)
const q = ref('')
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })
const isMobile = ref(false)
const tableMaxHeight = ref<number | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')
const sortOptions = [
  { label: 'А-Я', value: 'asc' },
  { label: 'Я-А', value: 'desc' },
]

const { data: snapshot, isLoading, isFetching, error } = useObjectParametersQuery()
const parameterMutations = useObjectParameterMutations()
const snapshotData = computed(() => snapshot.value ?? undefined)
const parameters = computed<LoadedObjectParameter[]>(() => snapshotData.value?.items ?? [])

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

const createModalOpen = ref(false)
const directoriesLoading = ref(false)
const directoriesLoaded = ref(false)
let directoriesRequestToken = 0
let measureRefreshToken = 0
let componentRefreshToken = 0
const measureOptions = ref<ParameterMeasureOption[]>([])
const sourceOptions = ref<ParameterSourceOption[]>([])
const componentOptions = ref<ParameterComponentOption[]>([])
const signOptions = ref<ParameterSignOption[]>([])
const signOptionsLoading = ref(false)
let signOptionsRequestToken = 0
const editingParameter = ref<LoadedObjectParameter | null>(null)
const selectedExistingParameterId = ref<string | null>(null)

const creationForm = reactive<CreateParameterForm>({
  name: '',
  measureId: null,
  sourceId: null,
  description: '',
  componentEnt: null,
  signTypeIds: [],
  limitMax: null,
  limitMin: null,
  limitNorm: null,
  comment: '',
})

const selectedMeasure = computed(() => {
  if (!creationForm.measureId) return null
  return measureOptions.value.find((item) => String(item.id) === creationForm.measureId) ?? null
})
const selectedSource = computed(() => {
  if (!creationForm.sourceId) return null
  return sourceOptions.value.find((item) => String(item.id) === creationForm.sourceId) ?? null
})
const selectedComponent = computed(() => {
  if (!creationForm.componentEnt) return null
  return componentOptions.value.find((item) => String(item.ent) === creationForm.componentEnt) ?? null
})

const measureSelectOptions = computed(() =>
  measureOptions.value.map((item) => ({ label: item.name, value: String(item.id) })),
)
const sourceSelectOptions = computed(() =>
  sourceOptions.value.map((item) => ({ label: item.name, value: String(item.id) })),
)
const componentSelectOptions = computed(() =>
  componentOptions.value.map((item) => ({ label: item.name, value: String(item.ent) })),
)
const signSelectOptions = computed(() =>
  signOptions.value.map((item) => ({ label: item.name, value: String(item.id) })),
)

const isEditMode = computed(() => editingParameter.value !== null)
const modalTitle = computed(() => (isEditMode.value ? 'Изменить параметр' : 'Добавить параметр'))
const hasSignTypeSelection = computed(() => creationForm.signTypeIds.length > 0)

const normalizedCreationName = computed(() => normalizeText(creationForm.name))
const MIN_SUGGESTION_LENGTH = 2
const MAX_SUGGESTIONS = 8
const DUPLICATE_NAME_UNIT_MESSAGE =
  'Пара «Название + ЕИ» уже существует. Укажите другое название, другую единицу или выберите существующий параметр.'

const limitedLevenshtein = (a: string, b: string, maxDistance: number): number | null => {
  if (a === b) return 0
  const aLen = a.length
  const bLen = b.length
  if (Math.abs(aLen - bLen) > maxDistance) return null

  let prev = new Array(bLen + 1).fill(0).map((_, index) => index)
  let cur = new Array(bLen + 1).fill(0)

  for (let i = 1; i <= aLen; i += 1) {
    cur[0] = i
    let minInRow = cur[0]
    const aChar = a.charAt(i - 1)
    for (let j = 1; j <= bLen; j += 1) {
      const cost = aChar === b.charAt(j - 1) ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (cur[j] < minInRow) minInRow = cur[j]
    }
    if (minInRow > maxDistance) return null
    const temp = prev
    prev = cur
    cur = temp
  }

  return prev[bLen] <= maxDistance ? prev[bLen] : null
}

const resolveSuggestionThreshold = (query: string) => {
  if (query.length <= 4) return 1
  if (query.length <= 7) return 2
  return 3
}
const parametersById = computed(() => {
  const map = new Map<string, LoadedObjectParameter>()
  for (const item of parameters.value) {
    const key = String(item.details.id ?? item.id)
    if (!map.has(key)) map.set(key, item)
  }
  return map
})
type ParameterMatchReason = 'exact' | 'prefix' | 'contains' | 'fuzzy'
type ParameterMatchEntry = { item: LoadedObjectParameter; score: number; reason: ParameterMatchReason }

const existingParameterMatches = computed<ParameterMatchEntry[]>(() => {
  if (isEditMode.value) return []
  const query = normalizedCreationName.value
  if (!query || query.length < MIN_SUGGESTION_LENGTH) return []

  const threshold = resolveSuggestionThreshold(query)
  const matches: ParameterMatchEntry[] = []
  for (const item of parametersById.value.values()) {
    const normalizedName = normalizeText(item.name)
    if (!normalizedName) continue

    let score = 0
    let reason: ParameterMatchReason = 'fuzzy'
    if (normalizedName === query) score = 100
    if (score === 100) {
      reason = 'exact'
    } else if (normalizedName.startsWith(query)) {
      score = 90
      reason = 'prefix'
    } else if (normalizedName.includes(query) || query.includes(normalizedName)) {
      score = 80
      reason = 'contains'
    } else {
      const distance = limitedLevenshtein(normalizedName, query, threshold)
      if (distance === null) continue
      score = 70 - distance
      reason = 'fuzzy'
    }

    matches.push({ item, score, reason })
  }

  return matches
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const unitCompare = (a.item.unitName ?? '').localeCompare(b.item.unitName ?? '', 'ru')
      if (unitCompare !== 0) return unitCompare
      return a.item.name.localeCompare(b.item.name, 'ru')
    })
    .slice(0, MAX_SUGGESTIONS)
})

const matchReasonLabel = (reason: ParameterMatchReason) =>
  reason === 'exact' ? 'точное совпадение' : 'похожее совпадение'
const existingParameterOptions = computed(() =>
  existingParameterMatches.value.map(({ item, reason }) => {
    const unitLabel = item.unitName?.trim() ? item.unitName.trim() : 'без ЕИ'
    return {
      label: `${item.name} — ${unitLabel}`,
      value: String(item.details.id ?? item.id),
      reason,
    }
  }),
)

const renderParameterOptionLabel = (
  option: { label?: string | number; reason?: ParameterMatchReason },
) => {
  const label = option?.label ?? ''
  const reason = option?.reason ?? 'fuzzy'
  const tagType = reason === 'exact' ? 'success' : 'warning'
  const reasonText = matchReasonLabel(reason)

  return h('div', { class: 'existing-parameter-option' }, [
    h('span', { class: 'existing-parameter-option__text' }, String(label)),
    h(
      NTag,
      { size: 'small', bordered: false, type: tagType, class: 'existing-parameter-option__tag' },
      { default: () => reasonText },
    ),
  ])
}
const selectedExistingParameter = computed(() => {
  if (!selectedExistingParameterId.value) return null
  return parametersById.value.get(String(selectedExistingParameterId.value)) ?? null
})
const isExistingSelection = computed(
  () => !isEditMode.value && selectedExistingParameter.value !== null,
)
const showExistingParameterSuggestions = computed(
  () => !isEditMode.value && existingParameterOptions.value.length > 0,
)
const existingParameterHint = computed(() => {
  if (isExistingSelection.value) {
    return 'Выбран существующий параметр — будет создана только связь с компонентом и лимиты.'
  }
  if (existingParameterOptions.value.length > 0) {
    const hasExact = existingParameterMatches.value.some((match) => match.reason === 'exact')
    return hasExact
      ? 'Найдены точные и похожие совпадения. Можно выбрать существующий параметр по ЕИ.'
      : 'Найдены похожие параметры. Проверьте название и выберите существующий по ЕИ.'
  }
  return ''
})

const duplicateParameterMatch = computed(() => {
  if (isEditMode.value || isExistingSelection.value) return null
  const query = normalizedCreationName.value
  if (!query) return null
  const measure = selectedMeasure.value
  if (!measure) return null

  for (const item of parametersById.value.values()) {
    if (normalizeText(item.name) !== query) continue
    const details = item.details
    if (details.measureId !== null && Number(details.measureId) === Number(measure.id)) return item
    if (details.measurePv !== null && Number(details.measurePv) === Number(measure.pv)) return item
    if (
      item.unitName &&
      normalizeText(item.unitName) === normalizeText(measure.name)
    ) {
      return item
    }
  }

  return null
})

const duplicateNameUnitWarning = computed(() =>
  duplicateParameterMatch.value ? DUPLICATE_NAME_UNIT_MESSAGE : '',
)

const creationRules = computed<FormRules>(() => {
  const rules: FormRules = {
    name: [
      { required: true, message: 'Укажите наименование', trigger: ['input', 'blur'] },
      {
        validator: (_rule, value: string) => {
          return Boolean(value && value.trim().length >= 3)
            ? Promise.resolve()
            : Promise.reject(new Error('Минимум 3 символа'))
        },
        trigger: ['blur'],
      },
      {
        validator: () => {
          if (duplicateParameterMatch.value) {
            return Promise.reject(new Error(DUPLICATE_NAME_UNIT_MESSAGE))
          }
          return Promise.resolve()
        },
        trigger: ['input', 'blur'],
      },
    ],
    ...(isExistingSelection.value
      ? {}
      : {
          measureId: [
            {
              required: true,
              message: 'Выберите единицу измерения',
              trigger: ['change', 'blur'],
            },
          ],
          sourceId: [{ required: true, message: 'Выберите источник', trigger: ['change', 'blur'] }],
        }),
  }

  if (!isEditMode.value) {
    rules.componentEnt = [{ required: true, message: 'Выберите компонент', trigger: ['change', 'blur'] }]
  }

  return rules
})

const creationPending = computed(
  () =>
    parameterMutations.create.isPending.value ||
    parameterMutations.link.isPending.value ||
    parameterMutations.update.isPending.value,
)
const saveDisabled = computed(() => {
  if (directoriesLoading.value && !directoriesLoaded.value) return true
  return (
    measureOptions.value.length === 0 ||
    sourceOptions.value.length === 0 ||
    componentOptions.value.length === 0
  )
})

const resetCreationForm = () => {
  if (formRef.value) formRef.value.restoreValidation()
  creationForm.name = ''
  creationForm.measureId = null
  creationForm.sourceId = null
  creationForm.description = ''
  creationForm.componentEnt = null
  creationForm.signTypeIds = []
  creationForm.limitMax = null
  creationForm.limitMin = null
  creationForm.limitNorm = null
  creationForm.comment = ''
  selectedExistingParameterId.value = null
}

const resolveParameterId = (parameter: LoadedObjectParameter): number | null => {
  const detailId = Number(parameter.details.id)
  if (Number.isFinite(detailId)) return detailId
  const rawId = Number(parameter.id)
  return Number.isFinite(rawId) ? rawId : null
}

const resolveParameterCls = (parameter: LoadedObjectParameter): number | null => {
  const detailCls = Number(parameter.details.cls)
  if (Number.isFinite(detailCls)) return detailCls
  return null
}

const resolveExistingMeasureOption = (
  parameter: LoadedObjectParameter,
  preferSelected = true,
): ParameterMeasureOption | null => {
  if (preferSelected && selectedMeasure.value) return selectedMeasure.value
  const details = parameter.details
  const measureId = details.measureId
  const measurePv = details.measurePv
  const byId =
    measureId !== null && measureId !== undefined
      ? measureOptions.value.find((item) => Number(item.id) === Number(measureId))
      : null
  if (byId) return byId
  const byPv =
    measurePv !== null && measurePv !== undefined
      ? measureOptions.value.find((item) => Number(item.pv) === Number(measurePv))
      : null
  if (byPv) return byPv
  if (measureId !== null && measurePv !== null && measureId !== undefined && measurePv !== undefined) {
    return {
      id: Number(measureId),
      pv: Number(measurePv),
      name: parameter.unitName?.trim() || String(measureId),
    }
  }
  return null
}

const resolveExistingSourceOption = (
  parameter: LoadedObjectParameter,
  preferSelected = true,
): ParameterSourceOption | null => {
  if (preferSelected && selectedSource.value) return selectedSource.value
  const details = parameter.details
  const sourceId = details.sourceObjId
  const sourcePv = details.sourcePv
  const byId =
    sourceId !== null && sourceId !== undefined
      ? sourceOptions.value.find((item) => Number(item.id) === Number(sourceId))
      : null
  if (byId) return byId
  const byPv =
    sourcePv !== null && sourcePv !== undefined
      ? sourceOptions.value.find((item) => Number(item.pv) === Number(sourcePv))
      : null
  if (byPv) return byPv
  if (sourceId !== null && sourcePv !== null && sourceId !== undefined && sourcePv !== undefined) {
    return {
      id: Number(sourceId),
      pv: Number(sourcePv),
      name: parameter.sourceName?.trim() || String(sourceId),
    }
  }
  return null
}

const syncExistingParameterSelection = (parameter: LoadedObjectParameter) => {
  creationForm.name = parameter.name
  creationForm.description = parameter.description ?? ''
  const measure = resolveExistingMeasureOption(parameter, false)
  if (measure) creationForm.measureId = String(measure.id)
  const source = resolveExistingSourceOption(parameter, false)
  if (source) creationForm.sourceId = String(source.id)
}

const MEASURE_SORT_LOCALE = 'ru'
const COMPONENT_RELCLS = 1074
const COMPONENT_RCM = 1149
const SIGN_TYPE_DEFAULT_CLS = 1278

const resolveDateStamp = (date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const readStorageNumber = (key: string): number | undefined => {
  if (typeof window === 'undefined') return undefined
  const raw = window.localStorage.getItem(key)
  if (!raw) return undefined
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : undefined
}

const resolveSignUserMeta = () => ({
  objUser:
    readStorageNumber('objUser') ??
    readStorageNumber('obj_user') ??
    readStorageNumber('objUserId'),
  pvUser:
    readStorageNumber('pvUser') ??
    readStorageNumber('pv_user') ??
    readStorageNumber('pvUserId'),
})

const extractRecordId = (payload: unknown): string | null => {
  if (typeof payload === 'number' || typeof payload === 'string') {
    return toOptionalString(payload)
  }

  const record = firstRecord<unknown>(payload)
  if (!record) return null

  if (typeof record === 'number' || typeof record === 'string') {
    return toOptionalString(record)
  }

  if (typeof record === 'object' && record !== null) {
    const obj = record as Record<string, unknown>
    return toOptionalString(obj.id ?? obj.ID ?? obj.Id)
  }

  return null
}

const normalizeOptionName = (name: string | null | undefined, fallback: string): string => {
  const trimmed = name?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

const toMeasureKey = (option: ParameterMeasureOption): string | null => {
  const id = Number(option?.id)
  const pv = Number(option?.pv)
  if (!Number.isFinite(id) && !Number.isFinite(pv)) return null
  return `${Number.isFinite(id) ? id : ''}|${Number.isFinite(pv) ? pv : ''}`
}

const toSourceKey = (option: ParameterSourceOption): string | null => {
  const id = Number(option?.id)
  const pv = Number(option?.pv)
  if (!Number.isFinite(id) && !Number.isFinite(pv)) return null
  return `${Number.isFinite(id) ? id : ''}|${Number.isFinite(pv) ? pv : ''}`
}

const toComponentKey = (option: ParameterComponentOption): string | null => {
  const ent = Number(option?.ent)
  if (!Number.isFinite(ent) || ent === 0) return null
  return String(ent)
}

const normalizeMeasureOption = (option: ParameterMeasureOption): ParameterMeasureOption | null => {
  const id = Number(option?.id)
  const pv = Number(option?.pv)
  if (!Number.isFinite(id) || !Number.isFinite(pv)) return null
  return {
    id,
    pv,
    name: normalizeOptionName(option?.name, String(id || pv)),
  }
}

const normalizeSourceOption = (option: ParameterSourceOption): ParameterSourceOption | null => {
  const id = Number(option?.id)
  const pv = Number(option?.pv)
  if (!Number.isFinite(id) || !Number.isFinite(pv)) return null
  return {
    id,
    pv,
    name: normalizeOptionName(option?.name, String(id || pv)),
  }
}

const normalizeComponentOption = (
  option: ParameterComponentOption,
): ParameterComponentOption | null => {
  const ent = Number(option?.ent)
  const cls = Number(option?.cls)
  const relcls = Number(option?.relcls)
  const rcm = Number(option?.rcm)
  if (!Number.isFinite(ent) || ent === 0) return null
  if (!Number.isFinite(cls) || !Number.isFinite(relcls) || !Number.isFinite(rcm)) return null
  return {
    ent,
    cls,
    relcls,
    rcm,
    name: normalizeOptionName(option?.name, String(ent)),
  }
}

function upsertMeasureOptions(
  base: ParameterMeasureOption[],
  updates: ParameterMeasureOption[],
): ParameterMeasureOption[] {
  const map = new Map<string, ParameterMeasureOption>()
  for (const option of base) {
    const normalized = normalizeMeasureOption(option)
    if (!normalized) continue
    const key = toMeasureKey(normalized)
    if (!key || map.has(key)) continue
    map.set(key, normalized)
  }
  for (const option of updates) {
    const normalized = normalizeMeasureOption(option)
    if (!normalized) continue
    const key = toMeasureKey(normalized)
    if (!key) continue
    map.set(key, normalized)
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, MEASURE_SORT_LOCALE))
}

function upsertSourceOptions(
  base: ParameterSourceOption[],
  updates: ParameterSourceOption[],
): ParameterSourceOption[] {
  const map = new Map<string, ParameterSourceOption>()
  for (const option of base) {
    const normalized = normalizeSourceOption(option)
    if (!normalized) continue
    const key = toSourceKey(normalized)
    if (!key || map.has(key)) continue
    map.set(key, normalized)
  }
  for (const option of updates) {
    const normalized = normalizeSourceOption(option)
    if (!normalized) continue
    const key = toSourceKey(normalized)
    if (!key) continue
    map.set(key, normalized)
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, MEASURE_SORT_LOCALE))
}

function upsertComponentOptions(
  base: ParameterComponentOption[],
  updates: ParameterComponentOption[],
): ParameterComponentOption[] {
  const map = new Map<string, ParameterComponentOption>()
  for (const option of base) {
    const normalized = normalizeComponentOption(option)
    if (!normalized) continue
    const key = toComponentKey(normalized)
    if (!key || map.has(key)) continue
    map.set(key, normalized)
  }
  for (const option of updates) {
    const normalized = normalizeComponentOption(option)
    if (!normalized) continue
    const key = toComponentKey(normalized)
    if (!key) continue
    map.set(key, normalized)
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, MEASURE_SORT_LOCALE))
}

function upsertSignOptions(
  base: ParameterSignOption[],
  updates: ParameterSignOption[],
): ParameterSignOption[] {
  const map = new Map<number, ParameterSignOption>()
  for (const option of base) {
    const id = Number(option?.id)
    if (!Number.isFinite(id)) continue
    map.set(id, {
      id,
      name: normalizeOptionName(option?.name, String(id)),
    })
  }
  for (const option of updates) {
    const id = Number(option?.id)
    if (!Number.isFinite(id)) continue
    map.set(id, {
      id,
      name: normalizeOptionName(option?.name, String(id)),
    })
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, MEASURE_SORT_LOCALE))
}

function mergeMeasureOptions(...batches: ParameterMeasureOption[][]) {
  const normalized: ParameterMeasureOption[] = []
  for (const batch of batches) {
    for (const option of batch) {
      if (!option) continue
      normalized.push(option)
    }
  }
  if (normalized.length === 0) return
  measureOptions.value = upsertMeasureOptions(measureOptions.value, normalized)
}

function mergeSourceOptions(...batches: ParameterSourceOption[][]) {
  const normalized: ParameterSourceOption[] = []
  for (const batch of batches) {
    for (const option of batch) {
      if (!option) continue
      normalized.push(option)
    }
  }
  if (normalized.length === 0) return
  sourceOptions.value = upsertSourceOptions(sourceOptions.value, normalized)
}

function mergeComponentOptions(...batches: ParameterComponentOption[][]) {
  const normalized: ParameterComponentOption[] = []
  for (const batch of batches) {
    for (const option of batch) {
      if (!option) continue
      normalized.push(option)
    }
  }
  if (normalized.length === 0) return
  componentOptions.value = upsertComponentOptions(componentOptions.value, normalized)
}

function mergeSignOptions(...batches: ParameterSignOption[][]) {
  const normalized: ParameterSignOption[] = []
  for (const batch of batches) {
    for (const option of batch) {
      if (!option) continue
      normalized.push(option)
    }
  }
  if (normalized.length === 0) return
  signOptions.value = upsertSignOptions(signOptions.value, normalized)
}

async function refreshMeasureDirectory(
  fallback: ParameterMeasureOption,
): Promise<void> {
  const refreshToken = ++measureRefreshToken
  try {
    const refreshed = await loadParameterMeasures()
    if (refreshToken !== measureRefreshToken) return
    mergeMeasureOptions([fallback], refreshed)
  } catch (error) {
    if (refreshToken !== measureRefreshToken) return
    console.error('[object-parameters] Не удалось обновить единицы измерения', error)
    mergeMeasureOptions([fallback])
  }
}

async function refreshComponentDirectory(
  fallback: ParameterComponentOption,
): Promise<void> {
  const refreshToken = ++componentRefreshToken
  try {
    const refreshed = await loadParameterComponents()
    if (refreshToken !== componentRefreshToken) return
    mergeComponentOptions([fallback], refreshed)
  } catch (error) {
    if (refreshToken !== componentRefreshToken) return
    console.error('[object-parameters] Не удалось обновить список компонентов', error)
    mergeComponentOptions([fallback])
  }
}

const loadCreationDirectories = async (force = false) => {
  if (directoriesLoading.value) return
  if (directoriesLoaded.value && !force) return

  directoriesLoading.value = true
  const requestToken = ++directoriesRequestToken
  try {
    const [measures, sources, components] = await Promise.all([
      loadParameterMeasures(),
      loadParameterSources(),
      loadParameterComponents(),
    ])

    if (requestToken === directoriesRequestToken) {
      mergeMeasureOptions(measures)
      mergeSourceOptions(sources)
      mergeComponentOptions(components)
      directoriesLoaded.value = true
    }
  } catch (err) {
    message.error(getErrorMessage(err) ?? 'Не удалось загрузить справочники')
  } finally {
    directoriesLoading.value = false
  }
}

const loadSignOptions = async (force = false) => {
  if (signOptionsLoading.value) return
  if (signOptions.value.length > 0 && !force) return

  signOptionsLoading.value = true
  const requestToken = ++signOptionsRequestToken

  try {
    const signs = await loadParameterSignTypes()
    if (requestToken !== signOptionsRequestToken) return
    mergeSignOptions(signs)
  } catch (err) {
    if (requestToken !== signOptionsRequestToken) return
    message.error(getErrorMessage(err) ?? 'Не удалось загрузить признаки')
  } finally {
    if (requestToken === signOptionsRequestToken) {
      signOptionsLoading.value = false
    }
  }
}

const createSignTypeOption = async (name: string) => {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Укажите название признака')
  }

  const stamp = resolveDateStamp()
  const meta = resolveSignUserMeta()

  const payload: Record<string, unknown> = {
    name: trimmed,
    cls: SIGN_TYPE_DEFAULT_CLS,
    CreatedAt: stamp,
    UpdatedAt: stamp,
    objUser: meta.objUser,
    pvUser: meta.pvUser,
  }

  const response = await rpc('data/saveSign', ['ins', payload])
  const createdId = extractRecordId(response)
  const numericId = createdId ? toNumericOrUndefined(createdId) : undefined
  if (!numericId) {
    throw new Error('Не удалось определить созданный тип признака')
  }

  const option: ParameterSignOption = { id: numericId, name: trimmed }
  mergeSignOptions([option])

  return { label: option.name, value: String(option.id) }
}

const handleCancelCreate = () => {
  createModalOpen.value = false
  editingParameter.value = null
}

const revalidateFieldOnChange = (path: keyof CreateParameterForm, value: unknown) => {
  if (!createModalOpen.value) return
  if (path === 'componentEnt' && isEditMode.value) return
  if (value === null || value === undefined || value === '') return
  const form = formRef.value
  if (!form || typeof form.validate !== 'function') return
  void form
    .validate(undefined, (rule) => rule?.key === String(path))
    .catch(() => undefined)
}

const splitSignNames = (value: string | null | undefined): string[] => {
  if (!value) return []
  return value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

const ensureSignOptionsForSelection = (ids: number[], names: string | null | undefined) => {
  if (ids.length === 0) return
  const nameList = splitSignNames(names)
  const existingIds = new Set(signOptions.value.map((option) => Number(option.id)))
  const fallback: ParameterSignOption[] = []
  ids.forEach((id, index) => {
    if (existingIds.has(id)) return
    fallback.push({
      id,
      name: nameList[index] ?? `Признак ${id}`,
    })
  })
  if (fallback.length > 0) mergeSignOptions(fallback)
}

const applyParameterToForm = (parameter: LoadedObjectParameter) => {
  creationForm.name = parameter.name
  creationForm.description = parameter.description ?? ''
  creationForm.measureId = parameter.details.measureId
    ? String(parameter.details.measureId)
    : null
  creationForm.sourceId = parameter.details.sourceObjId
    ? String(parameter.details.sourceObjId)
    : null
  const componentEntValue =
    parameter.details.componentEnt ??
    (parameter.componentId ? Number(parameter.componentId) : null)
  creationForm.componentEnt = componentEntValue !== null ? String(componentEntValue) : null
  creationForm.signTypeIds = (parameter.signMultiIds ?? []).map((id) => String(id))
  creationForm.limitMax = parameter.maxValue ?? null
  creationForm.limitMin = parameter.minValue ?? null
  creationForm.limitNorm = parameter.normValue ?? null
  creationForm.comment = parameter.note ?? ''

  if ((parameter.signMultiIds ?? []).length > 0) {
    ensureSignOptionsForSelection(parameter.signMultiIds ?? [], parameter.signMultiNames)
  }
}

const resolveSelectedSignOptions = (): ParameterSignOption[] => {
  if (creationForm.signTypeIds.length === 0) return []
  const map = new Map(signOptions.value.map((option) => [String(option.id), option]))

  return creationForm.signTypeIds
    .map((rawId) => {
      const numericId = Number(rawId)
      if (!Number.isFinite(numericId)) return null
      const option = map.get(String(rawId))
      const name = option?.name?.trim() || String(numericId)
      return { id: numericId, name }
    })
    .filter((item): item is ParameterSignOption => Boolean(item))
}

const handleSubmit = async () => {
  if (saveDisabled.value) return
  if (!formRef.value) return

  try {
    await formRef.value.validate(undefined, (rule) => {
      if (isEditMode.value && rule?.key === 'componentEnt') {
        return false
      }
      return true
    })
  } catch {
    return
  }

  const existingParameter = selectedExistingParameter.value
  const linkingExisting = !isEditMode.value && existingParameter !== null
  const measure = linkingExisting
    ? resolveExistingMeasureOption(existingParameter)
    : selectedMeasure.value
  const source = linkingExisting
    ? resolveExistingSourceOption(existingParameter)
    : selectedSource.value
  const componentOption = (() => {
    if (selectedComponent.value) return selectedComponent.value
    if (!isEditMode.value || !editingParameter.value) return null
    const details = editingParameter.value.details
    if (
      details.componentCls === null ||
      details.componentRelcls === null ||
      details.componentRcm === null ||
      details.componentEnt === null
    ) {
      return null
    }
    return {
      cls: Number(details.componentCls),
      relcls: Number(details.componentRelcls),
      rcm: Number(details.componentRcm),
      ent: Number(details.componentEnt),
      name: editingParameter.value.componentName ?? details.componentRelationName ?? '',
    }
  })()

  if (!measure || !source || !componentOption) {
    if (linkingExisting) {
      message.error('Не удалось определить данные выбранного параметра')
    } else {
      message.error('Заполните обязательные поля формы')
    }
    return
  }

  const basePayload = {
    name: creationForm.name.trim(),
    description: creationForm.description.trim() || null,
    measure: { id: Number(measure.id), pv: Number(measure.pv), name: measure.name },
    source: { id: Number(source.id), pv: Number(source.pv), name: source.name },
    component: componentOption,
    limits: {
      max: creationForm.limitMax,
      min: creationForm.limitMin,
      norm: creationForm.limitNorm,
      comment: creationForm.comment.trim() || null,
    },
    accessLevel: 1,
  }

  try {
    const selectedSigns = resolveSelectedSignOptions()
    const hasExistingSigns = (editingParameter.value?.signMultiIds ?? []).length > 0
    const shouldPersistSigns =
      selectedSigns.length > 0 || (isEditMode.value && hasExistingSigns)
    let savedParameter: LoadedObjectParameter | null = null
    let successMessage = ''

    if (isEditMode.value && editingParameter.value) {
      const parameterId = Number(
        editingParameter.value.details.id ?? editingParameter.value.id,
      )
      if (!Number.isFinite(parameterId)) {
        message.error('Не удалось определить идентификатор параметра')
        return
      }
      const updatePayload: UpdateObjectParameterPayload = {
        ...basePayload,
        id: parameterId,
        details: editingParameter.value.details,
      }
      savedParameter = await parameterMutations.update.mutateAsync(updatePayload)
      successMessage = 'Параметр успешно обновлён'
    } else if (linkingExisting && existingParameter) {
      const parameterId = resolveParameterId(existingParameter)
      const parameterCls = resolveParameterCls(existingParameter)
      if (!parameterId || !parameterCls) {
        message.error('Не удалось определить выбранный параметр')
        return
      }
      const linkPayload: LinkObjectParameterPayload = {
        ...basePayload,
        id: parameterId,
        cls: parameterCls,
      }
      savedParameter = await parameterMutations.link.mutateAsync(linkPayload)
      successMessage = 'Параметр успешно привязан'
    } else {
      const createPayload: CreateObjectParameterPayload = basePayload
      savedParameter = await parameterMutations.create.mutateAsync(createPayload)
      successMessage = 'Параметр успешно создан'
    }

    if (shouldPersistSigns) {
      const relationId = savedParameter?.details.componentRelationId ?? null
      if (relationId && Number.isFinite(Number(relationId))) {
        try {
          await saveParameterSignTypes(Number(relationId), selectedSigns)
          void queryClient.invalidateQueries({ queryKey: ['object-parameters'] })
        } catch (err) {
          message.warning(
            getErrorMessage(err) ??
              'Параметр сохранён, но признаки не удалось обновить',
          )
        }
      } else {
        message.warning('Параметр сохранён, но не удалось сохранить признаки')
      }
    }

    message.success(successMessage)
    createModalOpen.value = false
  } catch (err) {
    const fallbackMessage = isEditMode.value
      ? 'Не удалось обновить параметр'
      : linkingExisting
        ? 'Не удалось привязать параметр'
        : 'Не удалось создать параметр'
    message.error(getErrorMessage(err) ?? fallbackMessage)
  }
}

if (typeof window !== 'undefined') {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

let mediaQueryList: MediaQueryList | null = null
const handleMediaQueryChange = (event: MediaQueryList | MediaQueryListEvent) => {
  isMobile.value = 'matches' in event ? event.matches : false
}

onMounted(() => {
  if (typeof window === 'undefined') return
  mediaQueryList = window.matchMedia('(max-width: 768px)')
  handleMediaQueryChange(mediaQueryList)
  mediaQueryList.addEventListener('change', handleMediaQueryChange)

  computeTableHeight()
  window.addEventListener('resize', computeTableHeight)
})

onBeforeUnmount(() => {
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleMediaQueryChange)
    mediaQueryList = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', computeTableHeight)
  }
})

const clearActionQuery = () => {
  if (!route.query.action) return
  const nextQuery = { ...route.query }
  delete nextQuery.action
  void router.replace({ path: route.path, query: nextQuery, hash: route.hash })
}

watch(
  () => route.query.action,
  (value) => {
    const matches = Array.isArray(value) ? value.includes('create') : value === 'create'
    if (!matches) return
    nextTick(() => {
      openCreate()
      clearActionQuery()
    })
  },
  { immediate: true },
)

watch(q, () => {
  pagination.page = 1
})

watch(createModalOpen, (isOpen) => {
  if (isOpen) {
    void loadSignOptions()
    return
  }
  if (!isOpen) {
    resetCreationForm()
    editingParameter.value = null
  }
})

watch(
  () => creationForm.name,
  (value) => {
    const selected = selectedExistingParameter.value
    if (!selected) return
    if (normalizeText(value) !== normalizeText(selected.name)) {
      selectedExistingParameterId.value = null
    }
  },
)

watch([selectedExistingParameterId, measureOptions, sourceOptions], () => {
  const selected = selectedExistingParameter.value
  if (!selected || isEditMode.value) return
  syncExistingParameterSelection(selected)
})

watch(isEditMode, (value) => {
  if (value) selectedExistingParameterId.value = null
})

watch(
  () => creationForm.measureId,
  (value) => {
    revalidateFieldOnChange('measureId', value)
    revalidateFieldOnChange('name', creationForm.name)
  },
)
watch(
  () => creationForm.sourceId,
  (value) => revalidateFieldOnChange('sourceId', value),
)
watch(
  () => creationForm.componentEnt,
  (value) => revalidateFieldOnChange('componentEnt', value),
)

const fetchErrorMessage = computed(() => getErrorMessage(error.value))
watch(fetchErrorMessage, (next, prev) => {
  if (next && next !== prev) message.error(next)
})

const tableLoading = computed(() => isLoading.value || isFetching.value)

const filteredRows = computed(() => {
  const search = normalizeText(q.value)

  if (!search) return parameters.value

  return parameters.value.filter((item) => {
    const fields: Array<string | null | undefined> = [
      item.name,
      item.componentName,
      item.unitName,
      item.sourceName,
      item.signMultiNames,
      item.code,
      item.description,
      item.note,
      item.minValue != null ? String(item.minValue) : null,
      item.maxValue != null ? String(item.maxValue) : null,
    ]
    return fields.some((field) => normalizeText(field ?? '').includes(search))
  })
})

const total = computed(() => filteredRows.value.length)
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize)))

watch(
  () => [total.value, pagination.pageSize],
  () => {
    const localMax = Math.max(1, Math.ceil(total.value / pagination.pageSize))
    if (pagination.page > localMax) pagination.page = localMax
  },
)

function showMore() {
  const maxPageLocal = Math.max(1, Math.ceil(total.value / pagination.pageSize))
  if (pagination.page < maxPageLocal) pagination.page += 1
}

const sortedRows = computed(() => {
  const base = [...filteredRows.value].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return sortOrder.value === 'desc' ? base.reverse() : base
})

const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return sortedRows.value.slice(start, start + pagination.pageSize)
})

const mobileRows = computed(() => sortedRows.value.slice(0, pagination.page * pagination.pageSize))
const rows = computed(() => (isMobile.value ? mobileRows.value : paginatedRows.value))
const visibleCount = computed(() => rows.value.length)
const rowKey = (row: LoadedObjectParameter) => {
  const relationId = row.details.componentRelationId
  return Number.isFinite(relationId) ? String(relationId) : row.id
}

const resetFormValidation = () => {
  formRef.value?.restoreValidation()
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value)
}

function renderComponentTag(row: LoadedObjectParameter): VNodeChild {
  if (!row.componentName) return '—'
  return h(
    NTag,
    { size: 'small', bordered: true, round: true, class: 'tag-component' },
    { default: () => row.componentName },
  )
}

// Вынесено на уровень setup, чтобы корректно снимать слушатель resize
function computeTableHeight() {
  if (typeof window === 'undefined') return
  // Примерная высота под таблицу: высота окна минус тулбар + отступы и пагинация
  const headerReserve = 260 // тулбар, подзаголовок, отступы
  const paginationReserve = 80
  const totalReserve = headerReserve + paginationReserve
  const h = Math.max(320, window.innerHeight - totalReserve)
  tableMaxHeight.value = h
}

async function createMeasureOption(name: string) {
  const created = await createMeasureAndSelect(name)

  const fallbackOption: ParameterMeasureOption = {
    id: Number(created.id),
    pv: Number(created.pv),
    name: normalizeOptionName(created.name, name),
  }

  mergeMeasureOptions([fallbackOption])

  const resolved =
    measureOptions.value.find((m) => Number(m.id) === fallbackOption.id) ??
    measureOptions.value.find((m) => Number(m.pv) === fallbackOption.pv) ??
    fallbackOption

  const nextValue = String(resolved.id)
  creationForm.measureId = nextValue

  void (async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    await refreshMeasureDirectory(resolved)
  })()

  return { label: resolved.name, value: nextValue }
}

function handleMeasureCreated() {
  // Доп. хук при создании (если нужно) — сейчас не требуется
}

interface ComponentCreatedPayload {
  id: string
  cls: number
  name: string
}

async function handleComponentCreated(payload: ComponentCreatedPayload) {
  const ent = Number(payload.id)
  if (!Number.isFinite(ent)) return

  const fallbackOption: ParameterComponentOption = {
    ent,
    cls: Number(payload.cls),
    relcls: COMPONENT_RELCLS,
    rcm: COMPONENT_RCM,
    name: payload.name,
  }

  mergeComponentOptions([fallbackOption])
  creationForm.componentEnt = String(fallbackOption.ent)

  void (async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    await refreshComponentDirectory(fallbackOption)
  })()
}

const renderTooltipLines = (value: string) =>
  value.split(/\n+/).map((line, index) => h('div', { key: `tooltip-line-${index}` }, line || ' '))

const renderMultilineCell = (
  value: string | null | undefined,
  className = 'cell-multiline',
  withTooltip = true,
): VNodeChild => {
  const text = value?.trim()
  if (!text) return '—'

  const renderBlock = () => h('div', { class: className }, text)

  if (!withTooltip) return renderBlock()

  return h(
    NTooltip,
    { placement: 'top', delay: 100 },
    {
      trigger: renderBlock,
      default: () => renderTooltipLines(text),
    },
  )
}

function renderNameWithMeta(row: LoadedObjectParameter): VNodeChild {
  const component = row.componentName ? renderComponentTag(row) : null

  const titleText = row.name?.trim() ?? ''
  const titleNode = renderMultilineCell(titleText || null, 'name-cell__title')

  if (!component) {
    return h('div', { class: 'name-cell' }, [titleNode])
  }

  return h('div', { class: 'name-cell' }, [
    titleNode,
    h('div', { class: 'name-meta' }, [component]),
  ])
}

function renderLimit(value: number | null): string {
  return formatNumber(value)
}

function renderRange(row: LoadedObjectParameter): VNodeChild {
  const items = [
    { label: 'ЕИ', value: row.unitName ?? '—', type: 'info' as const },
    { label: 'Мин', value: renderLimit(row.minValue), type: 'warning' as const },
    { label: 'Макс', value: renderLimit(row.maxValue), type: 'error' as const },
  ]

  const rows = items.map(({ label, value, type }) => {
    const labelNode = h('span', { class: 'range-row__label' }, label)
    const tagContent = h('span', { class: 'tag-range__value' }, value)
    const tagNode = h(
      NTag,
      {
        size: 'small',
        bordered: true,
        round: true,
        type,
        class: 'tag-range',
      },
      { default: () => tagContent },
    )

    const maybeTooltip =
      value === '—'
        ? tagNode
        : h(
            NTooltip,
            { placement: 'top', delay: 100 },
            {
              trigger: () => tagNode,
              default: () => value,
            },
          )

    return h('div', { class: 'range-row', key: `${row.id}-${label}` }, [labelNode, maybeTooltip])
  })

  return h('div', { class: 'range-cell' }, rows)
}

function renderSignDetails(row: LoadedObjectParameter): VNodeChild {
  return renderMultilineCell(row.signMultiNames ?? null)
}

function renderComments(row: LoadedObjectParameter): VNodeChild {
  return renderMultilineCell(row.note)
}

function renderSourceDetails(row: LoadedObjectParameter): VNodeChild {
  const source = row.sourceName ?? row.code
  return renderMultilineCell(source)
}

function renderDescription(row: LoadedObjectParameter): VNodeChild {
  return renderMultilineCell(row.description)
}

const renderActions = (row: LoadedObjectParameter): VNodeChild => {
  const editBtn = h(
    NButton,
    {
      quaternary: true,
      circle: true,
      size: 'small',
      onClick: () => openEdit(row),
      'aria-label': `Изменить параметр ${row.name}`,
    },
    { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  )

  const delBtn = h(
    NPopconfirm,
    {
      positiveText: 'Удалить',
      negativeText: 'Отмена',
      onPositiveClick: () => deleteParameter(row),
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
            'aria-label': `Удалить параметр ${row.name}`,
          },
          { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
        ),
      default: () => 'Удалить параметр?',
    },
  )

  return h('div', { class: 'table-actions' }, [editBtn, delBtn])
}

const columns = computed<DataTableColumn<LoadedObjectParameter>[]>(() => [
  {
    title: 'Параметр и компонент',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    minWidth: 360,
    className: 'col-name',
    render: renderNameWithMeta,
  },
  {
    title: 'ЕИ и границы',
    key: 'range',
    minWidth: 80,
    align: 'left',
    render: renderRange,
  },
  {
    title: 'Признаки, различающие значения параметра',
    key: 'signMulti',
    minWidth: 220,
    render: renderSignDetails,
  },
  {
    title: 'Комментарии по диапазонам',
    key: 'note',
    minWidth: 200,
    className: 'col-note',
    render: renderComments,
  },
  {
    title: 'Источник',
    key: 'sourceName',
    minWidth: 140,
    sorter: (a, b) => (a.sourceName ?? '').localeCompare(b.sourceName ?? '', 'ru'),
    render: renderSourceDetails,
  },
  {
    title: 'Описание',
    key: 'description',
    minWidth: 200,
    render: renderDescription,
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 120,
    align: 'center',
    render: renderActions,
  },
])

const cardFields = computed<CardField[]>(() => [
  {
    key: 'name',
    label: 'Наименование',
    render: renderNameWithMeta,
    isPrimary: true,
  },
  {
    key: 'range',
    label: 'ЕИ и границы',
    render: renderRange,
  },
  {
    key: 'signMulti',
    label: 'Признаки, различающие значения параметра',
    render: renderSignDetails,
  },
  {
    key: 'note',
    label: 'Комментарии по диапазонам',
    render: renderComments,
  },
  {
    key: 'source',
    label: 'Источник',
    render: renderSourceDetails,
  },
  {
    key: 'description',
    label: 'Описание',
    render: renderDescription,
  },
  {
    key: 'actions',
    label: 'Действия',
    render: renderActions,
    isActions: true,
  },
])

const primaryField = computed<CardField | null>(
  () => cardFields.value.find((field) => field.isPrimary) ?? cardFields.value[0] ?? null,
)
const statusField = computed(() => cardFields.value.find((field) => field.isStatus))
const actionsField = computed(() => cardFields.value.find((field) => field.isActions))
const infoFields = computed(() =>
  cardFields.value.filter((field) => !field.isPrimary && !field.isStatus && !field.isActions),
)

const toPlainText = (value: VNodeChild | VNodeChild[]): string => {
  if (value == null || typeof value === 'boolean') return ''
  if (Array.isArray(value)) {
    return value
      .map((item) => toPlainText(item as VNodeChild | VNodeChild[]))
      .filter(Boolean)
      .join(' ')
  }
  if (typeof value === 'object') {
    const children = (value as { children?: unknown }).children
    if (Array.isArray(children)) {
      return toPlainText(children as VNodeChild[])
    }
    if (children != null) {
      return toPlainText(children as VNodeChild)
    }
    return ''
  }
  return String(value)
}

const primaryTitle = (row: LoadedObjectParameter) =>
  [row.name, row.componentName].filter(Boolean).join(' - ')
const statusText = (row: LoadedObjectParameter) =>
  statusField.value ? toPlainText(statusField.value.render(row)) : ''
const statusClass = (row: LoadedObjectParameter) => {
  void row
  return ''
}

const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: { type: Object as PropType<CardField>, required: true },
    row: { type: Object as PropType<LoadedObjectParameter>, required: true },
  },
  setup(props) {
    return () => props.field.render(props.row)
  },
})

const ActionsRenderer = defineComponent({
  name: 'ActionsRenderer',
  props: {
    row: { type: Object as PropType<LoadedObjectParameter>, required: true },
  },
  setup(props) {
    return () => renderActions(props.row)
  },
})

const openCreate = () => {
  resetFormValidation()
  resetCreationForm()
  editingParameter.value = null
  parameterMutations.create.reset()
  parameterMutations.link.reset()
  parameterMutations.update.reset()
  createModalOpen.value = true
  void loadCreationDirectories(!directoriesLoaded.value)
  void loadSignOptions()
}

const openEdit = async (row: LoadedObjectParameter) => {
  resetFormValidation()
  resetCreationForm()
  editingParameter.value = row
  parameterMutations.update.reset()
  parameterMutations.create.reset()
  parameterMutations.link.reset()
  createModalOpen.value = true
  try {
    await loadCreationDirectories(true)
  } finally {
    applyParameterToForm(row)
  }
  void loadSignOptions()
}

defineExpose({
  openCreate,
  openEdit,
  handleSubmit,
  createModalOpen,
  creationForm,
  editingParameter,
  isEditMode,
})

const deleteParameter = async (row: LoadedObjectParameter) => {
  parameterMutations.remove.reset()

  const rawId = row.details.id ?? Number(row.id)
  const relationId = row.details.componentRelationId ?? null
  if (!rawId || !Number.isFinite(rawId)) {
    message.error('Не удалось определить идентификатор параметра для удаления')
    return
  }

  try {
    await parameterMutations.remove.mutateAsync({
      id: Number(rawId),
      relationId,
    })
    if (relationId && Number.isFinite(relationId)) {
      message.success(`Связь параметра «${row.name}» с компонентом удалена`)
    } else {
      message.success(`Параметр «${row.name}» удалён`)
    }
  } catch (err) {
    message.error(getErrorMessage(err) ?? `Не удалось удалить параметр «${row.name}»`)
  }
}
</script>

<style scoped lang="scss">
.object-parameters-page {
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
  vertical-align: top;
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

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 100%;
}
.name-cell__title {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
  font-weight: 600;
  line-height: 1.4;
}

.name-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}


.cell-multiline {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
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

.toolbar__search {
  width: 280px;
  max-width: 100%;
}

.tag-unit {
  background: var(--s360-surface);
  color: var(--s360-accent);
}

.tag-component {
  background: var(--s360-bg);
}

.note-text {
  display: block;
  max-width: 100%;
}

.note-text__clamped {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
}

.creation-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.name-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.creation-form :deep(.n-form-item-blank) {
  width: 100%;
}

.creation-form :deep(.n-input),
.creation-form :deep(.n-input-number),
.creation-form :deep(.n-input-number .n-input),
.creation-form :deep(.n-base-selection),
.creation-form :deep(.n-select),
.creation-form :deep(textarea) {
  width: 100%;
}

.creation-form--mobile {
  gap: 16px;
}

.creation-form--mobile :deep(.n-form-item) {
  margin: 0;
  padding: 0;
}

.creation-form--mobile :deep(.n-form-item-label) {
  padding-bottom: 4px;
  line-height: 1.3;
  white-space: normal;
  font-size: 14px;
}

.creation-form--mobile :deep(.n-form-item-feedback) {
  margin: 4px 0 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.field-hint--error {
  color: var(--n-error-color);
}

.existing-parameter-option {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.existing-parameter-option__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.existing-parameter-option__tag {
  flex-shrink: 0;
}

.limits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.limits-grid__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.limits-grid__label {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.range-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.range-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.range-row__label {
  color: #6b7280;
  font-size: 12px;
  text-transform: uppercase;
  width: 72px;
  text-align: right;
}

.range-row__label::after {
  content: ':';
  margin-left: 2px;
}

.range-row > :nth-child(2) {
  flex: 1;
  display: flex;
  min-width: 0;
}

.range-row > :nth-child(2) :deep(*) {
  max-width: 100%;
}

.tag-range {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--s360-surface);
  max-width: 100%;
  min-width: 0;
  flex-shrink: 1;
}

.tag-range__value {
  font-weight: 600;
  font-size: 12px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  opacity: 0;
  transition: 0.15s ease;
}

:deep(.n-data-table .n-data-table-tr:hover) .table-actions {
  opacity: 1;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
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

.list-info {
  font-size: 12px;
  color: var(--n-text-color-3);
  padding: 2px 2px 0;
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
  display: block;
  font-weight: 600;
}

.card__title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card__title :deep(.name-cell) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card__title :deep(.name-cell__title) {
  font-weight: 600;
  display: block;
}

.card__title :deep(.name-meta) {
  font-weight: 600;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card__title :deep(.name-meta .n-tag__content) {
  font-weight: 600;
}
.card__title .name-meta {
  font-weight: 600;
}

.card__title :deep(.n-tag__content) {
  font-weight: 600;
}

.card__grid {
  display: grid;
  grid-template-columns: 140px 1fr;
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
  opacity: 1;
}

.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--s360-surface);
}

@media (max-width: 768px) {
  .modal-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .modal-footer :deep(.n-button) {
    width: 100%;
  }

  .limits-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar__controls {
    justify-content: flex-start;
  }

  .toolbar__search {
    width: 100%;
  }
}

@media (max-width: 360px) {
  .card__grid {
    grid-template-columns: 110px 1fr;
  }
}

.show-more-bar {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
