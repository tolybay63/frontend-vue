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
      </label>

      <fieldset class="field">
        <legend>Глобальные фильтры</legend>
        <div v-if="availableFilterOptions.length" class="filter-grid">
          <label v-for="filter in availableFilterOptions" :key="filter.key" class="checkbox">
            <input v-model="draft.filters" type="checkbox" :value="filter.key" />
            <span>{{ filter.label }}</span>
          </label>
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
import { computed, reactive, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePageBuilderStore, resolveCommonContainerFieldKeys } from '@/shared/stores/pageBuilder'
import { useFieldDictionaryStore } from '@/shared/stores/fieldDictionary'
import { humanizeKey } from '@/shared/lib/pivotUtils'

const router = useRouter()
const route = useRoute()
const store = usePageBuilderStore()
const fieldDictionaryStore = useFieldDictionaryStore()

const pageId = computed(() => route.params.pageId)
const isNew = computed(() => pageId.value === 'new' || !pageId.value)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const deletedContainerIds = ref([])

const draft = reactive({
  id: null,
  remoteId: null,
  remoteMeta: {},
  menuTitle: '',
  pageTitle: '',
  description: '',
  filters: [],
  layout: {
    preset: '',
    containers: [],
  },
})

const templates = computed(() => store.templates)
const templatesLoading = computed(() => store.templatesLoading)
const templatesError = computed(() => store.templatesError)
const showTemplatesLoading = computed(() => templatesLoading.value && !templates.value.length)
const layoutOptions = computed(() => store.layoutOptions)
const widthOptions = computed(() => store.widthOptions)
const heightOptions = computed(() => store.heightOptions)
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

watch(layoutOptions, (options) => {
  if (!draft.layout.preset && options.length) {
    draft.layout.preset = options[0].value
  }
})

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

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchLayoutOptions(),
      store.fetchWidthOptions(),
      store.fetchHeightOptions(),
      store.fetchTemplates(true),
      store.fetchPages(true),
      fieldDictionaryStore.fetchDictionary(),
    ])
    if (!isNew.value) {
      await loadExistingPage()
    } else if (!draft.layout.preset && layoutOptions.value.length) {
      draft.layout.preset = layoutOptions.value[0].value
    }
  } catch (err) {
    console.warn('Failed to initialize page editor', err)
    loadError.value = 'Не удалось загрузить страницу. Попробуйте позже.'
  } finally {
    loading.value = false
  }
})

async function loadExistingPage() {
  deletedContainerIds.value = []
  const existing = store.getPageById(pageId.value)
  if (!existing) {
    loadError.value = 'Страница не найдена или удалена.'
    return
  }
  draft.id = existing.id
  draft.remoteId = existing.remoteId || existing.id
  draft.remoteMeta = existing.remoteMeta || {}
  draft.menuTitle = existing.menuTitle || ''
  draft.pageTitle = existing.pageTitle || ''
  draft.description = existing.description || ''
  draft.filters = [...(existing.filters || [])]
  draft.layout.preset = existing.layout?.preset || layoutOptions.value[0]?.value || ''
  const containers = await store.fetchPageContainers(existing.id, true)
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
  const direct = dictionaryLabels.value?.[normalized]
  if (direct) return direct
  const lower = normalized.toLowerCase()
  const lowerMatch = dictionaryLabelsLower.value?.[lower]
  if (lowerMatch) return lowerMatch
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
    const pageId = await store.savePageDraft(payload, deletedContainerIds.value)
    deletedContainerIds.value = []
    router.push(`/pages/${pageId}/edit`)
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
