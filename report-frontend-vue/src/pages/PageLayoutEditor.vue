<template>
  <section class="page">
    <header class="page__header">
      <div>
        <h1>{{ isNew ? 'Новая страница' : 'Редактирование страницы' }}</h1>
        <p class="muted">
          Задайте название, выберите фильтры и макет, а затем добавьте контейнеры с нужными представлениями.
        </p>
      </div>
      <div class="header-actions">
        <button class="btn-outline" type="button" @click="goBack">Отмена</button>
        <button class="btn-primary" type="button" :disabled="saving" @click="save">
          {{ saving ? 'Сохраняем...' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="muted">Загружаем страницу...</div>
    <p v-else-if="loadError" class="error-text">{{ loadError }}</p>
    <form v-else class="form" @submit.prevent="save">
      <label class="field">
        <span>Пункт меню</span>
        <input v-model="draft.menuTitle" placeholder="Например: Мониторинг пути" required />
      </label>
      <label class="field">
        <span>Заголовок страницы</span>
        <input v-model="draft.pageTitle" placeholder="Заголовок страницы" required />
      </label>
      <label class="field">
        <span>Описание</span>
        <textarea v-model="draft.description" rows="3" placeholder="Короткое описание страницы"></textarea>
        <p v-if="descriptionWarningVisible" class="warning-text">
          Изменение описания перезапишет скрытые настройки макета. Проверьте макет и вкладки после сохранения.
        </p>
      </label>

      <div class="field">
        <span>Публичная страница</span>
        <n-radio-group
          v-model:value="draft.fvPrivate"
          :disabled="privacyLoading || !privacyOptions.length"
        >
          <n-radio-button
            v-for="option in privacyOptions"
            :key="option.id || option.fv"
            :value="option.fv"
          >
            {{ option.label }}
          </n-radio-button>
        </n-radio-group>
        <p v-if="privacyLoading" class="muted">Загружаем варианты…</p>
        <p v-else-if="!privacyOptions.length" class="muted">
          Нет данных для настройки публичности.
        </p>
        <p v-if="privacyError" class="error-text">{{ privacyError }}</p>
      </div>

      <div v-if="isPrivateSelection" class="field">
        <span>Пользователи с доступом</span>
        <n-select
          v-model:value="selectedUserIds"
          multiple
          filterable
          clearable
          size="large"
          :options="pageUserOptions"
          :loading="pageUsersLoading"
          placeholder="Выберите пользователей"
        />
        <p v-if="pageUsersLoading" class="muted">Загружаем пользователей…</p>
        <p v-else-if="!pageUsers.length" class="muted">Нет доступных пользователей.</p>
        <p class="muted">Только выбранные сотрудники смогут открыть страницу.</p>
        <p v-if="pageUsersError" class="error-text">{{ pageUsersError }}</p>
      </div>

      <fieldset class="field">
        <legend>Глобальные фильтры</legend>
        <div v-if="availableFilterOptions.length" class="filter-multiselect">
          <n-select
            v-model:value="draft.filters"
            multiple
            filterable
            clearable
            size="large"
            placeholder="Выберите фильтры"
            :options="globalFilterSelectOptions"
          />
          <p class="muted">Только поля, общие для всех контейнеров, доступны для выбора.</p>
        </div>
        <p v-else class="muted">
          Добавьте контейнеры с общими полями, чтобы выбрать фильтры страницы.
        </p>
      </fieldset>

      <label class="field">
        <span>Макет</span>
        <select v-model="draft.layout.preset">
          <option disabled value="">Выберите макет</option>
          <option v-for="preset in layoutOptions" :key="preset.value" :value="preset.value">
            {{ preset.label }}
          </option>
        </select>
      </label>
      <div class="layout-options">
        <label>
          <span>Вкладки</span>
          <input
            v-model.number="draft.layout.settings.tabs"
            type="number"
            min="1"
            :max="MAX_TABS"
          />
        </label>
      </div>
      <div class="tab-names">
        <label v-for="tab in tabLabelEntries" :key="`tab-name-${tab.value}`">
          <span>Название вкладки {{ tab.value }}</span>
          <input
            v-model="draft.layout.settings.tabNames[tab.value - 1]"
            :placeholder="tab.placeholder"
          />
        </label>
      </div>

      <section class="containers">
        <header>
          <h2>Контейнеры</h2>
          <div class="containers__actions">
            <button class="btn-link" type="button" :disabled="templatesLoading" @click="refreshTemplates">
              {{ templatesLoading ? 'Обновляем…' : 'Обновить представления' }}
            </button>
            <button class="btn-outline btn-sm" type="button" @click="addContainer">
              Добавить контейнер
            </button>
          </div>
        </header>
        <p v-if="showTemplatesLoading" class="muted">Загружаем представления...</p>
        <p v-else-if="templatesError" class="error-text">{{ templatesError }}</p>
        <p v-else-if="!templates.length" class="muted">
          Нет доступных представлений. Создайте их в разделе «Представления».
        </p>
        <div v-if="!draft.layout.containers.length" class="muted">
          Контейнеры не добавлены.
        </div>
        <article v-for="container in draft.layout.containers" :key="container.id" class="container-card">
          <div class="container-card__header">
            <input v-model="container.title" placeholder="Название контейнера" />
            <button class="btn-danger btn-sm" type="button" @click="removeContainer(container.id)">
              Удалить
            </button>
          </div>
          <div class="container-card__body">
            <label>
              <span>Представление</span>
              <select
                v-model="container.templateId"
                :disabled="templatesLoading && !templates.length"
              >
                <option disabled value="">
                  {{
                    templatesLoading
                      ? 'Загружаем представления'
                      : 'Выберите представление'
                  }}
                </option>
                <option v-for="template in templates" :key="template.id" :value="template.id">
                  {{ template.name }}
                </option>
              </select>
            </label>
            <label>
              <span>Ширина</span>
              <select v-model="container.widthOption">
                <option disabled value="">Выберите ширину</option>
                <option v-for="option in widthOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label>
              <span>Высота</span>
              <select v-model="container.heightOption">
                <option disabled value="">Выберите высоту</option>
                <option v-for="option in heightOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label>
              <span>Вкладка</span>
              <select v-model.number="container.tabIndex">
                <option v-for="option in tabSelectOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>
          <p v-if="container.templateId" class="muted">
            {{ templateMeta(container.templateId)?.description || 'Без описания' }}
          </p>
          <p v-else class="muted">
            Выберите представление, чтобы связать контейнер с источником данных.
          </p>
          <p v-if="templateMeta(container.templateId)?.missingConfig" class="warning-text">
            У этого представления нет сохранённой конфигурации. Свяжите его с нужным набором полей.
          </p>
          <p v-if="templateMeta(container.templateId)?.missingSource" class="warning-text">
            У представления отсутствует источник данных. Виджет не сможет загрузить данные, пока источник не будет указан.
          </p>
        </article>
      </section>
    </form>
  </section>
</template>

<script setup>
import { computed, reactive, ref, onMounted, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePageBuilderStore, resolveCommonContainerFieldKeys } from '@/shared/stores/pageBuilder'
import { useFieldDictionaryStore } from '@/shared/stores/fieldDictionary'
import { useAuthStore } from '@/shared/stores/auth'
import {
  humanizeKey,
  parseDatePartKey,
  formatDatePartFieldLabel,
} from '@/shared/lib/pivotUtils'
import { defaultLayoutSettings } from '@/shared/lib/layoutMeta'
import { canUserAccessPage, readStoredUserMeta, resolveUserMeta } from '@/shared/lib/pageAccess'
import { NRadioGroup, NRadioButton, NSelect } from 'naive-ui'

const router = useRouter()
const route = useRoute()
const store = usePageBuilderStore()
const fieldDictionaryStore = useFieldDictionaryStore()
const authStore = useAuthStore()

const pageId = computed(() => route.params.pageId)
const isNew = computed(() => pageId.value === 'new' || !pageId.value)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const deletedContainerIds = ref([])
const originalDescription = ref('')
const descriptionMetaFlags = ref({ hasSettingsMarker: false, hasContainerMarker: false })

const draft = reactive({
  id: null,
  remoteId: null,
  remoteMeta: {},
  menuTitle: '',
  pageTitle: '',
  description: '',
  filters: [],
  fvPrivate: null,
  pvPrivate: null,
  idPrivate: null,
  objUserMulti: [],
  layout: {
    preset: '',
    containers: [],
    settings: defaultLayoutSettings(),
    containerTabs: {},
  },
})

watchEffect(() => {
  if (!draft.layout.settings) {
    draft.layout.settings = defaultLayoutSettings()
  }
  if (!Array.isArray(draft.layout.settings.tabNames)) {
    draft.layout.settings.tabNames = [...defaultLayoutSettings().tabNames]
  }
})

const templates = computed(() => store.templates)
const templatesLoading = computed(() => store.templatesLoading)
const templatesError = computed(() => store.templatesError)
const showTemplatesLoading = computed(() => templatesLoading.value && !templates.value.length)
const layoutOptions = computed(() => store.layoutOptions)
const widthOptions = computed(() => store.widthOptions)
const heightOptions = computed(() => store.heightOptions)
const privacyOptions = computed(() => store.privacyOptions || [])
const privacyLoading = computed(() => store.privacyLoading)
const privacyError = computed(() => store.privacyError)
const pageUsers = computed(() => store.pageUsers || [])
const pageUsersLoading = computed(() => store.pageUsersLoading)
const pageUsersError = computed(() => store.pageUsersError)
const dictionaryLabels = computed(() => fieldDictionaryStore.labelMap || {})
const dictionaryLabelsLower = computed(() => fieldDictionaryStore.labelMapLower || {})
const commonFilterKeys = computed(() =>
  resolveCommonContainerFieldKeys(draft.layout.containers, templates.value),
)
const availableFilterOptions = computed(() =>
  commonFilterKeys.value.map((key) => ({
    key,
    label: resolveFieldLabel(key),
  })),
)
const globalFilterSelectOptions = computed(() =>
  availableFilterOptions.value.map((filter) => ({
    value: filter.key,
    label: filter.label,
  })),
)
const layoutSettings = computed(() => {
  const settings = draft.layout.settings || defaultLayoutSettings()
  const tabNames = Array.isArray(settings.tabNames)
    ? settings.tabNames
    : [...defaultLayoutSettings().tabNames]
  return {
    ...settings,
    tabNames,
  }
})
const tabLabelEntries = computed(() => {
  const count = Number(layoutSettings.value.tabs) || 1
  const names = Array.isArray(layoutSettings.value.tabNames) ? layoutSettings.value.tabNames : []
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const fallback = `Вкладка ${index + 1}`
    const stored = typeof names[index] === 'string' ? names[index].trim() : ''
    return {
      value: index + 1,
      label: stored || fallback,
      placeholder: fallback,
    }
  })
})
const tabSelectOptions = computed(() =>
  tabLabelEntries.value.map((entry) => ({
    value: entry.value,
    label: entry.label,
  })),
)
const descriptionHasHiddenMeta = computed(
  () => descriptionMetaFlags.value.hasSettingsMarker || descriptionMetaFlags.value.hasContainerMarker,
)
const descriptionWarningVisible = computed(
  () => descriptionHasHiddenMeta.value && draft.description !== originalDescription.value,
)
const selectedPrivacyOption = computed(() =>
  privacyOptions.value.find((option) => option.fv === draft.fvPrivate) || null,
)
const isPrivateSelection = computed(() => Boolean(selectedPrivacyOption.value?.isPrivate))
const pageUsersMap = computed(() => {
  const map = new Map()
  pageUsers.value.forEach((user) => {
    if (user?.id != null) {
      map.set(user.id, user)
    }
  })
  return map
})
const pageUserOptions = computed(() =>
  pageUsers.value.map((user) => ({
    value: user.id,
    label: user.fullName || user.name,
  })),
)
const selectedUserIds = computed({
  get() {
    return draft.objUserMulti
      .map((entry) => entry?.id)
      .filter((value) => value != null)
  },
  set(values) {
    const normalized = Array.isArray(values) ? values : []
    const uniqueIds = [
      ...new Set(
        normalized
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value)),
      ),
    ]
    draft.objUserMulti = uniqueIds
      .map((id) => {
        const option = pageUsersMap.value.get(id)
        if (!option) return null
        return {
          id: option.id,
          cls: option.cls,
          name: option.name,
          fullName: option.fullName,
          pv: option.pv,
        }
      })
      .filter(Boolean)
  },
})
const currentUserMeta = computed(() => {
  const personal = resolveUserMeta(authStore.personalInfo)
  if (personal) return personal
  return readStoredUserMeta()
})

const MAX_COLUMNS = 6
const MAX_TABS = 12

function clampColumns(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 1
  return Math.min(MAX_COLUMNS, Math.max(1, Math.trunc(numeric)))
}

function clampTabs(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 1
  return Math.min(MAX_TABS, Math.max(1, Math.trunc(numeric)))
}

function ensureLayoutSettings() {
  if (!draft.layout.settings) {
    draft.layout.settings = defaultLayoutSettings()
  }
  if (!Array.isArray(draft.layout.settings.tabNames)) {
    draft.layout.settings.tabNames = [...defaultLayoutSettings().tabNames]
  }
}

function syncTabNames(tabCount) {
  ensureLayoutSettings()
  const normalizedCount = clampTabs(tabCount)
  const current = Array.isArray(draft.layout.settings.tabNames)
    ? [...draft.layout.settings.tabNames]
    : []
  if (current.length > normalizedCount) {
    draft.layout.settings.tabNames = current.slice(0, normalizedCount)
    return
  }
  if (current.length < normalizedCount) {
    const next = [...current]
    for (let i = current.length; i < normalizedCount; i += 1) {
      next.push(`Вкладка ${i + 1}`)
    }
    draft.layout.settings.tabNames = next
    return
  }
  draft.layout.settings.tabNames = current
}

function deriveColumnsFromPreset(presetValue) {
  if (!presetValue) return null
  const preset = layoutOptions.value.find((option) => option.value === presetValue)
  if (!preset) return null
  const template = preset.template || ''
  const tokens = template
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
  return clampColumns(tokens.length || 1)
}

watch(layoutOptions, (options) => {
  if (!draft.layout.preset && options.length) {
    draft.layout.preset = options[0].value
  }
})

watch(
  () => draft.layout.settings?.columns,
  (next) => {
    ensureLayoutSettings()
    const normalized = clampColumns(next)
    if (draft.layout.settings.columns !== normalized) {
      draft.layout.settings.columns = normalized
    }
  },
  { immediate: true },
)

watch(
  () => draft.layout.settings?.tabs,
  (next) => {
    ensureLayoutSettings()
    const normalized = clampTabs(next)
    if (draft.layout.settings.tabs !== normalized) {
      draft.layout.settings.tabs = normalized
    }
    syncTabNames(normalized)
    draft.layout.containers.forEach((container) => {
      if (!Number.isFinite(Number(container.tabIndex)) || container.tabIndex < 1) {
        container.tabIndex = 1
      } else if (container.tabIndex > normalized) {
        container.tabIndex = normalized
      }
    })
  },
  { immediate: true },
)

watch(
  [() => draft.layout.preset, layoutOptions],
  ([preset]) => {
    if (!preset) return
    const derived = deriveColumnsFromPreset(preset)
    if (!derived) return
    ensureLayoutSettings()
    if (draft.layout.settings.columns !== derived) {
      draft.layout.settings.columns = derived
    }
  },
  { immediate: true },
)

watch(widthOptions, (options) => {
  if (!options.length) return
  draft.layout.containers.forEach((container) => {
    if (!container.widthOption) {
      container.widthOption = options[0].value
    }
  })
})

watch(heightOptions, (options) => {
  if (!options.length) return
  draft.layout.containers.forEach((container) => {
    if (!container.heightOption) {
      container.heightOption = options[0].value
    }
  })
})

watch(availableFilterOptions, (options) => {
  const allowed = new Set(options.map((option) => option.key))
  draft.filters = draft.filters.filter((key) => allowed.has(key))
})

watch(
  privacyOptions,
  (options) => {
    if (!options.length) return
    const current = options.find((option) => option.fv === draft.fvPrivate)
    if (current) {
      draft.pvPrivate = current.pv
      return
    }
    const fallback = options.find((option) => option.isPublic) || options[0]
    draft.fvPrivate = fallback?.fv ?? null
    draft.pvPrivate = fallback?.pv ?? null
  },
  { immediate: true },
)

watch(
  () => draft.fvPrivate,
  (next) => {
    if (next == null) return
    const option = privacyOptions.value.find((item) => item.fv === next)
    if (option) {
      draft.pvPrivate = option.pv
    }
  },
)

watch(isPrivateSelection, (next) => {
  if (!next && draft.objUserMulti.length) {
    draft.objUserMulti = []
  }
})

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchLayoutOptions(),
      store.fetchWidthOptions(),
      store.fetchHeightOptions(),
      store.fetchTemplates(true),
      store.fetchPages(true),
      store.fetchPrivacyOptions(),
      store.fetchPageUsers(),
      fieldDictionaryStore.fetchDictionary(),
    ])
    if (!isNew.value) {
      await loadExistingPage()
    } else if (!draft.layout.preset && layoutOptions.value.length) {
      draft.layout.preset = layoutOptions.value[0].value
    }
    if (isNew.value) {
      originalDescription.value = draft.description
      descriptionMetaFlags.value = { hasSettingsMarker: false, hasContainerMarker: false }
    }
  } catch (err) {
    console.warn('Failed to initialize page editor', err)
    loadError.value = 'Не удалось загрузить страницу. Попробуйте позже.'
  } finally {
    loading.value = false
  }
})

async function loadExistingPage(targetId = pageId.value, { force = true } = {}) {
  loadError.value = ''
  deletedContainerIds.value = []
  const resolvedId = String(targetId || '')
  const existing = store.getPageById(resolvedId)
  if (!existing) {
    loadError.value = 'Страница не найдена или удалена.'
    return
  }
  if (!canUserAccessPage(existing, currentUserMeta.value)) {
    loadError.value = 'У вас нет доступа к этой странице.'
    return
  }
  draft.id = existing.id
  draft.remoteId = existing.remoteId || existing.id
  draft.remoteMeta = existing.remoteMeta || {}
  draft.menuTitle = existing.menuTitle || ''
  draft.pageTitle = existing.pageTitle || ''
  draft.description = existing.description || ''
  originalDescription.value = draft.description
  descriptionMetaFlags.value = existing.layout?.metaFlags || { hasSettingsMarker: false, hasContainerMarker: false }
  draft.filters = [...(existing.filters || [])]
  draft.fvPrivate = existing.privacy?.fv ?? null
  draft.pvPrivate = existing.privacy?.pv ?? null
  draft.idPrivate = existing.privacy?.id ?? null
  draft.objUserMulti = Array.isArray(existing.privacy?.users)
    ? existing.privacy.users.map((user) => ({ ...user }))
    : []
  draft.layout.preset = existing.layout?.preset || layoutOptions.value[0]?.value || ''
  draft.layout.settings = existing.layout?.settings
    ? { ...existing.layout.settings }
    : defaultLayoutSettings()
  draft.layout.containerTabs = { ...(existing.layout?.containerTabs || {}) }
  syncTabNames(draft.layout.settings?.tabs || 1)
  const containers = force
    ? await store.fetchPageContainers(existing.id, true)
    : store.getContainers(existing.id)
  draft.layout.containers.splice(0, draft.layout.containers.length)
  containers.forEach((container, index) => {
    draft.layout.containers.push({
      id: container.id || createContainerId(),
      remoteId: container.remoteId || container.id || null,
      remoteMeta: container.remoteMeta ? { ...container.remoteMeta } : {},
      title: container.title,
      templateId: container.templateId || '',
      widthOption: container.widthOption || widthOptions.value[0]?.value || '',
      heightOption: container.heightOption || heightOptions.value[0]?.value || '',
      tabIndex: container.tabIndex || 1,
      order: container.order ?? index + 1,
    })
  })
  ensureContainerDefaults()
}

function ensureContainerDefaults() {
  const widthFallback = widthOptions.value[0]?.value || ''
  const heightFallback = heightOptions.value[0]?.value || ''
  draft.layout.containers.forEach((container) => {
    if (!container.widthOption) container.widthOption = widthFallback
    if (!container.heightOption) container.heightOption = heightFallback
    if (!Number.isFinite(Number(container.tabIndex)) || container.tabIndex < 1) {
      container.tabIndex = 1
    }
    if (container.tabIndex > clampTabs(draft.layout.settings?.tabs || 1)) {
      container.tabIndex = clampTabs(draft.layout.settings?.tabs || 1)
    }
  })
}

function templateMeta(templateId) {
  if (!templateId) return null
  return templates.value.find((tpl) => tpl.id === templateId) || null
}

function refreshTemplates() {
  store.fetchTemplates(true)
}

function resolveFieldLabel(key) {
  if (!key) return ''
  const normalized = String(key).trim()
  if (!normalized) return ''
  const dictionary = dictionaryLabels.value || {}
  const direct = dictionary[normalized]
  if (direct) return direct
  const lowerDict = dictionaryLabelsLower.value || {}
  const lower = normalized.toLowerCase()
  if (lowerDict[lower]) return lowerDict[lower]
  const dateMeta = parseDatePartKey(normalized)
  if (dateMeta) {
    const baseLower = dateMeta.fieldKey
      ? dateMeta.fieldKey.toLowerCase()
      : ''
    const baseLabel =
      dictionary[dateMeta.fieldKey] ||
      (baseLower ? lowerDict[baseLower] : '') ||
      humanizeKey(dateMeta.fieldKey || '')
    return formatDatePartFieldLabel(baseLabel, dateMeta.part)
  }
  return humanizeKey(normalized)
}

function createContainerId() {
  return `slot-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function addContainer() {
  draft.layout.containers.push({
    id: createContainerId(),
    title: `Контейнер ${draft.layout.containers.length + 1}`,
    templateId: templates.value[0]?.id || '',
    widthOption: widthOptions.value[0]?.value || '',
    heightOption: heightOptions.value[0]?.value || '',
    tabIndex: 1,
    order: draft.layout.containers.length + 1,
  })
}

function removeContainer(containerId) {
  const index = draft.layout.containers.findIndex((c) => c.id === containerId)
  if (index >= 0) {
    const [removed] = draft.layout.containers.splice(index, 1)
    const remoteId =
      removed?.remoteMeta?.id ||
      removed?.remoteMeta?.idPageContainerComplex ||
      removed?.remoteId
    if (remoteId) {
      deletedContainerIds.value.push(remoteId)
    }
  }
}

async function save() {
  if (saving.value) return
  if (!draft.layout.preset) {
    alert('Выберите макет страницы')
    return
  }
  const invalidContainer = draft.layout.containers.find((container) => !container.templateId)
  if (invalidContainer) {
    alert('Выберите представление для каждого контейнера.')
    return
  }
  saving.value = true
  try {
    const payload = JSON.parse(JSON.stringify(draft))
    payload.layout.preset = draft.layout.preset
    const savedId = await store.savePageDraft(payload, deletedContainerIds.value)
    deletedContainerIds.value = []
    if (route.params.pageId !== String(savedId)) {
      await router.push(`/pages/${savedId}/edit`)
    }
    await loadExistingPage(savedId, { force: false })
  } catch (err) {
    console.warn('Failed to save page', err)
    alert('Не удалось сохранить страницу. Попробуйте позже.')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/pages')
}
</script>


<style scoped>
.page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.page__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.muted {
  color: #6b7280;
  font-size: 13px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field input,
.field textarea,
.field select {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}
.field select[multiple] {
  min-height: 140px;
}
.filter-multiselect {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.layout-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.layout-options label {
  flex: 1 1 160px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.layout-options input {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
}
.tab-names {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.tab-names label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tab-names input {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
}
.filter-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
}
.containers {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.containers header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.containers__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.container-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.container-card__header {
  display: flex;
  gap: 12px;
}
.container-card__header input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
}
.container-card__body {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.container-card__body label {
  flex: 1 1 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.error-text {
  color: #b91c1c;
  font-size: 13px;
}
.warning-text {
  color: #b45309;
  font-size: 13px;
}
.btn-link {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
}
.btn-link:disabled {
  color: #9ca3af;
  cursor: default;
}
</style>
