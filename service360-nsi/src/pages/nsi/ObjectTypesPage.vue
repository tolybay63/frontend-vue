<!-- Файл: src/pages/nsi/ObjectTypesPage.vue
     Назначение: страница CRUD для типов обслуживаемых объектов с управлением компонентами и геометрией.
     Использование: подключается в маршрутизаторе по пути /nsi/object-types. -->
<template>
  <section class="object-types-page">
    <NCard size="small" class="toolbar" content-style="padding: 10px 14px">
      <div class="toolbar__left">
        <h2 class="page-title">
          {{ t('nsi.objectTypes.title', {}, { default: 'Справочник «Типы обслуживаемых объектов»' }) }}
          <NButton
            quaternary
            circle
            size="small"
            class="page-title__info"
            :aria-label="t('nsi.objectTypes.help', {}, { default: 'Справка о справочнике' })"
            @click="infoOpen = true"
          >
            <template #icon>
              <NIcon><InformationCircleOutline /></NIcon>
            </template>
          </NButton>
        </h2>
        <div class="subtext">
          {{ t('nsi.objectTypes.subtitle', {}, { default: 'Классифицируйте обслуживаемые объекты, объединяя их в типы и выделяя компоненты' }) }}
        </div>
      </div>

      <div class="toolbar__controls">
        <NInput
          v-model:value="q"
          :placeholder="t('nsi.objectTypes.searchPlaceholder', {}, { default: 'Поиск…' })"
          clearable
          round
          style="width: 340px"
        />
        <NRadioGroup v-model:value="shapeFilter" class="geom-filter" size="small">
          <NRadioButton :value="'*'">{{ t('nsi.objectTypes.filter.all', {}, { default: 'Все' }) }}</NRadioButton>
          <NRadioButton :value="'точка'">{{ t('nsi.objectTypes.filter.point', {}, { default: 'Точка' }) }}</NRadioButton>
          <NRadioButton :value="'линия'">{{ t('nsi.objectTypes.filter.line', {}, { default: 'Линия' }) }}</NRadioButton>
          <NRadioButton :value="'полигон'">{{ t('nsi.objectTypes.filter.polygon', {}, { default: 'Полигон' }) }}</NRadioButton>
        </NRadioGroup>
        <NSelect
          v-if="isMobile"
          v-model:value="sortOrder"
          :options="sortOptions"
          size="small"
          class="toolbar__select"
          :aria-label="t('nsi.objectTypes.sortAria', {}, { default: 'Порядок сортировки' })"
        />
        <!-- Ассистент временно отключён
        <NButton quaternary class="toolbar__assistant" @click="openAssistant">
          <template #icon>
            <NIcon><ChatbubblesOutline /></NIcon>
          </template>
          Ассистент
        </NButton>
        -->
        <NButton type="primary" @click="openCreate">+ {{ t('nsi.objectTypes.add', {}, { default: 'Добавить тип' }) }}</NButton>
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
          {{ t('nsi.objectTypes.listInfo', { shown: visibleCount, total }, { default: 'Показано: ' + visibleCount + ' из ' + total }) }}
        </div>
        <article
          v-for="item in rows"
          :key="item.id"
          class="card"
          role="group"
          :aria-label="primaryTitle(item)"
        >
          <header class="card__header">
            <h4 class="card__title">{{ primaryTitle(item) }}</h4>
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
          {{ t('nsi.objectTypes.showMore', {}, { default: 'Показать ещё' }) }}
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
          :aria-label="t('nsi.objectTypes.paginationAria', {}, { default: 'Постраничная навигация по типам объектов' })"
        >
          <template #prefix>
            <span class="pagination-total">
              {{ t('nsi.objectTypes.total', { total }, { default: 'Всего: ' + total }) }}
            </span>
          </template>
        </NPagination>
      </div>
    </div>

    <NModal
      v-model:show="dialog"
      preset="card"
      :title="
        editing
          ? t('nsi.objectTypes.dialog.editTitle', {}, { default: 'Изменить тип' })
          : t('nsi.objectTypes.dialog.createTitle', {}, { default: 'Создать тип' })
      "
      style="width: 560px"
    >
      <NForm :model="form" label-width="120px">
        <NFormItem
          :label="t('nsi.objectTypes.form.name.label', {}, { default: 'Тип обслуживаемого объекта' })"
          :feedback="errors.name ?? undefined"
          :validation-status="errors.name ? 'error' : undefined"
        >
          <NInput v-model:value="form.name" />
          <div v-if="nameWarning" class="warning-text" style="margin-top: 4px">
            {{ nameWarning }}
          </div>
        </NFormItem>

        <NFormItem :label="t('nsi.objectTypes.form.geometry.label', {}, { default: 'Форма на карте' })">
          <NRadioGroup v-model:value="form.geometry">
            <NRadioButton value="точка">{{ t('nsi.objectTypes.form.geometry.point', {}, { default: 'Точка' }) }}</NRadioButton>
            <NRadioButton value="линия">{{ t('nsi.objectTypes.form.geometry.line', {}, { default: 'Линия' }) }}</NRadioButton>
            <NRadioButton value="полигон">{{ t('nsi.objectTypes.form.geometry.polygon', {}, { default: 'Полигон' }) }}</NRadioButton>
          </NRadioGroup>
        </NFormItem>

        <NFormItem :label="t('nsi.objectTypes.form.components.label', {}, { default: 'Компоненты' })">
          <div class="field-stack">
            <ComponentsSelect
              :value="form.component"
              :options="componentSelectOptions"
              :multiple="true"
              value-kind="name"
              :placeholder="t('nsi.objectTypes.form.components.placeholder', {}, { default: 'Начните вводить, чтобы найти компонент' })"
              @update:value="handleUpdateComponentValue"
              @blur="handleComponentBlur"
              @created="handleComponentCreated"
            />
            <p class="text-small">
              Выбирайте компоненты из списка. Если нужного нет, введите название (минимум 2 символа)
              и нажмите Enter для создания нового варианта.
            </p>
          </div>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="dialog = false">{{ t('nsi.objectTypes.actions.cancel', {}, { default: 'Отмена' }) }}</NButton>
          <NButton type="primary" class="btn-primary" :loading="saving" @click="save">
            {{ t('nsi.objectTypes.actions.save', {}, { default: 'Сохранить' }) }}
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
              >Подскажите, как назвать тип обслуживаемого объекта.</span
            >
          </div>
        </div>

        <div class="assistant__controls">
          <NInput
            v-model:value="assistantInput"
            type="textarea"
            rows="2"
            placeholder="Можете ответить голосом или написать текст"
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
              >Запись идёт… скажите ответ и дождитесь завершения.</span
            >
            <span v-else-if="!speechRecognitionSupported">
              Голосовой ввод недоступен в этом браузере, используйте текст.
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
      title="О справочнике"
      style="max-width: 640px; width: 92vw"
    >
      <p>
        Это список категорий инфраструктурных объектов. Он нужен, чтобы их удобнее классифицировать,
        планировать и учитывать работы.
      </p>
      <p>
        Чтобы создать категорию: задайте название, выберите форму на карте (точка, линия или
        полигон) и добавьте компоненты.
      </p>
      <p>
        Редактировать можно только те категории, на которые ещё нет ссылок в описаниях объектов и
        работ. В этом случае вы можете менять название, форму на карте и состав компонентов.
      </p>
      <template #footer>
        <NButton type="primary" @click="infoOpen = false">Понятно</NButton>
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
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import type { PropType, VNodeChild } from 'vue'

import { useQueryClient } from '@tanstack/vue-query'

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
  NPopover,
  NPopconfirm,
  NRadioButton,
  NRadioGroup,
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

import { debounce } from 'lodash-es'

import { ComponentsSelect } from '@features/components-select'
import {
  useObjectTypeMutations,
  useObjectTypesQuery,
  ensureComponentObjects,
  resolveRemoveLinkIds,
  type LinkEntry,
} from '@features/object-type-crud'
import {
  type GeometryKind,
  type GeometryPair,
  type LoadedObjectType,
  type ObjectType,
  type ObjectTypesSnapshot,
} from '@entities/object-type'
import { createComponentIfMissing, type ComponentOption } from '@entities/component'
import { getErrorMessage, normalizeText } from '@shared/lib'

const router = useRouter()
const route = useRoute()

const { t } = useI18n()

const isMobile = ref(false)
if (typeof window !== 'undefined') {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}
const sortOrder = ref<'asc' | 'desc'>('asc')
const sortOptions = [
  { label: 'А-Я', value: 'asc' },
  { label: 'Я-А', value: 'desc' },
]
// аккуратные массовые пересчёты

onMounted(() => {
  if (typeof window === 'undefined') return
  mediaQueryList = window.matchMedia('(max-width: 768px)')
  handleMediaQueryChange(mediaQueryList)
  mediaQueryList.addEventListener('change', handleMediaQueryChange)
})

// при уходе со страницы выключим всё

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

/* ---------- типы и утилиты ---------- */

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

  geometry: GeometryKind

  component: string[]
}

interface FormErrors {
  name?: string
}

const DEFAULT_GEOMETRY: GeometryKind = 'точка'

const geometryLabels: Record<GeometryKind, string> = {
  точка: 'Точка',
  линия: 'Линия',
  полигон: 'Полигон',
}

const geometryLabel = (geometry: GeometryKind | string) =>
  geometryLabels[geometry as GeometryKind] ?? String(geometry)

interface ConfirmDialogOptions {
  title?: string
  content: string
  positiveText?: string
  negativeText?: string
  html?: boolean
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

/* ---------- таблица/поиск/пагинация ---------- */

const qc = useQueryClient()
const message = useMessage()
const discreteDialog = useDialog()
const q = ref('')
const shapeFilter = ref<'*' | GeometryKind>('*')
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
const { data: snapshot, isLoading, isFetching, error } = useObjectTypesQuery()
const snapshotData = computed<ObjectTypesSnapshot | undefined>(() => snapshot.value ?? undefined)

const fetchState = computed<FetchState>(() => ({
  isLoading: isLoading.value,
  isFetching: isFetching.value,
  isError: Boolean(error.value),
  errorMessage: getErrorMessage(error.value),
}))

const tableLoading = computed(() => fetchState.value.isLoading || fetchState.value.isFetching)

const mutations = useObjectTypeMutations()
const createTypeMutation = mutations.create
const updateGeometryMutation = mutations.updateGeometry
const renameWithMigrationMutation = mutations.renameWithMigration
const updateComponentsDiffMutation = mutations.updateComponentsDiff
const removeCascadeMutation = mutations.removeCascade

/* Ассистент временно отключён

type AssistantRole = 'assistant' | 'user'
interface AssistantMessage {
  id: string
  role: AssistantRole
  content: string
  step?: AssistantStep
  historyId?: string | null
}

type AssistantStep = 'ask-name' | 'ask-geometry' | 'ask-components' | 'confirm'

const assistantOpen = ref(false)
const assistantMessagesRef = ref<HTMLDivElement | null>(null)
const assistantMessages = ref<AssistantMessage[]>([])
const assistantInput = ref('')
const assistantStep = ref<AssistantStep>('ask-name')
const assistantProcessing = ref(false)
const assistantListening = ref(false)

const assistantSession = reactive({
  name: '',
  geometry: null as GeometryKind | null,
  components: [] as string[],
})

interface AssistantHistoryEntry {
  id: string
  step: AssistantStep
  messageIds: string[]
  rollback: () => void
}

const assistantHistory = ref<AssistantHistoryEntry[]>([])

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
  const synth = window.speechSynthesis
  if (!synth) return
  synth.cancel()
}

const speakMessage = (text: string) => {
  if (!speechSynthesisSupported.value) return
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
  assistantSession.name = ''
  assistantSession.geometry = null
  assistantSession.components = []
  assistantStep.value = 'ask-name'
  assistantHistory.value = []
}

const goToStep = (step: AssistantStep, options: { repeat?: boolean; intro?: string } = {}) => {
  cancelSpeech()
  assistantStep.value = step
  let text = ''
  switch (step) {
    case 'ask-name': {
      if (options.intro) {
        text = options.intro
      } else {
        text = options.repeat
          ? 'Повторите, пожалуйста, название типа обслуживаемого объекта.'
          : 'Как назовём тип обслуживаемого объекта?'
      }
      break
    }
    case 'ask-geometry': {
      text = options.repeat
        ? 'Напомните форму на карте: точка, линия или полигон.'
        : 'Укажите форму на карте: точка, линия или полигон.'
      break
    }
    case 'ask-components': {
      const hasComponents = assistantSession.components.length > 0
      if (!hasComponents) {
        text = options.repeat
          ? 'Назовите компонент или скажите, что компонентов нет.'
          : 'Назовите компоненты по одному. Когда закончите, скажите «стоп» или «нет компонентов».'
      } else {
        const listed = assistantSession.components.join(', ')
        text = options.repeat
          ? `Нужен следующий компонент. Уже записаны: ${listed}.`
          : `Если есть ещё компоненты, назовите следующий. Сейчас записаны: ${listed}.`
      }
      break
    }
    case 'confirm': {
      const geometryTitle = geometryLabel(assistantSession.geometry ?? DEFAULT_GEOMETRY)
      const componentsText = assistantSession.components.length
        ? `компоненты: ${assistantSession.components.join(', ')}`
        : 'без компонентов'
      text = `Создать тип «${assistantSession.name.trim()}» с формой «${geometryTitle}», ${componentsText}? Скажите «да» для подтверждения или «нет», чтобы начать заново.`
      break
    }
  }
  if (!text) return null
  return pushAssistantMessage(text, { step, speak: true })
}

const startAssistantSession = (
  introMessage = 'Здравствуйте! Давайте создадим новый тип обслуживаемого объекта. Как его назовём?',
) => {
  resetAssistantConversation()
  void goToStep('ask-name', { intro: introMessage })
}

const openAssistant = () => {
  assistantOpen.value = true
}

const restartAssistant = () => {
  startAssistantSession('Начнём заново. Как назовём тип обслуживаемого объекта?')
}

const parseGeometryFromText = (value: string): GeometryKind | null => {
  const n = normalizeText(value)
  if (n.includes('точк')) return 'точка'
  if (n.includes('лини')) return 'линия'
  if (n.includes('полигон') || n.includes('многоугол')) return 'полигон'
  return null
}

const parseComponentsFromText = (value: string): string[] => {
  const replaced = value
    .replace(/\bзапятая\b/giu, ',')
    .replace(/\bточка\b/giu, ',')
    .replace(/\bи так далее\b/giu, '')
  return replaced
    .split(/[,;]|\bи\b/iu)
    .map((item) => item.trim())
    .filter(Boolean)
}

const isAffirmative = (value: string) => {
  const n = normalizeText(value)
  return ['да', 'подтверждаю', 'создать', 'готово', 'ок', 'окей'].some((word) => n.includes(word))
}

const isNegative = (value: string) => {
  const n = normalizeText(value)
  return ['нет', 'не нужно', 'отмена', 'стоп'].some((word) => n.includes(word))
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
      { id: historyId, step: currentStep, messageIds: [...messageIds], rollback },
    ]
  }

  switch (currentStep) {
    case 'ask-name': {
      if (text.length < 2) {
        pushAssistantMessage('Название должно содержать минимум два символа. Попробуйте ещё раз.')
        void goToStep('ask-name', { repeat: true })
        return
      }
      assistantSession.name = text
      assistantSession.geometry = null
      assistantSession.components = []

      const maybeExisting = checkExistingTypeName(text)
      if (maybeExisting) {
        pushAssistantMessage(
          `Тип с таким названием уже существует (форма: ${geometryLabel(maybeExisting.geometry)}). Если хотите создать новый вариант, просто продолжим.`,
        )
      }
      const nextId = goToStep('ask-geometry')
      if (nextId) messageIds.push(nextId)
      addHistoryEntry(() => {
        assistantSession.name = ''
        assistantSession.geometry = null
        assistantSession.components = []
        assistantStep.value = 'ask-name'
      })
      break
    }
    case 'ask-geometry': {
      const geometry = parseGeometryFromText(text)
      if (!geometry) {
        pushAssistantMessage(
          'Не удалось распознать форму на карте. Скажите «точка», «линия» или «полигон».',
        )
        void goToStep('ask-geometry', { repeat: true })
        return
      }
      assistantSession.geometry = geometry
      const nextId = goToStep('ask-components')
      if (nextId) messageIds.push(nextId)
      addHistoryEntry(() => {
        assistantSession.geometry = null
        assistantStep.value = 'ask-geometry'
      })
      break
    }
    case 'ask-components': {
      const normalized = normalizeText(text)
      const stopPhrases = [
        'стоп',
        'нет',
        'нет компонент',
        'нет компонентов',
        'без компонент',
        'без компонентов',
        'всё',
        'все',
        'готово',
        'хватит',
      ]
      const isStop =
        stopPhrases.some(
          (phrase) =>
            normalized === phrase ||
            normalized.startsWith(`${phrase} `) ||
            normalized.endsWith(` ${phrase}`),
        ) || ['без компонент', 'без компонентов'].some((phrase) => normalized.includes(phrase))

      if (isStop) {
        const nextId = goToStep('confirm')
        if (nextId) messageIds.push(nextId)
        addHistoryEntry(() => {
          assistantStep.value = 'ask-components'
        })
        return
      }

      const componentsRaw = parseComponentsFromText(text)
      if (!componentsRaw.length) {
        pushAssistantMessage('Не удалось выделить компоненты. Попробуйте назвать их по одному.')
        void goToStep('ask-components', { repeat: true })
        return
      }

      const previous = [...assistantSession.components]
      const existing = new Set(previous.map((name) => normalizeText(name)))
      const added: string[] = []
      for (const candidate of componentsRaw) {
        const trimmed = candidate.trim()
        if (!trimmed) continue
        const norm = normalizeText(trimmed)
        if (existing.has(norm)) continue
        existing.add(norm)
        added.push(trimmed)
      }

      if (!added.length) {
        pushAssistantMessage(
          'Эти компоненты уже записаны. Назовите другой вариант или скажите «стоп».',
        )
        void goToStep('ask-components', { repeat: true })
        return
      }

      assistantSession.components = [...previous, ...added]
      const summary =
        added.length === 1
          ? `Добавила компонент: ${added[0]}.`
          : `Добавила компоненты: ${added.join(', ')}.`
      const summaryId = pushAssistantMessage(summary)
      messageIds.push(summaryId)
      const nextId = goToStep('ask-components', { repeat: true })
      if (nextId) messageIds.push(nextId)
      addHistoryEntry(() => {
        assistantSession.components = previous
        assistantStep.value = 'ask-components'
      })
      break
    }
    case 'confirm': {
      if (isAffirmative(text)) {
        void createTypeViaAssistant()
        return
      }
      if (isNegative(text)) {
        startAssistantSession('Хорошо, начнём заново. Как назовём тип обслуживаемого объекта?')
        return
      }
      pushAssistantMessage('Ответьте, пожалуйста, «да» или «нет».')
      void goToStep('confirm')
      break
    }
    default:
      break
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
      if (transcript) {
        handleAssistantResponse(transcript)
      }
    }
  }

  instance.onerror = (event: AssistantSpeechRecognitionErrorEvent) => {
    if (event.error !== 'aborted') {
      message.error('Не удалось распознать речь')
    }
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

const createTypeViaAssistant = async () => {
  if (assistantProcessing.value) return

  const nameTrimmed = assistantSession.name.trim()
  if (nameTrimmed.length < 2) {
    pushAssistantMessage('Название слишком короткое. Назовите тип ещё раз.')
    assistantStep.value = 'ask-name'
    return
  }

  const geometry = assistantSession.geometry ?? DEFAULT_GEOMETRY
  const componentNames = Array.from(
    new Set(assistantSession.components.map((item) => item.trim()).filter(Boolean)),
  )

  const existingType = checkExistingTypeName(nameTrimmed)
  if (
    existingType &&
    isTypeCompletelyIdentical(
      { name: nameTrimmed, geometry, component: componentNames },
      existingType,
    )
  ) {
    startAssistantSession(
      'Полностью идентичный тип уже существует. Давайте попробуем другое название?',
    )
    return
  }

  const geometryPair = getGeometryPair(geometry)
  if (geometryPair.fv == null && geometryPair.pv == null) {
    pushAssistantMessage('Не удалось определить форму на карте. Попробуйте выбрать другую форму.')
    assistantStep.value = 'ask-geometry'
    return
  }

  assistantProcessing.value = true
  try {
    await createTypeMutation.mutateAsync({
      name: nameTrimmed,
      geometry,
      geometryPair,
      componentNames,
    })
    pushAssistantMessage(
      `Готово! Тип «${nameTrimmed}» создан. Если нужен ещё один, просто скажите его название.`,
      { speak: true },
    )
    assistantSession.name = ''
    assistantSession.geometry = null
    assistantSession.components = []
    void goToStep('ask-name', { intro: 'Если хотите создать ещё один тип, скажите его название.' })
  } catch (error) {
    console.error(error)
    pushAssistantMessage('Не получилось создать тип. Попробуйте ещё раз.')
  } finally {
    assistantProcessing.value = false
  }
}

const canUndoMessage = (message: AssistantMessage) => {
  if (message.role !== 'user' || !message.historyId) return false
  if (assistantProcessing.value) return false
  const history = assistantHistory.value
  if (!history.length) return false
  const lastEntry = history[history.length - 1]
  return lastEntry.id === message.historyId
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

watch(
  () => fetchState.value.errorMessage,
  (m, p) => {
    if (m && m !== p) message.error(m)
  },
)

const objectTypes = computed(() => snapshotData.value?.items ?? [])
const componentsByType = computed(() => snapshotData.value?.componentsByType ?? {})
const allComponents = computed(() => snapshotData.value?.allComponents ?? [])
const createdComponents = ref<ComponentOption[]>([])
const removingId = ref<string | null>(null)
const allComponentOptions = computed<ComponentOption[]>(() => {
  const byKey = new Map<string, ComponentOption>()
  for (const option of allComponents.value) byKey.set(normalizeText(option.name), option)
  for (const option of createdComponents.value) byKey.set(normalizeText(option.name), option)
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
})

const componentSelectOptions = computed(() =>
  allComponentOptions.value.map((option) => ({ label: option.name, value: option.name })),
)

const geometryPairByKind = computed(() => snapshotData.value?.geometryPairByKind ?? {})
const linksByType = computed<Record<string, LinkEntry[]>>(
  () => snapshotData.value?.linksByType ?? {},
)
const componentMapByName = computed(() => {
  const map = new Map<string, ComponentOption>()
  for (const option of allComponentOptions.value) map.set(normalizeText(option.name), option)
  return map
})

const getGeometryPair = (kind: GeometryKind): GeometryPair =>
  geometryPairByKind.value[kind] ?? { fv: null, pv: null }

const toComponentNames = (value: string[] | string | null): string[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) return [value]
  return []
}

const handleUpdateComponentValue = (nextValue: string[] | string | null) => {
  form.value.component = toComponentNames(nextValue)
}

const handleComponentCreated = async (component: { id: string; cls: number; name: string }) => {
  if (!createdComponents.value.some((item) => item.id === component.id)) {
    createdComponents.value = [
      ...createdComponents.value,
      { id: component.id, name: component.name },
    ]
  }
  if (!form.value.component.includes(component.name)) {
    form.value.component = [...form.value.component, component.name]
  }
  await qc.invalidateQueries({ queryKey: ['object-types'] })
}

const filteredRows = computed(() => {
  const search = q.value.trim().toLowerCase()
  const gf = shapeFilter.value
  return objectTypes.value.filter((item) => {
    const geometryOk = gf === '*' ? true : item.geometry === gf
    if (!search) return geometryOk
    const hit = Object.values(item).some(
      (v) => v != null && String(v).toLowerCase().includes(search),
    )
    return geometryOk && hit
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
const rowKey = (row: ObjectType) => row.id

const MAX_CHIPS = 4

function renderComponents(row: ObjectType): VNodeChild {
  const list = Array.isArray(row.component) ? row.component : []
  const chips = list.slice(0, MAX_CHIPS)
  const rest = Math.max(0, list.length - MAX_CHIPS)

  const chipsNodes = chips.map((name) =>
    h(
      NTag,
      { size: 'small', bordered: true, round: true, class: 'chip', key: name },
      { default: () => name },
    ),
  )

  const more =
    rest > 0
      ? h(
          NPopover,
          { trigger: 'hover' },
          {
            trigger: () =>
              h(NTag, { size: 'small', round: true, class: 'chip' }, { default: () => `+${rest}` }),
            default: () =>
              h(
                'div',
                { class: 'popover-list' },
                list.map((n) => h('div', { class: 'popover-item', key: n }, n)),
              ),
          },
        )
      : null

  return h('div', { class: 'chips-row' }, more ? [...chipsNodes, more] : chipsNodes)
}

const renderActions = (row: ObjectType): VNodeChild => {
  const editBtn = h(
    NButton,
    {
      quaternary: true,
      circle: true,
      size: 'small',
      onClick: () => openEdit(row),
      'aria-label': 'Изменить тип',
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
            'aria-label': 'Удалить тип',
          },
          { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) },
        ),
      default: () => 'Удалить тип и все связи?',
    },
  )

  return h('div', { class: 'table-actions' }, [editBtn, delBtn])
}

const columns = computed<DataTableColumn<ObjectType>[]>(() => [
  {
    title: 'Типы объектов',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name, 'ru'),
    width: 400,
    ellipsis: { tooltip: true },
    className: 'col-name',
    render: (row) => row.name,
  },
  {
    title: 'Форма на карте',
    key: 'geometry',
    width: 150,
    align: 'center',
    render: (row) =>
      h(
        NTag,
        { size: 'small', bordered: false, type: 'info' },
        { default: () => geometryLabel(row.geometry) },
      ),
  },
  {
    title: 'Компоненты',
    key: 'component',
    className: 'col-components',
    minWidth: 420,
    align: 'left',
    render: renderComponents,
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 120,
    align: 'center',
    render: renderActions,
  },
])

interface CardField {
  key: string
  label: string
  render: (row: ObjectType) => VNodeChild
  isPrimary?: boolean
  isStatus?: boolean
  isActions?: boolean
}

const cardFields = computed<CardField[]>(() => [
  {
    key: 'name',
    label: 'Типы объектов',
    render: (row) => row.name,
    isPrimary: true,
  },
  {
    key: 'geometry',
    label: 'Форма на карте',
    render: (row) => geometryLabel(row.geometry),
    isStatus: true,
  },
  {
    key: 'component',
    label: 'Компоненты',
    render: renderComponents,
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

const primaryTitle = (row: ObjectType) =>
  toPlainText(primaryField.value ? primaryField.value.render(row) : '')
const statusText = (row: ObjectType) =>
  toPlainText(statusField.value ? statusField.value.render(row) : '')
const statusClass = (row: ObjectType) => {
  const text = statusText(row).toLowerCase()
  if (!text) return ''
  if (text.includes('точ')) return 'ok'
  if (text.includes('полиг')) return 'ok'
  if (text.includes('лин')) return 'warn'
  return ''
}

const FieldRenderer = defineComponent({
  name: 'FieldRenderer',
  props: {
    field: { type: Object as PropType<CardField>, required: true },
    row: { type: Object as PropType<ObjectType>, required: true },
  },
  setup(props) {
    return () => props.field.render(props.row)
  },
})

const ActionsRenderer = defineComponent({
  name: 'ActionsRenderer',
  props: {
    row: { type: Object as PropType<ObjectType>, required: true },
  },
  setup(props) {
    return () => renderActions(props.row)
  },
})

// TODO: подключить виртуализацию (VirtualList), если потребуется отображать более 100 карточек на мобильных устройствах

const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pagination.pageSize) || 1))

watch([q, objectTypes], () => (pagination.page = 1))

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

/* ---------- CRUD формы ---------- */

const dialog = ref(false)
const infoOpen = ref(false)

const editing = ref<LoadedObjectType | null>(null)

const form = ref<FormState>({ name: '', geometry: DEFAULT_GEOMETRY, component: [] })

const errors = ref<FormErrors>({})

const saving = ref(false)

const checkExistingTypeName = (name: string, excludeId?: string): ObjectType | null => {
  const normalizedName = normalizeText(name)

  return (
    objectTypes.value.find((t) => normalizeText(t.name) === normalizedName && t.id !== excludeId) ??
    null
  )
}

const checkExistingComponentName = (
  name: string,
): { component: ComponentOption; usedInTypes: ObjectType[] } | null => {
  const n = normalizeText(name)

  if (!n) return null

  const existing = componentMapByName.value.get(n)

  if (!existing) return null

  const usedInTypes = objectTypes.value.filter((t) =>
    (componentsByType.value[t.id] ?? []).some((c) => normalizeText(c.name) === n),
  )

  return { component: existing, usedInTypes }
}

const isTypeCompletelyIdentical = (
  next: { name: string; geometry: GeometryKind; component: string[] },

  prev: ObjectType,
) => {
  const a = [...next.component].sort()

  const b = [...prev.component].sort()

  return (
    normalizeText(next.name) === normalizeText(prev.name) &&
    next.geometry === prev.geometry &&
    a.length === b.length &&
    a.every((v, i) => normalizeText(v) === normalizeText(b[i]))
  )
}

const nameWarning = computed(() => {
  if (!form.value.name.trim()) return ''

  const existing = checkExistingTypeName(form.value.name, editing.value?.id)

  return existing
    ? `Предупреждение: тип с таким названием уже существует (${existing.geometry})`
    : ''
})

const checkComponent = (componentName: string) => {
  const info = checkExistingComponentName(componentName)

  if (info && info.usedInTypes.length > 0)
    message.warning(`Компонент "${componentName}" уже используется в других типах объектов`)
}

const debouncedCheckComponent = debounce(checkComponent, 500)

const handleComponentBlur = (e: FocusEvent) => {
  const target = e.target as HTMLInputElement | null

  if (target) debouncedCheckComponent(target.value)
}

function openCreate() {
  editing.value = null

  form.value = { name: '', geometry: DEFAULT_GEOMETRY, component: [] }
  createdComponents.value = []

  errors.value = {}

  dialog.value = true
}

function openEdit(row: ObjectType) {
  editing.value = row

  form.value = { name: row.name, geometry: row.geometry, component: [...row.component] }
  createdComponents.value = []

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

  const compNames = Array.from(new Set(form.value.component.map((v) => v.trim()).filter(Boolean)))
  const isEditing = Boolean(editing.value)
  const current = editing.value
  const nameChanged = isEditing && normalizeText(current!.name) !== normalizeText(nameTrimmed)
  const geometryChanged = isEditing && current!.geometry !== form.value.geometry

  if (!isEditing || nameChanged) {
    const existingType = checkExistingTypeName(nameTrimmed, current?.id)
    if (existingType) {
      const next = { name: nameTrimmed, geometry: form.value.geometry, component: compNames }
      if (isTypeCompletelyIdentical(next, existingType)) {
        message.error('Нельзя создать полностью идентичный тип')
        return
      }

      const ok = await confirmDialog({
        title: 'Тип с таким названием уже есть',
        content:
          `Тип "${nameTrimmed}" уже существует:<br><br>` +
          `- Форма на карте: ${existingType.geometry}<br>` +
          `- Компоненты: ${existingType.component.join(', ') || 'нет'}<br><br>` +
          'Вы уверены, что хотите продолжить?',
        positiveText: 'Продолжить',
        negativeText: 'Отмена',
        html: true,
      })

      if (!ok) return
    }
  }

  for (const cn of compNames) {
    const info = checkExistingComponentName(cn)
    if (info && info.usedInTypes.length > 0) {
      const typeNames = info.usedInTypes.map((t) => t.name).join(', ')
      const ok = await confirmDialog({
        title: 'Компонент уже используется',
        content: `Компонент "${cn}" уже используется в: ${typeNames}.<br>Продолжить?`,
        positiveText: 'Продолжить',
        negativeText: 'Отмена',
        html: true,
      })
      if (!ok) return
    }
  }

  const missing = compNames.filter((n) => !componentMapByName.value.has(normalizeText(n)))
  if (missing.length > 0) {
    message.warning(`Некоторые компоненты будут созданы автоматически: ${missing.join(', ')}`)
  }

  const geometryPair = getGeometryPair(form.value.geometry)
  if (geometryPair.fv == null && geometryPair.pv == null) {
    message.error('Не найдены идентификаторы Формы на карте')
    return
  }

  saving.value = true
  try {
    if (!isEditing) {
      await createTypeMutation.mutateAsync({
        name: nameTrimmed,
        geometry: form.value.geometry,
        geometryPair,
        componentNames: compNames,
      })
      message.success('Создано')
    } else if (nameChanged) {
      const typeId = Number(current!.id)
      const typeCls = Number(current!.cls)
      if (!Number.isFinite(typeId) || !Number.isFinite(typeCls)) {
        throw new Error('Некорректные идентификаторы текущего типа')
      }
      const links = linksByType.value[String(current!.id)] ?? []
      const oldComponentIds = links
        .map((link) => Number(link.compId))
        .filter((id): id is number => Number.isFinite(id))

      await renameWithMigrationMutation.mutateAsync({
        oldId: typeId,
        oldCls: typeCls,
        oldName: current!.name,
        oldComponentIds,
        newName: nameTrimmed,
        geometryPair,
        componentNames: compNames,
      })
      message.success('Переименовано')
    } else {
      if (geometryChanged) {
        await updateGeometryMutation.mutateAsync({
          id: Number(current!.id),
          cls: Number(current!.cls),
          name: current!.name,
          geometryPair,
          idShape: current!.idShape,
          number: current!.number,
        })
      }

      const prevSet = new Set((current!.component ?? []).map(normalizeText))
      const nextSet = new Set(compNames.map(normalizeText))
      const removed = (current!.component ?? []).filter((name) => !nextSet.has(normalizeText(name)))
      const added = compNames.filter((name) => !prevSet.has(normalizeText(name)))

      if (removed.length || added.length) {
        const addComponents = added.length
          ? await ensureComponentObjects(added, createComponentIfMissing)
          : []
        if (addComponents.length) {
          const existingIds = new Set(allComponentOptions.value.map((option) => String(option.id)))
          const createdOptions = addComponents
            .filter((component) => !existingIds.has(String(component.id)))
            .map<ComponentOption>((component) => ({
              id: String(component.id),
              name: component.name,
            }))
          if (createdOptions.length) {
            createdComponents.value = [...createdComponents.value, ...createdOptions]
          }
        }
        const removeLinkIds = resolveRemoveLinkIds(
          String(current!.id),
          linksByType.value,
          allComponentOptions.value,
          removed,
        )
        await updateComponentsDiffMutation.mutateAsync({
          typeId: Number(current!.id),
          typeCls: Number(current!.cls),
          typeName: current!.name,
          add: addComponents,
          removeLinkIds,
        })
      }

      if (!geometryChanged && !removed.length && !added.length) {
        message.info('Изменений не выявлено')
      } else {
        message.success('Изменено')
      }
    }

    await qc.invalidateQueries({ queryKey: ['object-types'] })
    dialog.value = false
  } catch (error) {
    console.error(error)
    message.error('Не удалось сохранить')
  } finally {
    saving.value = false
  }
}

const removeRow = async (id: string | number) => {
  const typeIdStr = String(id)
  if (removingId.value) return

  const confirmed = await confirmDialog({
    title: 'Подтверждение',
    content: 'Удалить тип и все его связи с компонентами?',
    positiveText: 'Удалить',
    negativeText: 'Отмена',
  })
  if (!confirmed) return

  removingId.value = typeIdStr

  try {
    const typeIdNum = Number(typeIdStr)
    if (!Number.isFinite(typeIdNum)) throw new Error('Некорректный идентификатор типа')
    await removeCascadeMutation.mutateAsync({ typeId: typeIdNum })
    message.success('Тип удалён')
  } catch (e) {
    console.error(e)
    message.error('Не удалось удалить тип')
  } finally {
    removingId.value = null
  }
}
</script>

<style scoped>
.table-stretch {
  width: 100%;
}

:deep(.n-data-table .n-data-table-td.col-name) {
  white-space: normal;
  word-break: break-word;
}

.object-types-page {
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

:deep(.n-data-table .n-data-table-td.col-components) {
  height: auto; /* снимаем глобальный height:24px */
  line-height: normal;
  padding-top: 0; /* при желании подправьте отступы */
  padding-bottom: 0;
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

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 12px;
  gap: 16px;
}

:deep(.n-card.toolbar) {
  max-width: 100%;
  box-sizing: border-box;
}

.toolbar__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toolbar__controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 20px;
}

.page-title__info {
  padding: 0;
  background: var(--s360-surface);
  color: var(--n-text-color);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.page-title__info :deep(.n-button__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
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

.geom-filter :deep(.n-radio-button) {
  min-width: 64px;
}

/* Компоненты — чипсы */
.chips-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  overflow: hidden;
}

.chip {
  background: var(--s360-bg);
}

.popover-list {
  max-width: 280px;
  max-height: 240px;
  overflow: auto;
  padding: 4px 0;
}

.popover-item {
  padding: 2px 8px;
}

/* Действия — показывать по hover */
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

/* Toolbar адаптив */
@media (max-width: 900px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .toolbar__controls {
    justify-content: flex-start;
  }
}

/* Pagination layout */
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
  grid-template-columns: 110px 1fr;
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

.cards .chips-row {
  flex-wrap: wrap;
  min-width: 0;
  overflow: visible;
}

.cards .chip {
  max-width: 100%;
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

@media (max-width: 360px) {
  .card__grid {
    grid-template-columns: 96px 1fr;
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
.field-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
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
  text-align: right;
}

.assistant__controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
*/
</style>
