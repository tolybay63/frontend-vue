<!-- Файл: src/pages/nsi/ObjectDefectsPage.vue
     Назначение: страница CRUD для дефектов обслуживаемых объектов с управлением компонентами и категориями.
     Использование: подключается в маршрутизаторе по пути /nsi/object-defects. -->
<template>
  <section class="object-defects-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          {{ t('nsi.objectTypes.defects.title', {}, { default: 'Справочник «Дефекты обслуживаемых объектов»' }) }}
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            :aria-label="t('nsi.objectTypes.defects.help', {}, { default: 'Справка о справочнике' })"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">
          {{ t('nsi.objectTypes.defects.subtitle', {}, { default: 'Ведите перечень дефектов обслуживаемых объектов с указанием категории, компонента, индекса и статуса' }) }}
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="q"
          :placeholder="t('nsi.objectTypes.defects.searchPlaceholder', {}, { default: 'Поиск…' })"
          clearable
          round
          class="toolbar__search"
        />
        <div class="toolbar__filters">
          <NSelect
            v-model:value="categoryFilter"
            :options="categoryFilterOptions"
            multiple
            filterable
            :placeholder="t('nsi.objectTypes.defects.filter.category', {}, { default: 'Категория' })"
            clearable
            size="small"
            class="toolbar__select"
          />
          <NSelect
            v-model:value="componentFilter"
            :options="componentFilterOptions"
            multiple
            filterable
            :placeholder="t('nsi.objectTypes.defects.filter.component', {}, { default: 'Компонент объекта' })"
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
          :aria-label="t('nsi.objectTypes.defects.sortAria', {}, { default: 'Порядок сортировки' })"
        />
        <!-- Ассистент временно отключён
        <NButton quaternary class="toolbar__assistant" @click="openAssistant">
          <template #icon>
            <NIcon><ChatbubblesOutline /></NIcon>
          </template>
          Ассистент
        </NButton>
        -->
        <NButton type="primary" @click="openCreate">+ {{ t('nsi.objectTypes.defects.add', {}, { default: 'Добавить дефект' }) }}</NButton>
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

      <div v-else class="cards">
        <div class="list-info">
          {{ t('nsi.objectTypes.defects.listInfo', { shown: visibleCount, total }, { default: 'Показано: ' + visibleCount + ' из ' + total }) }}
        </div>
        <article
          v-for="item in rows"
          :key="item.id"
          class="card"
          role="group"
          :aria-label="primaryTitle(item)"
        >
          <header class="card__header">
            <div class="card__heading">
              <h4 class="card__title">{{ primaryTitle(item) }}</h4>
              <NTag
                v-if="item.categoryName"
                size="small"
                :bordered="false"
                round
                type="info"
                class="tag-category card__category"
              >
                {{ item.categoryName }}
              </NTag>
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
          {{ t('nsi.objectTypes.defects.showMore', {}, { default: 'Показать ещё' }) }}
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
          :aria-label="t('nsi.objectTypes.defects.paginationAria', {}, { default: 'Постраничная навигация по дефектам объектов' })"
        >
          <template #prefix>
            <span class="pagination-total">{{ t('nsi.objectTypes.defects.total', { total }, { default: 'Всего: ' + total }) }}</span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="dialog"
      preset="card"
      :title="editing ? t('nsi.objectTypes.defects.dialog.editTitle', {}, { default: 'Изменить дефект' }) : t('nsi.objectTypes.defects.dialog.createTitle', {}, { default: 'Создать дефект' })"
      style="width: 560px"
    >
      <NForm :model="form" label-width="140px">
        <NFormItem
          :label="t('nsi.objectTypes.defects.form.name.label', {}, { default: 'Название' })"
          :feedback="errors.name ?? undefined"
          :validation-status="errors.name ? 'error' : undefined"
        >
          <NInput v-model:value="form.name" :placeholder="t('nsi.objectTypes.defects.form.name.placeholder', {}, { default: 'Введите название дефекта' })" />
          <div v-if="nameWarning" class="warning-text" style="margin-top: 4px">
            {{ nameWarning }}
          </div>
        </NFormItem>

        <NFormItem :label="t('nsi.objectTypes.defects.form.category.label', {}, { default: 'Категория' })">
          <CreatableSelect
            :value="form.categoryFvId"
            :options="categorySelectOptions"
            :multiple="false"
            :placeholder="t('nsi.objectTypes.defects.form.category.placeholder', {}, { default: 'Выберите категорию' })"
            :create="createCategoryOption"
            @update:value="(v) => handleCategoryChange(typeof v === 'string' ? v : null)"
          />
        </NFormItem>

        <NFormItem :label="t('nsi.objectTypes.defects.form.component.label', {}, { default: 'Компонент' })">
          <ComponentsSelect
            :value="form.componentId"
            :options="componentSelectOptions"
            :multiple="false"
            :value-kind="'id'"
            :placeholder="t('nsi.objectTypes.defects.form.component.placeholder', {}, { default: 'Выберите компонент' })"
            @update:value="(v) => handleComponentChange(typeof v === 'string' ? v : null)"
          />
        </NFormItem>

        <NFormItem :label="t('nsi.objectTypes.defects.form.index.label', {}, { default: 'Индекс' })">
          <NInput v-model:value="form.index" :placeholder="t('nsi.objectTypes.defects.form.index.placeholder', {}, { default: 'Например, D-01' })" />
        </NFormItem>

        <NFormItem :label="t('nsi.objectTypes.defects.form.note.label', {}, { default: 'Комментарий / статус' })">
          <NInput
            v-model:value="form.note"
            type="textarea"
            :placeholder="t('nsi.objectTypes.defects.form.note.placeholder', {}, { default: 'Уточните статус или важные примечания' })"
            :autosize="{ minRows: 2, maxRows: 5 }"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="dialog = false">{{ t('nsi.objectTypes.defects.actions.cancel', {}, { default: 'Отмена' }) }}</NButton>
          <NButton type="primary" class="btn-primary" :loading="saving" @click="save">
            {{ t('nsi.objectTypes.defects.actions.save', {}, { default: 'Сохранить' }) }}
          </NButton>
        </div>
      </template>
    </NModal>
    <!-- Ассистент временно отключён
    <NModal
      v-model:show="assistantOpen"
      preset="card"
      title="Голосовой ассистент"
      :show-mask="false"
      :trap-focus="false"
      :block-scroll-on-open="false"
      style="max-width: 520px; width: min(92vw, 520px); margin: 0 20px 20px auto"
    >
      <div class="assistant">
        <div ref="assistantMessagesRef" class="assistant__messages">
          <div
            v-for="message in assistantMessages"
            :key="message.id"
            class="assistant-message"
            :class="`assistant-message--${message.role}`"
          >
            <span class="assistant-message__text">{{ message.content }}</span>
            <button
              v-if="canUndoMessage(message)"
              type="button"
              class="assistant-message__undo"
              aria-label="Отменить ответ"
              @click="undoAssistantStep(message.historyId!)"
            >
              ×
            </button>
          </div>
          <div
            v-if="assistantMessages.length === 0"
            class="assistant-message assistant-message--assistant"
          >
            <span class="assistant-message__text"
              >Подскажите название дефекта, который нужно добавить.</span
            >
          </div>
        </div>

        <div class="assistant__controls">
          <div
            v-if="assistantStep === 'ask-category' && assistantCategorySuggestions.length"
            class="assistant__picker"
          >
            <span class="assistant__picker-label">Популярные категории:</span>
            <div class="assistant__picker-buttons">
              <NButton
                v-for="option in assistantCategorySuggestions"
                :key="option.fvId"
                tertiary
                size="small"
                class="assistant__picker-button"
                @click="chooseAssistantCategory(option)"
              >
                {{ option.name }}
              </NButton>
            </div>
          </div>

          <NInput
            v-model:value="assistantInput"
            type="textarea"
            rows="2"
            placeholder="Ответьте голосом или введите текст"
            :disabled="assistantProcessing || assistantListening"
          />
          <div class="assistant__actions">
            <NButton
              tertiary
              class="assistant__voice"
              :type="assistantListening ? 'error' : 'default'"
              :disabled="!speechRecognitionSupported || assistantProcessing"
              @click="toggleAssistantVoice"
            >
              <template #icon>
                <NIcon>
                  <component :is="assistantListening ? MicOffOutline : MicOutline" />
                </NIcon>
              </template>
              {{ assistantListening ? 'Стоп' : 'Говорить' }}
            </NButton>

            <NButton
              type="primary"
              :disabled="!assistantInput.trim() || assistantProcessing"
              :loading="assistantProcessing"
              @click="sendAssistantText"
            >
              Ответить
            </NButton>
          </div>
          <div class="assistant__hint">
            <span v-if="assistantListening"
              >Идёт запись… договорите фразу и дождитесь завершения.</span
            >
            <span v-else-if="!speechRecognitionSupported">
              Голосовой ввод недоступен в этом браузере — используйте текстовый ответ.
            </span>
            <span v-else>Нажмите «Говорить», чтобы отвечать голосом.</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="assistant__footer">
          <NButton tertiary :disabled="assistantProcessing" @click="restartAssistant"
            >Сбросить диалог</NButton
          >
          <NButton :disabled="assistantListening" @click="assistantOpen = false">Закрыть</NButton>
        </div>
      </template>
    </NModal>
    -->

    <NModal
      v-model:show="infoOpen"
      preset="card"
      :title="t('nsi.objectTypes.defects.info.title', {}, { default: 'О справочнике' })"
      style="max-width: 640px; width: 92vw"
    >
      <p>
        {{ t('nsi.objectTypes.defects.info.p1', {}, { default: 'Это список дефектов инфраструктурных объектов. Он помогает фиксировать состояние, планировать обслуживание и вести аналитику по категориям и компонентам.' }) }}
      </p>
      <p>
        {{ t('nsi.objectTypes.defects.info.p2', {}, { default: 'Чтобы добавить дефект: укажите название, выберите категорию и компонент (при необходимости), задайте индекс и опишите статус в комментарии.' }) }}
      </p>
      <p>
        {{ t('nsi.objectTypes.defects.info.p3', {}, { default: 'Редактировать можно только те дефекты, с которыми нет ограничений на стороне подсистем. Вносите изменения внимательно, чтобы не потерять связь с категориями и компонентами.' }) }}
      </p>
      <template #footer>
        <NButton type="primary" @click="infoOpen = false">{{ t('nsi.objectTypes.defects.info.ok', {}, { default: 'Понятно' }) }}</NButton>
      </template>
    </NModal>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  reactive,
  ref,
  watch,
  watchEffect,
  onMounted,
  onBeforeUnmount,
  nextTick,
  h,
  defineComponent,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import type { PropType, VNodeChild } from 'vue'

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
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumn } from 'naive-ui'

import {
  CreateOutline,
  TrashOutline,
  InformationCircleOutline,
  // Ассистент временно отключён
  // ChatbubblesOutline,
  // MicOutline,
  // MicOffOutline,
} from '@vicons/ionicons5'

import { CreatableSelect } from '@features/creatable-select'
import { ComponentsSelect } from '@features/components-select'

import {
  useObjectDefectsQuery,
  useObjectDefectMutations,
  createDefectComponentLookup,
  createDefectCategoryLookup,
} from '@features/object-defect-crud'
import {
  deleteDefectOwnerWithProperties,
  createDefectCategory,
  type DefectCategoryOption,
  type DefectComponentOption,
  type LoadedObjectDefect,
  type ObjectDefectsSnapshot,
} from '@entities/object-defect'
import { listDefectCategories } from '@entities/object-defect'
//
import { useQueryClient } from '@tanstack/vue-query'
import { getErrorMessage, normalizeText } from '@shared/lib'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const isMobile = ref(false)
if (typeof window !== 'undefined') {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

onMounted(() => {
  if (typeof window === 'undefined') return
  mediaQueryList = window.matchMedia('(max-width: 768px)')
  handleMediaQueryChange(mediaQueryList)
  mediaQueryList.addEventListener('change', handleMediaQueryChange)
})

onBeforeUnmount(() => {
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleMediaQueryChange)
    mediaQueryList = null
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

interface PaginationState {
  page: number
  pageSize: number
}

interface FetchState {
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  errorMessage: string
}

interface FormState {
  name: string
  componentId: string | null
  componentPvId: string | null
  categoryFvId: string | null
  categoryPvId: string | null
  index: string
  note: string
}

interface FormErrors {
  name?: string
}

interface CardField {
  key: string
  label: string
  render: (row: LoadedObjectDefect) => VNodeChild
  isPrimary?: boolean
  isStatus?: boolean
  isActions?: boolean
}

interface ConfirmDialogOptions {
  title?: string
  content: string
  positiveText?: string
  negativeText?: string
  html?: boolean
}

const message = useMessage()
const discreteDialog = useDialog()
const q = ref('')
const categoryFilter = ref<string[]>([])
const componentFilter = ref<string[]>([])
const pagination = reactive<PaginationState>({ page: 1, pageSize: 10 })

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

let mediaQueryList: MediaQueryList | null = null
const handleMediaQueryChange = (e: MediaQueryList | MediaQueryListEvent) => {
  isMobile.value = 'matches' in e ? e.matches : false
}

const { data: snapshot, isLoading, isFetching, error } = useObjectDefectsQuery()
const snapshotData = computed<ObjectDefectsSnapshot | undefined>(() => snapshot.value ?? undefined)

const fetchState = computed<FetchState>(() => ({
  isLoading: isLoading.value,
  isFetching: isFetching.value,
  isError: Boolean(error.value),
  errorMessage: getErrorMessage(error.value),
}))

const tableLoading = computed(() => fetchState.value.isLoading || fetchState.value.isFetching)
const sortOrder = ref<'asc' | 'desc'>('asc')
const sortOptions = [
  { label: 'А-Я', value: 'asc' },
  { label: 'Я-А', value: 'desc' },
]

const { create } = useObjectDefectMutations()
const queryClient = useQueryClient()

watch(
  () => fetchState.value.errorMessage,
  (next, prev) => {
    if (next && next !== prev) message.error(next)
  },
)

const defects = computed(() => snapshotData.value?.items ?? [])
const categoryOptions = computed<DefectCategoryOption[]>(() => snapshotData.value?.categories ?? [])
const componentOptions = computed<DefectComponentOption[]>(
  () => snapshotData.value?.components ?? [],
)

const componentLookup = computed(() =>
  createDefectComponentLookup(defects.value, componentOptions.value),
)

const categoryLookup = computed(() =>
  createDefectCategoryLookup(defects.value, categoryOptions.value),
)

const categoryFilterOptions = computed(() =>
  categoryOptions.value.map((option) => ({ label: option.name, value: option.fvId })),
)

const componentFilterOptions = computed(() => {
  const values = new Map<string, string>()
  for (const defect of defects.value) {
    const name = defect.componentName?.trim() ?? ''
    const fallback = defect.componentId?.trim() ?? ''
    const display = name || fallback
    if (!display || display.length > 60) continue
    const keySource = name || fallback
    const key = normalizeText(keySource)
    if (!key || values.has(key)) continue
    values.set(key, display)
  }
  return Array.from(values.values()).map((label) => ({ label, value: label }))
})

const componentSelectOptions = computed(() =>
  componentOptions.value.map((option) => ({ label: option.name, value: option.id })),
)

const categorySelectOptions = computed(() =>
  categoryOptions.value.map((option) => ({ label: option.name, value: option.fvId })),
)

/* Ассистент временно отключён
const categoryNameMap = computed(() => {
  const map = new Map<string, DefectCategoryOption>()
  for (const option of categoryOptions.value) {
    const keys = [option.name, option.fvId, option.pvId]
    for (const key of keys) {
      const normalized = normalizeText(key ?? '')
      if (normalized) map.set(normalized, option)
    }
  }
  return map
})

const componentNameMap = computed(() => {
  const map = new Map<string, DefectComponentOption>()
  for (const option of componentOptions.value) {
    const keys = [option.name, option.id, option.pvId]
    for (const key of keys) {
      const normalized = normalizeText(key ?? '')
      if (normalized) map.set(normalized, option)
    }
  }
  return map
})
*/

/* Ассистент временно отключён

type AssistantRole = 'assistant' | 'user'

interface AssistantMessage {
  id: string
  role: AssistantRole
  content: string
  step?: AssistantStep
  historyId?: string | null
}

type AssistantStep =
  | 'ask-name'
  | 'ask-category'
  | 'ask-component'
  | 'ask-index'
  | 'ask-note'
  | 'confirm'

interface AssistantHistoryEntry {
  id: string
  step: AssistantStep
  messageIds: string[]
  rollback: () => void
}

const assistantOpen = ref(false)
const assistantMessagesRef = ref<HTMLDivElement | null>(null)
const assistantMessages = ref<AssistantMessage[]>([])
const assistantInput = ref('')
const assistantStep = ref<AssistantStep>('ask-name')
const assistantProcessing = ref(false)
const assistantListening = ref(false)
const assistantHistory = ref<AssistantHistoryEntry[]>([])

const assistantSession = reactive({
  name: '',
  categoryFvId: null as string | null,
  categoryPvId: null as string | null,
  categoryName: '',
  componentId: null as string | null,
  componentPvId: null as string | null,
  componentName: '',
  index: '',
  note: '',
})

const findDefectByName = (value: string): LoadedObjectDefect | null => {
  const normalizedName = normalizeText(value)
  if (!normalizedName) return null
  return defects.value.find((defect) => normalizeText(defect.name) === normalizedName) ?? null
}

const assistantCategorySuggestions = computed(() => categoryOptions.value.slice(0, 6))

interface AssistantSpeechRecognitionResult {
  readonly isFinal: boolean
  readonly 0: { transcript: string }
}

interface AssistantSpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: ArrayLike<AssistantSpeechRecognitionResult>
}

interface AssistantSpeechRecognitionErrorEvent extends Event {
  readonly error: string
}

interface AssistantSpeechRecognition extends EventTarget {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: AssistantSpeechRecognitionEvent) => void) | null
  onerror: ((event: AssistantSpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type AssistantSpeechRecognitionConstructor = new () => AssistantSpeechRecognition

type WindowWithSpeechRecognition = Window &
  typeof globalThis & {
    SpeechRecognition?: AssistantSpeechRecognitionConstructor
    webkitSpeechRecognition?: AssistantSpeechRecognitionConstructor
  }

type SpeechRecognitionWithStop = AssistantSpeechRecognition

const speechRecognitionSupported = computed(() => {
  if (typeof window === 'undefined') return false
  const w = window as WindowWithSpeechRecognition
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition)
})

const speechSynthesisSupported = computed(
  () => typeof window !== 'undefined' && 'speechSynthesis' in window,
)

let recognition: SpeechRecognitionWithStop | null = null

const createMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const ensureChatScroll = () => {
  nextTick(() => {
    const el = assistantMessagesRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

const cancelSpeech = () => {
  if (!speechSynthesisSupported.value) return
  if (typeof window === 'undefined') return
  const synth = window.speechSynthesis
  synth?.cancel()
}

const speakMessage = (text: string) => {
  if (!speechSynthesisSupported.value) return
  if (typeof window === 'undefined') return
  const synth = window.speechSynthesis
  if (!synth) return
  cancelSpeech()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ru-RU'
  synth.speak(utterance)
}

const pushAssistantMessage = (
  content: string,
  options: { step?: AssistantStep; speak?: boolean; historyId?: string | null } = {},
) => {
  const id = createMessageId()
  assistantMessages.value.push({
    id,
    role: 'assistant',
    content,
    step: options.step,
    historyId: options.historyId ?? null,
  })
  if (options.speak) speakMessage(content)
  ensureChatScroll()
  return id
}

const pushUserMessage = (content: string, options: { step: AssistantStep; historyId: string }) => {
  const id = createMessageId()
  assistantMessages.value.push({
    id,
    role: 'user',
    content,
    step: options.step,
    historyId: options.historyId,
  })
  ensureChatScroll()
  return id
}

const stopAssistantVoice = () => {
  if (!recognition) return
  try {
    recognition.stop()
    recognition.abort()
  } catch (error) {
    console.warn('failed to stop recognition', error)
  }
  recognition = null
  assistantListening.value = false
}

const resetAssistantConversation = () => {
  stopAssistantVoice()
  cancelSpeech()
  assistantMessages.value = []
  assistantInput.value = ''
  assistantStep.value = 'ask-name'
  assistantProcessing.value = false
  assistantHistory.value = []
  assistantSession.name = ''
  assistantSession.categoryFvId = null
  assistantSession.categoryPvId = null
  assistantSession.categoryName = ''
  assistantSession.componentId = null
  assistantSession.componentPvId = null
  assistantSession.componentName = ''
  assistantSession.index = ''
  assistantSession.note = ''
}

const stripKeywords = (value: string, keywords: string[]): string => {
  let current = value.trim()
  let changed = true
  while (changed) {
    changed = false
    for (const keyword of keywords) {
      const prefix = `${keyword} `
      if (current.startsWith(prefix)) {
        current = current.slice(prefix.length).trim()
        changed = true
      }
    }
  }
  return current
}

const categoryKeywords = ['категория', 'категории', 'категорию', 'категорией']
const componentKeywords = ['компонент', 'компонента', 'компоненту', 'компоненты']

const sanitizeCategoryInput = (value: string) =>
  stripKeywords(normalizeText(value), categoryKeywords)
const sanitizeComponentInput = (value: string) =>
  stripKeywords(normalizeText(value), componentKeywords)

const matchCategoryOption = (value: string): DefectCategoryOption | null => {
  const sanitized = sanitizeCategoryInput(value)
  if (!sanitized) return null
  const direct = categoryNameMap.value.get(sanitized)
  if (direct) return direct
  for (const option of categoryOptions.value) {
    const normalizedName = normalizeText(option.name)
    if (!normalizedName) continue
    if (normalizedName.includes(sanitized) || sanitized.includes(normalizedName)) return option
    const chunks = sanitized.split(' ').filter(Boolean)
    if (chunks.length && chunks.every((chunk) => normalizedName.includes(chunk))) return option
  }
  return null
}

const matchComponentOption = (value: string): DefectComponentOption | null => {
  const sanitized = sanitizeComponentInput(value)
  if (!sanitized) return null
  const direct = componentNameMap.value.get(sanitized)
  if (direct) return direct
  for (const option of componentOptions.value) {
    const normalizedName = normalizeText(option.name)
    if (!normalizedName) continue
    if (normalizedName.includes(sanitized) || sanitized.includes(normalizedName)) return option
    const chunks = sanitized.split(' ').filter(Boolean)
    if (chunks.length && chunks.every((chunk) => normalizedName.includes(chunk))) return option
  }
  return null
}

const skipCommands = [
  'нет',
  'пропусти',
  'пропустить',
  'без',
  'не нужно',
  'не указывать',
  'пока нет',
]

const isSkipCommand = (value: string) => {
  const normalized = normalizeText(value)
  if (!normalized) return false
  return skipCommands.some(
    (command) =>
      normalized === command ||
      normalized.startsWith(`${command} `) ||
      normalized.endsWith(` ${command}`),
  )
}

const isAffirmative = (value: string) => {
  const normalized = normalizeText(value)
  return ['да', 'подтверждаю', 'создать', 'готово', 'верно', 'правильно', 'ок', 'окей'].some(
    (word) => normalized.includes(word),
  )
}

const isNegative = (value: string) => {
  const normalized = normalizeText(value)
  return ['нет', 'не надо', 'отмена', 'не нужно', 'стоп'].some((word) => normalized.includes(word))
}

const describeSummary = () => {
  const name = assistantSession.name.trim()
  const category = assistantSession.categoryName || 'без категории'
  const component = assistantSession.componentName || 'без компонента'
  const index = assistantSession.index.trim()
  const note = assistantSession.note.trim()
  const parts = [`Название: ${name}.`, `Категория: ${category}.`, `Компонент: ${component}.`]
  parts.push(index ? `Индекс: ${index}.` : 'Индекс пропущен.')
  parts.push(note ? 'Комментарий добавлен.' : 'Комментарий пропущен.')
  return parts.join(' ')
}

const goToStep = (
  step: AssistantStep,
  options: { repeat?: boolean; intro?: string } = {},
): string | null => {
  if (step === 'ask-category' && categoryOptions.value.length === 0) {
    pushAssistantMessage('Категории пока не загружены, пропускаю этот шаг.')
    return goToStep('ask-component', {
      intro: 'Выберите компонент дефекта. Если компонент не нужен, скажите, что без компонента.',
    })
  }

  if (step === 'ask-component' && componentOptions.value.length === 0) {
    pushAssistantMessage('Компоненты не найдены, пропускаю этот шаг.')
    return goToStep('ask-index', {
      intro: 'Укажите индекс дефекта. Если индекса нет, скажите «нет индекса».',
    })
  }

  assistantStep.value = step

  let text = ''
  switch (step) {
    case 'ask-name':
      text = options.intro
        ? options.intro
        : options.repeat
          ? 'Повторите, пожалуйста, название дефекта — минимум два символа.'
          : 'Как назовём дефект?'
      break
    case 'ask-category':
      text = options.intro
        ? options.intro
        : options.repeat
          ? 'Повторите категорию или скажите, что её нет.'
          : 'Назовите категорию дефекта или скажите «нет категории». '
      break
    case 'ask-component':
      text = options.intro
        ? options.intro
        : options.repeat
          ? 'Повторите компонент или скажите, что его нет.'
          : 'Выберите компонент дефекта или скажите «нет компонента». '
      break
    case 'ask-index':
      text = options.intro
        ? options.intro
        : options.repeat
          ? 'Повторите индекс или скажите, что его нет.'
          : 'Укажите индекс дефекта. Если индекса нет, скажите «нет индекса». '
      break
    case 'ask-note':
      text = options.intro
        ? options.intro
        : options.repeat
          ? 'Повторите комментарий или скажите, что его нет.'
          : 'Добавьте короткий комментарий или статус. Если нечего добавить, скажите «нет комментария». '
      break
    case 'confirm':
      text = `${describeSummary()} Создать такой дефект? Ответьте «да» или «нет».`
      break
  }

  if (!text) return null
  return pushAssistantMessage(text, { step, speak: true })
}

const startAssistantSession = (
  introMessage = 'Здравствуйте! Я помогу добавить дефект. Как он будет называться?',
) => {
  resetAssistantConversation()
  void goToStep('ask-name', { intro: introMessage })
}

const openAssistant = () => {
  assistantOpen.value = true
}

const restartAssistant = () => {
  startAssistantSession('Начнём заново. Как назовём дефект?')
}

const chooseAssistantCategory = (option: DefectCategoryOption) => {
  handleAssistantResponse(option.name)
}

const handleAssistantResponse = (raw: string) => {
  const text = raw.trim()
  if (!text) return

  const currentStep = assistantStep.value
  const historyId = createMessageId()
  const messageIds: string[] = []
  const userMessageId = pushUserMessage(text, { step: currentStep, historyId })
  messageIds.push(userMessageId)

  const addHistoryEntry = (rollback: () => void) => {
    assistantHistory.value = [
      ...assistantHistory.value,
      {
        id: historyId,
        step: currentStep,
        messageIds: [...messageIds],
        rollback,
      },
    ]
  }

  switch (currentStep) {
    case 'ask-name': {
      if (text.length < 2) {
        messageIds.push(
          pushAssistantMessage('Название должно быть не короче двух символов. Попробуйте ещё раз.'),
        )
        const nextId = goToStep('ask-name', { repeat: true })
        if (nextId) messageIds.push(nextId)
        return
      }

      assistantSession.name = text
      const duplicate = findDefectByName(text)
      if (duplicate) {
        const warning = duplicate.categoryName
          ? `Дефект с таким названием уже есть в категории «${duplicate.categoryName}». Могу добавить ещё один вариант.`
          : 'Дефект с таким названием уже есть. Могу добавить ещё один вариант.'
        messageIds.push(pushAssistantMessage(warning))
      }

      const nextId = goToStep('ask-category')
      if (nextId) messageIds.push(nextId)

      addHistoryEntry(() => {
        assistantSession.name = ''
        assistantSession.categoryFvId = null
        assistantSession.categoryPvId = null
        assistantSession.categoryName = ''
        assistantSession.componentId = null
        assistantSession.componentPvId = null
        assistantSession.componentName = ''
        assistantSession.index = ''
        assistantSession.note = ''
        assistantStep.value = 'ask-name'
      })
      break
    }
    case 'ask-category': {
      const previous = {
        fvId: assistantSession.categoryFvId,
        pvId: assistantSession.categoryPvId,
        name: assistantSession.categoryName,
      }

      if (isSkipCommand(text)) {
        assistantSession.categoryFvId = null
        assistantSession.categoryPvId = null
        assistantSession.categoryName = ''
        messageIds.push(pushAssistantMessage('Категорию пропускаем.'))
        const nextId = goToStep('ask-component')
        if (nextId) messageIds.push(nextId)
        addHistoryEntry(() => {
          assistantSession.categoryFvId = previous.fvId
          assistantSession.categoryPvId = previous.pvId
          assistantSession.categoryName = previous.name
          assistantStep.value = 'ask-category'
        })
        return
      }

      const option = matchCategoryOption(text)
      if (!option) {
        messageIds.push(
          pushAssistantMessage(
            'Не удалось найти такую категорию. Повторите, пожалуйста, или скажите, что категории нет.',
          ),
        )
        const nextId = goToStep('ask-category', { repeat: true })
        if (nextId) messageIds.push(nextId)
        return
      }

      assistantSession.categoryFvId = option.fvId
      assistantSession.categoryPvId = option.pvId
      assistantSession.categoryName = option.name
      messageIds.push(pushAssistantMessage(`Категория «${option.name}».`))

      const nextId = goToStep('ask-component')
      if (nextId) messageIds.push(nextId)

      addHistoryEntry(() => {
        assistantSession.categoryFvId = previous.fvId
        assistantSession.categoryPvId = previous.pvId
        assistantSession.categoryName = previous.name
        assistantStep.value = 'ask-category'
      })
      break
    }
    case 'ask-component': {
      const previous = {
        id: assistantSession.componentId,
        pvId: assistantSession.componentPvId,
        name: assistantSession.componentName,
      }

      if (isSkipCommand(text)) {
        assistantSession.componentId = null
        assistantSession.componentPvId = null
        assistantSession.componentName = ''
        messageIds.push(pushAssistantMessage('Компонент пропускаем.'))
        const nextId = goToStep('ask-index')
        if (nextId) messageIds.push(nextId)
        addHistoryEntry(() => {
          assistantSession.componentId = previous.id
          assistantSession.componentPvId = previous.pvId
          assistantSession.componentName = previous.name
          assistantStep.value = 'ask-component'
        })
        return
      }

      const option = matchComponentOption(text)
      if (!option) {
        messageIds.push(
          pushAssistantMessage(
            'Не удалось найти такой компонент. Повторите, пожалуйста, или скажите, что компонента нет.',
          ),
        )
        const nextId = goToStep('ask-component', { repeat: true })
        if (nextId) messageIds.push(nextId)
        return
      }

      assistantSession.componentId = option.id
      assistantSession.componentPvId = option.pvId ?? null
      assistantSession.componentName = option.name
      messageIds.push(pushAssistantMessage(`Компонент «${option.name}».`))

      const nextId = goToStep('ask-index')
      if (nextId) messageIds.push(nextId)

      addHistoryEntry(() => {
        assistantSession.componentId = previous.id
        assistantSession.componentPvId = previous.pvId
        assistantSession.componentName = previous.name
        assistantStep.value = 'ask-component'
      })
      break
    }
    case 'ask-index': {
      const previous = assistantSession.index

      if (isSkipCommand(text)) {
        assistantSession.index = ''
        messageIds.push(pushAssistantMessage('Индекс пропускаем.'))
        const nextId = goToStep('ask-note')
        if (nextId) messageIds.push(nextId)
        addHistoryEntry(() => {
          assistantSession.index = previous
          assistantStep.value = 'ask-index'
        })
        return
      }

      const trimmed = text.trim()
      if (!trimmed) {
        messageIds.push(pushAssistantMessage('Индекс не распознан. Попробуйте ещё раз.'))
        const nextId = goToStep('ask-index', { repeat: true })
        if (nextId) messageIds.push(nextId)
        return
      }

      assistantSession.index = trimmed
      messageIds.push(pushAssistantMessage(`Индекс «${trimmed}».`))

      const nextId = goToStep('ask-note')
      if (nextId) messageIds.push(nextId)

      addHistoryEntry(() => {
        assistantSession.index = previous
        assistantStep.value = 'ask-index'
      })
      break
    }
    case 'ask-note': {
      const previous = assistantSession.note

      if (isSkipCommand(text)) {
        assistantSession.note = ''
        messageIds.push(pushAssistantMessage('Комментарий пропускаем.'))
        const nextId = goToStep('confirm')
        if (nextId) messageIds.push(nextId)
        addHistoryEntry(() => {
          assistantSession.note = previous
          assistantStep.value = 'ask-note'
        })
        return
      }

      assistantSession.note = text.trim()
      messageIds.push(pushAssistantMessage('Комментарий записан.'))

      const nextId = goToStep('confirm')
      if (nextId) messageIds.push(nextId)

      addHistoryEntry(() => {
        assistantSession.note = previous
        assistantStep.value = 'ask-note'
      })
      break
    }
    case 'confirm': {
      if (isAffirmative(text)) {
        void createDefectViaAssistant()
        return
      }
      if (isNegative(text)) {
        startAssistantSession('Хорошо, начнём заново. Как назовём дефект?')
        return
      }

      messageIds.push(pushAssistantMessage('Ответьте, пожалуйста, «да» или «нет».'))
      const nextId = goToStep('confirm')
      if (nextId) messageIds.push(nextId)
      return
    }
  }
}

const createRecognition = (): SpeechRecognitionWithStop | null => {
  if (!speechRecognitionSupported.value || typeof window === 'undefined') return null
  const w = window as WindowWithSpeechRecognition
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!Ctor) return null
  const instance = new Ctor() as SpeechRecognitionWithStop
  instance.lang = 'ru-RU'
  instance.interimResults = false
  instance.maxAlternatives = 1
  return instance
}

const toggleAssistantVoice = () => {
  if (assistantListening.value) {
    stopAssistantVoice()
    return
  }

  const instance = createRecognition()
  if (!instance) {
    message.warning('Голосовой ввод недоступен в этом браузере')
    return
  }

  recognition = instance
  cancelSpeech()

  instance.onresult = (event: AssistantSpeechRecognitionEvent) => {
    const result = event.results[event.resultIndex]
    if (result?.isFinal) {
      const transcript = result[0]?.transcript?.trim() ?? ''
      if (transcript) handleAssistantResponse(transcript)
    }
  }

  instance.onerror = (event: AssistantSpeechRecognitionErrorEvent) => {
    if (event.error !== 'aborted') message.error('Не удалось распознать речь')
    stopAssistantVoice()
  }

  instance.onend = () => {
    stopAssistantVoice()
  }

  try {
    instance.start()
    assistantListening.value = true
  } catch (error) {
    console.error(error)
    message.error('Не удалось начать запись')
    stopAssistantVoice()
  }
}

const sendAssistantText = () => {
  const text = assistantInput.value.trim()
  if (!text) return
  assistantInput.value = ''
  handleAssistantResponse(text)
}

const createDefectViaAssistant = async () => {
  if (assistantProcessing.value) return

  const nameTrimmed = assistantSession.name.trim()
  if (nameTrimmed.length < 2) {
    pushAssistantMessage('Название слишком короткое. Начнём заново.')
    void goToStep('ask-name', { repeat: true })
    return
  }

  assistantProcessing.value = true
  try {
    await create.mutateAsync({
      name: nameTrimmed,
      categoryFvId: assistantSession.categoryFvId,
      categoryPvId: assistantSession.categoryPvId,
      componentId: assistantSession.componentId,
      componentPvId: assistantSession.componentPvId,
      index: assistantSession.index.trim() ? assistantSession.index.trim() : null,
      note: assistantSession.note.trim() ? assistantSession.note.trim() : null,
    })
    pushAssistantMessage(`Готово! Дефект «${nameTrimmed}» создан. Можете назвать следующий.`, {
      speak: true,
    })
    assistantSession.name = ''
    assistantSession.categoryFvId = null
    assistantSession.categoryPvId = null
    assistantSession.categoryName = ''
    assistantSession.componentId = null
    assistantSession.componentPvId = null
    assistantSession.componentName = ''
    assistantSession.index = ''
    assistantSession.note = ''
    void goToStep('ask-name', { intro: 'Назовите следующий дефект или закройте ассистента.' })
  } catch (error) {
    console.error(error)
    const errorText = getErrorMessage(error) || 'Не удалось создать дефект'
    pushAssistantMessage(errorText)
    void goToStep('confirm', { repeat: true })
  } finally {
    assistantProcessing.value = false
  }
}

const canUndoMessage = (message: AssistantMessage) => {
  if (message.role !== 'user' || !message.historyId) return false
  if (assistantProcessing.value) return false
  const history = assistantHistory.value
  if (!history.length) return false
  return history[history.length - 1].id === message.historyId
}

const undoAssistantStep = (historyId: string) => {
  const history = assistantHistory.value
  if (!history.length) return
  const lastEntry = history[history.length - 1]
  if (lastEntry.id !== historyId) return

  cancelSpeech()
  stopAssistantVoice()

  assistantHistory.value = history.slice(0, -1)
  assistantMessages.value = assistantMessages.value.filter(
    (message) => !lastEntry.messageIds.includes(message.id),
  )
  lastEntry.rollback()
  assistantInput.value = ''
  assistantProcessing.value = false

  void goToStep(assistantStep.value, { repeat: true })
}

watch(assistantOpen, (value) => {
  if (value) {
    startAssistantSession()
  } else {
    stopAssistantVoice()
    cancelSpeech()
  }
})
*/

const filteredRows = computed(() => {
  const search = normalizeText(q.value)
  const selectedCategories = new Set(categoryFilter.value.map(String))
  const selectedComponents = new Set(
    componentFilter.value.map((v) => normalizeText(String(v))),
  )

  return defects.value.filter((item) => {
    if (selectedCategories.size) {
      const catId1 = item.categoryFvId
      const catId2 = item.categoryPvId
      if (!selectedCategories.has(catId1) && !selectedCategories.has(catId2)) {
        return false
      }
    }

    if (selectedComponents.size) {
      const componentName = normalizeText(item.componentName ?? '')
      const componentId = normalizeText(item.componentId ?? '')
      const componentValue = componentName || componentId
      if (!componentValue || !selectedComponents.has(componentValue)) {
        return false
      }
    }

    if (!search) return true

    const fields = [item.name, item.categoryName, item.componentName, item.index, item.note]
    return fields.some((field) => normalizeText(field ?? '').includes(search))
  })
})

const total = computed(() => filteredRows.value.length)
const sortedRows = computed(() => {
  const base = [...filteredRows.value].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return sortOrder.value === 'desc' ? base.reverse() : base
})
const paginatedRows = computed(() => {
  const start = Math.max(0, (pagination.page - 1) * pagination.pageSize)
  return sortedRows.value.slice(start, start + pagination.pageSize)
})
const mobileRows = computed(() => sortedRows.value.slice(0, pagination.page * pagination.pageSize))
const rows = computed(() => (isMobile.value ? mobileRows.value : paginatedRows.value) || [])
const visibleCount = computed(() => rows.value.length)
const rowKey = (row: LoadedObjectDefect) => row.id

function renderCategory(row: LoadedObjectDefect): VNodeChild {
  if (!row.categoryName) return '—'
  return h(
    NTag,
    { size: 'small', bordered: false, round: true, type: 'info', class: 'tag-category' },
    { default: () => row.categoryName },
  )
}

function renderComponent(row: LoadedObjectDefect): VNodeChild {
  if (!row.componentName) return '—'
  return h(
    NTag,
    { size: 'small', bordered: true, round: true, class: 'tag-component' },
    { default: () => row.componentName },
  )
}

function renderIndex(row: LoadedObjectDefect): VNodeChild {
  return row.index && row.index.trim() ? row.index : '—'
}

function renderNote(row: LoadedObjectDefect): VNodeChild {
  if (!row.note) return '—'
  const lines = row.note
    .split(/\n+/)
    .map((line, idx) => h('div', { key: `${row.id}-note-${idx}` }, line))
  return h('div', { class: 'note-text' }, lines)
}

const renderActions = (row: LoadedObjectDefect): VNodeChild => {
  const editBtn = h(
    NButton,
    {
      quaternary: true,
      circle: true,
      size: 'small',
      onClick: () => openEdit(row),
      'aria-label': 'Изменить дефект',
    },
    { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  )

  const delBtn = h(
    NPopconfirm,
    {
      positiveText: 'Удалить',
      negativeText: 'Отмена',
      onPositiveClick: () => removeRow(row.id),
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
            'aria-label': 'Удалить дефект',
          },
          { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
        ),
      default: () => 'Удалить дефект?',
    },
  )

  return h('div', { class: 'table-actions' }, [editBtn, delBtn])
}

const columns = computed<DataTableColumn<LoadedObjectDefect>[]>(() => [
  {
    title: 'Индекс',
    key: 'index',
    sorter: (a, b) => a.index.localeCompare(b.index, 'ru'),
    width: 120,
    align: 'center',
    render: renderIndex,
  },
  {
    title: 'Название дефекта',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    width: 500,
    ellipsis: { tooltip: true },
    className: 'col-name',
    render: (row) => row.name,
  },
  {
    title: 'Категория',
    key: 'categoryName',
    minWidth: 80,
    align: 'center',
    className: 'col-category',
    render: renderCategory,
  },
  {
    title: 'Компонент',
    key: 'componentName',
    minWidth: 100,
    className: 'col-component',
    render: renderComponent,
  },
  {
    title: 'Комментарий',
    key: 'note',
    width: 300,
    className: 'col-note',

    ellipsis: { tooltip: true },
    render: (row) => row.note,
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
    label: 'Название дефекта',
    render: (row) => row.name,
    isPrimary: true,
  },
  {
    key: 'category',
    label: 'Категория',
    render: renderCategory,
    isStatus: true,
  },
  {
    key: 'component',
    label: 'Компонент',
    render: renderComponent,
  },
  {
    key: 'index',
    label: 'Индекс',
    render: renderIndex,
  },
  {
    key: 'note',
    label: 'Комментарий',
    render: renderNote,
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
const statusField = computed(() => cardFields.value.find((field) => field.isStatus))
const actionsField = computed(() => cardFields.value.find((field) => field.isActions))
const infoFields = computed(() =>
  cardFields.value.filter((field) => !field.isPrimary && !field.isStatus && !field.isActions),
)

const toPlainText = (value: VNodeChild | VNodeChild[]): string => {
  if (value == null || typeof value === 'boolean') return ''
  if (Array.isArray(value))
    return value
      .map((item) => toPlainText(item as VNodeChild | VNodeChild[]))
      .filter(Boolean)
      .join(' ')
  if (typeof value === 'object' && value !== null) {
    const childContainer = value as { children?: unknown }
    const { children } = childContainer
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

const primaryTitle = (row: LoadedObjectDefect) =>
  toPlainText(primaryField.value ? primaryField.value.render(row) : '')
const statusText = (row: LoadedObjectDefect) =>
  toPlainText(statusField.value ? statusField.value.render(row) : '')
const statusClass = (row: LoadedObjectDefect) => {
  const text = statusText(row).toLowerCase()
  if (!text) return ''
  if (text.includes('устран')) return 'ok'
  if (text.includes('крит') || text.includes('авар')) return 'warn'
  return ''
}

const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: { type: Object as PropType<CardField>, required: true },
    row: { type: Object as PropType<LoadedObjectDefect>, required: true },
  },
  setup(props) {
    return () => props.field.render(props.row)
  },
})

const ActionsRenderer = defineComponent({
  name: 'ActionsRenderer',
  props: {
    row: { type: Object as PropType<LoadedObjectDefect>, required: true },
  },
  setup(props) {
    return () => renderActions(props.row)
  },
})

const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize) || 1))

watch([q, categoryFilter, componentFilter, defects], () => (pagination.page = 1))

watch(
  () => pagination.pageSize,
  () => (pagination.page = 1),
)

watchEffect(() => {
  if (pagination.page > maxPage.value) pagination.page = maxPage.value
})

function showMore() {
  if (pagination.page < maxPage.value) pagination.page += 1
}

const dialog = ref(false)
const infoOpen = ref(false)

const editing = ref<LoadedObjectDefect | null>(null)

const form = ref<FormState>({
  name: '',
  componentId: null,
  componentPvId: null,
  categoryFvId: null,
  categoryPvId: null,
  index: '',
  note: '',
})

const errors = ref<FormErrors>({})

const saving = ref(false)

const checkExistingDefectName = (name: string, excludeId?: string): LoadedObjectDefect | null => {
  const normalizedName = normalizeText(name)
  if (!normalizedName) return null
  return (
    defects.value.find(
      (defect) =>
        normalizeText(defect.name) === normalizedName &&
        String(defect.id) !== String(excludeId ?? ''),
    ) ?? null
  )
}

const nameWarning = computed(() => {
  if (!form.value.name.trim()) return ''

  const existing = checkExistingDefectName(form.value.name, editing.value?.id)

  if (!existing) return ''

  const category = existing.categoryName ? `, категория: ${existing.categoryName}` : ''
  return `Предупреждение: дефект с таким названием уже существует${category}`
})

const handleComponentChange = (nextId: string | null) => {
  form.value.componentId = nextId
  if (!nextId) {
    form.value.componentPvId = null
    return
  }
  const option = componentLookup.value.byId.get(nextId)
  form.value.componentPvId = option?.pvId ?? null
}

const handleCategoryChange = (nextFvId: string | null) => {
  form.value.categoryFvId = nextFvId
  if (!nextFvId) {
    form.value.categoryPvId = null
    return
  }
  const option = categoryLookup.value.byFvId.get(nextFvId)
  form.value.categoryPvId = option?.pvId ?? null
}

// Создание категории на лету через Meta API + рефетч снапшота
const createCategoryOption = async (name: string) => {
  const created = await createDefectCategory(name)

  // Точечный рефетч только категорий через репозиторий (rpc data/loadFvForSelect)
  const cats: DefectCategoryOption[] = await listDefectCategories()

  // Обновить кэш снапшота, чтобы вычислимые опции подтянулись реактивно
  queryClient.setQueryData(['object-defects'], (prev: ObjectDefectsSnapshot | undefined) => {
    if (!prev) return { items: [], components: [], categories: cats }
    return { ...prev, categories: cats }
  })

  const value = String(created.id)
  form.value.categoryFvId = value
  return { label: created.name, value }
}

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

function openCreate() {
  editing.value = null

  form.value = {
    name: '',
    componentId: null,
    componentPvId: null,
    categoryFvId: null,
    categoryPvId: null,
    index: '',
    note: '',
  }

  errors.value = {}

  dialog.value = true
}

function openEdit(row: LoadedObjectDefect) {
  const actual = defects.value.find((item) => String(item.id) === String(row.id)) ?? row

  editing.value = actual

  form.value = {
    name: actual.name,
    componentId: actual.componentId ?? null,
    componentPvId: actual.componentPvId ?? null,
    categoryFvId: actual.categoryFvId ?? null,
    categoryPvId: actual.categoryPvId ?? null,
    index: actual.index ?? '',
    note: actual.note ?? '',
  }

  if (form.value.componentId) handleComponentChange(form.value.componentId)
  if (form.value.categoryFvId) handleCategoryChange(form.value.categoryFvId)

  errors.value = {}

  dialog.value = true
}

async function save() {
  errors.value = {}

  const nameTrimmed = form.value.name.trim()
  if (nameTrimmed.length < 2) {
    errors.value = { name: 'Минимум 2 символа' }
    return
  }

  const duplicate = checkExistingDefectName(nameTrimmed, editing.value?.id)
  if (duplicate) {
    errors.value = { name: 'Дефект с таким названием уже существует' }
    return
  }

  const trimmedIndex = form.value.index?.trim() ?? ''
  const trimmedNote = form.value.note?.trim() ?? ''

  const payload = {
    name: nameTrimmed,
    componentId: form.value.componentId,
    componentPvId: form.value.componentPvId,
    categoryFvId: form.value.categoryFvId,
    categoryPvId: form.value.categoryPvId,
    index: trimmedIndex ? trimmedIndex : null,
    note: trimmedNote ? trimmedNote : null,
  }

  saving.value = true
  try {
    if (!editing.value) {
      await create.mutateAsync(payload)
      message.success('Дефект создан')
    } else {
      const removalResult = await deleteDefectOwnerWithProperties(editing.value.id)
      if (!removalResult.success) {
        const reason = removalResult.reason || 'Дефект используется и не может быть изменён'
        message.error(reason)

        const switchToCreate = await confirmDialog({
          title: 'Создание нового дефекта',
          content: `${reason}\nСоздать новый дефект на основе текущих данных?`,
          positiveText: 'Создать новый',
          negativeText: 'Продолжить редактирование',
        })

        if (switchToCreate) {
          editing.value = null
        }

        return
      }

      editing.value = null
      await create.mutateAsync(payload)
      message.success('Дефект обновлён')
    }

    dialog.value = false
  } catch (err) {
    const errorText = getErrorMessage(err)
    message.error(errorText || 'Не удалось сохранить дефект')
  } finally {
    saving.value = false
  }
}

const removingId = ref<string | null>(null)

const removeRow = async (id: string | number) => {
  if (removingId.value) return false

  removingId.value = String(id)

  try {
    const result = await deleteDefectOwnerWithProperties(id)

    if (!result.success) {
      const reason = result.reason || 'Не удалось удалить дефект'
      message.error(reason)
      return false
    }

    await queryClient.invalidateQueries({ queryKey: ['object-defects'] })
    message.success('Дефект удалён')
    return true
  } catch (err) {
    const errorText = getErrorMessage(err)
    message.error(errorText || 'Не удалось удалить дефект')
    return false
  } finally {
    removingId.value = null
  }
}

defineExpose({ save, editing, form, openEdit, removeRow })
</script>

<style scoped>
.table-stretch {
  width: 100%;
}

:deep(.n-data-table .n-data-table-td.col-name) {
  white-space: normal;
  word-break: break-word;
}

.object-defects-page {
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

.toolbar__select {
  min-width: 160px;
}

.tag-category {
  background: var(--s360-surface);
  color: var(--s360-accent);
}

.tag-component {
  background: var(--s360-bg);
}

.note-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  white-space: normal;
  word-break: break-word;
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

.card__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.card__title {
  margin: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
  flex: 1 1 auto;
  min-width: 0;
}

.card__category {
  flex: 0 0 auto;
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
  opacity: 1;
}

.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--s360-surface);
}

.badge.ok {
  background: #ecfdf5;
}

.badge.warn {
  background: #fff7ed;
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
    grid-template-columns: 100px 1fr;
  }
}

.show-more-bar {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.warning-text {
  color: #e6a23c;
  font-size: 12px;
  font-style: italic;
}

/* Ассистент временно отключён
.toolbar__assistant {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.toolbar__assistant :deep(.n-icon) {
  font-size: 18px;
}

.assistant {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 320px;
}

.assistant__messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px;
  background: var(--s360-surface);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assistant-message {
  position: relative;
  display: inline-flex;
  margin: 0;
  max-width: 85%;
  padding: 8px 32px 8px 12px;
  border-radius: 12px;
  background: var(--s360-bg);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  line-height: 1.35;
  word-break: break-word;
}

.assistant-message__text {
  display: block;
  white-space: pre-wrap;
}

.assistant-message__undo {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.assistant-message__undo:hover,
.assistant-message__undo:focus-visible {
  color: var(--s360-text);
}

.assistant-message__undo:focus-visible {
  outline: 2px solid var(--s360-accent);
  border-radius: 4px;
}

.assistant-message--assistant {
  align-self: flex-start;
  background: #eef2ff;
}

.assistant-message--user {
  align-self: flex-end;
  background: #d1fae5;
}

.assistant__controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assistant__picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--s360-surface);
  border-radius: 12px;
  padding: 10px 12px;
}

.assistant__picker-label {
  font-size: 13px;
  color: var(--n-text-color-3);
}

.assistant__picker-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.assistant__picker-button {
  flex: 1 1 calc(50% - 8px);
  min-width: 120px;
}

.assistant__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.assistant__actions :deep(.n-button) {
  width: 100%;
}

.assistant__voice {
  width: 100%;
  min-height: clamp(120px, 24vh, 220px);
  font-size: clamp(18px, 3.2vw, 24px);
  border-radius: 20px;
  padding: clamp(14px, 3vw, 24px);
}

.assistant__voice :deep(.n-button__content) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 2vw, 14px);
  width: 100%;
}

.assistant__voice :deep(.n-icon) {
  font-size: clamp(44px, 10vw, 80px);
}

.assistant__voice:focus-visible {
  outline: 3px solid var(--s360-accent);
  outline-offset: 4px;
}

.assistant__hint {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.assistant__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 520px) {
  .assistant-message {
    max-width: 100%;
  }
}
*/
</style>
